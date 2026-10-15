from decimal import Decimal
from typing import Any

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=("../.env", ".env"), env_file_encoding="utf-8", extra="ignore"
    )

    database_url: str = "postgresql+asyncpg://kahin:kahin@localhost:5432/kahin"
    test_database_url: str = "postgresql+asyncpg://kahin:kahin@localhost:5432/kahin_test"
    redis_url: str = "redis://localhost:6379/0"

    jwt_secret: str = "change-me-in-production-kahin-secret-32chars-min"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7

    cors_origins: list[str] | str = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ]

    @field_validator("database_url", mode="before")
    @classmethod
    def assemble_db_connection(cls, v: Any) -> Any:
        if isinstance(v, str):
            if v.startswith("postgres://"):
                return v.replace("postgres://", "postgresql+asyncpg://", 1)
            elif v.startswith("postgresql://") and not v.startswith("postgresql+asyncpg://"):
                return v.replace("postgresql://", "postgresql+asyncpg://", 1)
        return v

    @field_validator("cors_origins", mode="after")
    @classmethod
    def parse_cors_origins(cls, v: Any) -> list[str]:
        if isinstance(v, str):
            v = v.strip()
            if v.startswith("[") and v.endswith("]"):
                import json
                try:
                    return json.loads(v)
                except Exception:
                    pass
            return [item.strip() for item in v.split(",") if item.strip()]
        return v

    # --- Ekonomi sabitleri (docs/PRD.md) ---
    initial_grant_kp: Decimal = Decimal("1000.00")
    daily_bonus_kp: Decimal = Decimal("100.00")
    streak_bonus_kp: Decimal = Decimal("250.00")
    streak_cycle_days: int = 7
    bankruptcy_threshold_kp: Decimal = Decimal("50.00")
    bankruptcy_support_kp: Decimal = Decimal("200.00")
    bankruptcy_daily_limit: int = 3
    comment_min_position_kp: Decimal = Decimal("50.00")
    default_pool: Decimal = Decimal("1000.0000")


settings = Settings()
