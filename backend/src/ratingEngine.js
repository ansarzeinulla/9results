/**
 * Elo rating calculation — pure function, no database access.
 *
 * Standard FIDE-style Elo: new rating = old rating + K * (result - expected)
 * where expected = 1 / (1 + 10^((opp_rating - own_rating) / 400))
 *
 * Inputs:
 *   rating1, rating2: current ratings
 *   result: 1 (player 1 wins), 0.5 (draw), 0 (player 1 loses)
 *   kFactor: default 20 (can be overridden)
 *
 * Output: { rating1_new, rating2_new }
 */

export function calculateElo(rating1, rating2, result, kFactor = 20) {
  const expected1 = 1 / (1 + Math.pow(10, (rating2 - rating1) / 400));
  const expected2 = 1 - expected1;

  const rating1_new = Math.round(rating1 + kFactor * (result - expected1));
  const rating2_new = Math.round(rating2 + kFactor * ((1 - result) - expected2));

  return { rating1_new, rating2_new };
}

/**
 * Finalize a tournament: loop matches, compute Elo changes for all players,
 * return deltas keyed by player_id. Ignores byes (player2_id = null).
 *
 * Inputs:
 *   players: [{ player_id, current_rating }] (map or array)
 *   matches: [{ player1_id, player2_id, result }]
 *   kFactor: default 20
 *
 * Output: { player_id: rating_delta, ... }
 */
export function calculateTournamentRatings(players, matches, kFactor = 20) {
  const playerMap = Array.isArray(players)
    ? Object.fromEntries(players.map((p) => [p.player_id, p.current_rating]))
    : players;

  const deltas = {};
  for (const m of matches) {
    if (!m.player2_id || !m.result) continue; // skip byes and unplayed
    const r1 = playerMap[m.player1_id];
    const r2 = playerMap[m.player2_id];
    if (!r1 || !r2) continue;

    // Parse result: "1-0", "0-1", "0.5-0.5" to numeric
    const resultNum =
      m.result === '1-0' ? 1 : m.result === '0-1' ? 0 : m.result === '0.5-0.5' ? 0.5 : null;
    if (resultNum == null) continue;

    const { rating1_new, rating2_new } = calculateElo(r1, r2, resultNum, kFactor);
    deltas[m.player1_id] = (deltas[m.player1_id] ?? 0) + (rating1_new - r1);
    deltas[m.player2_id] = (deltas[m.player2_id] ?? 0) + (rating2_new - r2);
    playerMap[m.player1_id] = rating1_new;
    playerMap[m.player2_id] = rating2_new;
  }
  return deltas;
}
