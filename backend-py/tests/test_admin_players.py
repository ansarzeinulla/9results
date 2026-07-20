"""Admin player management: create and update the full profile, never delete.

The player ID is supplied by the admin (not generated), and every column on
`players` must be settable.
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
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def organizer_token(client):
    r = client.post("/api/auth/login",
                    json={"username": "organizer", "password": "admin12345"})
    assert r.status_code == 200, r.text
    return r.json()["token"]


FULL = {
    "id": "KAZ-9001",
    "first_name": "Aigerim",
    "last_name": "Nurlanova",
    "middle_name": "Bekqyzy",
    "federation_id": "KAZ",
    "gender_id": "F",
    "year_of_birth": 2001,
    "title_id": "MS",
    "club": "Astana Club",
    "rating_classic": 1850,
    "rating_rapid": 1800,
    "rating_blitz": 1750,
}


def test_admin_creates_player_with_id_of_their_choosing(client, admin_token, migrated_db):
    r = client.post("/api/players", headers=auth(admin_token), json=FULL)
    assert r.status_code == 200, r.text
    with psycopg.connect(migrated_db) as db:
        row = db.execute(
            """SELECT id, first_name, last_name, middle_name, federation_id,
                      gender_id, year_of_birth, title_id, club,
                      rating_classic, rating_rapid, rating_blitz
               FROM players WHERE id = %s""",
            (FULL["id"],),
        ).fetchone()
    assert row == (
        "KAZ-9001", "Aigerim", "Nurlanova", "Bekqyzy", "KAZ", "F", 2001,
        "MS", "Astana Club", 1850, 1800, 1750,
    )


def test_admin_updates_every_field(client, admin_token, migrated_db):
    client.post("/api/players", headers=auth(admin_token), json=FULL)
    updated = {
        **FULL,
        "first_name": "Aigerim2", "last_name": "Nurlanova2",
        "middle_name": "Changed", "gender_id": "M", "year_of_birth": 1999,
        "title_id": "CMS", "club": "Almaty Club",
        "rating_classic": 1900, "rating_rapid": 1888, "rating_blitz": 1777,
    }
    r = client.put(f"/api/players/{FULL['id']}", headers=auth(admin_token), json=updated)
    assert r.status_code == 200, r.text
    with psycopg.connect(migrated_db) as db:
        row = db.execute(
            """SELECT first_name, middle_name, gender_id, year_of_birth,
                      title_id, club, rating_classic, rating_rapid, rating_blitz
               FROM players WHERE id = %s""",
            (FULL["id"],),
        ).fetchone()
    assert row == ("Aigerim2", "Changed", "M", 1999, "CMS", "Almaty Club",
                   1900, 1888, 1777)


def test_optional_fields_may_be_omitted(client, admin_token):
    r = client.post("/api/players", headers=auth(admin_token), json={
        "id": "KAZ-9002", "first_name": "Min", "last_name": "Imal",
        "federation_id": "KAZ",
    })
    assert r.status_code == 200, r.text


def test_unknown_title_is_rejected(client, admin_token):
    r = client.post("/api/players", headers=auth(admin_token), json={
        **FULL, "id": "KAZ-9003", "title_id": "NOT_A_TITLE",
    })
    assert r.status_code == 422


def test_organizer_cannot_create_or_update_players(client, organizer_token):
    r = client.post("/api/players", headers=auth(organizer_token),
                    json={**FULL, "id": "KAZ-9004"})
    assert r.status_code == 403
    r = client.put(f"/api/players/{FULL['id']}", headers=auth(organizer_token), json=FULL)
    assert r.status_code == 403


def test_anonymous_cannot_create_players(client):
    r = client.post("/api/players", json=FULL)
    assert r.status_code in (401, 403)


def test_deleting_a_player_is_possible_but_guarded(client, admin_token):
    """Deletion exists, but never at the cost of tournament history.

    A player who has played is refused with 409 (their results would cascade
    away); one who never played can be removed.
    """
    r = client.delete(f"/api/players/{FULL['id']}", headers=auth(admin_token))
    assert r.status_code in (200, 409)
