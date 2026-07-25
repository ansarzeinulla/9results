import os
import pathlib
import subprocess

import psycopg
import pytest

REPO_ROOT = pathlib.Path(__file__).resolve().parents[2]
DB_DIR = REPO_ROOT / "db"

TEST_DSN = os.environ.get(
    "TEST_DATABASE_URL", "postgresql://localhost:5432/results_togyz_test"
)
ADMIN_DSN = os.environ.get(
    "ADMIN_DATABASE_URL", "postgresql://localhost:5432/postgres"
)


def apply_sql_files(conn, paths):
    for path in paths:
        conn.execute(path.read_text())
    conn.commit()


@pytest.fixture(scope="session")
def migrated_db():
    """Drop and recreate the test database, apply all migrations + seeds."""
    dbname = psycopg.conninfo.conninfo_to_dict(TEST_DSN)["dbname"]
    with psycopg.connect(ADMIN_DSN, autocommit=True) as admin:
        admin.execute(f'DROP DATABASE IF EXISTS "{dbname}" WITH (FORCE)')
        admin.execute(f'CREATE DATABASE "{dbname}"')
    with psycopg.connect(TEST_DSN) as conn:
        # Fresh build: the consolidated build/ schema, then the seeds — the same
        # order db/README.md documents. (The old migrations/ chain now lives in
        # migrations/_legacy and is the same end state; do not run both.)
        schema = sorted((DB_DIR / "build").glob("*.sql"))
        seeds = sorted((DB_DIR / "seeds").glob("*.sql"))
        apply_sql_files(conn, schema + seeds)
    return TEST_DSN


@pytest.fixture()
def db(migrated_db):
    """A connection that rolls back everything after the test."""
    conn = psycopg.connect(migrated_db)
    yield conn
    conn.rollback()
    conn.close()


# --- shared HTTP fixtures -------------------------------------------------
# The client / auth / token fixtures below were previously copy-pasted into
# ~13 test files. They live here so new test modules can just request them.
# (Older files still define their own identical fixtures; pytest uses the
# closest-scoped one, so those keep working unchanged.)

from fastapi.testclient import TestClient  # noqa: E402


def auth(token):
    """Authorization header for a bearer token."""
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="session")
def client(migrated_db):
    os.environ["DATABASE_URL"] = migrated_db
    os.environ["JWT_SECRET"] = "test-secret-0123456789abcdef0123456789abcdef"
    from app.main import app
    with TestClient(app) as c:
        yield c


def _login(client, username, password):
    r = client.post("/api/auth/login",
                    json={"username": username, "password": password})
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def admin_token(client):
    return _login(client, "admin", "admin12345")


@pytest.fixture(scope="session")
def organizer_token(client):
    """The seeded organizer account."""
    return _login(client, "organizer", "admin12345")


@pytest.fixture(scope="session")
def org_b(client, admin_token):
    """A second organizer, used to prove owner-only boundaries (403)."""
    client.post("/api/officials", headers=auth(admin_token), json={
        "first_name": "Second", "last_name": "Organizer", "title": "NA",
        "username": "conftest-org-b", "password": "orgbpass123",
    })
    return _login(client, "conftest-org-b", "orgbpass123")


def make_players(client, token, prefix, n, rating=1700):
    """Create n players id'd `{prefix}-{i}`, descending rating. Returns ids."""
    ids = []
    for i in range(1, n + 1):
        pid = f"{prefix}-{i}"
        client.post("/api/players", headers=auth(token), json={
            "id": pid, "first_name": f"P{i}", "last_name": prefix,
            "federation_id": "KAZ", "rating_classic": rating - i,
        })
        ids.append(pid)
    return ids


def make_tournament(client, token, slug, type_id="Swiss", rounds=None,
                    start_date="2026-04-01", end_date="2026-04-05"):
    body = {
        "name": slug, "slug": slug,
        "location_id": "Astana", "rating_type_id": "Classic",
        "tournament_type_id": type_id, "start_date": start_date,
        "end_date": end_date,
    }
    if rounds is not None:
        body["rounds"] = rounds
    r = client.post("/api/tournaments", headers=auth(token), json=body)
    # Admins can no longer create tournaments; when a test uses the admin token
    # as a convenience super-user, create as the seeded organizer instead. The
    # admin still manages the tournament afterwards via its ownership bypass.
    if r.status_code == 403 and "ADMIN_CANNOT_CREATE" in r.text:
        org = _login(client, "organizer", "admin12345")
        r = client.post("/api/tournaments", headers=auth(org), json=body)
    assert r.status_code == 200, r.text
    return r.json()["id"]
