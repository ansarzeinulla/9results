"""Round Robin pairing engine.

Standard circle method for round-robin tournaments.
"""

def generate_round_robin_round(raw_players, previous_matches, round_number):
    players = [p["player_id"] for p in raw_players]
    n = len(players)
    if n < 2:
        raise ValueError("Need at least 2 players")

    # If odd number of players, add a dummy player for the bye
    if n % 2 != 0:
        players.append(None)
        n += 1

    # Circle method
    # Fix player 0, rotate others
    # Round 1 to n-1
    if round_number < 1 or round_number >= n:
        return {"pairings": []}

    # Create the list of players to rotate
    # We fix players[0] and rotate players[1:]
    fixed = players[0]
    others = players[1:]
    
    # Rotate for the current round
    # The rotation index is (round_number - 1)
    rot = (round_number - 1) % (n - 1)
    rotated = others[rot:] + others[:rot]
    
    # Pairings
    # Player 0 plays the player at the current rotation index
    # Others pair up: (1st in rotated) vs (last in rotated), etc.
    current_round_players = [fixed] + rotated
    
    pairings = []
    # Pair fixed player with the one at the rotation index
    p1 = current_round_players[0]
    p2 = current_round_players[n // 2] # This is the one opposite in the circle
    
    # Actually, the standard circle method:
    # Round 1: 0 plays n-1, 1 plays n-2, etc.
    # Let's use a simpler approach:
    # For round r, pair i and j if (i + j) % (n-1) == r-1 (with 0 fixed)
    
    # Let's use the standard circle method implementation:
    # Players 0..n-1
    # Round r (0-indexed):
    # 0 plays r
    # 1 plays r-1, 2 plays r-2 ...
    
    # Let's re-implement simply:
    # Players list: [0, 1, 2, ..., n-1]
    # Round r (1-indexed):
    # Pairings:
    # (0, r)
    # (r+1, r-1)
    # (r+2, r-2)
    # ...
    
    # This is easier:
    # For round r (1..n-1):
    # Pairings are (0, r), (r+1, r-1), (r+2, r-2)...
    # All indices mod n-1 (except 0 which is fixed)
    
    # Let's use the rotation method:
    # Players: [0, 1, 2, ..., n-1]
    # Round r:
    # 0 is fixed.
    # Others: [1, 2, ..., n-1]
    # Rotate others by r-1 positions.
    # Pair 0 with the first of rotated.
    # Pair the rest: first half vs second half of rotated.
    
    # Example n=4 (players 0,1,2,3)
    # Round 1:
    # 0 fixed. Others [1,2,3]. Rotate 0 -> [1,2,3].
    # Pair (0, 1), (2, 3)
    # Round 2:
    # Rotate 1 -> [2,3,1].
    # Pair (0, 2), (3, 1)
    # Round 3:
    # Rotate 2 -> [3,1,2].
    # Pair (0, 3), (1, 2)
    
    # This works.
    
    # Implementation:
    # players list is [0, 1, 2, 3]
    # fixed = 0
    # others = [1, 2, 3]
    # round_idx = round_number - 1
    # rotated = others[round_idx:] + others[:round_idx]
    # pairings = [(fixed, rotated[0])]
    # for i in range(1, n//2):
    #     pairings.append((rotated[i], rotated[n-1-i]))
    
    # Wait, n is even here (4).
    # rotated = [1, 2, 3]
    # pairings = [(0, 1), (2, 3)] -> Correct.
    
    # Round 2:
    # rotated = [2, 3, 1]
    # pairings = [(0, 2), (3, 1)] -> Correct.
    
    # Round 3:
    # rotated = [3, 1, 2]
    # pairings = [(0, 3), (1, 2)] -> Correct.
    
    # This looks correct.
    
    round_idx = round_number - 1
    rotated = others[round_idx:] + others[:round_idx]
    
    pairings_list = []
    pairings_list.append((fixed, rotated[0]))
    for i in range(1, n // 2):
        pairings_list.append((rotated[i], rotated[n - 1 - i]))
        
    # Format output
    formatted_pairings = []
    for i, (p1, p2) in enumerate(pairings_list):
        # If either is None (dummy player), it's a bye
        if p1 is None or p2 is None:
            bye_player = p1 if p2 is None else p2
            formatted_pairings.append({
                "player1_id": bye_player,
                "player2_id": None,
                "board_number": None
            })
        else:
            formatted_pairings.append({
                "player1_id": p1,
                "player2_id": p2,
                "board_number": i + 1
            })
            
    return {"pairings": formatted_pairings}
