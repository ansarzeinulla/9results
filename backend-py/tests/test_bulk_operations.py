"""Bulk operations: entering a whole round of results in one call, adding many
players by id at once, and deleting a player safely.
"""
import psycopg
import pytest
from fastapi.testclient import TestClient


@pytest.fixture(scope="session")
def client(migrated_db):
    import os
    os.environ["DATABASE_URL"] = migrated_db
    os.environ["JWT_SECRET"] = "test-secret-0123456789abcdef0123456789abcdef"
    from app.main import app
    with TestClient(app) as c:
        yield c


def auth(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="session")
def admin_token(client):
    r = client.post("/api/auth/login", json={"username": "admin", "password": "admin12345"})
    return r.json()["token"]


@pytest.fixture(scope="session")
def organizer_token(client):
    r = client.post("/api/auth/login",
                    json={"username": "organizer", "password": "admin12345"})
    return r.json()["token"]


def make_players(client, admin_token, prefix, n, rating=1700):
    ids = []
    for i in range(1, n + 1):
        pid = f"{prefix}-{i}"
        client.post("/api/players", headers=auth(admin_token), json={
            "id": pid, "first_name": f"P{i}", "last_name": prefix,
            "federation_id": "KAZ", "rating_classic": rating - i,
        })
        ids.append(pid)
    return ids


def make_tournament(client, token, slug, rounds=3):
    r = client.post("/api/tournaments", headers=auth(token), json={
        "name": slug, "slug": slug, "federation_id": "KAZ",
        "location_id": "Astana", "rating_type_id": "Classic",
        "tournament_type_id": "Swiss", "start_date": "2026-04-01",
        "end_date": "2026-04-05", "rounds": rounds,
    })
    assert r.status_code == 200, r.text
    return r.json()["id"]


# --- bulk add players ---

def test_bulk_add_accepts_a_comma_separated_list(client, admin_token, organizer_token, migrated_db):
    ids = make_players(client, admin_token, "BULKADD", 5)
    tid = make_tournament(client, organizer_token, "bulk-add-cup")

    r = client.post(f"/api/tournaments/{tid}/players/bulk",
                    headers=auth(organizer_token), json={"ids": ",".join(ids)})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["added"] == 5
    assert body["failed"] == 0

    with psycopg.connect(migrated_db) as db:
        n = db.execute(
            "SELECT COUNT(*) FROM tournament_participants WHERE tournament_id=%s",
            (tid,),
        ).fetchone()[0]
    assert n == 5


def test_bulk_add_continues_past_unknown_and_duplicate_ids(
    client, admin_token, organizer_token, migrated_db
):
    ids = make_players(client, admin_token, "BULKMIX", 3)
    tid = make_tournament(client, organizer_token, "bulk-mix-cup")

    # one already registered, one unknown, plus the rest
    client.post(f"/api/tournaments/{tid}/players", headers=auth(organizer_token),
                json={"player_id": ids[0]})
    payload = f"{ids[0]}, GHOST-1, {ids[1]},{ids[2]} ,, "
    r = client.post(f"/api/tournaments/{tid}/players/bulk",
                    headers=auth(organizer_token), json={"ids": payload})
    assert r.status_code == 200, r.text
    body = r.json()

    assert body["added"] == 2, body            # ids[1], ids[2]
    assert body["failed"] == 2, body           # duplicate + unknown
    reasons = {r["id"]: r["reason"] for r in body["errors"]}
    assert "GHOST-1" in reasons and "not found" in reasons["GHOST-1"].lower()
    assert ids[0] in reasons

    with psycopg.connect(migrated_db) as db:
        n = db.execute(
            "SELECT COUNT(*) FROM tournament_participants WHERE tournament_id=%s",
            (tid,),
        ).fetchone()[0]
    assert n == 3, "the good ids must still be added"


def test_bulk_add_supports_newlines_and_spaces(client, admin_token, organizer_token):
    ids = make_players(client, admin_token, "BULKNL", 3)
    tid = make_tournament(client, organizer_token, "bulk-nl-cup")
    r = client.post(f"/api/tournaments/{tid}/players/bulk",
                    headers=auth(organizer_token),
                    json={"ids": f"{ids[0]}\n {ids[1]} \n{ids[2]}"})
    assert r.status_code == 200
    assert r.json()["added"] == 3


def test_bulk_add_assigns_starting_ranks_once(client, admin_token, organizer_token, migrated_db):
    ids = make_players(client, admin_token, "BULKRANK", 6, rating=2000)
    tid = make_tournament(client, organizer_token, "bulk-rank-cup")
    client.post(f"/api/tournaments/{tid}/players/bulk",
                headers=auth(organizer_token), json={"ids": ",".join(ids)})
    with psycopg.connect(migrated_db) as db:
        ranks = db.execute(
            """SELECT starting_rank FROM tournament_participants
               WHERE tournament_id=%s ORDER BY starting_rank""", (tid,)
        ).fetchall()
    assert [r[0] for r in ranks] == [1, 2, 3, 4, 5, 6], "ranks must be gapless"


# --- batch results ---

