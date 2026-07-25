"""Tests for the specified Swiss ruleset (app/engines/swiss_rules.py).

Rules encoded:
  - total rounds must be odd
  - no draw for seeding: sort by rating desc, then name asc
  - round 1: fold top half vs bottom half, alternating colors
  - later rounds: bye to lowest-score/lowest-rating player without a prior bye;
    pair within score groups, never a rematch, never same team, float down
    when no valid opponent
  - colors: give each player its preferred color; if both prefer the same,
    break by seed-sum parity (even sum -> white to larger seed; odd -> smaller)
"""
import pytest

from app.engines.swiss import PairingError
from app.engines.swiss_rules import (
    choose_white,
    generate_swiss_round,
    validate_total_rounds,
    wants_white,
)


def P(pid, points, rating, seed=None, name=None, team=None):
    return {
        "player_id": pid,
        "current_points": points,
        "current_rating": rating,
        "seed_number": seed,
        "name": name or pid,
        "team_id": team,
    }


def M(rnd, white, black, result="1-0"):
    return {"round_number": rnd, "player1_id": white, "player2_id": black, "result": result}


def board(pairings, n):
    return next(p for p in pairings if p["board_number"] == n)


def pair_set(pairings):
    return {
        ":".join(sorted((p["player1_id"], p["player2_id"])))
        for p in pairings
        if p["player2_id"] is not None
    }


# --- rule: odd number of rounds ---

def test_even_total_rounds_rejected():
    with pytest.raises(PairingError):
        validate_total_rounds(6)


def test_odd_total_rounds_ok():
    validate_total_rounds(7)
    validate_total_rounds(1)


# --- rule: color preference from history ---

def test_wants_white_from_balance_and_alternation():
    assert wants_white([]) is True
    assert wants_white(["W"]) is False          # played more white -> wants black
    assert wants_white(["B"]) is True
    assert wants_white(["W", "W"]) is False      # avoid a third white
    assert wants_white(["W", "B"]) is True       # balanced -> opposite of last (B)
    assert wants_white(["B", "W"]) is False       # balanced -> opposite of last (W)


# --- rule: seed-sum parity color tiebreak ---

def test_choose_white_follows_preference_when_they_differ():
    # p1 wants white, p2 wants black -> p1 white
    assert choose_white(1, True, 2, False) is True
    # p1 wants black, p2 wants white -> p2 white
    assert choose_white(1, False, 2, True) is False


def test_choose_white_even_sum_gives_white_to_larger_seed():
    # seeds 1 + 3 = 4 (even) -> white to the larger seed (3)
    assert choose_white(1, True, 3, True) is False   # p1 (seed 1) not white
    assert choose_white(3, True, 1, True) is True    # p1 (seed 3) white


def test_choose_white_odd_sum_gives_white_to_smaller_seed():
    # seeds 1 + 2 = 3 (odd) -> white to the smaller seed (1)
    assert choose_white(1, True, 2, True) is True
    assert choose_white(2, True, 1, True) is False


# --- round 1 ---

def test_round1_folds_top_half_vs_bottom_half():
    players = [P(f"s{i}", 0, 2000 - i * 50, seed=i) for i in range(1, 5)]
    pairings = generate_swiss_round(players, [], 1)["pairings"]
    assert pair_set(pairings) == {"s1:s3", "s2:s4"}


def test_round1_alternates_colors():
    players = [P(f"s{i}", 0, 2000 - i * 50, seed=i) for i in range(1, 5)]
    pairings = generate_swiss_round(players, [], 1)["pairings"]
    b1 = board(pairings, 1)
    assert b1["player1_id"] == "s1" and b1["player2_id"] == "s3"  # seed1 white
    b2 = board(pairings, 2)
    assert b2["player1_id"] == "s4" and b2["player2_id"] == "s2"  # seed4 white


