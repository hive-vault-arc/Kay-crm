"""Resolve civil input on the server, not an unversioned browser timezone database."""

from datetime import UTC, datetime

from app.identity.security import IdentityError
from app.schedule.rules import ZONE


def resolve_local(value: str) -> dict[str, object]:
    try:
        local = datetime.strptime(value, "%Y-%m-%dT%H:%M")
        if local.strftime("%Y-%m-%dT%H:%M") != value or not 2000 <= local.year <= 2100:
            raise ValueError
    except ValueError:
        raise IdentityError("VALIDATION_ERROR", 422) from None
    instants = set()
    for fold in (0, 1):
        instant = local.replace(tzinfo=ZONE, fold=fold).astimezone(UTC)
        if instant.astimezone(ZONE).replace(tzinfo=None) == local:
            instants.add(instant)
    return {
        "time_zone": "Africa/Casablanca",
        "choices": [
            {"instant": v.isoformat(), "local": v.astimezone(ZONE).isoformat()}
            for v in sorted(instants)
        ],
    }
