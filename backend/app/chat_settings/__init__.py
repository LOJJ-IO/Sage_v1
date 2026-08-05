"""Per-user chat persona/response-length preferences.

One row per user — each person's own Configure Chat settings, not shared
business-wide (product decision: different staff may want different styles).
`business_id` is still a required, non-defaulted argument on every function
here (CLAUDE.md §2.4), even though `user_id` is the primary key. `build_style_
instructions` is a pure function so the goal/length -> prompt-text mapping is
unit-testable without a DB or model call; `app.agent.sage_agent` layers its
output onto SYSTEM_PROMPT, never in place of it (CLAUDE.md §5 — grounding
rules are non-negotiable).
"""

from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert

from app.db import get_session
from app.models import ChatSettings

GOAL_DEFAULT = "default"
GOAL_LEARNING = "learning"
GOAL_CUSTOM = "custom"
VALID_GOALS = frozenset({GOAL_DEFAULT, GOAL_LEARNING, GOAL_CUSTOM})

LENGTH_DEFAULT = "default"
LENGTH_SHORTER = "shorter"
VALID_RESPONSE_LENGTHS = frozenset({LENGTH_DEFAULT, LENGTH_SHORTER})

_GOAL_INSTRUCTIONS: dict[str, str] = {
    GOAL_LEARNING: "Act as a patient learning guide: explain concepts step-by-step as you answer, "
    "the way you'd walk a new team member through something for the first time.",
}

_LENGTH_INSTRUCTIONS: dict[str, str] = {
    LENGTH_SHORTER: "Keep answers brief and direct — a sentence or two where possible.",
}

CUSTOM_INSTRUCTIONS_MAX_LEN = 2000


async def get_chat_settings(*, business_id: uuid.UUID, user_id: uuid.UUID) -> ChatSettings | None:
    async with get_session() as session:
        result = await session.execute(
            select(ChatSettings).where(
                ChatSettings.user_id == user_id, ChatSettings.business_id == business_id
            )
        )
        return result.scalar_one_or_none()


async def upsert_chat_settings(
    *, business_id: uuid.UUID, user_id: uuid.UUID, goal: str, response_length: str, custom_instructions: str
) -> ChatSettings:
    if goal not in VALID_GOALS:
        raise ValueError(f"invalid goal: {goal!r}")
    if response_length not in VALID_RESPONSE_LENGTHS:
        raise ValueError(f"invalid response_length: {response_length!r}")
    custom_instructions = custom_instructions.strip()[:CUSTOM_INSTRUCTIONS_MAX_LEN]

    async with get_session() as session:
        stmt = (
            insert(ChatSettings)
            .values(
                user_id=user_id,
                business_id=business_id,
                goal=goal,
                response_length=response_length,
                custom_instructions=custom_instructions,
            )
            .on_conflict_do_update(
                index_elements=[ChatSettings.user_id],
                set_={"goal": goal, "response_length": response_length, "custom_instructions": custom_instructions},
            )
            .returning(ChatSettings)
        )
        result = await session.execute(stmt)
        await session.commit()
        return result.scalar_one()


def build_style_instructions(settings: ChatSettings | None) -> str:
    """Turn a ChatSettings row into the extra system-prompt text `sage_agent` appends.

    Empty string (not None) when there's nothing to add, so callers can always
    concatenate without a None check.
    """
    if settings is None:
        return ""

    parts: list[str] = []

    if settings.goal == GOAL_CUSTOM:
        if settings.custom_instructions:
            parts.append(settings.custom_instructions)
    else:
        goal_text = _GOAL_INSTRUCTIONS.get(settings.goal)
        if goal_text:
            parts.append(goal_text)

    length_text = _LENGTH_INSTRUCTIONS.get(settings.response_length)
    if length_text:
        parts.append(length_text)

    return " ".join(parts)
