"""SP21 real PostgreSQL18 dump/restore, crypto, retention, pause and authorization."""

from datetime import UTC, datetime, timedelta
from uuid import UUID

import pytest
from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError

from app.db.isolation import UnsafeDatabaseTarget, assert_isolated
from app.db.session import Database
from app.deals.contracts import ConvertLead
from app.identity.models import User
from app.identity.security import IdentityError
from app.identity.service import login
from app.identity.sessions import current_identity
from app.recovery.maintenance import Admission, flag, pause
from app.recovery.private import RecoveryError
from app.recovery.service import create, extract_code, recovery_settings, restore
from app.recovery.store import Store
from tests.deal_support import run as deal_command
from tests.recovery_support import build, clear_recovery

pytestmark = pytest.mark.usefixtures("clean_identity")


def test_coherent_point_real_restore_revoke_reconcile_and_immutable_replay(settings, database):
    data = build(settings, database)
    converted = deal_command(
        settings,
        database,
        data["active_token"],
        ConvertLead(
            expected_version=1,
            project={"external_name": "Projet de restauration synthétique"},
            initial_budget="1000000",
            purchase_reasons=["residence"],
        ),
        UUID(data["enquiry_id"]),
    )
    point = create(settings)
    result = restore(settings, UUID(point["point_id"]), replace_recovery=True)
    assert result["verified_tables"] == 74 and result["objects"] >= 2
    assert 0 <= result["rpo_seconds"] <= 3600 and result["restore_seconds"] < 14400
    target = recovery_settings(settings)
    db = Database(target.selected_database_url())
    try:
        with db.session() as session:
            with pytest.raises(IdentityError, match="UNAUTHENTICATED"):
                current_identity(session, data["old_token"])
            with pytest.raises(IdentityError, match="UNAUTHENTICATED"):
                current_identity(session, data["active_token"])
            assert session.scalar(text("SELECT count(*) FROM job WHERE state='running'")) == 0
            assert session.scalar(text("SELECT count(*) FROM website_source WHERE active")) == 0
            assert session.scalar(text("SELECT bootstrap_completed_at IS NOT NULL FROM agency"))
            assert (
                session.scalar(
                    text("SELECT count(*) FROM deal_project WHERE deal_id=:did"),
                    {"did": UUID(data["deal_id"])},
                )
                == 1
            )
            assert session.scalar(text("SELECT count(*) FROM receipt")) == 1
            assert session.scalar(
                text("SELECT converted_deal_id FROM enquiry WHERE id=:eid"),
                {"eid": UUID(data["enquiry_id"])},
            ) == UUID(converted["id"])
            assert (
                session.scalar(text("SELECT count(*) FROM import_batch WHERE state='committed'"))
                == 1
            )
        with pytest.raises(IntegrityError, match="LEAD_CONVERSION_IDENTITY"):
            with db.session() as session, session.begin():
                session.execute(text("SET LOCAL kay.synthetic_cleanup='on'"))
                session.execute(
                    text(
                        "UPDATE enquiry SET status='closed',converted_deal_id=NULL,"
                        "converted_at=NULL WHERE id=:eid"
                    ),
                    {"eid": UUID(data["enquiry_id"])},
                )
        from app.identity.bootstrap import bootstrap_administrator

        with pytest.raises(IdentityError, match="ALREADY_INITIALIZED"):
            bootstrap_administrator(
                db, "SP21 second bootstrap refused", "sp21@example.com", "Synthetic-replay-only-123"
            )
        from app.files.service import consume_permit

        permit = data["old_permit"]
        with pytest.raises(IdentityError, match="FILE_PERMIT_INVALID"):
            consume_permit(
                db, UUID(permit["permit_id"]), permit["token"], "download", permit["binding"]
            )
        import os
        import subprocess
        import sys

        for _ in range(2):
            subprocess.run(
                [sys.executable, "-m", "app.cli.worker", "--once"],
                env={**os.environ, "APP_ENVIRONMENT": "recovery"},
                capture_output=True,
                check=True,
                timeout=30,
            )  # noqa: S603
        with db.session() as session:
            assert session.scalar(text("SELECT count(*) FROM receipt")) == 1
            assert (
                session.scalar(text("SELECT count(*) FROM website_receipt WHERE state='processed'"))
                == 1
            )
        import zipfile
        from pathlib import Path

        archive = Path(extract_code(settings, UUID(point["point_id"]))["protected_code_archive"])
        with zipfile.ZipFile(archive) as code:
            names = code.namelist()
            assert "backend/app/recovery/service.py" in names
            assert not any(".env" in name or ".local-data" in name for name in names)
        archive.unlink()
        token, _ = login(
            db,
            settings.facade_secret.get_secret_value(),
            data["agent"]["email"],
            data["agent"]["password"],
        )
        with db.session() as session:
            assert current_identity(session, token).user.id == UUID(data["agent"]["id"])
        print(
            "SP21_LOCAL_RESTORE",
            {
                k: result[k]
                for k in ("verified_tables", "objects", "rpo_seconds", "restore_seconds")
            },
        )
    finally:
        db.close()
        clear_recovery(settings)


