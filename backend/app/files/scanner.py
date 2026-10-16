"""ClamD INSTREAM over loopback; no shell, filename or fake-success fallback."""

import socket
import struct

from app.identity.security import IdentityError
from app.settings import Settings


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
    try:
        with socket.create_connection(
            (settings.antivirus_host, settings.antivirus_port), timeout=20
        ) as connection:
            connection.sendall(b"zVERSION\0")
            version = response(connection)
        parts = version.split("/")
        if not version.startswith("ClamAV ") or len(parts) < 3 or not parts[1].isdigit():
            raise OSError("SIGNATURES_UNAVAILABLE")
        with socket.create_connection(
            (settings.antivirus_host, settings.antivirus_port), timeout=20
        ) as connection:
            connection.sendall(b"zINSTREAM\0")
            for offset in range(0, len(data), 65536):
                chunk = data[offset : offset + 65536]
                connection.sendall(struct.pack("!I", len(chunk)) + chunk)
            connection.sendall(struct.pack("!I", 0))
            verdict = response(connection)
        if verdict.endswith(": OK"):
            return "clean", version[:160]
        if verdict.endswith(" FOUND"):
            return "rejected", version[:160]
        raise OSError("SCAN_FAILED")
    except OSError, UnicodeError:
        raise IdentityError("ANTIVIRUS_UNAVAILABLE", 503) from None
