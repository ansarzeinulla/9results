import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { generateRound, PairingError } from '../pairingEngine.js';
import { calculateTournamentRatings } from '../ratingEngine.js';
import { POINTS, LEVELS, RATING_TYPES, RATING_COLUMN } from '../shared/constants.js';

const router = Router();

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
    `SELECT t.*, COUNT(tp.id) AS player_count
     FROM tournaments t LEFT JOIN tournament_players tp ON tp.tournament_id = t.id
     WHERE t.organizer_id = $1 GROUP BY t.id ORDER BY t.id DESC`,
    [req.user.id]
  );
  res.json(rows);
});

// Create tournament. Federation is inherited from the organizer (not client-set).
router.post('/tournaments', requireAuth, async (req, res) => {
  const { name, city, level, rating_type, system_type } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name is required' });
  const org = await db.get('SELECT federation FROM users WHERE id = $1', [req.user.id]);
  const result = await db.run(
    `INSERT INTO tournaments (name, federation, city, level, rating_type, system_type, organizer_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [
      name,
      org.federation,
      city || null,
      LEVELS.includes(level) ? level : 'Regional',
      RATING_TYPES.includes(rating_type) ? rating_type : 'non_rated',
      system_type === 'round_robin' ? 'round_robin' : 'swiss',
      req.user.id,
    ]
  );
  res.status(201).json(result.rows[0]);
});

// Update settings. Federation stays fixed; finishing just stamps finished_at.
router.put('/tournaments/:id', requireAuth, async (req, res) => {
  const t = await ownedTournament(req, res);
  if (!t) return;
  const { name, city, level, rating_type, system_type, status } = req.body || {};
  const next = {
    name: name ?? t.name,
    city: city ?? t.city,
    level: LEVELS.includes(level) ? level : t.level,
    rating_type: RATING_TYPES.includes(rating_type) ? rating_type : t.rating_type,
    system_type: ['swiss', 'round_robin'].includes(system_type) ? system_type : t.system_type,
    status: ['setup', 'ongoing', 'finished'].includes(status) ? status : t.status,
  };
  const finishedAt = next.status === 'finished' ? (t.finished_at ?? new Date().toISOString()) : null;

  const result = await db.run(
    `UPDATE tournaments SET name=$1, city=$2, level=$3, rating_type=$4, system_type=$5, status=$6, finished_at=$7
     WHERE id=$8 RETURNING *`,
    [next.name, next.city, next.level, next.rating_type, next.system_type, next.status, finishedAt, t.id]
  );
  res.json(result.rows[0]);
});

// Add a player, snapshotting their start_rating for the tournament's rating type.
router.post('/tournaments/:id/add-player', requireAuth, async (req, res) => {
  const t = await ownedTournament(req, res);
  if (!t) return;
  const { player_id } = req.body || {};
  const player = await db.get("SELECT * FROM users WHERE id = $1 AND role = 'player'", [player_id]);
  if (!player) return res.status(400).json({ error: 'Unknown player_id' });
  const startRating = t.rating_type !== 'non_rated' ? player[RATING_COLUMN[t.rating_type]] : null;
  try {
    await db.run(
      'INSERT INTO tournament_players (tournament_id, player_id, start_rating) VALUES ($1, $2, $3)',
      [t.id, player_id, startRating]
    );
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
  const inT = async (pid) =>
    db.get('SELECT 1 FROM tournament_players WHERE tournament_id = $1 AND player_id = $2', [t.id, pid]);
  if (!(await inT(player1_id))) return res.status(400).json({ error: 'Player1 not in tournament' });
  if (player2_id && !(await inT(player2_id))) return res.status(400).json({ error: 'Player2 not in tournament' });

  const result = await db.run(
    'INSERT INTO matches (tournament_id, round_number, player1_id, player2_id) VALUES ($1, $2, $3, $4) RETURNING *',
    [t.id, round_number, player1_id, player2_id || null]
  );
  res.status(201).json(result.rows[0]);
});

const submitResult = db.transaction(async (tournamentId, match, result) => {
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

// --- Rating change (rated tournaments only, separate from finishing) ---

async function ratingDeltas(tournamentId) {
  const parts = await db.all(
    'SELECT player_id, start_rating FROM tournament_players WHERE tournament_id = $1',
    [tournamentId]
  );
  const players = parts.map((p) => ({ player_id: p.player_id, current_rating: p.start_rating ?? 1200 }));
  const matches = await db.all(
    'SELECT player1_id, player2_id, result FROM matches WHERE tournament_id = $1 AND player2_id IS NOT NULL',
    [tournamentId]
  );
  return { deltas: calculateTournamentRatings(players, matches), players: parts };
}

router.get('/tournaments/:id/rating-preview', requireAuth, async (req, res) => {
  const t = await ownedTournament(req, res);
  if (!t) return;
  if (t.rating_type === 'non_rated') return res.status(400).json({ error: 'Tournament is non-rated' });

  const { deltas, players } = await ratingDeltas(t.id);
  const col = RATING_COLUMN[t.rating_type];
  const detail = await db.all(
    `SELECT tp.player_id, u.first_name, u.last_name, u.${col} AS live_rating, tp.start_rating
     FROM tournament_players tp JOIN users u ON u.id = tp.player_id
     WHERE tp.tournament_id = $1`,
    [t.id]
  );
  const preview = detail.map((d) => {
    const delta = deltas[d.player_id] ?? 0;
    const oldR = d.start_rating ?? d.live_rating;
    return {
      player_id: d.player_id,
      full_name: `${d.first_name} ${d.last_name}`,
      old_rating: oldR,
      delta,
      new_rating: oldR + delta,
    };
  });
  res.json({ rating_type: t.rating_type, ratings_applied: t.ratings_applied, preview });
});

const applyRatings = db.transaction(async (tournament) => {
  const { deltas, players } = await ratingDeltas(tournament.id);
  const col = RATING_COLUMN[tournament.rating_type];
  for (const p of players) {
    const delta = deltas[p.player_id] ?? 0;
    // Apply delta on top of the player's current live rating.
    await db.run(`UPDATE users SET ${col} = ${col} + $1 WHERE id = $2`, [delta, p.player_id]);
  }
  await db.run('UPDATE tournaments SET ratings_applied = true WHERE id = $1', [tournament.id]);
});

router.post('/tournaments/:id/apply-ratings', requireAuth, async (req, res) => {
  const t = await ownedTournament(req, res);
  if (!t) return;
  if (t.rating_type === 'non_rated') return res.status(400).json({ error: 'Tournament is non-rated' });
  if (t.ratings_applied) return res.status(409).json({ error: 'Ratings already applied' });

  await applyRatings(t);
  res.json({ ok: true, ratings_applied: true });
});

// --- Round generation (byes stored as decided matches) ---

const insertRound = db.transaction(async (tournamentId, roundNumber, pairings) => {
  const ids = [];
  for (const p of pairings) {
    let result;
    if (p.player2_id == null) {
      result = await db.run(
        "INSERT INTO matches (tournament_id, round_number, player1_id, player2_id, result) VALUES ($1, $2, $3, NULL, '1-0') RETURNING id",
        [tournamentId, roundNumber, p.player1_id]
      );
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
  return db.all(
    `SELECT m.*, p1.first_name AS p1_first, p1.last_name AS p1_last,
            p2.first_name AS p2_first, p2.last_name AS p2_last
     FROM matches m
     LEFT JOIN users p1 ON p1.id = m.player1_id
     LEFT JOIN users p2 ON p2.id = m.player2_id
     WHERE m.id = ANY($1)`,
    [ids]
  );
});

router.post('/tournaments/:id/generate-round', requireAuth, async (req, res) => {
  const t = await ownedTournament(req, res);
  if (!t) return;

  const players = await db.all(
    `SELECT tp.player_id, tp.current_points, tp.tiebreak_score, COALESCE(tp.start_rating, 1200) AS current_rating
     FROM tournament_players tp WHERE tp.tournament_id = $1`,
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
    ({ pairings } = generateRound({ systemType: t.system_type, players, previousMatches, roundNumber }));
  } catch (e) {
    if (e instanceof PairingError) return res.status(409).json({ error: e.message });
    throw e;
  }

  const created = await insertRound(t.id, roundNumber, pairings);
  res.status(201).json({ round_number: roundNumber, matches: created });
});

export default router;
