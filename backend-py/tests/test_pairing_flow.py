"""Pairing generation over HTTP: engine dispatch by tournament type and the
round state-machine (clean 4xx, never a 500)."""
import psycopg
import pytest

from tests.conftest import auth, make_players, make_tournament


def _pair_set(pairings):
    return {
        frozenset((p["player1_id"], p["player2_id"]))
        for p in pairings if p["player2_id"] is not None
    }


def _generate(client, token, tid):
    return client.post(f"/api/tournaments/{tid}/generate-round", headers=auth(token))


def _register(client, token, tid, ids):
    for pid in ids:
        assert client.post(f"/api/tournaments/{tid}/players", headers=auth(token),
                           json={"player_id": pid}).status_code == 200


# --- engine dispatch: the type picks the engine -------------------------

def test_olympic_type_uses_the_knockout_bracket(client, admin_token):
    h = auth(admin_token)
    ids = make_players(client, admin_token, "oly", 4, rating=2000)
    tid = make_tournament(client, admin_token, "oly-cup", type_id="Olympic")
    _register(client, admin_token, tid, ids)
    r = _generate(client, admin_token, tid)
    assert r.status_code == 200, r.text
    # knockout seeds 1vN, 2vN-1 (oly-1 strongest ... oly-4 weakest)
    assert _pair_set(r.json()["pairings"]) == {
        frozenset(("oly-1", "oly-4")), frozenset(("oly-2", "oly-3")),
    }


def test_round_robin_type_uses_the_circle_method(client, admin_token):
    ids = make_players(client, admin_token, "rr", 4, rating=2000)
    tid = make_tournament(client, admin_token, "rr-cup", type_id="Round-robin")
    _register(client, admin_token, tid, ids)
    r = _generate(client, admin_token, tid)
    assert r.status_code == 200, r.text
    pairs = _pair_set(r.json()["pairings"])
    # circle method round 1 with seeds by rating: (1,2) and (3,4)
    assert pairs == {frozenset(("rr-1", "rr-2")), frozenset(("rr-3", "rr-4"))}
    # distinct from what Swiss would have produced (1v3, 2v4)
    assert pairs != {frozenset(("rr-1", "rr-3")), frozenset(("rr-2", "rr-4"))}


def test_swiss_type_still_folds(client, admin_token):
    ids = make_players(client, admin_token, "sw", 4, rating=2000)
    tid = make_tournament(client, admin_token, "sw-cup", type_id="Swiss")
    _register(client, admin_token, tid, ids)
    r = _generate(client, admin_token, tid)
    assert r.status_code == 200, r.text
    assert _pair_set(r.json()["pairings"]) == {
        frozenset(("sw-1", "sw-3")), frozenset(("sw-2", "sw-4")),
    }


# --- round state machine ------------------------------------------------

def test_generate_round_on_unknown_tournament_is_404(client, admin_token):
    r = client.post("/api/tournaments/99999999/generate-round",
                    headers=auth(admin_token))
    assert r.status_code == 404


def test_cannot_generate_while_previous_round_is_open(client, admin_token):
    ids = make_players(client, admin_token, "open", 4, rating=1800)
    tid = make_tournament(client, admin_token, "open-cup", type_id="Swiss")
    _register(client, admin_token, tid, ids)
    assert _generate(client, admin_token, tid).status_code == 200
    # previous round never closed -> second generate is a conflict
    r = _generate(client, admin_token, tid)
    assert r.status_code == 409
    assert r.json()["detail"]["code"] == "PREVIOUS_ROUND_OPEN"


