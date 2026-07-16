/**
 * Swiss pairing engine (FIDE Dutch style, adapted for togyzkumalak).
 * Pure functions, no database access — the only pairing system in the app.
 *
 * Inputs:
 *   players: [{ player_id, current_points, current_rating }]
 *   previousMatches: [{ round_number, player1_id, player2_id, result }]
 *     (player2_id === null means player1 had a bye)
 *
 * Output of generateSwissRound: {
 *   pairings: [{ player1_id, player2_id, board_number }],
 *     // player2_id null = bye (board_number null)
 * }
 *
 * Rules implemented:
 *   - Round 1: sort by rating, split into top/bottom halves, S1[i] vs S2[i].
 *   - Later rounds: pair within score groups top-down using the fold
 *     (S1 vs S2) preference; players who cannot be paired in their group
 *     float down to the next one. Backtracking guarantees a full pairing
 *     whenever one exists with no repeated opponents.
 *   - No two players ever meet twice.
 *   - Sides balanced: the player who has sat on side 1 (player1) less often
 *     gets side 1; ties broken by alternating from the previous round.
 *   - Bye goes to the lowest-scoring, lowest-rated player who has not had
 *     one yet; emitted as { player2_id: null }.
 *   - Board numbers: pairings ordered by (higher pair score, higher pair
 *     rating), boards numbered from 1. The bye row carries no board.
 */

export class PairingError extends Error {}

function buildHistory(previousMatches) {
  const played = new Set();
  const hadBye = new Set();
  const sideBalance = new Map(); // times as player1 minus times as player2
  const lastSide = new Map(); // 1 or 2 in the most recent round played

  const ordered = [...previousMatches].sort((a, b) => a.round_number - b.round_number);
  for (const m of ordered) {
    if (m.player2_id == null) {
      hadBye.add(m.player1_id);
      continue;
    }
    played.add(`${m.player1_id}:${m.player2_id}`);
    played.add(`${m.player2_id}:${m.player1_id}`);
    sideBalance.set(m.player1_id, (sideBalance.get(m.player1_id) || 0) + 1);
    sideBalance.set(m.player2_id, (sideBalance.get(m.player2_id) || 0) - 1);
    lastSide.set(m.player1_id, 1);
    lastSide.set(m.player2_id, 2);
  }
  return { played, hadBye, sideBalance, lastSide };
}

const byStanding = (a, b) =>
  b.current_points - a.current_points || b.current_rating - a.current_rating;

/**
 * For the leader of the remaining list, build the candidate order:
 * same-score opponents starting at the fold (opposite half of the group),
 * then the rest of the group, then lower score groups in rank order.
 */
function candidateOrder(leader, rest) {
  const group = rest.filter((p) => p.current_points === leader.current_points);
  const below = rest.filter((p) => p.current_points !== leader.current_points);
  const fold = Math.floor(group.length / 2);
  return [...group.slice(fold), ...group.slice(0, fold), ...below];
}

function pairRecursive(remaining, played, pairings) {
  if (remaining.length === 0) return true;
  const [leader, ...rest] = remaining;
  for (const opponent of candidateOrder(leader, rest)) {
    if (played.has(`${leader.player_id}:${opponent.player_id}`)) continue;
    pairings.push([leader, opponent]);
    const next = rest.filter((p) => p !== opponent);
    if (pairRecursive(next, played, pairings)) return true;
    pairings.pop();
  }
  return false;
}

/** Decide which player of a pair sits on side 1 (stored as player1). */
function orderSides(a, b, { sideBalance, lastSide }) {
  const balA = sideBalance.get(a.player_id) || 0;
  const balB = sideBalance.get(b.player_id) || 0;
  if (balA !== balB) return balA < balB ? [a, b] : [b, a];
  const lastA = lastSide.get(a.player_id);
  const lastB = lastSide.get(b.player_id);
  if (lastA !== lastB) return lastA === 2 ? [a, b] : [b, a];
  // No history to distinguish: higher-ranked player takes side 1.
  return byStanding(a, b) <= 0 ? [a, b] : [b, a];
}

export function generateSwissRound(players, previousMatches, roundNumber) {
  if (players.length < 2) throw new PairingError('Need at least 2 players to pair a round');

  const history = buildHistory(previousMatches);
  let ranked = [...players].sort(byStanding);

  // Bye: lowest-standing player without a previous bye (fallback: lowest overall).
  let byePlayer = null;
  if (ranked.length % 2 === 1) {
    byePlayer =
      [...ranked].reverse().find((p) => !history.hadBye.has(p.player_id)) ??
      ranked[ranked.length - 1];
    ranked = ranked.filter((p) => p !== byePlayer);
  }

  let rawPairs = [];
  if (roundNumber === 1) {
    // Fold the whole field: seed i plays seed i + n/2.
    const half = ranked.length / 2;
    for (let i = 0; i < half; i++) rawPairs.push([ranked[i], ranked[i + half]]);
  } else if (!pairRecursive(ranked, history.played, rawPairs)) {
    throw new PairingError(
      'No valid pairing exists — all remaining opponent combinations have already been played'
    );
  }

  // Board order: strongest pair first (score, then rating).
  const pairKey = ([a, b]) => [
    Math.max(a.current_points, b.current_points),
    a.current_points + b.current_points,
    Math.max(a.current_rating, b.current_rating),
  ];
  rawPairs.sort((p, q) => {
    const [ps, pt, pr] = pairKey(p);
    const [qs, qt, qr] = pairKey(q);
    return qs - ps || qt - pt || qr - pr;
  });

  const pairings = rawPairs.map((pair, i) => {
    // Round 1 has no side history: alternate sides down the boards so half
    // the field starts on each side. Later rounds balance from history.
    const [p1, p2] =
      roundNumber === 1
        ? i % 2 === 0
          ? pair
          : [pair[1], pair[0]]
        : orderSides(pair[0], pair[1], history);
    return { player1_id: p1.player_id, player2_id: p2.player_id, board_number: i + 1 };
  });

  if (byePlayer) {
    pairings.push({ player1_id: byePlayer.player_id, player2_id: null, board_number: null });
  }
  return { pairings };
}
