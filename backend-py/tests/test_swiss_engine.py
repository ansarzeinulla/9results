"""Port of backend/test/swissEngine.test.js — all cases plus a 64-player run."""
import pytest

from app.engines.swiss import PairingError, generate_swiss_round, validate_round_pairings


def P(pid, points, rating):
    return {"player_id": pid, "current_points": points, "current_rating": rating}


def M(rnd, p1, p2, result="1-0"):
    return {"round_number": rnd, "player1_id": p1, "player2_id": p2, "result": result}


def pair_set(pairings):
    return {
        ":".join(str(x) for x in sorted((m["player1_id"], m["player2_id"])))
        for m in pairings
        if m["player2_id"] is not None
    }


# --- round 1 ---

def test_round1_folds_the_field():
    players = [P(1, 0, 2000), P(2, 0, 1900), P(3, 0, 1800), P(4, 0, 1700)]
    pairings = generate_swiss_round(players, [], 1)["pairings"]
    assert pair_set(pairings) == {"1:3", "2:4"}


def test_round1_odd_count_bye_lowest_rated_no_board():
    players = [P(1, 0, 2000), P(2, 0, 1900), P(3, 0, 1800)]
    pairings = generate_swiss_round(players, [], 1)["pairings"]
    bye = next(m for m in pairings if m["player2_id"] is None)
    assert bye["player1_id"] == 3
    assert bye["board_number"] is None


def test_round1_boards_numbered_strongest_first():
    players = [P(1, 0, 2000), P(2, 0, 1900), P(3, 0, 1800), P(4, 0, 1700)]
    pairings = generate_swiss_round(players, [], 1)["pairings"]
    assert sorted(m["board_number"] for m in pairings) == [1, 2]
    board1 = next(m for m in pairings if m["board_number"] == 1)
    assert 1 in (board1["player1_id"], board1["player2_id"])


def test_round1_throws_with_fewer_than_2_players():
    with pytest.raises(PairingError):
        generate_swiss_round([P(1, 0, 1500)], [], 1)


# --- later rounds ---

def _play(players, rounds):
    prev = []
    points = {p["player_id"]: 0 for p in players}
    met = set()
    for r in range(1, rounds + 1):
        for p in players:
            p["current_points"] = points[p["player_id"]]
        pairings = generate_swiss_round(players, prev, r)["pairings"]
        for key in pair_set(pairings):
            assert key not in met, f"rematch {key} in round {r}"
            met.add(key)
        for m in pairings:
            if m["player2_id"] is None:
                res = "1-0"
            else:
                res = "1-0" if (m["player1_id"] + r) % 2 else "0-1"
            prev.append(M(r, m["player1_id"], m["player2_id"], res))
            a, b = (1, 0) if res == "1-0" else (0, 1)
            points[m["player1_id"]] += a
            if m["player2_id"] is not None:
                points[m["player2_id"]] += b
    return prev


def test_never_repeats_pairing_8_players_4_rounds():
    players = [P(i + 1, 0, 2000 - i * 50) for i in range(8)]
    _play(players, 4)


def test_never_repeats_pairing_64_players_7_rounds():
    players = [P(i + 1, 0, 2400 - i * 10) for i in range(64)]
    _play(players, 7)


def test_bye_prefers_fresh_player():
    players = [P(i + 1, 0, 1900 - i * 100) for i in range(5)]
    prev = []
    byes = []
    for r in range(1, 5):
        pairings = generate_swiss_round(players, prev, r)["pairings"]
        bye = next(m for m in pairings if m["player2_id"] is None)
        byes.append(bye["player1_id"])
        for m in pairings:
            prev.append(M(r, m["player1_id"], m["player2_id"], "1-0"))
    for i in range(1, len(byes)):
        assert byes[i] != byes[i - 1]
    assert len(set(byes)) >= 3, f"expected at least 3 distinct byes, got {byes}"


def test_repeat_bye_fallback_then_impossible():
    players = [P(1, 0, 1500), P(2, 0, 1400), P(3, 0, 1300)]
    prev = []
    for r in range(1, 4):
        pairings = generate_swiss_round(players, prev, r)["pairings"]
        assert any(m["player2_id"] is None for m in pairings), f"round {r} must have a bye"
        for m in pairings:
            prev.append(M(r, m["player1_id"], m["player2_id"], "1-0"))
    byes = [m["player1_id"] for m in prev if m["player2_id"] is None]
    assert len(set(byes)) == 3, f"each player gets exactly one bye, got {byes}"
    with pytest.raises(PairingError):
        generate_swiss_round(players, prev, 4)


def test_pairs_within_score_groups():
    players = [P(1, 1, 2000), P(2, 1, 1900), P(3, 0, 1800), P(4, 0, 1700)]
    prev = [M(1, 1, 3), M(1, 2, 4)]
    pairings = generate_swiss_round(players, prev, 2)["pairings"]
    assert pair_set(pairings) == {"1:2", "3:4"}


def test_regression_string_decimal_score_groups():
    players = [
        P(1, "1", 1600), P(2, "1.0", 1500), P(3, "1", 1400),
        P(4, "1.0", 1300), P(5, "1", 1200), P(6, "1.0", 1100),
    ]
    from_strings = pair_set(generate_swiss_round(players, [], 2)["pairings"])
    numeric = [dict(p, current_points=float(p["current_points"])) for p in players]
    from_numbers = pair_set(generate_swiss_round(numeric, [], 2)["pairings"])
    assert from_strings == from_numbers