def test_round1_odd_gives_bye_to_lowest_score_lowest_rating():
    players = [P("s1", 0, 1800, seed=1), P("s2", 0, 1700, seed=2), P("s3", 0, 1600, seed=3)]
    pairings = generate_swiss_round(players, [], 1)["pairings"]
    bye = next(p for p in pairings if p["player2_id"] is None)
    assert bye["player1_id"] == "s3"
    assert bye["board_number"] is None
    assert pair_set(pairings) == {"s1:s2"}


def test_seeds_assigned_by_rating_desc_then_name_asc_when_absent():
    # equal ratings -> name ascending decides the seed order
    players = [
        P("x", 0, 1500, name="Bekov"),
        P("y", 0, 1500, name="Abenov"),
        P("z", 0, 1400, name="Serik"),
        P("w", 0, 1400, name="Nurlan"),
    ]
    pairings = generate_swiss_round(players, [], 1)["pairings"]
    # seed order: Abenov(y)=1, Bekov(x)=2, Nurlan(w)=3, Serik(z)=4
    # fold: (1,3)=(y,w), (2,4)=(x,z)
    assert pair_set(pairings) == {"w:y", "x:z"}


# --- later rounds ---

def test_later_round_never_repeats_an_opponent():
    players = [P("p1", 1, 2000), P("p2", 1, 1900), P("p3", 0, 1800), P("p4", 0, 1700)]
    prev = [M(1, "p1", "p3"), M(1, "p2", "p4")]
    pairings = generate_swiss_round(players, prev, 2)["pairings"]
    assert pair_set(pairings) == {"p1:p2", "p3:p4"}


def test_later_round_same_team_never_paired():
    players = [
        P("a1", 0, 2000, seed=1, team="A"),
        P("a2", 0, 1900, seed=2, team="A"),
        P("b1", 0, 1800, seed=3, team="B"),
        P("b2", 0, 1700, seed=4, team="B"),
    ]
    pairings = generate_swiss_round(players, [], 2)["pairings"]
    for p in pairings:
        if p["player2_id"]:
            teams = {x[0] for x in (p["player1_id"], p["player2_id"])}
            assert teams == {"a", "b"} or len(teams) == 2


def test_round1_same_team_never_paired():
    """The fold puts seed 1 against seed 3 and seed 2 against seed 4, so
    team-mates seeded a half apart would meet unless the fold is adjusted."""
    players = [
        P("a1", 0, 2000, seed=1, team="A"),
        P("b1", 0, 1900, seed=2, team="B"),
        P("a2", 0, 1800, seed=3, team="A"),
        P("b2", 0, 1700, seed=4, team="B"),
    ]
    pairings = generate_swiss_round(players, [], 1)["pairings"]
    # a2 takes white on board 2 because round 1 alternates colours down the
    # boards; what matters here is that no pair shares a team.
    assert pair_set(pairings) == {"a1:b2", "a2:b1"}


def test_round1_reports_when_team_mates_cannot_be_separated():
    players = [
        P("a1", 0, 2000, seed=1, team="A"),
        P("a2", 0, 1900, seed=2, team="A"),
    ]
    with pytest.raises(PairingError, match="team-mates"):
        generate_swiss_round(players, [], 1)


def test_later_round_bye_prefers_lowest_score_then_lowest_rating():
    players = [
        P("p1", 2, 2000), P("p2", 1, 1900), P("p3", 1, 1800),
        P("p4", 0, 1700), P("p5", 0, 1600),
    ]
    pairings = generate_swiss_round(players, [], 2)["pairings"]
    bye = next(p for p in pairings if p["player2_id"] is None)
    assert bye["player1_id"] == "p5"  # lowest score, lowest rating


def test_bye_not_given_twice_to_same_player():
    players = [P("p1", 1, 2000), P("p2", 1, 1900), P("p3", 0, 1800)]
    prev = [M(1, "p1", "p2"), {"round_number": 1, "player1_id": "p3", "player2_id": None, "result": "1BYE"}]
    pairings = generate_swiss_round(players, prev, 2)["pairings"]
    bye = next((p for p in pairings if p["player2_id"] is None), None)
    assert bye is None or bye["player1_id"] != "p3"


