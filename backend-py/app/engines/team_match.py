"""Team Match pairing engine.

Pairs teams against each other, then pairs players within those teams.
"""

def generate_team_match_round(raw_players, previous_matches, round_number):
    # Group players by team_id
    teams = {}
    for p in raw_players:
        team_id = p.get("team_id")
        if team_id:
            if team_id not in teams:
                teams[team_id] = []
            teams[team_id].append(p)
    
    team_ids = list(teams.keys())
    if len(team_ids) < 2:
        return {"pairings": []}

    # Simple pairing: 1st team vs 2nd team, 3rd vs 4th...
    # In a real system, this would use a Swiss or Round Robin engine for teams.
    # For now, we just pair the first two teams found.
    team1_id = team_ids[0]
    team2_id = team_ids[1]
    
    team1_players = sorted(teams[team1_id], key=lambda p: p.get("current_rating", 0), reverse=True)
    team2_players = sorted(teams[team2_id], key=lambda p: p.get("current_rating", 0), reverse=True)
    
    pairings = []
    # Pair players by board order (1 vs 1, 2 vs 2, etc.)
    for i in range(min(len(team1_players), len(team2_players))):
        pairings.append({
            "player1_id": team1_players[i]["player_id"],
            "player2_id": team2_players[i]["player_id"],
            "board_number": i + 1
        })
            
    return {"pairings": pairings}
