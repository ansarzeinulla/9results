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
    # Exactly 4 required (repeats allowed) — see TIE_BREAKS_MUST_BE_FOUR tests below.
    "tie_breaks": ["WinCount", "Buchholz", "Berger", "CumulativeScore"],
}


def test_end_date_before_start_date_is_rejected_cleanly(client, token):
    r = client.post("/api/tournaments", headers=auth(token), json={
        **BASE, "slug": "backwards-dates",
        "start_date": "2026-07-26", "end_date": "2026-07-18",
    })
    assert r.status_code == 422, f"expected a clean 422, got {r.status_code}"
    assert r.json()["detail"]["code"] == "INVALID_DATES"


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
    assert r.json()["detail"]["code"] == "INVALID_DATES"


# --- added coverage: more constraint paths ---

def test_too_many_rounds_is_422(client, token):
    r = client.post("/api/tournaments", headers=auth(token), json={
        **BASE, "slug": "too-many-rounds", "rounds": 51,
    })
    assert r.status_code == 422


def test_unknown_status_is_422(client, token):
    r = client.post("/api/tournaments", headers=auth(token), json={
        **BASE, "slug": "bad-status", "status": "NOT_A_STATUS",
    })
    assert r.status_code == 422


def test_unknown_tie_break_is_422(client, token):
    r = client.post("/api/tournaments", headers=auth(token), json={
        **BASE, "slug": "bad-tiebreak",
        "tie_breaks": ["Buchholz", "Berger", "WinCount", "NOPE"],
    })
    assert r.status_code == 422
    assert r.json()["detail"]["code"] == "UNKNOWN_TIE_BREAK"


def test_known_tie_breaks_are_accepted(client, token):
    r = client.post("/api/tournaments", headers=auth(token), json={
        **BASE, "slug": "good-tiebreaks",
        "tie_breaks": ["Buchholz", "Berger", "WinCount", "Buchholz"],
    })
    assert r.status_code == 200, r.text


def test_fewer_than_four_tie_breaks_is_422(client, token):
    r = client.post("/api/tournaments", headers=auth(token), json={
        **BASE, "slug": "too-few-tiebreaks",
        "tie_breaks": ["Buchholz", "Berger", "WinCount"],
    })
    assert r.status_code == 422
    assert r.json()["detail"]["code"] == "TIE_BREAKS_MUST_BE_FOUR"


def test_more_than_four_tie_breaks_is_422(client, token):
    r = client.post("/api/tournaments", headers=auth(token), json={
        **BASE, "slug": "too-many-tiebreaks",
        "tie_breaks": ["Buchholz", "Berger", "WinCount", "Points", "Buchholz"],
    })
    assert r.status_code == 422
    assert r.json()["detail"]["code"] == "TIE_BREAKS_MUST_BE_FOUR"


def test_missing_tie_breaks_is_422(client, token):
    body = {**BASE, "slug": "missing-tiebreaks"}
    del body["tie_breaks"]
    r = client.post("/api/tournaments", headers=auth(token), json=body)
    assert r.status_code == 422
    assert r.json()["detail"]["code"] == "TIE_BREAKS_MUST_BE_FOUR"


def test_blitz_playoff_no_longer_exists(client, token):
    r = client.post("/api/tournaments", headers=auth(token), json={
        **BASE, "slug": "blitz-playoff-gone",
        "tie_breaks": ["Buchholz", "Berger", "WinCount", "BlitzPlayoff"],
    })
    assert r.status_code == 422
    assert r.json()["detail"]["code"] == "UNKNOWN_TIE_BREAK"


def test_malformed_date_is_422(client, token):
    r = client.post("/api/tournaments", headers=auth(token), json={
        **BASE, "slug": "bad-date", "start_date": "not-a-date",
    })
    assert r.status_code == 422


def test_update_unknown_tournament_is_404(client, token):
    r = client.put("/api/tournaments/99999999", headers=auth(token),
                   json={**BASE, "slug": "ghost-tournament"})
    assert r.status_code == 404
