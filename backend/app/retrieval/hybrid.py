"""Hybrid retrieval channels + Reciprocal Rank Fusion (build plan §3/§6).

Every channel filters by `business_id` — this is the single guarantee the
tenant-isolation contract checks, so it must never be optional here.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Chunk

RRF_K = 60  # standard RRF damping constant


@dataclass(frozen=True)
class ChannelHit:
    chunk_id: uuid.UUID
    file_id: str
    chunk_index: int
    content: str
    char_start: int
    char_end: int


async def vector_channel(
    session: AsyncSession, business_id: uuid.UUID, query_embedding: list[float], *, limit: int
) -> list[ChannelHit]:
    """Cosine-distance brute-force scan — pgvector, no HNSW/IVFFlat (locked, §3)."""
    rows = (
        await session.execute(
            select(Chunk)
            .where(Chunk.business_id == business_id)
            .order_by(Chunk.embedding.cosine_distance(query_embedding))
            .limit(limit)
        )
    ).scalars()
    return [
        ChannelHit(c.id, c.file_id, c.chunk_index, c.content, c.char_start, c.char_end) for c in rows
    ]


async def fts_channel(session: AsyncSession, business_id: uuid.UUID, query: str, *, limit: int) -> list[ChannelHit]:
    """Postgres full-text search over the GIN-indexed `tsv` column."""
    result = await session.execute(
        select(Chunk)
        .where(
            Chunk.business_id == business_id,
            Chunk.tsv.op("@@")(text("plainto_tsquery('english', :query)")),
        )
        .params(query=query)
        .order_by(text("ts_rank(chunks.tsv, plainto_tsquery('english', :query)) DESC").bindparams(query=query))
        .limit(limit)
    )
    rows = result.scalars()
    return [
        ChannelHit(c.id, c.file_id, c.chunk_index, c.content, c.char_start, c.char_end) for c in rows
    ]


async def tag_channel(session: AsyncSession, business_id: uuid.UUID, tags: list[str], *, limit: int) -> list[ChannelHit]:
    """Exact tag overlap match — cheap precision channel for admin-curated tags."""
    if not tags:
        return []
    rows = (
        await session.execute(
            select(Chunk)
            .where(Chunk.business_id == business_id, Chunk.tags.overlap(tags))
            .limit(limit)
        )
    ).scalars()
    return [
        ChannelHit(c.id, c.file_id, c.chunk_index, c.content, c.char_start, c.char_end) for c in rows
    ]


def reciprocal_rank_fusion(channels: list[list[ChannelHit]], *, k: int = RRF_K) -> list[tuple[ChannelHit, float]]:
    """Fuse ranked lists from multiple channels into one score per chunk_id."""
    scores: dict[uuid.UUID, float] = {}
    hits_by_id: dict[uuid.UUID, ChannelHit] = {}
    for channel in channels:
        for rank, hit in enumerate(channel):
            scores[hit.chunk_id] = scores.get(hit.chunk_id, 0.0) + 1.0 / (k + rank + 1)
            hits_by_id.setdefault(hit.chunk_id, hit)
    fused = [(hits_by_id[cid], score) for cid, score in scores.items()]
    fused.sort(key=lambda pair: pair[1], reverse=True)
    return fused
