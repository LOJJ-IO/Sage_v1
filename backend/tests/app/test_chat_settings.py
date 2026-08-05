"""Configure Chat acceptance: settings persist per user and shape the agent's
extra system-prompt text, without touching SYSTEM_PROMPT's grounding rules."""

from __future__ import annotations

import uuid

import pytest
from httpx import ASGITransport, AsyncClient

from app.auth import hash_pin, issue_token
from app.chat_settings import build_style_instructions, get_chat_settings, upsert_chat_settings
from app.db import get_session, new_business
from app.main import app
from app.models import ChatSettings, User


def test_build_style_instructions_empty_when_no_settings():
    assert build_style_instructions(None) == ""


def test_build_style_instructions_default_goal_and_length_is_empty():
    settings = ChatSettings(goal="default", response_length="default", custom_instructions="")
    assert build_style_instructions(settings) == ""


def test_build_style_instructions_learning_goal():
    settings = ChatSettings(goal="learning", response_length="default", custom_instructions="")
    text = build_style_instructions(settings)
    assert "step-by-step" in text


def test_build_style_instructions_custom_goal_uses_custom_instructions():
    settings = ChatSettings(
        goal="custom", response_length="default", custom_instructions="Act as a patient trainer."
    )
    assert build_style_instructions(settings) == "Act as a patient trainer."


def test_build_style_instructions_custom_goal_with_blank_instructions_contributes_nothing():
    settings = ChatSettings(goal="custom", response_length="default", custom_instructions="")
    assert build_style_instructions(settings) == ""


def test_build_style_instructions_combines_goal_and_length():
    settings = ChatSettings(goal="learning", response_length="shorter", custom_instructions="")
    text = build_style_instructions(settings)
    assert "step-by-step" in text
    assert "brief and direct" in text


async def _create_user(business_id: uuid.UUID, *, username: str = "staff") -> User:
    async with get_session() as session:
        user = User(business_id=business_id, username=username, pin_hash=hash_pin("1234"), role="staff")
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return user


async def test_get_chat_settings_returns_none_before_first_save():
    business_id = await new_business(name="Store A")
    user = await _create_user(business_id)
    assert await get_chat_settings(business_id=business_id, user_id=user.id) is None


async def test_upsert_chat_settings_round_trips_and_overwrites():
    business_id = await new_business(name="Store A")
    user = await _create_user(business_id)

    row = await upsert_chat_settings(
        business_id=business_id, user_id=user.id, goal="learning", response_length="default", custom_instructions=""
    )
    assert row.goal == "learning"

    row = await upsert_chat_settings(
        business_id=business_id,
        user_id=user.id,
        goal="custom",
        response_length="shorter",
        custom_instructions="Be blunt.",
    )
    fetched = await get_chat_settings(business_id=business_id, user_id=user.id)
    assert fetched is not None
    assert fetched.goal == "custom"
    assert fetched.response_length == "shorter"
    assert fetched.custom_instructions == "Be blunt."


async def test_upsert_chat_settings_rejects_invalid_goal():
    business_id = await new_business(name="Store A")
    user = await _create_user(business_id)
    with pytest.raises(ValueError):
        await upsert_chat_settings(
            business_id=business_id,
            user_id=user.id,
            goal="not-a-real-goal",
            response_length="default",
            custom_instructions="",
        )


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


async def test_get_chat_settings_route_defaults_before_any_save(client: AsyncClient):
    business_id = await new_business(name="Store A")
    user = await _create_user(business_id)
    headers = {"Authorization": f"Bearer {issue_token(user)}"}

    resp = await client.get("/chat-settings", headers=headers)
    assert resp.status_code == 200
    assert resp.json() == {"goal": "default", "response_length": "default", "custom_instructions": ""}


async def test_put_chat_settings_route_persists_and_is_returned_by_get(client: AsyncClient):
    business_id = await new_business(name="Store A")
    user = await _create_user(business_id)
    headers = {"Authorization": f"Bearer {issue_token(user)}"}

    put_resp = await client.put(
        "/chat-settings",
        headers=headers,
        json={"goal": "custom", "response_length": "shorter", "custom_instructions": "Be blunt."},
    )
    assert put_resp.status_code == 200
    assert put_resp.json() == {"goal": "custom", "response_length": "shorter", "custom_instructions": "Be blunt."}

    get_resp = await client.get("/chat-settings", headers=headers)
    assert get_resp.json() == put_resp.json()


async def test_put_chat_settings_route_rejects_invalid_goal(client: AsyncClient):
    business_id = await new_business(name="Store A")
    user = await _create_user(business_id)
    headers = {"Authorization": f"Bearer {issue_token(user)}"}

    resp = await client.put(
        "/chat-settings",
        headers=headers,
        json={"goal": "not-a-real-goal", "response_length": "default", "custom_instructions": ""},
    )
    assert resp.status_code == 422


async def test_chat_settings_are_isolated_per_user_within_the_same_business(client: AsyncClient):
    """The core of the per-user redesign: two staff at the same store must not share a persona."""
    business_id = await new_business(name="Store A")
    user_a = await _create_user(business_id, username="alice")
    user_b = await _create_user(business_id, username="bob")
    headers_a = {"Authorization": f"Bearer {issue_token(user_a)}"}
    headers_b = {"Authorization": f"Bearer {issue_token(user_b)}"}

    await client.put(
        "/chat-settings",
        headers=headers_a,
        json={"goal": "custom", "response_length": "shorter", "custom_instructions": "Alice's persona."},
    )

    resp_b = await client.get("/chat-settings", headers=headers_b)
    assert resp_b.json() == {"goal": "default", "response_length": "default", "custom_instructions": ""}

    resp_a = await client.get("/chat-settings", headers=headers_a)
    assert resp_a.json() == {
        "goal": "custom",
        "response_length": "shorter",
        "custom_instructions": "Alice's persona.",
    }


async def test_chat_settings_are_isolated_per_business(client: AsyncClient):
    business_a = await new_business(name="Store A")
    business_b = await new_business(name="Store B")
    user_a = await _create_user(business_a)
    user_b = await _create_user(business_b)
    headers_a = {"Authorization": f"Bearer {issue_token(user_a)}"}
    headers_b = {"Authorization": f"Bearer {issue_token(user_b)}"}

    await client.put(
        "/chat-settings",
        headers=headers_a,
        json={"goal": "custom", "response_length": "shorter", "custom_instructions": "Store A's persona."},
    )

    resp_b = await client.get("/chat-settings", headers=headers_b)
    assert resp_b.json() == {"goal": "default", "response_length": "default", "custom_instructions": ""}