def test_a_whole_round_of_results_is_saved_in_one_call(
    client, admin_token, organizer_token, migrated_db
):
    ids = make_players(client, admin_token, "BATCH", 6)
    tid = make_tournament(client, organizer_token, "batch-cup")
    client.post(f"/api/tournaments/{tid}/players/bulk",
                headers=auth(organizer_token), json={"ids": ",".join(ids)})
    r = client.post(f"/api/tournaments/{tid}/generate-round", headers=auth(organizer_token))
    rid = r.json()["round_id"]

    with psycopg.connect(migrated_db) as db:
        pairing_ids = [
            row[0] for row in db.execute(
                "SELECT id FROM pairings WHERE round_id=%s ORDER BY board_number", (rid,)
            ).fetchall()
        ]

    results = [
        {"pairing_id": pairing_ids[0], "result": "1-0"},
        {"pairing_id": pairing_ids[1], "result": "0.5-0.5"},
        {"pairing_id": pairing_ids[2], "result": "0-1"},
    ]
    r = client.post(f"/api/rounds/{rid}/results", headers=auth(organizer_token),
                    json={"results": results})
    assert r.status_code == 200, r.text
    assert r.json()["saved"] == 3

    with psycopg.connect(migrated_db) as db:
        stored = db.execute(
            "SELECT result_id FROM pairings WHERE round_id=%s ORDER BY board_number",
            (rid,),
        ).fetchall()
        pts = db.execute(
            "SELECT SUM(points) FROM tournament_participants WHERE tournament_id=%s",
            (tid,),
        ).fetchone()[0]
    assert [s[0] for s in stored] == ["1-0", "0.5-0.5", "0-1"]
    assert float(pts) == 3.0, "standings must be recalculated after the batch"


def test_batch_results_reject_a_closed_round(client, admin_token, organizer_token, migrated_db):
    ids = make_players(client, admin_token, "BATCHCLOSED", 4)
    tid = make_tournament(client, organizer_token, "batch-closed-cup")
    client.post(f"/api/tournaments/{tid}/players/bulk",
                headers=auth(organizer_token), json={"ids": ",".join(ids)})
    r = client.post(f"/api/tournaments/{tid}/generate-round", headers=auth(organizer_token))
    rid = r.json()["round_id"]
    with psycopg.connect(migrated_db) as db:
        pairing_ids = [
            row[0] for row in db.execute(
                "SELECT id FROM pairings WHERE round_id=%s", (rid,)
            ).fetchall()
        ]
    client.post(f"/api/rounds/{rid}/results", headers=auth(organizer_token), json={
        "results": [{"pairing_id": p, "result": "1-0"} for p in pairing_ids]
    })
    client.post(f"/api/tournaments/{tid}/rounds/{rid}/close", headers=auth(organizer_token))

    r = client.post(f"/api/rounds/{rid}/results", headers=auth(organizer_token), json={
        "results": [{"pairing_id": pairing_ids[0], "result": "0-1"}]
    })
    assert r.status_code == 409


def test_batch_rejects_an_invalid_result_code_without_saving_the_rest(
    client, admin_token, organizer_token, migrated_db
):
    ids = make_players(client, admin_token, "BATCHBAD", 4)
    tid = make_tournament(client, organizer_token, "batch-bad-cup")
    client.post(f"/api/tournaments/{tid}/players/bulk",
                headers=auth(organizer_token), json={"ids": ",".join(ids)})
    r = client.post(f"/api/tournaments/{tid}/generate-round", headers=auth(organizer_token))
    rid = r.json()["round_id"]
    with psycopg.connect(migrated_db) as db:
        pairing_ids = [
            row[0] for row in db.execute(
                "SELECT id FROM pairings WHERE round_id=%s ORDER BY board_number", (rid,)
            ).fetchall()
        ]
    r = client.post(f"/api/rounds/{rid}/results", headers=auth(organizer_token), json={
        "results": [
            {"pairing_id": pairing_ids[0], "result": "1-0"},
            {"pairing_id": pairing_ids[1], "result": "NOT-A-RESULT"},
        ]
    })
    assert r.status_code == 422
    with psycopg.connect(migrated_db) as db:
        stored = db.execute(
            "SELECT result_id FROM pairings WHERE id=%s", (pairing_ids[0],)
        ).fetchone()[0]
    assert stored is None, "a bad batch must not partially apply"


# --- deleting a player ---

def test_admin_deletes_a_player_who_never_played(client, admin_token, migrated_db):
    client.post("/api/players", headers=auth(admin_token), json={
        "id": "DELME-1", "first_name": "Delete", "last_name": "Me",
        "federation_id": "KAZ",
    })
    r = client.delete("/api/players/DELME-1", headers=auth(admin_token))
    assert r.status_code == 200, r.text
    with psycopg.connect(migrated_db) as db:
        assert db.execute(
            "SELECT COUNT(*) FROM players WHERE id='DELME-1'"
        ).fetchone()[0] == 0


def test_deleting_a_player_with_history_is_refused(
    client, admin_token, organizer_token, migrated_db
):
    ids = make_players(client, admin_token, "HIST", 4)
    tid = make_tournament(client, organizer_token, "history-cup")
    client.post(f"/api/tournaments/{tid}/players/bulk",
                headers=auth(organizer_token), json={"ids": ",".join(ids)})

    r = client.delete(f"/api/players/{ids[0]}", headers=auth(admin_token))
    assert r.status_code == 409, "must not silently cascade away tournament history"
    with psycopg.connect(migrated_db) as db:
        assert db.execute(
            "SELECT COUNT(*) FROM players WHERE id=%s", (ids[0],)
        ).fetchone()[0] == 1


def test_organizer_cannot_delete_a_player(client, organizer_token):
    r = client.delete("/api/players/anything", headers=auth(organizer_token))
    assert r.status_code == 403


def test_deleting_an_unknown_player_is_404(client, admin_token):
    r = client.delete("/api/players/NO-SUCH-PLAYER", headers=auth(admin_token))
    assert r.status_code == 404
