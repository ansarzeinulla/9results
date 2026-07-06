import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { generateRound, PairingError } from '../pairingEngine.js';
import { calculateTournamentRatings } from '../ratingEngine.js';

const router = Router();

const POINTS = {
  '1-0': [1, 0],
  '0-1': [0, 1],
  '0.5-0.5': [0.5, 0.5],
  '0-0': [0, 0],
  '+--': [1, 0],
  '--+': [0, 1],
  '=-=': [0, 0],
};

async function ownedTournament(req, res) {
  const t = await db.get('SELECT * FROM tournaments WHERE id = $1', [req.params.id]);
  if (!t) {
    res.status(404).json({ error: 'Tournament not found' });
    return null;
  }
  if (t.organizer_id !== req.user.id) {
    res.status(403).json({ error: 'Not your tournament' });
    return null;
  }
  return t;
}

router.get('/my/tournaments', requireAuth, async (req, res) => {
  const rows = await db.all(
    `
    SELECT t.*, COUNT(tp.id) AS player_count
    FROM tournaments t LEFT JOIN tournament_players tp ON tp.tournament_id = t.id
    WHERE t.organizer_id = $1 GROUP BY t.id ORDER BY t.id DESC
    `,
    [req.user.id]
  );
  res.json(rows);
});

router.post('/tournaments', requireAuth, async (req, res) => {
  const { name, location, system_type } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name is required' });
  const type = system_type === 'round_robin' ? 'round_robin' : 'swiss';
  const result = await db.run(
    'INSERT INTO tournaments (name, location, system_type, organizer_id) VALUES ($1, $2, $3, $4) RETURNING *',
    [name, location || null, type, req.user.id]
  );
  res.status(201).json(result.rows[0]);
});

router.put('/tournaments/:id', requireAuth, async (req, res) => {
  const t = await ownedTournament(req, res);
  if (!t) return;
  const { name, location, system_type, status } = req.body || {};
  const next = {
    name: name ?? t.name,
    location: location ?? t.location,
    system_type: ['swiss', 'round_robin'].includes(system_type) ? system_type : t.system_type,
    status: ['setup', 'ongoing', 'finished'].includes(status) ? status : t.status,
  };

  // Finish tournament and apply ratings exactly once
  if (next.status === 'finished' && t.status !== 'finished') {
    await applyRatings(t.id);
  }

  const result = await db.run(
    'UPDATE tournaments SET name = $1, location = $2, system_type = $3, status = $4 WHERE id = $5 RETURNING *',
    [next.name, next.location, next.system_type, next.status, t.id]
  );
  res.json(result.rows[0]);
});

router.post('/tournaments/:id/add-player', requireAuth, async (req, res) => {
  const t = await ownedTournament(req, res);
  if (!t) return;
  const { player_id } = req.body || {};
  const player = await db.get('SELECT id FROM players WHERE id = $1', [player_id]);
  if (!player) return res.status(400).json({ error: 'Unknown player_id' });
  try {
    await db.run('INSERT INTO tournament_players (tournament_id, player_id) VALUES ($1, $2)', [t.id, player_id]);
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Player already in tournament' });
    throw e;
  }
  res.status(201).json({ ok: true });
});

router.post('/tournaments/:id/matches', requireAuth, async (req, res) => {
  const t = await ownedTournament(req, res);
  if (!t) return;
  const { round_number, player1_id, player2_id } = req.body || {};
  if (!round_number || !player1_id) {
    return res.status(400).json({ error: 'round_number and player1_id are required' });
  }
  const inTournament = await db.get(
    'SELECT 1 FROM tournament_players WHERE tournament_id = $1 AND player_id = $2',
    [t.id, player1_id]
  );
  if (!inTournament) return res.status(400).json({ error: 'Player1 not in tournament' });
  if (player2_id) {
    const inT2 = await db.get(
      'SELECT 1 FROM tournament_players WHERE tournament_id = $1 AND player_id = $2',
      [t.id, player2_id]
    );
    if (!inT2) return res.status(400).json({ error: 'Player2 not in tournament' });
  }

  const result = await db.run(
    'INSERT INTO matches (tournament_id, round_number, player1_id, player2_id) VALUES ($1, $2, $3, $4) RETURNING *',
    [t.id, round_number, player1_id, player2_id || null]
  );
  res.status(201).json(result.rows[0]);
});

