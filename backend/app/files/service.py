"""File lifecycle orchestration: upload -> storage + pending row (build plan §4 Phase 3).

Sniffs real content type with `python-magic` — never trusts the extension
(build plan Phase 3 acceptance). Ingestion (extract/chunk/embed/store) is
kicked off as a FastAPI BackgroundTask from the route layer, not here, so
this module stays a thin, testable lifecycle boundary.
"""

from __future__ import annotations

import uuid

import magic
from sqlalchemy import select

from app.db import get_session
from app.files.storage import get_storage
from app.ingestion import delete_file as ingestion_delete_file
from app.ingestion.extract import extract_text
from app.models import File

ALLOWED_MIME_TYPES = {
    "application/pdf",
    "text/plain",
    "text/csv",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",  # .docx
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",  # .xlsx
    "application/msword",
}


class UnsupportedFileType(ValueError):
    pass


def sniff_content_type(content: bytes) -> str:
    return magic.from_buffer(content, mime=True)


async def create_pending_file(*, business_id: uuid.UUID, filename: str, content: bytes) -> File:
    """Validate real content type, persist bytes to storage, create a `pending` files row."""
    mime = sniff_content_type(content)
    if mime not in ALLOWED_MIME_TYPES:
        raise UnsupportedFileType(f"unsupported content type: {mime}")

    file_id = uuid.uuid4().hex
    storage = get_storage()
    storage_path = await storage.upload(business_id, file_id, content)

    async with get_session() as session:
        file_row = File(
            business_id=business_id,
            file_id=file_id,
            filename=filename,
            storage_path=storage_path,
            status="pending",
        )
        session.add(file_row)
        await session.commit()
        await session.refresh(file_row)
        return file_row


async def list_files(*, business_id: uuid.UUID) -> list[File]:
    async with get_session() as session:
        result = await session.execute(select(File).where(File.business_id == business_id))
        return list(result.scalars())


async def get_file(*, business_id: uuid.UUID, file_id: str) -> File | None:
    async with get_session() as session:
        result = await session.execute(
            select(File).where(File.business_id == business_id, File.file_id == file_id)
        )
        return result.scalar_one_or_none()


async def delete_file_and_storage(*, business_id: uuid.UUID, file_id: str) -> None:
    """Delete chunks + files row (app.ingestion.delete_file), then the storage object."""
    file_row = await get_file(business_id=business_id, file_id=file_id)
    await ingestion_delete_file(business_id=business_id, file_id=file_id)
    if file_row and file_row.storage_path:
        await get_storage().delete(file_row.storage_path)


async def replace_file_bytes(*, business_id: uuid.UUID, file_id: str, filename: str, content: bytes) -> File:
    """Upload replacement bytes to the same storage object and flip status back to pending.

    The actual chunk swap happens in `app.ingestion.replace_file`, invoked by
    the background pipeline once this returns — see `app.files.routes`.
    """
    mime = sniff_content_type(content)
    if mime not in ALLOWED_MIME_TYPES:
        raise UnsupportedFileType(f"unsupported content type: {mime}")

    storage = get_storage()
    storage_path = await storage.upload(business_id, file_id, content)

    async with get_session() as session:
        result = await session.execute(
            select(File).where(File.business_id == business_id, File.file_id == file_id)
        )
        file_row = result.scalar_one_or_none()
        if file_row is None:
            raise ValueError(f"no existing file {file_id!r} to replace")
        file_row.filename = filename
        file_row.storage_path = storage_path
        file_row.status = "pending"
        session.add(file_row)
        await session.commit()
        await session.refresh(file_row)
        return file_row


def extract_for_pipeline(filename: str, content: bytes):
    """Small re-export so routes/pipeline share one extraction call site."""
    return extract_text(filename, content)