def test_maintenance_admission_and_exception_resume(settings):
    admission = Admission(settings)
    assert admission.enter()
    assert admission.enter()
    admission.leave()
    admission.leave()
    with pytest.raises(RuntimeError, match="controlled"):
        with pause(settings):
            assert flag(settings).exists()
            assert not admission.enter()
            with pytest.raises(RecoveryError, match="ALREADY_ACTIVE"):
                with pause(settings):
                    pass
            raise RuntimeError("controlled")
    assert not flag(settings).exists()
    assert admission.enter()
    admission.leave()


def test_concurrent_pause_drains_existing_admission_and_refuses_new_work(settings):
    import threading
    import time
    from concurrent.futures import ThreadPoolExecutor

    admitted = Admission(settings)
    entered, release = threading.Event(), threading.Event()
    assert admitted.enter()

    def operation():
        with pause(settings):
            entered.set()
            assert release.wait(5)

    with ThreadPoolExecutor(max_workers=1) as pool:
        future = pool.submit(operation)
        try:
            deadline = time.monotonic() + 3
            while not flag(settings).exists() and time.monotonic() < deadline:
                time.sleep(0.01)
            assert flag(settings).exists()
            assert not entered.wait(0.1)
            assert not Admission(settings).enter()
            admitted.leave()
            assert entered.wait(3)
            with pytest.raises(RecoveryError, match="ALREADY_ACTIVE"):
                with pause(settings):
                    pass
        finally:
            if admitted.users:
                admitted.leave()
            release.set()
        future.result(timeout=3)
    assert not flag(settings).exists()


@pytest.mark.parametrize(
    "kind", ["missing", "tamper", "payload", "code", "schema", "traversal", "authority"]
)
def test_invalid_point_fails_before_recovery_ddl(settings, database, kind):
    from tests.contact_support import actor

    actor(settings, database)
    point = create(settings)
    identity = UUID(point["point_id"])
    store = Store(settings)
    manifest = store.read(identity)
    path = store.point(identity) / "manifest.json"
    if kind == "missing":
        path.unlink()
    elif kind == "tamper":
        path.write_bytes(path.read_bytes().replace(b'"format":1', b'"format":9'))
    elif kind == "payload":
        (store.point(identity) / "database.dump.sealed").write_bytes(b"corrupt")
    elif kind in {"code", "schema", "traversal"}:
        path.unlink()
        if kind == "code":
            manifest["compatibility"] = "wrong-code"
        elif kind == "schema":
            manifest["revision"] = "unknown"
        else:
            manifest["payloads"]["../outside"] = {}
        store.publish(identity, manifest)
    else:
        with database.session() as session, session.begin():
            user = session.scalar(select(User))
            user.state = "disabled"
    target = recovery_settings(settings)
    db = Database(target.selected_database_url())
    try:
        with db.engine.connect() as connection:
            before = connection.scalar(
                text("SELECT count(*) FROM pg_tables WHERE schemaname='public'")
            )
        with pytest.raises(RecoveryError):
            restore(settings, identity, replace_recovery=True)
        with db.engine.connect() as connection:
            assert before == connection.scalar(
                text("SELECT count(*) FROM pg_tables WHERE schemaname='public'")
            )
    finally:
        db.close()
        for child in store.point(identity).iterdir():
            child.unlink()
        store.point(identity).rmdir()


