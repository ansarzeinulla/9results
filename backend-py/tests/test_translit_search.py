"""Stage 1: multi-alphabet aliases and transliteration-aware fuzzy search.

A player registered as «Нұрланова Әйгерім» must be findable as "Nurlanova",
"Aigerim", with typos, and vice versa — regardless of how the name was
transliterated at registration time.
"""
import psycopg
import pytest
from fastapi.testclient import TestClient

from app.translit import translit_latin


# --- pure transliteration utility ---

def test_translit_russian_cyrillic():
    assert translit_latin("Нурланова") == "nurlanova"
    assert translit_latin("Жезказган") == "zhezkazgan"
    assert translit_latin("Щукин") == "shchukin"


def test_translit_kazakh_letters():
    assert translit_latin("Әйгерім") == "aigerim"
    assert translit_latin("Ұлытау") == "ulytau"
    assert translit_latin("Қасқелең") == "kaskelen"
    assert translit_latin("Өскемен") == "oskemen"


def test_translit_passes_latin_through():
    assert translit_latin("Smith-Jones 3") == "smith-jones 3"


def test_translit_mixed_text():
    assert translit_latin("KAZ-Әлия") == "kaz-aliya"


# --- database: search_text maintenance and fuzzy search ---

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
def cyr_player(client, admin_token):
    r = client.post("/api/players", headers=auth(admin_token), json={
        "id": "TR-CYR-1", "first_name": "Әйгерім", "last_name": "Нұрланова",
        "federation_id": "KAZ", "rating_classic": 1700,
    })
    assert r.status_code == 200, r.text
    return "TR-CYR-1"


def fuzzy(db, q):
    return [r[0] for r in db.execute(
        "SELECT id FROM search_players_fuzzy(%s, 20)", (q,)
    ).fetchall()]


def test_cyrillic_player_found_by_latin_query(cyr_player, migrated_db):
    with psycopg.connect(migrated_db) as db:
        assert cyr_player in fuzzy(db, "Nurlanova")
        assert cyr_player in fuzzy(db, "aigerim")


def test_cyrillic_player_found_by_cyrillic_query(cyr_player, migrated_db):
    with psycopg.connect(migrated_db) as db:
        assert cyr_player in fuzzy(db, "Нұрланова")
        assert cyr_player in fuzzy(db, "Нурланова")  # russian spelling, no ұ


def test_typo_still_finds_the_player(cyr_player, migrated_db):
    with psycopg.connect(migrated_db) as db:
        assert cyr_player in fuzzy(db, "Nurlanva")


def test_latin_player_found_by_cyrillic_query(client, admin_token, migrated_db):
    client.post("/api/players", headers=auth(admin_token), json={
        "id": "TR-LAT-1", "first_name": "Daniyar", "last_name": "Serikbay",
        "federation_id": "KAZ", "rating_classic": 1650,
    })
    with psycopg.connect(migrated_db) as db:
        assert "TR-LAT-1" in fuzzy(db, "Серикбай")


def test_manual_alias_is_searchable(client, admin_token, migrated_db):
    r = client.post("/api/players", headers=auth(admin_token), json={
        "id": "TR-AL-1", "first_name": "Miras", "last_name": "Tulegen",
        "federation_id": "KAZ",
        "aliases": ["Тулеген Мирас", "Toulegen"],  # arbitrary extra spellings
    })
    assert r.status_code == 200, r.text
    with psycopg.connect(migrated_db) as db:
        assert "TR-AL-1" in fuzzy(db, "Toulegen")
        assert "TR-AL-1" in fuzzy(db, "Тулеген")
        aliases = db.execute(
            "SELECT aliases FROM players WHERE id = 'TR-AL-1'"
        ).fetchone()[0]
    assert "Toulegen" in aliases


def test_updating_aliases_reindexes_search(client, admin_token, migrated_db):
    client.post("/api/players", headers=auth(admin_token), json={
        "id": "TR-UP-1", "first_name": "Old", "last_name": "Spelling",
        "federation_id": "KAZ",
    })
    r = client.put("/api/players/TR-UP-1", headers=auth(admin_token), json={
        "id": "TR-UP-1", "first_name": "Old", "last_name": "Spelling",
        "federation_id": "KAZ", "aliases": ["Совершенно Иное"],
    })
    assert r.status_code == 200, r.text
    with psycopg.connect(migrated_db) as db:
        assert "TR-UP-1" in fuzzy(db, "Иное")


def test_get_player_returns_aliases(client, admin_token):
    r = client.get("/api/players/TR-AL-1", headers=auth(admin_token))
    assert r.status_code == 200
    assert "Toulegen" in r.json()["aliases"]


def test_anon_can_call_fuzzy_search(cyr_player, migrated_db):
    with psycopg.connect(migrated_db) as db:
        db.execute("SET ROLE anon")
        rows = db.execute(
            "SELECT id FROM search_players_fuzzy(%s, 20)", ("Nurlanova",)
        ).fetchall()
        assert any(r[0] == cyr_player for r in rows)


def test_fuzzy_search_respects_its_limit(client, admin_token, migrated_db):
    for i in range(15):
        client.post("/api/players", headers=auth(admin_token), json={
            "id": f"TR-LIM-{i}", "first_name": f"Limit{i}", "last_name": "Fuzzcheck",
            "federation_id": "KAZ",
        })
    with psycopg.connect(migrated_db) as db:
        rows = fuzzy(db, "Fuzzcheck")
        assert len(rows) <= 20
        rows = db.execute(
            "SELECT id FROM search_players_fuzzy(%s, 5)", ("Fuzzcheck",)
        ).fetchall()
        assert len(rows) == 5
