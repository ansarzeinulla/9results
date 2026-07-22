"""Team-vs-team tournaments end to end: build teams, seat the players, and
generate a round that pairs teams rather than individuals."""
import os

import psycopg
import pytest
from fastapi.testclient import TestClient


@pytest.fixture(scope="session")
def client(migrated_db):
    os.environ["DATABASE_URL"] = migrated_db
    os.environ["JWT_SECRET"] = "test-secret-0123456789abcdef0123456789abcdef"
    from app.main import app
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="session")
def token(client):
    r = client.post("/api/auth/login",
                    json={"username": "organizer", "password": "admin12345"})
    return r.json()["token"]


@pytest.fixture(scope="session")
def admin_token(client):
    r = client.post("/api/auth/login",
                    json={"username": "admin", "password": "admin12345"})
    return r.json()["token"]


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def query(sql, params):
    with psycopg.connect(os.environ["DATABASE_URL"]) as conn:
        return conn.execute(sql, params).fetchall()


@pytest.fixture(scope="session")
def player_ids(client, admin_token):
    """Eight players, enough for four two-board teams."""
    ids = []
    for i in range(1, 9):
        pid = f"team-api-{i}"
        client.post("/api/players", headers=auth(admin_token), json={
            "id": pid, "first_name": f"P{i}", "last_name": "Teamed",
            "federation_id": "KAZ", "rating_classic": 1800 - i,
        })
        ids.append(pid)
    return ids


def make_tournament(client, token, slug, ttype="Match"):
    r = client.post("/api/tournaments", headers=auth(token), json={
        "name": f"Team {slug}", "slug": slug,
        "federation_id": "KAZ", "location_id": "Online",
        "rating_type_id": "Classic", "tournament_type_id": ttype,
        "start_date": "2026-07-18", "end_date": "2026-07-26",
    })
    assert r.status_code == 200, r.text
    return r.json()["id"]


def seat(client, token, tid, player_id, team_id, board_order):
    return client.put(
        f"/api/tournaments/{tid}/players/{player_id}/team",
        headers=auth(token), json={"team_id": team_id, "board_order": board_order},
    )


