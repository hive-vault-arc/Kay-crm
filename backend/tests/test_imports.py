"""AT-20/21 on the real isolated PostgreSQL service and private storage."""

import csv
import io
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime, timedelta
from time import perf_counter
from uuid import UUID, uuid4

import pytest
from sqlalchemy import event, func, select, text
from sqlalchemy.exc import IntegrityError

from app.contacts.history_models import AssignmentEvent, TimelineEvent
from app.contacts.models import Contact
from app.files.reconcile import reconcile
from app.files.storage import PrivateStorage
from app.identity.models import AGENCY_ID, Agency, User
from app.identity.security import IdentityError
from app.imports import service
from app.imports.contracts import HEADERS, MAX_BYTES, Approve, NewBatch, Preview, RowAgent
from app.imports.models import ImportBatch
from app.imports.parsing import parse_csv
from app.imports.queries import read_batch
from app.imports.uploads import consume_upload, issue_upload, publish_upload
from tests.contact_support import actor, create_lead, new_lead
from tests.identity_support import observe_two_lock_waiters

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]


def csv_bytes(*rows):
    output = io.StringIO(newline="")
    writer = csv.writer(output)
    writer.writerow(HEADERS)
    writer.writerows(rows)
    return output.getvalue().encode("utf-8")


def row(phone="+212600111001", email="", **fields):
    values = dict(
        zip(
            HEADERS,
            (
                "SP18 démonstration synthétique",
                phone,
                "",
                "",
                "",
                "buyer",
                email,
                "Note synthétique",
            ),
            strict=True,
        )
    )
    return list((values | fields).values())


def upload(settings, database, token, data):
    made = service.create_batch(
        database,
        token,
        uuid4(),
        NewBatch(filename="contacts-synthetiques.csv", size_bytes=len(data)),
    )
    bid = UUID(made["id"])
    permit = issue_upload(database, token, bid, "a" * 64)
    key, size, sid = consume_upload(database, bid, permit["token"], "a" * 64)
    assert size == len(data)
    storage = PrivateStorage(settings)
    with storage.path(key, partial=True).open("xb") as handle:
        handle.write(data)
    storage.promote(key)
    publish_upload(database, bid, key, sid, data)
    return bid


def prepared(settings, database, phone="+212600111001"):
    uid, agent = actor(settings, database)
    _, manager = actor(settings, database, "manager")
    bid = upload(settings, database, manager, csv_bytes(row(phone)))
    preview = service.preview(database, settings, manager, bid, Preview(fallback_agent_id=uid))
    body = Approve(preview_hash=preview["preview_hash"], fallback_agent_id=uid)
    return uid, agent, manager, bid, body


def contact_count(database):
    with database.session() as session:
        return session.scalar(select(func.count()).select_from(Contact))


def test_mixed_invalid_existing_entire_row_correction_agents_and_durable_retry(settings, database):
    owner, token = actor(settings, database)
    other, _ = actor(settings, database)
    _, manager = actor(settings, database, "manager")
    known = create_lead(settings, database, token)
    data = csv_bytes(row("+212600000001", name="", roles="not-a-role"), row(), row("not a phone"))
    bid = upload(settings, database, manager, data)
    preview = service.preview(database, settings, manager, bid, Preview(fallback_agent_id=owner))
    assert preview["counts"] == {"eligible": 1, "invalid": 1, "skipped_existing": 1, "committed": 0}
    with pytest.raises(IdentityError, match="INVALID_IMPORT_ROWS"):
        service.approve(
            database,
            manager,
            bid,
            uuid4(),
            Approve(preview_hash=preview["preview_hash"], fallback_agent_id=owner),
        )
    assert contact_count(database) == 1
    corrected = upload(
        settings,
        database,
        manager,
        csv_bytes(
            row("+212600000001"),
            row(name="SP18 «Été,\n synthétique»"),
            row("+33612345678", primary_email="DEMO@example.com", other_emails="autre@example.com"),
        ),
    )
    preview = service.preview(
        database,
        settings,
        manager,
        corrected,
        Preview(fallback_agent_id=owner, row_agents=[RowAgent(row_number=4, agent_id=other)]),
    )
    key = uuid4()
    body = Approve(preview_hash=preview["preview_hash"], fallback_agent_id=owner)
    result = service.approve(database, manager, corrected, key, body)
    assert result["counts"] == {"eligible": 0, "invalid": 0, "skipped_existing": 1, "committed": 2}
    assert service.approve(database, manager, corrected, key, body) == result
    assert contact_count(database) == 3
    with pytest.raises(IdentityError, match="IDEMPOTENCY_CONFLICT"):
        service.approve(database, manager, corrected, uuid4(), body)
    report = read_batch(database, manager, corrected, 1, 2)
    assert report["has_next"] and report["total"] == 3
    assert read_batch(database, manager, corrected, 2, 2)["items"][0]["agent_id"] == str(other)
    with database.session() as session:
        imported = session.scalars(
            select(Contact).where(Contact.source_submission_id == corrected)
        ).all()
        assert {c.primary_agent_id for c in imported} == {owner, other}
        assert (
            session.scalar(
                select(func.count())
                .select_from(TimelineEvent)
                .where(TimelineEvent.reason == "Import CSV")
            )
            == 2
        )
        assert (
            session.scalar(
                select(func.count())
                .select_from(AssignmentEvent)
                .where(AssignmentEvent.reason == "Import CSV")
            )
            == 2
        )
        assert session.get(Contact, UUID(known["contact"]["id"])).name == "SP05 contact synthétique"
    assert service.create_batch(
        database, manager, key, NewBatch(filename="same.csv", size_bytes=1)
    ) == service.create_batch(database, manager, key, NewBatch(filename="same.csv", size_bytes=1))


