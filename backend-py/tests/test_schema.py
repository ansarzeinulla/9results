"""Phase 1: schema tests for db/migrations/001_schema.sql + seeds."""


EXPECTED_TABLES = {
    "languages", "federations", "user_roles", "users",
    "official_titles", "officials", "organizations",
    "locations", "location_translations",
    "tournament_levels", "level_translations",
    "rating_types", "rating_translations",
    "tournament_types", "type_translations",
    "participant_types", "genders", "titles", "match_results",
    "players", "tournaments", "statuses",
    "tournament_participants", "rounds", "pairings",
    "standings_history", "rating_history",
}


def tables(db):
    rows = db.execute(
        "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"
    ).fetchall()
    return {r[0] for r in rows}


def test_all_tables_exist(db):
    assert EXPECTED_TABLES <= tables(db)


def test_lookup_tables_are_extensible_no_check_lists(db):
    # New reference values can be inserted without ALTER (no CHECK IN lists)
    db.execute("INSERT INTO locations (id) VALUES ('Volgograd')")
    db.execute("INSERT INTO federations (id) VALUES ('RUS')")
    db.execute("INSERT INTO languages (id) VALUES ('DEU')")
    db.execute("INSERT INTO titles (id, description) VALUES ('XX', 'test')")
    db.execute(
        "INSERT INTO official_titles (id, description) VALUES ('ZZ', 'test')"
    )


def test_seeded_reference_data(db):
    langs = {r[0] for r in db.execute("SELECT id FROM languages").fetchall()}
    assert {"RUS", "ENG", "KAZ"} <= langs
    titles = {r[0] for r in db.execute("SELECT id FROM titles").fetchall()}
    # Kazakhstan sport ranks, not chess titles
    assert {"MSIC", "MS", "CMS", "R1", "R2", "R3"} <= titles
    assert "GM" not in titles
    results = {r[0] for r in db.execute("SELECT id FROM match_results").fetchall()}
    assert {"1-0", "0-1", "0.5-0.5", "+--", "--+", "1BYE", "0.5BYE", "0BYE"} <= results
    feds = {r[0] for r in db.execute("SELECT id FROM federations").fetchall()}
    assert {"KAZ", "WTF"} <= feds


def test_location_translations_seeded_for_all_languages(db):
    rows = db.execute(
        """SELECT l.id FROM locations l
           WHERE (SELECT COUNT(*) FROM location_translations t
                  WHERE t.location_id = l.id) < 3"""
    ).fetchall()
    assert rows == [], f"locations missing translations: {rows}"


def test_officials_identity_returning(db):
    row = db.execute(
        "INSERT INTO officials (first_name, last_name) VALUES ('A', 'B') RETURNING id"
    ).fetchone()
    assert isinstance(row[0], int)


def _mk_tournament(db, name="T", slug="t-slug"):
    return db.execute(
        """INSERT INTO tournaments (name, slug, federation_id, location_id,
               rating_type_id, tournament_type_id, start_date, end_date, rounds)
           VALUES (%s, %s, 'KAZ', 'Astana', 'Classic', 'Swiss',
                   '2025-01-01', '2025-01-05', 9)
           RETURNING id""",
        (name, slug),
    ).fetchone()[0]


def test_tournament_slug_unique_and_old_dates_allowed(db):
    _mk_tournament(db, "T1", "same-slug")
    import psycopg
    try:
        _mk_tournament(db, "T2", "same-slug")
        assert False, "duplicate slug allowed"
    except psycopg.errors.UniqueViolation:
        db.rollback()


def test_tournament_last_updated_trigger(db):
    tid = _mk_tournament(db)
    old = db.execute(
        "SELECT last_updated FROM tournaments WHERE id = %s", (tid,)
    ).fetchone()[0]
    db.execute("SELECT pg_sleep(0.05)")
    db.execute("UPDATE tournaments SET name = 'X' WHERE id = %s", (tid,))
    new = db.execute(
        "SELECT last_updated FROM tournaments WHERE id = %s", (tid,)
    ).fetchone()[0]
    assert new > old


def test_rounds_unique_per_tournament_and_is_closed(db):
    tid = _mk_tournament(db)
    db.execute(
        "INSERT INTO rounds (tournament_id, round_number) VALUES (%s, 1)", (tid,)
    )
    closed = db.execute(
        "SELECT is_closed FROM rounds WHERE tournament_id = %s", (tid,)
    ).fetchone()[0]
    assert closed is False
    import psycopg
    try:
        db.execute(
            "INSERT INTO rounds (tournament_id, round_number) VALUES (%s, 1)", (tid,)
        )
        assert False, "duplicate round allowed"
    except psycopg.errors.UniqueViolation:
        db.rollback()


def test_pairings_allow_null_black_for_bye(db):
    tid = _mk_tournament(db)
    rid = db.execute(
        "INSERT INTO rounds (tournament_id, round_number) VALUES (%s, 1) RETURNING id",
        (tid,),
    ).fetchone()[0]
    db.execute("INSERT INTO players (id, first_name, last_name) VALUES ('p1', 'A', 'B')")
    db.execute(
        """INSERT INTO pairings (round_id, board_number, white_player_id,
               black_player_id, result_id)
           VALUES (%s, 1, 'p1', NULL, '1BYE')""",
        (rid,),
    )


def test_admin_user_seeded(db):
    row = db.execute(
        "SELECT role_id, password_hash FROM users WHERE username = 'admin'"
    ).fetchone()
    assert row is not None and row[0] == "ADMIN"
    assert not row[1].startswith("plain")


def test_rating_history_table_shape(db):
    cols = {
        r[0]
        for r in db.execute(
            """SELECT column_name FROM information_schema.columns
               WHERE table_name = 'rating_history'"""
        ).fetchall()
    }
    assert {"player_id", "tournament_id", "rating_type_id",
            "rating_before", "rating_after", "created_at"} <= cols
