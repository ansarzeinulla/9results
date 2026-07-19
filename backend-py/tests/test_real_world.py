"""Real-world scenarios: non-Latin names and slugs, lookup by ID, scale,
duplicate registrations, withdrawals and byes.
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


# --- looking a player up by id alone (the admin edit flow) ---

def test_admin_fetches_a_single_player_by_id(client, admin_token):
    client.post("/api/players", headers=auth(admin_token), json={
        "id": "KAZ-77001", "first_name": "Aigerim", "last_name": "Nurlanova",
        "federation_id": "KAZ", "title_id": "MS", "year_of_birth": 2001,
        "club": "Astana", "rating_classic": 1850, "rating_rapid": 1800,
        "rating_blitz": 1700,
    })
    r = client.get("/api/players/KAZ-77001", headers=auth(admin_token))
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["id"] == "KAZ-77001"
    assert body["last_name"] == "Nurlanova"
    assert body["title_id"] == "MS"
    assert body["rating_blitz"] == 1700


def test_unknown_player_id_is_404(client, admin_token):
    r = client.get("/api/players/NOPE-0000", headers=auth(admin_token))
    assert r.status_code == 404


def test_organizer_cannot_read_the_admin_player_record(client, organizer_token):
    r = client.get("/api/players/KAZ-77001", headers=auth(organizer_token))
    assert r.status_code == 403


# --- non-Latin data, which is the norm here ---

def test_cyrillic_and_kazakh_names_round_trip(client, admin_token, migrated_db):
    r = client.post("/api/players", headers=auth(admin_token), json={
        "id": "KAZ-KIRIL-1", "first_name": "Әйгерім", "last_name": "Нұрланова",
        "middle_name": "Бекқызы", "federation_id": "KAZ", "club": "Астана",
        "rating_classic": 1700,
    })
    assert r.status_code == 200, r.text
    with psycopg.connect(migrated_db) as db:
        row = db.execute(
            "SELECT first_name, last_name, middle_name, club FROM players WHERE id = %s",
            ("KAZ-KIRIL-1",),
        ).fetchone()
    assert row == ("Әйгерім", "Нұрланова", "Бекқызы", "Астана")


def test_tournament_with_cyrillic_name_and_slug(client, organizer_token, migrated_db):
    r = client.post("/api/tournaments", headers=auth(organizer_token), json={
        "name": "Астана Опен 2026", "slug": "астана-опен-2026",
        "federation_id": "KAZ", "location_id": "Astana",
        "rating_type_id": "Classic", "tournament_type_id": "Swiss",
        "start_date": "2026-09-01", "end_date": "2026-09-05", "rounds": 5,
    })
    assert r.status_code == 200, r.text
    with psycopg.connect(migrated_db) as db:
        name = db.execute(
            "SELECT name FROM tournaments WHERE slug = %s", ("астана-опен-2026",)
        ).fetchone()
    assert name == ("Астана Опен 2026",)


# --- scale ---

def test_player_search_stays_bounded_with_thousands_of_players(client, admin_token, migrated_db):
    """search_players must LIMIT — it cannot return the whole table."""
    with psycopg.connect(migrated_db) as db:
        db.execute(
            """INSERT INTO players (id, first_name, last_name, federation_id,
                                    rating_classic)
               SELECT 'BULK-' || g, 'First' || g, 'Bulkov', 'KAZ', 1200 + (g % 500)
               FROM generate_series(1, 2000) g
               ON CONFLICT (id) DO NOTHING"""
        )
        db.commit()
        total = db.execute("SELECT COUNT(*) FROM players").fetchone()[0]
        assert total > 2000
        found = db.execute("SELECT * FROM search_players('Bulkov', 50)").fetchall()
        assert len(found) == 50, "search must respect its limit"


def test_fetching_one_player_by_id_is_unaffected_by_table_size(client, admin_token):
    r = client.get("/api/players/BULK-1234", headers=auth(admin_token))
    assert r.status_code == 200
    assert r.json()["id"] == "BULK-1234"


# --- duplicate and repeat registration ---

def test_registering_the_same_player_twice_is_a_conflict(client, admin_token, organizer_token):
    client.post("/api/players", headers=auth(admin_token), json={
        "id": "DUP-1", "first_name": "Dup", "last_name": "Licate",
        "federation_id": "KAZ", "rating_classic": 1500,
    })
    r = client.post("/api/tournaments", headers=auth(organizer_token), json={
        "name": "Dup Cup", "slug": "dup-cup", "federation_id": "KAZ",
        "location_id": "Astana", "rating_type_id": "Classic",
        "tournament_type_id": "Swiss", "start_date": "2026-10-01",
        "end_date": "2026-10-03", "rounds": 3,
    })
    tid = r.json()["id"]
    first = client.post(f"/api/tournaments/{tid}/players",
                        headers=auth(organizer_token), json={"player_id": "DUP-1"})
    assert first.status_code == 200
    second = client.post(f"/api/tournaments/{tid}/players",
                         headers=auth(organizer_token), json={"player_id": "DUP-1"})
    assert second.status_code == 409


def test_creating_a_player_twice_updates_rather_than_duplicating(client, admin_token, migrated_db):
    for rating in (1500, 1600):
        r = client.post("/api/players", headers=auth(admin_token), json={
            "id": "UPSERT-1", "first_name": "Up", "last_name": "Sert",
            "federation_id": "KAZ", "rating_classic": rating,
        })
        assert r.status_code == 200
    with psycopg.connect(migrated_db) as db:
        rows = db.execute(
            "SELECT rating_classic FROM players WHERE id = 'UPSERT-1'"
        ).fetchall()
    assert rows == [(1600,)], "must upsert, not duplicate"


# --- an odd field: byes ---

def test_odd_field_gives_exactly_one_bye_worth_a_point(
    client, admin_token, organizer_token, migrated_db
):
    ids = []
    for i in range(1, 6):
        pid = f"ODD-{i}"
        client.post("/api/players", headers=auth(admin_token), json={
            "id": pid, "first_name": f"Odd{i}", "last_name": "Field",
            "federation_id": "KAZ", "rating_classic": 1800 - i * 25,
        })
        ids.append(pid)

    r = client.post("/api/tournaments", headers=auth(organizer_token), json={
        "name": "Odd Cup", "slug": "odd-cup", "federation_id": "KAZ",
        "location_id": "Astana", "rating_type_id": "Classic",
        "tournament_type_id": "Swiss", "start_date": "2026-11-01",
        "end_date": "2026-11-03", "rounds": 3,
    })
    tid = r.json()["id"]
    for pid in ids:
        client.post(f"/api/tournaments/{tid}/players",
                    headers=auth(organizer_token), json={"player_id": pid})

    # five active players -> exactly one bye
    r = client.post(f"/api/tournaments/{tid}/generate-round", headers=auth(organizer_token))
    assert r.status_code == 200, r.text
    byes = [p for p in r.json()["pairings"] if p["player2_id"] is None]
    assert len(byes) == 1

    # the bye is worth a point without counting as a win
    with psycopg.connect(migrated_db) as db:
        pts, wins = db.execute(
            """SELECT points, tie_break_1 FROM tournament_participants
               WHERE tournament_id = %s AND player_id = %s""",
            (tid, byes[0]["player1_id"]),
        ).fetchone()
    assert float(pts) == 1.0 and float(wins) == 0


def test_withdrawn_player_is_left_out_of_the_next_round(
    client, admin_token, organizer_token
):
    ids = []
    for i in range(1, 7):
        pid = f"WD2-{i}"
        client.post("/api/players", headers=auth(admin_token), json={
            "id": pid, "first_name": f"W{i}", "last_name": "Drawn",
            "federation_id": "KAZ", "rating_classic": 1700 - i * 20,
        })
        ids.append(pid)
    r = client.post("/api/tournaments", headers=auth(organizer_token), json={
        "name": "Withdraw Cup 2", "slug": "withdraw-cup-2", "federation_id": "KAZ",
        "location_id": "Astana", "rating_type_id": "Classic",
        "tournament_type_id": "Swiss", "start_date": "2026-12-01",
        "end_date": "2026-12-03", "rounds": 3,
    })
    tid = r.json()["id"]
    for pid in ids:
        client.post(f"/api/tournaments/{tid}/players",
                    headers=auth(organizer_token), json={"player_id": pid})
    client.post(f"/api/tournaments/{tid}/withdraw/WD2-6", headers=auth(organizer_token))

    r = client.post(f"/api/tournaments/{tid}/generate-round", headers=auth(organizer_token))
    assert r.status_code == 200, r.text
    seated = set()
    for p in r.json()["pairings"]:
        seated.add(p["player1_id"])
        if p["player2_id"]:
            seated.add(p["player2_id"])
    assert "WD2-6" not in seated
    assert seated == set(ids[:5])
