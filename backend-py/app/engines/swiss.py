"""Swiss pairing engine (FIDE Dutch style, adapted for togyzkumalak).

Python port of backend/src/swissEngine.js — pure functions, no database access.

Inputs:
    players: [{player_id, current_points, current_rating}]
    previous_matches: [{round_number, player1_id, player2_id, result}]
        (player2_id is None means player1 had a bye)

Output of generate_swiss_round: {"pairings": [{player1_id, player2_id, board_number}]}
    player2_id None = bye (board_number None)
"""


class PairingError(Exception):
    pass


def _normalize(players):
    """DECIMAL columns arrive as strings ('2' vs '2.0'); normalize once."""
    out = []
    for p in players:
        q = dict(p)
        try:
            q["current_points"] = float(p.get("current_points") or 0)
        except (TypeError, ValueError):
            q["current_points"] = 0.0
        try:
            q["current_rating"] = float(p.get("current_rating") or 0)
        except (TypeError, ValueError):
            q["current_rating"] = 0.0
        out.append(q)
    return out


def _build_history(previous_matches):
    played = set()
    had_bye = set()
    side_balance = {}  # times as player1 minus times as player2
    last_side = {}  # 1 or 2 in the most recent round played

    for m in sorted(previous_matches, key=lambda x: x["round_number"]):
        if m["player2_id"] is None:
            had_bye.add(m["player1_id"])
            continue
        played.add((m["player1_id"], m["player2_id"]))
        played.add((m["player2_id"], m["player1_id"]))
        side_balance[m["player1_id"]] = side_balance.get(m["player1_id"], 0) + 1
        side_balance[m["player2_id"]] = side_balance.get(m["player2_id"], 0) - 1
        last_side[m["player1_id"]] = 1
        last_side[m["player2_id"]] = 2
    return played, had_bye, side_balance, last_side


def _standing_key(p):
    return (-p["current_points"], -p["current_rating"])


def _candidate_order(leader, rest):
    """Same-score opponents starting at the fold, then the rest, then below."""
    group = [p for p in rest if p["current_points"] == leader["current_points"]]
    below = [p for p in rest if p["current_points"] != leader["current_points"]]
    fold = len(group) // 2
    return group[fold:] + group[:fold] + below


def _pair_recursive(remaining, played, pairings):
    if not remaining:
        return True
    leader, rest = remaining[0], remaining[1:]
    for opponent in _candidate_order(leader, rest):
        if (leader["player_id"], opponent["player_id"]) in played:
            continue
        pairings.append((leader, opponent))
        nxt = [p for p in rest if p is not opponent]
        if _pair_recursive(nxt, played, pairings):
            return True
        pairings.pop()
    return False


def _order_sides(a, b, side_balance, last_side):
    """Decide which player of a pair sits on side 1 (stored as player1)."""
    bal_a = side_balance.get(a["player_id"], 0)
    bal_b = side_balance.get(b["player_id"], 0)
    if bal_a != bal_b:
        return (a, b) if bal_a < bal_b else (b, a)
    last_a = last_side.get(a["player_id"])
    last_b = last_side.get(b["player_id"])
    if last_a != last_b:
        return (a, b) if last_a == 2 else (b, a)
    return (a, b) if _standing_key(a) <= _standing_key(b) else (b, a)


