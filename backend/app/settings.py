"""Environment-specific configuration with value-free validation diagnostics."""

import re
import ssl
from ipaddress import ip_address
from pathlib import Path
from typing import Literal
from urllib.parse import urlsplit

from psycopg import pq
from pydantic import Field, SecretStr, ValidationError, ValidationInfo, field_validator
from pydantic_core import PydanticCustomError
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import make_url
from sqlalchemy.exc import ArgumentError

from app.runtime import BACKEND_ROOT

ISOLATED_ENVIRONMENTS = frozenset({"test", "benchmark", "recovery"})
LOOPBACK_HOSTS = frozenset({"localhost", "127.0.0.1", "::1"})


class ConfigurationError(RuntimeError):
    """Contains only a known variable name and safe validation code."""


class Settings(BaseSettings):
    """Production never inherits a test target or disables server verification."""

    model_config = SettingsConfigDict(
        env_file=BACKEND_ROOT / ".env", extra="ignore", hide_input_in_errors=True
    )
    app_environment: Literal["development", "production", "test", "benchmark", "recovery"] = (
        "development"
    )
    production_database_host: str | None = Field(default=None, validate_default=True)
    database_url: SecretStr
    test_database_url: SecretStr | None = Field(default=None, validate_default=True)
    benchmark_database_url: SecretStr | None = Field(default=None, validate_default=True)
    recovery_database_url: SecretStr | None = Field(default=None, validate_default=True)
    facade_secret: SecretStr
    frontend_origin: str = Field(default="https://localhost:3000", validate_default=True)
    postgres_bin: Path = Path("C:/Program Files/PostgreSQL/18/bin")
    antivirus_host: str = Field(default="127.0.0.1", validate_default=True)
    antivirus_port: int = Field(default=3310, ge=1, le=65535)

    @field_validator("antivirus_host")
    @classmethod
    def validate_antivirus_host(cls, value: str, info: ValidationInfo) -> str:
        if info.data.get("app_environment") != "production":
            if value != "127.0.0.1":
                raise PydanticCustomError("LOCAL_ANTIVIRUS_REQUIRED", "LOCAL_ANTIVIRUS_REQUIRED")
            return value
        try:
            address = ip_address(value)
        except ValueError:
            host = value.lower()
            if (
                not host
                or len(host) > 253
                or any(
                    not re.fullmatch(r"[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?", label)
                    for label in host.removesuffix(".").split(".")
                )
            ):
                raise PydanticCustomError("HOST_INVALID", "HOST_INVALID") from None
            return host
        if "%" in value:
            raise PydanticCustomError("HOST_INVALID", "HOST_INVALID")
        return str(address)

    @field_validator("production_database_host")
    @classmethod
    def validate_production_host(cls, value: str | None, info: ValidationInfo) -> str | None:
        if info.data.get("app_environment") != "production":
            return value
        if not value:
            raise PydanticCustomError("REQUIRED", "REQUIRED")
        value = value.lower()
        try:
            ip_address(value)
        except ValueError:
            pass
        else:
            raise PydanticCustomError("MANAGED_HOST_REQUIRED", "MANAGED_HOST_REQUIRED")
        if (
            value in LOOPBACK_HOSTS
            or len(value) > 253
            or not re.fullmatch(r"[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?", value)
            or "." not in value
            or any(
                not re.fullmatch(r"[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?", label)
                for label in value.split(".")
            )
        ):
            raise PydanticCustomError("MANAGED_HOST_REQUIRED", "MANAGED_HOST_REQUIRED")
        return value

    @field_validator("facade_secret")
    @classmethod
    def validate_facade_secret(cls, value: SecretStr) -> SecretStr:
        if len(value.get_secret_value()) < 32:
            raise PydanticCustomError("TOO_SHORT", "TOO_SHORT")
        return value

    @field_validator("frontend_origin")
    @classmethod
    def validate_frontend_origin(cls, value: str, info: ValidationInfo) -> str:
        if info.data.get("app_environment") == "production":
            try:
                origin = urlsplit(value)
                valid = (
                    origin.scheme == "https"
                    and origin.hostname
                    and origin.hostname not in LOOPBACK_HOSTS
                    and origin.username is None
                    and origin.password is None
                    and not origin.path
                    and not origin.query
                    and not origin.fragment
                )
            except ValueError:
                valid = False
            if not valid:
                raise PydanticCustomError("HTTPS_ORIGIN_REQUIRED", "HTTPS_ORIGIN_REQUIRED")
        return value

    @field_validator(
        "test_database_url", "benchmark_database_url", "recovery_database_url", mode="before"
    )
    @classmethod
    def empty_optional_url(cls, value: object) -> object:
        return None if value == "" else value

    @field_validator(
        "database_url", "test_database_url", "benchmark_database_url", "recovery_database_url"
    )
    @classmethod
    def validate_database_url(
        cls, value: SecretStr | None, info: ValidationInfo
    ) -> SecretStr | None:
        environment = info.data.get("app_environment")
        if value is None:
            if info.field_name == f"{environment}_database_url":
                raise PydanticCustomError("REQUIRED", "REQUIRED")
            return None
        production = environment == "production" and info.field_name == "database_url"
        try:
            url = make_url(value.get_secret_value())
            if production and url.drivername == "postgresql":
                url = url.set(drivername="postgresql+psycopg")
            valid = (
                url.drivername == "postgresql+psycopg"
                and bool(url.database)
                and url.host is not None
                and (url.port is None or 1 <= url.port <= 65535)
            )
        except ArgumentError, ValueError, TypeError:
            raise PydanticCustomError("POSTGRESQL_URL_INVALID", "POSTGRESQL_URL_INVALID") from None
        if not valid:
            raise PydanticCustomError("POSTGRESQL_URL_INVALID", "POSTGRESQL_URL_INVALID")
        # libpq query parameters must not override host, database, user or TLS policy.
        if set(url.query) - {"sslmode", "sslrootcert"}:
            raise PydanticCustomError("CONNECTION_OVERRIDE_REFUSED", "CONNECTION_OVERRIDE_REFUSED")
        if not production:
            if url.host not in LOOPBACK_HOSTS:
                raise PydanticCustomError("LOCAL_POSTGRESQL_REQUIRED", "LOCAL_POSTGRESQL_REQUIRED")
            return value
        if url.host is None or url.host.lower() != info.data.get("production_database_host"):
            raise PydanticCustomError("MANAGED_HOST_MISMATCH", "MANAGED_HOST_MISMATCH")
        if not url.username or not url.password:
            raise PydanticCustomError("CREDENTIALS_REQUIRED", "CREDENTIALS_REQUIRED")
        url = url.set(host=url.host.lower())
        if url.database in {f"kayrealestate_{env}" for env in ISOLATED_ENVIRONMENTS}:
            raise PydanticCustomError("ISOLATED_DATABASE_REFUSED", "ISOLATED_DATABASE_REFUSED")
        if url.query.get("sslmode") != "verify-full":
            raise PydanticCustomError("TLS_VERIFY_FULL_REQUIRED", "TLS_VERIFY_FULL_REQUIRED")
        root = url.query.get("sslrootcert")
        if not isinstance(root, str) or not root:
            raise PydanticCustomError("TLS_ROOT_REQUIRED", "TLS_ROOT_REQUIRED")
        if root == "system" and pq.version() < 160000:
            raise PydanticCustomError("TLS_SYSTEM_ROOT_UNSUPPORTED", "TLS_SYSTEM_ROOT_UNSUPPORTED")
        if root != "system":
            try:
                certificate = Path(root)
                if not certificate.is_absolute() or not certificate.is_file():
                    raise ValueError
                ssl.create_default_context(cafile=str(certificate))
            except OSError, ValueError:
                raise PydanticCustomError("TLS_ROOT_INVALID", "TLS_ROOT_INVALID") from None
        return SecretStr(url.render_as_string(hide_password=False))

    def selected_database_url(self) -> str:
        """No fallback, including callers constructing an explicit environment copy."""
        if self.app_environment not in {"development", "production", *ISOLATED_ENVIRONMENTS}:
            raise ConfigurationError("CONFIGURATION_INVALID: APP_ENVIRONMENT:INVALID")
        variable = (
            f"{self.app_environment}_database_url"
            if self.app_environment in ISOLATED_ENVIRONMENTS
            else "database_url"
        )
        selected = getattr(self, variable)
        if not isinstance(selected, SecretStr):
            raise ConfigurationError(f"CONFIGURATION_INVALID: {variable.upper()}:REQUIRED")
        return selected.get_secret_value()


def load_settings() -> Settings:
    """Never expose Pydantic inputs, URL values, context or exception chains."""
    try:
        return Settings()
    except ValidationError as error:
        issues = []
        for issue in error.errors(include_input=False, include_context=False, include_url=False):
            field = str(issue["loc"][0]) if issue["loc"] else "APP_ENVIRONMENT"
            variable = field.upper() if field in Settings.model_fields else "CONFIGURATION"
            code = str(issue["type"]).upper()
            if not re.fullmatch(r"[A-Z_]+", code):
                code = "INVALID"
            issues.append(f"{variable}:{code}")
        raise ConfigurationError(
            "CONFIGURATION_INVALID: " + ", ".join(sorted(set(issues)))
        ) from None
    except ValueError, TypeError:
        raise ConfigurationError("CONFIGURATION_INVALID: CONFIGURATION:INVALID") from None
