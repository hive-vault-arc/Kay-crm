import csv
import io
from typing import cast
from uuid import UUID

from sqlalchemy import select, text

from app.contacts.contracts import ListQuery
from app.contacts.models import Contact
from app.contacts.projections import contact_views
from app.contacts.queries import list_in_session
from app.db.session import Database
from app.discovery.models import ExportJob
from app.identity.security import IdentityError
from app.imports.access import authorized

MAX_ROWS, MAX_BYTES = 50000, 20971520
HEADERS = (
    "contact_id",
    "name",
    "type",
    "primary_phone",
    "other_phones",
    "primary_email",
    "other_emails",
    "roles",
    "primary_agent",
    "contact_source",
    "created_at",
    "archived_at",
)
LEAD_HEADERS = ("enquiry_id", "status", "enquiry_source", "assigned_agent", "received_at")


def cell(value: object, *, phone: bool = False) -> str:
    result = "" if value is None else str(value)
    probe = result
    while probe and (probe[0].isspace() or probe[0] == "\ufeff" or ord(probe[0]) < 32):
        probe = probe[1:]
    if result and (phone or probe.startswith(("=", "+", "-", "@")) or result[0] in "\t\r\n"):
        return "'" + result
    return result


def generate(database: Database, eid: UUID) -> tuple[bytes, int]:
    output = io.StringIO(newline="")
    chunks = [b"\xef\xbb\xbf"]
    size = 3
    with database.session() as session:
        session.execute(text("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY"))
        row = session.get(ExportJob, eid)
        if row is None:
            raise IdentityError("NOT_FOUND", 404)
        identity = authorized(session, sid=row.request_session_id)
        if identity.user.id != row.author_user_id:
            raise IdentityError("FORBIDDEN", 403)
        writer = csv.writer(output, quoting=csv.QUOTE_ALL)
        writer.writerow(HEADERS + (LEAD_HEADERS if row.kind == "enquiries" else ()))
        query = ListQuery.model_validate(row.filters).model_copy(
            update={"page": 1, "page_size": 100}
        )
        count = 0
        while True:
            page = list_in_session(session, identity, row.kind, query)
            if cast(int, page["total"]) > MAX_ROWS:
                raise IdentityError("EXPORT_LIMIT_EXCEEDED", 422)
            items = cast(list[dict[str, object]], page["items"])
            ids = [
                cast(dict[str, object], item["contact"])["id"]
                if row.kind == "enquiries"
                else item["id"]
                for item in items
            ]
            records = session.scalars(select(Contact).where(Contact.id.in_(ids))).all()
            details = {
                str(key): value
                for key, value in contact_views(session, records, detail=True).items()
            }
            for item in items:
                contact_id = str(
                    cast(dict[str, object], item["contact"])["id"]
                    if row.kind == "enquiries"
                    else item["id"]
                )
                contact = details[contact_id]
                phones = cast(list[dict[str, object]], contact["phones"])
                emails = cast(list[dict[str, object]], contact["emails"])
                values = [
                    contact_id,
                    contact["name"],
                    contact["type"],
                    cell(contact["primary_phone"], phone=True),
                    cell(
                        "|".join(str(p["number"]) for p in phones if not p["is_primary"]),
                        phone=True,
                    ),
                    contact["primary_email"],
                    "|".join(str(e["email"]) for e in emails if not e["is_primary"]),
                    "|".join(cast(list[str], contact["roles"])),
                    cast(dict[str, object], contact["primary_agent"])["display_name"],
                    contact["source"],
                    contact["created_at"],
                    contact["archived_at"],
                ]
                if row.kind == "enquiries":
                    agent = cast(dict[str, object] | None, item["assigned_agent"])
                    values += [
                        item["id"],
                        item["status"],
                        item["source"],
                        agent["display_name"] if agent else "",
                        item["received_at"],
                    ]
                writer.writerow(
                    [value if i in (3, 4) else cell(value) for i, value in enumerate(values)]
                )
                count += 1
            chunk = output.getvalue().encode("utf-8")
            size += len(chunk)
            if size > MAX_BYTES:
                raise IdentityError("EXPORT_LIMIT_EXCEEDED", 422)
            chunks.append(chunk)
            output.seek(0)
            output.truncate(0)
            if not page["has_next"]:
                break
            query = query.model_copy(update={"page": query.page + 1})
    return b"".join(chunks), count
