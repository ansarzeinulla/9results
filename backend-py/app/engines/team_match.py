"""Team Match pairing engine.

Two levels, in order:

1. Teams are paired against each other Swiss-style. Rather than reimplement
   Swiss, we hand the teams to the active `swiss_rules` engine cast as its
   "players" — team id as the identity, accumulated game points as the score,
   mean roster rating for seeding. Everything that makes Swiss subtle (score
   groups, float-downs, no rematches, bye selection, colour preference) is
   inherited rather than rewritten, and stays inherited as those rules evolve.
2. Each matchup is expanded into boards by walking both lineups in board order.

Pure functions, no database access.

Inputs:
    teams: [{team_id, game_points, mean_rating,
             roster: [{player_id, board_order}]}]
    previous_team_matches: [{round_number, team1_id, team2_id}]
        (team2_id None means team1 had a bye)

Output:
    {"team_matches": [{team1_id, team2_id, match_number,
                       pairings: [{player1_id, player2_id, board_number}]}]}
    team2_id None = the team sat this round out; its pairings list is empty.
"""

from .swiss import PairingError
from .swiss_rules import generate_swiss_round


def _lineup(t):
    """The roster in board order, rejecting anything that would quietly drop a
    player from the pairing."""
    roster = t.get("roster") or []
    if not roster:
        raise PairingError(f"Team {t['team_id']} has no players")

    seats = [p.get("board_order") for p in roster]
    if any(s is None for s in seats):
        raise PairingError(
            f"Every player in team {t['team_id']} needs a board order"
        )
    if len(set(seats)) != len(seats):
        raise PairingError(
            f"Team {t['team_id']} has two players on the same board order"
        )
    return sorted(roster, key=lambda p: p["board_order"])


def generate_team_match_round(teams, previous_team_matches, round_number):
    if len(teams) < 2:
        raise PairingError("Need at least 2 teams to pair a round")

    lineups = {t["team_id"]: _lineup(t) for t in teams}

    sizes = {len(r) for r in lineups.values()}
    if len(sizes) > 1:
        raise PairingError(
            "Every team must have the same number of boards "
            f"(found {sorted(sizes)})"
        )

    # Level 1: pair the teams, borrowing the individual Swiss engine wholesale.
    as_players = [
        {
            "player_id": t["team_id"],
            "current_points": t.get("game_points") or 0,
            "current_rating": t.get("mean_rating") or 0,
        }
        for t in teams
    ]
    history = [
        {
            "round_number": m["round_number"],
            "player1_id": m["team1_id"],
            "player2_id": m["team2_id"],
            "result": m.get("result"),
        }
        for m in previous_team_matches
    ]
    paired = generate_swiss_round(as_players, history, round_number)

    # Level 2: expand each matchup into boards.
    team_matches = []
    for i, m in enumerate(paired["pairings"], start=1):
        team1_id, team2_id = m["player1_id"], m["player2_id"]
        entry = {
            "team1_id": team1_id,
            "team2_id": team2_id,
            "match_number": i,
            "pairings": [],
        }
        if team2_id is not None:
            for board, (a, b) in enumerate(
                zip(lineups[team1_id], lineups[team2_id]), start=1
            ):
                # The first-listed team takes white on odd boards and black on
                # even, so neither side collects every white.
                p1, p2 = (a, b) if board % 2 == 1 else (b, a)
                entry["pairings"].append(
                    {
                        "player1_id": p1["player_id"],
                        "player2_id": p2["player_id"],
                        "board_number": board,
                    }
                )
        team_matches.append(entry)

    return {"team_matches": team_matches}
