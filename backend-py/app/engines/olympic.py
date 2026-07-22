"""Olympic (Knockout) pairing engine.

Single elimination.
"""

def generate_olympic_round(raw_players, previous_matches, round_number):
    # Identify active players
    if round_number == 1:
        # All players are active
        active_players = sorted(raw_players, key=lambda p: p.get("current_rating", 0), reverse=True)
    else:
        # Find winners of the previous round
        # previous_matches contains results for all rounds. We need winners of round_number - 1.
        prev_round_matches = [m for m in previous_matches if m["round_number"] == round_number - 1]
        
        winners = []
        for m in prev_round_matches:
            if m["result"] == "1-0":
                winners.append(next(p for p in raw_players if p["player_id"] == m["player1_id"]))
            elif m["result"] == "0-1":
                winners.append(next(p for p in raw_players if p["player_id"] == m["player2_id"]))
            elif m["result"] == "1BYE":
                winners.append(next(p for p in raw_players if p["player_id"] == m["player1_id"]))
        
        # Sort winners by rating to maintain seeding
        active_players = sorted(winners, key=lambda p: p.get("current_rating", 0), reverse=True)

    n = len(active_players)
    if n < 2:
        # Tournament finished or not enough players
        return {"pairings": []}

    pairings = []
    
    # If odd number of players, top seed gets a bye
    if n % 2 != 0:
        bye_player = active_players[0]
        pairings.append({
            "player1_id": bye_player["player_id"],
            "player2_id": None,
            "board_number": None
        })
        active_players = active_players[1:]
        n -= 1

    # Pair 1 vs N, 2 vs N-1...
    for i in range(n // 2):
        p1 = active_players[i]
        p2 = active_players[-(i + 1)]
        pairings.append({
            "player1_id": p1["player_id"],
            "player2_id": p2["player_id"],
            "board_number": i + 1
        })
            
    return {"pairings": pairings}
