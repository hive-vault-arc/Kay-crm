"""Synthetic SP-11 fixtures call the real command boundary on the isolated target."""

from uuid import UUID, uuid4

from app.deals.commands import command
from app.deals.contracts import EditDeal, NewCustomerOffer, NewDeal
from tests.contact_support import actor, create_lead
from tests.test_ownership import cid


def setup(settings, database):
    uid, token = actor(settings, database)
    lead = create_lead(settings, database, token)
    return uid, token, cid(lead), UUID(lead["id"])


def run(settings, database, token, body, did=None, oid=None, key=None):
    return command(
        database, token, settings.facade_secret.get_secret_value(), key or uuid4(), body, did, oid
    )


def new(contact, **values):
    return NewDeal.model_validate(
        {
            "contact_id": str(contact),
            "initial_budget": "1000000",
            "purchase_reasons": ["residence"],
            "projects": [{"external_name": "Projet synthétique SP11"}],
            "next_action": "Rappeler le contact",
            **values,
        }
    )


def edit(version=1, **values):
    return EditDeal.model_validate(
        {
            "initial_budget": "1500000",
            "purchase_reasons": ["residence", "investment"],
            "projects": [{"external_name": "Projet actualisé"}],
            "next_action": "Confirmer le rendez-vous",
            "expected_version": version,
            **values,
        }
    )


def offer(version=1, **values):
    return NewCustomerOffer.model_validate(
        {
            "expected_version": version,
            "amount_mad": "11999.99",
            "price_period": "month",
            "conditions": "Proposition synthétique distincte",
            **values,
        }
    )
