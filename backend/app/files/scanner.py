"""ClamD INSTREAM at the configured endpoint; no shell or fake-success fallback."""

import socket
import struct
from collections.abc import Iterable
from typing import BinaryIO

from app.identity.security import IdentityError
from app.settings import Settings

IO_TIMEOUT_SECONDS = 20
VIDEO_VERDICT_TIMEOUT_SECONDS = 135


def response(connection: socket.socket) -> str:
    result = bytearray()
    while b"\0" not in result and len(result) < 4096:
        chunk = connection.recv(1024)
        if not chunk:
            break
        result.extend(chunk)
    if b"\0" not in result:
        raise OSError("SCANNER_PROTOCOL")
    return bytes(result).split(b"\0", 1)[0].decode("ascii", errors="replace")


def scan(settings: Settings, data: bytes) -> tuple[str, str]:
    return scan_chunks(
        settings, (data[offset : offset + 65536] for offset in range(0, len(data), 65536))
    )


def scan_stream(settings: Settings, source: BinaryIO) -> tuple[str, str]:
    return scan_chunks(
        settings,
        iter(lambda: source.read(65536), b""),
        verdict_timeout=VIDEO_VERDICT_TIMEOUT_SECONDS,
    )


def scan_chunks(
    settings: Settings, chunks: Iterable[bytes], *, verdict_timeout: int = IO_TIMEOUT_SECONDS
) -> tuple[str, str]:
    try:
        with socket.create_connection(
            (settings.antivirus_host, settings.antivirus_port), timeout=IO_TIMEOUT_SECONDS
        ) as connection:
            connection.sendall(b"zVERSION\0")
            version = response(connection)
        parts = version.split("/")
        if not version.startswith("ClamAV ") or len(parts) < 3 or not parts[1].isdigit():
            raise OSError("SIGNATURES_UNAVAILABLE")
        with socket.create_connection(
            (settings.antivirus_host, settings.antivirus_port), timeout=IO_TIMEOUT_SECONDS
        ) as connection:
            connection.sendall(b"zINSTREAM\0")
            for chunk in chunks:
                connection.sendall(struct.pack("!I", len(chunk)) + chunk)
            connection.sendall(struct.pack("!I", 0))
            if verdict_timeout != IO_TIMEOUT_SECONDS:
                connection.settimeout(verdict_timeout)
            verdict = response(connection)
        if verdict.endswith(": OK"):
            return "clean", version[:160]
        if verdict.endswith(" FOUND"):
            return "rejected", version[:160]
        raise OSError("SCAN_FAILED")
    except OSError, UnicodeError:
        raise IdentityError("ANTIVIRUS_UNAVAILABLE", 503) from None
