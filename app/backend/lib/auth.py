"""Single-password session auth. Cookie is httpOnly; sessions live in Mongo."""
import os
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, Request

from lib.db import db

COOKIE_NAME = "dpmd_session"
SESSION_DAYS = 30


def _now() -> datetime:
    return datetime.now(timezone.utc)


def app_password() -> str:
    return os.environ.get("APP_PASSWORD", "dpmdbatanghari2025")


async def create_session() -> str:
    token = str(uuid.uuid4())
    await db.sessions.insert_one(
        {"token": token, "created_at": _now(), "expires_at": _now() + timedelta(days=SESSION_DAYS)}
    )
    return token


async def delete_session(token: str | None) -> None:
    if token:
        await db.sessions.delete_one({"token": token})


async def is_authenticated(request: Request) -> bool:
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        return False
    sess = await db.sessions.find_one({"token": token})
    if not sess:
        return False
    exp = sess.get("expires_at")
    if isinstance(exp, datetime):
        if exp.tzinfo is None:  # motor returns naive datetimes — normalise before compare
            exp = exp.replace(tzinfo=timezone.utc)
        if exp < _now():
            await db.sessions.delete_one({"token": token})
            return False
    return True


async def require_auth(request: Request) -> None:
    if not await is_authenticated(request):
        raise HTTPException(status_code=401, detail="Belum login atau sesi berakhir")
