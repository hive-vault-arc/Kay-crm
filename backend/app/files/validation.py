"""Bounded structural validation before antivirus; a valid format is not a clean verdict."""

import io
import logging
import warnings
import zipfile
from pathlib import PurePosixPath
from xml.etree import ElementTree

from PIL import Image, UnidentifiedImageError
from pypdf import PdfReader, apply_configuration
from pypdf.errors import PyPdfError
from pypdf.generic import ArrayObject, DictionaryObject, IndirectObject

from app.files.contracts import FORMATS
from app.identity.security import IdentityError

# Parser warnings can contain untrusted document fragments; emit only our safe error code.
logging.getLogger("pypdf").setLevel(logging.CRITICAL + 1)


def validate_file(data: bytes, filename: str, mime_type: str) -> None:
    extension = PurePosixPath(filename).suffix.lower()
    if FORMATS.get(extension) != mime_type or data[:2] == b"MZ":
        raise IdentityError("UNSUPPORTED_MEDIA_TYPE", 415)
    try:
        if extension in {".jpg", ".jpeg", ".png", ".webp"}:
            validate_image(data, mime_type)
        elif extension == ".pdf":
            validate_pdf(data)
        else:
            validate_office(data, extension)
    except (
        ValueError,
        OSError,
        KeyError,
        TypeError,
        RecursionError,
        OverflowError,
        UnidentifiedImageError,
        Image.DecompressionBombError,
        Image.DecompressionBombWarning,
        PyPdfError,
        zipfile.BadZipFile,
        ElementTree.ParseError,
    ):
        raise IdentityError("UNSUPPORTED_MEDIA_TYPE", 415) from None


def validate_image(data: bytes, mime_type: str) -> None:
    with warnings.catch_warnings():
        warnings.simplefilter("error", Image.DecompressionBombWarning)
        with Image.open(io.BytesIO(data)) as image:
            if (
                Image.MIME.get(image.format or "") != mime_type
                or image.width * image.height > 25_000_000
            ):
                raise ValueError("IMAGE_LIMIT")
            image.verify()
        with Image.open(io.BytesIO(data)) as image:
            if getattr(image, "n_frames", 1) > 100:
                raise ValueError("IMAGE_LIMIT")
            for frame in range(getattr(image, "n_frames", 1)):
                image.seek(frame)
                image.load()


def validate_pdf(data: bytes) -> None:
    if not data.startswith(b"%PDF-") or b"%%EOF" not in data[-1024:]:
        raise ValueError("PDF_SIGNATURE")
    with apply_configuration(
        maximum_declared_stream_length=40_000_000,
        zlib_maximum_output_length=40_000_000,
        stream_decoding_work_maximum_length=40_000_000,
        page_tree_maximum_entries=3000,
        jbig2dec_binary=None,
    ):
        reader = PdfReader(io.BytesIO(data), strict=True)
        if reader.is_encrypted or len(reader.pages) > 1000:
            raise ValueError("PDF_LIMIT")
        validate_pdf_objects(reader.trailer)
        decoded = 0
        for page in reader.pages:
            contents = page.get_contents()
            if contents is not None:
                decoded += len(contents.get_data())
            if decoded > 40_000_000:
                raise ValueError("PDF_LIMIT")


def validate_pdf_objects(root: object) -> None:
    stack = [root]
    visited: set[tuple[int, int]] = set()
    forbidden = {
        "/JavaScript",
        "/JS",
        "/Launch",
        "/EmbeddedFiles",
        "/EmbeddedFile",
        "/RichMedia",
        "/XFA",
        "/AA",
        "/OpenAction",
    }
    count = 0
    while stack:
        item = stack.pop()
        count += 1
        if count > 10000:
            raise ValueError("PDF_OBJECT_LIMIT")
        if isinstance(item, IndirectObject):
            key = item.idnum, item.generation
            if key in visited:
                continue
            visited.add(key)
            item = item.get_object()
        if isinstance(item, DictionaryObject):
            if forbidden.intersection(item):
                raise ValueError("ACTIVE_PDF")
            stack.extend(item.values())
        elif isinstance(item, ArrayObject):
            stack.extend(item)


def xml(data: bytes) -> ElementTree.Element:
    # No DTD/entity processing or external relationships in uploaded office packages.
    decoded = data.decode("utf-8-sig")
    if "\0" in decoded or "<!DOCTYPE" in decoded.upper() or "<!ENTITY" in decoded.upper():
        raise ValueError("XML_ENTITY")
    return ElementTree.fromstring(decoded)  # noqa: S314 - explicit DTD/entity rejection above.


def validate_office(data: bytes, extension: str) -> None:
    if not data.startswith(b"PK\x03\x04"):
        raise ValueError("OFFICE_SIGNATURE")
    main = "word/document.xml" if extension == ".docx" else "xl/workbook.xml"
    expected = (
        "wordprocessingml.document.main+xml"
        if extension == ".docx"
        else "spreadsheetml.sheet.main+xml"
    )
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        entries = archive.infolist()
        names = {entry.filename for entry in entries}
        if (
            len(entries) > 2000
            or len(names) != len(entries)
            or len({name.casefold() for name in names}) != len(entries)
            or sum(entry.file_size for entry in entries) > 40 * 1024 * 1024
        ):
            raise ValueError("OFFICE_LIMIT")
        if not {"[Content_Types].xml", "_rels/.rels", main} <= names:
            raise ValueError("OFFICE_STRUCTURE")
        for entry in entries:
            name = entry.filename.lower()
            if (
                entry.flag_bits & 1
                or name.startswith("/")
                or "\\" in name
                or ":" in name
                or ".." in PurePosixPath(name).parts
                or entry.file_size > 20 * 1024 * 1024
                or (
                    entry.file_size > 1024 * 1024
                    and entry.file_size > max(1, entry.compress_size) * 200
                )
                or any(part in name for part in ("vbaproject", "activex", "embeddings/"))
                or PurePosixPath(name).suffix
                in {".exe", ".dll", ".com", ".bat", ".cmd", ".ps1", ".js", ".vbs", ".zip", ".jar"}
            ):
                raise ValueError("OFFICE_ACTIVE_CONTENT")
            contents = archive.read(entry)
            if name.endswith((".xml", ".rels")):
                root = xml(contents)
                if any(node.attrib.get("TargetMode") == "External" for node in root.iter()):
                    raise ValueError("OFFICE_EXTERNAL_LINK")
        types = archive.read("[Content_Types].xml")
        type_nodes = xml(types)
        main_type = "application/vnd.openxmlformats-officedocument." + expected
        if b"macroenabled" in types.lower() or not any(
            node.attrib.get("PartName") == "/" + main
            and node.attrib.get("ContentType") == main_type
            for node in type_nodes
        ):
            raise ValueError("OFFICE_CONTENT_TYPE")
        namespace = (
            "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            if extension == ".docx"
            else "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
        )
        root_name = "document" if extension == ".docx" else "workbook"
        if xml(archive.read(main)).tag != "{" + namespace + "}" + root_name:
            raise ValueError("OFFICE_MAIN_PART")
