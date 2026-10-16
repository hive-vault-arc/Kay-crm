"""Inspect the bundled public CA without importing settings or opening a connection."""

import re
import ssl
import sys
from pathlib import Path

from app.runtime import BACKEND_ROOT

CA_PATH = BACKEND_ROOT / "config" / "ca" / "digitalocean-postgres-ca.crt"


def checked_ca_path() -> Path:
    """Require one readable public CA certificate, with no key or extra payload."""
    try:
        certificate = CA_PATH.resolve(strict=True)
        content = certificate.read_bytes()
        if not re.fullmatch(
            rb"\s*-----BEGIN CERTIFICATE-----\r?\n[A-Za-z0-9+/=\r\n]+"
            rb"-----END CERTIFICATE-----\s*",
            content,
        ):
            raise ValueError
        context = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
        context.load_verify_locations(cafile=str(certificate))
        if len(context.get_ca_certs()) != 1:
            raise ValueError
        return certificate
    except OSError, ValueError:
        raise RuntimeError("CONFIGURATION_INVALID: DATABASE_URL:TLS_ROOT_INVALID") from None


def main() -> int:
    try:
        certificate = checked_ca_path()
    except RuntimeError:
        print("CONFIGURATION_INVALID: DATABASE_URL:TLS_ROOT_INVALID", file=sys.stderr)
        return 1
    print(f"POSTGRES_CA_OK: sslrootcert={certificate}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
