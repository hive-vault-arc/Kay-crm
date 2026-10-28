"""Pure appendix/provenance and stubbed publication tests; database connections forbidden."""

import hashlib
import json
import shutil
from contextlib import contextmanager
from dataclasses import replace
from io import BytesIO
from pathlib import Path
from types import SimpleNamespace
from uuid import UUID, uuid4

import pytest
from pypdf import PdfReader

from app.files.models import Document, FileReceipt
from app.generated import appendix, service
from app.generated.appendix import AppendixManifest, AppendixUnavailable, selected_appendix
from app.generated.catalog import TEMPLATES
from app.generated.contracts import GenerateRequest
from app.generated.render import render_pdf
from app.identity.security import IdentityError
from tools.compare_pdf_appendices import compare_text

ROOT = Path(__file__).resolve().parents[1] / "app/generated"
PARENT = UUID("00000000-0000-4000-8000-000000000001")
LEGACY_BODY = (
    b'{"parent_id": "00000000-0000-4000-8000-000000000001", '
    b'"parent_kind": "enquiry", "template_code": "01", "values": {}}'
)


@pytest.mark.parametrize("template", TEMPLATES, ids=lambda item: item.code)
def test_every_selected_model_keeps_proved_original_body_and_literal_chunks(template):
    manifest = AppendixManifest.model_validate_json(
        (ROOT / "assets/appendix-provenance.json").read_bytes()
    )
    content = json.loads((ROOT / "assets/appendix-content.json").read_text("utf-8"))
    value = selected_appendix(template)
    source = ROOT / "templates" / template.source
    reference = ROOT.parents[2] / "docs/reference/real-estate-document-templates" / template.source
    assert source.read_bytes() == reference.read_bytes()
    a, b = PdfReader(source), PdfReader(BytesIO(value.data))
    result = compare_text(
        [(page.extract_text() or "").splitlines() for page in a.pages],
        [(page.extract_text() or "").splitlines() for page in b.pages],
        content[template.code]["blocks"],
    )
    assert result["literalPartsPresentInBoth"]
    assert result["bodyEquivalentAfterExplicitLayoutNormalization"]
    assert result["originalFirstNoticeRetained"]
    assert result["normalizedBodySha256"] == value.record.normalized_body_sha256
    assert result["literalParts"] == value.record.literal_parts
    assert len(a.pages) == value.record.original_pages
    assert len(b.pages) == value.record.selected_pages
    assert manifest.source_date == "2026-10-16"
    assert not b.get_fields()
    assert not any(key in b.trailer["/Root"] for key in ("/OpenAction", "/AA", "/AcroForm"))
    assert not any(page.get("/Annots") for page in b.pages)


@pytest.mark.parametrize("template", TEMPLATES, ids=lambda item: item.code)
def test_new_pdf_records_both_hashes_and_never_fills_the_selected_blank_appendix(template):
    marker = f"SYNTHETIC-ONLY-{template.code}-NO-APPENDIX-FILL"
    values = {field.key: marker for field in template.fields}
    result = PdfReader(BytesIO(render_pdf(template, values, "synthetic", "28/10/2026")))
    value = selected_appendix(template)
    source = PdfReader(BytesIO(value.data))
    assert result.metadata["/KAYOriginalSHA256"] == value.record.original_sha256
    assert result.metadata["/KAYAppendixSHA256"] == value.record.selected_sha256
    assert result.metadata["/KAYTemplateCode"] == template.code
    assert result.metadata["/KAYTemplateSourceDate"] == "2026-10-16"
    assert result.metadata["/KAYAppendixFormat"] == "kay-selected-2026-10-25"
    covers = result.pages[: -len(source.pages)]
    assert covers and any(marker in (page.extract_text() or "") for page in covers)
    assert f"1 / {len(result.pages)}" in covers[0].extract_text()
    for actual, selected in zip(result.pages[-len(source.pages) :], source.pages, strict=True):
        assert actual.get_contents().get_data() == selected.get_contents().get_data()
        assert actual.extract_text() == selected.extract_text()
        assert marker not in actual.extract_text()
        assert list(actual.mediabox) == list(selected.mediabox)
        assert list(actual.cropbox) == list(selected.cropbox)
        assert actual.rotation == selected.rotation


def local_bundle(tmp_path):
    for name in ("assets", "templates", "styled_templates"):
        shutil.copytree(ROOT / name, tmp_path / name)
    return tmp_path


