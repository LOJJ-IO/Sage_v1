"""Phase 2 acceptance: username+PIN login, JWT, roles, business_id exposure."""

from __future__ import annotations

import uuid

import pytest
from httpx import ASGITransport, AsyncClient

from app.auth import hash_pin
from app.db import get_session, new_business
from app.main import app
from app.models import User


async def _create_user(business_id: uuid.UUID, username: str, pin: str, role: str, is_primary_admin: bool = False) -> User:
    async with get_session() as session:
        user = User(
            business_id=business_id,
            username=username,
            pin_hash=hash_pin(pin),
            role=role,
            is_primary_admin=is_primary_admin,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return user


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


async def test_login_exposes_business_id(client: AsyncClient):
    business_id = await new_business(name="Store A")
    await _create_user(business_id, "alice", "1234", role="admin", is_primary_admin=True)

    resp = await client.post(
        "/auth/login", json={"business_id": str(business_id), "username": "alice", "pin": "1234"}
    )
    assert resp.status_code == 200
    token = resp.json()["access_token"]

    me = await client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["business_id"] == str(business_id)
    assert me.json()["role"] == "admin"


async def test_unauthenticated_request_is_rejected(client: AsyncClient):
    resp = await client.get("/files")
    assert resp.status_code in (401, 403)


async def test_wrong_pin_is_rejected(client: AsyncClient):
    business_id = await new_business(name="Store A")
    await _create_user(business_id, "alice", "1234", role="admin")

    resp = await client.post(
        "/auth/login", json={"business_id": str(business_id), "username": "alice", "pin": "0000"}
    )
    assert resp.status_code == 401


async def test_staff_cannot_hit_admin_only_routes(client: AsyncClient):
    business_id = await new_business(name="Store A")
    await _create_user(business_id, "bob", "1234", role="staff")

    login = await client.post(
        "/auth/login", json={"business_id": str(business_id), "username": "bob", "pin": "1234"}
    )
    token = login.json()["access_token"]

    resp = await client.get("/files", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 403


async def test_admin_can_hit_admin_only_routes(client: AsyncClient):
    business_id = await new_business(name="Store A")
    await _create_user(business_id, "carol", "1234", role="admin")

    login = await client.post(
        "/auth/login", json={"business_id": str(business_id), "username": "carol", "pin": "1234"}
    )
    token = login.json()["access_token"]

    resp = await client.get("/files", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json() == []