def test_odd_sized_score_group_floats_a_player_down():
    players = [
        P("p1", 2, 2000, seed=1), P("p2", 1, 1900, seed=2), P("p3", 1, 1800, seed=3),
        P("p4", 1, 1700, seed=4), P("p5", 0, 1600, seed=5), P("p6", 0, 1500, seed=6),
    ]
    pairings = generate_swiss_round(players, [], 2)["pairings"]
    seated = set()
    for p in pairings:
        seated.add(p["player1_id"])
        if p["player2_id"]:
            seated.add(p["player2_id"])
    assert seated == {"p1", "p2", "p3", "p4", "p5", "p6"}
    assert len(pair_set(pairings)) == 3  # all six paired, nobody left over


# --- integration ---

def test_no_rematch_over_full_8_player_tournament():
    players = [P(f"p{i}", 0, 2000 - i * 40, seed=i) for i in range(1, 9)]
    points = {p["player_id"]: 0.0 for p in players}
    prev = []
    met = set()
    for rnd in range(1, 4):
        for p in players:
            p["current_points"] = points[p["player_id"]]
        pairings = generate_swiss_round(players, prev, rnd)["pairings"]
        for key in pair_set(pairings):
            assert key not in met, f"rematch {key} in round {rnd}"
            met.add(key)
        for m in pairings:
            if m["player2_id"] is None:
                points[m["player1_id"]] += 1
                prev.append({"round_number": rnd, "player1_id": m["player1_id"],
                             "player2_id": None, "result": "1BYE"})
                continue
            # deterministic: white wins
            points[m["player1_id"]] += 1
            prev.append(M(rnd, m["player1_id"], m["player2_id"]))

# --- color preference matrix (choose_white x wants_white) ---

def test_choose_white_full_preference_matrix():
    # differing preferences: each gets what it wants
    assert choose_white(4, True, 7, False) is True    # p1 wants white -> white
    assert choose_white(4, False, 7, True) is False   # p1 wants black -> black
    # both want white, even seed-sum -> larger seed white
    assert choose_white(2, True, 4, True) is False    # sum 6 even, larger=4 -> p2
    assert choose_white(4, True, 2, True) is True     # sum 6 even, larger=4 -> p1
    # both want white, odd seed-sum -> smaller seed white
    assert choose_white(2, True, 5, True) is True     # sum 7 odd, smaller=2 -> p1
    assert choose_white(5, True, 2, True) is False
    # both want black behaves the same as both want white (same-preference tiebreak)
    assert choose_white(2, False, 4, False) is False  # sum 6 even, larger=4 -> p2


def test_wants_white_alternates_off_last_color_when_balanced():
    assert wants_white(["W", "B", "W", "B"]) is True   # last was B -> want W
    assert wants_white(["B", "W", "B", "W"]) is False   # last was W -> want B


# --- team-mate separation edge cases (round 1 fold) ---

def test_round1_three_members_of_a_team_are_kept_apart():
    # 6 players; team A has three members that the naive fold would clash.
    players = [
        P("a1", 0, 2000, seed=1, team="A"),
        P("a2", 0, 1950, seed=2, team="A"),
        P("b1", 0, 1900, seed=3, team="B"),
        P("a3", 0, 1850, seed=4, team="A"),
        P("b2", 0, 1800, seed=5, team="B"),
        P("b3", 0, 1750, seed=6, team="B"),
    ]
    pairings = generate_swiss_round(players, [], 1)["pairings"]
    for p in pairings:
        if p["player2_id"] is not None:
            assert p["player1_id"][0] != p["player2_id"][0], \
                f"team-mates paired: {p['player1_id']} vs {p['player2_id']}"


def test_round1_impossible_team_separation_raises():
    # 4 players, 3 on team A: no fold can keep them all apart.
    players = [
        P("a1", 0, 2000, seed=1, team="A"),
        P("a2", 0, 1900, seed=2, team="A"),
        P("a3", 0, 1800, seed=3, team="A"),
        P("b1", 0, 1700, seed=4, team="B"),
    ]
    with pytest.raises(PairingError, match="team-mates"):
        generate_swiss_round(players, [], 1)


