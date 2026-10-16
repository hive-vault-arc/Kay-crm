"""Manager-only external result preview returns shared inventory facts only."""

from uuid import UUID

from sqlalchemy import text

from app.db.session import Database
from app.identity.security import IdentityError
from app.identity.sessions import current_identity, require_role
from app.inventory.models import Offering
from app.inventory.stock_review import preview


def stock_review(
    database: Database, token: str, target: UUID, oid: UUID, *, development: bool
) -> dict[str, object]:
    with database.session() as session:
        session.execute(text("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY"))
        identity = current_identity(session, token)
        require_role(identity, {"manager"})
        offering = session.get(Offering, oid)
        if (
            offering is None
            or (offering.development_id if development else offering.property_id) != target
        ):
            raise IdentityError("NOT_FOUND", 404)
        return preview(session, offering, None, external=True)
