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

// Postgres returns DECIMAL columns as strings ("2" vs "2.0"), which breaks
// score-group equality and arithmetic — normalize once at the boundary.
function normalize(players) {
  return players.map((p) => ({
    ...p,
    current_points: Number(p.current_points) || 0,
    current_rating: Number(p.current_rating) || 0,
  }));
}

export function generateSwissRound(rawPlayers, previousMatches, roundNumber) {
  const players = normalize(rawPlayers);
  if (players.length < 2) throw new PairingError('Need at least 2 players to pair a round');

  const history = buildHistory(previousMatches);
  const ranked = [...players].sort(byStanding);

  // Bye candidates in preference order: lowest-standing without a previous
  // bye first, then (as a last resort) players who already had one. The bye
  // choice is part of the search — if a preferred bye makes the remaining
  // field unpairable, the next candidate is tried.
  let byeCandidates = [null];
  if (ranked.length % 2 === 1) {
    const fresh = [...ranked].reverse().filter((p) => !history.hadBye.has(p.player_id));
    const repeat = [...ranked].reverse().filter((p) => history.hadBye.has(p.player_id));
    byeCandidates = [...fresh, ...repeat];
  }

  let rawPairs = null;
  let byePlayer = null;
  for (const candidate of byeCandidates) {
    const field = candidate ? ranked.filter((p) => p !== candidate) : ranked;
    const attempt = [];
    let success;
    if (roundNumber === 1) {
      // Fold the whole field: seed i plays seed i + n/2.
      const half = field.length / 2;
      for (let i = 0; i < half; i++) attempt.push([field[i], field[i + half]]);
      success = true;
    } else {
      success = pairRecursive(field, history.played, attempt);
    }
    if (success) {
      rawPairs = attempt;
      byePlayer = candidate;
      break;
    }
  }
  if (!rawPairs) {
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

/**
 * Validate a manually edited round against Swiss laws.
 *
 * Hard errors (block saving): unknown players, a player paired twice or
 * against themselves, participants left unpaired, more than one bye,
 * repeating an opponent from a previous round.
 * Warnings (allowed, surfaced to the arbiter): pairing across score groups,
 * giving a second bye to the same player.
 *
 * Returns { ok, errors: [{code, message}], warnings: [{code, message}] }.
 */
export function validateRoundPairings({ pairings, players: rawPlayers, previousMatches, roundNumber }) {
  const players = normalize(rawPlayers);
  const byId = new Map(players.map((p) => [p.player_id, p]));
  const history = buildHistory(previousMatches);
  const errors = [];
  const warnings = [];

  const seen = new Set();
  const takeSeat = (id) => {
    if (!byId.has(id)) {
      errors.push({ code: 'UNKNOWN_PLAYER', params: { id }, message: `Player ${id} is not in this tournament` });
      return;
    }
    if (seen.has(id)) {
      errors.push({ code: 'DUPLICATE_PLAYER', params: { id }, message: `Player ${id} appears in more than one pair` });
      return;
    }
    seen.add(id);
  };

  let byes = 0;
  for (const m of pairings) {
    if (m.player1_id == null) {
      errors.push({ code: 'UNKNOWN_PLAYER', params: { id: '?' }, message: 'A pair is missing player 1' });
      continue;
    }
    takeSeat(m.player1_id);
    if (m.player2_id == null) {
      byes += 1;
      continue;
    }
    if (m.player2_id === m.player1_id) {
      errors.push({ code: 'DUPLICATE_PLAYER', params: { id: m.player1_id }, message: `Player ${m.player1_id} cannot play themselves` });
      continue;
    }
    takeSeat(m.player2_id);
    if (history.played.has(`${m.player1_id}:${m.player2_id}`)) {
      errors.push({
        code: 'REMATCH',
        params: { a: m.player1_id, b: m.player2_id },
        message: `Players ${m.player1_id} and ${m.player2_id} already played each other`,
      });
    }
    const a = byId.get(m.player1_id);
    const b = byId.get(m.player2_id);
    if (a && b && a.current_points !== b.current_points) {
      warnings.push({
        code: 'SCORE_MISMATCH',
        params: { a: m.player1_id, pa: a.current_points, b: m.player2_id, pb: b.current_points },
        message: `Players ${m.player1_id} (${a.current_points}) and ${m.player2_id} (${b.current_points}) are in different score groups`,
      });
    }
  }

  if (byes > 1) {
    errors.push({ code: 'MULTIPLE_BYES', params: {}, message: 'A round may have at most one bye' });
  }
  if (byes === 1) {
    const byeId = pairings.find((m) => m.player2_id == null)?.player1_id;
    if (byeId != null && history.hadBye.has(byeId)) {
      warnings.push({ code: 'REPEAT_BYE', params: { id: byeId }, message: `Player ${byeId} already had a bye` });
    }
  }
  for (const p of players) {
    if (!seen.has(p.player_id)) {
      errors.push({ code: 'UNPAIRED_PLAYER', params: { id: p.player_id }, message: `Player ${p.player_id} is not paired in this round` });
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}
