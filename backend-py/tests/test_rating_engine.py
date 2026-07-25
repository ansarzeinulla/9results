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


def test_zero_rated_player_is_not_skipped():
    """A legitimate rating of 0 must still earn/lose points. The old guard
    `if not r1 or not r2` treated 0 as "missing" and silently dropped the game."""
    players = [
        {"player_id": "new", "current_rating": 0},
        {"player_id": "strong", "current_rating": 1600},
    ]
    matches = [{"player1_id": "new", "player2_id": "strong", "result": "1-0"}]
    deltas = calculate_tournament_ratings(players, matches)
    expected = calculate_elo(0, 1600, 1)
    assert deltas["new"] == expected["rating1_new"] - 0
    assert deltas["strong"] == expected["rating2_new"] - 1600
    assert deltas["new"] > 0


def test_missing_player_is_still_skipped():
    """None (absent from the rating map) is different from 0 and stays skipped."""
    players = [{"player_id": "a", "current_rating": 1500}]
    matches = [{"player1_id": "a", "player2_id": "ghost", "result": "1-0"}]
    deltas = calculate_tournament_ratings(players, matches)
    assert deltas == {}


def test_dict_and_list_inputs_agree():
    matches = [{"player1_id": "a", "player2_id": "b", "result": "1-0"}]
    from_list = calculate_tournament_ratings(
        [{"player_id": "a", "current_rating": 1500},
         {"player_id": "b", "current_rating": 1500}],
        matches,
    )
    from_dict = calculate_tournament_ratings({"a": 1500, "b": 1500}, matches)
    assert from_list == from_dict


def test_js_round_is_half_away_from_zero_on_negative_deltas():
    """_js_round = floor(x+0.5): a loss that lands on a .5 boundary rounds the
    same way going down as a win does going up."""
    from app.engines.rating import _js_round
    assert _js_round(-0.5) == 0
    assert _js_round(-1.5) == -1
    assert _js_round(0.5) == 1
    assert _js_round(1.5) == 2