@pytest.mark.parametrize("target", ["selected", "original", "content", "manifest", "missing"])
def test_unproved_or_missing_asset_fails_closed_without_an_original_layout_fallback(
    monkeypatch, tmp_path, target
):
    directory = local_bundle(tmp_path)
    path = directory / "assets/appendix-provenance.json"
    if target == "manifest":
        path.write_text('{"schema_version":2}', encoding="utf-8")
    elif target == "missing":
        (directory / "styled_templates" / TEMPLATES[0].source).unlink()
    else:
        folder = {"selected": "styled_templates", "original": "templates", "content": "assets"}[
            target
        ]
        name = "appendix-content.json" if target == "content" else TEMPLATES[0].source
        changed = directory / folder / name
        changed.write_bytes(changed.read_bytes() + b"SYNTHETIC-TAMPER")
    monkeypatch.setattr(appendix, "ROOT", directory)
    with pytest.raises(AppendixUnavailable, match="^APPENDIX_UNAVAILABLE$"):
        selected_appendix(TEMPLATES[0])


@pytest.mark.parametrize("change", ["duplicate", "unknown", "path", "pages", "bytes", "extra"])
def test_manifest_rejects_incoherent_catalogue_and_unsafe_or_unbounded_metadata(
    monkeypatch, tmp_path, change
):
    directory = local_bundle(tmp_path)
    path = directory / "assets/appendix-provenance.json"
    data = json.loads(path.read_text("utf-8"))
    if change == "duplicate":
        data["models"][1] = data["models"][0]
    elif change == "unknown":
        data["models"][0]["code"] = "99"
    elif change == "path":
        data["models"][0]["source"] = "../unrelated.pdf"
    elif change == "pages":
        data["models"][0]["selected_pages"] = 101
    elif change == "bytes":
        data["models"][0]["selected_bytes"] = True
    else:
        data["source_override"] = "synthetic.invalid"
    path.write_text(json.dumps(data), encoding="utf-8")
    monkeypatch.setattr(appendix, "ROOT", directory)
    with pytest.raises(AppendixUnavailable):
        selected_appendix(TEMPLATES[0])


def test_a_valid_hash_with_a_wrong_page_count_or_mismatched_template_cannot_render(
    monkeypatch, tmp_path
):
    directory = local_bundle(tmp_path)
    path = directory / "assets/appendix-provenance.json"
    data = json.loads(path.read_text("utf-8"))
    data["models"][0]["selected_pages"] += 1
    path.write_text(json.dumps(data), encoding="utf-8")
    monkeypatch.setattr(appendix, "ROOT", directory)
    with pytest.raises(AppendixUnavailable):
        render_pdf(TEMPLATES[0], {}, "synthetic", "28/10/2026")
    with pytest.raises(AppendixUnavailable):
        selected_appendix(replace(TEMPLATES[0], source="../../unrelated.pdf"))


def publication(monkeypatch, *, code="01", initial=True, concurrent=False):
    body = GenerateRequest(parent_kind="enquiry", parent_id=PARENT, template_code=code, values={})
    uid, key, did = uuid4(), uuid4(), uuid4()
    digest = hashlib.sha256(LEGACY_BODY.replace(b'"01"', f'"{code}"'.encode())).digest()
    receipt = SimpleNamespace(operation="generate", request_hash=digest, document_id=did)
    document = SimpleNamespace(id=did, enquiry_id=PARENT, deal_id=None)
    projection = {"id": str(did), "version": 1, "version_id": str(uuid4()), "filename": "old.pdf"}
    identity = SimpleNamespace(
        user=SimpleNamespace(id=uid, role="manager", display_name="Synthetic actor")
    )
    calls, phase = [], {"number": 0, "authorized": True}

    class Session:
        def __init__(self, number):
            self.number = number

        @contextmanager
        def begin(self):
            calls.append("begin")
            yield

        def get(self, model, pk):
            calls.append((model.__name__, pk))
            if model is FileReceipt:
                assert pk == (uid, key)
                return receipt if initial or concurrent and self.number > 0 else None
            assert model is Document and pk == did
            return document

    @contextmanager
    def session():
        number = phase["number"]
        phase["number"] += 1
        yield Session(number)

    def current(*_):
        calls.append("current")
        return identity

    def locked(*_):
        calls.append("locked")
        return identity

    def authorize(*_, **kwargs):
        assert kwargs == {"write": True}
        calls.append("authorized")
        if not phase["authorized"]:
            raise IdentityError("NOT_FOUND", 404)

    def forbidden_render(*_):
        raise AssertionError("REPLAY_MUST_NOT_RENDER_OR_READ_NEW_ASSETS")

    def forbidden_storage(*_):
        raise AssertionError("REPLAY_MUST_NOT_TOUCH_PRIVATE_STORAGE")

    monkeypatch.setattr(service, "current_identity", current)
    monkeypatch.setattr(service, "locked_identity", locked)
    monkeypatch.setattr(service, "authorize", authorize)
    monkeypatch.setattr(service, "render_pdf", forbidden_render)
    monkeypatch.setattr(service, "PrivateStorage", forbidden_storage)
    monkeypatch.setattr(
        service, "_row", lambda session, row: projection if row is document else None
    )
    database = SimpleNamespace(session=session)
    return SimpleNamespace(
        body=body,
        key=key,
        receipt=receipt,
        document=document,
        projection=projection,
        identity=identity,
        phase=phase,
        calls=calls,
        run=lambda value=body: service.generate(
            database, SimpleNamespace(), "synthetic", key, value
        ),
    )


