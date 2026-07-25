import pytest

from app.engines.round_robin import generate_round_robin_round
from app.engines.swiss import PairingError


def players(n):
    return [{"player_id": f"p{i}"} for i in range(1, n + 1)]


def pair_set(res):
    return {
        frozenset((p["player1_id"], p["player2_id"]))
        for p in res["pairings"]
        if p["player2_id"] is not None
    }


def test_round_robin_4_players():
    ps = players(4)
    got = [pair_set(generate_round_robin_round(ps, [], r)) for r in (1, 2, 3)]
    assert got[0] == {frozenset(("p1", "p2")), frozenset(("p3", "p4"))}
    assert got[1] == {frozenset(("p1", "p3")), frozenset(("p2", "p4"))}
    assert got[2] == {frozenset(("p1", "p4")), frozenset(("p2", "p3"))}


def test_round_robin_odd_players_bye():
    ps = players(3)
    res1 = generate_round_robin_round(ps, [], 1)
    assert any(p["player2_id"] is None for p in res1["pairings"])
    res2 = generate_round_robin_round(ps, [], 2)
    assert any(p["player2_id"] is None for p in res2["pairings"])


@pytest.mark.parametrize("n", [4, 5, 6, 7, 8])
def test_every_pair_meets_exactly_once_over_the_full_schedule(n):
    """The whole point of a round-robin: across rounds 1..(rounds), every pair
    of real players meets exactly once and each round is a perfect matching."""
    ps = players(n)
    rounds = n - 1 if n % 2 == 0 else n  # odd fields need n rounds (one bye each)
    met = []
    seated_per_round = []
    for r in range(1, rounds + 1):
        res = generate_round_robin_round(ps, [], r)
        met.extend(pair_set(res))
        seated = set()
        for p in res["pairings"]:
            seated.add(p["player1_id"])
            if p["player2_id"] is not None:
                seated.add(p["player2_id"])
        seated_per_round.append(seated)
        # every real player appears exactly once each round
        assert seated == {f"p{i}" for i in range(1, n + 1)}
    # no pair repeats, and every possible pair is covered
    assert len(met) == len(set(met)), "a pair met more than once"
    expected_pairs = n * (n - 1) // 2
    assert len(set(met)) == expected_pairs


def test_pairing_is_stateless_ignores_history():
    """previous_matches is accepted but unused — the same round_number always
    produces the same pairing regardless of history passed in."""
    ps = players(4)
    fake_history = [
        {"round_number": 1, "player1_id": "p1", "player2_id": "p2", "result": "1-0"},
    ]
    assert pair_set(generate_round_robin_round(ps, [], 2)) == \
        pair_set(generate_round_robin_round(ps, fake_history, 2))


def test_out_of_range_round_is_empty():
    ps = players(4)
    assert generate_round_robin_round(ps, [], 0) == {"pairings": []}
    assert generate_round_robin_round(ps, [], 4) == {"pairings": []}


def test_fewer_than_two_players_raises_pairing_error():
    """Standardized: every engine signals an unpairable field with
    PairingError (round_robin used to raise a bare ValueError)."""
    with pytest.raises(PairingError):
        generate_round_robin_round(players(1), [], 1)
