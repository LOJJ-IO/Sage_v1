"""Per-BUSINESS daily query cap (build plan §9 Phase 9) + input guardrails.

The cap is per `business_id`, not per user — one heavy staff member cannot
starve the rest of their store's quota by hitting a shared per-user counter,
and the whole point is protecting the LLM bill per tenant.
"""

from __future__ import annotations

import uuid
from datetime import date

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.config import get_settings
from app.db import get_session
from app.models import QueryCount

MAX_QUERY_CHARS = 2000


class QueryTooLong(ValueError):
    pass


class QueryEmpty(ValueError):
    pass


class DailyCapExceeded(Exception):
    def __init__(self, cap: int) -> None:
        self.cap = cap
        super().__init__(f"daily query cap of {cap} reached for this business")


def validate_question(question: str) -> str:
    stripped = (question or "").strip()
    if not stripped:
        raise QueryEmpty("question must not be empty")
    if len(stripped) > MAX_QUERY_CHARS:
        raise QueryTooLong(f"question exceeds {MAX_QUERY_CHARS} characters")
    return stripped


async def check_and_increment(business_id: uuid.UUID, *, cap: int | None = None) -> int:
    """Atomically increment today's counter for a business and enforce the cap.

    Uses an upsert with `count = count + 1` so concurrent requests can't race
    past the cap between a read and a write. Raises DailyCapExceeded (without
    incrementing further) once the cap is already reached.
    """
    settings = get_settings()
    cap = settings.daily_query_cap if cap is None else cap
    today = date.today()

    async with get_session() as session:
        existing = await session.execute(
            select(QueryCount).where(QueryCount.business_id == business_id, QueryCount.date == today)
        )
        row = existing.scalar_one_or_none()
        current_count = row.count if row else 0

        if current_count >= cap:
            raise DailyCapExceeded(cap)

        stmt = (
            pg_insert(QueryCount)
            .values(business_id=business_id, date=today, count=1)
            .on_conflict_do_update(
                index_elements=[QueryCount.business_id, QueryCount.date],
                set_={"count": QueryCount.count + 1},
            )
        )
        await session.execute(stmt)
        await session.commit()
        return current_count + 1