const submitResult = db.transaction(async (tournamentId, match, result) => {
  // Reverse previously applied points if the match already had a result
  if (match.result) {
    const [oldP1, oldP2] = POINTS[match.result];
    await db.run(
      'UPDATE tournament_players SET current_points = current_points - $1 WHERE tournament_id = $2 AND player_id = $3',
      [oldP1, tournamentId, match.player1_id]
    );
    if (match.player2_id) {
      await db.run(
        'UPDATE tournament_players SET current_points = current_points - $1 WHERE tournament_id = $2 AND player_id = $3',
        [oldP2, tournamentId, match.player2_id]
      );
    }
  }
  const [p1, p2] = POINTS[result];
  await db.run(
    'UPDATE tournament_players SET current_points = current_points + $1 WHERE tournament_id = $2 AND player_id = $3',
    [p1, tournamentId, match.player1_id]
  );
  if (match.player2_id) {
    await db.run(
      'UPDATE tournament_players SET current_points = current_points + $1 WHERE tournament_id = $2 AND player_id = $3',
      [p2, tournamentId, match.player2_id]
    );
  }
  await db.run('UPDATE matches SET result = $1 WHERE id = $2', [result, match.id]);
});

router.post('/tournaments/:id/results', requireAuth, async (req, res) => {
  const t = await ownedTournament(req, res);
  if (!t) return;
  const { match_id, result } = req.body || {};
  if (!(result in POINTS)) {
    return res.status(400).json({ error: `result must be one of: ${Object.keys(POINTS).join(', ')}` });
  }
  const match = await db.get('SELECT * FROM matches WHERE id = $1 AND tournament_id = $2', [match_id, t.id]);
  if (!match) return res.status(404).json({ error: 'Match not found in this tournament' });

  await submitResult(t.id, match, result);
  const updated = await db.get('SELECT * FROM matches WHERE id = $1', [match.id]);
  res.json(updated);
});

async function applyRatings(tournamentId) {
  const players = await db.all('SELECT id AS player_id, current_rating FROM players');
  const matches = await db.all(
    'SELECT player1_id, player2_id, result FROM matches WHERE tournament_id = $1 AND player2_id IS NOT NULL',
    [tournamentId]
  );

  const deltas = calculateTournamentRatings(players, matches);
  for (const [playerId, delta] of Object.entries(deltas)) {
    const player = players.find((p) => p.player_id === Number(playerId));
    if (player) {
      const newRating = player.current_rating + delta;
      await db.run('UPDATE players SET current_rating = $1 WHERE id = $2', [newRating, playerId]);
    }
  }
}

const insertRound = db.transaction(async (tournamentId, roundNumber, pairings) => {
  const ids = [];
  for (const p of pairings) {
    let result;
    if (p.player2_id == null) {
      result = await db.run(
        'INSERT INTO matches (tournament_id, round_number, player1_id, player2_id, result) VALUES ($1, $2, $3, NULL, $4) RETURNING id',
        [tournamentId, roundNumber, p.player1_id, '1-0']
      );
      // Award bye point
      await db.run(
        'UPDATE tournament_players SET current_points = current_points + 1 WHERE tournament_id = $1 AND player_id = $2',
        [tournamentId, p.player1_id]
      );
    } else {
      result = await db.run(
        'INSERT INTO matches (tournament_id, round_number, player1_id, player2_id) VALUES ($1, $2, $3, $4) RETURNING id',
        [tournamentId, roundNumber, p.player1_id, p.player2_id]
      );
    }
    ids.push(result.rows[0].id);
  }

  const created = await db.all(
    `
    SELECT m.*, p1.full_name AS player1_name, p2.full_name AS player2_name
    FROM matches m
    LEFT JOIN players p1 ON p1.id = m.player1_id
    LEFT JOIN players p2 ON p2.id = m.player2_id
    WHERE m.id = ANY($1)
    `,
    [ids]
  );
  return created;
});

router.post('/tournaments/:id/generate-round', requireAuth, async (req, res) => {
  const t = await ownedTournament(req, res);
  if (!t) return;

  const players = await db.all(
    `
    SELECT tp.player_id, tp.current_points, tp.tiebreak_score, p.current_rating
    FROM tournament_players tp JOIN players p ON p.id = tp.player_id
    WHERE tp.tournament_id = $1
    `,
    [t.id]
  );
  const previousMatches = await db.all(
    'SELECT round_number, player1_id, player2_id, result FROM matches WHERE tournament_id = $1',
    [t.id]
  );

  const unfinished = previousMatches.filter((m) => m.player2_id != null && m.result == null).length;
  if (unfinished > 0) {
    return res.status(409).json({ error: `Cannot generate a new round: ${unfinished} match(es) still have no result` });
  }

  const roundNumber = previousMatches.reduce((max, m) => Math.max(max, m.round_number), 0) + 1;

  let pairings;
  try {
    ({ pairings } = generateRound({
      systemType: t.system_type,
      players,
      previousMatches,
      roundNumber,
    }));
  } catch (e) {
    if (e instanceof PairingError) return res.status(409).json({ error: e.message });
    throw e;
  }

  const created = await insertRound(t.id, roundNumber, pairings);
  res.status(201).json({ round_number: roundNumber, matches: created });
});

export default router;
