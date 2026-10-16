"""Bounded password hashing, opaque proofs and safe identity errors."""

import hashlib
import hmac
import re
import secrets
from functools import lru_cache

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError
from argon2.low_level import Type
from email_validator import EmailNotValidError, validate_email

HASHER = PasswordHasher(time_cost=3, memory_cost=65536, parallelism=4, type=Type.ID)
TOKEN_PATTERN = re.compile(r"^[A-Za-z0-9_-]{43}$")


class IdentityError(Exception):
    def __init__(self, code: str, status: int = 400) -> None:
        self.code = code
        self.status = status
        super().__init__(code)


def normalize_email(value: str) -> str:
    try:
        return validate_email(value.strip(), check_deliverability=False).normalized.lower()
    except EmailNotValidError:
        raise IdentityError("VALIDATION_ERROR", 422) from None


def validate_password(value: str) -> None:
    if not 12 <= len(value) <= 1024 or not value.strip():
        raise IdentityError("PASSWORD_POLICY", 422)


def hash_password(value: str) -> str:
    validate_password(value)
    return HASHER.hash(value)


@lru_cache(maxsize=1)
def dummy_hash() -> str:
    return HASHER.hash(secrets.token_urlsafe(32))


def verify_password(encoded: str, value: str) -> bool:
    try:
        return bool(HASHER.verify(encoded, value))
    except VerificationError, InvalidHashError:
        return False


def token_hash(token: str) -> bytes:
    return hashlib.sha256(token.encode()).digest()


def keyed_digest(secret: str, purpose: str, value: str) -> bytes:
    return hmac.digest(secret.encode(), f"{purpose}:{value}".encode(), "sha256")


def csrf_token(secret: str, token: str) -> str:
    return keyed_digest(secret, "csrf", token).hex()
