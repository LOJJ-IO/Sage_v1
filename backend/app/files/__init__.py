"""File lifecycle status/count helpers — the read side the lifecycle contract uses.

Mutating operations (`ingest_text`, `delete_file`, `replace_file`) live in
`app.ingestion` because they own the extract -> chunk -> embed -> store
pipeline; this package owns status/count reads plus the upload HTTP surface
(Phase 3).
"""

from __future__ import annotations

import uuid

from sqlalchemy import func, select

from app.db import get_session
from app.models import Chunk, File


async def get_file_status(business_id: uuid.UUID, file_id: str) -> str | None:
    """Return the file's status (`pending`|`processing`|`indexed`|`failed`), or None if unknown."""
    async with get_session() as session:
        result = await session.execute(
            select(File.status).where(File.business_id == business_id, File.file_id == file_id)
        )
        row = result.scalar_one_or_none()
        return row


async def count_chunks(business_id: uuid.UUID, file_id: str) -> int:
    """Count chunks for a (business, file) pair. Zero after delete — never orphaned."""
    async with get_session() as session:
        result = await session.execute(
            select(func.count())
            .select_from(Chunk)
            .where(Chunk.business_id == business_id, Chunk.file_id == file_id)
        )
        return int(result.scalar_one())
