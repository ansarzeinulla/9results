import pytest

from app.engines.olympic import generate_olympic_round
from app.engines.swiss import PairingError


def players(*specs):
    """specs: (id, rating) tuples."""
    return [{"player_id": pid, "current_rating": r} for pid, r in specs]


def test_olympic_round_1_4_players():
    ps = players(("p1", 2000), ("p2", 1900), ("p3", 1800), ("p4", 1700))
    res1 = generate_olympic_round(ps, [], 1)
    pairings1 = {(p["player1_id"], p["player2_id"]) for p in res1["pairings"]}
    # seeded bracket: 1 vs 4, 2 vs 3
    assert ("p1", "p4") in pairings1 or ("p4", "p1") in pairings1
    assert ("p2", "p3") in pairings1 or ("p3", "p2") in pairings1


def test_olympic_round_2_winners():
    ps = players(("p1", 2000), ("p2", 1900), ("p3", 1800), ("p4", 1700))
    previous = [
        {"round_number": 1, "player1_id": "p1", "player2_id": "p4", "result": "1-0"},
        {"round_number": 1, "player1_id": "p2", "player2_id": "p3", "result": "1-0"},
    ]
    res2 = generate_olympic_round(ps, previous, 2)
    pairings2 = {(p["player1_id"], p["player2_id"]) for p in res2["pairings"]}
    assert ("p1", "p2") in pairings2 or ("p2", "p1") in pairings2


def test_olympic_odd_players_bye():
    ps = players(("p1", 2000), ("p2", 1900), ("p3", 1800))
    res1 = generate_olympic_round(ps, [], 1)
    # bye is represented the standard way: player2_id None, board_number None
    byes = [p for p in res1["pairings"] if p["player2_id"] is None]
    assert len(byes) == 1
    assert byes[0]["player1_id"] == "p1"          # top seed gets the bye
    assert byes[0]["board_number"] is None


def test_bye_winner_advances_to_next_round():
    """A player who had a bye (player2_id None) advances, without needing a
    special '1BYE' result string."""
    ps = players(("p1", 2000), ("p2", 1900), ("p3", 1800))
    previous = [
        {"round_number": 1, "player1_id": "p1", "player2_id": None, "result": None},
        {"round_number": 1, "player1_id": "p2", "player2_id": "p3", "result": "1-0"},
    ]
    res2 = generate_olympic_round(ps, previous, 2)
    seated = {(p["player1_id"], p["player2_id"]) for p in res2["pairings"]}
    assert ("p1", "p2") in seated or ("p2", "p1") in seated


def test_draw_in_knockout_is_rejected():
    """A knockout has no draws — a '0.5-0.5' result has no winner to advance,
    so it must raise rather than silently shrink the bracket."""
    ps = players(("p1", 2000), ("p2", 1900), ("p3", 1800), ("p4", 1700))
    previous = [
        {"round_number": 1, "player1_id": "p1", "player2_id": "p4", "result": "0.5-0.5"},
        {"round_number": 1, "player1_id": "p2", "player2_id": "p3", "result": "1-0"},
    ]
    with pytest.raises(PairingError):
        generate_olympic_round(ps, previous, 2)


def test_unknown_winner_id_raises_cleanly():
    """If a recorded winner is no longer in the field (withdrawn), raise a
    PairingError instead of a bare StopIteration."""
    ps = players(("p1", 2000), ("p2", 1900))
    previous = [
        {"round_number": 1, "player1_id": "gone", "player2_id": "p2", "result": "1-0"},
    ]
    with pytest.raises(PairingError):
        generate_olympic_round(ps, previous, 2)


def test_fewer_than_two_active_returns_empty():
    """A single remaining player means the tournament is decided."""
    ps = players(("champ", 2000))
    assert generate_olympic_round(ps, [], 1) == {"pairings": []}


def test_none_rating_does_not_crash():
    ps = [
        {"player_id": "p1", "current_rating": None},
        {"player_id": "p2", "current_rating": 1500},
    ]
    res = generate_olympic_round(ps, [], 1)
    assert len(res["pairings"]) == 1
    pair = res["pairings"][0]
    assert {pair["player1_id"], pair["player2_id"]} == {"p1", "p2"}
