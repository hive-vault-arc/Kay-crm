"""Local operator configuration; never prints signing material or credentials."""

import argparse
import json
import os
import secrets
from datetime import UTC, datetime
from uuid import UUID, uuid4

from pydantic import SecretStr
from sqlalchemy import select

from app.runtime import require_venv


def configure(agent_id: UUID, *, rotate: bool = False) -> None:
    from app.db.isolation import assert_isolated
    from app.db.session import Database
    from app.identity.models import AGENCY_ID, Agency, Credential, User
    from app.identity.sessions import credential_active
    from app.intake.configuration import SigningKey, key_path, load_key
    from app.intake.models import WebsiteSource
    from app.settings import load_settings

    settings = load_settings()
    if settings.app_environment != "development":
        assert_isolated(settings)
    target = key_path(settings)
    key = (
        load_key(settings)
        if target.exists() and not rotate
        else SigningKey(source_key="local-simulator", secret=SecretStr(secrets.token_urlsafe(48)))
    )
    database = Database(settings.selected_database_url())
    try:
        with database.session() as session, session.begin():
            session.scalar(select(Agency).where(Agency.id == AGENCY_ID).with_for_update())
            user, credential = session.get(User, agent_id), session.get(Credential, agent_id)
            if (
                not user
                or not credential
                or user.role != "agent"
                or credential.must_change_password
                or not credential_active(user, credential, datetime.now(UTC))
            ):
                raise RuntimeError("ACTIVE_AGENT_REQUIRED")
            source = session.scalar(
                select(WebsiteSource).where(WebsiteSource.source_key == key.source_key)
            )
            if source is None:
                source = WebsiteSource(
                    id=uuid4(),
                    source_key=key.source_key,
                    name="Simulateur local",
                    key_digest=key.digest(),
                    default_agent_id=agent_id,
                    active=True,
                )
                session.add(source)
            else:
                source.default_agent_id, source.key_digest, source.active = (
                    agent_id,
                    key.digest(),
                    True,
                )
            target.parent.mkdir(parents=True, exist_ok=True)
            temporary = target.with_suffix(".tmp")
            with temporary.open("w", encoding="utf-8") as handle:
                json.dump(
                    {"source_key": key.source_key, "secret": key.secret.get_secret_value()}, handle
                )
                handle.flush()
                os.fsync(handle.fileno())
            temporary.replace(target)
    finally:
        database.close()


def main() -> None:
    require_venv()
    parser = argparse.ArgumentParser()
    parser.add_argument("--agent-id", type=UUID, required=True)
    parser.add_argument("--rotate", action="store_true")
    args = parser.parse_args()
    try:
        configure(args.agent_id, rotate=args.rotate)
    except Exception:
        raise SystemExit(
            "WEBSITE_CONFIGURATION_FAILED: verify active agent and local database."
        ) from None
    print("WEBSITE_SOURCE_CONFIGURED")


if __name__ == "__main__":
    main()
