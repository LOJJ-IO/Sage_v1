"""Admin file endpoints: upload / list / delete / replace (build plan §4 Phase 3)."""

from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, HTTPException, Response, UploadFile, status
from pydantic import BaseModel

from app.auth import AdminUser
from app.files import service
from app.files.storage import get_storage
from app.ingestion.pipeline import process_file

router = APIRouter(prefix="/files", tags=["files"])


class FileResponse(BaseModel):
    file_id: str
    filename: str
    status: str
    looks_scanned: bool
    error: str | None
    created_at: datetime


def _to_response(file_row) -> FileResponse:
    return FileResponse(
        file_id=file_row.file_id,
        filename=file_row.filename,
        status=file_row.status,
        looks_scanned=file_row.looks_scanned,
        error=file_row.error,
        created_at=file_row.created_at,
    )


@router.post("", response_model=FileResponse, status_code=status.HTTP_201_CREATED)
async def upload_file(user: AdminUser, background_tasks: BackgroundTasks, upload: UploadFile) -> FileResponse:
    content = await upload.read()
    try:
        file_row = await service.create_pending_file(
            business_id=user.business_id, filename=upload.filename or "upload", content=content
        )
    except service.UnsupportedFileType as exc:
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail=str(exc)) from exc

    background_tasks.add_task(
        process_file,
        business_id=user.business_id,
        file_id=file_row.file_id,
        filename=file_row.filename,
        storage_path=file_row.storage_path,
    )
    return _to_response(file_row)


@router.get("", response_model=list[FileResponse])
async def list_files(user: AdminUser) -> list[FileResponse]:
    files = await service.list_files(business_id=user.business_id)
    return [_to_response(f) for f in files]


@router.get("/{file_id}/content")
async def download_file(user: AdminUser, file_id: str) -> Response:
    """Bytes only ever move through the backend — never a direct Storage URL to the frontend."""
    file_row = await service.get_file(business_id=user.business_id, file_id=file_id)
    if file_row is None or not file_row.storage_path:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="file not found")
    content = await get_storage().download(file_row.storage_path)
    return Response(content=content, media_type="application/octet-stream")


@router.get("/{file_id}/text")
async def get_file_text(user: AdminUser, file_id: str) -> dict[str, str]:
    """Extracted text (from ingestion chunks), for previewing formats with no in-browser renderer."""
    file_row = await service.get_file(business_id=user.business_id, file_id=file_id)
    if file_row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="file not found")
    text = await service.get_extracted_text(business_id=user.business_id, file_id=file_id)
    return {"text": text}


@router.get("/{file_id}/preview")
async def get_file_preview(user: AdminUser, file_id: str) -> dict[str, str | None]:
    """Docling's markdown export (real tables/headings) for a human-readable preview —
    separate from `/text`, which returns the RAG-chunked (sentence-flattened) text.
    `markdown` is null for plain-text uploads and for files ingested before this
    column existed, until they're replaced/re-uploaded."""
    file_row = await service.get_file(business_id=user.business_id, file_id=file_id)
    if file_row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="file not found")
    return {"markdown": file_row.preview_markdown}


@router.delete("/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_file(user: AdminUser, file_id: str) -> None:
    file_row = await service.get_file(business_id=user.business_id, file_id=file_id)
    if file_row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="file not found")
    await service.delete_file_and_storage(business_id=user.business_id, file_id=file_id)


@router.put("/{file_id}", response_model=FileResponse)
async def replace_file(
    user: AdminUser, file_id: str, background_tasks: BackgroundTasks, upload: UploadFile
) -> FileResponse:
    content = await upload.read()
    try:
        file_row = await service.replace_file_bytes(
            business_id=user.business_id, file_id=file_id, filename=upload.filename or "upload", content=content
        )
    except service.UnsupportedFileType as exc:
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    background_tasks.add_task(
        process_file,
        business_id=user.business_id,
        file_id=file_row.file_id,
        filename=file_row.filename,
        storage_path=file_row.storage_path,
    )
    return _to_response(file_row)
