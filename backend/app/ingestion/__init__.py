"""Ingestion: extract -> linearize -> chunk -> embed -> store (build plan §4/§5).

`ingest_text` / `delete_file` / `replace_file` are the contract surface the
lifecycle guard test imports. `embed_chunks` is re-exported here (not just in
`app.ingestion.embed`) specifically so `monkeypatch.setattr(ingestion,
"embed_chunks", boom)` in the contract test patches the exact name this
module's functions call — see the docstring on that test.
"""

from __future__ import annotations

import logging
import uuid

from sqlalchemy import delete, func, select

from app.db import get_session
from app.ingestion.chunk import chunk_text
from app.ingestion.embed import embed_chunks  # noqa: F401  (re-exported for monkeypatch + callers)
from app.models import Chunk, File

logger = logging.getLogger("app.ingestion")


async def _get_or_create_file(business_id: uuid.UUID, file_id: str, *, filename: str | None = None) -> File:
    async with get_session() as session:
        result = await session.execute(
            select(File).where(File.business_id == business_id, File.file_id == file_id)
        )
        file_row = result.scalar_one_or_none()
        if file_row is None:
            file_row = File(business_id=business_id, file_id=file_id, filename=filename or file_id, status="pending")
            session.add(file_row)
        else:
            file_row.status = "pending"
        await session.commit()
        await session.refresh(file_row)
        return file_row


async def _set_status(
    business_id: uuid.UUID,
    file_id: str,
    status: str,
    *,
    error: str | None = None,
    looks_scanned: bool | None = None,
) -> None:
    async with get_session() as session:
        result = await session.execute(
            select(File).where(File.business_id == business_id, File.file_id == file_id)
        )
        file_row = result.scalar_one_or_none()
        if file_row is None:
            return
        file_row.status = status
        file_row.error = error
        if looks_scanned is not None:
            file_row.looks_scanned = looks_scanned
        session.add(file_row)
        await session.commit()


async def set_preview_markdown(business_id: uuid.UUID, file_id: str, preview_markdown: str | None) -> None:
    """Store Docling's markdown export for human preview — orthogonal to chunking/embedding,
    so it's written as soon as extraction succeeds rather than gated on embed success."""
    async with get_session() as session:
        result = await session.execute(
            select(File).where(File.business_id == business_id, File.file_id == file_id)
        )
        file_row = result.scalar_one_or_none()
        if file_row is None:
            return
        file_row.preview_markdown = preview_markdown
        session.add(file_row)
        await session.commit()


async def _delete_chunks(business_id: uuid.UUID, file_id: str) -> None:
    async with get_session() as session:
        await session.execute(
            delete(Chunk).where(Chunk.business_id == business_id, Chunk.file_id == file_id)
        )
        await session.commit()


async def _store_chunks(
    business_id: uuid.UUID,
    file_id: str,
    spans,
    embeddings: list[list[float]],
    *,
    tags: list[str] | None = None,
) -> None:
    tags = tags or []
    async with get_session() as session:
        for idx, (span, embedding) in enumerate(zip(spans, embeddings)):
            session.add(
                Chunk(
                    business_id=business_id,
                    file_id=file_id,
                    chunk_index=idx,
                    content=span.content,
                    char_start=span.char_start,
                    char_end=span.char_end,
                    embedding=embedding,
                    tsv=func.to_tsvector("english", span.content),
                    tags=tags,
                )
            )
        await session.commit()


async def _run_ingest(
    business_id: uuid.UUID,
    file_id: str,
    text: str,
    *,
    filename: str | None = None,
    tags: list[str] | None = None,
    looks_scanned: bool = False,
) -> None:
    """Shared extract(-less)/chunk/embed/store body for both fresh ingest and replace.

    Chunks are only written *after* embedding succeeds — a failed embed step
    never leaves partial/stale chunks queryable, and the file status never
    reaches "indexed" until storage actually completes (CLAUDE.md §2.5,
    build plan §4).
    """
    await _get_or_create_file(business_id, file_id, filename=filename)
    await _set_status(business_id, file_id, "processing", looks_scanned=looks_scanned)

    spans = chunk_text(text)
    texts = [s.content for s in spans]

    try:
        embeddings = await embed_chunks(texts)
    except Exception as exc:  # noqa: BLE001 - must surface to caller AND flip status
        logger.warning("ingest failed business_id=%s file_id=%s chunks=%d", business_id, file_id, len(spans))
        await _set_status(business_id, file_id, "failed", error=str(exc))
        raise

    await _delete_chunks(business_id, file_id)  # swap, never append
    await _store_chunks(business_id, file_id, spans, embeddings, tags=tags)
    await _set_status(business_id, file_id, "indexed")
    logger.info("ingest indexed business_id=%s file_id=%s chunks=%d", business_id, file_id, len(spans))


async def ingest_text(
    *,
    business_id: uuid.UUID,
    file_id: str,
    text: str,
    filename: str | None = None,
    tags: list[str] | None = None,
    looks_scanned: bool = False,
) -> None:
    """Chunk -> embed -> store raw text for a (business, file) pair."""
    await _run_ingest(business_id, file_id, text, filename=filename, tags=tags, looks_scanned=looks_scanned)


async def replace_file(
    *,
    business_id: uuid.UUID,
    file_id: str,
    text: str,
    tags: list[str] | None = None,
    looks_scanned: bool = False,
) -> None:
    """Re-run the pipeline for an existing file_id: old chunks gone, new chunks in. Swap, not append."""
    await _run_ingest(business_id, file_id, text, tags=tags, looks_scanned=looks_scanned)


async def delete_file(*, business_id: uuid.UUID, file_id: str) -> None:
    """Delete a file's chunks and its file row. Never leaves orphaned chunks (CLAUDE.md §2.5)."""
    await _delete_chunks(business_id, file_id)
    async with get_session() as session:
        await session.execute(delete(File).where(File.business_id == business_id, File.file_id == file_id))
        await session.commit()
    logger.info("deleted file business_id=%s file_id=%s", business_id, file_id)
