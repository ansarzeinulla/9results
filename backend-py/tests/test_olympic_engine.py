import pytest
from app.engines.olympic import generate_olympic_round

def test_olympic_round_1_4_players():
    players = [
        {"player_id": "p1", "current_rating": 2000},
        {"player_id": "p2", "current_rating": 1900},
        {"player_id": "p3", "current_rating": 1800},
        {"player_id": "p4", "current_rating": 1700}
    ]
    
    # Round 1
    res1 = generate_olympic_round(players, [], 1)
    # Expected: (p1, p4), (p2, p3)
    pairings1 = {(p["player1_id"], p["player2_id"]) for p in res1["pairings"]}
    assert ("p1", "p4") in pairings1 or ("p4", "p1") in pairings1
    assert ("p2", "p3") in pairings1 or ("p3", "p2") in pairings1

def test_olympic_round_2_winners():
    players = [
        {"player_id": "p1", "current_rating": 2000},
        {"player_id": "p2", "current_rating": 1900},
        {"player_id": "p3", "current_rating": 1800},
        {"player_id": "p4", "current_rating": 1700}
    ]
    previous_matches = [
        {"round_number": 1, "player1_id": "p1", "player2_id": "p4", "result": "1-0"},
        {"round_number": 1, "player1_id": "p2", "player2_id": "p3", "result": "1-0"}
    ]
    
    # Round 2
    res2 = generate_olympic_round(players, previous_matches, 2)
    # Expected: (p1, p2)
    pairings2 = {(p["player1_id"], p["player2_id"]) for p in res2["pairings"]}
    assert ("p1", "p2") in pairings2 or ("p2", "p1") in pairings2

def test_olympic_odd_players_bye():
    players = [
        {"player_id": "p1", "current_rating": 2000},
        {"player_id": "p2", "current_rating": 1900},
        {"player_id": "p3", "current_rating": 1800}
    ]
    
    # Round 1
    res1 = generate_olympic_round(players, [], 1)
    # Expected: p1 gets bye, (p2, p3)
    assert any(p["player2_id"] is None for p in res1["pairings"])
    assert any(p["player1_id"] == "p1" and p["player2_id"] is None for p in res1["pairings"])
