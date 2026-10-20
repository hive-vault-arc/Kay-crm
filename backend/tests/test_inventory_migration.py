"""Populated 0007 compatibility and fail-closed finite numeric guards."""

from decimal import Decimal
from uuid import uuid4

import pytest
from sqlalchemy import func, select, text, update
from sqlalchemy.exc import IntegrityError

from app.inventory.models import InventoryEvent, Offering, Property
from tests.contact_support import actor
from tests.test_isolation_migrations import migrate

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]


def test_populated_finite_upgrade_preserves_drafts_and_refuses_invalid_existing_value(
    settings, database
):
    uid, _ = actor(settings, database, "manager")
    pid, oid = uuid4(), uuid4()
    assert migrate("downgrade", "0007_standalone_inventory").returncode == 0
    try:
        with database.session() as session, session.begin():
            session.execute(
                text(
                    "INSERT INTO property(id,reference,category,created_by_user_id) "
                    "VALUES(:pid,'SP07-MIGRATION','land',:uid)"
                ),
                {"pid": pid, "uid": uid},
            )
            session.execute(
                text(
                    "INSERT INTO offering(id,property_id,kind,created_by_user_id) "
                    "VALUES(:oid,:pid,'sale',:uid)"
                ),
                {"pid": pid, "oid": oid, "uid": uid},
            )
            for action in ("properties.created", "offerings.created"):
                session.execute(
                    text(
                        "INSERT INTO "
                        "inventory_event(id,property_id,actor_user_id,actor_display_name,"
                        "action,property_version) "
                        "VALUES(:id,:pid,:uid,'SP07 acteur synthétique',:action,1)"
                    ),
                    {"id": uuid4(), "pid": pid, "uid": uid, "action": action},
                )
            session.execute(
                update(Offering).where(Offering.id == oid).values(price_mad=Decimal("NaN"))
            )
        assert migrate("upgrade", "head").returncode != 0
        with database.session() as session, session.begin():
            assert (
                session.scalar(text("SELECT version_num FROM alembic_version"))
                == "0007_standalone_inventory"
            )
            assert session.scalar(select(func.count()).select_from(InventoryEvent)) == 2
            session.execute(
                update(Offering).where(Offering.id == oid).values(price_mad=Decimal("1.01"))
            )
        assert migrate("upgrade", "head").returncode == 0
        with database.session() as session:
            assert session.get(Property, pid).area_sqm is None
            assert session.get(Offering, oid).price_mad == Decimal("1.01")
            assert session.scalar(select(func.count()).select_from(InventoryEvent)) == 2
        for model, field in ((Property, "area_sqm"), (Offering, "price_mad")):
            with pytest.raises(IntegrityError), database.session() as session, session.begin():
                session.execute(update(model).values(**{field: Decimal("NaN")}))
        with pytest.raises(IntegrityError), database.session() as session, session.begin():
            session.add(
                InventoryEvent(
                    property_id=pid,
                    offering_id=oid,
                    actor_user_id=uid,
                    actor_display_name="SP07 acteur synthétique",
                    action="offerings.created",
                    property_version=1,
                    price_mad=Decimal("NaN"),
                )
            )
    finally:
        # Restore only the synthetic nonfinite probe, never a real record.
        with database.session() as session, session.begin():
            session.execute(
                text(
                    "UPDATE offering SET price_mad=NULL WHERE id=:id AND price_mad='NaN'::numeric"
                ),
                {"id": oid},
            )
        assert migrate("upgrade", "head").returncode == 0


def test_commercial_category_upgrade_preserves_existing_and_refuses_lossy_downgrade(
    settings, database
):
    uid, _ = actor(settings, database, "manager")
    legacy_id, commercial_id = uuid4(), uuid4()
    with database.session() as session, session.begin():
        session.execute(
            text(
                "INSERT INTO property(id,reference,category,created_by_user_id) "
                "VALUES(:id,'COMMERCIAL-LEGACY','land',:uid)"
            ),
            {"id": legacy_id, "uid": uid},
        )
    assert migrate("downgrade", "0027_record_archive").returncode == 0
    try:
        with database.session() as session:
            assert session.get(Property, legacy_id).category == "land"
        with pytest.raises(IntegrityError), database.session() as session, session.begin():
            session.execute(
                text(
                    "INSERT INTO property(id,reference,category,created_by_user_id) "
                    "VALUES(:id,'COMMERCIAL-NEW','commercial',:uid)"
                ),
                {"id": commercial_id, "uid": uid},
            )
        assert migrate("upgrade", "head").returncode == 0
        with database.session() as session, session.begin():
            assert session.get(Property, legacy_id).category == "land"
            session.execute(
                text(
                    "INSERT INTO property(id,reference,category,created_by_user_id) "
                    "VALUES(:id,'COMMERCIAL-NEW','commercial',:uid)"
                ),
                {"id": commercial_id, "uid": uid},
            )
        assert migrate("downgrade", "0027_record_archive").returncode != 0
        with database.session() as session:
            assert session.get(Property, commercial_id).category == "commercial"
            assert (
                session.scalar(text("SELECT version_num FROM alembic_version"))
                == "0030_generated_documents"
            )
    finally:
        assert migrate("upgrade", "head").returncode == 0
