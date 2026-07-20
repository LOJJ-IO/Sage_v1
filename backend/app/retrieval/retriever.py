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
import uuid
from dataclasses import dataclass

from app.db import get_session
from app.ingestion.embed import embed_chunks
from app.retrieval.hybrid import ChannelHit, fts_channel, reciprocal_rank_fusion, tag_channel, vector_channel
from app.retrieval.rerank import rerank

logger = logging.getLogger("app.retrieval.retriever")

CANDIDATE_POOL_SIZE = 30


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