def test_existing_legacy_receipt_replays_without_render_assets_or_storage_and_reauthorizes(
    monkeypatch,
):
    state = publication(monkeypatch)
    assert state.run() is state.projection
    assert state.calls.count("current") == 1
    assert state.calls.count("locked") == 1
    assert state.calls.count("authorized") == 2
    assert state.calls.index("locked") < state.calls.index(("Document", state.document.id))


@pytest.mark.parametrize("failure", ["body", "operation", "parent", "missing"])
def test_replay_keeps_original_body_and_parent_binding_without_rendering(monkeypatch, failure):
    state = publication(monkeypatch)
    if failure == "body":
        state.receipt.request_hash = b"different"
    elif failure == "operation":
        state.receipt.operation = "upload"
    elif failure == "parent":
        state.document.enquiry_id = uuid4()
    else:
        state.document = None
        monkeypatch.setattr(service, "_row", lambda *_: None)
        state.receipt.document_id = uuid4()
        # A retained receipt whose document was removed cannot become a new generation.
        # Override only the document lookup; keep the real service's receipt checks.
        original = service._receipt_result

        def missing(session, identity, key, digest, body, template):
            get = session.get
            session.get = lambda model, pk: None if model is Document else get(model, pk)
            return original(session, identity, key, digest, body, template)

        monkeypatch.setattr(service, "_receipt_result", missing)
    with pytest.raises(IdentityError, match="^IDEMPOTENCY_CONFLICT$"):
        state.run()


def test_a_revoked_scope_or_finance_role_cannot_use_an_existing_receipt(monkeypatch):
    state = publication(monkeypatch, code="10")
    state.identity.user.role = "agent"
    with pytest.raises(IdentityError, match="^FORBIDDEN$"):
        state.run()
    assert not any(isinstance(call, tuple) for call in state.calls)
    state = publication(monkeypatch)
    state.phase["authorized"] = False
    with pytest.raises(IdentityError, match="^NOT_FOUND$"):
        state.run()
    assert "locked" not in state.calls


def test_concurrent_same_key_publication_returns_the_retained_result_without_storage(monkeypatch):
    state = publication(monkeypatch, initial=False, concurrent=True)
    monkeypatch.setattr(service, "render_pdf", lambda *_: b"%PDF-SYNTHETIC-UNPUBLISHED")
    assert state.run() is state.projection
    assert state.calls.count("authorized") == 2


@pytest.mark.parametrize("change", ["role", "scope"])
def test_current_authority_is_rechecked_before_a_racing_receipt_can_return(monkeypatch, change):
    state = publication(monkeypatch, code="10", initial=False, concurrent=True)

    def render(*_):
        if change == "role":
            state.identity.user.role = "agent"
        else:
            state.phase["authorized"] = False
        return b"%PDF-SYNTHETIC-UNPUBLISHED"

    monkeypatch.setattr(service, "render_pdf", render)
    with pytest.raises(IdentityError, match="FORBIDDEN|NOT_FOUND"):
        state.run()
    assert not any(isinstance(call, tuple) and call[0] == "Document" for call in state.calls)


def test_new_generation_asset_failure_is_a_safe_dependency_error_before_storage(monkeypatch):
    state = publication(monkeypatch, initial=False)

    def render(*_):
        raise AppendixUnavailable("APPENDIX_UNAVAILABLE")

    monkeypatch.setattr(service, "render_pdf", render)
    with pytest.raises(IdentityError) as error:
        state.run()
    assert error.value.code == "DEPENDENCY_UNAVAILABLE"
    assert error.value.status == 503
    assert "locked" not in state.calls
