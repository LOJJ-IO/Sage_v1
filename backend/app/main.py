"""FastAPI app: router registration, Logfire init (build plan §4/§10).

FastAPI owns everything (CLAUDE.md §2.1) — this is the single process that
touches the database and storage. Nothing else does.
"""

from __future__ import annotations

import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.agent.answer import answer_question
from app.auth import CurrentUser
from app.auth import router as auth_router
from app.config import get_settings
from app.files.routes import router as files_router
from app.internal.routes import router as internal_router

logging.basicConfig(level=logging.INFO)

settings = get_settings()

if settings.logfire_token:
    import logfire

    logfire.configure(token=settings.logfire_token, service_name="sage-backend")
    logfire.instrument_pydantic_ai()

app = FastAPI(title="Sage Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if settings.logfire_token:
    import logfire

    logfire.instrument_fastapi(app)

app.include_router(auth_router)
app.include_router(files_router)
app.include_router(internal_router)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Starlette's default 500 path bypasses CORSMiddleware (ServerErrorMiddleware
    sits outside it), so an unhandled exception reaches the browser with no
    Access-Control-Allow-Origin header and shows up as a bare "Failed to fetch"
    instead of the real error. Routing through ExceptionMiddleware via this
    handler keeps the response inside CORSMiddleware so the header is applied."""
    logging.getLogger("app.main").exception("Unhandled exception on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


class AskRequest(BaseModel):
    question: str


class AskResponse(BaseModel):
    answer: str
    citations: list[str]
    refused: bool
    reason: str | None
    limited: bool


@app.post("/ask", response_model=AskResponse)
async def ask(user: CurrentUser, payload: AskRequest) -> AskResponse:
    result = await answer_question(business_id=user.business_id, user_id=user.user_id, question=payload.question)
    return AskResponse(
        answer=result.answer,
        citations=result.citations,
        refused=result.refused,
        reason=result.reason,
        limited=result.limited,
    )


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
