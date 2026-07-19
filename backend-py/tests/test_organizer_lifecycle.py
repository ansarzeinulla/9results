"""The full journey an organizer takes, end to end over HTTP.

create tournament -> edit it -> add players -> generate round ->
edit the pairings by hand -> enter results -> correct a result ->
close the round -> generate the next round -> finalize with rating changes.
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


@pytest.fixture(scope="session")
def roster(client, admin_token):
    """Admin registers the players; the organizer only uses them."""
    ids = []
    for i in range(1, 7):
        pid = f"LC-{i:03d}"
        r = client.post("/api/players", headers=auth(admin_token), json={
            "id": pid, "first_name": f"Player{i}", "last_name": "Lifecycle",
            "federation_id": "KAZ", "rating_classic": 1900 - i * 40,
        })
        assert r.status_code == 200, r.text
        ids.append(pid)
    return ids


def rows(dsn, sql, params=()):
    with psycopg.connect(dsn) as db:
        return db.execute(sql, params).fetchall()


def test_full_organizer_journey(client, organizer_token, roster, migrated_db):
    h = auth(organizer_token)

    # --- 1. create ---
    r = client.post("/api/tournaments", headers=h, json={
        "name": "Journey Cup", "slug": "journey-cup", "federation_id": "KAZ",
        "location_id": "Astana", "rating_type_id": "Classic",
        "tournament_type_id": "Swiss", "start_date": "2026-06-01",
        "end_date": "2026-06-07", "rounds": 3,
    })
    assert r.status_code == 200, r.text
    tid = r.json()["id"]
    assert rows(migrated_db, "SELECT status FROM tournaments WHERE id=%s",
                (tid,))[0][0] == "REGISTRATION"

    # --- 2. edit it ---
    r = client.put(f"/api/tournaments/{tid}", headers=h, json={
        "name": "Journey Cup 2026", "slug": "journey-cup", "federation_id": "KAZ",
        "location_id": "Almaty", "rating_type_id": "Classic",
        "tournament_type_id": "Swiss", "start_date": "2026-06-01",
        "end_date": "2026-06-08", "rounds": 3, "time_control": "25+10",
        "status": "ONGOING",
    })
    assert r.status_code == 200, r.text
    name, loc, status = rows(
        migrated_db,
        "SELECT name, location_id, status FROM tournaments WHERE id=%s", (tid,)
    )[0]
    assert (name, loc, status) == ("Journey Cup 2026", "Almaty", "ONGOING")

    # --- 3. add players ---
    for pid in roster:
        assert client.post(f"/api/tournaments/{tid}/players", headers=h,
                           json={"player_id": pid}).status_code == 200
    assert client.post(f"/api/tournaments/{tid}/players/sync-ranks",
                       headers=h).status_code == 200
    ranks = rows(
        migrated_db,
        """SELECT player_id, starting_rank FROM tournament_participants
           WHERE tournament_id=%s ORDER BY starting_rank""", (tid,)
    )
    assert [p for p, _ in ranks] == roster  # seeded by rating desc

    # --- 4. generate round 1 ---
    r = client.post(f"/api/tournaments/{tid}/generate-round", headers=h)
    assert r.status_code == 200, r.text
    assert r.json()["round_number"] == 1
    rid = r.json()["round_id"]

    # --- 5. edit the pairings by hand ---
    # a self-pairing must be rejected with a structured error
    bad = client.post(f"/api/tournaments/{tid}/validate-pairings", headers=h, json={
        "round_number": 1,
        "pairings": [{"player1_id": roster[0], "player2_id": roster[0],
                      "board_number": 1}],
    })
    assert bad.status_code == 200 and bad.json()["ok"] is False
    assert any(e["code"] == "DUPLICATE_PLAYER" for e in bad.json()["errors"])

    # a legal manual arrangement replaces the round
    manual = [
        {"player1_id": roster[0], "player2_id": roster[1], "board_number": 1},
        {"player1_id": roster[2], "player2_id": roster[3], "board_number": 2},
        {"player1_id": roster[4], "player2_id": roster[5], "board_number": 3},
    ]
    r = client.put(f"/api/rounds/{rid}/pairings", headers=h, json={"pairings": manual})
    assert r.status_code == 200 and r.json()["ok"] is True, r.text
    saved = rows(
        migrated_db,
        """SELECT white_player_id, black_player_id FROM pairings
           WHERE round_id=%s ORDER BY board_number""", (rid,)
    )
    assert saved == [(roster[0], roster[1]), (roster[2], roster[3]),
                     (roster[4], roster[5])]

    # --- 6. enter results ---
    pairing_ids = [
        r[0] for r in rows(
            migrated_db,
            "SELECT id FROM pairings WHERE round_id=%s ORDER BY board_number", (rid,)
        )
    ]
    for pid_, result in zip(pairing_ids, ["1-0", "0.5-0.5", "0-1"]):
        assert client.post(f"/api/pairings/{pid_}/result", headers=h,
                           json={"result": result}).status_code == 200
    pts = dict(rows(
        migrated_db,
        """SELECT player_id, points FROM tournament_participants
           WHERE tournament_id=%s""", (tid,)
    ))
    assert float(pts[roster[0]]) == 1.0
    assert float(pts[roster[2]]) == 0.5
    assert float(pts[roster[5]]) == 1.0

    # --- 7. correct a mistake ---
    assert client.delete(f"/api/pairings/{pairing_ids[0]}/result",
                         headers=h).status_code == 200
    pts = dict(rows(
        migrated_db,
        "SELECT player_id, points FROM tournament_participants WHERE tournament_id=%s",
        (tid,)
    ))
    assert float(pts[roster[0]]) == 0.0, "cancelled result must be undone"
    assert client.post(f"/api/pairings/{pairing_ids[0]}/result", headers=h,
                       json={"result": "1-0"}).status_code == 200

    # --- 8. close the round ---
    assert client.post(f"/api/tournaments/{tid}/rounds/{rid}/close",
                       headers=h).status_code == 200
    snaps = rows(
        migrated_db,
        "SELECT COUNT(*) FROM standings_history WHERE round_id=%s", (rid,)
    )[0][0]
    assert snaps == len(roster), "closing a round snapshots the standings"
    # a closed round is locked
    assert client.post(f"/api/pairings/{pairing_ids[0]}/result", headers=h,
                       json={"result": "0-1"}).status_code == 409

    # --- 9. next round, no rematches ---
    r = client.post(f"/api/tournaments/{tid}/generate-round", headers=h)
    assert r.status_code == 200, r.text
    assert r.json()["round_number"] == 2
    round2 = {
        frozenset((a, b)) for a, b in rows(
            migrated_db,
            """SELECT white_player_id, black_player_id FROM pairings p
               JOIN rounds rd ON rd.id = p.round_id
               WHERE rd.tournament_id=%s AND rd.round_number=2""", (tid,)
        )
    }
    round1 = {frozenset(p) for p in [(roster[0], roster[1]), (roster[2], roster[3]),
                                     (roster[4], roster[5])]}
    assert round1.isdisjoint(round2), "round 2 must not repeat round 1 pairings"

    # --- 10. finalize with rating changes ---
    before = dict(rows(migrated_db, "SELECT id, rating_classic FROM players"))
    r = client.post(f"/api/tournaments/{tid}/finalize", headers=h)
    assert r.status_code == 200, r.text
    after = dict(rows(migrated_db, "SELECT id, rating_classic FROM players"))
    assert any(before[p] != after[p] for p in roster), "ratings must move"
    assert rows(migrated_db, "SELECT status FROM tournaments WHERE id=%s",
                (tid,))[0][0] == "COMPLETED"
    assert rows(migrated_db,
                "SELECT COUNT(*) FROM rating_history WHERE tournament_id=%s",
                (tid,))[0][0] == len(roster)
    changes = rows(
        migrated_db,
        """SELECT COUNT(*) FROM tournament_participants
           WHERE tournament_id=%s AND rating_change IS NOT NULL""", (tid,)
    )[0][0]
    assert changes == len(roster)


def test_organizer_cannot_register_a_brand_new_player(client, organizer_token):
    """Organizers add existing players only — creating them is admin work."""
    r = client.post("/api/players", headers=auth(organizer_token), json={
        "id": "NEW-999", "first_name": "Sneaky", "last_name": "Player",
        "federation_id": "KAZ",
    })
    assert r.status_code == 403


def test_adding_an_unknown_player_to_a_tournament_is_404(client, organizer_token):
    r = client.post("/api/tournaments", headers=auth(organizer_token), json={
        "name": "Ghost Cup", "slug": "ghost-cup", "federation_id": "KAZ",
        "location_id": "Astana", "rating_type_id": "Classic",
        "tournament_type_id": "Swiss", "start_date": "2026-07-01",
        "end_date": "2026-07-03", "rounds": 3,
    })
    tid = r.json()["id"]
    r = client.post(f"/api/tournaments/{tid}/players",
                    headers=auth(organizer_token), json={"player_id": "does-not-exist"})
    assert r.status_code == 404