def test_engine_error_becomes_a_clean_422(client, admin_token, migrated_db):
    """A rematch-forced PairingError must surface as 422, not a 500."""
    h = auth(admin_token)
    ids = make_players(client, admin_token, "rm", 2, rating=1600)
    tid = make_tournament(client, admin_token, "rematch-cup", type_id="Swiss")
    _register(client, admin_token, tid, ids)
    r = _generate(client, admin_token, tid)
    assert r.status_code == 200, r.text

    with psycopg.connect(migrated_db) as db:
        rid = db.execute(
            "SELECT id FROM rounds WHERE tournament_id=%s AND round_number=1", (tid,)
        ).fetchone()[0]
        pids = [row[0] for row in db.execute(
            "SELECT id FROM pairings WHERE round_id=%s", (rid,)).fetchall()]
    for pid in pids:
        client.post(f"/api/pairings/{pid}/result", headers=h, json={"result": "1-0"})
    client.post(f"/api/tournaments/{tid}/rounds/{rid}/close", headers=h)

    # round 2 with only two players who already met -> unavoidable rematch
    r = _generate(client, admin_token, tid)
    assert r.status_code == 422, r.text


def test_odd_swiss_field_stores_a_scored_bye(client, admin_token, migrated_db):
    ids = make_players(client, admin_token, "bye", 3, rating=1700)
    tid = make_tournament(client, admin_token, "bye-cup", type_id="Swiss")
    _register(client, admin_token, tid, ids)
    r = _generate(client, admin_token, tid)
    assert r.status_code == 200, r.text
    byes = [p for p in r.json()["pairings"] if p["player2_id"] is None]
    assert len(byes) == 1
    bye_id = byes[0]["player1_id"]
    with psycopg.connect(migrated_db) as db:
        pts = db.execute(
            """SELECT points FROM tournament_participants
               WHERE tournament_id=%s AND player_id=%s""", (tid, bye_id),
        ).fetchone()[0]
    assert float(pts) == 1.0  # a bye is worth a full point


def _results_and_close(client, token, tid, migrated_db, winner="player1"):
    """Set every board of the open round (white wins) and close it."""
    h = auth(token)
    with psycopg.connect(migrated_db) as db:
        rid, is_closed = db.execute(
            """SELECT id, is_closed FROM rounds WHERE tournament_id=%s
               ORDER BY round_number DESC LIMIT 1""", (tid,)).fetchone()
        rows = db.execute(
            """SELECT id, black_player_id FROM pairings WHERE round_id=%s""",
            (rid,)).fetchall()
    for pid, black in rows:
        if black is None:
            continue  # bye already scored
        client.post(f"/api/pairings/{pid}/result", headers=h, json={"result": "1-0"})
    client.post(f"/api/tournaments/{tid}/rounds/{rid}/close", headers=h)
    return rid


def test_olympic_full_bracket_shrinks_each_round(client, admin_token, migrated_db):
    """4 players -> round 1 has 2 boards, round 2 (the final) has 1."""
    ids = make_players(client, admin_token, "olyf", 4, rating=2000)
    tid = make_tournament(client, admin_token, "olyf-cup", type_id="Olympic")
    _register(client, admin_token, tid, ids)

    r1 = _generate(client, admin_token, tid)
    assert len(_pair_set(r1.json()["pairings"])) == 2
    _results_and_close(client, admin_token, tid, migrated_db)

    r2 = _generate(client, admin_token, tid)
    assert r2.status_code == 200, r2.text
    pairs = _pair_set(r2.json()["pairings"])
    # only the two board-winners (olyf-1 and olyf-2, the top seeds who won as
    # white) remain, meeting in the final
    assert pairs == {frozenset(("olyf-1", "olyf-2"))}


def test_round_robin_full_schedule_has_no_rematch_over_http(
        client, admin_token, migrated_db):
    ids = make_players(client, admin_token, "rrf", 4, rating=2000)
    tid = make_tournament(client, admin_token, "rrf-cup", type_id="Round-robin")
    _register(client, admin_token, tid, ids)

    met = set()
    for _ in range(3):  # a 4-player round-robin is 3 rounds
        r = _generate(client, admin_token, tid)
        assert r.status_code == 200, r.text
        for key in _pair_set(r.json()["pairings"]):
            assert key not in met, f"rematch {key}"
            met.add(key)
        _results_and_close(client, admin_token, tid, migrated_db)
    assert len(met) == 6  # C(4,2) = every pair met exactly once
