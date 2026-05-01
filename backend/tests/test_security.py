from app.security import create_access_token, hash_password, verify_password
from beanie import PydanticObjectId
from jose import jwt

from app.settings import settings


def test_password_hash_roundtrip():
    h = hash_password("super-secret")
    assert h != "super-secret"
    assert verify_password("super-secret", h)
    assert not verify_password("wrong", h)


def test_jwt_roundtrip():
    uid = PydanticObjectId()
    token = create_access_token(uid, "alice")
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    assert payload["sub"] == "alice"
    assert payload["id"] == str(uid)
    assert "exp" in payload
