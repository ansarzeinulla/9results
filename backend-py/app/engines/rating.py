"""Elo rating calculation — pure functions, port of backend/src/ratingEngine.js.

new rating = old rating + K * (result - expected)
expected = 1 / (1 + 10^((opp_rating - own_rating) / 400))
"""


def _js_round(x):
    """JS Math.round: half away from zero for positives, half up for negatives."""
    import math
    return math.floor(x + 0.5)


def calculate_elo(rating1, rating2, result, k_factor=20):
    expected1 = 1 / (1 + 10 ** ((rating2 - rating1) / 400))
    expected2 = 1 - expected1

    return {
        "rating1_new": _js_round(rating1 + k_factor * (result - expected1)),
        "rating2_new": _js_round(rating2 + k_factor * ((1 - result) - expected2)),
    }


_RESULT_NUM = {"1-0": 1, "0-1": 0, "0.5-0.5": 0.5}


def calculate_tournament_ratings(players, matches, k_factor=20):
    """Loop matches sequentially, return {player_id: rating_delta}.

    Ignores byes (player2_id None), unplayed and non-standard results, and
    players missing from the rating map.
    """
    if isinstance(players, dict):
        player_map = dict(players)
    else:
        player_map = {p["player_id"]: p["current_rating"] for p in players}

    deltas = {}
    for m in matches:
        if not m.get("player2_id") or not m.get("result"):
            continue
        r1 = player_map.get(m["player1_id"])
        r2 = player_map.get(m["player2_id"])
        if not r1 or not r2:
            continue
        result_num = _RESULT_NUM.get(m["result"])
        if result_num is None:
            continue
        res = calculate_elo(r1, r2, result_num, k_factor)
        deltas[m["player1_id"]] = deltas.get(m["player1_id"], 0) + (res["rating1_new"] - r1)
        deltas[m["player2_id"]] = deltas.get(m["player2_id"], 0) + (res["rating2_new"] - r2)
        player_map[m["player1_id"]] = res["rating1_new"]
        player_map[m["player2_id"]] = res["rating2_new"]
    return deltas
