"""Trust score + refusal decision (build plan §7).

Own code, not a library: top rerank score vs. a conservative threshold.
Grounding is the product (CLAUDE.md §2.5) — no relevant chunks means an
explicit, logged refusal, never an improvised answer.
"""

from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass

from app.config import get_settings
from app.db import get_session
from app.models import FallbackEvent

logger = logging.getLogger("app.retrieval.trust")

NOT_ENOUGH_CONTEXT = "NOT_ENOUGH_CONTEXT"


@dataclass(frozen=True)
class TrustDecision:
    trust_score: float
    refused: bool
    reason: str | None


def score_hits(scores: list[float]) -> float:
    """Top rerank score. Empty hits => 0.0 trust.

    `retrieve()` always pads its result up to `top_k` with whatever's left in
    the candidate pool, regardless of relevance — once a business has more
    than one document, most of those padding hits score near zero. Averaging
    all of them (the original approach) let a single excellent match get
    diluted below threshold by irrelevant hits from other files, causing
    false refusals on exactly the questions that should work. The agent only
    ever cites passages that are actually relevant (citation validation in
    `app/agent/sage_agent.py` enforces this), so gating on "is there at least
    one trustworthy passage" is the right question, not "on average, how
    relevant was everything retrieved."
    """
    if not scores:
        return 0.0
    return max(scores)


async def evaluate_trust(
    *,
    business_id: uuid.UUID,
    question: str,
    scores: list[float],
    user_id: uuid.UUID | None = None,
    threshold: float | None = None,
) -> TrustDecision:
    settings = get_settings()
    threshold = settings.trust_score_threshold if threshold is None else threshold

    trust_score = score_hits(scores)
    refused = trust_score < threshold

    if refused:
        logger.info(
            "refusal business_id=%s reason=%s top_score=%.4f n_scores=%d",
            business_id,
            NOT_ENOUGH_CONTEXT,
            trust_score,
            len(scores),
        )
        async with get_session() as session:
            session.add(
                FallbackEvent(
                    business_id=business_id,
                    user_id=user_id,
                    question=question,
                    reason=NOT_ENOUGH_CONTEXT,
                    top_score=trust_score,
                )
            )
            await session.commit()
        return TrustDecision(trust_score=trust_score, refused=True, reason=NOT_ENOUGH_CONTEXT)

    return TrustDecision(trust_score=trust_score, refused=False, reason=None)
