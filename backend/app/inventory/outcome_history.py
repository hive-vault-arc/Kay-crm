"""Batch only shared outcome dates/origin, never private commercial/deal metadata."""

from collections.abc import Sequence
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.inventory.models import InventoryEvent
from app.inventory.outcome_models import StockEffect, StockOutcome, StockReversal


def metadata(session: Session, events: Sequence[InventoryEvent]) -> dict[UUID, dict[str, object]]:
    ids = [e.id for e in events]
    result: dict[UUID, dict[str, object]] = {
        eid: {"completed_on": None, "external_outcome": None} for eid in ids
    }
    for eid, completed, deal in session.execute(
        select(
            StockEffect.inventory_event_id, StockOutcome.completed_on, StockOutcome.deal_outcome_id
        )
        .join(StockOutcome, StockOutcome.id == StockEffect.outcome_id)
        .where(StockEffect.inventory_event_id.in_(ids))
    ):
        result[eid] = {"completed_on": completed.isoformat(), "external_outcome": deal is None}
    for eid, completed in session.execute(
        select(StockReversal.inventory_event_id, StockOutcome.completed_on)
        .join(StockEffect, StockEffect.id == StockReversal.effect_id)
        .join(StockOutcome, StockOutcome.id == StockEffect.outcome_id)
        .where(StockReversal.inventory_event_id.in_(ids))
    ):
        result[eid] = {"completed_on": completed.isoformat(), "external_outcome": False}
    return result
