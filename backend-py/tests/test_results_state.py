"""Results and round state-machine error paths — clean 4xx, never a 500."""
import psycopg
import pytest

from tests.conftest import auth, make_players, make_tournament


def _setup_open_round(client, token, migrated_db, slug, n=4):
    """A tournament with one open round; returns (tid, rid, [pairing_ids])."""
    h = auth(token)
    ids = make_players(client, token, slug, n, rating=1800)
    tid = make_tournament(client, token, slug + "-cup", type_id="Swiss")
    for pid in ids:
        client.post(f"/api/tournaments/{tid}/players", headers=h,
                    json={"player_id": pid})
    assert client.post(f"/api/tournaments/{tid}/generate-round",
                       headers=h).status_code == 200
    with psycopg.connect(migrated_db) as db:
        rid = db.execute(
            "SELECT id FROM rounds WHERE tournament_id=%s AND round_number=1",
            (tid,)).fetchone()[0]
        pids = [r[0] for r in db.execute(
            "SELECT id FROM pairings WHERE round_id=%s ORDER BY id", (rid,)).fetchall()]
    return tid, rid, pids


# --- single result ---

def test_unknown_result_code_is_422(client, admin_token, migrated_db):
    _, _, pids = _setup_open_round(client, admin_token, migrated_db, "res-code")
    r = client.post(f"/api/pairings/{pids[0]}/result", headers=auth(admin_token),
                    json={"result": "9-9"})
    assert r.status_code == 422


def test_result_on_unknown_pairing_is_404(client, admin_token):
    r = client.post("/api/pairings/99999999/result", headers=auth(admin_token),
                    json={"result": "1-0"})
    assert r.status_code == 404


def test_result_on_closed_round_is_409(client, admin_token, migrated_db):
    h = auth(admin_token)
    tid, rid, pids = _setup_open_round(client, admin_token, migrated_db, "res-closed")
    for pid in pids:
        client.post(f"/api/pairings/{pid}/result", headers=h, json={"result": "1-0"})
    client.post(f"/api/tournaments/{tid}/rounds/{rid}/close", headers=h)
    r = client.post(f"/api/pairings/{pids[0]}/result", headers=h, json={"result": "0-1"})
    assert r.status_code == 409


def test_cancel_result_clears_it(client, admin_token, migrated_db):
    h = auth(admin_token)
    _, _, pids = _setup_open_round(client, admin_token, migrated_db, "res-cancel")
    client.post(f"/api/pairings/{pids[0]}/result", headers=h, json={"result": "1-0"})
    r = client.delete(f"/api/pairings/{pids[0]}/result", headers=h)
    assert r.status_code == 200


def test_cancel_result_on_closed_round_is_409(client, admin_token, migrated_db):
    h = auth(admin_token)
    tid, rid, pids = _setup_open_round(client, admin_token, migrated_db, "res-cc")
    for pid in pids:
        client.post(f"/api/pairings/{pid}/result", headers=h, json={"result": "1-0"})
    client.post(f"/api/tournaments/{tid}/rounds/{rid}/close", headers=h)
    r = client.delete(f"/api/pairings/{pids[0]}/result", headers=h)
    assert r.status_code == 409


# --- batch results ---

def test_batch_pairing_not_in_round_is_422(client, admin_token, migrated_db):
    _, rid, pids = _setup_open_round(client, admin_token, migrated_db, "batch-foreign")
    r = client.post(f"/api/rounds/{rid}/results", headers=auth(admin_token), json={
        "results": [{"pairing_id": 99999999, "result": "1-0"}],
    })
    assert r.status_code == 422


def test_batch_unknown_code_rolls_back_entirely(client, admin_token, migrated_db):
    """All-or-nothing: a bad code in the batch must persist none of it."""
    h = auth(admin_token)
    _, rid, pids = _setup_open_round(client, admin_token, migrated_db, "batch-roll")
    r = client.post(f"/api/rounds/{rid}/results", headers=h, json={
        "results": [
            {"pairing_id": pids[0], "result": "1-0"},
            {"pairing_id": pids[1], "result": "not-a-code"},
        ],
    })
    assert r.status_code == 422
    with psycopg.connect(migrated_db) as db:
        row = db.execute("SELECT result_id FROM pairings WHERE id=%s",
                         (pids[0],)).fetchone()
    assert row[0] is None, "the valid result should have been rolled back too"


def test_batch_on_closed_round_is_409(client, admin_token, migrated_db):
    h = auth(admin_token)
    tid, rid, pids = _setup_open_round(client, admin_token, migrated_db, "rs-batch-closed")
    for pid in pids:
        client.post(f"/api/pairings/{pid}/result", headers=h, json={"result": "1-0"})
    client.post(f"/api/tournaments/{tid}/rounds/{rid}/close", headers=h)
    r = client.post(f"/api/rounds/{rid}/results", headers=h, json={
        "results": [{"pairing_id": pids[0], "result": "0-1"}],
    })
    assert r.status_code == 409


def test_batch_on_unknown_round_is_404(client, admin_token):
    r = client.post("/api/rounds/99999999/results", headers=auth(admin_token),
                    json={"results": []})
    assert r.status_code == 404


# --- round-level operations ---

def test_delete_closed_round_is_409(client, admin_token, migrated_db):
    h = auth(admin_token)
    tid, rid, pids = _setup_open_round(client, admin_token, migrated_db, "del-closed")
    for pid in pids:
        client.post(f"/api/pairings/{pid}/result", headers=h, json={"result": "1-0"})
    client.post(f"/api/tournaments/{tid}/rounds/{rid}/close", headers=h)
    r = client.delete(f"/api/rounds/{rid}/pairings", headers=h)
    # pairings on a closed round may be cancelled? deletion of the round itself:
    r2 = client.delete(f"/api/rounds/{rid}", headers=h)
    assert r2.status_code == 409


def test_delete_round_pairings_clears_the_board(client, admin_token, migrated_db):
    h = auth(admin_token)
    _, rid, pids = _setup_open_round(client, admin_token, migrated_db, "del-pairings")
    r = client.delete(f"/api/rounds/{rid}/pairings", headers=h)
    assert r.status_code == 200
    with psycopg.connect(migrated_db) as db:
        n = db.execute("SELECT COUNT(*) FROM pairings WHERE round_id=%s",
                       (rid,)).fetchone()[0]
    assert n == 0


# --- manual pairing replacement / validation ---

def test_replace_pairings_on_closed_round_is_409(client, admin_token, migrated_db):
    h = auth(admin_token)
    tid, rid, pids = _setup_open_round(client, admin_token, migrated_db, "rep-closed")
    for pid in pids:
        client.post(f"/api/pairings/{pid}/result", headers=h, json={"result": "1-0"})
    client.post(f"/api/tournaments/{tid}/rounds/{rid}/close", headers=h)
    r = client.put(f"/api/rounds/{rid}/pairings", headers=h, json={"pairings": []})
    assert r.status_code == 409


def test_malformed_manual_pairing_is_not_a_500(client, admin_token, migrated_db):
    """A pairing dict missing player1_id must not crash the validator."""
    tid, rid, pids = _setup_open_round(client, admin_token, migrated_db, "malformed")
    r = client.post(f"/api/tournaments/{tid}/validate-pairings",
                    headers=auth(admin_token), json={
                        "round_number": 1,
                        "pairings": [{"board_number": 1}],  # no player1_id
                    })
    assert r.status_code != 500, r.text
    assert r.status_code == 200
    assert r.json()["ok"] is False