def test_new_duplicates_secondary_existing_and_inactive_or_missing_agent(settings, database):
    uid, token = actor(settings, database)
    _, manager = actor(settings, database, "manager")
    create_lead(settings, database, token)
    bid = upload(
        settings,
        database,
        manager,
        csv_bytes(row(other_phones="+212600000001"), row("+212600111002"), row("+212600111002")),
    )
    preview = service.preview(database, settings, manager, bid, Preview())
    assert preview["counts"]["skipped_existing"] == 1 and preview["counts"]["invalid"] == 2
    assert "DUPLICATE_NEW_PHONE" in read_batch(database, manager, bid)["items"][1]["errors"]
    with database.session() as session, session.begin():
        session.get(User, uid).state = "disabled"
    with pytest.raises(IdentityError, match="INVALID_ASSIGNEE"):
        service.preview(database, settings, manager, bid, Preview(fallback_agent_id=uid))


def test_changed_agent_or_phone_requires_repreview_without_partial_contacts(settings, database):
    uid, token, manager, bid, body = prepared(settings, database)
    create_lead(
        settings,
        database,
        token,
        new_lead("+212600111001"),
    )
    with pytest.raises(IdentityError, match="IMPORT_REPREVIEW_REQUIRED"):
        service.approve(database, manager, bid, uuid4(), body)
    assert (
        contact_count(database) == 1
        and read_batch(database, manager, bid)["state"] == "repreview_required"
    )
    current = service.preview(database, settings, manager, bid, Preview(fallback_agent_id=uid))
    assert current["counts"]["skipped_existing"] == 1
    with pytest.raises(IdentityError, match="IMPORT_REPREVIEW_REQUIRED"):
        service.approve(database, manager, bid, uuid4(), body)
    bid2 = upload(settings, database, manager, csv_bytes(row("+212600111003")))
    preview = service.preview(database, settings, manager, bid2, Preview(fallback_agent_id=uid))
    with database.session() as session, session.begin():
        session.get(User, uid).state = "disabled"
    with pytest.raises(IdentityError, match="IMPORT_REPREVIEW_REQUIRED"):
        service.approve(
            database,
            manager,
            bid2,
            uuid4(),
            Approve(preview_hash=preview["preview_hash"], fallback_agent_id=uid),
        )
    assert contact_count(database) == 1


def test_two_real_waiting_approvals_same_phone_have_one_atomic_winner(settings, database):
    uid, _, manager, bid, body = prepared(settings, database)
    second = upload(settings, database, manager, csv_bytes(row()))
    preview = service.preview(database, settings, manager, second, Preview(fallback_agent_id=uid))
    body2 = Approve(preview_hash=preview["preview_hash"], fallback_agent_id=uid)

    def commit(target, content):
        try:
            service.approve(database, manager, target, uuid4(), content)
            return "committed"
        except IdentityError as error:
            return error.code

    with database.session() as blocker, blocker.begin():
        blocker.scalar(select(Agency).where(Agency.id == AGENCY_ID).with_for_update())
        with ThreadPoolExecutor(2) as pool:
            first = pool.submit(commit, bid, body)
            other = pool.submit(commit, second, body2)
            observe_two_lock_waiters(database, "agency")
            blocker.commit()
            assert sorted([first.result(timeout=10), other.result(timeout=10)]) == [
                "IMPORT_REPREVIEW_REQUIRED",
                "committed",
            ]
    assert contact_count(database) == 1


