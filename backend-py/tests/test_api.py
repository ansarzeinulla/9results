"""API tests: full organizer lifecycle over HTTP against the migrated test DB."""
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


@pytest.fixture(scope="session")
def admin_token(client):
    r = client.post("/api/auth/login", json={"username": "admin", "password": "admin12345"})
    assert r.status_code == 200, r.text
    return r.json()["token"]


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def test_login_rejects_bad_password(client):
    r = client.post("/api/auth/login", json={"username": "admin", "password": "wrong"})
    assert r.status_code == 401


def test_login_returns_role(client, admin_token):
    r = client.post("/api/auth/login", json={"username": "admin", "password": "admin12345"})
    assert r.json()["user"]["role"] == "ADMIN"


def test_protected_route_requires_token(client):
    r = client.post("/api/tournaments", json={})
    assert r.status_code in (401, 403)


def test_even_round_tournament_rejected(client, admin_token):
    r = client.post("/api/tournaments", headers=auth(admin_token), json={
        "name": "Even Cup", "slug": "even-cup", "federation_id": "KAZ",
        "location_id": "Astana", "rating_type_id": "Classic",
        "tournament_type_id": "Swiss", "start_date": "2026-12-01",
        "end_date": "2026-12-05", "rounds": 6,
    })
    assert r.status_code == 422
    assert "odd" in r.json()["detail"].lower()


def test_admin_can_create_organizer_and_login(client, admin_token):
    r = client.post("/api/officials", headers=auth(admin_token), json={
        "first_name": "Org", "last_name": "One", "title": "NA",
        "username": "org1", "password": "orgpass123",
    })
    assert r.status_code == 200, r.text
    r = client.post("/api/auth/login", json={"username": "org1", "password": "orgpass123"})
    assert r.status_code == 200
    assert r.json()["user"]["role"] == "ORGANIZER"


def test_admin_upsert_player(client, admin_token):
    r = client.post("/api/players", headers=auth(admin_token), json={
        "id": "api-p1", "first_name": "Api", "last_name": "Player",
        "federation_id": "KAZ", "rating_classic": 1500,
    })
    assert r.status_code == 200, r.text


def test_full_tournament_lifecycle(client, admin_token, migrated_db):
    h = auth(admin_token)
    for i in range(1, 5):
        assert client.post("/api/players", headers=h, json={
            "id": f"lc{i}", "first_name": f"L{i}", "last_name": "Cycle",
            "federation_id": "KAZ", "rating_classic": 1900 - i * 50,
        }).status_code == 200

    r = client.post("/api/tournaments", headers=h, json={
        "name": "Lifecycle Cup", "slug": "lifecycle-cup",
        "federation_id": "KAZ", "location_id": "Astana",
        "rating_type_id": "Classic", "tournament_type_id": "Swiss",
        "start_date": "2026-08-01", "end_date": "2026-08-05", "rounds": 3,
    })
    assert r.status_code == 200, r.text
    tid = r.json()["id"]

    for i in range(1, 5):
        assert client.post(
            f"/api/tournaments/{tid}/players", headers=h, json={"player_id": f"lc{i}"}
        ).status_code == 200, f"add lc{i}"

    # generate round 1: fold — lc1:lc3, lc2:lc4
    r = client.post(f"/api/tournaments/{tid}/generate-round", headers=h)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["round_number"] == 1
    boards = {frozenset((m["player1_id"], m["player2_id"])) for m in body["pairings"]}
    assert boards == {frozenset(("lc1", "lc3")), frozenset(("lc2", "lc4"))}

    with psycopg.connect(migrated_db) as db:
        rid = db.execute(
            "SELECT id FROM rounds WHERE tournament_id=%s AND round_number=1", (tid,)
        ).fetchone()[0]
        pids = {
            (w, b): pid for pid, w, b in db.execute(
                "SELECT id, white_player_id, black_player_id FROM pairings WHERE round_id=%s",
                (rid,),
            ).fetchall()
        }

    for (w, b), pid in pids.items():
        assert client.post(
            f"/api/pairings/{pid}/result", headers=h, json={"result": "1-0"}
        ).status_code == 200

    r = client.post(f"/api/tournaments/{tid}/rounds/{rid}/close", headers=h)
    assert r.status_code == 200

    # closed round rejects result changes
    any_pid = next(iter(pids.values()))
    r = client.post(f"/api/pairings/{any_pid}/result", headers=h, json={"result": "0-1"})
    assert r.status_code == 409

    # finalize applies Elo
    r = client.post(f"/api/tournaments/{tid}/finalize", headers=h)
    assert r.status_code == 200
    with psycopg.connect(migrated_db) as db:
        status = db.execute(
            "SELECT status FROM tournaments WHERE id=%s", (tid,)
        ).fetchone()[0]
        assert status == "FINISHED"
        n_hist = db.execute(
            "SELECT COUNT(*) FROM rating_history WHERE tournament_id=%s", (tid,)
        ).fetchone()[0]
        assert n_hist == 4


def test_validate_pairings_endpoint(client, admin_token):
    h = auth(admin_token)
    for i in range(1, 3):
        client.post("/api/players", headers=h, json={
            "id": f"vp{i}", "first_name": f"V{i}", "last_name": "Val",
            "federation_id": "KAZ", "rating_classic": 1500,
        })
    r = client.post("/api/tournaments", headers=h, json={
        "name": "Val Cup", "slug": "val-cup", "federation_id": "KAZ",
        "location_id": "Astana", "rating_type_id": "Classic",
        "tournament_type_id": "Swiss", "start_date": "2026-09-01",
        "end_date": "2026-09-02", "rounds": 3,
    })
    tid = r.json()["id"]
    for i in range(1, 3):
        client.post(f"/api/tournaments/{tid}/players", headers=h,
                    json={"player_id": f"vp{i}"})
    r = client.post(f"/api/tournaments/{tid}/validate-pairings", headers=h, json={
        "round_number": 1,
        "pairings": [{"player1_id": "vp1", "player2_id": "vp1", "board_number": 1}],
    })
    assert r.status_code == 200
    body = r.json()
    assert body["ok"] is False
    assert any(e["code"] == "DUPLICATE_PLAYER" for e in body["errors"])
