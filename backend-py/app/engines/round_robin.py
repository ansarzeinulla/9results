"""Round Robin pairing engine.

Standard circle method: fix player 0 and rotate the rest. Over rounds
1..(n-1) every player meets every other exactly once. An odd field adds a
dummy seat so exactly one player sits out (a bye) each round.

Byes follow the shared convention (player2_id None, board_number None) and an
unpairable field raises ``PairingError``, consistent with the other engines.
`previous_matches` is accepted for a uniform engine signature but unused —
pairings are purely positional and depend only on `round_number`.
"""

from .swiss import PairingError


def generate_round_robin_round(raw_players, previous_matches, round_number):
    players = [p["player_id"] for p in raw_players]
    n = len(players)
    if n < 2:
        raise PairingError("Need at least 2 players", code="NEED_TWO_PLAYERS")

    # Odd field: add a dummy seat; whoever meets it sits out (bye).
    if n % 2 != 0:
        players.append(None)
        n += 1

    # Only rounds 1..n-1 make up a full single round-robin.
    if round_number < 1 or round_number >= n:
        return {"pairings": []}

    fixed = players[0]
    others = players[1:]
    rot = (round_number - 1) % (n - 1)
    rotated = others[rot:] + others[:rot]

    # Fixed player meets the head of the rotation; the rest fold in half.
    matchups = [(fixed, rotated[0])]
    for i in range(1, n // 2):
        matchups.append((rotated[i], rotated[n - 1 - i]))

    pairings = []
    board = 0
    for p1, p2 in matchups:
        if p1 is None or p2 is None:
            bye_player = p1 if p2 is None else p2
            pairings.append({
                "player1_id": bye_player,
                "player2_id": None,
                "board_number": None,
            })
        else:
            board += 1
            pairings.append({
                "player1_id": p1,
                "player2_id": p2,
                "board_number": board,
            })

    return {"pairings": pairings}
