"""Configure Chat endpoints: read/write the signed-in user's own persona/response-length prefs."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.auth import CurrentUser
from app.chat_settings import VALID_GOALS, VALID_RESPONSE_LENGTHS, get_chat_settings, upsert_chat_settings
from app.models import ChatSettings

router = APIRouter(prefix="/chat-settings", tags=["chat-settings"])


class ChatSettingsResponse(BaseModel):
    goal: str
    response_length: str
    custom_instructions: str


class ChatSettingsRequest(BaseModel):
    goal: str
    response_length: str
    custom_instructions: str = Field(default="")


def _to_response(row: ChatSettings | None) -> ChatSettingsResponse:
    if row is None:
        return ChatSettingsResponse(goal="default", response_length="default", custom_instructions="")
    return ChatSettingsResponse(
        goal=row.goal, response_length=row.response_length, custom_instructions=row.custom_instructions
    )


@router.get("", response_model=ChatSettingsResponse)
async def read_chat_settings(user: CurrentUser) -> ChatSettingsResponse:
    row = await get_chat_settings(business_id=user.business_id, user_id=user.user_id)
    return _to_response(row)


@router.put("", response_model=ChatSettingsResponse)
async def write_chat_settings(user: CurrentUser, payload: ChatSettingsRequest) -> ChatSettingsResponse:
    if payload.goal not in VALID_GOALS:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="invalid goal")
    if payload.response_length not in VALID_RESPONSE_LENGTHS:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="invalid response_length")

    row = await upsert_chat_settings(
        business_id=user.business_id,
        user_id=user.user_id,
        goal=payload.goal,
        response_length=payload.response_length,
        custom_instructions=payload.custom_instructions,
    )
    return _to_response(row)
