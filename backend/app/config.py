"""Environment-based settings. Secrets come from env only — never hardcode keys.

See CLAUDE.md §2 invariant 6 and §9 of the build plan for the required vars.
"""

from __future__ import annotations

from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Database
    database_url: str = "postgresql+asyncpg://sage_dev@localhost:55432/sage_test"

    # Supabase Storage (dumb blob storage only — no Supabase Auth, no RLS)
    supabase_url: str | None = None
    supabase_service_key: str | None = None

    # Embeddings / LLM
    openai_api_key: str | None = None
    gemini_api_key: str | None = None
    gemini_model: str = "gemini-2.5-flash-lite"

    # Dev-only alternate path to the same Gemini model via OpenRouter, for
    # when a direct Google AI Studio key isn't available/has hit its free-tier
    # quota. Takes priority over gemini_api_key when set.
    openrouter_api_key: str | None = None
    # Override the OpenRouter model id (default: f"google/{gemini_model}").
    # e.g. "openrouter/auto" to let OpenRouter pick a model — dev troubleshooting only.
    openrouter_model: str | None = None

    # Auth
    jwt_secret: str = "dev-only-insecure-secret-change-me"
    jwt_algorithm: str = "HS256"
    jwt_expires_minutes: int = 60 * 12

    # Internal service-to-service auth for /internal/retrieve
    internal_service_token: str = "dev-only-internal-token-change-me"

    # Observability
    logfire_token: str | None = None

    # Per-business daily query cap
    daily_query_cap: int = 100

    # Retrieval / ingestion tuning
    embedding_model: str = "text-embedding-3-small"
    embedding_dims: int = 1536
    chunk_token_size: int = 650
    chunk_overlap_ratio: float = 0.15
    trust_score_threshold: float = 0.35

    # Local storage fallback when Supabase Storage isn't configured (dev only)
    local_storage_dir: str = ".devdb/storage"

    environment: str = "development"

    # Frontend origin(s) allowed to call this API (comma-separated). The
    # frontend never talks to Supabase directly, but it does call FastAPI
    # cross-origin in local dev (Next.js on :3000, backend on :8000).
    cors_origins: str = "http://localhost:3000"

    @field_validator("database_url", mode="before")
    @classmethod
    def normalize_database_url(cls, value: object) -> object:
        """Supabase/Railway paste `postgresql://…`; we require asyncpg, not psycopg2."""
        if not isinstance(value, str):
            return value
        if value.startswith("postgres://"):
            return "postgresql+asyncpg://" + value.removeprefix("postgres://")
        if value.startswith("postgresql://"):
            return "postgresql+asyncpg://" + value.removeprefix("postgresql://")
        return value

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
