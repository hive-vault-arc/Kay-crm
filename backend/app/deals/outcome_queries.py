"""Outcome history is paged only after current contact scope; previews are stock-safe."""

from uuid import UUID

from sqlalchemy import func, select, text

from app.db.session import Database
from app.deals.access import authorized
from app.deals.contracts import ChildQuery
from app.deals.outcome_models import DealOutcome, DealReopening
from app.deals.projections import deal_views
from app.identity.sessions import current_identity
from app.inventory.models import Offering
from app.inventory.outcome_models import StockEffect, StockOutcome
from app.inventory.stock_review import effect_facts, preview


def stock_review(database: Database, token: str, did: UUID) -> dict[str, object]:
    with database.session() as session:
        session.execute(text("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY"))
        row = authorized(session, current_identity(session, token), did)
        offering = session.get(Offering, row.offering_id) if row.offering_id else None
        stock = preview(session, offering, row.id) if offering else None
        if stock and row.stage in {"won", "lost", "cancelled"}:
            previous = session.scalar(
                select(DealOutcome)
                .where(DealOutcome.deal_id == row.id)
                .order_by(DealOutcome.close_version.desc())
                .limit(1)
            )
            saved = (
                session.scalar(
                    select(StockOutcome).where(StockOutcome.deal_outcome_id == previous.id)
                )
                if previous
                else None
            )
            stock["conflict"] = (
                "STOCK_REVIEW_REQUIRED"
                if row.stage == "won"
                and (
                    saved is None or stock["expected_stock_fingerprint"] != saved.after_fingerprint
                )
                else None
            )
            effects = (
                session.scalars(
                    select(StockEffect)
                    .where(StockEffect.outcome_id == saved.id)
                    .order_by(StockEffect.offering_id)
                ).all()
                if saved
                else []
            )
            pairs = []
            for effect in effects:
                item = session.get(Offering, effect.offering_id)
                if item:
                    pairs.append(
                        (
                            item,
                            "available"
                            if effect.before_state == "reserved"
                            else effect.before_state,
                        )
                    )
            stock["effect_count"] = len(pairs)
            stock["effects"] = effect_facts(session, pairs[:50])
        return {
            "expected_version": row.version,
            "stock": stock,
            "offering": deal_views(session, [row])[0]["offering"],
        }


def outcomes(database: Database, token: str, did: UUID, query: ChildQuery) -> dict[str, object]:
    with database.session() as session:
        session.execute(text("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY"))
        authorized(session, current_identity(session, token), did)
        total = (
            session.scalar(
                select(func.count()).select_from(DealOutcome).where(DealOutcome.deal_id == did)
            )
            or 0
        )
        rows = session.execute(
            select(DealOutcome, DealReopening)
            .outerjoin(DealReopening, DealReopening.outcome_id == DealOutcome.id)
            .where(DealOutcome.deal_id == did)
            .order_by(DealOutcome.close_version.desc())
            .offset((query.page - 1) * query.page_size)
            .limit(query.page_size)
        ).all()
        return {
            "items": [
                {
                    "id": str(o.id),
                    "outcome": o.outcome,
                    "offering_id": str(o.offering_id) if o.offering_id else None,
                    "agreed_amount_mad": format(o.agreed_amount_mad, ".2f")
                    if o.agreed_amount_mad is not None
                    else None,
                    "price_period": o.price_period,
                    "completed_on": o.completed_on.isoformat(),
                    "explanation": o.explanation,
                    "primary_agent_at_close_id": str(o.primary_agent_at_close_id),
                    "primary_agent_at_close_name": o.primary_agent_at_close_name,
                    "actor": {"id": str(o.actor_user_id), "display_name": o.actor_name},
                    "close_version": o.close_version,
                    "created_at": o.created_at.isoformat(),
                    "reopening": {
                        "id": str(r.id),
                        "reason": r.reason,
                        "actor": {"id": str(r.actor_user_id), "display_name": r.actor_name},
                        "created_at": r.created_at.isoformat(),
                    }
                    if r
                    else None,
                }
                for o, r in rows
            ],
            "total": total,
            "page": query.page,
            "page_size": query.page_size,
            "has_previous": query.page > 1,
            "has_next": query.page * query.page_size < total,
        }
