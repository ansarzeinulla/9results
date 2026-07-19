import psycopg
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app import db
from app.auth import require_organizer
from app.engines.rating import calculate_tournament_ratings
from app.engines.swiss import PairingError, validate_round_pairings
from app.engines.swiss_rules import generate_swiss_round, validate_total_rounds

router = APIRouter(dependencies=[Depends(require_organizer)])


class TournamentBody(BaseModel):
    name: str
    slug: str
    federation_id: str
    location_id: str
    rating_type_id: str
    tournament_type_id: str
    start_date: str
    end_date: str
    rounds: int
    level_id: str | None = None
    participant_type_id: str | None = None
    time_control: str | None = None
    status: str | None = None


@router.post("/tournaments")
def create_tournament(body: TournamentBody):
    try:
        validate_total_rounds(body.rounds)
    except PairingError as e:
        raise HTTPException(status_code=422, detail=str(e))
    with db.connect() as conn:
        row = conn.execute(
            """INSERT INTO tournaments (name, slug, federation_id, location_id,
                   rating_type_id, tournament_type_id, start_date, end_date,
                   rounds, level_id, participant_type_id, time_control, status)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                       COALESCE(%s, 'REGISTRATION'))
               RETURNING id, slug""",
            (body.name, body.slug, body.federation_id, body.location_id,
             body.rating_type_id, body.tournament_type_id, body.start_date,
             body.end_date, body.rounds, body.level_id,
             body.participant_type_id, body.time_control, body.status),
        ).fetchone()
        conn.commit()
    return row


@router.put("/tournaments/{tid}")
def update_tournament(tid: int, body: TournamentBody):
    try:
        validate_total_rounds(body.rounds)
    except PairingError as e:
        raise HTTPException(status_code=422, detail=str(e))
    with db.connect() as conn:
        row = conn.execute(
            """UPDATE tournaments SET name=%s, slug=%s, federation_id=%s,
                   location_id=%s, rating_type_id=%s, tournament_type_id=%s,
                   start_date=%s, end_date=%s, rounds=%s, level_id=%s,
                   participant_type_id=%s, time_control=%s,
                   status=COALESCE(%s, status)
               WHERE id=%s RETURNING id""",
            (body.name, body.slug, body.federation_id, body.location_id,
             body.rating_type_id, body.tournament_type_id, body.start_date,
             body.end_date, body.rounds, body.level_id,
             body.participant_type_id, body.time_control, body.status, tid),
        ).fetchone()
        conn.commit()
    if row is None:
        raise HTTPException(status_code=404, detail="Tournament not found")
    return row


# Creating and editing players lives in admin_routes (admin-only). Organizers
# may only add an existing player to their own tournament, by id.


class AddPlayerBody(BaseModel):
    player_id: str


@router.post("/tournaments/{tid}/players")
def add_player(tid: int, body: AddPlayerBody):
    with db.connect() as conn:
        exists = conn.execute(
            "SELECT 1 FROM players WHERE id = %s", (body.player_id,)
        ).fetchone()
        if exists is None:
            raise HTTPException(status_code=404, detail="Player not found")
        try:
            conn.execute("CALL admin_add_to_tournament(%s, %s)", (tid, body.player_id))
        except psycopg.errors.UniqueViolation:
            raise HTTPException(status_code=409, detail="Already registered")
        conn.commit()
    return {"ok": True}


@router.delete("/tournaments/{tid}/players/{player_id}")
def remove_player(tid: int, player_id: str):
    with db.connect() as conn:
        conn.execute("CALL admin_remove_from_tournament(%s, %s)", (tid, player_id))
        conn.commit()
    return {"ok": True}


@router.post("/tournaments/{tid}/players/sync-ranks")
def sync_ranks(tid: int):
    with db.connect() as conn:
        conn.execute("CALL sync_starting_ranks(%s)", (tid,))
        conn.commit()
    return {"ok": True}