def generate_swiss_round(raw_players, previous_matches, round_number):
    players = _normalize(raw_players)
    if len(players) < 2:
        raise PairingError("Need at least 2 players to pair a round")

    played, had_bye, side_balance, last_side = _build_history(previous_matches)
    ranked = sorted(players, key=_standing_key)

    bye_candidates = [None]
    if len(ranked) % 2 == 1:
        fresh = [p for p in reversed(ranked) if p["player_id"] not in had_bye]
        repeat = [p for p in reversed(ranked) if p["player_id"] in had_bye]
        bye_candidates = fresh + repeat

    raw_pairs = None
    bye_player = None
    for candidate in bye_candidates:
        field = [p for p in ranked if p is not candidate] if candidate else ranked
        attempt = []
        if round_number == 1:
            half = len(field) // 2
            for i in range(half):
                attempt.append((field[i], field[i + half]))
            success = True
        else:
            success = _pair_recursive(field, played, attempt)
        if success:
            raw_pairs = attempt
            bye_player = candidate
            break
    if raw_pairs is None:
        raise PairingError(
            "No valid pairing exists — all remaining opponent combinations "
            "have already been played"
        )

    def pair_key(pair):
        a, b = pair
        return (
            -max(a["current_points"], b["current_points"]),
            -(a["current_points"] + b["current_points"]),
            -max(a["current_rating"], b["current_rating"]),
        )

    raw_pairs.sort(key=pair_key)

    pairings = []
    for i, pair in enumerate(raw_pairs):
        if round_number == 1:
            # No side history: alternate sides down the boards.
            p1, p2 = pair if i % 2 == 0 else (pair[1], pair[0])
        else:
            p1, p2 = _order_sides(pair[0], pair[1], side_balance, last_side)
        pairings.append(
            {"player1_id": p1["player_id"], "player2_id": p2["player_id"],
             "board_number": i + 1}
        )

    if bye_player:
        pairings.append(
            {"player1_id": bye_player["player_id"], "player2_id": None,
             "board_number": None}
        )
    return {"pairings": pairings}


def validate_round_pairings(*, pairings, players, previous_matches, round_number):
    """Validate a manually edited round against Swiss laws.

    Hard errors block saving; warnings are surfaced to the arbiter.
    Returns {"ok", "errors": [{code, params, message}], "warnings": [...]}.
    """
    norm = _normalize(players)
    by_id = {p["player_id"]: p for p in norm}
    played, had_bye, _, _ = _build_history(previous_matches)
    errors = []
    warnings = []

    seen = set()

    def take_seat(pid):
        if pid not in by_id:
            errors.append({"code": "UNKNOWN_PLAYER", "params": {"id": pid},
                           "message": f"Player {pid} is not in this tournament"})
            return
        if pid in seen:
            errors.append({"code": "DUPLICATE_PLAYER", "params": {"id": pid},
                           "message": f"Player {pid} appears in more than one pair"})
            return
        seen.add(pid)

    byes = 0
    for m in pairings:
        if m.get("player1_id") is None:
            errors.append({"code": "UNKNOWN_PLAYER", "params": {"id": "?"},
                           "message": "A pair is missing player 1"})
            continue
        take_seat(m["player1_id"])
        if m.get("player2_id") is None:
            byes += 1
            continue
        if m["player2_id"] == m["player1_id"]:
            errors.append({"code": "DUPLICATE_PLAYER",
                           "params": {"id": m["player1_id"]},
                           "message": f"Player {m['player1_id']} cannot play themselves"})
            continue
        take_seat(m["player2_id"])
        if (m["player1_id"], m["player2_id"]) in played:
            errors.append({
                "code": "REMATCH",
                "params": {"a": m["player1_id"], "b": m["player2_id"]},
                "message": (f"Players {m['player1_id']} and {m['player2_id']} "
                            "already played each other"),
            })
        a = by_id.get(m["player1_id"])
        b = by_id.get(m["player2_id"])
        if a and b and a["current_points"] != b["current_points"]:
            pa = int(a["current_points"]) if a["current_points"].is_integer() else a["current_points"]
            pb = int(b["current_points"]) if b["current_points"].is_integer() else b["current_points"]
            warnings.append({
                "code": "SCORE_MISMATCH",
                "params": {"a": m["player1_id"], "pa": pa,
                           "b": m["player2_id"], "pb": pb},
                "message": (f"Players {m['player1_id']} ({pa}) and "
                            f"{m['player2_id']} ({pb}) are in different score groups"),
            })

    if byes > 1:
        errors.append({"code": "MULTIPLE_BYES", "params": {},
                       "message": "A round may have at most one bye"})
    if byes == 1:
        bye_id = next(
            (m["player1_id"] for m in pairings if m.get("player2_id") is None), None
        )
        if bye_id is not None and bye_id in had_bye:
            warnings.append({"code": "REPEAT_BYE", "params": {"id": bye_id},
                            "message": f"Player {bye_id} already had a bye"})
    for p in norm:
        if p["player_id"] not in seen:
            errors.append({"code": "UNPAIRED_PLAYER", "params": {"id": p["player_id"]},
                           "message": f"Player {p['player_id']} is not paired in this round"})

    return {"ok": len(errors) == 0, "errors": errors, "warnings": warnings}
