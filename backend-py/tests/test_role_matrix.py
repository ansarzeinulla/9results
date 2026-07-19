"""Role matrix: every mutating endpoint checked against anonymous, organizer
and admin — asserting both what each role MAY and MAY NOT do.

Anonymous must never reach any mutating endpoint. Organizers run tournaments.
Only admins touch the global player registry and organizer accounts.
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
def admin_token(client):
    r = client.post("/api/auth/login", json={"username": "admin", "password": "admin12345"})
    return r.json()["token"]


@pytest.fixture(scope="session")
def organizer_token(client):
    r = client.post("/api/auth/login",
                    json={"username": "organizer", "password": "admin12345"})
    return r.json()["token"]


# (method, path) for every mutating endpoint in the API.
ADMIN_ONLY = [
    ("post", "/api/players"),
    ("put", "/api/players/some-id"),
    ("post", "/api/officials"),
]

ORGANIZER_ALLOWED = [
    ("post", "/api/tournaments"),
    ("put", "/api/tournaments/999999"),
    ("post", "/api/tournaments/999999/players"),
    ("delete", "/api/tournaments/999999/players/x"),
    ("post", "/api/tournaments/999999/players/sync-ranks"),
    ("post", "/api/tournaments/999999/withdraw/x"),
    ("post", "/api/tournaments/999999/generate-round"),
    ("post", "/api/tournaments/999999/validate-pairings"),
    ("put", "/api/rounds/999999/pairings"),
    ("delete", "/api/rounds/999999/pairings"),
    ("post", "/api/pairings/999999/result"),
    ("delete", "/api/pairings/999999/result"),
    ("post", "/api/tournaments/999999/rounds/999999/close"),
    ("post", "/api/tournaments/999999/finalize"),
]

ALL_ENDPOINTS = ADMIN_ONLY + ORGANIZER_ALLOWED


def call(client, method, path, headers=None):
    fn = getattr(client, method)
    if method == "delete":  # the test client's delete() takes no body
        return fn(path, headers=headers or {})
    return fn(path, headers=headers or {}, json={})


@pytest.mark.parametrize("method,path", ALL_ENDPOINTS)
def test_anonymous_is_rejected_everywhere(client, method, path):
    r = call(client, method, path)
    assert r.status_code in (401, 403), f"{method} {path} allowed anonymously"


@pytest.mark.parametrize("method,path", ALL_ENDPOINTS)
def test_garbage_token_is_rejected_everywhere(client, method, path):
    r = call(client, method, path, auth("not-a-jwt"))
    assert r.status_code == 401, f"{method} {path} accepted a bad token"


@pytest.mark.parametrize("method,path", ADMIN_ONLY)
def test_organizer_forbidden_on_admin_only(client, organizer_token, method, path):
    r = call(client, method, path, auth(organizer_token))
    assert r.status_code == 403, f"organizer reached admin-only {method} {path}"


@pytest.mark.parametrize("method,path", ADMIN_ONLY)
def test_admin_is_not_forbidden_on_admin_only(client, admin_token, method, path):
    r = call(client, method, path, auth(admin_token))
    # may fail validation (422) or not-found (404), but never authorization
    assert r.status_code not in (401, 403), f"admin blocked from {method} {path}"


@pytest.mark.parametrize("method,path", ORGANIZER_ALLOWED)
def test_organizer_is_not_forbidden_on_tournament_endpoints(
    client, organizer_token, method, path
):
    r = call(client, method, path, auth(organizer_token))
    assert r.status_code not in (401, 403), f"organizer blocked from {method} {path}"


@pytest.mark.parametrize("method,path", ORGANIZER_ALLOWED)
def test_admin_may_also_run_tournaments(client, admin_token, method, path):
    r = call(client, method, path, auth(admin_token))
    assert r.status_code not in (401, 403), f"admin blocked from {method} {path}"


def test_login_is_public(client):
    r = client.post("/api/auth/login",
                    json={"username": "admin", "password": "admin12345"})
    assert r.status_code == 200


def test_health_is_public(client):
    assert client.get("/api/health").status_code == 200
