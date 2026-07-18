"""Phase 4: RLS — anon may read public tables, never write, never see users."""
import psycopg
import pytest


@pytest.fixture()
def anon(migrated_db):
    conn = psycopg.connect(migrated_db)
    conn.execute("SET ROLE anon")
    yield conn
    conn.rollback()
    conn.close()


def test_anon_can_read_public_tables(anon):
    for table in ("tournaments", "players", "pairings", "rounds",
                  "tournament_participants", "standings_history",
                  "location_translations", "rating_history"):
        anon.execute(f"SELECT * FROM {table} LIMIT 1")


def test_anon_cannot_read_users(anon):
    with pytest.raises(psycopg.errors.InsufficientPrivilege):
        anon.execute("SELECT * FROM users LIMIT 1")


def test_anon_cannot_write(anon):
    with pytest.raises(psycopg.errors.InsufficientPrivilege):
        anon.execute("INSERT INTO locations (id) VALUES ('Hack')")
    anon.rollback()
    anon.execute("SET ROLE anon")
    with pytest.raises(psycopg.errors.InsufficientPrivilege):
        anon.execute("UPDATE players SET rating_classic = 3000")
    anon.rollback()
    anon.execute("SET ROLE anon")
    with pytest.raises(psycopg.errors.InsufficientPrivilege):
        anon.execute("DELETE FROM tournaments")


def test_anon_cannot_call_org_procedures(anon):
    with pytest.raises(psycopg.errors.InsufficientPrivilege):
        anon.execute("CALL org_set_result(1, '1-0')")
