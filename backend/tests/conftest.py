"""Test DB fixtures/helpers (build plan Phase 0).

Contract tests import `new_business`/`reset_db` directly from `app.db`, so
there isn't much to add here beyond making sure `pytest-asyncio` runs in
`auto` mode (set in pyproject.toml) and that the event loop is shared with
the async engine.
"""

from __future__ import annotations

import pytest


@pytest.fixture(autouse=True, scope="session")
def _require_real_database() -> None:
    """Guard against accidentally pointing tests at something that isn't Postgres.

    See CLAUDE.md §2 and the Phase 0 acceptance note: contract tests must run
    against real Postgres + pgvector, never a mock or SQLite.
    """
    from app.config import get_settings

    settings = get_settings()
    if not settings.database_url.startswith("postgresql"):
        pytest.exit(
            "DATABASE_URL must point at a real Postgres instance with pgvector enabled "
            "— contract tests refuse to run against anything else.",
            returncode=1,
        )
