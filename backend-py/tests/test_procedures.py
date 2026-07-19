"""Phase 2: tests for db/migrations/002_procedures.sql."""
import json

import psycopg
import pytest


def mk_players(db, n):
    ids = []
    for i in range(1, n + 1):
        pid = f"pl{i}"
        db.execute(
            """INSERT INTO players (id, first_name, last_name, rating_classic)
               VALUES (%s, %s, 'Test', %s)""",
            (pid, f"P{i}", 2000 - i * 50),
        )
        ids.append(pid)
    return ids


def mk_tournament(db, slug="proc-t"):
    return db.execute(
        """INSERT INTO tournaments (name, slug, federation_id, location_id,
               rating_type_id, tournament_type_id, start_date, end_date, rounds)
           VALUES ('Proc T', %s, 'KAZ', 'Astana', 'Classic', 'Swiss',
                   '2025-02-01', '2025-02-05', 5) RETURNING id""",
        (slug,),
    ).fetchone()[0]


def add_all(db, tid, pids):
    for pid in pids:
        db.execute("CALL admin_add_to_tournament(%s, %s)", (tid, pid))


def mk_round(db, tid, num=1):
    db.execute("CALL org_add_round(%s, %s)", (tid, num))
    return db.execute(
        "SELECT id FROM rounds WHERE tournament_id = %s AND round_number = %s",
        (tid, num),
    ).fetchone()[0]


def pair(db, rid, board, white, black):
    db.execute("CALL org_add_pairing(%s, %s, %s, %s)", (rid, board, white, black))
    return db.execute(
        "SELECT id FROM pairings WHERE round_id = %s AND board_number = %s",
        (rid, board),
    ).fetchone()[0]


def tp(db, tid, pid):
    return db.execute(
        """SELECT points, tie_break_1, tie_break_2, tie_break_3, final_rank,
                  starting_rank
           FROM tournament_participants
           WHERE tournament_id = %s AND player_id = %s""",
        (tid, pid),
    ).fetchone()


def test_add_to_tournament_sets_starting_ranks_by_rating(db):
    tid = mk_tournament(db)
    pids = mk_players(db, 4)
    add_all(db, tid, pids)  # pl1 highest rating 1950 ... pl4 lowest 1800
    ranks = {p: tp(db, tid, p)[5] for p in pids}
    assert ranks == {"pl1": 1, "pl2": 2, "pl3": 3, "pl4": 4}
    # rating frozen
    rat = db.execute(
        """SELECT rating_at_tournament FROM tournament_participants
           WHERE tournament_id = %s AND player_id = 'pl1'""",
        (tid,),
    ).fetchone()[0]
    assert rat == 1950


def test_remove_renumbers_without_gaps(db):
    tid = mk_tournament(db)
    pids = mk_players(db, 4)
    add_all(db, tid, pids)
    db.execute("CALL admin_remove_from_tournament(%s, 'pl2')", (tid,))
    ranks = sorted(
        r[0]
        for r in db.execute(
            "SELECT starting_rank FROM tournament_participants WHERE tournament_id = %s",
            (tid,),
        ).fetchall()
    )
    assert ranks == [1, 2, 3]


def test_set_result_recalculates_standings(db):
    tid = mk_tournament(db)
    pids = mk_players(db, 4)
    add_all(db, tid, pids)
    rid = mk_round(db, tid)
    g1 = pair(db, rid, 1, "pl1", "pl3")
    g2 = pair(db, rid, 2, "pl2", "pl4")
    db.execute("CALL org_set_result(%s, '1-0')", (g1,))
    db.execute("CALL org_set_result(%s, '0.5-0.5')", (g2,))
    p1, p2, p3, p4 = (tp(db, tid, p) for p in pids)
    assert float(p1[0]) == 1.0 and float(p3[0]) == 0.0
    assert float(p2[0]) == 0.5 and float(p4[0]) == 0.5
    assert p1[4] == 1  # final_rank
    assert float(p1[1]) == 1  # TB1 wins


def test_buchholz_and_berger(db):
    tid = mk_tournament(db)
    pids = mk_players(db, 4)
    add_all(db, tid, pids)
    r1 = mk_round(db, tid, 1)
    db.execute("CALL org_set_result(%s, '1-0')", (pair(db, r1, 1, "pl1", "pl3"),))
    db.execute("CALL org_set_result(%s, '1-0')", (pair(db, r1, 2, "pl2", "pl4"),))
    r2 = mk_round(db, tid, 2)
    db.execute("CALL org_set_result(%s, '1-0')", (pair(db, r2, 1, "pl1", "pl2"),))
    db.execute("CALL org_set_result(%s, '0.5-0.5')", (pair(db, r2, 2, "pl3", "pl4"),))
    # points: pl1=2, pl2=1, pl3=0.5, pl4=0.5
    p1 = tp(db, tid, "pl1")
    # Buchholz(pl1) = pts(pl3) + pts(pl2) = 0.5 + 1 = 1.5
    assert float(p1[2]) == 1.5
    # Berger(pl1) = beat both -> 0.5 + 1 = 1.5
    assert float(p1[3]) == 1.5
    assert p1[4] == 1


def test_bye_gives_point(db):
    tid = mk_tournament(db)
    pids = mk_players(db, 3)
    add_all(db, tid, pids)
    rid = mk_round(db, tid)
    db.execute("CALL org_set_result(%s, '1-0')", (pair(db, rid, 1, "pl1", "pl2"),))
    b = pair(db, rid, 2, "pl3", None)
    db.execute("CALL org_set_result(%s, '1BYE')", (b,))
    assert float(tp(db, tid, "pl3")[0]) == 1.0
    # bye is not a win for TB1
    assert float(tp(db, tid, "pl3")[1]) == 0


