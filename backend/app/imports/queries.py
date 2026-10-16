from uuid import UUID

from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.db.session import Database
from app.imports.access import authorized, batch_for
from app.imports.models import ImportBatch, ImportRow


def summary(batch: ImportBatch) -> dict[str, object]:
    return {
        "id": str(batch.id),
        "filename": batch.filename,
        "size_bytes": batch.size_bytes,
        "state": batch.state,
        "version": batch.version,
        "file_hash": batch.file_hash.hex() if batch.file_hash else None,
        "preview_hash": batch.preview_hash,
        "fallback_agent_id": str(batch.fallback_agent_id) if batch.fallback_agent_id else None,
        "counts": batch.counts,
        "result": batch.result,
        "created_at": batch.created_at.isoformat(),
    }


def rows_in(session: Session, bid: UUID) -> list[ImportRow]:
    return list(
        session.scalars(
            select(ImportRow).where(ImportRow.batch_id == bid).order_by(ImportRow.row_number)
        )
    )


def read_batch(
    database: Database, token: str, bid: UUID, page: int = 1, size: int = 50
) -> dict[str, object]:
    with database.session() as session:
        session.execute(text("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY"))
        authorized(session, token)
        batch = batch_for(session, bid)
        base = select(ImportRow).where(ImportRow.batch_id == bid)
        total = session.scalar(select(func.count()).select_from(base.subquery())) or 0
        rows = session.scalars(
            base.order_by(ImportRow.row_number).offset((page - 1) * size).limit(size)
        ).all()
        return summary(batch) | {
            "items": [
                {
                    "row_number": r.row_number,
                    "values": {key: value[:4096] for key, value in r.values.items()},
                    "values_truncated": any(len(value) > 4096 for value in r.values.values()),
                    "status": r.status,
                    "errors": r.errors,
                    "agent_id": str(r.agent_id) if r.agent_id else None,
                    "agent_name": r.agent_name,
                    "contact_id": str(r.contact_id) if r.contact_id else None,
                }
                for r in rows
            ],
            "page": page,
            "page_size": size,
            "total": total,
            "has_next": page * size < total,
            "has_previous": page > 1,
        }
