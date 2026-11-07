"""One catalogue-derived visibility rule for prepared PDF metadata and bytes."""

from app.generated.catalog import TEMPLATES


def visible_template_codes(role: str) -> tuple[str, ...]:
    if role not in {"agent", "manager", "administrator"}:
        return ()
    return tuple(
        template.code
        for template in TEMPLATES
        if not template.restricted or role in {"manager", "administrator"}
    )