def test_regression_board_order_numeric_with_string_points():
    players = [P(1, "1", 1000), P(2, "0", 1900), P(3, "0.5", 1800), P(4, "0.5", 1700)]
    prev = [M(1, 1, 2), M(1, 3, 4, "0.5-0.5")]
    pairings = generate_swiss_round(players, prev, 2)["pairings"]
    board1 = next(m for m in pairings if m["board_number"] == 1)
    assert 1 in (board1["player1_id"], board1["player2_id"]), pairings


def test_throws_when_all_combinations_played():
    players = [P(1, 1, 1500), P(2, 1, 1400)]
    prev = [M(1, 1, 2)]
    with pytest.raises(PairingError):
        generate_swiss_round(players, prev, 2)


def test_sides_balance():
    players = [P(i + 1, 0, 1800 - i * 100) for i in range(4)]
    prev = []
    as_p1 = {}
    for r in range(1, 4):
        pairings = generate_swiss_round(players, prev, r)["pairings"]
        for m in pairings:
            as_p1[m["player1_id"]] = as_p1.get(m["player1_id"], 0) + 1
            prev.append(M(r, m["player1_id"], m["player2_id"], "0.5-0.5"))
    for pid, n in as_p1.items():
        assert n <= 2, f"player {pid} was player1 {n}/3 times"


# --- validate_round_pairings ---

PLAYERS = [P(1, 1, 2000), P(2, 1, 1900), P(3, 0, 1800), P(4, 0, 1700)]
PREV = [M(1, 1, 3), M(1, 2, 4)]


def pair(p1, p2, board=1):
    return {"player1_id": p1, "player2_id": p2, "board_number": board}


def validate(pairings, players=PLAYERS, prev=PREV):
    return validate_round_pairings(
        pairings=pairings, players=players, previous_matches=prev, round_number=2
    )


def test_validate_accepts_legal_round():
    res = validate([pair(1, 2, 1), pair(3, 4, 2)])
    assert res["ok"] is True and res["errors"] == []


def test_validate_rejects_rematch():
    res = validate([pair(1, 3, 1), pair(2, 4, 2)])
    assert res["ok"] is False
    assert any(e["code"] == "REMATCH" for e in res["errors"])


def test_validate_structured_params():
    res = validate([pair(1, 3, 1), pair(2, 4, 2)])
    rematch = next(e for e in res["errors"] if e["code"] == "REMATCH")
    assert rematch["params"] == {"a": 1, "b": 3}

    cross = validate([pair(1, 4, 1), pair(2, 3, 2)])
    w = next(x for x in cross["warnings"] if x["code"] == "SCORE_MISMATCH")
    assert w["params"] == {"a": 1, "pa": 1, "b": 4, "pb": 0}

    dup = validate([pair(1, 2, 1), pair(1, 4, 2)])
    assert next(e for e in dup["errors"] if e["code"] == "DUPLICATE_PLAYER")["params"]["id"] == 1
    assert next(e for e in dup["errors"] if e["code"] == "UNPAIRED_PLAYER")["params"]["id"] == 3


def test_validate_rejects_player_twice():
    res = validate([pair(1, 2, 1), pair(1, 4, 2)])
    assert res["ok"] is False
    assert any(e["code"] == "DUPLICATE_PLAYER" for e in res["errors"])


def test_validate_rejects_unknown_players():
    res = validate([pair(1, 99, 1), pair(3, 4, 2)])
    assert res["ok"] is False
    assert any(e["code"] == "UNKNOWN_PLAYER" for e in res["errors"])


def test_validate_rejects_incomplete_round():
    res = validate([pair(1, 2, 1)])
    assert res["ok"] is False
    assert any(e["code"] == "UNPAIRED_PLAYER" for e in res["errors"])


def test_validate_rejects_bye_with_even_count():
    res = validate([pair(1, 2, 1), pair(3, None, None), pair(4, None, None)])
    assert res["ok"] is False
    assert any(e["code"] in ("MULTIPLE_BYES", "UNPAIRED_PLAYER") for e in res["errors"])


def test_validate_accepts_single_bye_odd_players():
    five = PLAYERS + [P(5, 0, 1600)]
    ok = validate([pair(1, 2, 1), pair(3, 4, 2), pair(5, None, None)], players=five)
    assert ok["ok"] is True


def test_validate_rejects_self_pairing():
    res = validate([pair(1, 1, 1), pair(3, 4, 2)])
    assert res["ok"] is False


def test_validate_score_mismatch_is_warning():
    res = validate([pair(1, 4, 1), pair(2, 3, 2)])
    assert res["ok"] is True
    assert len(res["warnings"]) > 0


def test_validate_repeat_bye_is_warning():
    five = PLAYERS + [P(5, 0, 1600)]
    prev_with_bye = PREV + [M(1, 5, None)]
    res = validate(
        [pair(1, 2, 1), pair(3, 4, 2), pair(5, None, None)],
        players=five, prev=prev_with_bye,
    )
    assert res["ok"] is True
    assert any(w["code"] == "REPEAT_BYE" for w in res["warnings"])


def test_validate_string_points_no_crash_no_false_warning():
    str_players = [P(1, "1", 2000), P(2, "1.0", 1900), P(3, "0", 1800), P(4, "0", 1700)]
    res = validate([pair(1, 2, 1), pair(3, 4, 2)], players=str_players)
    assert res["ok"] is True
    assert res["warnings"] == []
