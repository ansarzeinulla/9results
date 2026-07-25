"""Cross-engine consistency guarantees.

Every pairing engine now speaks the same dialect, so the organizer route and
the frontend can treat their output uniformly:

  * a bye is a pairing with ``player2_id`` None and ``board_number`` None
    (no engine emits a special "1BYE" result string),
  * an unpairable field raises ``PairingError`` (never a bare ValueError),
  * a missing/None rating is treated as 0 rather than crashing.

These are locked here so a future engine can't quietly diverge.
"""
import pytest

from app.engines.swiss import PairingError
from app.engines.olympic import generate_olympic_round
from app.engines.round_robin import generate_round_robin_round
from app.engines.swiss_rules import generate_swiss_round


def _players(n):
    return [{"player_id": f"p{i}", "current_rating": 2000 - i,
             "current_points": 0} for i in range(1, n + 1)]


# --- 1. bye representation: player2_id None / board_number None everywhere ---

def _byes(res):
    return [p for p in res["pairings"] if p["player2_id"] is None]


def test_swiss_rules_bye_shape():
    byes = _byes(generate_swiss_round(_players(3), [], 1))
    assert len(byes) == 1 and byes[0]["board_number"] is None


def test_olympic_bye_shape():
    byes = _byes(generate_olympic_round(_players(3), [], 1))
    assert len(byes) == 1 and byes[0]["board_number"] is None


def test_round_robin_bye_shape():
    byes = _byes(generate_round_robin_round(_players(3), [], 1))
    assert len(byes) == 1 and byes[0]["board_number"] is None


def test_no_engine_emits_a_1bye_result_string():
    for res in (
        generate_swiss_round(_players(3), [], 1),
        generate_olympic_round(_players(3), [], 1),
        generate_round_robin_round(_players(3), [], 1),
    ):
        for p in res["pairings"]:
            assert "result" not in p or p.get("result") != "1BYE"


# --- 2. unpairable field -> PairingError (not ValueError) everywhere ---

def test_all_engines_raise_pairing_error_on_too_few_players():
    with pytest.raises(PairingError):
        generate_swiss_round(_players(1), [], 1)
    with pytest.raises(PairingError):
        generate_round_robin_round(_players(1), [], 1)
    # olympic treats a single remaining player as "decided", returning empty —
    # that is its documented terminal state, asserted explicitly:
    assert generate_olympic_round(_players(1), [], 1) == {"pairings": []}


# --- 3. None rating must not crash any engine ---

def test_none_rating_is_tolerated_by_every_engine():
    ps = [
        {"player_id": "a", "current_rating": None, "current_points": 0},
        {"player_id": "b", "current_rating": 1500, "current_points": 0},
    ]
    assert generate_swiss_round(ps, [], 1)["pairings"]
    assert generate_olympic_round(ps, [], 1)["pairings"]
    assert generate_round_robin_round(ps, [], 1)["pairings"]
