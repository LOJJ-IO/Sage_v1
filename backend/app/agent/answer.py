"""Orchestrates retrieve -> trust -> agent -> validate -> persist (build plan §8/§9).

This is the one place the public "ask" endpoint calls into. It never queries
chunks itself — everything tenant-scoped goes through `app.retrieval.retrieve`
(CLAUDE.md §2.4).
"""

from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass

from pydantic_ai.exceptions import ModelHTTPError, UnexpectedModelBehavior

from app.agent.sage_agent import AgentDeps, get_agent
from app.db import get_session
from app.limits import DailyCapExceeded, check_and_increment, validate_question
from app.models import ChatHistory
from app.retrieval import retrieve
from app.retrieval.assemble import assemble_context
from app.retrieval.trust import evaluate_trust

logger = logging.getLogger("app.agent.answer")

REFUSAL_MESSAGE = (
    "I don't have enough grounded information in this store's files to answer that confidently. "
    "Try rephrasing, or check with a manager — I'd rather say I don't know than guess."
)

LIMIT_MESSAGE = "This store has reached its daily question limit. Please try again tomorrow."

MODEL_UNAVAILABLE_MESSAGE = "Sage is temporarily unable to answer — the model is unavailable right now. Please try again in a moment."


@dataclass(frozen=True)
class AnswerResult:
    answer: str
    citations: list[str]
    refused: bool
    reason: str | None
    limited: bool = False


async def _persist(
    *, business_id: uuid.UUID, user_id: uuid.UUID | None, question: str, answer: str, citations: list
) -> None:
    async with get_session() as session:
        session.add(
            ChatHistory(business_id=business_id, user_id=user_id, question=question, answer=answer, citations=citations)
        )
        await session.commit()


async def answer_question(
    *, business_id: uuid.UUID, user_id: uuid.UUID | None, question: str
) -> AnswerResult:
    question = validate_question(question)

    try:
        await check_and_increment(business_id)
    except DailyCapExceeded:
        logger.info("daily cap exceeded business_id=%s", business_id)
        return AnswerResult(answer=LIMIT_MESSAGE, citations=[], refused=False, reason="DAILY_CAP_EXCEEDED", limited=True)

    hits = await retrieve(business_id=business_id, query=question)
    hit_scores = [h.score for h in hits]
    decision = await evaluate_trust(
        business_id=business_id, question=question, scores=hit_scores, user_id=user_id
    )

    if decision.refused:
        await _persist(business_id=business_id, user_id=user_id, question=question, answer=REFUSAL_MESSAGE, citations=[])
        return AnswerResult(answer=REFUSAL_MESSAGE, citations=[], refused=True, reason=decision.reason)

    assembled = assemble_context(hits)
    agent = get_agent()
    prompt = f"Context:\n{assembled.context_text}\n\nQuestion: {question}"
    logger.info("calling model=%s business_id=%s", agent.model.model_name, business_id)
    try:
        result = await agent.run(prompt, deps=AgentDeps(valid_citation_ids=assembled.citation_ids))
    except (ModelHTTPError, UnexpectedModelBehavior) as exc:
        logger.warning("model call failed model=%s business_id=%s error=%s", agent.model.model_name, business_id, exc)
        return AnswerResult(answer=MODEL_UNAVAILABLE_MESSAGE, citations=[], refused=False, reason="MODEL_UNAVAILABLE")
    logger.info("model call succeeded model=%s business_id=%s", agent.model.model_name, business_id)
    output = result.output

    citation_records = [
        {
            "id": cid,
            "file_id": assembled.citation_lookup[cid].file_id,
            "chunk_index": assembled.citation_lookup[cid].chunk_index,
            "char_start": assembled.citation_lookup[cid].char_start,
            "char_end": assembled.citation_lookup[cid].char_end,
        }
        for cid in output.citations
        if cid in assembled.citation_lookup
    ]

    await _persist(
        business_id=business_id, user_id=user_id, question=question, answer=output.answer, citations=citation_records
    )
    logger.info("answered business_id=%s hits=%d citations=%d", business_id, len(hits), len(citation_records))
    return AnswerResult(answer=output.answer, citations=output.citations, refused=False, reason=None)
