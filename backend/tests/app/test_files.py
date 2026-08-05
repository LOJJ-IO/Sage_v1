"""Phase 3 acceptance: upload -> pending file record; bytes retrievable only via backend."""

from __future__ import annotations

import uuid

import pytest
from httpx import ASGITransport, AsyncClient

from app.auth import hash_pin, issue_token
from app.db import get_session, new_business
from app.main import app
from app.models import EMBEDDING_DIMS, Chunk, User


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


async def test_get_file_text_reassembles_chunks_in_order(client: AsyncClient):
    business_id = await new_business(name="Store A")
    token = await _admin_token(business_id)
    headers = {"Authorization": f"Bearer {token}"}

    resp = await client.post(
        "/files", headers=headers, files={"upload": ("notes.docx", b"fake docx bytes", "application/octet-stream")}
    )
    file_id = resp.json()["file_id"]

    async with get_session() as session:
        session.add_all(
            [
                Chunk(
                    business_id=business_id,
                    file_id=file_id,
                    chunk_index=1,
                    content="second. ",
                    embedding=[0.0] * EMBEDDING_DIMS,
                ),
                Chunk(
                    business_id=business_id,
                    file_id=file_id,
                    chunk_index=0,
                    content="first. ",
                    embedding=[0.0] * EMBEDDING_DIMS,
                ),
            ]
        )
        await session.commit()

    text_resp = await client.get(f"/files/{file_id}/text", headers=headers)
    assert text_resp.status_code == 200
    assert text_resp.json() == {"text": "first. second. "}


async def test_get_file_text_404_for_missing_file(client: AsyncClient):
    business_id = await new_business(name="Store A")
    token = await _admin_token(business_id)
    headers = {"Authorization": f"Bearer {token}"}

    resp = await client.get("/files/does-not-exist/text", headers=headers)
    assert resp.status_code == 404


async def test_get_file_text_scoped_by_business_id(client: AsyncClient):
    business_a = await new_business(name="Store A")
    business_b = await new_business(name="Store B")
    token_a = await _admin_token(business_a)
    token_b = await _admin_token(business_b)

    resp = await client.post(
        "/files",
        headers={"Authorization": f"Bearer {token_a}"},
        files={"upload": ("notes.docx", b"fake docx bytes", "application/octet-stream")},
    )
    file_id = resp.json()["file_id"]

    cross_tenant = await client.get(f"/files/{file_id}/text", headers={"Authorization": f"Bearer {token_b}"})
    assert cross_tenant.status_code == 404


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


async def test_upload_accepts_txt_file_holding_html_source(client: AsyncClient):
    """A .txt used to jot down HTML prototypes magic-sniffs as text/html, not
    text/plain — still just text, not a disguised binary, so it's allowed."""
    business_id = await new_business(name="Store A")
    token = await _admin_token(business_id)
    headers = {"Authorization": f"Bearer {token}"}

    resp = await client.post(
        "/files",
        headers=headers,
        files={
            "upload": (
                "prototypes.txt",
                b"<!DOCTYPE html><html><body><h1>Prototype</h1></body></html>",
                "text/plain",
            )
        },
    )
    assert resp.status_code == 201


async def test_get_file_preview_defaults_to_null_markdown(client: AsyncClient):
    """No preview_markdown set yet (e.g. a .txt upload, or ingestion still running)."""
    business_id = await new_business(name="Store A")
    token = await _admin_token(business_id)
    headers = {"Authorization": f"Bearer {token}"}

    resp = await client.post(
        "/files", headers=headers, files={"upload": ("notes.txt", b"plain text", "text/plain")}
    )
    file_id = resp.json()["file_id"]

    preview = await client.get(f"/files/{file_id}/preview", headers=headers)
    assert preview.status_code == 200
    assert preview.json() == {"markdown": None}


async def test_get_file_preview_returns_stored_markdown(client: AsyncClient):
    from app.ingestion import set_preview_markdown

    business_id = await new_business(name="Store A")
    token = await _admin_token(business_id)
    headers = {"Authorization": f"Bearer {token}"}

    resp = await client.post(
        "/files", headers=headers, files={"upload": ("proposal.txt", b"stub bytes", "text/plain")}
    )
    file_id = resp.json()["file_id"]

    await set_preview_markdown(business_id, file_id, "| A | B |\n| --- | --- |\n| 1 | 2 |")

    preview = await client.get(f"/files/{file_id}/preview", headers=headers)
    assert preview.status_code == 200
    assert preview.json() == {"markdown": "| A | B |\n| --- | --- |\n| 1 | 2 |"}


async def test_get_file_preview_404_for_missing_file(client: AsyncClient):
    business_id = await new_business(name="Store A")
    token = await _admin_token(business_id)
    headers = {"Authorization": f"Bearer {token}"}

    resp = await client.get("/files/does-not-exist/preview", headers=headers)
    assert resp.status_code == 404


async def test_upload_still_rejects_binary_disguised_as_txt(client: AsyncClient):
    """The plain-text carve-out is content-sniffed too — it only forgives other
    *text* flavors, not a real binary payload wearing a .txt extension."""
    business_id = await new_business(name="Store A")
    token = await _admin_token(business_id)
    headers = {"Authorization": f"Bearer {token}"}

    resp = await client.post(
        "/files",
        headers=headers,
        files={"upload": ("not-really-text.txt", b"MZ\x90\x00fake-exe-bytes", "text/plain")},
    )
    assert resp.status_code == 415
