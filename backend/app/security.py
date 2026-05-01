from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Annotated

from beanie import PydanticObjectId
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.models import User
from app.settings import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.version_prefix}/auth/token",
    auto_error=False,
)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(user_id: PydanticObjectId, username: str) -> str:
    expire = datetime.now(UTC) + timedelta(seconds=settings.ACCESS_TOKEN_TTL_SECONDS)
    payload = {"sub": username, "id": str(user_id), "exp": expire}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


async def authenticate_user(username: str, password: str) -> User | None:
    user = await User.find_one(User.username == username)
    if user and verify_password(password, user.password):
        return user
    return None


async def get_current_user(token: Annotated[str | None, Depends(oauth2_scheme)]) -> User:
    err = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise err
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        user_id = payload.get("id")
        if not user_id:
            raise err
    except JWTError as exc:
        raise err from exc

    user = await User.get(user_id)
    if not user:
        raise err
    return user
