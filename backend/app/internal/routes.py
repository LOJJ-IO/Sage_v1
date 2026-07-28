"""POST /internal/retrieve — service-token auth, never public (build plan §8).

A thin wrapper over the single `retrieve()` chokepoint plus the trust
decision. The agent calls only this; it never touches Postgres or Storage
directly, so changing retrieval internals never changes this contract.
"""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel

from app.config import get_settings
from app.retrieval import retrieve
from app.retrieval.trust import evaluate_trust

router = APIRouter(prefix="/internal", tags=["internal"])


def _require_service_token(x_service_token: Annotated[str | None, Header()] = None) -> None:
    settings = get_settings()
    if not x_service_token or x_service_token != settings.internal_service_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid service token")


class RetrieveRequest(BaseModel):
    business_id: uuid.UUID
    query: str
    top_k: int = 8


class HitResponse(BaseModel):
    file_id: str
    chunk_index: int
    content: str
    char_start: int
    char_end: int
    score: float


class RetrieveResponse(BaseModel):
    hits: list[HitResponse]
    trust_score: float
    refused: bool
    reason: str | None


@router.post("/retrieve", response_model=RetrieveResponse, dependencies=[Depends(_require_service_token)])
async def internal_retrieve(payload: RetrieveRequest) -> RetrieveResponse:
    hits = await retrieve(business_id=payload.business_id, query=payload.query, top_k=payload.top_k)
    decision = await evaluate_trust(
        business_id=payload.business_id, question=payload.query, scores=[h.score for h in hits]
    )
    return RetrieveResponse(
        hits=[
            HitResponse(
                file_id=h.file_id,
                chunk_index=h.chunk_index,
                content=h.content,
                char_start=h.char_start,
                char_end=h.char_end,
                score=h.score,
            )
            for h in hits
        ],
        trust_score=decision.trust_score,
        refused=decision.refused,
        reason=decision.reason,
    )
