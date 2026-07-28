"""Phase 3 acceptance: upload -> pending file record; bytes retrievable only via backend."""

from __future__ import annotations

import uuid

import pytest
from httpx import ASGITransport, AsyncClient

from app.auth import hash_pin, issue_token
from app.db import get_session, new_business
from app.main import app
from app.models import User


async def _admin_token(business_id: uuid.UUID) -> str:
    async with get_session() as session:
        user = User(business_id=business_id, username="admin", pin_hash=hash_pin("1234"), role="admin")
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return issue_token(user)


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


async def test_upload_returns_pending_file_and_bytes_roundtrip(client: AsyncClient):
    business_id = await new_business(name="Store A")
    token = await _admin_token(business_id)
    headers = {"Authorization": f"Bearer {token}"}

    content = b"%PDF-1.4 fake pdf content for content-type sniffing test"
    resp = await client.post(
        "/files", headers=headers, files={"upload": ("policy.pdf", content, "application/pdf")}
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["status"] == "pending"
    file_id = body["file_id"]

    listed = await client.get("/files", headers=headers)
    assert any(f["file_id"] == file_id for f in listed.json())

    downloaded = await client.get(f"/files/{file_id}/content", headers=headers)
    assert downloaded.status_code == 200
    assert downloaded.content == content


async def test_upload_rejects_disallowed_content_type(client: AsyncClient):
    business_id = await new_business(name="Store A")
    token = await _admin_token(business_id)
    headers = {"Authorization": f"Bearer {token}"}

    resp = await client.post(
        "/files",
        headers=headers,
        files={"upload": ("virus.exe", b"MZ\x90\x00fake-exe-bytes", "application/octet-stream")},
    )
    assert resp.status_code == 415
