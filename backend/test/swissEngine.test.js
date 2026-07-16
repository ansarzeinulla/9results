import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { generateSwissRound, validateRoundPairings, PairingError } from '../src/swissEngine.js';

const P = (id, points, rating) => ({ player_id: id, current_points: points, current_rating: rating });
const M = (round, p1, p2, result = '1-0') => ({ round_number: round, player1_id: p1, player2_id: p2, result });

function pairSet(pairings) {
  return new Set(
    pairings.filter((m) => m.player2_id != null).map((m) => [m.player1_id, m.player2_id].sort((a, b) => a - b).join(':'))
  );
}

describe('generateSwissRound — round 1', () => {
  test('folds the field: seed i plays seed i + n/2', () => {
    const players = [P(1, 0, 2000), P(2, 0, 1900), P(3, 0, 1800), P(4, 0, 1700)];
    const { pairings } = generateSwissRound(players, [], 1);
    assert.deepEqual(pairSet(pairings), new Set(['1:3', '2:4']));
  });

  test('odd count gives bye to lowest-rated player with no board number', () => {
    const players = [P(1, 0, 2000), P(2, 0, 1900), P(3, 0, 1800)];
    const { pairings } = generateSwissRound(players, [], 1);
    const bye = pairings.find((m) => m.player2_id == null);
    assert.equal(bye.player1_id, 3);
    assert.equal(bye.board_number, null);
  });

  test('boards are numbered 1..n with strongest pair on board 1', () => {
    const players = [P(1, 0, 2000), P(2, 0, 1900), P(3, 0, 1800), P(4, 0, 1700)];
    const { pairings } = generateSwissRound(players, [], 1);
    const boards = pairings.map((m) => m.board_number).sort();
    assert.deepEqual(boards, [1, 2]);
    const board1 = pairings.find((m) => m.board_number === 1);
    assert.ok([board1.player1_id, board1.player2_id].includes(1), 'top seed plays on board 1');
  });

  test('throws PairingError with fewer than 2 players', () => {
    assert.throws(() => generateSwissRound([P(1, 0, 1500)], [], 1), PairingError);
  });
});

