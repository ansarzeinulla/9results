"""Seed integrity: every migration and seed file applies cleanly and the
reference data the app depends on is present.

The `migrated_db` fixture applies db/migrations/*.sql then db/seeds/*.sql, so
reaching these assertions at all proves the whole set ran without error.
"""


def count(db, table):
    return db.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]


def ids(db, table):
    return {r[0] for r in db.execute(f"SELECT id FROM {table}").fetchall()}


def test_all_languages_seeded(db):
    assert ids(db, "languages") == {"RUS", "ENG", "KAZ", "SPA", "TUR", "KOR", "CZE"}


def test_tie_break_tables_exist_and_seeded(db):
    seeded = ids(db, "tie_breaks")
    # base set from seed.sql
    assert {"Points", "DirectEncounter", "WinCount", "Buchholz", "Berger",
            "BlitzPlayoff"} <= seeded
    # extended set from seed3.sql
    assert {"BuchholzCut1", "BuchholzCut2", "MedianBuchholz",
            "CumulativeScore"} <= seeded
    assert count(db, "tie_break_translations") > 0


def test_tournament_statuses_seeded(db):
    assert ids(db, "tournament_statuses") == {
        "DRAFT", "REGISTRATION", "ONGOING", "COMPLETED", "CANCELLED"
    }


def test_time_controls_seeded(db):
    assert {"Classic_90", "Rapid_20", "Blitz_5_3"} <= ids(db, "time_controls")


def test_tournament_types_use_olympic_not_knockout(db):
    types = ids(db, "tournament_types")
    assert "Olympic" in types
    assert "Knockout" not in types


def test_locations_and_translations_seeded(db):
    assert count(db, "locations") > 50, "expected the full location list"
    # every location must have at least one translation, or the UI hides it
    orphans = db.execute(
        """SELECT l.id FROM locations l
           WHERE NOT EXISTS (SELECT 1 FROM location_translations t
                             WHERE t.location_id = l.id)"""
    ).fetchall()
    assert orphans == [], f"locations without translations: {orphans[:5]}"


def test_team_and_veteran_participant_types(db):
    types = ids(db, "participant_types")
    assert {"Team_Men", "Team_Women", "Team_Mixed", "V50", "V60", "V65"} <= types


def test_team_match_results_seeded(db):
    assert {"2-0", "1-1", "0-2"} <= ids(db, "match_results")


def test_both_accounts_seeded(db):
    rows = dict(
        db.execute("SELECT username, role_id FROM users").fetchall()
    )
    assert rows.get("admin") == "ADMIN"
    assert rows.get("organizer") == "ORGANIZER"


def test_tournament_status_is_a_foreign_key(db):
    import psycopg
    import pytest
    db.execute(
        """INSERT INTO tournaments (name, slug, federation_id, location_id,
               rating_type_id, tournament_type_id, start_date, end_date, rounds)
           VALUES ('S', 'status-fk', 'KAZ', 'Astana', 'Classic', 'Swiss',
                   '2026-01-01', '2026-01-03', 3)"""
    )
    default_status = db.execute(
        "SELECT status FROM tournaments WHERE slug = 'status-fk'"
    ).fetchone()[0]
    assert default_status == "REGISTRATION"
    with pytest.raises(psycopg.errors.ForeignKeyViolation):
        db.execute("UPDATE tournaments SET status = 'NOPE' WHERE slug = 'status-fk'")
    db.rollback()
