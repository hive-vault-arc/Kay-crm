from calendar import monthrange
from datetime import UTC, datetime, time, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import delete, func, or_, select, text

from app.db.session import Database
from app.discovery.contracts import AuditQuery
from app.discovery.search import page_result
from app.identity.models import AuditEvent, User
from app.identity.sessions import current_identity, require_role
from app.intake.models import WebsiteSource

SECURITY_ACTIONS = (
    "identity.bootstrap_completed",
    "identity.login",
    "identity.logout",
    "identity.password_changed",
    "users.create",
    "users.edit",
    "users.disable",
    "users.reset-password",
    "users.confirm-handoff",
)


def read_audit(database: Database, token: str, query: AuditQuery) -> dict[str, object]:
    with database.session() as session:
        session.execute(text("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY"))
        require_role(current_identity(session, token), {"manager"})
        statement = (
            select(
                AuditEvent, func.coalesce(User.display_name, "Source web : " + WebsiteSource.name)
            )
            .outerjoin(User, AuditEvent.actor_user_id == User.id)
            .outerjoin(WebsiteSource, AuditEvent.website_source_id == WebsiteSource.id)
        )
        if query.family:
            statement = statement.where(
                or_(AuditEvent.action.like("identity.%"), AuditEvent.action.like("users.%"))
                if query.family == "security"
                else AuditEvent.action.like(query.family + ".%")
            )
        if query.actor_id:
            statement = statement.where(AuditEvent.actor_user_id == query.actor_id)
        for day, end in [(query.start_on, False), (query.end_on, True)]:
            if day:
                bound = datetime.combine(
                    day + timedelta(days=1) if end else day, time.min, ZoneInfo("Africa/Casablanca")
                ).astimezone(UTC)
                statement = statement.where(
                    AuditEvent.created_at < bound if end else AuditEvent.created_at >= bound
                )
        total = session.scalar(select(func.count()).select_from(statement.subquery())) or 0
        rows = session.execute(
            statement.order_by(AuditEvent.created_at.desc(), AuditEvent.id)
            .offset((query.page - 1) * query.page_size)
            .limit(query.page_size)
        ).all()
        items: list[dict[str, object]] = [
            dict(
                id=str(event.id),
                action=event.action,
                actor_id=str(event.actor_user_id) if event.actor_user_id else None,
                actor_name=name,
                created_at=event.created_at.isoformat(),
                target_user_id=str(event.target_user_id) if event.target_user_id else None,
                targets={
                    kind: str(value)
                    for kind in (
                        "contact",
                        "enquiry",
                        "property",
                        "development",
                        "offering",
                        "deal",
                    )
                    if (value := getattr(event, kind + "_id")) is not None
                },
            )
            for event, name in rows
        ]
        return page_result(items, total, query.page, query.page_size)


def purge_security(database: Database, now: datetime | None = None) -> int:
    clock = now or datetime.now(UTC)
    if clock.tzinfo is None or clock.utcoffset() is None:
        raise ValueError("AWARE_RETENTION_CLOCK_REQUIRED")
    clock = clock.astimezone(UTC)
    cutoff = clock.replace(
        year=clock.year - 2, day=min(clock.day, monthrange(clock.year - 2, clock.month)[1])
    )
    with database.session() as session, session.begin():
        eligible = (
            select(AuditEvent.id)
            .where(
                AuditEvent.action.in_(SECURITY_ACTIONS),
                AuditEvent.created_at < cutoff,
                *(
                    getattr(AuditEvent, kind + "_id").is_(None)
                    for kind in (
                        "contact",
                        "enquiry",
                        "property",
                        "development",
                        "offering",
                        "deal",
                    )
                ),
            )
            .order_by(AuditEvent.created_at, AuditEvent.id)
            .limit(500)
            .with_for_update(skip_locked=True)
        )
        return len(
            session.scalars(
                delete(AuditEvent).where(AuditEvent.id.in_(eligible)).returning(AuditEvent.id)
            ).all()
        )
