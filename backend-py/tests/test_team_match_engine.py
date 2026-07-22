"""Team-vs-team pairing: teams are paired Swiss-style, then boards are matched
off inside each pairing according to the fixed lineups."""
import pytest

from app.engines.swiss import PairingError
from app.engines.team_match import generate_team_match_round


def team(tid, points=0.0, rating=2000, boards=2):
    return {
        "team_id": tid,
        "game_points": points,
        "mean_rating": rating,
        "roster": [
            {"player_id": f"t{tid}p{i}", "board_order": i}
            for i in range(1, boards + 1)
        ],
    }


def test_two_teams_meet_on_every_board():
    res = generate_team_match_round([team(1), team(2)], [], 1)

    assert len(res["team_matches"]) == 1
    m = res["team_matches"][0]
    assert {m["team1_id"], m["team2_id"]} == {1, 2}
    # Board 1 plays board 1, board 2 plays board 2 — never across seats.
    assert [p["board_number"] for p in m["pairings"]] == [1, 2]
    for p in m["pairings"]:
        board = p["board_number"]
        assert {p["player1_id"], p["player2_id"]} == {f"t1p{board}", f"t2p{board}"}


def test_board_numbers_restart_within_each_matchup():
    res = generate_team_match_round(
        [team(1), team(2), team(3), team(4)], [], 1
    )
    assert len(res["team_matches"]) == 2
    for m in res["team_matches"]:
        assert [p["board_number"] for p in m["pairings"]] == [1, 2]
    assert [m["match_number"] for m in res["team_matches"]] == [1, 2]


def test_colours_alternate_down_the_boards():
    """The team listed first takes white on odd boards and black on even, so
    neither side collects every white."""
    res = generate_team_match_round([team(1, boards=4), team(2, boards=4)], [], 1)
    m = res["team_matches"][0]
    first, second = m["team1_id"], m["team2_id"]

    for p in m["pairings"]:
        leader = first if p["board_number"] % 2 == 1 else second
        assert p["player1_id"].startswith(f"t{leader}p")


def test_odd_team_count_produces_a_bye_with_no_pairings():
    res = generate_team_match_round([team(1), team(2), team(3)], [], 1)

    byes = [m for m in res["team_matches"] if m["team2_id"] is None]
    assert len(byes) == 1
    assert byes[0]["pairings"] == []


def test_teams_are_not_paired_twice():
    history = [{"round_number": 1, "team1_id": 1, "team2_id": 2}]
    res = generate_team_match_round([team(1), team(2), team(3), team(4)],
                                    history, 2)

    met = {frozenset((m["team1_id"], m["team2_id"]))
           for m in res["team_matches"]}
    assert frozenset((1, 2)) not in met


def test_leaders_meet_in_the_second_round():
    """Pairing runs on accumulated game points, so the two winning teams meet."""
    history = [
        {"round_number": 1, "team1_id": 1, "team2_id": 2},
        {"round_number": 1, "team1_id": 3, "team2_id": 4},
    ]
    teams = [team(1, points=2.0), team(2, points=0.0),
             team(3, points=2.0), team(4, points=0.0)]
    res = generate_team_match_round(teams, history, 2)

    met = {frozenset((m["team1_id"], m["team2_id"]))
           for m in res["team_matches"]}
    assert frozenset((1, 3)) in met
    assert frozenset((2, 4)) in met


def test_fewer_than_two_teams_is_rejected():
    with pytest.raises(PairingError, match="2 teams"):
        generate_team_match_round([team(1)], [], 1)


def test_uneven_rosters_are_rejected():
    """Game-points-only scoring puts a 4-board team on a different scale from a
    2-board one, so the mismatch has to be caught before the round exists."""
    with pytest.raises(PairingError, match="same number of boards"):
        generate_team_match_round([team(1, boards=2), team(2, boards=4)], [], 1)


def test_duplicate_board_order_is_rejected():
    bad = team(1)
    bad["roster"][1]["board_order"] = 1
    with pytest.raises(PairingError, match="board order"):
        generate_team_match_round([bad, team(2)], [], 1)


def test_missing_board_order_is_rejected():
    """A player with no seat would silently vanish from the pairing."""
    bad = team(1)
    bad["roster"][1]["board_order"] = None
    with pytest.raises(PairingError, match="board order"):
        generate_team_match_round([bad, team(2)], [], 1)


def test_empty_roster_is_rejected():
    empty = team(1)
    empty["roster"] = []
    with pytest.raises(PairingError, match="no players"):
        generate_team_match_round([empty, team(2)], [], 1)
