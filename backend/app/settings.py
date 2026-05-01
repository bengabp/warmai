from __future__ import annotations

from pathlib import Path
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """All runtime configuration. Override via env vars (prefix `WARMAI_`) or .env."""

    model_config = SettingsConfigDict(
        env_prefix="WARMAI_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # App identity
    ENVIRONMENT: Literal["development", "staging", "production"] = "development"
    API_VERSION: str = "v1"

    # MongoDB
    MONGODB_URL: str = "mongodb://localhost:27017"
    MONGODB_DB: str = "warmai"

    # Auth
    SECRET_KEY: str = "change-me-please-use-a-long-random-string"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_TTL_SECONDS: int = 3 * 24 * 3600  # 3 days
    SIGNUP_ACCESS_CODE: str = "admin"

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8080

    # CORS
    CORS_ORIGINS: list[str] = Field(default_factory=lambda: ["*"])

    # Scheduler
    SCHEDULER_INTERVAL_SECONDS: int = 0  # 0 = use daily in prod, 30s in dev
    WARMUP_RECIPIENT_OVERRIDE: str = ""  # send all mail here in non-prod environments

    # Storage
    USER_FILES_DIR: Path = Path("/app/data/user_files")

    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: Literal["console", "json"] = "console"

    @property
    def version_prefix(self) -> str:
        return f"/{self.API_VERSION}"

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"


settings = Settings()


def ensure_directories() -> None:
    """Create runtime directories. Called from the lifespan hook, not at import."""
    settings.USER_FILES_DIR.mkdir(parents=True, exist_ok=True)
