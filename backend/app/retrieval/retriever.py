"""THE single retrieve(business_id, query) chokepoint (build plan §6).

`business_id` is required and non-defaulted — Python itself raises
`TypeError` if a caller omits it, which is exactly what
`test_retrieve_requires_business_id` checks. No other module may run its own
chunk query; everything (the public ask endpoint, `/internal/retrieve`)
calls this function.
"""

from __future__ import annotations

import asyncio
import logging
import re
import uuid
from dataclasses import dataclass
from pathlib import Path

from sqlalchemy import select

from app.db import get_session
from app.files.service import list_files
from app.ingestion.embed import embed_chunks
from app.ml_gate import heavy_ml
from app.models import Chunk
from app.retrieval.hybrid import ChannelHit, fts_channel, reciprocal_rank_fusion, tag_channel, vector_channel
from app.retrieval.rerank import rerank

logger = logging.getLogger("app.retrieval.retriever")

# Kept small so FlashRank ONNX scores fewer passages per /ask (RAM + latency).
# Hybrid channels + RRF still run at this size; only the rerank input shrinks.
CANDIDATE_POOL_SIZE = 14

# "Summarize <file>"-style requests don't resemble their own answer well
# enough for similarity search to reliably find it (a summarization
# instruction isn't semantically close to the document's actual prose), so
# a whole-document fetch is a separate mode within this same chokepoint —
# not a second retrieval path (CLAUDE.md §2.4 forbids that); it's the same
# retrieve() function choosing a different query strategy internally.
_SUMMARY_KEYWORDS = ("summar", "overview of", "tl;dr", "tldr", "rundown", "recap of")
_STOPWORDS = frozenset(
    {"the", "a", "an", "of", "please", "for", "me", "this", "that", "summarize", "summarise", "summary", "give", "and", "in", "to", "on", "document", "file"}
)
MAX_SUMMARY_CHUNKS = 40


def _looks_like_summarize_request(query: str) -> bool:
    lowered = query.lower()
    return any(kw in lowered for kw in _SUMMARY_KEYWORDS)


def _significant_words(text: str) -> set[str]:
    words = re.findall(r"[a-z0-9]+", text.lower())
    return {w for w in words if w not in _STOPWORDS and len(w) > 2}


async def _resolve_summarize_target(business_id: uuid.UUID, query: str) -> str | None:
    """Best-effort match of a filename mentioned in a summarize-style query.

    Requires at least half of the filename's own significant words (and at
    least one) to appear in the query, so a short distinctive filename needs
    less overlap than a long one. Returns None rather than guessing when no
    file clears that bar — falls back to the normal similarity-search path.
    """
    query_words = _significant_words(query)
    if not query_words:
        return None

    files = await list_files(business_id=business_id)
    best_file_id: str | None = None
    best_score = 0.0
    for f in files:
        if f.status != "indexed":
            continue
        file_words = _significant_words(Path(f.filename).stem)
        if not file_words:
            continue
        overlap = query_words & file_words
        if not overlap:
            continue
        score = len(overlap) / len(file_words)
        if score > best_score:
            best_score = score
            best_file_id = f.file_id

    return best_file_id if best_score >= 0.5 else None


async def _retrieve_full_document(business_id: uuid.UUID, file_id: str) -> list[Hit]:
    async with get_session() as session:
        result = await session.execute(
            select(Chunk)
            .where(Chunk.business_id == business_id, Chunk.file_id == file_id)
            .order_by(Chunk.chunk_index)
            .limit(MAX_SUMMARY_CHUNKS)
        )
        chunks = result.scalars().all()

    return [
        Hit(
            business_id=business_id,
            file_id=chunk.file_id,
            chunk_index=chunk.chunk_index,
            content=chunk.content,
            char_start=chunk.char_start,
            char_end=chunk.char_end,
            # Explicit-reference match, not a similarity score: the user named
            # this document and we found it, which is its own form of
            # grounding — evaluate_trust's 0.35 threshold is about "did
            # similarity search find something relevant," a question that
            # doesn't apply here, so score comfortably clears it rather than
            # being gated by it.
            score=1.0,
        )
        for chunk in chunks
    ]


@dataclass(frozen=True)
class Hit:
    business_id: uuid.UUID
    file_id: str
    chunk_index: int
    content: str
    char_start: int
    char_end: int
    score: float


async def retrieve(*, business_id: uuid.UUID, query: str, top_k: int = 8) -> list[Hit]:
    if business_id is None:
        raise TypeError("retrieve() requires a non-null business_id")

    query = (query or "").strip()
    if not query:
        return []

    if _looks_like_summarize_request(query):
        target_file_id = await _resolve_summarize_target(business_id, query)
        if target_file_id is not None:
            hits = await _retrieve_full_document(business_id, target_file_id)
            logger.info(
                "retrieve business_id=%s mode=summarize file_id=%s hits=%d", business_id, target_file_id, len(hits)
            )
            return hits

    [query_embedding] = await embed_chunks([query])

    async with get_session() as session:
        vector_hits, fts_hits, tag_hits = (
            await vector_channel(session, business_id, query_embedding, limit=CANDIDATE_POOL_SIZE),
            await fts_channel(session, business_id, query, limit=CANDIDATE_POOL_SIZE),
            await tag_channel(session, business_id, [], limit=CANDIDATE_POOL_SIZE),
        )

    fused = reciprocal_rank_fusion([vector_hits, fts_hits, tag_hits])
    if not fused:
        logger.info("retrieve business_id=%s hits=0", business_id)
        return []

    candidates: list[tuple[ChannelHit, float]] = fused[:CANDIDATE_POOL_SIZE]
    # rerank() loads/runs an ONNX model synchronously (and downloads it on first
    # use) — off the event loop via to_thread so one slow/cold rerank doesn't
    # freeze every other concurrent request (and the Railway healthcheck) on
    # this single-worker uvicorn process.
    # Serialized with Docling extract via heavy_ml so peak RSS is max(Docling,
    # FlashRank), not both stacks at once.
    async with heavy_ml:
        rerank_scores = await asyncio.to_thread(
            rerank, query, [(str(hit.chunk_id), hit.content) for hit, _ in candidates]
        )

    def final_score(hit: ChannelHit, rrf_score: float) -> float:
        return rerank_scores.get(str(hit.chunk_id), rrf_score)

    ranked = sorted(candidates, key=lambda pair: final_score(pair[0], pair[1]), reverse=True)

    hits = [
        Hit(
            business_id=business_id,
            file_id=hit.file_id,
            chunk_index=hit.chunk_index,
            content=hit.content,
            char_start=hit.char_start,
            char_end=hit.char_end,
            score=final_score(hit, rrf_score),
        )
        for hit, rrf_score in ranked[:top_k]
    ]
    logger.info("retrieve business_id=%s hits=%d", business_id, len(hits))
    return hits
