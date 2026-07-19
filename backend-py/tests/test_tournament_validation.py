"""Invalid tournament input must produce a clean 4xx, never a 500.

Constraint violations from Postgres (bad dates, unknown lookups, duplicate
slug) reach the client as actionable messages instead of a stack trace.
"""
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
def token(client):
    r = client.post("/api/auth/login",
                    json={"username": "organizer", "password": "admin12345"})
    return r.json()["token"]


BASE = {
    "name": "Validation Cup",
    "slug": "validation-cup",
    "federation_id": "KAZ",
    "location_id": "Online",
    "rating_type_id": "Classic",
    "tournament_type_id": "Swiss",
    "start_date": "2026-07-18",
    "end_date": "2026-07-26",
    "rounds": 7,
}


def test_end_date_before_start_date_is_rejected_cleanly(client, token):
    r = client.post("/api/tournaments", headers=auth(token), json={
        **BASE, "slug": "backwards-dates",
        "start_date": "2026-07-26", "end_date": "2026-07-18",
    })
    assert r.status_code == 422, f"expected a clean 422, got {r.status_code}"
    assert "date" in r.json()["detail"].lower()


def test_equal_start_and_end_dates_are_allowed(client, token):
    r = client.post("/api/tournaments", headers=auth(token), json={
        **BASE, "slug": "single-day",
        "start_date": "2026-07-18", "end_date": "2026-07-18",
    })
    assert r.status_code == 200, r.text


def test_duplicate_slug_is_a_conflict(client, token):
    first = client.post("/api/tournaments", headers=auth(token),
                        json={**BASE, "slug": "dupe-slug"})
    assert first.status_code == 200, first.text
    second = client.post("/api/tournaments", headers=auth(token),
                         json={**BASE, "slug": "dupe-slug"})
    assert second.status_code == 409


def test_unknown_location_is_rejected_cleanly(client, token):
    r = client.post("/api/tournaments", headers=auth(token), json={
        **BASE, "slug": "bad-location", "location_id": "Atlantis",
    })
    assert r.status_code == 422


def test_zero_rounds_is_rejected_cleanly(client, token):
    r = client.post("/api/tournaments", headers=auth(token), json={
        **BASE, "slug": "zero-rounds", "rounds": 0,
    })
    assert r.status_code == 422


def test_update_with_backwards_dates_is_rejected_cleanly(client, token):
    created = client.post("/api/tournaments", headers=auth(token),
                          json={**BASE, "slug": "update-dates"})
    tid = created.json()["id"]
    r = client.put(f"/api/tournaments/{tid}", headers=auth(token), json={
        **BASE, "slug": "update-dates",
        "start_date": "2026-08-10", "end_date": "2026-08-01",
    })
    assert r.status_code == 422
    assert "date" in r.json()["detail"].lower()
