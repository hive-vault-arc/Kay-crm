"""Bounded real SQL samples keep the fixed load generator compatible with qualification."""

import pytest
from sqlalchemy import func, select, text

from app.contacts.contracts import ListQuery
from app.contacts.models import Contact, ContactPhone, ContactRole, Enquiry
from app.contacts.queries import read_list
from app.deals.contracts import ChildQuery
from app.deals.queries import read_children, read_detail
from app.inventory.hierarchy_models import Block, Development, Floor, UnitType
from app.inventory.reservation_models import Reservation
from benchmarks.dataset import identity, populate_inventory
from tests.contact_support import actor

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]


@pytest.mark.parametrize("number", [1, 16001])
def test_load_generator_qualifies_programme_and_standalone_conversion(settings, database, number):
    uid, token = actor(settings, database, "manager")
    cid, eid = identity("contact", number), identity("enquiry", number)
    with database.session() as session, session.begin():
        session.add(
            Contact(
                id=cid,
                name=f"SP22 contact synthétique {number}",
                type="person",
                primary_agent_id=uid,
                created_by_user_id=uid,
                source="manual",
                country="MA",
                languages=["french", "darija"],
            )
        )
        session.flush()
        session.add(ContactRole(contact_id=cid, role="owner"))
        session.add(
            ContactPhone(
                contact_id=cid,
                origin_contact_id=cid,
                normalized=f"+2126{10000000 + number}",
                label="Synthétique",
                is_primary=True,
                created_by_user_id=uid,
            )
        )
        session.add(
            Enquiry(
                id=eid,
                contact_id=cid,
                origin_contact_id=cid,
                message="Demande synthétique SP22",
                source="manual",
                assigned_agent_id=uid,
                created_by_user_id=uid,
                initial_budget="1000000.00 MAD",
                campaign_source="facebook",
                rating="warm",
            )
        )
        if number == 1:
            did = identity("development", 1)
            bid, fid, tid = identity("block", 1), identity("floor:1", 2), identity("type:1", 2)
            session.add(
                Development(
                    id=did,
                    reference="SP22-D-1",
                    name="Programme synthétique SP22 1",
                    created_by_user_id=uid,
                )
            )
            session.flush()
            session.add(Block(id=bid, development_id=did, code="B1", label="Bloc synthétique"))
            session.flush()
            session.add(Floor(id=fid, block_id=bid, code="F2", label="Étage synthétique 2"))
            session.add(
                UnitType(
                    id=tid,
                    development_id=did,
                    code="T2",
                    label="Type synthétique 2",
                    category="apartment",
                    default_area_sqm=100,
                    default_rooms=2,
                )
            )
    with database.engine.begin() as connection:
        populate_inventory(connection, {"actor": uid, "first": number, "last": number})
        connection.execute(text("SET CONSTRAINTS ALL IMMEDIATE"))
    deal = read_detail(database, token, identity("deal", number))
    assert deal["enquiry_id"] == str(eid)
    assert deal["title"].startswith(f"SP22 contact synthétique {number} · ")
    assert deal["initial_budget"] == "1000000.00 MAD"
    assert deal["client_snapshot"]["languages"] == ["french", "darija"]
    assert deal["client_snapshot"]["calling_code"] == "+212"
    project = deal["projects"][0]
    assert project["development_id"] == (str(identity("development", 1)) if number == 1 else None)
    assert project["property_id"] == (str(identity("property", number)) if number > 16000 else None)
    assert deal["active_reservation"] is None and deal["offering"]["state"] == "available"
    assert read_list(database, token, "enquiries", ListQuery())["total"] == 0
    assert read_list(database, token, "enquiries", ListQuery(status="converted"))["total"] == 1
    history = read_children(database, token, identity("deal", number), "history", ChildQuery())
    assert history["items"][0]["qualification"]["projects"] == deal["projects"]
    with database.session() as session:
        assert session.get(Enquiry, eid).converted_deal_id == identity("deal", number)
        assert session.get(Enquiry, eid).version == 2
        assert session.scalar(select(func.count()).select_from(Reservation)) == 0