def test_precommit_crash_rolls_back_and_postcommit_loss_retries_original(
    settings, database, monkeypatch
):
    uid, _, manager, _, _ = prepared(settings, database)
    bid = upload(
        settings,
        database,
        manager,
        csv_bytes(*[row(f"+212{600200000 + index}") for index in range(501)]),
    )
    current = service.preview(database, settings, manager, bid, Preview(fallback_agent_id=uid))
    body = Approve(preview_hash=current["preview_hash"], fallback_agent_id=uid)
    original = service.insert_contacts

    def before_commit(*args):
        original(*args)
        raise RuntimeError("SYNTHETIC_PRECOMMIT_INTERRUPTION")

    monkeypatch.setattr(service, "insert_contacts", before_commit)
    key = uuid4()
    with pytest.raises(RuntimeError, match="PRECOMMIT"):
        service.approve(database, manager, bid, key, body)
    assert (
        contact_count(database) == 0 and read_batch(database, manager, bid)["state"] == "previewed"
    )

    def tagged(*args):
        original(*args)
        args[0].info["sp18_commit_loss"] = True

    def after_commit(session):
        if session.info.get("sp18_commit_loss"):
            raise RuntimeError("SYNTHETIC_POSTCOMMIT_RESPONSE_LOSS")

    monkeypatch.setattr(service, "insert_contacts", tagged)
    event.listen(database.sessions, "after_commit", after_commit)
    try:
        with pytest.raises(RuntimeError, match="POSTCOMMIT"):
            service.approve(database, manager, bid, key, body)
    finally:
        event.remove(database.sessions, "after_commit", after_commit)
        monkeypatch.setattr(service, "insert_contacts", original)
    assert contact_count(database) == 501
    assert service.approve(database, manager, bid, key, body)["result"]["committed"] == 501


def test_private_raw_reconcile_hash_immutable_result_and_current_role(settings, database):
    _, agent, manager, bid, body = prepared(settings, database)
    with pytest.raises(IdentityError, match="FORBIDDEN"):
        read_batch(database, agent, bid)
    assert reconcile(database, settings, datetime.now(UTC) + timedelta(hours=2)) >= 0
    service.preview(
        database, settings, manager, bid, Preview(fallback_agent_id=body.fallback_agent_id)
    )
    with pytest.raises(IdentityError, match="IMPORT_REPREVIEW_REQUIRED"):
        service.approve(database, manager, bid, uuid4(), body)
    current = read_batch(database, manager, bid)
    service.approve(
        database,
        manager,
        bid,
        uuid4(),
        Approve(preview_hash=current["preview_hash"], fallback_agent_id=body.fallback_agent_id),
    )
    for sql in (
        "UPDATE import_batch SET result='{}'::jsonb",
        "UPDATE import_row SET status='eligible'",
        "DELETE FROM import_preview",
    ):
        with pytest.raises(IntegrityError), database.engine.begin() as connection:
            connection.execute(text(sql))
    with database.session() as session, session.begin():
        manager_id = session.get(ImportBatch, bid).author_user_id
        session.get(User, manager_id).role = "agent"
    with pytest.raises(IdentityError, match="UNAUTHENTICATED"):
        read_batch(database, manager, bid)


@pytest.mark.parametrize(
    "data,code",
    [
        (b"name,phone\na,b\n", "IMPORT_HEADER_INVALID"),
        (b"\xff", "IMPORT_CSV_INVALID"),
        (csv_bytes(), "IMPORT_EMPTY"),
        ((",".join(HEADERS) + '\n"unfinished').encode(), "IMPORT_CSV_INVALID"),
        (csv_bytes(["only one"]), "IMPORT_CSV_INVALID"),
        (csv_bytes(row()) + b"\x00", "IMPORT_CSV_INVALID"),
    ],
)
def test_csv_strict_boundary(data, code):
    with pytest.raises(IdentityError, match=code):
        parse_csv(data)


def test_fifty_thousand_row_and_twenty_mb_bounds():
    data = csv_bytes(*[row() for _ in range(50_000)])
    start = perf_counter()
    assert len(parse_csv(b"\xef\xbb\xbf" + data)) == 50_000
    print("SP18 parser50000 synthetic rows seconds", round(perf_counter() - start, 3))
    with pytest.raises(IdentityError, match="IMPORT_ROW_LIMIT"):
        parse_csv(csv_bytes(*[row() for _ in range(50_001)]))
    with pytest.raises(IdentityError, match="IMPORT_FILE_TOO_LARGE"):
        parse_csv(b" " * (MAX_BYTES + 1))
