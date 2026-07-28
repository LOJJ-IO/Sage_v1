"""Phase 9 acceptance: per-business daily cap; exceeding it skips the LLM entirely."""

from __future__ import annotations

import pytest

from app.db import new_business
from app.limits import DailyCapExceeded, QueryEmpty, QueryTooLong, check_and_increment, validate_question


async def test_cap_is_enforced_per_business_per_day():
    business_id = await new_business(name="Store A")

    for _ in range(3):
        await check_and_increment(business_id, cap=3)

    with pytest.raises(DailyCapExceeded):
        await check_and_increment(business_id, cap=3)


async def test_cap_is_isolated_per_business():
    a = await new_business(name="Store A")
    b = await new_business(name="Store B")

    for _ in range(3):
        await check_and_increment(a, cap=3)

    # Store B has its own counter — not affected by Store A's usage.
    await check_and_increment(b, cap=3)


def test_empty_question_rejected():
    with pytest.raises(QueryEmpty):
        validate_question("   ")


def test_oversized_question_rejected():
    with pytest.raises(QueryTooLong):
        validate_question("x" * 5000)


async def test_answer_question_returns_limit_response_without_calling_agent(monkeypatch):
    from app.agent import answer as answer_module

    business_id = await new_business(name="Store A")

    called = {"agent": False}

    class _BoomAgent:
        async def run(self, *args, **kwargs):
            called["agent"] = True
            raise AssertionError("agent must not be called when the daily cap is exceeded")

    monkeypatch.setattr(answer_module, "get_agent", lambda: _BoomAgent())

    async def _always_exceeded(business_id, *, cap=None):
        raise answer_module.DailyCapExceeded(cap or 1)

    monkeypatch.setattr(answer_module, "check_and_increment", _always_exceeded)

    result = await answer_module.answer_question(business_id=business_id, user_id=None, question="hello?")

    assert result.limited is True
    assert called["agent"] is False
