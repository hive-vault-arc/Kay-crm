"""Administrator preview binds the proposal and current future-visit versions."""

import json
from datetime import UTC, datetime

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.identity.models import AGENCY_ID, AuditEvent
from app.identity.security import IdentityError, keyed_digest
from app.identity.sessions import CurrentIdentity, require_role
from app.schedule.contracts import PolicyEdit, PolicySave
from app.schedule.models import BreakWindow, ScheduleEvent, SchedulePolicy, Visit, WorkingWindow
from app.schedule.rules import ACTIVE, hard_error, policy_view


def preview(
    session: Session, identity: CurrentIdentity, body: PolicyEdit, secret: str
) -> dict[str, object]:
    require_role(identity, {"administrator"})
    current = policy_view(session)
    if current["version"] != body.expected_version:
        raise IdentityError("VERSION_CONFLICT", 409)
    proposed = body.model_dump(mode="json", exclude={"preview_hash", "expected_version"})
    for name in ("working_windows", "lunch_breaks"):
        proposed[name] = [
            {
                "weekday": w.weekday,
                "start_local": w.start_local.strftime("%H:%M"),
                "end_local": w.end_local.strftime("%H:%M"),
            }
            for w in getattr(body, name)
        ]
    proposed.update(version=body.expected_version + 1, time_zone="Africa/Casablanca")
    visits = session.scalars(
        select(Visit)
        .where(Visit.end_at > datetime.now(UTC), Visit.status.in_(ACTIVE))
        .order_by(Visit.id)
    ).all()
    affected = []
    for row in visits:
        code = hard_error(session, row, proposed, row.id)
        if code:
            affected.append(
                {
                    "id": str(row.id),
                    "title": row.title,
                    "start_at": row.start_at.isoformat(),
                    "end_at": row.end_at.isoformat(),
                    "type": row.type,
                    "status": row.status,
                    "version": row.version,
                    "code": code,
                }
            )
    binding = {"body": proposed, "visits": [(str(v.id), v.version) for v in visits]}
    digest = keyed_digest(
        secret, "schedule-preview", json.dumps(binding, sort_keys=True, separators=(",", ":"))
    ).hex()
    return {
        "policy": proposed,
        "affected": affected[:100],
        "affected_total": len(affected),
        "preview_hash": digest,
    }


def save(
    session: Session, identity: CurrentIdentity, body: PolicySave, secret: str
) -> dict[str, object]:
    impact = preview(session, identity, body, secret)
    if impact["preview_hash"] != body.preview_hash:
        raise IdentityError("SCHEDULE_REPREVIEW_REQUIRED", 409)
    row = session.get(SchedulePolicy, AGENCY_ID)
    if row is None:
        raise RuntimeError("SCHEDULE_MIGRATION_REQUIRED")
    for model, windows in ((WorkingWindow, body.working_windows), (BreakWindow, body.lunch_breaks)):
        session.execute(delete(model).where(model.policy_id == AGENCY_ID))
        session.add_all(model(policy_id=AGENCY_ID, **w.model_dump()) for w in windows)
    row.version += 1
    row.company_car_capacity_per_hour = body.company_car_capacity_per_hour
    row.updated_by_user_id, row.updated_at = identity.user.id, datetime.now(UTC)
    session.flush()
    session.add(
        ScheduleEvent(
            policy_id=AGENCY_ID,
            actor_user_id=identity.user.id,
            actor_name=identity.user.display_name,
            version=row.version,
            snapshot=policy_view(session),
        )
    )
    session.add(AuditEvent(actor_user_id=identity.user.id, action="visits.policy.updated"))
    return impact
