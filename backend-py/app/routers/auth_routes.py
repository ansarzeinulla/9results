import psycopg
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app import db
from app.auth import hash_password, make_token, require_admin, verify_password
from app.errors import AppError, db_error

router = APIRouter()


class LoginBody(BaseModel):
    username: str
    password: str


@router.post("/auth/login")
def login(body: LoginBody):
    with db.connect() as conn:
        row = conn.execute(
            """SELECT id, username, password_hash, role_id FROM users
               WHERE username = %s AND is_active""",
            (body.username,),
        ).fetchone()
    if row is None or not verify_password(body.password, row["password_hash"]):
        raise AppError(401, "INVALID_CREDENTIALS", "Invalid credentials")
    token = make_token(row["id"], row["username"], row["role_id"])
    return {"token": token, "user": {"username": row["username"], "role": row["role_id"]}}


class OfficialBody(BaseModel):
    first_name: str
    last_name: str
    title: str | None = None
    username: str
    password: str


@router.post("/officials")
def create_official(body: OfficialBody, user=Depends(require_admin)):
    args = (body.first_name, body.last_name, body.title,
            body.username, hash_password(body.password))
    with db.connect() as conn:
        try:
            conn.execute("CALL admin_create_official(%s, %s, %s, %s, %s)", args)
        except psycopg.errors.UniqueViolation:
            raise AppError(409, "USERNAME_TAKEN", "This username is already taken")
        except psycopg.Error as e:
            conn.rollback()
            raise db_error(e, operation="CALL admin_create_official", params=args)
        conn.commit()
    return {"ok": True}
