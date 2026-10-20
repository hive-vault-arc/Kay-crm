"""Private supervisor IPC for synthetic isolated browser actors, not a product CLI."""

import json
import os
import re
import secrets
import sys
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from sqlalchemy import delete, select, update

from app.contacts.models import Contact, ContactPhone, Enquiry
from app.db.isolation import assert_isolated
from app.db.session import Database
from app.identity.models import (
    AGENCY_ID,
    Agency,
    AuditEvent,
    Credential,
    StaffSession,
    User,
    UserCommandReceipt,
)
from app.identity.security import hash_password
from app.settings import load_settings
from tests.identity_support import clear_identity, create_actor, delete_actor_business


def main() -> int:
    os.environ["APP_ENVIRONMENT"] = "test"
    settings = load_settings()
    assert_isolated(settings)
    database = Database(settings.selected_database_url())
    try:
        command = json.loads(sys.stdin.buffer.read(4096).decode("utf-8"))
        action = command.get("action")
        if action == "recovery-prepare":
            import subprocess

            from tests.recovery_support import build, clear_recovery

            clear_identity(settings, database)
            clear_recovery(settings)
            data = build(settings, database)

            def backup_cli(*args):
                result = subprocess.run(  # noqa: S603 - fixed trusted venv module.
                    [sys.executable, "-m", "app.cli.backup", *args],
                    capture_output=True,
                    timeout=60,
                    check=True,
                )  # noqa: S603
                return json.loads(result.stdout)

            point = backup_cli("create")
            from app.contacts.contracts import NewEnquiry
            from tests.contact_support import create_lead

            witness = create_lead(
                settings,
                database,
                data["active_token"],
                NewEnquiry(
                    initial_budget="500000",
                    contact_id=UUID(data["contact_id"]),
                    message="SP21 écriture synthétique après point",
                    source="phone",
                ),
            )
            report = backup_cli("restore", "--point", point["point_id"], "--replace-recovery")
            print(json.dumps({**data, "recovery": report, "post_point_enquiry": witness["id"]}))
        elif action == "recovery-run":
            import subprocess

            from app.recovery.service import recovery_settings

            target = recovery_settings(settings)
            for _ in range(2):
                subprocess.run(
                    [sys.executable, "-m", "app.cli.worker", "--once"],
                    env={**os.environ, "APP_ENVIRONMENT": "recovery"},
                    capture_output=True,
                    check=True,
                    timeout=30,
                )  # noqa: S603
            restored = Database(target.selected_database_url())
            try:
                from sqlalchemy import text

                with restored.engine.connect() as connection:
                    result = {
                        "finance_receipts": connection.scalar(text("SELECT count(*) FROM receipt")),
                        "committed_imports": connection.scalar(
                            text("SELECT count(*) FROM import_batch WHERE state='committed'")
                        ),
                        "processed_website": connection.scalar(
                            text("SELECT count(*) FROM website_receipt WHERE state='processed'")
                        ),
                        "running_jobs": connection.scalar(
                            text("SELECT count(*) FROM job WHERE state='running'")
                        ),
                    }
                print(json.dumps(result))
            finally:
                restored.close()
        elif action == "recovery-clear":
            from tests.recovery_support import clear_recovery

            clear_recovery(settings)
            clear_identity(settings, database)
            print(json.dumps({"done": True}))
        elif action == "work-run":
            from app.work.worker import instant, run_once

            if set(command) != {"action", "clock"} or not isinstance(command["clock"], str):
                raise ValueError
            clock = instant(datetime.fromisoformat(command["clock"]))
            if not 2000 <= clock.year <= 2100:
                raise ValueError
            with database.session() as session:
                emails = session.scalars(select(User.email)).all()
                if not emails or any(
                    not re.fullmatch(r"sp03-[a-f0-9]{32}@example.com", value) for value in emails
                ):
                    raise ValueError
            processed = 0
            while processed < 50 and run_once(database, clock):
                processed += 1
            print(json.dumps({"processed": processed}))
        elif action == "queue-status":
            from tests.queue_status import export_queue

            print(json.dumps(export_queue(database)))
        elif action == "file-bytes":
            import base64

            from tests.file_support import eicar_bytes, image_bytes, office_bytes

            if command.get("kind") not in {"clean", "clean-document", "rejected"}:
                raise ValueError
            data = (
                image_bytes()
                if command["kind"] == "clean"
                else office_bytes()
                if command["kind"] == "clean-document"
                else office_bytes(extra=("word/antivirus-test.txt", eicar_bytes()))
            )
            print(json.dumps({"base64": base64.b64encode(data).decode("ascii")}))
        elif action == "clear":
            clear_identity(settings, database)
            print(json.dumps({"done": True}))
        elif action == "website-source":
            from app.cli.website_source import configure

            user_id = UUID(command["id"])
            with database.session() as session:
                user = session.get(User, user_id)
                if user is None or not re.fullmatch(r"sp03-[a-f0-9]{32}@example.com", user.email):
                    raise ValueError
            configure(user_id)
            print(json.dumps({"done": True}))
        elif action == "website-disable":
            import subprocess

            with database.session() as session:
                emails = session.scalars(select(User.email)).all()
                if not emails or any(
                    not re.fullmatch(r"sp03-[a-f0-9]{32}@example.com", email) for email in emails
                ):
                    raise ValueError
            subprocess.run(
                [sys.executable, "-m", "app.cli.website_control", "--disable"],
                check=True,
                capture_output=True,
                timeout=10,
            )  # noqa: S603 - fixed venv module, no shell.
            print(json.dumps({"done": True}))
        elif action == "website-status":
            from app.work.status import queue_status

            print(json.dumps(queue_status(database)))
        elif action == "bulk":
            count = command.get("count")
            if not isinstance(count, int) or not 1 <= count <= 60:
                raise ValueError
            identifiers = [uuid4() for _ in range(count)]
            encoded = hash_password(secrets.token_urlsafe(24))
            with database.session() as session, session.begin():
                for identifier in identifiers:
                    session.add(
                        User(
                            id=identifier,
                            agency_id=AGENCY_ID,
                            display_name="Personnel synthétique avec un nom long, pagination "
                            + identifier.hex,
                            email=f"sp03-{identifier.hex}@example.com",
                            role="agent",
                            state="disabled",
                        )
                    )
                session.flush()
                for identifier in identifiers:
                    session.add(
                        Credential(
                            user_id=identifier, password_hash=encoded, must_change_password=False
                        )
                    )
            print(json.dumps({"ids": [str(identifier) for identifier in identifiers]}))
        elif action == "delete-bulk":
            identifiers = [UUID(value) for value in command["ids"]]
            if not 1 <= len(identifiers) <= 60:
                raise ValueError
            with database.session() as session, session.begin():
                users = session.scalars(select(User).where(User.id.in_(identifiers))).all()
                if len(users) != len(identifiers) or any(
                    user.email != f"sp03-{user.id.hex}@example.com" for user in users
                ):
                    raise ValueError
                session.execute(delete(Credential).where(Credential.user_id.in_(identifiers)))
                session.execute(delete(User).where(User.id.in_(identifiers)))
            print(json.dumps({"done": True}))
        elif action == "create":
            role = command.get("role", "administrator")
            if role not in {"administrator", "manager", "agent"}:
                raise ValueError
            user_id, email, password = create_actor(
                settings, database, role=role, restricted=command.get("restricted") is True
            )
            with database.session() as session, session.begin():
                display_name = command.get("display_name")
                if display_name is not None:
                    if (
                        not isinstance(display_name, str)
                        or not display_name.startswith("SP06 ")
                        or not 1 <= len(display_name) <= 160
                    ):
                        raise ValueError
                    session.execute(
                        update(User).where(User.id == user_id).values(display_name=display_name)
                    )
                session.execute(
                    update(Agency)
                    .where(Agency.id == AGENCY_ID)
                    .values(bootstrap_completed_at=datetime.now(UTC))
                )
            # Private pipe to test runner only: never inherited stdout, disk or logs.
            print(json.dumps({"id": str(user_id), "email": email, "password": password}))
        elif action in {"delete", "revoke", "expire", "role", "expire-temporary", "bulk-enquiries"}:
            user_id = UUID(command["id"])
            with database.session() as session, session.begin():
                user = session.scalar(select(User).where(User.id == user_id).with_for_update())
                if user is None or not re.fullmatch(r"sp03-[a-f0-9]{32}@example.com", user.email):
                    raise ValueError
                if action == "delete":
                    delete_actor_business(session, user_id)
                    session.execute(
                        delete(UserCommandReceipt).where(
                            UserCommandReceipt.actor_user_id == user_id
                        )
                    )
                    session.execute(delete(StaffSession).where(StaffSession.user_id == user_id))
                    session.execute(delete(AuditEvent).where(AuditEvent.target_user_id == user_id))
                    session.execute(delete(Credential).where(Credential.user_id == user_id))
                    session.delete(user)
                elif action == "bulk-enquiries":
                    count = command.get("count", 51)
                    if not isinstance(count, int) or not 1 <= count <= 60:
                        raise ValueError
                    contact = Contact(
                        name="SP05 pagination synthétique",
                        type="person",
                        primary_agent_id=user_id,
                        created_by_user_id=user_id,
                        source="manual",
                    )
                    session.add(contact)
                    session.flush()
                    phone = "+212" + str(600000000 + uuid4().int % 90000000)
                    session.add(
                        ContactPhone(
                            origin_contact_id=contact.id,
                            contact_id=contact.id,
                            normalized=phone,
                            label="Synthétique",
                            is_primary=True,
                            created_by_user_id=user_id,
                        )
                    )
                    for index in range(count):
                        session.add(
                            Enquiry(
                                origin_contact_id=contact.id,
                                contact_id=contact.id,
                                message=f"Demande synthétique de pagination {index + 1}",
                                source="manual",
                                assigned_agent_id=user_id,
                                created_by_user_id=user_id,
                            )
                        )
                elif action == "revoke":
                    session.execute(
                        update(StaffSession)
                        .where(StaffSession.user_id == user_id)
                        .values(revoked_at=datetime.now(UTC))
                    )
                elif action == "role":
                    user.role = "agent"
                    user.version += 1
                elif action == "expire-temporary":
                    session.execute(
                        update(Credential)
                        .where(Credential.user_id == user_id)
                        .values(temporary_expires_at=datetime.now(UTC) - timedelta(seconds=1))
                    )
                else:
                    session.execute(
                        update(StaffSession)
                        .where(StaffSession.user_id == user_id)
                        .values(
                            created_at=datetime.now(UTC) - timedelta(days=7),
                            expires_at=datetime.now(UTC) - timedelta(days=1),
                        )
                    )
            print(json.dumps({"done": True}))
        else:
            raise ValueError
        return 0
    except Exception:
        print("TEST_FIXTURE_FAILED", file=sys.stderr)
        return 1
    finally:
        database.close()


if __name__ == "__main__":
    raise SystemExit(main())
