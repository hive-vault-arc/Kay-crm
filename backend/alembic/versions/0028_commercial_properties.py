"""Allow commercial premises throughout physical inventory and matching."""

import sqlalchemy as sa

from alembic import op
from app.settings import load_settings

revision = "0028_commercial_properties"
down_revision = "0027_record_archive"
branch_labels = None
depends_on = None


def categories(include_commercial: bool) -> str:
    values = ("villa", "house", "apartment", "land")
    if include_commercial:
        values += ("commercial",)
    return ",".join(repr(value) for value in values)


def criterion_check(allowed: str) -> str:
    return (
        "(key='category' AND value_number IS NULL AND value_bool IS NULL AND "
        f"(value_text IS NULL OR value_text IN ({allowed}))) "
        "OR (key='location' AND value_number IS NULL AND value_bool IS NULL AND "
        "(value_text IS NULL OR length(btrim(value_text))>0)) OR (key IN "
        "('area_sqm','rooms') AND value_text IS NULL AND value_bool IS NULL AND "
        "(value_number IS NULL OR (value_number>0 AND value_number!='NaN'::numeric "
        "AND (key<>'rooms' OR (value_number=trunc(value_number) AND "
        "value_number<=1000))))) OR (key IN ('parking','elevator') AND value_text IS "
        "NULL AND value_number IS NULL)"
    )


def replace_constraints(include_commercial: bool) -> None:
    allowed = categories(include_commercial)
    for table, name, extra in (
        ("property", "property_category", ""),
        ("unit_type", "unit_type_category", ""),
        ("development", "development_category", "'mixed',"),
    ):
        op.drop_constraint(name, table, type_="check")
        op.create_check_constraint(name, table, f"category IN ({extra}{allowed})")
    op.drop_constraint("criterion_typed_value", "requirement_criterion", type_="check")
    op.create_check_constraint(
        "criterion_typed_value", "requirement_criterion", criterion_check(allowed)
    )


def upgrade() -> None:
    replace_constraints(include_commercial=True)


def downgrade() -> None:
    if load_settings().app_environment not in {"test", "benchmark", "recovery"}:
        raise RuntimeError("COMMERCIAL_PROPERTY_DOWNGRADE_REFUSED")
    bind = op.get_bind()
    for table in ("property", "unit_type", "development"):
        category = sa.column("category")
        found = (
            sa.select(sa.literal(True))
            .select_from(sa.table(table, category))
            .where(category == "commercial")
            .limit(1)
        )
        if bind.scalar(found):
            raise RuntimeError("COMMERCIAL_PROPERTY_DATA_DOWNGRADE_REFUSED")
    if bind.scalar(
        sa.text(
            "SELECT EXISTS(SELECT 1 FROM requirement_criterion "
            "WHERE key='category' AND value_text='commercial')"
        )
    ):
        raise RuntimeError("COMMERCIAL_PROPERTY_DATA_DOWNGRADE_REFUSED")
    replace_constraints(include_commercial=False)
