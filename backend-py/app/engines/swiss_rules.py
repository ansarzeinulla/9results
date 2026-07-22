"""Swiss pairing engine implementing the specified ruleset.

This is the active pairing engine used by the organizer routes. It follows the
rules given for the tournament format:

  - the total number of rounds must be odd
  - no draw for seeding: players are seeded by rating (desc), then name (asc)
  - round 1 folds the top half against the bottom half with alternating colors
  - later rounds pair within score groups (highest first); a player who has no
    valid opponent in their group floats down to the next one
  - two players never meet twice, and two players of the same team never meet
  - an odd field gives a bye (+1 point) to the lowest-score, then lowest-rating
    player who has not had a bye yet
  - colors follow each player's preference; when both prefer the same color the
    tie is broken by the parity of the sum of their seed numbers (even sum ->
    white to the larger seed, odd sum -> white to the smaller seed)

Pure functions, no database access. Input/output shapes match the organizer
route: players are dicts, and the result is
{"pairings": [{player1_id (white), player2_id (black), board_number}, ...]}
with a bye emitted as {player1_id, player2_id: None, board_number: None}.
"""
from collections import defaultdict
from dataclasses import dataclass, field

from app.engines.swiss import PairingError


def validate_total_rounds(total_rounds: int) -> None:
    """Rule: the number of rounds must be odd."""
    if total_rounds % 2 == 0:
        raise PairingError("Total number of rounds must be odd")


def wants_white(color_history: list[str]) -> bool:
    """Whether a player prefers white, from their color history ('W'/'B').

    Prefer the color that balances history; when balanced, alternate away from
    the most recent color; with no history, default to white.
    """
    balance = color_history.count("W") - color_history.count("B")
    if balance != 0:
        return balance < 0  # played more black -> wants white
    if color_history:
        return color_history[-1] == "B"
    return True


def choose_white(
    p1_seed: int, p1_wants_white: bool, p2_seed: int, p2_wants_white: bool
) -> bool:
    """Return True if player 1 should take white."""
    if p1_wants_white != p2_wants_white:
        # give each what it wants: p1 is white exactly when p1 wants white
        return p1_wants_white
    # both prefer the same color -> break by seed-sum parity
    if (p1_seed + p2_seed) % 2 == 0:
        return p1_seed > p2_seed  # even sum: white to the larger seed
    return p1_seed < p2_seed  # odd sum: white to the smaller seed


@dataclass
class _Player:
    player_id: str
    rating: float
    points: float
    name: str
    seed_number: int
    team_id: str | None
    played: set = field(default_factory=set)
    colors: list = field(default_factory=list)
    had_bye: bool = False


def _build(raw_players, previous_matches):
    played = {p["player_id"]: set() for p in raw_players}
    colors = {p["player_id"]: [] for p in raw_players}
    had_bye = {p["player_id"]: False for p in raw_players}

    for m in sorted(previous_matches, key=lambda x: x["round_number"]):
        white, black = m["player1_id"], m["player2_id"]
        if black is None:
            if white in had_bye:
                had_bye[white] = True
            continue
        if white in played:
            played[white].add(black)
            colors[white].append("W")
        if black in played:
            played[black].add(white)
            colors[black].append("B")

    players = []
    for p in raw_players:
        pid = p["player_id"]
        players.append(
            _Player(
                player_id=pid,
                rating=float(p.get("current_rating") or 0),
                points=float(p.get("current_points") or 0),
                name=str(p.get("name") or pid),
                seed_number=p.get("seed_number") or 0,
                team_id=p.get("team_id"),
                played=played[pid],
                colors=colors[pid],
                had_bye=had_bye[pid],
            )
        )

    # Assign seeds if any are missing: rating desc, then name asc.
    if any(p.seed_number == 0 for p in players):
        for i, p in enumerate(sorted(players, key=lambda x: (-x.rating, x.name))):
            p.seed_number = i + 1
    return players


def _pick_bye(players):
    eligible = [p for p in players if not p.had_bye] or list(players)
    return sorted(eligible, key=lambda p: (p.points, p.rating))[0]


def _find_opponent(p1, group):
    for p2 in group:
        if p2.player_id in p1.played:
            continue
        if p1.team_id is not None and p1.team_id == p2.team_id:
            continue
        return p2
    return None


def _colors(p1, p2):
    p1_white = choose_white(
        p1.seed_number, wants_white(p1.colors),
        p2.seed_number, wants_white(p2.colors),
    )
    return (p1, p2) if p1_white else (p2, p1)


def _separate_team_mates(g1, g2):
    """Folding the halves together can seat two players of the same team across
    the board from each other. The same-team rule holds in round 1 too, so swap
    partners within the bottom half until no pair is a team-mate pair."""
    for i in range(len(g1)):
        if g1[i].team_id is None or g1[i].team_id != g2[i].team_id:
            continue
        for j in range(len(g2)):
            # Both the pair being fixed and the pair being borrowed from must
            # come out clean, otherwise the swap just moves the clash.
            if j == i:
                continue
            if g1[i].team_id != g2[j].team_id and g1[j].team_id != g2[i].team_id:
                g2[i], g2[j] = g2[j], g2[i]
                break
        else:
            raise PairingError(
                "No valid pairing exists — team-mates cannot be kept apart"
            )
    return g2


def _first_round(players):
    ordered = sorted(players, key=lambda p: p.seed_number)
    bye = None
    if len(ordered) % 2 == 1:
        bye = _pick_bye(ordered)
        ordered = [p for p in ordered if p is not bye]
    half = len(ordered) // 2
    g1, g2 = ordered[:half], ordered[half:]
    g2 = _separate_team_mates(g1, g2)
    pairs = []
    for i in range(half):
        p1, p2 = g1[i], g2[i]
        # alternate: odd board (1,3,...) -> top-half player white
        pairs.append((p1, p2) if (i + 1) % 2 != 0 else (p2, p1))
    return pairs, bye


def _next_round(players):
    bye = None
    field_players = list(players)
    if len(field_players) % 2 == 1:
        bye = _pick_bye(field_players)
        field_players = [p for p in field_players if p is not bye]

    groups = defaultdict(list)
    for p in field_players:
        groups[p.points].append(p)

    pairs = []
    carry = []
    for score in sorted(groups.keys(), reverse=True):
        pool = carry + sorted(groups[score], key=lambda p: p.seed_number)
        carry = []
        remaining = list(pool)
        while remaining:
            p1 = remaining.pop(0)
            opponent = _find_opponent(p1, remaining)
            if opponent is None:
                carry.append(p1)  # float down to the next score group
                continue
            remaining.remove(opponent)
            pairs.append(_colors(p1, opponent))

    if carry:
        raise PairingError(
            "No valid pairing exists — floated players could not be paired"
        )
    return pairs, bye


def generate_swiss_round(raw_players, previous_matches, round_number):
    players = _build(raw_players, previous_matches)
    if len(players) < 2:
        raise PairingError("Need at least 2 players to pair a round")

    pairs, bye = (
        _first_round(players) if round_number == 1 else _next_round(players)
    )

    pairings = [
        {"player1_id": w.player_id, "player2_id": b.player_id, "board_number": i + 1}
        for i, (w, b) in enumerate(pairs)
    ]
    if bye is not None:
        pairings.append(
            {"player1_id": bye.player_id, "player2_id": None, "board_number": None}
        )
    return {"pairings": pairings}
