/**
 * Pairing engine — pure functions, no database access.
 *
 * Inputs:
 *   players: [{ player_id, current_points, tiebreak_score, current_rating }]
 *   previousMatches: [{ round_number, player1_id, player2_id, result }]
 *     (player2_id === null means player1 had a bye)
 *
 * Output of generateRound: {
 *   pairings: [{ player1_id, player2_id }],   // player2_id null = bye
 * }
 * Throws PairingError with a human-readable message when no round can be generated.
 */

export class PairingError extends Error {}

function playedPairs(previousMatches) {
  const set = new Set();
  for (const m of previousMatches) {
    if (m.player2_id != null) {
      set.add(`${m.player1_id}:${m.player2_id}`);
      set.add(`${m.player2_id}:${m.player1_id}`);
    }
  }
  return set;
}

function byeReceivers(previousMatches) {
  return new Set(previousMatches.filter((m) => m.player2_id == null).map((m) => m.player1_id));
}

function sortByStanding(players) {
  return [...players].sort(
    (a, b) =>
      b.current_points - a.current_points ||
      b.tiebreak_score - a.tiebreak_score ||
      b.current_rating - a.current_rating
  );
}

/**
 * Basic Swiss pairing: sort by points, pair the top player with the highest
 * available opponent they have not played yet. Backtracks when a greedy
 * choice leaves an unpairable tail, so a full pairing is found whenever one
 * exists. With an odd count, the lowest-ranked player without a previous bye
 * sits out (bye).
 */
export function generateSwissRound(players, previousMatches) {
  if (players.length < 2) throw new PairingError('Need at least 2 players to pair a round');

  const played = playedPairs(previousMatches);
  let ranked = sortByStanding(players).map((p) => p.player_id);
  let byePlayer = null;

  if (ranked.length % 2 === 1) {
    const hadBye = byeReceivers(previousMatches);
    // lowest-ranked player who has not had a bye yet; fall back to lowest overall
    byePlayer = [...ranked].reverse().find((id) => !hadBye.has(id)) ?? ranked[ranked.length - 1];
    ranked = ranked.filter((id) => id !== byePlayer);
  }

  const pairings = [];
  if (!pairRecursive(ranked, played, pairings)) {
    throw new PairingError(
      'No valid pairing exists — all remaining opponent combinations have already been played'
    );
  }
  if (byePlayer != null) pairings.push({ player1_id: byePlayer, player2_id: null });
  return { pairings };
}

function pairRecursive(remaining, played, pairings) {
  if (remaining.length === 0) return true;
  const [first, ...rest] = remaining;
  for (let i = 0; i < rest.length; i++) {
    const opponent = rest[i];
    if (played.has(`${first}:${opponent}`)) continue;
    pairings.push({ player1_id: first, player2_id: opponent });
    if (pairRecursive(rest.filter((_, j) => j !== i), played, pairings)) return true;
    pairings.pop();
  }
  return false;
}

/**
 * Round-robin via the standard circle method. Player order is seeded by
 * rating so the schedule is deterministic. With an odd count a null slot is
 * added; whoever draws it gets a bye that round.
 */
export function generateRoundRobinRound(players, roundNumber) {
  if (players.length < 2) throw new PairingError('Need at least 2 players to pair a round');

  const seeds = [...players]
    .sort((a, b) => b.current_rating - a.current_rating)
    .map((p) => p.player_id);
  if (seeds.length % 2 === 1) seeds.push(null); // null = bye slot

  const n = seeds.length;
  const totalRounds = n - 1;
  if (roundNumber > totalRounds) {
    throw new PairingError(`Round-robin with ${players.length} players has only ${totalRounds} rounds`);
  }

  // Circle method: fix seeds[0], rotate the rest (roundNumber - 1) times.
  const rot = [seeds[0], ...rotate(seeds.slice(1), roundNumber - 1)];
  const pairings = [];
  for (let i = 0; i < n / 2; i++) {
    const a = rot[i];
    const b = rot[n - 1 - i];
    if (a === null) pairings.push({ player1_id: b, player2_id: null });
    else if (b === null) pairings.push({ player1_id: a, player2_id: null });
    else pairings.push({ player1_id: a, player2_id: b });
  }
  return { pairings };
}

function rotate(arr, times) {
  const t = times % arr.length;
  return [...arr.slice(-t), ...arr.slice(0, -t)];
}

/** Dispatch on tournament system type. */
export function generateRound({ systemType, players, previousMatches, roundNumber }) {
  return systemType === 'round_robin'
    ? generateRoundRobinRound(players, roundNumber)
    : generateSwissRound(players, previousMatches);
}
