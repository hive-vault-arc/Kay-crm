from calendar import monthrange
from datetime import UTC, datetime, time, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import Uuid, delete, exists, func, literal, or_, select, text, union_all

from app.db.session import Database
from app.discovery.contracts import AuditActorsQuery, AuditQuery
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
    "users.delete",
    "users.reset-password",
    "users.confirm-handoff",
)


def read_audit(database: Database, token: str, query: AuditQuery) -> dict[str, object]:
    with database.session() as session:
        session.execute(text("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY"))
        require_role(current_identity(session, token), {"manager"})
        statement = (
            select(
                AuditEvent,
                func.coalesce(
                    User.display_name, "Source web : " + WebsiteSource.name, "Auteur non renseigné"
                ),
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
        if query.website_source_id:
            statement = statement.where(
                AuditEvent.actor_user_id.is_(None),
                AuditEvent.website_source_id == query.website_source_id,
            )
        if query.unattributed_actor:
            statement = statement.where(
                AuditEvent.actor_user_id.is_(None), AuditEvent.website_source_id.is_(None)
            )
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


def read_audit_actors(database: Database, token: str, query: AuditActorsQuery) -> dict[str, object]:
    """Distinct staff/web/unattributed attribution with history, never a general directory."""
    with database.session() as session:
        session.execute(text("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY"))
        require_role(current_identity(session, token), {"manager"})
        users = select(literal("user").label("kind"), User.id, User.display_name).where(
            exists(select(AuditEvent.id).where(AuditEvent.actor_user_id == User.id))
        )
        sources = select(
            literal("website").label("kind"),
            WebsiteSource.id,
            (literal("Source web : ") + WebsiteSource.name).label("display_name"),
        ).where(
            exists(
                select(AuditEvent.id).where(
                    AuditEvent.actor_user_id.is_(None),
                    AuditEvent.website_source_id == WebsiteSource.id,
                )
            )
        )
        unattributed = select(
            literal("unattributed").label("kind"),
            literal(None, type_=Uuid()).label("id"),
            literal("Auteur non renseigné").label("display_name"),
        ).where(
            exists(
                select(AuditEvent.id).where(
                    AuditEvent.actor_user_id.is_(None),
                    AuditEvent.website_source_id.is_(None),
                )
            )
        )
        authors = union_all(users, sources, unattributed).subquery()
        statement = select(authors.c.kind, authors.c.id, authors.c.display_name)
        if query.q:
            escaped = query.q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
            statement = statement.where(authors.c.display_name.ilike(f"%{escaped}%", escape="\\"))
        total = session.scalar(select(func.count()).select_from(statement.subquery())) or 0
        rows = session.execute(
            statement.order_by(func.lower(authors.c.display_name), authors.c.kind, authors.c.id)
            .offset((query.page - 1) * query.page_size)
            .limit(query.page_size)
        ).mappings()
        return page_result(
            [
                {
                    "kind": row["kind"],
                    "id": str(row["id"]) if row["id"] is not None else None,
                    "display_name": row["display_name"],
                }
                for row in rows
            ],
            total,
            query.page,
            query.page_size,
        )


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
