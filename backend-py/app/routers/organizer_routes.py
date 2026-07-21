import re

import psycopg
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app import db
from app.auth import require_organizer
from app.engines.rating import calculate_tournament_ratings
from app.engines.swiss import PairingError, validate_round_pairings
from app.engines.swiss_rules import generate_swiss_round

router = APIRouter(dependencies=[Depends(require_organizer)])


# --- ownership ----------------------------------------------------------
# Tournaments belong to whoever created them. Only the owner (or an admin)
# may modify a tournament; a legacy row without an owner is admin-only.

def _user_id(user: dict) -> int:
    return int(user["sub"])


def _check_owner_tid(conn, tid: int, user: dict) -> None:
    if user.get("role") == "ADMIN":
        return
    row = conn.execute(
        "SELECT owner_user_id FROM tournaments WHERE id = %s", (tid,)
    ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Tournament not found")
    if row["owner_user_id"] != _user_id(user):
        raise HTTPException(
            status_code=403,
            detail="Only the organizer who created this tournament can modify it",
        )


def _check_owner_rid(conn, rid: int, user: dict) -> int:
    """Ownership check via a round id; returns the tournament id."""
    row = conn.execute(
        "SELECT tournament_id FROM rounds WHERE id = %s", (rid,)
    ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Round not found")
    _check_owner_tid(conn, row["tournament_id"], user)
    return row["tournament_id"]


def _check_owner_pairing(conn, pairing_id: int, user: dict) -> None:
    row = conn.execute(
        """SELECT r.tournament_id FROM pairings p
           JOIN rounds r ON r.id = p.round_id WHERE p.id = %s""",
        (pairing_id,),
    ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Pairing not found")
    _check_owner_tid(conn, row["tournament_id"], user)

# Postgres constraint names mapped to messages an organizer can act on.
_CONSTRAINT_MESSAGES = {
    "chk_tourn_dates": "The end date must not be earlier than the start date",
    "chk_tourn_rounds": "The number of rounds must be between 1 and 50",
    "chk_tourn_status": "Unknown tournament status",
}


def _tournament_write_error(e: Exception) -> HTTPException:
    """Turn a constraint violation into an actionable 4xx."""
    if isinstance(e, psycopg.errors.UniqueViolation):
        return HTTPException(
            status_code=409, detail="A tournament with this slug already exists"
        )
    if isinstance(e, psycopg.errors.CheckViolation):
        name = getattr(e.diag, "constraint_name", None) or ""
        return HTTPException(
            status_code=422,
            detail=_CONSTRAINT_MESSAGES.get(name, f"Invalid value ({name or e})"),
        )
    if isinstance(e, psycopg.errors.ForeignKeyViolation):
        return HTTPException(
            status_code=422,
            detail="Unknown federation, location, level, rating type or status",
        )
    if isinstance(e, psycopg.errors.DataError):
        return HTTPException(status_code=422, detail=str(e))
    raise e


class TournamentBody(BaseModel):
    name: str
    slug: str
    federation_id: str
    location_id: str
    rating_type_id: str
    tournament_type_id: str
    start_date: str
    end_date: str
    # rounds is no longer declared upfront — the schedule grows as new
    # pairings are generated. Kept optional for backward compatibility.
    rounds: int | None = None
    level_id: str | None = None
    participant_type_id: str | None = None
    time_control: str | None = None
    status: str | None = None
    # Ordered tie-break criteria (TB1..TB4); duplicates are allowed.
    tie_breaks: list[str] | None = None


def _save_tie_breaks(conn, tid: int, tie_breaks: list[str] | None) -> None:
    if tie_breaks is None:
        return
    conn.execute("DELETE FROM tournament_tie_breaks WHERE tournament_id = %s", (tid,))
    for pos, tb in enumerate(tie_breaks[:10], start=1):
        conn.execute(
            """INSERT INTO tournament_tie_breaks (tournament_id, tie_break_id, position)
               VALUES (%s, %s, %s)""",
            (tid, tb, pos),
        )


@router.post("/tournaments")
def create_tournament(body: TournamentBody, user=Depends(require_organizer)):
    with db.connect() as conn:
        try:
            row = conn.execute(
                """INSERT INTO tournaments (name, slug, federation_id, location_id,
                       rating_type_id, tournament_type_id, start_date, end_date,
                       rounds, level_id, participant_type_id, time_control, status,
                       owner_user_id)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                           COALESCE(%s, 'REGISTRATION'), %s)
                   RETURNING id, slug""",
                (body.name, body.slug, body.federation_id, body.location_id,
                 body.rating_type_id, body.tournament_type_id, body.start_date,
                 body.end_date, body.rounds, body.level_id,
                 body.participant_type_id, body.time_control, body.status,
                 _user_id(user)),
            ).fetchone()
        except psycopg.Error as e:
            raise _tournament_write_error(e)
        try:
            _save_tie_breaks(conn, row["id"], body.tie_breaks)
        except psycopg.errors.ForeignKeyViolation:
            raise HTTPException(status_code=422, detail="Unknown tie-break criterion")
        conn.commit()
    return row


@router.get("/my/tournaments")
def my_tournaments(user=Depends(require_organizer)):
    """The dashboard list: an organizer sees only their own tournaments,
    an admin sees everything."""
    with db.connect() as conn:
        if user.get("role") == "ADMIN":
            rows = conn.execute(
                "SELECT * FROM tournaments ORDER BY start_date DESC"
            ).fetchall()
        else:
            rows = conn.execute(
                """SELECT * FROM tournaments WHERE owner_user_id = %s
                   ORDER BY start_date DESC""",
                (_user_id(user),),
            ).fetchall()
    return rows


@router.put("/tournaments/{tid}")
def update_tournament(tid: int, body: TournamentBody, user=Depends(require_organizer)):
    with db.connect() as conn:
        _check_owner_tid(conn, tid, user)
        try:
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
        except psycopg.Error as e:
            raise _tournament_write_error(e)
        try:
            _save_tie_breaks(conn, tid, body.tie_breaks)
        except psycopg.errors.ForeignKeyViolation:
            raise HTTPException(status_code=422, detail="Unknown tie-break criterion")
        conn.commit()
    if row is None:
        raise HTTPException(status_code=404, detail="Tournament not found")
    return row


# Creating and editing players lives in admin_routes (admin-only). Organizers
# may only add an existing player to their own tournament, by id.


class AddPlayerBody(BaseModel):
    player_id: str


@router.post("/tournaments/{tid}/players")
def add_player(tid: int, body: AddPlayerBody, user=Depends(require_organizer)):
    with db.connect() as conn:
        _check_owner_tid(conn, tid, user)
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


class BulkAddBody(BaseModel):
    ids: str  # free text: comma, newline or space separated


def parse_ids(raw: str) -> list[str]:
    """Split a pasted list of ids on commas/newlines/semicolons, keeping order
    and dropping blanks and repeats."""
    seen: list[str] = []
    for chunk in re.split(r"[,\n;]+", raw):
        pid = chunk.strip()
        if pid and pid not in seen:
            seen.append(pid)
    return seen


@router.post("/tournaments/{tid}/players/bulk")
def add_players_bulk(tid: int, body: BulkAddBody, user=Depends(require_organizer)):
    """Register many players at once. One bad id never stops the rest — each
    failure is reported back with a reason. Start numbers are renumbered once
    at the end rather than after every insert."""
    ids = parse_ids(body.ids)
    added: list[str] = []
    errors: list[dict] = []

    with db.connect() as conn:
        _check_owner_tid(conn, tid, user)
        known = {
            r["id"] for r in conn.execute(
                "SELECT id FROM players WHERE id = ANY(%s)", (ids,)
            ).fetchall()
        } if ids else set()
        already = {
            r["player_id"] for r in conn.execute(
                "SELECT player_id FROM tournament_participants WHERE tournament_id = %s",
                (tid,),
            ).fetchall()
        }

        for pid in ids:
            if pid not in known:
                errors.append({"id": pid, "reason": "Player not found"})
                continue
            if pid in already:
                errors.append({"id": pid, "reason": "Already registered"})
                continue
            try:
                conn.execute(
                    "CALL admin_add_to_tournament_nosync(%s, %s)", (tid, pid)
                )
                added.append(pid)
                already.add(pid)
            except psycopg.Error as e:
                conn.rollback()
                errors.append({"id": pid, "reason": str(e).strip()})

        if added:
            conn.execute("CALL sync_starting_ranks(%s)", (tid,))
        conn.commit()

    return {"added": len(added), "failed": len(errors),
            "added_ids": added, "errors": errors}


@router.delete("/tournaments/{tid}/players/{player_id}")
def remove_player(tid: int, player_id: str, user=Depends(require_organizer)):
    with db.connect() as conn:
        _check_owner_tid(conn, tid, user)
        conn.execute("CALL admin_remove_from_tournament(%s, %s)", (tid, player_id))
        conn.commit()
    return {"ok": True}


@router.post("/tournaments/{tid}/players/sync-ranks")
def sync_ranks(tid: int, user=Depends(require_organizer)):
    with db.connect() as conn:
        _check_owner_tid(conn, tid, user)
        conn.execute("CALL sync_starting_ranks(%s)", (tid,))
        conn.commit()
    return {"ok": True}


@router.post("/tournaments/{tid}/withdraw/{player_id}")
def withdraw_player(tid: int, player_id: str, user=Depends(require_organizer)):
    with db.connect() as conn:
        _check_owner_tid(conn, tid, user)
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
def generate_round(tid: int, user=Depends(require_organizer)):
    with db.connect() as conn:
        _check_owner_tid(conn, tid, user)
        last = conn.execute(
            "SELECT COALESCE(MAX(round_number), 0) AS n FROM rounds WHERE tournament_id=%s",
            (tid,),
        ).fetchone()["n"]
        exists = conn.execute(
            "SELECT 1 FROM tournaments WHERE id=%s", (tid,)
        ).fetchone()
        if exists is None:
            raise HTTPException(status_code=404, detail="Tournament not found")
        if last >= 50:
            raise HTTPException(status_code=409, detail="Round limit reached")
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
def validate_pairings(tid: int, body: ValidateBody, user=Depends(require_organizer)):
    with db.connect() as conn:
        _check_owner_tid(conn, tid, user)
        players, matches = _tournament_state(conn, tid)
    matches = [m for m in matches if m["result"] is not None]
    return validate_round_pairings(
        pairings=body.pairings, players=players,
        previous_matches=matches, round_number=body.round_number,
    )


class ReplacePairingsBody(BaseModel):
    pairings: list[dict]


@router.put("/rounds/{rid}/pairings")
def replace_pairings(rid: int, body: ReplacePairingsBody, user=Depends(require_organizer)):
    with db.connect() as conn:
        _check_owner_rid(conn, rid, user)
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
def cancel_pairings(rid: int, user=Depends(require_organizer)):
    with db.connect() as conn:
        _check_owner_rid(conn, rid, user)
        conn.execute("CALL org_cancel_pairings(%s)", (rid,))
        conn.commit()
    return {"ok": True}


@router.delete("/rounds/{rid}")
def delete_round(rid: int, user=Depends(require_organizer)):
    """Cancel a round entirely: the round row goes away (pairings cascade)
    and the standings are recalculated, so a new round can be generated.
    Closed rounds are history and cannot be deleted."""
    with db.connect() as conn:
        tid = _check_owner_rid(conn, rid, user)
        closed = conn.execute(
            "SELECT is_closed FROM rounds WHERE id = %s", (rid,)
        ).fetchone()["is_closed"]
        if closed:
            raise HTTPException(status_code=409, detail="Round is closed")
        conn.execute("DELETE FROM rounds WHERE id = %s", (rid,))
        conn.execute("CALL calculate_standings(%s)", (tid,))
        conn.commit()
    return {"ok": True}


class ResultBody(BaseModel):
    result: str


@router.post("/pairings/{pid}/result")
def set_result(pid: int, body: ResultBody, user=Depends(require_organizer)):
    with db.connect() as conn:
        _check_owner_pairing(conn, pid, user)
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
def cancel_result(pid: int, user=Depends(require_organizer)):
    with db.connect() as conn:
        _check_owner_pairing(conn, pid, user)
        try:
            conn.execute("CALL org_cancel_result(%s)", (pid,))
        except psycopg.errors.RaiseException as e:
            if "round_closed" in str(e):
                raise HTTPException(status_code=409, detail="Round is closed")
            raise
        conn.commit()
    return {"ok": True}


class BatchResult(BaseModel):
    pairing_id: int
    result: str | None = None  # None clears the result


class BatchResultsBody(BaseModel):
    results: list[BatchResult]


@router.post("/rounds/{rid}/results")
def set_results_batch(rid: int, body: BatchResultsBody, user=Depends(require_organizer)):
    """Save a whole round of results in one request.

    Entering results one board at a time meant one HTTP round trip and one
    full standings recalculation per click. Here every result is written in a
    single transaction and the standings are recalculated exactly once. The
    batch is all-or-nothing, so a typo cannot half-apply a round.
    """
    with db.connect() as conn:
        _check_owner_rid(conn, rid, user)
        round_row = conn.execute(
            "SELECT tournament_id, is_closed FROM rounds WHERE id = %s", (rid,)
        ).fetchone()
        if round_row is None:
            raise HTTPException(status_code=404, detail="Round not found")
        if round_row["is_closed"]:
            raise HTTPException(status_code=409, detail="Round is closed")

        valid_ids = {
            r["id"] for r in conn.execute(
                "SELECT id FROM pairings WHERE round_id = %s", (rid,)
            ).fetchall()
        }
        for item in body.results:
            if item.pairing_id not in valid_ids:
                raise HTTPException(
                    status_code=422,
                    detail=f"Pairing {item.pairing_id} is not in this round",
                )

        try:
            for item in body.results:
                conn.execute(
                    "UPDATE pairings SET result_id = %s WHERE id = %s",
                    (item.result, item.pairing_id),
                )
            # recalculated once for the whole batch, not once per board
            conn.execute("CALL calculate_standings(%s)", (round_row["tournament_id"],))
        except psycopg.errors.ForeignKeyViolation:
            conn.rollback()
            raise HTTPException(status_code=422, detail="Unknown result code")
        except psycopg.Error as e:
            conn.rollback()
            raise HTTPException(status_code=422, detail=str(e).strip())
        conn.commit()

    return {"saved": len(body.results)}


@router.post("/tournaments/{tid}/rounds/{rid}/close")
def close_round(tid: int, rid: int, user=Depends(require_organizer)):
    with db.connect() as conn:
        _check_owner_tid(conn, tid, user)
        conn.execute("CALL org_close_round(%s, %s)", (tid, rid))
        conn.commit()
    return {"ok": True}


@router.post("/tournaments/{tid}/finalize")
def finalize(tid: int, user=Depends(require_organizer)):
    with db.connect() as conn:
        _check_owner_tid(conn, tid, user)
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
