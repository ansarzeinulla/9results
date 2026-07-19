"""Admin-only endpoints: the global player registry and organizer accounts.

Players are created and edited here (never deleted) — organizers may only add
an existing player to their own tournament by id.
"""
import psycopg
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app import db
from app.auth import require_admin

router = APIRouter(dependencies=[Depends(require_admin)])


class PlayerBody(BaseModel):
    id: str
    first_name: str
    last_name: str
    federation_id: str
    middle_name: str | None = None
    gender_id: str | None = None
    year_of_birth: int | None = None
    title_id: str | None = None
    club: str | None = None
    rating_classic: int = 0
    rating_rapid: int = 0
    rating_blitz: int = 0


def _upsert(body: PlayerBody, player_id: str):
    with db.connect() as conn:
        try:
            conn.execute(
                """CALL admin_upsert_player(%s, %s, %s, %s, %s, %s, %s, %s,
                                            %s, %s, %s, %s)""",
                (player_id, body.first_name, body.last_name, body.federation_id,
                 body.rating_classic, body.middle_name, body.gender_id,
                 body.year_of_birth, body.title_id, body.club,
                 body.rating_rapid, body.rating_blitz),
            )
        except psycopg.errors.ForeignKeyViolation as e:
            # unknown federation / gender / title
            raise HTTPException(status_code=422, detail=f"Unknown reference: {e}")
        except (psycopg.errors.CheckViolation, psycopg.errors.DataError) as e:
            # failed CHECK (e.g. year_of_birth) or an over-long value
            raise HTTPException(status_code=422, detail=str(e))
        conn.commit()
    return {"ok": True, "id": player_id}


@router.post("/players")
def create_player(body: PlayerBody):
    return _upsert(body, body.id)


@router.put("/players/{player_id}")
def update_player(player_id: str, body: PlayerBody):
    with db.connect() as conn:
        exists = conn.execute(
            "SELECT 1 FROM players WHERE id = %s", (player_id,)
        ).fetchone()
    if exists is None:
        raise HTTPException(status_code=404, detail="Player not found")
    return _upsert(body, player_id)