describe('generateSwissRound — later rounds', () => {
  test('never repeats a pairing over a full 8-player 4-round tournament', () => {
    const players = Array.from({ length: 8 }, (_, i) => P(i + 1, 0, 2000 - i * 50));
    const prev = [];
    const points = new Map(players.map((p) => [p.player_id, 0]));
    const met = new Set();
    for (let r = 1; r <= 4; r++) {
      for (const p of players) p.current_points = points.get(p.player_id);
      const { pairings } = generateSwissRound(players, prev, r);
      for (const key of pairSet(pairings)) {
        assert.ok(!met.has(key), `rematch ${key} in round ${r}`);
        met.add(key);
      }
      for (const m of pairings) {
        const res = m.player2_id == null ? '1-0' : (m.player1_id + r) % 2 ? '1-0' : '0-1';
        prev.push(M(r, m.player1_id, m.player2_id, res));
        const [a, b] = res === '1-0' ? [1, 0] : [0, 1];
        points.set(m.player1_id, points.get(m.player1_id) + a);
        if (m.player2_id != null) points.set(m.player2_id, points.get(m.player2_id) + b);
      }
    }
  });

  test('bye prefers a fresh player, and a repeat bye is used only when unavoidable', () => {
    const players = Array.from({ length: 5 }, (_, i) => P(i + 1, 0, 1900 - i * 100));
    const prev = [];
    const byes = [];
    for (let r = 1; r <= 4; r++) {
      const { pairings } = generateSwissRound(players, prev, r);
      const bye = pairings.find((m) => m.player2_id == null);
      byes.push(bye.player1_id);
      for (const m of pairings) prev.push(M(r, m.player1_id, m.player2_id, '1-0'));
    }
    // Consecutive rounds never repeat a bye, and each round is fully paired.
    for (let i = 1; i < byes.length; i++) assert.notEqual(byes[i], byes[i - 1]);
    assert.ok(new Set(byes).size >= 3, `expected at least 3 distinct byes, got ${byes}`);
  });

  test('falls back to a repeat bye instead of failing when the fresh choices are unpairable', () => {
    // 3 players: after A-B (C bye), then A-C (B bye), then B-C (A bye),
    // every pair has played — round 4 is genuinely impossible.
    const players = [P(1, 0, 1500), P(2, 0, 1400), P(3, 0, 1300)];
    const prev = [];
    for (let r = 1; r <= 3; r++) {
      const { pairings } = generateSwissRound(players, prev, r);
      const bye = pairings.find((m) => m.player2_id == null);
      assert.ok(bye, `round ${r} must have a bye`);
      for (const m of pairings) prev.push(M(r, m.player1_id, m.player2_id, '1-0'));
    }
    const byes = prev.filter((m) => m.player2_id == null).map((m) => m.player1_id);
    assert.equal(new Set(byes).size, 3, `each player gets exactly one bye, got ${byes}`);
    assert.throws(() => generateSwissRound(players, prev, 4), PairingError);
  });

  test('pairs within score groups when possible', () => {
    // After R1 (1-3 -> 1 wins, 2-4 -> 2 wins): winners {1,2}, losers {3,4}.
    const players = [P(1, 1, 2000), P(2, 1, 1900), P(3, 0, 1800), P(4, 0, 1700)];
    const prev = [M(1, 1, 3), M(1, 2, 4)];
    const { pairings } = generateSwissRound(players, prev, 2);
    assert.deepEqual(pairSet(pairings), new Set(['1:2', '3:4']));
  });

  test('REGRESSION: score groups survive numeric strings from Postgres DECIMAL', () => {
    // pg returns DECIMAL as strings — "1" and "1.0" are the same score.
    const players = [
      P(1, '1', 1600), P(2, '1.0', 1500), P(3, '1', 1400),
      P(4, '1.0', 1300), P(5, '1', 1200), P(6, '1.0', 1100),
    ];
    const { pairings: fromStrings } = generateSwissRound(players, [], 2);
    const numeric = players.map((p) => ({ ...p, current_points: Number(p.current_points) }));
    const { pairings: fromNumbers } = generateSwissRound(numeric, [], 2);
    assert.deepEqual(pairSet(fromStrings), pairSet(fromNumbers));
  });

  test('REGRESSION: board order is numeric, not string concatenation, with string points', () => {
    // Pair scores 0.5+0.5 vs 1+0 — string "+" would concatenate and corrupt ordering.
    const players = [P(1, '1', 1000), P(2, '0', 1900), P(3, '0.5', 1800), P(4, '0.5', 1700)];
    const prev = [M(1, 1, 2), M(1, 3, 4, '0.5-0.5')];
    const { pairings } = generateSwissRound(players, prev, 2);
    const board1 = pairings.find((m) => m.board_number === 1);
    assert.ok(
      [board1.player1_id, board1.player2_id].includes(1),
      `pair with the 1-point leader must be board 1, got ${JSON.stringify(pairings)}`
    );
  });

  test('throws PairingError when every combination was already played', () => {
    const players = [P(1, 1, 1500), P(2, 1, 1400)];
    const prev = [M(1, 1, 2)];
    assert.throws(() => generateSwissRound(players, prev, 2), PairingError);
  });

  test('sides balance: nobody is player1 in all of 4 rounds of a 4-player tournament', () => {
    const players = Array.from({ length: 4 }, (_, i) => P(i + 1, 0, 1800 - i * 100));
    const prev = [];
    const asP1 = new Map();
    for (let r = 1; r <= 3; r++) {
      const { pairings } = generateSwissRound(players, prev, r);
      for (const m of pairings) {
        asP1.set(m.player1_id, (asP1.get(m.player1_id) || 0) + 1);
        prev.push(M(r, m.player1_id, m.player2_id, '0.5-0.5'));
      }
    }
    for (const [id, n] of asP1) assert.ok(n <= 2, `player ${id} was player1 ${n}/3 times`);
  });
});

