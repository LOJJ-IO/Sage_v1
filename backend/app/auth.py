"""Username + PIN auth, JWT, roles, and the per-request business_id dependency
(build plan §2/§9 Phase 2). Behind a swappable interface: everything below
the two functions `verify_login` and `issue_token` could be swapped for a
different identity provider without touching route code.

No Supabase Auth, no RLS (CLAUDE.md §2.2) — every check happens here.
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Annotated

import bcrypt
import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from sqlalchemy import select

from app.config import get_settings
from app.db import get_session
from app.models import User

_bearer = HTTPBearer(auto_error=False)


class AuthenticatedUser(BaseModel):
    user_id: uuid.UUID
    business_id: uuid.UUID
    username: str
    role: str
    is_primary_admin: bool


def hash_pin(pin: str) -> str:
    return bcrypt.hashpw(pin.encode("utf-8"), bcrypt.gensalt()).decode("ascii")


def verify_pin(pin: str, pin_hash: str) -> bool:
    return bcrypt.checkpw(pin.encode("utf-8"), pin_hash.encode("ascii"))


def issue_token(user: User) -> str:
    settings = get_settings()
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user.id),
        "business_id": str(user.business_id),
        "username": user.username,
        "role": user.role,
        "is_primary_admin": user.is_primary_admin,
        "iat": now,
        "exp": now + timedelta(minutes=settings.jwt_expires_minutes),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def _decode_token(token: str) -> AuthenticatedUser:
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token") from exc
    return AuthenticatedUser(
        user_id=uuid.UUID(payload["sub"]),
        business_id=uuid.UUID(payload["business_id"]),
        username=payload["username"],
        role=payload["role"],
        is_primary_admin=payload["is_primary_admin"],
    )


async def verify_login(*, business_id: uuid.UUID, username: str, pin: str) -> User | None:
    """Look up a user within one business and verify their PIN. business_id is
    required — there is no username-only lookup across businesses."""
    async with get_session() as session:
        result = await session.execute(
            select(User).where(User.business_id == business_id, User.username == username)
        )
        user = result.scalar_one_or_none()
        if user is None or not verify_pin(pin, user.pin_hash):
            return None
        return user


async def resolve_business_id_for_username(username: str) -> uuid.UUID | None:
    """Best-effort business lookup when the caller doesn't know its business_id.

    The frontend sign-in form only collects username+PIN (per the MVP spec's
    route map, which never puts business_id in the login payload) even though
    usernames are only unique *within* a business, not globally. For the
    pilot's single-tenant-per-deployment reality this is unambiguous. Returns
    None both when the username doesn't exist anywhere and when it exists in
    more than one business — either way the caller should treat it the same
    as "invalid credentials" rather than leaking which case it was.
    """
    async with get_session() as session:
        result = await session.execute(select(User.business_id).where(User.username == username).distinct())
        matches = result.scalars().all()
        if len(matches) == 1:
            return matches[0]
        if len(matches) > 1:
            logging.getLogger("app.auth").warning(
                "username %r exists in multiple businesses — cannot auto-resolve at login", username
            )
        return None


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> AuthenticatedUser:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")
    return _decode_token(credentials.credentials)


CurrentUser = Annotated[AuthenticatedUser, Depends(get_current_user)]


def require_admin(user: CurrentUser) -> AuthenticatedUser:
    if user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin role required")
    return user


AdminUser = Annotated[AuthenticatedUser, Depends(require_admin)]


def require_primary_admin(user: CurrentUser) -> AuthenticatedUser:
    if not user.is_primary_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Primary admin required")
    return user


PrimaryAdminUser = Annotated[AuthenticatedUser, Depends(require_primary_admin)]


class LoginRequest(BaseModel):
    username: str
    pin: str
    business_id: uuid.UUID | None = None


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    must_change_pin: bool = False


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
async def login(payload: LoginRequest) -> LoginResponse:
    business_id = payload.business_id
    if business_id is None:
        business_id = await resolve_business_id_for_username(payload.username)
        if business_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or PIN")

    user = await verify_login(business_id=business_id, username=payload.username, pin=payload.pin)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or PIN")
    return LoginResponse(access_token=issue_token(user), role=user.role)


@router.get("/me", response_model=AuthenticatedUser)
async def me(user: CurrentUser) -> AuthenticatedUser:
    return user
