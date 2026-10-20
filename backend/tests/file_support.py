"""Only synthetic binary fixtures; never copy a user's files into test storage."""

import base64
import io
import struct
import zipfile
import zlib
from uuid import UUID, uuid4

from PIL import Image
from pypdf import PdfWriter

from app.files.contracts import NewDocument, PermitRequest
from app.files.service import document_command, issue_permit
from app.identity.security import csrf_token
from app.settings import load_settings


def image_bytes(format_name="PNG", size=None):
    output = io.BytesIO()
    Image.new("RGB", (8, 8), (123, 165, 190)).save(output, format=format_name)
    data = output.getvalue()
    if size is not None:
        padding = b"\0" * (size - len(data) - 12)
        chunk = b"npAD" + padding
        data = (
            data[:-12]
            + struct.pack("!I", len(padding))
            + chunk
            + struct.pack("!I", zlib.crc32(chunk))
            + data[-12:]
        )
    return data


def eicar_bytes():
    # Official harmless antivirus test string, constructed in memory only.
    return base64.b64decode(
        "WDVPIVAlQEFQWzRcUFpYNTQoUF4pN0NDKTd9JEVJQ0FSLVNUQU5EQVJELUFOVElWSVJVUy1URVNULUZJTEUhJEgrSCo="
    )


def pdf_bytes(infected=False):
    output = io.BytesIO()
    writer = PdfWriter()
    writer.add_blank_page(width=100, height=100)
    writer.write(output)
    result = output.getvalue()
    return result.replace(b"%%EOF", b"% " + eicar_bytes() + b"\n%%EOF") if infected else result


def office_bytes(extension="docx", extra=None):
    main = "word/document.xml" if extension == "docx" else "xl/workbook.xml"
    content_type = (
        "wordprocessingml.document.main+xml"
        if extension == "docx"
        else "spreadsheetml.sheet.main+xml"
    )
    output = io.BytesIO()
    with zipfile.ZipFile(output, "w") as archive:
        archive.writestr(
            "[Content_Types].xml",
            '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            '<Override PartName="/'
            + main
            + '" ContentType="application/vnd.openxmlformats-officedocument.'
            + content_type
            + '"/></Types>',
        )
        archive.writestr(
            "_rels/.rels",
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/'
            'officeDocument/2006/relationships/officeDocument" Target="'
            + main
            + '"/></Relationships>',
        )
        main_xml = (
            '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
            "<w:body><w:p><w:r><w:t>SP09 synthétique</w:t></w:r></w:p></w:body></w:document>"
            if extension == "docx"
            else '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            "<sheets/></workbook>"
        )
        archive.writestr(main, main_xml)
        if extra:
            archive.writestr(*extra)
    return output.getvalue()


def new_document(
    settings,
    database,
    token,
    parent_kind,
    parent_id,
    data,
    filename="Synthétique.png",
    mime_type="image/png",
    key=None,
    purpose="attachment",
):
    return document_command(
        database,
        token,
        key or uuid4(),
        NewDocument(
            parent_kind=parent_kind,
            parent_id=parent_id,
            filename=filename,
            mime_type=mime_type,
            size_bytes=len(data),
            purpose=purpose,
        ),
    )


def grant(database, token, document, action="upload", version_id=None):
    binding = csrf_token(load_settings().facade_secret.get_secret_value(), token)
    result = issue_permit(
        database,
        token,
        PermitRequest(
            action=action,
            document_id=UUID(document["id"]),
            expected_version=document["version"],
            version_id=UUID(version_id) if version_id else None,
        ),
        binding,
    )
    return {**result, "binding": binding}