def test_forfeit_results(db):
    tid = mk_tournament(db)
    pids = mk_players(db, 2)
    add_all(db, tid, pids)
    rid = mk_round(db, tid)
    g = pair(db, rid, 1, "pl1", "pl2")
    db.execute("CALL org_set_result(%s, '--+')", (g,))
    assert float(tp(db, tid, "pl2")[0]) == 1.0
    assert float(tp(db, tid, "pl1")[0]) == 0.0


def test_cancel_result_recalculates(db):
    tid = mk_tournament(db)
    pids = mk_players(db, 2)
    add_all(db, tid, pids)
    rid = mk_round(db, tid)
    g = pair(db, rid, 1, "pl1", "pl2")
    db.execute("CALL org_set_result(%s, '1-0')", (g,))
    db.execute("CALL org_cancel_result(%s)", (g,))
    assert float(tp(db, tid, "pl1")[0]) == 0.0


def test_close_round_snapshots_and_locks(db):
    tid = mk_tournament(db)
    pids = mk_players(db, 2)
    add_all(db, tid, pids)
    rid = mk_round(db, tid)
    g = pair(db, rid, 1, "pl1", "pl2")
    db.execute("CALL org_set_result(%s, '1-0')", (g,))
    db.execute("CALL org_close_round(%s, %s)", (tid, rid))
    snap = db.execute(
        """SELECT points, rank_after_round FROM standings_history
           WHERE round_id = %s AND player_id = 'pl1'""",
        (rid,),
    ).fetchone()
    assert float(snap[0]) == 1.0 and snap[1] == 1
    assert db.execute(
        "SELECT is_closed FROM rounds WHERE id = %s", (rid,)
    ).fetchone()[0] is True
    # setting a result on a closed round is rejected
    with pytest.raises(psycopg.errors.RaiseException):
        db.execute("CALL org_set_result(%s, '0-1')", (g,))
    db.rollback()


def test_cancel_pairings_clears_round(db):
    tid = mk_tournament(db)
    pids = mk_players(db, 2)
    add_all(db, tid, pids)
    rid = mk_round(db, tid)
    g = pair(db, rid, 1, "pl1", "pl2")
    db.execute("CALL org_set_result(%s, '1-0')", (g,))
    db.execute("CALL org_cancel_pairings(%s)", (rid,))
    assert db.execute(
        "SELECT COUNT(*) FROM pairings WHERE round_id = %s", (rid,)
    ).fetchone()[0] == 0
    assert float(tp(db, tid, "pl1")[0]) == 0.0


def test_admin_upsert_player(db):
    db.execute("CALL admin_upsert_player('np1', 'New', 'Player', 'KAZ', 1600)")
    db.execute("CALL admin_upsert_player('np1', 'New2', 'Player2', 'KAZ', 1700)")
    row = db.execute(
        "SELECT first_name, rating_classic FROM players WHERE id = 'np1'"
    ).fetchone()
    assert row == ("New2", 1700)


def test_admin_create_official_makes_user(db):
    db.execute(
        "CALL admin_create_official('Org', 'Anizer', 'NA', 'orguser', 'hashhash')"
    )
    row = db.execute(
        """SELECT u.role_id, o.last_name FROM users u
           JOIN officials o ON u.official_id = o.id
           WHERE u.username = 'orguser'"""
    ).fetchone()
    assert row == ("ORGANIZER", "Anizer")


def test_withdraw_player(db):
    tid = mk_tournament(db)
    add_all(db, tid, mk_players(db, 1))
    db.execute("CALL org_withdraw_player(%s, 'pl1')", (tid,))
    st = db.execute(
        """SELECT status FROM tournament_participants
           WHERE tournament_id = %s AND player_id = 'pl1'""",
        (tid,),
    ).fetchone()[0]
    assert st == "WITHDRAWN"


def test_finalize_tournament_applies_deltas(db):
    tid = mk_tournament(db)
    pids = mk_players(db, 2)
    add_all(db, tid, pids)
    deltas = json.dumps([
        {"player_id": "pl1", "delta": 12.5, "new_rating": 1962},
        {"player_id": "pl2", "delta": -12.5, "new_rating": 1888},
    ])
    db.execute("CALL finalize_tournament(%s, %s::jsonb)", (tid, deltas))
    assert db.execute(
        "SELECT rating_classic FROM players WHERE id = 'pl1'"
    ).fetchone()[0] == 1962
    assert float(db.execute(
        """SELECT rating_change FROM tournament_participants
           WHERE tournament_id = %s AND player_id = 'pl1'""",
        (tid,),
    ).fetchone()[0]) == 12.5
    hist = db.execute(
        """SELECT rating_before, rating_after FROM rating_history
           WHERE player_id = 'pl1' AND tournament_id = %s""",
        (tid,),
    ).fetchone()
    assert hist == (1950, 1962)
    assert db.execute(
        "SELECT status FROM tournaments WHERE id = %s", (tid,)
    ).fetchone()[0] == "COMPLETED"


def test_search_tournaments_lang(db):
    tid = mk_tournament(db, slug="search-t")
    rows = db.execute(
        "SELECT * FROM search_tournaments(p_lang := 'KAZ')"
    ).fetchall()
    assert any(r[0] == tid for r in rows)
    row = [r for r in rows if r[0] == tid][0]
    assert row[3] == "Астана"


def test_search_players(db):
    mk_players(db, 1)
    rows = db.execute("SELECT * FROM search_players('pl1')").fetchall()
    assert len(rows) == 1 and rows[0][0] == "pl1"