@router.post("/tournaments/{tid}/withdraw/{player_id}")
def withdraw_player(tid: int, player_id: str):
    with db.connect() as conn:
        conn.execute("CALL org_withdraw_player(%s, %s)", (tid, player_id))
        conn.commit()
    return {"ok": True}


def _tournament_state(conn, tid):
    players = conn.execute(
        """SELECT tp.player_id, tp.points AS current_points,
                  tp.rating_at_tournament AS current_rating,
                  tp.starting_rank AS seed_number,
                  (p.last_name || ' ' || p.first_name) AS name
           FROM tournament_participants tp
           JOIN players p ON p.id = tp.player_id
           WHERE tp.tournament_id = %s AND tp.status = 'ACTIVE'""",
        (tid,),
    ).fetchall()
    matches = conn.execute(
        """SELECT r.round_number, p.white_player_id AS player1_id,
                  p.black_player_id AS player2_id, p.result_id AS result
           FROM pairings p JOIN rounds r ON p.round_id = r.id
           WHERE r.tournament_id = %s""",
        (tid,),
    ).fetchall()
    return players, matches


@router.post("/tournaments/{tid}/generate-round")
def generate_round(tid: int):
    with db.connect() as conn:
        last = conn.execute(
            "SELECT COALESCE(MAX(round_number), 0) AS n FROM rounds WHERE tournament_id=%s",
            (tid,),
        ).fetchone()["n"]
        total = conn.execute(
            "SELECT rounds FROM tournaments WHERE id=%s", (tid,)
        ).fetchone()
        if total is None:
            raise HTTPException(status_code=404, detail="Tournament not found")
        if last >= total["rounds"]:
            raise HTTPException(status_code=409, detail="All rounds already created")
        open_round = conn.execute(
            "SELECT 1 FROM rounds WHERE tournament_id=%s AND NOT is_closed", (tid,)
        ).fetchone()
        if open_round:
            raise HTTPException(status_code=409, detail="Previous round is not closed")

        players, matches = _tournament_state(conn, tid)
        round_number = last + 1
        try:
            result = generate_swiss_round(players, matches, round_number)
        except PairingError as e:
            raise HTTPException(status_code=422, detail=str(e))

        conn.execute("CALL org_add_round(%s, %s)", (tid, round_number))
        rid = conn.execute(
            "SELECT id FROM rounds WHERE tournament_id=%s AND round_number=%s",
            (tid, round_number),
        ).fetchone()["id"]
        board = 0
        for m in result["pairings"]:
            if m["player2_id"] is None:
                # store bye as a pairing with NULL black and an automatic point
                board += 1
                conn.execute(
                    "CALL org_add_pairing(%s, %s, %s, %s)",
                    (rid, 999, m["player1_id"], None),
                )
                pid = conn.execute(
                    "SELECT id FROM pairings WHERE round_id=%s AND board_number=999",
                    (rid,),
                ).fetchone()["id"]
                conn.execute("CALL org_set_result(%s, '1BYE')", (pid,))
            else:
                conn.execute(
                    "CALL org_add_pairing(%s, %s, %s, %s)",
                    (rid, m["board_number"], m["player1_id"], m["player2_id"]),
                )
        conn.commit()
    return {"round_id": rid, "round_number": round_number, "pairings": result["pairings"]}


class ValidateBody(BaseModel):
    round_number: int
    pairings: list[dict]


@router.post("/tournaments/{tid}/validate-pairings")
def validate_pairings(tid: int, body: ValidateBody):
    with db.connect() as conn:
        players, matches = _tournament_state(conn, tid)
    matches = [m for m in matches if m["result"] is not None]
    return validate_round_pairings(
        pairings=body.pairings, players=players,
        previous_matches=matches, round_number=body.round_number,
    )


class ReplacePairingsBody(BaseModel):
    pairings: list[dict]


