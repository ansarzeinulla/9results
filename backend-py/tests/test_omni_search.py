"""Stage 4a: omni_search — a player plus the board they are playing right now."""
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
def tokens(client):
    a = client.post("/api/auth/login",
                    json={"username": "admin", "password": "admin12345"}).json()["token"]
    o = client.post("/api/auth/login",
                    json={"username": "organizer", "password": "admin12345"}).json()["token"]
    return a, o


@pytest.fixture(scope="session")
def live_tournament(client, tokens, migrated_db):
    """Four players, a live tournament, one open round with pairings."""
    admin, org = tokens
    ids = []
    for i in range(1, 5):
        pid = f"OMNI-{i}"
        client.post("/api/players", headers=auth(admin), json={
            "id": pid, "first_name": f"Омни{i}", "last_name": "Іздеуші",
            "federation_id": "KAZ", "rating_classic": 1800 - i * 10,
        })
        ids.append(pid)
    r = client.post("/api/tournaments", headers=auth(org), json={
        "name": "Omni Cup", "slug": "omni-cup", "federation_id": "KAZ",
        "location_id": "Astana", "rating_type_id": "Classic",
        "tournament_type_id": "Swiss", "start_date": "2026-05-01",
        "end_date": "2026-05-03", "rounds": 3, "status": "ONGOING",
    })
    tid = r.json()["id"]
    client.post(f"/api/tournaments/{tid}/players/bulk", headers=auth(org),
                json={"ids": ",".join(ids)})
    r = client.post(f"/api/tournaments/{tid}/generate-round", headers=auth(org))
    assert r.status_code == 200, r.text
    return {"tid": tid, "ids": ids, "round_id": r.json()["round_id"]}


def omni(db, q, limit=8):
    cols = ("id first_name last_name title_id rating_classic tournament_id "
            "tournament_name tournament_slug round_number board_number side "
            "opponent_first opponent_last result_id").split()
    rows = db.execute(
        "SELECT * FROM omni_search(%s, %s)", (q, limit)
    ).fetchall()
    return [dict(zip(cols, r)) for r in rows]


def test_player_in_live_round_returns_board_and_side(live_tournament, migrated_db):
    with psycopg.connect(migrated_db) as db:
        hits = omni(db, "Омни1")
    me = next(h for h in hits if h["id"] == "OMNI-1")
    assert me["tournament_slug"] == "omni-cup"
    assert me["round_number"] == 1
    assert me["board_number"] is not None
    assert me["side"] in (1, 2)
    assert me["opponent_last"] == "Іздеуші"


def test_omni_search_is_transliteration_aware(live_tournament, migrated_db):
    # players are registered in Cyrillic; a Latin query must find them
    with psycopg.connect(migrated_db) as db:
        hits = omni(db, "Izdeushi")
    assert any(h["id"].startswith("OMNI-") for h in hits)


def test_player_without_active_game_has_null_match(client, tokens, migrated_db):
    admin, _ = tokens
    client.post("/api/players", headers=auth(admin), json={
        "id": "OMNI-IDLE", "first_name": "Idle", "last_name": "Restwatcher",
        "federation_id": "KAZ",
    })
    with psycopg.connect(migrated_db) as db:
        hits = omni(db, "Restwatcher")
    me = next(h for h in hits if h["id"] == "OMNI-IDLE")
    assert me["tournament_id"] is None
    assert me["board_number"] is None


def test_closed_round_is_not_an_active_game(live_tournament, client, tokens, migrated_db):
    _, org = tokens
    tid, rid = live_tournament["tid"], live_tournament["round_id"]
    with psycopg.connect(migrated_db) as db:
        pids = [r[0] for r in db.execute(
            "SELECT id FROM pairings WHERE round_id=%s", (rid,)).fetchall()]
    client.post(f"/api/rounds/{rid}/results", headers=auth(org), json={
        "results": [{"pairing_id": p, "result": "1-0"} for p in pids]
    })
    client.post(f"/api/tournaments/{tid}/rounds/{rid}/close", headers=auth(org))
    with psycopg.connect(migrated_db) as db:
        hits = omni(db, "Омни1")
    me = next(h for h in hits if h["id"] == "OMNI-1")
    assert me["round_number"] is None, "a closed round is no longer 'now playing'"


def test_anon_can_call_omni_search(migrated_db):
    with psycopg.connect(migrated_db) as db:
        db.execute("SET ROLE anon")
        rows = db.execute("SELECT * FROM omni_search(%s, 8)", ("Омни",)).fetchall()
    assert isinstance(rows, list)


def test_limit_is_respected(client, tokens, migrated_db):
    admin, _ = tokens
    for i in range(12):
        client.post("/api/players", headers=auth(admin), json={
            "id": f"OMNI-MANY-{i}", "first_name": f"Many{i}", "last_name": "Crowdson",
            "federation_id": "KAZ",
        })
    with psycopg.connect(migrated_db) as db:
        hits = omni(db, "Crowdson", limit=5)
    assert len(hits) == 5
