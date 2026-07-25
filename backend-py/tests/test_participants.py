"""Adding, bulk-adding, removing and team-assigning participants — happy paths
and every 4xx along the way."""
from tests.conftest import auth, make_players, make_tournament


def _tid(client, token, slug):
    return make_tournament(client, token, slug, type_id="Swiss")


# --- single add ---

def test_add_unknown_player_is_404(client, admin_token):
    tid = _tid(client, admin_token, "add-unknown")
    r = client.post(f"/api/tournaments/{tid}/players", headers=auth(admin_token),
                    json={"player_id": "no-such-player"})
    assert r.status_code == 404


def test_add_same_player_twice_is_409(client, admin_token):
    h = auth(admin_token)
    [pid] = make_players(client, admin_token, "add-dup", 1)
    tid = _tid(client, admin_token, "add-dup-cup")
    assert client.post(f"/api/tournaments/{tid}/players", headers=h,
                       json={"player_id": pid}).status_code == 200
    r = client.post(f"/api/tournaments/{tid}/players", headers=h,
                    json={"player_id": pid})
    assert r.status_code == 409


# --- bulk add ---

def test_bulk_add_reports_valid_unknown_and_duplicate(client, admin_token):
    h = auth(admin_token)
    ids = make_players(client, admin_token, "bulk", 3)
    tid = _tid(client, admin_token, "bulk-cup")
    # pre-register the first so it shows as an "already registered" failure
    client.post(f"/api/tournaments/{tid}/players", headers=h,
                json={"player_id": ids[0]})
    raw = f"{ids[0]}, {ids[1]}\n{ids[2]}; ghost-1, ghost-1"  # dupe + unknown
    r = client.post(f"/api/tournaments/{tid}/players/bulk", headers=h,
                    json={"ids": raw})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["added"] == 2                 # ids[1], ids[2]
    assert set(body["added_ids"]) == {ids[1], ids[2]}
    reasons = {e["id"]: e["reason"] for e in body["errors"]}
    assert "already registered" in reasons[ids[0]].lower()
    assert "not found" in reasons["ghost-1"].lower()


def test_bulk_add_empty_input(client, admin_token):
    tid = _tid(client, admin_token, "bulk-empty")
    r = client.post(f"/api/tournaments/{tid}/players/bulk",
                    headers=auth(admin_token), json={"ids": "   "})
    assert r.status_code == 200
    assert r.json() == {"added": 0, "failed": 0, "added_ids": [], "errors": []}


# --- team assignment ---

def _team_setup(client, token, slug):
    h = auth(token)
    ids = make_players(client, token, slug, 2)
    tid = make_tournament(client, token, slug + "-cup", type_id="Team-match")
    for pid in ids:
        client.post(f"/api/tournaments/{tid}/players", headers=h,
                    json={"player_id": pid})
    team_id = client.post(f"/api/tournaments/{tid}/teams", headers=h,
                          json={"name": "Team A"}).json()["id"]
    return tid, team_id, ids


def test_assign_team_from_another_tournament_is_404(client, admin_token):
    h = auth(admin_token)
    tid, _, ids = _team_setup(client, admin_token, "assign-x")
    other_team = client.post(
        f"/api/tournaments/{_tid(client, admin_token, 'assign-other')}/teams",
        headers=h, json={"name": "Foreign"}).json()["id"]
    r = client.put(f"/api/tournaments/{tid}/players/{ids[0]}/team", headers=h,
                   json={"team_id": other_team, "board_order": 1})
    assert r.status_code == 404


def test_two_players_cannot_share_a_board(client, admin_token):
    h = auth(admin_token)
    tid, team_id, ids = _team_setup(client, admin_token, "assign-clash")
    client.put(f"/api/tournaments/{tid}/players/{ids[0]}/team", headers=h,
               json={"team_id": team_id, "board_order": 1})
    r = client.put(f"/api/tournaments/{tid}/players/{ids[1]}/team", headers=h,
                   json={"team_id": team_id, "board_order": 1})
    assert r.status_code == 409


def test_non_positive_board_order_is_422(client, admin_token):
    h = auth(admin_token)
    tid, team_id, ids = _team_setup(client, admin_token, "assign-neg")
    r = client.put(f"/api/tournaments/{tid}/players/{ids[0]}/team", headers=h,
                   json={"team_id": team_id, "board_order": 0})
    assert r.status_code == 422


def test_assign_unregistered_player_is_404(client, admin_token):
    h = auth(admin_token)
    tid, team_id, _ = _team_setup(client, admin_token, "assign-unreg")
    r = client.put(f"/api/tournaments/{tid}/players/not-registered/team",
                   headers=h, json={"team_id": team_id, "board_order": 1})
    assert r.status_code == 404


def test_clearing_assignment_removes_player_from_team(client, admin_token):
    h = auth(admin_token)
    tid, team_id, ids = _team_setup(client, admin_token, "assign-clear")
    client.put(f"/api/tournaments/{tid}/players/{ids[0]}/team", headers=h,
               json={"team_id": team_id, "board_order": 1})
    r = client.put(f"/api/tournaments/{tid}/players/{ids[0]}/team", headers=h,
                   json={"team_id": None, "board_order": None})
    assert r.status_code == 200
    assert r.json()["team_id"] is None


def test_blank_team_name_is_422(client, admin_token):
    tid = make_tournament(client, admin_token, "blank-team", type_id="Team-match")
    r = client.post(f"/api/tournaments/{tid}/teams", headers=auth(admin_token),
                    json={"name": "   "})
    assert r.status_code == 422


# --- sync ranks actually renumbers ---

def test_sync_ranks_assigns_starting_ranks_by_rating(client, admin_token,
                                                     migrated_db):
    import psycopg
    h = auth(admin_token)
    # add out of rating order; strongest should end up rank 1
    ids = make_players(client, admin_token, "rank", 3, rating=1500)
    tid = _tid(client, admin_token, "rank-cup")
    for pid in ids:
        client.post(f"/api/tournaments/{tid}/players", headers=h,
                    json={"player_id": pid})
    assert client.post(f"/api/tournaments/{tid}/players/sync-ranks",
                       headers=h).status_code == 200
    with psycopg.connect(migrated_db) as db:
        rows = db.execute(
            """SELECT player_id, starting_rank FROM tournament_participants
               WHERE tournament_id=%s ORDER BY starting_rank""", (tid,)).fetchall()
    ranks = [r[1] for r in rows]
    assert ranks == [1, 2, 3]              # contiguous, no gaps
    assert rows[0][0] == "rank-1"          # highest rating (1500-1) is rank 1