@router.put("/rounds/{rid}/pairings")
def replace_pairings(rid: int, body: ReplacePairingsBody):
    with db.connect() as conn:
        row = conn.execute(
            "SELECT tournament_id, round_number, is_closed FROM rounds WHERE id=%s",
            (rid,),
        ).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Round not found")
        if row["is_closed"]:
            raise HTTPException(status_code=409, detail="Round is closed")
        tid = row["tournament_id"]
        players, matches = _tournament_state(conn, tid)
        prev = [
            m for m in matches
            if m["result"] is not None and m["round_number"] != row["round_number"]
        ]
        verdict = validate_round_pairings(
            pairings=body.pairings, players=players,
            previous_matches=prev, round_number=row["round_number"],
        )
        if not verdict["ok"]:
            return verdict
        conn.execute("CALL org_cancel_pairings(%s)", (rid,))
        board = 1
        for m in body.pairings:
            if m.get("player2_id") is None:
                conn.execute("CALL org_add_pairing(%s, %s, %s, %s)",
                             (rid, 999, m["player1_id"], None))
                pid = conn.execute(
                    "SELECT id FROM pairings WHERE round_id=%s AND board_number=999",
                    (rid,),
                ).fetchone()["id"]
                conn.execute("CALL org_set_result(%s, '1BYE')", (pid,))
            else:
                conn.execute("CALL org_add_pairing(%s, %s, %s, %s)",
                             (rid, m.get("board_number") or board,
                              m["player1_id"], m["player2_id"]))
            board += 1
        conn.commit()
    return verdict


@router.delete("/rounds/{rid}/pairings")
def cancel_pairings(rid: int):
    with db.connect() as conn:
        conn.execute("CALL org_cancel_pairings(%s)", (rid,))
        conn.commit()
    return {"ok": True}


class ResultBody(BaseModel):
    result: str


@router.post("/pairings/{pid}/result")
def set_result(pid: int, body: ResultBody):
    with db.connect() as conn:
        try:
            conn.execute("CALL org_set_result(%s, %s)", (pid, body.result))
        except psycopg.errors.RaiseException as e:
            if "round_closed" in str(e):
                raise HTTPException(status_code=409, detail="Round is closed")
            raise
        except psycopg.errors.ForeignKeyViolation:
            raise HTTPException(status_code=422, detail="Unknown result code")
        conn.commit()
    return {"ok": True}


@router.delete("/pairings/{pid}/result")
def cancel_result(pid: int):
    with db.connect() as conn:
        try:
            conn.execute("CALL org_cancel_result(%s)", (pid,))
        except psycopg.errors.RaiseException as e:
            if "round_closed" in str(e):
                raise HTTPException(status_code=409, detail="Round is closed")
            raise
        conn.commit()
    return {"ok": True}


@router.post("/tournaments/{tid}/rounds/{rid}/close")
def close_round(tid: int, rid: int):
    with db.connect() as conn:
        conn.execute("CALL org_close_round(%s, %s)", (tid, rid))
        conn.commit()
    return {"ok": True}


@router.post("/tournaments/{tid}/finalize")
def finalize(tid: int):
    with db.connect() as conn:
        players, matches = _tournament_state(conn, tid)
        ratings = {p["player_id"]: float(p["current_rating"] or 0) for p in players}
        deltas = calculate_tournament_ratings(
            ratings,
            [
                {"player1_id": m["player1_id"], "player2_id": m["player2_id"],
                 "result": m["result"]}
                for m in matches
            ],
        )
        # calculate_tournament_ratings works on its own copy, so the new rating
        # is the starting rating plus the accumulated delta.
        payload = [
            {"player_id": pid, "delta": delta,
             "new_rating": int(ratings[pid] + delta)}
            for pid, delta in deltas.items()
        ]
        # even players with 0 delta get a history row
        for p in players:
            if p["player_id"] not in deltas:
                payload.append({"player_id": p["player_id"], "delta": 0,
                                "new_rating": int(ratings[p["player_id"]])})
        import json
        conn.execute("CALL finalize_tournament(%s, %s::jsonb)", (tid, json.dumps(payload)))
        conn.commit()
    return {"deltas": payload}
