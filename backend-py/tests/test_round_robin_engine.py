import pytest
from app.engines.round_robin import generate_round_robin_round

def test_round_robin_4_players():
    players = [{"player_id": "p1"}, {"player_id": "p2"}, {"player_id": "p3"}, {"player_id": "p4"}]
    
    # Round 1
    res1 = generate_round_robin_round(players, [], 1)
    # Expected: (p1, p2), (p3, p4)
    pairings1 = {(p["player1_id"], p["player2_id"]) for p in res1["pairings"]}
    assert ("p1", "p2") in pairings1 or ("p2", "p1") in pairings1
    assert ("p3", "p4") in pairings1 or ("p4", "p3") in pairings1
    
    # Round 2
    res2 = generate_round_robin_round(players, [], 2)
    # Expected: (p1, p3), (p4, p2)
    pairings2 = {(p["player1_id"], p["player2_id"]) for p in res2["pairings"]}
    assert ("p1", "p3") in pairings2 or ("p3", "p1") in pairings2
    assert ("p4", "p2") in pairings2 or ("p2", "p4") in pairings2

    # Round 3
    res3 = generate_round_robin_round(players, [], 3)
    # Expected: (p1, p4), (p2, p3)
    pairings3 = {(p["player1_id"], p["player2_id"]) for p in res3["pairings"]}
    assert ("p1", "p4") in pairings3 or ("p4", "p1") in pairings3
    assert ("p2", "p3") in pairings3 or ("p3", "p2") in pairings3

def test_round_robin_odd_players_bye():
    players = [{"player_id": "p1"}, {"player_id": "p2"}, {"player_id": "p3"}]
    # Should add a dummy player, so 4 players total (p1, p2, p3, None)
    
    # Round 1
    res1 = generate_round_robin_round(players, [], 1)
    # Expected: (p1, None) -> Bye, (p2, p3)
    assert any(p["player2_id"] is None for p in res1["pairings"])
    
    # Round 2
    res2 = generate_round_robin_round(players, [], 2)
    # Expected: (p1, p3), (p2, None) -> Bye
    assert any(p["player2_id"] is None for p in res2["pairings"])