# --- float-down cascade ---

def test_two_floats_cascade_across_score_groups():
    # score groups of sizes 3 (score 2) and 3 (score 1): each odd group floats
    # one player down; everyone must still be paired, nobody left over.
    players = [
        P("p1", 2, 2000, seed=1), P("p2", 2, 1950, seed=2), P("p3", 2, 1900, seed=3),
        P("p4", 1, 1850, seed=4), P("p5", 1, 1800, seed=5), P("p6", 1, 1750, seed=6),
    ]
    pairings = generate_swiss_round(players, [], 2)["pairings"]
    seated = set()
    for p in pairings:
        seated.add(p["player1_id"])
        if p["player2_id"]:
            seated.add(p["player2_id"])
    assert seated == {f"p{i}" for i in range(1, 7)}
    assert len(pair_set(pairings)) == 3


def test_unresolvable_float_raises_pairing_error():
    # Everyone has already played everyone possible in their reachable groups,
    # so a floated player cannot be placed.
    players = [P("p1", 1, 2000, seed=1), P("p2", 1, 1900, seed=2),
               P("p3", 1, 1800, seed=3), P("p4", 1, 1700, seed=4)]
    # all four already met each other except the final needed pairing
    prev = [
        M(1, "p1", "p2"), M(1, "p3", "p4"),
        M(2, "p1", "p3"), M(2, "p2", "p4"),
        M(3, "p1", "p4"), M(3, "p2", "p3"),
    ]
    with pytest.raises(PairingError):
        generate_swiss_round(players, prev, 4)


# --- bye fallback when everyone has already had one ---

def test_bye_falls_back_to_whole_field_when_all_have_byed():
    # 3 players, all three already had a bye -> a bye must still be given.
    players = [P("p1", 1, 2000, seed=1), P("p2", 1, 1900, seed=2),
               P("p3", 0, 1800, seed=3)]
    prev = [
        {"round_number": 1, "player1_id": "p1", "player2_id": None, "result": "1BYE"},
        {"round_number": 2, "player1_id": "p2", "player2_id": None, "result": "1BYE"},
        {"round_number": 3, "player1_id": "p3", "player2_id": None, "result": "1BYE"},
    ]
    pairings = generate_swiss_round(players, prev, 4)["pairings"]
    bye = next(p for p in pairings if p["player2_id"] is None)
    # lowest score then lowest rating among the (all-byed) field -> p3
    assert bye["player1_id"] == "p3"


# --- heavier no-rematch stress on the PRODUCTION engine ---

def _simulate(players, rounds):
    points = {p["player_id"]: 0.0 for p in players}
    byes = set()
    prev = []
    met = set()
    for rnd in range(1, rounds + 1):
        for p in players:
            p["current_points"] = points[p["player_id"]]
        pairings = generate_swiss_round(players, prev, rnd)["pairings"]
        round_byes = 0
        for m in pairings:
            if m["player2_id"] is None:
                round_byes += 1
                assert m["player1_id"] not in byes, "a player byed twice"
                byes.add(m["player1_id"])
                points[m["player1_id"]] += 1
                prev.append({"round_number": rnd, "player1_id": m["player1_id"],
                             "player2_id": None, "result": "1BYE"})
                continue
            key = ":".join(sorted((m["player1_id"], m["player2_id"])))
            assert key not in met, f"rematch {key} in round {rnd}"
            met.add(key)
            points[m["player1_id"]] += 1  # deterministic: white wins
            prev.append(M(rnd, m["player1_id"], m["player2_id"]))
        assert round_byes <= 1, "more than one bye in a round"
    return met


def test_no_rematch_over_full_8_player_7_round_event():
    players = [P(f"p{i}", 0, 2000 - i * 30, seed=i) for i in range(1, 9)]
    _simulate(players, 7)


def test_no_rematch_over_32_player_5_round_event():
    players = [P(f"p{i:02d}", 0, 2400 - i * 10, seed=i) for i in range(1, 33)]
    _simulate(players, 5)
