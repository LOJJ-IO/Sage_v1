"""Engine/session management + test helpers.

FastAPI (this codebase) is the only thing that touches the database — see
CLAUDE.md §2.1. Every tenant-scoped helper below takes `business_id` as a
required, non-defaulted argument (§2.4); `reset_db`/`new_business` are the
two test helpers the contract suites import directly.
"""

from __future__ import annotations

import uuid
from contextlib import asynccontextmanager
from typing import AsyncIterator

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.config import get_settings
from app.models import Base, Business

_settings = get_settings()

# NullPool: pytest-asyncio gives each test function its own event loop on
# Windows (ProactorEventLoop). A pooled asyncpg connection checked out under
# one test's loop and reused under the next test's loop raises "Event loop is
# closed" — NullPool opens a fresh connection every time instead of reusing
# one tied to a dead loop. This engine is a long-lived module singleton
# shared across tests specifically because it must NOT pool connections.
#
# statement_cache_size=0: production's DATABASE_URL goes through Supabase's
# transaction-mode PgBouncer pooler, which hands different client sessions
# the same backend connection without knowing about asyncpg's per-connection
# prepared-statement cache. Two sessions landing on the same backend
# connection then collide on the same generated statement name, raising
# asyncpg.exceptions.DuplicatePreparedStatementError ("prepared statement
# __asyncpg_stmt_1__ already exists") — seen live on /ask in production.
# Disabling the cache is the documented fix for asyncpg behind PgBouncer's
# transaction/statement pool modes; harmless against a plain (non-pooled)
# Postgres like the local dev DB.
engine = create_async_engine(
    _settings.database_url,
    poolclass=NullPool,
    future=True,
    connect_args={"statement_cache_size": 0},
)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

# Tables truncated on reset_db, in FK-safe order (children before parents).
_TENANT_TABLES = (
    "fallback_events",
    "chat_history",
    "chat_settings",
    "user_personal_folder_items",
    "user_personal_folders",
    "query_counts",
    "chunks",
    "files",
    "users",
    "businesses",
)


@asynccontextmanager
async def get_session() -> AsyncIterator[AsyncSession]:
    async with SessionLocal() as session:
        yield session


async def init_models() -> None:
    """Create the pgvector extension + all tables if they don't exist yet.

    Real schema creation for production lives in Alembic migrations (Phase 1).
    This is a test/dev convenience so `reset_db()` works before migrations
    have been run against a fresh database.
    """
    async with engine.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        await conn.run_sync(Base.metadata.create_all)


async def reset_db() -> None:
    """Truncate every tenant table. Used as an autouse fixture in contract tests.

    Truncates rather than drops — the real invariant under test is that no
    row survives across tests and no chunk outlives its file, not that the
    schema is rebuilt every time.
    """
    await init_models()
    async with engine.begin() as conn:
        tables = ", ".join(_TENANT_TABLES)
        await conn.execute(text(f"TRUNCATE TABLE {tables} RESTART IDENTITY CASCADE"))


async def new_business(*, name: str) -> uuid.UUID:
    """Test helper: create a business and return its id."""
    async with get_session() as session:
        business = Business(name=name)
        session.add(business)
        await session.commit()
        await session.refresh(business)
        return business.id
