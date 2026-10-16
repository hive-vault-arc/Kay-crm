"""Explicit local source disable and retained-receipt recovery, never an HTTP API."""

import argparse
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select

from app.runtime import require_venv


def main() -> None:
    require_venv()
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--disable", action="store_true")
    mode.add_argument("--retry-receipt", type=UUID)
    args = parser.parse_args()
    from app.db.isolation import assert_isolated
    from app.db.session import Database
    from app.files.models import Job, OutboxEvent
    from app.identity.models import AGENCY_ID, Agency
    from app.intake.configuration import load_key
    from app.intake.models import WebsiteReceipt, WebsiteSource
    from app.settings import load_settings

    settings = load_settings()
    if settings.app_environment != "development":
        assert_isolated(settings)
    database = Database(settings.selected_database_url())
    try:
        key = load_key(settings)
        with database.session() as session, session.begin():
            session.scalar(select(Agency).where(Agency.id == AGENCY_ID).with_for_update())
            source = session.scalar(
                select(WebsiteSource)
                .where(WebsiteSource.source_key == key.source_key)
                .with_for_update()
            )
            if not source:
                raise RuntimeError("SOURCE_REQUIRED")
            if args.disable:
                source.active = False
            else:
                row = session.scalar(
                    select(WebsiteReceipt)
                    .where(
                        WebsiteReceipt.id == args.retry_receipt,
                        WebsiteReceipt.source_id == source.id,
                    )
                    .with_for_update()
                )
                job = session.scalar(
                    select(Job)
                    .join(OutboxEvent, OutboxEvent.id == Job.outbox_id)
                    .where(OutboxEvent.website_receipt_id == args.retry_receipt)
                    .with_for_update(of=Job)
                )
                if (
                    not source.active
                    or not row
                    or row.state != "failed"
                    or not job
                    or job.state not in {"failed", "invalidated"}
                ):
                    raise RuntimeError("FAILED_RECEIPT_REQUIRED")
                row.state, job.state, job.attempts = "queued", "ready", 0
                job.error_code, job.available_at = None, datetime.now(UTC)
        print("WEBSITE_CONTROL_COMPLETED")
    except Exception:
        raise SystemExit(
            "WEBSITE_CONTROL_REFUSED: verify source and retained failed receipt."
        ) from None
    finally:
        database.close()


if __name__ == "__main__":
    main()
