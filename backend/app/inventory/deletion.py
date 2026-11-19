"""Permanent catalogue deletion, serialized with ordinary inventory commands."""

from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import delete, or_, select, text
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.db.session import Database
from app.deals.history import append_event
from app.deals.models import Deal
from app.files.models import Document, DocumentVersion, OutboxEvent
from app.identity.security import IdentityError
from app.identity.sessions import CurrentIdentity
from app.inventory.deletion_models import BlobDeletion, DevelopmentIdentity, PropertyIdentity
from app.inventory.hierarchy_models import Block, Development, Floor, UnitType
from app.inventory.history import record
from app.inventory.models import Offering, Property
from app.inventory.reservation_models import Reservation
from app.inventory.stock_effects import flag_deals
from app.settings import Settings
from app.videos.models import InventoryVideo
from app.videos.service import part_count, part_key
from app.videos.storage import VideoStorage

REASON = "Suppression définitive du bien ou du programme."


def release_holds(session: Session, identity: CurrentIdentity, offerings: list[Offering]) -> None:
    from app.inventory.commands import bump

    by_id = {offering.id: offering for offering in offerings}
    holds = session.scalars(
        select(Reservation)
        .where(Reservation.offering_id.in_(by_id), Reservation.released_at.is_(None))
        .order_by(Reservation.id)
        .with_for_update()
    ).all()
    for hold in holds:
        offering = by_id[hold.offering_id]
        item = (
            session.get(Property, offering.property_id)
            if offering.property_id
            else session.get(Development, offering.development_id)
        )
        if item is None:
            raise IdentityError("NOT_FOUND", 404)
        offering.state = "available"
        offering.version += 1
        bump(item)
        event_id = record(
            session, identity, item, "offerings.reservation.released", offering, REASON
        )
        session.add(
            OutboxEvent(
                kind="inventory.reservation.released",
                inventory_event_id=event_id,
                dedupe_key=f"inventory/{event_id}",
            )
        )
        hold.released_at = datetime.now(UTC)
        hold.released_by_user_id = identity.user.id
        hold.release_reason = REASON
        hold.release_event_id = event_id
        deal = session.get_one(Deal, hold.deal_id, with_for_update=True)
        previous = deal.stage
        if deal.stage == "reserved":
            deal.stage = hold.previous_stage
        deal.stock_review_required = True
        deal.version += 1
        deal.updated_by_user_id = identity.user.id
        deal.updated_at = datetime.now(UTC)
        append_event(session, identity, deal, "reservation.released", previous, reason=REASON)
        session.flush()


def schedule_media_cleanup(
    session: Session, properties: list[UUID], developments: list[UUID]
) -> None:
    keys = set(
        session.scalars(
            select(DocumentVersion.object_key)
            .join(Document, Document.id == DocumentVersion.document_id)
            .where(
                or_(Document.property_id.in_(properties), Document.development_id.in_(developments))
            )
        )
    )
    videos = session.scalars(
        select(InventoryVideo)
        .where(
            or_(
                InventoryVideo.property_id.in_(properties),
                InventoryVideo.development_id.in_(developments),
            )
        )
        .with_for_update()
    ).all()
    for video in videos:
        if video.output_key:
            keys.add(video.output_key)
        keys.update(
            part_key(video.id, number)
            for number in range(min(max(0, video.next_part + 1), part_count(video.input_size)))
        )
    if keys:
        # In-flight transfers have a 90-second bound. Their final authorization will fail.
        session.execute(
            insert(BlobDeletion)
            .values(
                [
                    {"object_key": key, "available_at": datetime.now(UTC) + timedelta(minutes=2)}
                    for key in keys
                ]
            )
            .on_conflict_do_nothing()
        )


def remove(
    session: Session, identity: CurrentIdentity, target: UUID, *, development: bool
) -> tuple[Property | Development, UUID]:
    from app.inventory.commands import bump
    from app.inventory.selection import target_views

    root: Property | Development | None = (
        session.get(Development, target, with_for_update=True)
        if development
        else session.get(Property, target, with_for_update=True)
    )
    if root is None:
        raise IdentityError("NOT_FOUND", 404)
    units = (
        list(
            session.scalars(
                select(Property)
                .where(Property.development_id == target)
                .order_by(Property.id)
                .with_for_update()
            )
        )
        if development
        else []
    )
    items: list[Property | Development] = [*units, root]
    pids = [item.id for item in items if isinstance(item, Property)]
    dids = [target] if development else []
    offerings = list(
        session.scalars(
            select(Offering)
            .where(or_(Offering.property_id.in_(pids), Offering.development_id.in_(dids)))
            .order_by(Offering.id)
            .with_for_update()
        )
    )
    release_holds(session, identity, offerings)
    for offering in offerings:
        # Completed stock effects are immutable commercial history.
        if offering.state in {"draft", "available", "reserved"}:
            offering.state, offering.is_current = "withdrawn", False
            offering.version += 1
    session.flush()
    affected_offerings = [offering.id for offering in offerings]
    if isinstance(root, Property) and root.development_id:
        parent = session.get_one(Development, root.development_id, with_for_update=True)
        bump(parent)
        record(session, identity, parent, "developments.unit.deleted", reason=REASON)
        affected_offerings.extend(
            session.scalars(select(Offering.id).where(Offering.development_id == parent.id))
        )
    flag_deals(session, identity, affected_offerings)
    targets = target_views(session, offerings)
    schedule_media_cleanup(session, pids, dids)
    event_id: UUID | None = None
    for item in items:
        bump(item)
        action = "properties.deleted" if isinstance(item, Property) else "developments.deleted"
        event_id = record(session, identity, item, action, reason=REASON)
        retained = (
            session.get_one(PropertyIdentity, item.id)
            if isinstance(item, Property)
            else session.get_one(DevelopmentIdentity, item.id)
        )
        retained.deleted_at = datetime.now(UTC)
        retained.snapshot = next(
            (value for value in targets.values() if value["id"] == str(item.id)), {}
        )
        session.flush()
        session.execute(
            text("SELECT set_config('kay.inventory_deletion', :id, true)"), {"id": str(item.id)}
        )
        if isinstance(item, Development):
            blocks = select(Block.id).where(Block.development_id == target)
            session.execute(delete(Floor).where(Floor.block_id.in_(blocks)))
            session.execute(delete(Block).where(Block.development_id == target))
            session.execute(delete(UnitType).where(UnitType.development_id == target))
        session.delete(item)
        session.flush()
    if event_id is None:
        raise RuntimeError("INVENTORY_DELETE_EVENT_REQUIRED")
    return root, event_id


def cleanup_once(database: Database, settings: Settings) -> bool:
    with database.session() as session, session.begin():
        row = session.scalar(
            select(BlobDeletion)
            .where(BlobDeletion.available_at <= datetime.now(UTC))
            .order_by(BlobDeletion.available_at, BlobDeletion.object_key)
            .limit(1)
            .with_for_update(skip_locked=True)
        )
        if row is None:
            return False
        try:
            storage = VideoStorage(settings)
            storage.delete_blob(row.object_key)
            storage.path(row.object_key, partial=True).unlink(missing_ok=True)
        except IdentityError as error:
            row.last_error = error.code
            row.attempts += 1
            row.available_at = datetime.now(UTC) + timedelta(
                seconds=min(3600, 2 ** min(row.attempts, 12))
            )
        except OSError:
            row.last_error = "FILE_STORAGE_UNAVAILABLE"
            row.attempts += 1
            row.available_at = datetime.now(UTC) + timedelta(minutes=5)
        else:
            session.delete(row)
        return True