def test_target_alias_and_development_refused(settings):
    with pytest.raises(UnsafeDatabaseTarget):
        recovery_settings(
            settings.model_copy(update={"recovery_database_url": settings.database_url})
        )
    with pytest.raises(UnsafeDatabaseTarget):
        assert_isolated(settings.model_copy(update={"app_environment": "development"}))


def test_retention_exact_thirty_day_boundary_and_no_business_purge(settings):
    store = Store(settings)
    now = datetime.now(UTC)
    kept = []
    for seconds in (0, 1):
        uid = UUID(create(settings)["point_id"])
        manifest = store.read(uid)
        (store.point(uid) / "manifest.json").unlink()
        manifest["completed_at"] = (now - timedelta(days=30, seconds=seconds)).isoformat()
        manifest["snapshot_at"] = manifest["completed_at"]
        store.publish(uid, manifest)
        kept.append(uid)
    assert store.expire(now) >= 1
    assert store.point(kept[0]).exists() and not store.point(kept[1]).exists()
    for child in store.point(kept[0]).iterdir():
        child.unlink()
    store.point(kept[0]).rmdir()


def test_scheduler_thirty_minute_due_clock(settings, monkeypatch):
    from app.recovery import service

    called = []

    def point(_):
        called.append(True)
        return {"point_id": "synthetic-scheduler-call"}

    monkeypatch.setattr(service, "create", point)
    assert not service.tick(settings)["created"]
    assert service.tick(settings, datetime.now(UTC) + timedelta(minutes=31))["created"]
    assert called == [True]


def test_crypto_context_and_path_refusal(settings):
    from app.recovery.private import crypt, guard
    from app.runtime import BACKEND_ROOT

    sealed = crypt(b"Synthetic recovery data", b"correct-context", encrypt=True)
    with pytest.raises(RecoveryError):
        crypt(sealed, b"other-context", encrypt=False)
    with pytest.raises(RecoveryError):
        guard(BACKEND_ROOT / "app", BACKEND_ROOT / ".local-data")


def test_actual_process_death_keeps_pause_until_explicit_safe_resume(settings):
    import os
    import subprocess
    import sys
    from pathlib import Path

    from app.recovery.maintenance import resume

    code = (
        "from app.settings import load_settings\nfrom app.recovery.maintenance import pause\n"
        'import sys\nwith pause(load_settings()):\n print("PAUSE_OWNED",flush=True)\n'
        " sys.stdin.buffer.read(1)"
    )
    task = subprocess.Popen(  # noqa: S603 - exact current venv and fixed synthetic program.
        [sys.executable, "-c", code],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        env={**os.environ, "APP_ENVIRONMENT": "test"},
    )  # noqa: S603
    try:
        assert task.stdout.readline().strip() == b"PAUSE_OWNED"
        assert not Admission(settings).enter()
        with pytest.raises(RecoveryError, match="OWNER_STILL_ALIVE"):
            resume(settings)
        binary = Path(os.environ["SystemRoot"]) / "System32" / "taskkill.exe"
        subprocess.run(  # noqa: S603 - fixed system binary and exact owned child PID.
            [str(binary), "/PID", str(task.pid), "/T", "/F"],
            capture_output=True,
            check=True,
            timeout=5,
        )  # noqa: S603
        task.wait(timeout=5)
        assert flag(settings).exists()
        resume(settings)
        assert not flag(settings).exists()
    finally:
        if task.poll() is None:
            task.kill()
            task.wait(timeout=5)
        for stream in (task.stdin, task.stdout, task.stderr):
            stream.close()


@pytest.mark.anyio
async def test_http_maintenance_and_private_backup_routes(settings):
    from app.main import create_app
    from tests.test_foundation import client_for

    async with client_for(create_app(settings)) as client:
        with pause(settings):
            assert (await client.get("/api/v1/health/live")).status_code == 200
            response = await client.post("/api/v1/auth/login", json={})
            assert response.status_code == 503 and response.headers["retry-after"] == "30"
        assert (
            await client.get(
                "/api/v1/health/ready",
                headers={"X-Kay-Facade-Secret": settings.facade_secret.get_secret_value()},
            )
        ).status_code == 200
        assert (await client.post("/api/v1/backups")).status_code == 404
