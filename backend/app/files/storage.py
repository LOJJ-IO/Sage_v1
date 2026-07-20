"""Supabase Storage read/write — server-side only (build plan §4 Phase 3).

The frontend never talks to Storage directly; bytes only ever move through
this module, called from `app.files.service`. Supabase is dumb blob storage
here (CLAUDE.md §2.2) — no signed URLs handed to the client, no bucket
policies doing authorization.

Falls back to local disk under `local_storage_dir` when `SUPABASE_URL` /
`SUPABASE_SERVICE_KEY` aren't configured, so Phases 3-5 are exercisable in
dev without a Supabase project. The interface is identical either way.
"""

from __future__ import annotations

import uuid
from pathlib import Path
from typing import Protocol

import httpx

from app.config import get_settings

BUCKET = "sage-files"


class Storage(Protocol):
    async def upload(self, business_id: uuid.UUID, file_id: str, content: bytes) -> str: ...
    async def download(self, storage_path: str) -> bytes: ...
    async def delete(self, storage_path: str) -> None: ...


def _object_path(business_id: uuid.UUID, file_id: str) -> str:
    return f"{business_id}/{file_id}"


class SupabaseStorage:
    def __init__(self, supabase_url: str, service_key: str) -> None:
        self._base = supabase_url.rstrip("/")
        # Supabase's Storage API requires both headers — Authorization alone
        # gets rejected with a 403 "Invalid Compact JWS" even for a valid key.
        self._headers = {"Authorization": f"Bearer {service_key}", "apikey": service_key}

    async def upload(self, business_id: uuid.UUID, file_id: str, content: bytes) -> str:
        path = _object_path(business_id, file_id)
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{self._base}/storage/v1/object/{BUCKET}/{path}",
                headers={**self._headers, "x-upsert": "true"},
                content=content,
            )
            resp.raise_for_status()
        return path

    async def download(self, storage_path: str) -> bytes:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{self._base}/storage/v1/object/{BUCKET}/{storage_path}", headers=self._headers)
            resp.raise_for_status()
            return resp.content

    async def delete(self, storage_path: str) -> None:
        async with httpx.AsyncClient() as client:
            resp = await client.delete(
                f"{self._base}/storage/v1/object/{BUCKET}/{storage_path}", headers=self._headers
            )
            if resp.status_code not in (200, 204, 404):
                resp.raise_for_status()


class LocalDiskStorage:
    """Dev-only stand-in with the same contract as SupabaseStorage."""

    def __init__(self, root: str) -> None:
        self._root = Path(root)
        self._root.mkdir(parents=True, exist_ok=True)

    def _path(self, storage_path: str) -> Path:
        return self._root / storage_path

    async def upload(self, business_id: uuid.UUID, file_id: str, content: bytes) -> str:
        path = _object_path(business_id, file_id)
        target = self._path(path)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(content)
        return path

    async def download(self, storage_path: str) -> bytes:
        return self._path(storage_path).read_bytes()

    async def delete(self, storage_path: str) -> None:
        target = self._path(storage_path)
        target.unlink(missing_ok=True)


def get_storage() -> Storage:
    settings = get_settings()
    if settings.supabase_url and settings.supabase_service_key:
        return SupabaseStorage(settings.supabase_url, settings.supabase_service_key)
    return LocalDiskStorage(settings.local_storage_dir)
