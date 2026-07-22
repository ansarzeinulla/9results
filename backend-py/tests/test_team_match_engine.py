import pytest
from app.engines.team_match import generate_team_match_round

def test_team_match_pairing():
    players = [
        {"player_id": "t1p1", "team_id": "team1", "current_rating": 2000},
        {"player_id": "t1p2", "team_id": "team1", "current_rating": 1900},
        {"player_id": "t2p1", "team_id": "team2", "current_rating": 2100},
        {"player_id": "t2p2", "team_id": "team2", "current_rating": 1800}
    ]
    
    res = generate_team_match_round(players, [], 1)
    
    # Expected: t2p1 vs t1p1 (board 1), t2p2 vs t1p2 (board 2)
    # Note: sorting by rating means t2p1 (2100) vs t1p1 (2000)
    pairings = {(p["player1_id"], p["player2_id"]) for p in res["pairings"]}
    
    assert ("t2p1", "t1p1") in pairings or ("t1p1", "t2p1") in pairings
    assert ("t2p2", "t1p2") in pairings or ("t1p2", "t2p2") in pairings
