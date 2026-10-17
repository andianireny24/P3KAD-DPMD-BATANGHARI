from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel

from lib.auth import (
    COOKIE_NAME,
    SESSION_DAYS,
    app_password,
    create_session,
    delete_session,
    is_authenticated,
)

router = APIRouter()


class LoginRequest(BaseModel):
    password: str


@router.post("/auth/login")
async def login(input: LoginRequest, response: Response):
    if input.password != app_password():
        raise HTTPException(status_code=401, detail="Password salah")
    token = await create_session()
    # httpOnly cookie — the frontend never touches tokens, it just calls beginSession()
    response.set_cookie(
        COOKIE_NAME,
        token,
        max_age=SESSION_DAYS * 86400,
        httponly=True,
        samesite="lax",
        path="/",
    )
    return {"ok": True}


@router.post("/auth/logout")
async def logout(request: Request, response: Response):
    await delete_session(request.cookies.get(COOKIE_NAME))
    response.delete_cookie(COOKIE_NAME, path="/")
    return {"ok": True}


@router.get("/auth/me")
async def me(request: Request):
    return {"authenticated": await is_authenticated(request)}
