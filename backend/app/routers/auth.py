from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from app.models import User
from app.schemas import GenericMessage, SignupRequest, TokenResponse, UserResponse
from app.security import (
    authenticate_user,
    create_access_token,
    get_current_user,
    hash_password,
)
from app.settings import settings

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", status_code=status.HTTP_201_CREATED, response_model=UserResponse)
async def signup(req: SignupRequest):
    if req.access_code != settings.SIGNUP_ACCESS_CODE:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Invalid access code")
    if await User.find_one(User.username == req.username):
        raise HTTPException(status.HTTP_409_CONFLICT, "Username already taken")
    if await User.find_one(User.email == req.email):
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")

    user = User(
        username=req.username,
        email=req.email,
        password=hash_password(req.password),
        fullname=req.fullname,
    )
    await user.insert()
    return UserResponse.model_validate(user.model_dump())


@router.post("/token", response_model=TokenResponse)
async def login(form: Annotated[OAuth2PasswordRequestForm, Depends()]):
    user = await authenticate_user(form.username, form.password)
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid credentials")
    return TokenResponse(
        access_token=create_access_token(user.id, user.username),
        user_id=user.id,
    )


@router.get("/me", response_model=UserResponse)
async def me(user: Annotated[User, Depends(get_current_user)]):
    return UserResponse.model_validate(user.model_dump())


@router.post("/logout", response_model=GenericMessage)
async def logout(user: Annotated[User, Depends(get_current_user)]):
    # JWTs are stateless — frontend just discards the token. Endpoint exists for symmetry.
    return GenericMessage(message="ok", description="Token discarded client-side")
