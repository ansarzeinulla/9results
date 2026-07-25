"""Finalizing a tournament: edge cases must behave, never 500."""
import psycopg

from tests.conftest import auth, make_players, make_tournament


def _played_tournament(client, token, migrated_db, slug, close=True):
    """4 players, one round played; optionally closed. Returns tid."""
    h = auth(token)
    ids = make_players(client, token, slug, 4, rating=1800)
    tid = make_tournament(client, token, slug + "-cup", type_id="Swiss")
    for pid in ids:
        client.post(f"/api/tournaments/{tid}/players", headers=h,
                    json={"player_id": pid})
    r = client.post(f"/api/tournaments/{tid}/generate-round", headers=h)
    with psycopg.connect(migrated_db) as db:
        rid = db.execute(
            "SELECT id FROM rounds WHERE tournament_id=%s AND round_number=1",
            (tid,)).fetchone()[0]
        pids = [row[0] for row in db.execute(
            "SELECT id FROM pairings WHERE round_id=%s", (rid,)).fetchall()]
    for pid in pids:
        client.post(f"/api/pairings/{pid}/result", headers=h, json={"result": "1-0"})
    if close:
        client.post(f"/api/tournaments/{tid}/rounds/{rid}/close", headers=h)
    return tid


def test_finalize_with_an_open_round_does_not_500(client, admin_token, migrated_db):
    """Finalizing before closing the round is allowed (uses results so far) and
    must return cleanly rather than crashing."""
    tid = _played_tournament(client, admin_token, migrated_db, "fin-open",
                             close=False)
    r = client.post(f"/api/tournaments/{tid}/finalize", headers=auth(admin_token))
    assert r.status_code == 200, r.text


def test_finalize_marks_completed_and_writes_history(client, admin_token,
                                                     migrated_db):
    tid = _played_tournament(client, admin_token, migrated_db, "fin-ok")
    r = client.post(f"/api/tournaments/{tid}/finalize", headers=auth(admin_token))
    assert r.status_code == 200, r.text
    with psycopg.connect(migrated_db) as db:
        status = db.execute("SELECT status FROM tournaments WHERE id=%s",
                            (tid,)).fetchone()[0]
        n_hist = db.execute(
            "SELECT COUNT(*) FROM rating_history WHERE tournament_id=%s",
            (tid,)).fetchone()[0]
    assert status == "COMPLETED"
    assert n_hist == 4


def test_finalizing_twice_is_rejected(client, admin_token, migrated_db):
    """Re-finalizing a completed tournament would duplicate rating history —
    it must be refused with a clean 409, not silently re-applied."""
    tid = _played_tournament(client, admin_token, migrated_db, "fin-twice")
    assert client.post(f"/api/tournaments/{tid}/finalize",
                       headers=auth(admin_token)).status_code == 200
    r = client.post(f"/api/tournaments/{tid}/finalize", headers=auth(admin_token))
    assert r.status_code == 409, r.text
    with psycopg.connect(migrated_db) as db:
        n_hist = db.execute(
            "SELECT COUNT(*) FROM rating_history WHERE tournament_id=%s",
            (tid,)).fetchone()[0]
    assert n_hist == 4, "history must not be duplicated by a second finalize"