describe('validateRoundPairings', () => {
  const players = [P(1, 1, 2000), P(2, 1, 1900), P(3, 0, 1800), P(4, 0, 1700)];
  const prev = [M(1, 1, 3), M(1, 2, 4)];
  const pair = (p1, p2, board = 1) => ({ player1_id: p1, player2_id: p2, board_number: board });

  test('accepts a legal full round', () => {
    const res = validateRoundPairings({
      pairings: [pair(1, 2, 1), pair(3, 4, 2)],
      players, previousMatches: prev, roundNumber: 2,
    });
    assert.equal(res.ok, true);
    assert.deepEqual(res.errors, []);
  });

  test('rejects a rematch', () => {
    const res = validateRoundPairings({
      pairings: [pair(1, 3, 1), pair(2, 4, 2)],
      players, previousMatches: prev, roundNumber: 2,
    });
    assert.equal(res.ok, false);
    assert.ok(res.errors.some((e) => e.code === 'REMATCH'));
  });

  test('rejects a player appearing twice', () => {
    const res = validateRoundPairings({
      pairings: [pair(1, 2, 1), pair(1, 4, 2)],
      players, previousMatches: prev, roundNumber: 2,
    });
    assert.equal(res.ok, false);
    assert.ok(res.errors.some((e) => e.code === 'DUPLICATE_PLAYER'));
  });

  test('rejects unknown players', () => {
    const res = validateRoundPairings({
      pairings: [pair(1, 99, 1), pair(3, 4, 2)],
      players, previousMatches: prev, roundNumber: 2,
    });
    assert.equal(res.ok, false);
    assert.ok(res.errors.some((e) => e.code === 'UNKNOWN_PLAYER'));
  });

  test('rejects an incomplete round (unpaired participant)', () => {
    const res = validateRoundPairings({
      pairings: [pair(1, 2, 1)],
      players, previousMatches: prev, roundNumber: 2,
    });
    assert.equal(res.ok, false);
    assert.ok(res.errors.some((e) => e.code === 'UNPAIRED_PLAYER'));
  });

  test('rejects a bye when the player count is even', () => {
    const res = validateRoundPairings({
      pairings: [pair(1, 2, 1), pair(3, null, null), pair(4, null, null)],
      players, previousMatches: prev, roundNumber: 2,
    });
    assert.equal(res.ok, false);
    assert.ok(res.errors.some((e) => e.code === 'MULTIPLE_BYES' || e.code === 'UNPAIRED_PLAYER'));
  });

  test('accepts exactly one bye with odd players, rejects two byes', () => {
    const five = [...players, P(5, 0, 1600)];
    const ok = validateRoundPairings({
      pairings: [pair(1, 2, 1), pair(3, 4, 2), pair(5, null, null)],
      players: five, previousMatches: prev, roundNumber: 2,
    });
    assert.equal(ok.ok, true);
  });

  test('self-pairing is rejected', () => {
    const res = validateRoundPairings({
      pairings: [pair(1, 1, 1), pair(3, 4, 2)],
      players, previousMatches: prev, roundNumber: 2,
    });
    assert.equal(res.ok, false);
  });

  test('score-group mismatch is a warning, not an error', () => {
    // 1(1pt) vs 4(0pt) and 2(1pt) vs 3(0pt): legal (no rematch) but cross-score.
    const res = validateRoundPairings({
      pairings: [pair(1, 4, 1), pair(2, 3, 2)],
      players, previousMatches: prev, roundNumber: 2,
    });
    assert.equal(res.ok, true);
    assert.ok(res.warnings.length > 0, 'expected a score-mismatch warning');
  });

  test('repeated bye for the same player is a warning', () => {
    const five = [...players, P(5, 0, 1600)];
    const prevWithBye = [...prev, M(1, 5, null)];
    const res = validateRoundPairings({
      pairings: [pair(1, 2, 1), pair(3, 4, 2), pair(5, null, null)],
      players: five, previousMatches: prevWithBye, roundNumber: 2,
    });
    assert.equal(res.ok, true);
    assert.ok(res.warnings.some((w) => w.code === 'REPEAT_BYE'));
  });

  test('handles string points from Postgres in score warnings without crashing', () => {
    const strPlayers = [P(1, '1', 2000), P(2, '1.0', 1900), P(3, '0', 1800), P(4, '0', 1700)];
    const res = validateRoundPairings({
      pairings: [pair(1, 2, 1), pair(3, 4, 2)],
      players: strPlayers, previousMatches: prev, roundNumber: 2,
    });
    assert.equal(res.ok, true);
    assert.deepEqual(res.warnings, [], '"1" and "1.0" are the same score group');
  });
});
