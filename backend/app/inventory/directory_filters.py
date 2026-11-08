"""Shared exact directory predicates; all campaign criteria bind the same offer."""

from decimal import Decimal

from sqlalchemy import ColumnElement, case, select

from app.inventory.contracts import InventoryQueryFields
from app.inventory.hierarchy_models import Development
from app.inventory.models import Offering, Property


def comparison_price() -> ColumnElement[Decimal | None]:
    """Existing sale/annual-rental comparison; holiday periods are not annualized."""
    return case(
        (
            Offering.kind == "rental",
            Offering.price_mad * case((Offering.price_period == "month", 12), else_=1),
        ),
        else_=case((Offering.kind == "sale", Offering.price_mad), else_=None),
    )


def directory_filters(
    query: InventoryQueryFields, *, development: bool = False
) -> list[ColumnElement[bool]]:
    filters: list[ColumnElement[bool]] = []
    if not development:
        if query.min_area_sqm is not None:
            filters.append(Property.area_sqm >= Decimal(query.min_area_sqm))
        if query.min_rooms is not None:
            filters.append(Property.rooms >= query.min_rooms)
    if not (
        query.offering_kind
        or query.state
        and query.state != "all"
        or query.min_comparison_mad is not None
        or query.max_comparison_mad is not None
    ):
        return filters
    target = Development if development else Property
    campaign = (
        select(Offering.id)
        .where((Offering.development_id if development else Offering.property_id) == target.id)
        .correlate(target)
    )
    if query.offering_kind:
        campaign = campaign.where(Offering.kind == query.offering_kind)
    if query.state and query.state != "all":
        campaign = campaign.where(Offering.state == query.state)
    if query.state != "withdrawn":
        campaign = campaign.where(Offering.is_current)
    comparison = comparison_price()
    if query.min_comparison_mad is not None:
        campaign = campaign.where(comparison >= Decimal(query.min_comparison_mad))
    if query.max_comparison_mad is not None:
        campaign = campaign.where(comparison <= Decimal(query.max_comparison_mad))
    filters.append(campaign.exists())
    return filters
