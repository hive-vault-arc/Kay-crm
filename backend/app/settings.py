"""Server-only local configuration; secrets never appear in model representations."""

from pathlib import Path
from typing import Literal

from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import make_url

from app.runtime import BACKEND_ROOT


class Settings(BaseSettings):
    """Select an explicit environment without falling back from tests to development."""

    model_config = SettingsConfigDict(env_file=BACKEND_ROOT / ".env", extra="ignore")
    app_environment: Literal["development", "test", "benchmark", "recovery"] = "development"
    database_url: SecretStr
    test_database_url: SecretStr
    benchmark_database_url: SecretStr
    recovery_database_url: SecretStr
    facade_secret: SecretStr
    frontend_origin: str = "https://localhost:3000"
    postgres_bin: Path = Path("C:/Program Files/PostgreSQL/18/bin")
    antivirus_host: Literal["127.0.0.1"] = "127.0.0.1"
    antivirus_port: int = Field(default=3310, ge=1, le=65535)

    @field_validator("facade_secret")
    @classmethod
    def validate_facade_secret(cls, value: SecretStr) -> SecretStr:
        if len(value.get_secret_value()) < 32:
            raise ValueError("FACADE_SECRET_TOO_SHORT")
        return value

    @field_validator(
        "database_url", "test_database_url", "benchmark_database_url", "recovery_database_url"
    )
    @classmethod
    def validate_database_url(cls, value: SecretStr) -> SecretStr:
        url = make_url(value.get_secret_value())
        if (
            url.drivername != "postgresql+psycopg"
            or url.host not in {"localhost", "127.0.0.1", "::1"}
            or not url.database
        ):
            raise ValueError("LOCAL_POSTGRESQL_REQUIRED")
        return value

    def selected_database_url(self) -> str:
        """Return the explicit selected URL only to database infrastructure."""
        urls = {
            "development": self.database_url,
            "test": self.test_database_url,
            "benchmark": self.benchmark_database_url,
            "recovery": self.recovery_database_url,
        }
        return urls[self.app_environment].get_secret_value()


def load_settings() -> Settings:
    """Avoid Pydantic diagnostics containing raw environment input on startup."""
    try:
        return Settings()
    except ValueError, TypeError:
        raise RuntimeError("CONFIGURATION_INVALID: check ignored backend/.env") from None
