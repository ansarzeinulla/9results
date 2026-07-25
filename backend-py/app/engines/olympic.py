"""Olympic (Knockout) pairing engine — single elimination.

Byes follow the shared convention used by every other engine: a bye is a
pairing with ``player2_id`` None and ``board_number`` None (there is no special
"1BYE" result string). Errors are raised as ``PairingError``.
"""

from .swiss import PairingError


def _rating(p):
    # A missing or None rating sorts as 0, matching the other engines' `or 0`.
    return p.get("current_rating") or 0


def _advance_winners(raw_players, previous_matches, round_number):
    """The players who won round ``round_number - 1`` and therefore play on.

    A bye (player2_id None) advances its player automatically. A drawn result
    has no winner in a knockout and is rejected. A winner who is no longer in
    the field (e.g. withdrawn) is rejected rather than raising StopIteration.
    """
    by_id = {p["player_id"]: p for p in raw_players}
    prev = [m for m in previous_matches if m["round_number"] == round_number - 1]

    winners = []
    for m in prev:
        if m["player2_id"] is None:
            winner_id = m["player1_id"]
        elif m["result"] == "1-0":
            winner_id = m["player1_id"]
        elif m["result"] == "0-1":
            winner_id = m["player2_id"]
        else:
            raise PairingError(
                "A knockout game must have a decisive result "
                f"(got {m['result']!r} for board {m['player1_id']} vs "
                f"{m['player2_id']})",
                code="KNOCKOUT_NEEDS_DECISIVE",
                params={"result": str(m["result"]),
                        "white": m["player1_id"], "black": m["player2_id"]},
            )
        if winner_id not in by_id:
            raise PairingError(
                f"Winner {winner_id!r} is no longer in the tournament",
                code="WINNER_GONE", params={"id": winner_id},
            )
        winners.append(by_id[winner_id])
    return winners


def generate_olympic_round(raw_players, previous_matches, round_number):
    if round_number == 1:
        active = list(raw_players)
    else:
        active = _advance_winners(raw_players, previous_matches, round_number)

    active = sorted(active, key=_rating, reverse=True)

    n = len(active)
    if n < 2:
        # One (or no) player left: the tournament is decided.
        return {"pairings": []}

    pairings = []

    # Odd field: the top seed gets the bye.
    if n % 2 == 1:
        bye_player = active[0]
        pairings.append({
            "player1_id": bye_player["player_id"],
            "player2_id": None,
            "board_number": None,
        })
        active = active[1:]
        n -= 1

    # Seeded bracket: 1 vs N, 2 vs N-1, ...
    for i in range(n // 2):
        p1 = active[i]
        p2 = active[-(i + 1)]
        pairings.append({
            "player1_id": p1["player_id"],
            "player2_id": p2["player_id"],
            "board_number": i + 1,
        })

    return {"pairings": pairings}
