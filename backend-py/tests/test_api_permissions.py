"""Role separation and withdrawn-player behavior over HTTP."""
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
    return r.json()["token"]


@pytest.fixture(scope="session")
def organizer_token(client, admin_token):
    client.post("/api/officials", headers=auth(admin_token), json={
        "first_name": "Perm", "last_name": "Org", "title": "NA",
        "username": "permorg", "password": "permpass123",
    })
    r = client.post("/api/auth/login", json={"username": "permorg", "password": "permpass123"})
    assert r.status_code == 200
    return r.json()["token"]


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def test_organizer_cannot_create_officials(client, organizer_token):
    r = client.post("/api/officials", headers=auth(organizer_token), json={
        "first_name": "X", "last_name": "Y", "title": "NA",
        "username": "sneaky", "password": "sneakypass1",
    })
    assert r.status_code == 403


def test_organizer_can_manage_tournaments(client, organizer_token):
    r = client.post("/api/tournaments", headers=auth(organizer_token), json={
        "name": "Org Cup", "slug": "org-cup", "federation_id": "KAZ",
        "location_id": "Astana", "rating_type_id": "Classic",
        "tournament_type_id": "Swiss", "start_date": "2026-10-01",
        "end_date": "2026-10-03", "rounds": 3,
    })
    assert r.status_code == 200


def test_garbage_token_rejected(client):
    r = client.post("/api/tournaments", headers=auth("not-a-jwt"), json={})
    assert r.status_code == 401


def test_withdrawn_player_excluded_from_pairing(client, admin_token, migrated_db):
    h = auth(admin_token)
    for i in range(1, 6):
        client.post("/api/players", headers=h, json={
            "id": f"wd{i}", "first_name": f"W{i}", "last_name": "Draw",
            "federation_id": "KAZ", "rating_classic": 1700 - i * 10,
        })
    r = client.post("/api/tournaments", headers=h, json={
        "name": "Withdraw Cup", "slug": "withdraw-cup", "federation_id": "KAZ",
        "location_id": "Astana", "rating_type_id": "Classic",
        "tournament_type_id": "Swiss", "start_date": "2026-11-01",
        "end_date": "2026-11-02", "rounds": 3,
    })
    tid = r.json()["id"]
    for i in range(1, 6):
        client.post(f"/api/tournaments/{tid}/players", headers=h,
                    json={"player_id": f"wd{i}"})
    # withdraw one of the five -> four active players, no bye needed
    assert client.post(
        f"/api/tournaments/{tid}/withdraw/wd5", headers=h
    ).status_code == 200

    r = client.post(f"/api/tournaments/{tid}/generate-round", headers=h)
    assert r.status_code == 200, r.text
    pairings = r.json()["pairings"]
    seated = {p["player1_id"] for p in pairings} | {
        p["player2_id"] for p in pairings if p["player2_id"]
    }
    assert "wd5" not in seated
    assert seated == {"wd1", "wd2", "wd3", "wd4"}
    assert all(p["player2_id"] is not None for p in pairings), "no bye expected"
