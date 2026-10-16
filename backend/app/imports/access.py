from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.identity.models import AGENCY_ID, Agency, User
from app.identity.security import IdentityError
from app.identity.sessions import (
    CurrentIdentity,
    current_identity,
    identity_for_session,
    require_role,
)
from app.imports.models import ImportBatch


def authorized(
    session: Session, token: str = "", sid: UUID | None = None, *, lock: bool = False
) -> CurrentIdentity:
    if lock:
        session.scalar(select(Agency).where(Agency.id == AGENCY_ID).with_for_update())
    identity = identity_for_session(session, sid) if sid else current_identity(session, token)
    if lock:
        session.scalars(select(User).where(User.id == identity.user.id).with_for_update()).all()
        session.expire_all()
        identity = identity_for_session(session, sid) if sid else current_identity(session, token)
    require_role(identity, {"manager"})
    return identity


def batch_for(session: Session, bid: UUID, *, lock: bool = False) -> ImportBatch:
    statement = select(ImportBatch).where(ImportBatch.id == bid)
    batch = session.scalar(statement.with_for_update() if lock else statement)
    if batch is None:
        raise IdentityError("NOT_FOUND", 404)
    return batch
