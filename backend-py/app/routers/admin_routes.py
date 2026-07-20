"""Admin-only endpoints: the global player registry and organizer accounts.

Players are created and edited here (never deleted) — organizers may only add
an existing player to their own tournament by id.
"""
import json

import psycopg
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app import db
from app.auth import require_admin
from app.translit import default_aliases

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
    # Alternative spellings (other alphabets); None = keep the stored value.
    aliases: list[str] | None = None


def _upsert(body: PlayerBody, player_id: str, is_create: bool = False):
    aliases = body.aliases
    if is_create and aliases is None:
        # auto-add Latin spellings for Cyrillic names so the player is
        # findable in both alphabets from day one
        aliases = default_aliases(body.first_name, body.last_name,
                                  body.middle_name)
    with db.connect() as conn:
        try:
            conn.execute(
                """CALL admin_upsert_player(%s, %s, %s, %s, %s, %s, %s, %s,
                                            %s, %s, %s, %s, %s::jsonb)""",
                (player_id, body.first_name, body.last_name, body.federation_id,
                 body.rating_classic, body.middle_name, body.gender_id,
                 body.year_of_birth, body.title_id, body.club,
                 body.rating_rapid, body.rating_blitz,
                 None if aliases is None else json.dumps(aliases)),
            )
        except psycopg.errors.ForeignKeyViolation as e:
            # unknown federation / gender / title
            raise HTTPException(status_code=422, detail=f"Unknown reference: {e}")
        except (psycopg.errors.CheckViolation, psycopg.errors.DataError) as e:
            # failed CHECK (e.g. year_of_birth) or an over-long value
            raise HTTPException(status_code=422, detail=str(e))
        conn.commit()
    return {"ok": True, "id": player_id}


@router.get("/players/{player_id}")
def get_player(player_id: str):
    """Fetch one player by id — the admin edit flow, indexed on the PK so it
    stays constant-time no matter how large the registry grows."""
    with db.connect() as conn:
        row = conn.execute(
            """SELECT id, first_name, last_name, middle_name, federation_id,
                      gender_id, year_of_birth, title_id, club,
                      rating_classic, rating_rapid, rating_blitz, aliases
               FROM players WHERE id = %s""",
            (player_id,),
        ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Player not found")
    return row


@router.post("/players")
def create_player(body: PlayerBody):
    return _upsert(body, body.id, is_create=True)


@router.delete("/players/{player_id}")
def delete_player(player_id: str):
    """Delete a player who has never played.

    Refused once the player appears in any tournament, pairing or rating
    history: the foreign keys cascade, so deleting them would quietly take
    finished results and standings snapshots with them. Withdraw them from the
    tournament instead.
    """
    with db.connect() as conn:
        exists = conn.execute(
            "SELECT 1 FROM players WHERE id = %s", (player_id,)
        ).fetchone()
        if exists is None:
            raise HTTPException(status_code=404, detail="Player not found")

        has_history = conn.execute(
            "SELECT player_has_history(%s) AS h", (player_id,)
        ).fetchone()["h"]
        if has_history:
            raise HTTPException(
                status_code=409,
                detail=("This player has tournament history and cannot be "
                        "deleted. Withdraw them from the tournament instead."),
            )

        conn.execute("DELETE FROM players WHERE id = %s", (player_id,))
        conn.commit()
    return {"ok": True, "deleted": player_id}


@router.put("/players/{player_id}")
def update_player(player_id: str, body: PlayerBody):
    with db.connect() as conn:
        exists = conn.execute(
            "SELECT 1 FROM players WHERE id = %s", (player_id,)
        ).fetchone()
    if exists is None:
        raise HTTPException(status_code=404, detail="Player not found")
    return _upsert(body, player_id)
