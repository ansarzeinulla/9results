import datetime
import os

import bcrypt
import jwt
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.errors import AppError

TOKEN_TTL_HOURS = 12
_bearer = HTTPBearer(auto_error=False)


def _secret():
    return os.environ.get("JWT_SECRET", "dev-secret-change-me")


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), password_hash.encode())
    except ValueError:
        return False


def make_token(user_id: int, username: str, role: str) -> str:
    payload = {
        "sub": str(user_id),
        "username": username,
        "role": role,
        "exp": datetime.datetime.now(datetime.timezone.utc)
        + datetime.timedelta(hours=TOKEN_TTL_HOURS),
    }
    return jwt.encode(payload, _secret(), algorithm="HS256")


def current_user(creds: HTTPAuthorizationCredentials = Depends(_bearer)):
    if creds is None:
        raise AppError(401, "MISSING_TOKEN", "Missing token")
    try:
        return jwt.decode(creds.credentials, _secret(), algorithms=["HS256"])
    except jwt.PyJWTError:
        raise AppError(401, "INVALID_TOKEN", "Invalid token")


def require_organizer(user=Depends(current_user)):
    if user.get("role") not in ("ADMIN", "ORGANIZER"):
        raise AppError(403, "ORGANIZER_REQUIRED", "Organizer role required")
    return user


def require_admin(user=Depends(current_user)):
    if user.get("role") != "ADMIN":
        raise AppError(403, "ADMIN_REQUIRED", "Admin role required")
    return user
