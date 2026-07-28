"""Embedding client — OpenAI text-embedding-3-small, 1536 dims (locked, §3).

If `OPENAI_API_KEY` isn't configured (local dev / contract-test runs without
billing/network to OpenAI), we fall back to a deterministic local feature-
hashing embedding of the same dimensionality. This keeps the *real* pgvector
column, insert, and cosine-similarity query paths exercised end to end; only
the embedding *quality* degrades, and retrieval correctness in that mode is
carried by the FTS channel in the hybrid retriever, not by the fallback
vectors. Never used silently in production — it logs a loud warning once.
"""

from __future__ import annotations

import hashlib
import logging
import math

from openai import AsyncOpenAI

from app.config import get_settings

logger = logging.getLogger("app.ingestion.embed")

_warned_fallback = False


def _local_fallback_embedding(text: str, dims: int) -> list[float]:
    """Deterministic feature-hashing embedding (real technique, not a stub).

    Same word -> same hashed dimension every time, so cosine similarity is
    still meaningful for shared vocabulary — good enough to keep the vector
    channel of the hybrid retriever structurally correct while no API key is
    configured.
    """
    vec = [0.0] * dims
    words = text.lower().split() or [text.lower()]
    for word in words:
        digest = hashlib.sha256(word.encode("utf-8")).digest()
        idx = int.from_bytes(digest[:4], "big") % dims
        sign = 1.0 if digest[4] % 2 == 0 else -1.0
        vec[idx] += sign
    norm = math.sqrt(sum(v * v for v in vec)) or 1.0
    return [v / norm for v in vec]


async def embed_chunks(texts: list[str]) -> list[list[float]]:
    """Embed a batch of chunk texts. Never logs chunk content (CLAUDE.md §2.6)."""
    global _warned_fallback
    if not texts:
        return []

    settings = get_settings()

    if settings.openai_api_key:
        client = AsyncOpenAI(api_key=settings.openai_api_key)
        response = await client.embeddings.create(model=settings.embedding_model, input=texts)
        logger.info("embedded %d chunks via %s", len(texts), settings.embedding_model)
        return [item.embedding for item in response.data]

    if not _warned_fallback:
        logger.warning(
            "OPENAI_API_KEY not set — using local feature-hashing embedding fallback. "
            "Set OPENAI_API_KEY for real semantic embeddings before any pilot."
        )
        _warned_fallback = True

    logger.info("embedded %d chunks via local fallback", len(texts))
    return [_local_fallback_embedding(t, settings.embedding_dims) for t in texts]