def build_event(client, token, slug, player_ids, n_teams=2, boards=2):
    tid = make_tournament(client, token, slug)
    needed = player_ids[: n_teams * boards]
    r = client.post(f"/api/tournaments/{tid}/players/bulk",
                    headers=auth(token), json={"ids": ",".join(needed)})
    assert r.json()["added"] == len(needed), r.text

    team_ids = []
    for i in range(n_teams):
        r = client.post(f"/api/tournaments/{tid}/teams",
                        headers=auth(token), json={"name": f"Team {i + 1}"})
        assert r.status_code == 200, r.text
        team_ids.append(r.json()["id"])

    for i, pid in enumerate(needed):
        team_id = team_ids[i // boards]
        r = seat(client, token, tid, pid, team_id, (i % boards) + 1)
        assert r.status_code == 200, r.text
    return tid, team_ids


def test_team_roster_is_reported_in_board_order(client, token, player_ids):
    tid, team_ids = build_event(client, token, "roster-order", player_ids)
    teams = client.get(f"/api/tournaments/{tid}/teams",
                       headers=auth(token)).json()

    assert len(teams) == 2
    for t in teams:
        assert [m["board_order"] for m in t["roster"]] == [1, 2]


def test_two_players_cannot_share_a_board(client, token, player_ids):
    tid, team_ids = build_event(client, token, "board-clash", player_ids)
    # player_ids[1] already sits on board 2 of team 1; try to move it to board 1,
    # which player_ids[0] occupies.
    r = seat(client, token, tid, player_ids[1], team_ids[0], 1)
    assert r.status_code == 409, r.text
    assert "board" in r.json()["detail"].lower()


def test_assigning_a_team_from_another_tournament_is_rejected(
    client, token, player_ids
):
    tid_a, teams_a = build_event(client, token, "cross-a", player_ids)
    tid_b, _ = build_event(client, token, "cross-b", player_ids)

    r = seat(client, token, tid_b, player_ids[0], teams_a[0], 1)
    assert r.status_code == 404, r.text


def test_generate_round_pairs_teams_and_boards(client, token, player_ids):
    tid, team_ids = build_event(client, token, "team-round", player_ids)

    r = client.post(f"/api/tournaments/{tid}/generate-round", headers=auth(token))
    assert r.status_code == 200, r.text
    body = r.json()

    assert len(body["team_matches"]) == 1
    m = body["team_matches"][0]
    assert {m["team1_id"], m["team2_id"]} == set(team_ids)
    assert [p["board_number"] for p in m["pairings"]] == [1, 2]

    # The boards must be stored against the matchup, not left orphaned.
    stored = query(
        """SELECT COUNT(*) FROM pairings p
           JOIN team_matches tm ON p.team_match_id = tm.id
           JOIN rounds r ON tm.round_id = r.id
           WHERE r.tournament_id = %s""",
        (tid,),
    )[0][0]
    assert stored == 2


def test_uneven_rosters_are_refused_with_a_clean_422(client, token, player_ids):
    tid = make_tournament(client, token, "uneven-teams")
    ids = player_ids[:3]
    client.post(f"/api/tournaments/{tid}/players/bulk",
                headers=auth(token), json={"ids": ",".join(ids)})
    t1 = client.post(f"/api/tournaments/{tid}/teams", headers=auth(token),
                     json={"name": "Big"}).json()["id"]
    t2 = client.post(f"/api/tournaments/{tid}/teams", headers=auth(token),
                     json={"name": "Small"}).json()["id"]
    seat(client, token, tid, ids[0], t1, 1)
    seat(client, token, tid, ids[1], t1, 2)
    seat(client, token, tid, ids[2], t2, 1)

    r = client.post(f"/api/tournaments/{tid}/generate-round", headers=auth(token))
    assert r.status_code == 422, r.text
    assert "same number of boards" in r.json()["detail"]


def test_player_without_a_board_order_is_refused(client, token, player_ids):
    tid = make_tournament(client, token, "no-board-order")
    ids = player_ids[:4]
    client.post(f"/api/tournaments/{tid}/players/bulk",
                headers=auth(token), json={"ids": ",".join(ids)})
    t1 = client.post(f"/api/tournaments/{tid}/teams", headers=auth(token),
                     json={"name": "A"}).json()["id"]
    t2 = client.post(f"/api/tournaments/{tid}/teams", headers=auth(token),
                     json={"name": "B"}).json()["id"]
    seat(client, token, tid, ids[0], t1, 1)
    seat(client, token, tid, ids[1], t1, None)   # seated, but no board
    seat(client, token, tid, ids[2], t2, 1)
    seat(client, token, tid, ids[3], t2, 2)

    r = client.post(f"/api/tournaments/{tid}/generate-round", headers=auth(token))
    assert r.status_code == 422, r.text
    assert "board order" in r.json()["detail"]


def test_odd_team_count_gives_a_bye_scored_on_every_board(
    client, token, player_ids
):
    tid, team_ids = build_event(client, token, "team-bye", player_ids, n_teams=3)

    r = client.post(f"/api/tournaments/{tid}/generate-round", headers=auth(token))
    assert r.status_code == 200, r.text
    byes = [m for m in r.json()["team_matches"] if m["team2_id"] is None]
    assert len(byes) == 1

    # Both members of the idle team score a full point, so its game-point total
    # stays on the same scale as the teams that played.
    pts = query(
        """SELECT points FROM tournament_participants
           WHERE tournament_id = %s AND team_id = %s""",
        (tid, byes[0]["team1_id"]),
    )
    assert [float(p[0]) for p in pts] == [1.0, 1.0]


def test_deleting_a_team_releases_its_players(client, token, player_ids):
    tid, team_ids = build_event(client, token, "team-delete", player_ids)

    r = client.delete(f"/api/tournaments/{tid}/teams/{team_ids[0]}",
                      headers=auth(token))
    assert r.status_code == 200, r.text

    teams = client.get(f"/api/tournaments/{tid}/teams",
                       headers=auth(token)).json()
    assert [t["id"] for t in teams] == [team_ids[1]]

    # The players stay registered — only their seat is gone.
    rows = query(
        """SELECT team_id, board_order FROM tournament_participants
           WHERE tournament_id = %s AND player_id = ANY(%s)""",
        (tid, player_ids[:2]),
    )
    assert len(rows) == 2
    assert all(r[0] is None and r[1] is None for r in rows)


def test_individual_swiss_keeps_teammates_apart(client, token, player_ids):
    """swiss_rules has always refused to pair two players of the same team, but
    the rule never fired because team_id was not being loaded."""
    tid = make_tournament(client, token, "clubmates", ttype="Swiss")
    ids = player_ids[:4]
    client.post(f"/api/tournaments/{tid}/players/bulk",
                headers=auth(token), json={"ids": ",".join(ids)})

    t1 = client.post(f"/api/tournaments/{tid}/teams", headers=auth(token),
                     json={"name": "Club A"}).json()["id"]
    t2 = client.post(f"/api/tournaments/{tid}/teams", headers=auth(token),
                     json={"name": "Club B"}).json()["id"]
    # The two strongest players share a club, so a rating-folded round 1 would
    # otherwise put them straight across the board from each other.
    seat(client, token, tid, ids[0], t1, 1)
    seat(client, token, tid, ids[2], t1, 2)
    seat(client, token, tid, ids[1], t2, 1)
    seat(client, token, tid, ids[3], t2, 2)

    r = client.post(f"/api/tournaments/{tid}/generate-round", headers=auth(token))
    assert r.status_code == 200, r.text

    clubs = dict(query(
        """SELECT player_id, team_id FROM tournament_participants
           WHERE tournament_id = %s""",
        (tid,),
    ))
    for p in r.json()["pairings"]:
        if p["player2_id"] is None:
            continue
        assert clubs[p["player1_id"]] != clubs[p["player2_id"]], (
            f"{p['player1_id']} and {p['player2_id']} are clubmates"
        )


def test_individual_tournaments_are_unaffected(client, token, player_ids):
    """The Swiss path must still pair individuals, not look for teams."""
    tid = make_tournament(client, token, "still-individual", ttype="Swiss")
    ids = player_ids[:4]
    client.post(f"/api/tournaments/{tid}/players/bulk",
                headers=auth(token), json={"ids": ",".join(ids)})

    r = client.post(f"/api/tournaments/{tid}/generate-round", headers=auth(token))
    assert r.status_code == 200, r.text
    assert "pairings" in r.json()
    assert len(r.json()["pairings"]) == 2
