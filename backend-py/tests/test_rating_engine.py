"""Port of the Elo engine behavior from backend/src/ratingEngine.js."""
from app.engines.rating import calculate_elo, calculate_tournament_ratings


def test_equal_ratings_win_gives_plus_10():
    res = calculate_elo(1500, 1500, 1)
    assert res == {"rating1_new": 1510, "rating2_new": 1490}


def test_equal_ratings_draw_no_change():
    res = calculate_elo(1500, 1500, 0.5)
    assert res == {"rating1_new": 1500, "rating2_new": 1500}


def test_upset_win_gains_more():
    res = calculate_elo(1400, 1800, 1)
    assert res["rating1_new"] - 1400 > 10
    assert res["rating2_new"] < 1800


def test_k_factor_override():
    res = calculate_elo(1500, 1500, 1, k_factor=40)
    assert res["rating1_new"] == 1520


def test_tournament_ratings_sequential_and_skips_byes():
    players = [
        {"player_id": "a", "current_rating": 1500},
        {"player_id": "b", "current_rating": 1500},
        {"player_id": "c", "current_rating": 1500},
    ]
    matches = [
        {"player1_id": "a", "player2_id": "b", "result": "1-0"},
        {"player1_id": "c", "player2_id": None, "result": "1BYE"},  # bye ignored
        {"player1_id": "a", "player2_id": "c", "result": "0.5-0.5"},
        {"player1_id": "x", "player2_id": "b", "result": "1-0"},  # unknown ignored
        {"player1_id": "a", "player2_id": "b", "result": None},  # unplayed ignored
    ]
    deltas = calculate_tournament_ratings(players, matches)
    assert deltas["a"] == 10 + (calculate_elo(1510, 1500, 0.5)["rating1_new"] - 1510)
    assert deltas["b"] == -10
    assert "x" not in deltas
