"""Orchestrates retrieve -> trust -> agent -> validate -> persist (build plan §8/§9).

This is the one place the public "ask" endpoint calls into. It never queries
chunks itself — everything tenant-scoped goes through `app.retrieval.retrieve`
(CLAUDE.md §2.4).
"""

from __future__ import annotations

import logging
import re
import uuid
from dataclasses import dataclass

from pydantic_ai.exceptions import ModelHTTPError, UnexpectedModelBehavior

from sqlalchemy import select

from app.agent.sage_agent import AgentDeps, get_agent
from app.chat_settings import build_style_instructions, get_chat_settings
from app.db import get_session
from app.limits import DailyCapExceeded, check_and_increment, validate_question
from app.models import ChatHistory, File
from app.retrieval import retrieve
from app.retrieval.assemble import AssembledContext, assemble_context
from app.retrieval.trust import evaluate_trust

NO_CONTEXT_PLACEHOLDER = "(no relevant passages found)"

logger = logging.getLogger("app.agent.answer")

REFUSAL_MESSAGE = (
    "I don't have enough grounded information in the uploaded files to answer that confidently. "
    "Try rephrasing, or check with your manager — I'd rather say I don't know than guess."
)

LIMIT_MESSAGE = "This workspace has reached its daily question limit. Please try again tomorrow."

MODEL_UNAVAILABLE_MESSAGE = "Sage is temporarily unable to answer — the model is unavailable right now. Please try again in a moment."


def _strip_inline_citations(answer: str, citation_ids: frozenset[str]) -> str:
    """Remove any `[citation_id]` the model wrote inline in the prose despite the system prompt.

    Citations belong only in SageAnswer.citations, surfaced to the UI as
    separate Sources badges — never as raw ids in the text a staff member
    reads. The system prompt says so, but LLM instruction-following isn't a
    correctness guarantee (same reasoning as citation-id validation above),
    so this is a plain string operation, not something we hope the model
    gets right. Only strips ids that are actually valid for this context,
    so it can't accidentally eat unrelated bracketed text.
    """
    for cid in citation_ids:
        answer = answer.replace(f"[{cid}]", "")
    answer = re.sub(r" {2,}", " ", answer)
    answer = re.sub(r" +([.,;:!?])", r"\1", answer)
    return answer.strip()


@dataclass(frozen=True)
class Citation:
    """One grounded source the UI can show and (later) jump-to in preview."""

    id: str
    file_id: str
    filename: str
    chunk_index: int
    char_start: int
    char_end: int


@dataclass(frozen=True)
class AnswerResult:
    answer: str
    citations: list[Citation]
    refused: bool
    reason: str | None
    limited: bool = False


async def _filenames_for(*, business_id: uuid.UUID, file_ids: set[str]) -> dict[str, str]:
    if not file_ids:
        return {}
    async with get_session() as session:
        result = await session.execute(
            select(File.file_id, File.filename).where(
                File.business_id == business_id,
                File.file_id.in_(file_ids),
            )
        )
        return {row.file_id: row.filename for row in result.all()}


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

    # Below the trust threshold, the retrieved hits aren't reliable enough to
    # hand to the model as fact — but the model still runs, with an empty
    # context, so it can tell a greeting/chitchat message apart from a real
    # unanswerable store question instead of every low-score message getting
    # the identical canned refusal regardless of what was actually asked.
    # SYSTEM_PROMPT rule 5 instructs it: chat naturally for the former, refuse
    # plainly for the latter, and never state a store-specific fact either way.
    assembled = assemble_context(hits) if not decision.refused else AssembledContext(
        context_text="", citation_ids=frozenset(), citation_lookup={}
    )
    agent = get_agent()
    context_section = assembled.context_text or NO_CONTEXT_PLACEHOLDER
    prompt = f"Context:\n{context_section}\n\nQuestion: {question}"
    chat_settings = (
        await get_chat_settings(business_id=business_id, user_id=user_id) if user_id is not None else None
    )
    style_instructions = build_style_instructions(chat_settings)
    logger.info("calling model=%s business_id=%s grounded=%s", agent.model.model_name, business_id, not decision.refused)
    try:
        result = await agent.run(
            prompt,
            deps=AgentDeps(valid_citation_ids=assembled.citation_ids, style_instructions=style_instructions),
        )
    except (ModelHTTPError, UnexpectedModelBehavior) as exc:
        logger.warning("model call failed model=%s business_id=%s error=%s", agent.model.model_name, business_id, exc)
        if decision.refused:
            return AnswerResult(answer=REFUSAL_MESSAGE, citations=[], refused=True, reason=decision.reason)
        return AnswerResult(answer=MODEL_UNAVAILABLE_MESSAGE, citations=[], refused=False, reason="MODEL_UNAVAILABLE")
    logger.info("model call succeeded model=%s business_id=%s", agent.model.model_name, business_id)
    output = result.output
    answer_text = _strip_inline_citations(output.answer, assembled.citation_ids)

    cited_hits = [
        (cid, assembled.citation_lookup[cid])
        for cid in output.citations
        if cid in assembled.citation_lookup
    ]
    filenames = await _filenames_for(
        business_id=business_id,
        file_ids={hit.file_id for _, hit in cited_hits},
    )
    citations = [
        Citation(
            id=cid,
            file_id=hit.file_id,
            filename=filenames.get(hit.file_id) or hit.file_id,
            chunk_index=hit.chunk_index,
            char_start=hit.char_start,
            char_end=hit.char_end,
        )
        for cid, hit in cited_hits
    ]
    citation_records = [
        {
            "id": c.id,
            "file_id": c.file_id,
            "filename": c.filename,
            "chunk_index": c.chunk_index,
            "char_start": c.char_start,
            "char_end": c.char_end,
        }
        for c in citations
    ]

    await _persist(
        business_id=business_id, user_id=user_id, question=question, answer=answer_text, citations=citation_records
    )
    logger.info(
        "answered business_id=%s hits=%d citations=%d refused=%s",
        business_id,
        len(hits),
        len(citations),
        decision.refused,
    )
    return AnswerResult(answer=answer_text, citations=citations, refused=decision.refused, reason=decision.reason)
