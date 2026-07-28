"""Phase 7 acceptance: refusal on irrelevant query + fallback_events row; good query proceeds."""

from __future__ import annotations

from sqlalchemy import select

from app.db import get_session, new_business
from app.ingestion import ingest_text
from app.models import FallbackEvent
from app.retrieval import retrieve
from app.retrieval.trust import evaluate_trust


async def test_irrelevant_query_is_refused_and_logged():
    business_id = await new_business(name="Store A")
    await ingest_text(
        business_id=business_id,
        file_id="policy.pdf",
        text="Our return policy allows refunds within 14 days with a valid receipt.",
    )

    question = "What is the melting point of tungsten on a distant exoplanet?"
    hits = await retrieve(business_id=business_id, query=question)
    decision = await evaluate_trust(business_id=business_id, question=question, scores=[h.score for h in hits])

    assert decision.refused is True
    assert decision.reason == "NOT_ENOUGH_CONTEXT"

    async with get_session() as session:
        result = await session.execute(select(FallbackEvent).where(FallbackEvent.business_id == business_id))
        rows = result.scalars().all()
    assert len(rows) == 1
    assert rows[0].reason == "NOT_ENOUGH_CONTEXT"


async def test_relevant_query_proceeds():
    business_id = await new_business(name="Store A")
    await ingest_text(
        business_id=business_id,
        file_id="policy.pdf",
        text="Our return policy allows refunds within 14 days with a valid receipt.",
    )

    question = "What is the return policy for refunds?"
    hits = await retrieve(business_id=business_id, query=question)
    decision = await evaluate_trust(business_id=business_id, question=question, scores=[h.score for h in hits])

    assert decision.refused is False
    assert decision.reason is None
