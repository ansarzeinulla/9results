import { Router } from 'express';
import db from '../db.js';
import { requireRole } from '../middleware/auth.js';
import { generateSwissRound, validateRoundPairings, PairingError } from '../swissEngine.js';
import { calculateTournamentRatings } from '../ratingEngine.js';
import { POINTS, LEVELS, RATING_TYPES, RATING_COLUMN, GENDERS, AGE_CATEGORIES } from '../shared/constants.js';

const requireOrganizer = requireRole('organizer');

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

router.get('/my/tournaments', requireOrganizer, async (req, res) => {
  const rows = await db.all(
    `SELECT t.*, COUNT(tp.id) AS player_count
     FROM tournaments t LEFT JOIN tournament_players tp ON tp.tournament_id = t.id
     WHERE t.organizer_id = $1 GROUP BY t.id ORDER BY t.id DESC`,
    [req.user.id]
  );
  res.json(rows);
});

// Create tournament. Federation is inherited from the organizer (not client-set).
router.post('/tournaments', requireOrganizer, async (req, res) => {
  const { name, city, level, rating_type, gender, age_category } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name is required' });
  const org = await db.get('SELECT federation FROM users WHERE id = $1', [req.user.id]);
  const result = await db.run(
    `INSERT INTO tournaments (name, federation, city, level, rating_type, gender, age_category, organizer_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [
      name,
      org.federation,
      city || null,
      LEVELS.includes(level) ? level : 'Regional',
      RATING_TYPES.includes(rating_type) ? rating_type : 'non_rated',
      GENDERS.includes(gender) ? gender : 'all',
      AGE_CATEGORIES.includes(age_category) ? age_category : 'all',
      req.user.id,
    ]
  );
  res.status(201).json(result.rows[0]);
});

// Update settings. Federation stays fixed; finishing just stamps finished_at.
router.put('/tournaments/:id', requireOrganizer, async (req, res) => {
  const t = await ownedTournament(req, res);
  if (!t) return;
  const { name, city, level, rating_type, gender, age_category, status } = req.body || {};
  const next = {
    name: name ?? t.name,
    city: city ?? t.city,
    level: LEVELS.includes(level) ? level : t.level,
    rating_type: RATING_TYPES.includes(rating_type) ? rating_type : t.rating_type,
    gender: GENDERS.includes(gender) ? gender : t.gender,
    age_category: AGE_CATEGORIES.includes(age_category) ? age_category : t.age_category,
    status: ['setup', 'ongoing', 'finished'].includes(status) ? status : t.status,
  };
  const finishedAt = next.status === 'finished' ? (t.finished_at ?? new Date().toISOString()) : null;

  const result = await db.run(
    `UPDATE tournaments SET name=$1, city=$2, level=$3, rating_type=$4, gender=$5, age_category=$6, status=$7, finished_at=$8
     WHERE id=$9 RETURNING *`,
    [next.name, next.city, next.level, next.rating_type, next.gender, next.age_category, next.status, finishedAt, t.id]
  );
  res.json(result.rows[0]);
});

// Add a player, snapshotting their start_rating for the tournament's rating type.
router.post('/tournaments/:id/add-player', requireOrganizer, async (req, res) => {
  const t = await ownedTournament(req, res);
  if (!t) return;
  const { player_id } = req.body || {};
  const player = await db.get('SELECT * FROM players WHERE id = $1', [player_id]);
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

router.post('/tournaments/:id/matches', requireOrganizer, async (req, res) => {
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

const submitResult = db.transaction(async (tx, tournamentId, match, result) => {
  if (match.result) {
    const [oldP1, oldP2] = POINTS[match.result];
    await tx.run(
      'UPDATE tournament_players SET current_points = current_points - $1 WHERE tournament_id = $2 AND player_id = $3',
      [oldP1, tournamentId, match.player1_id]
    );
    if (match.player2_id) {
      await tx.run(
        'UPDATE tournament_players SET current_points = current_points - $1 WHERE tournament_id = $2 AND player_id = $3',
        [oldP2, tournamentId, match.player2_id]
      );
    }
  }
  const [p1, p2] = POINTS[result];
  await tx.run(
    'UPDATE tournament_players SET current_points = current_points + $1 WHERE tournament_id = $2 AND player_id = $3',
    [p1, tournamentId, match.player1_id]
  );
  if (match.player2_id) {
    await tx.run(
      'UPDATE tournament_players SET current_points = current_points + $1 WHERE tournament_id = $2 AND player_id = $3',
      [p2, tournamentId, match.player2_id]
    );
  }
  await tx.run('UPDATE matches SET result = $1 WHERE id = $2', [result, match.id]);
});

router.post('/tournaments/:id/results', requireOrganizer, async (req, res) => {
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

router.get('/tournaments/:id/rating-preview', requireOrganizer, async (req, res) => {
  const t = await ownedTournament(req, res);
  if (!t) return;
  if (t.rating_type === 'non_rated') return res.status(400).json({ error: 'Tournament is non-rated' });

  const { deltas, players } = await ratingDeltas(t.id);
  const col = RATING_COLUMN[t.rating_type];
  const detail = await db.all(
    `SELECT tp.player_id, u.first_name, u.last_name, u.${col} AS live_rating, tp.start_rating
     FROM tournament_players tp JOIN players u ON u.id = tp.player_id
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

const applyRatings = db.transaction(async (tx, tournament) => {
  const { deltas, players } = await ratingDeltas(tournament.id);
  const col = RATING_COLUMN[tournament.rating_type];
  for (const p of players) {
    const delta = deltas[p.player_id] ?? 0;
    // Apply delta on top of the player's current live rating.
    await tx.run(`UPDATE players SET ${col} = ${col} + $1 WHERE id = $2`, [delta, p.player_id]);
  }
  await tx.run('UPDATE tournaments SET ratings_applied = true WHERE id = $1', [tournament.id]);
});

router.post('/tournaments/:id/apply-ratings', requireOrganizer, async (req, res) => {
  const t = await ownedTournament(req, res);
  if (!t) return;
  if (t.rating_type === 'non_rated') return res.status(400).json({ error: 'Tournament is non-rated' });
  if (t.ratings_applied) return res.status(409).json({ error: 'Ratings already applied' });

  await applyRatings(t);
  res.json({ ok: true, ratings_applied: true });
});

// --- Round generation (byes stored as decided matches) ---

const insertRound = db.transaction(async (tx, tournamentId, roundNumber, pairings) => {
  const ids = [];
  for (const p of pairings) {
    let result;
    if (p.player2_id == null) {
      result = await tx.run(
        "INSERT INTO matches (tournament_id, round_number, board_number, player1_id, player2_id, result) VALUES ($1, $2, NULL, $3, NULL, '1-0') RETURNING id",
        [tournamentId, roundNumber, p.player1_id]
      );
      await tx.run(
        'UPDATE tournament_players SET current_points = current_points + 1 WHERE tournament_id = $1 AND player_id = $2',
        [tournamentId, p.player1_id]
      );
    } else {
      result = await tx.run(
        'INSERT INTO matches (tournament_id, round_number, board_number, player1_id, player2_id) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [tournamentId, roundNumber, p.board_number ?? null, p.player1_id, p.player2_id]
      );
    }
    ids.push(result.rows[0].id);
  }
  return tx.all(
    `SELECT m.*, p1.first_name AS p1_first, p1.last_name AS p1_last,
            p2.first_name AS p2_first, p2.last_name AS p2_last
     FROM matches m
     LEFT JOIN players p1 ON p1.id = m.player1_id
     LEFT JOIN players p2 ON p2.id = m.player2_id
     WHERE m.id = ANY($1)`,
    [ids]
  );
});

router.post('/tournaments/:id/generate-round', requireOrganizer, async (req, res) => {
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
    ({ pairings } = generateSwissRound(players, previousMatches, roundNumber));
  } catch (e) {
    if (e instanceof PairingError) return res.status(409).json({ error: e.message });
    throw e;
  }

  const created = await insertRound(t.id, roundNumber, pairings);
  res.status(201).json({ round_number: roundNumber, matches: created });
});

// --- Manual pairing edits (Swiss laws enforced by validateRoundPairings) ---

async function editableRound(req, res, t) {
  const roundNumber = Number(req.params.round);
  const maxRound = (await db.get(
    'SELECT COALESCE(MAX(round_number), 0) AS max FROM matches WHERE tournament_id = $1',
    [t.id]
  )).max;
  if (!roundNumber || roundNumber !== Number(maxRound)) {
    res.status(409).json({ error: 'Only the latest round can be edited' });
    return null;
  }
  return roundNumber;
}

// Replace the latest round's pairings. Blocked once any real result is entered.
router.put('/tournaments/:id/rounds/:round', requireOrganizer, async (req, res) => {
  const t = await ownedTournament(req, res);
  if (!t) return;
  const roundNumber = await editableRound(req, res, t);
  if (!roundNumber) return;

  const existing = await db.all(
    'SELECT * FROM matches WHERE tournament_id = $1 AND round_number = $2',
    [t.id, roundNumber]
  );
  if (existing.some((m) => m.player2_id != null && m.result != null)) {
    return res.status(409).json({ error: 'Results already entered — cannot edit pairings of this round' });
  }

  const rawPairings = (req.body || {}).pairings;
  if (!Array.isArray(rawPairings) || rawPairings.length === 0) {
    return res.status(400).json({ error: 'pairings array is required' });
  }
  const pairings = rawPairings.map((p) => ({
    player1_id: p.player1_id == null ? null : Number(p.player1_id),
    player2_id: p.player2_id == null ? null : Number(p.player2_id),
  }));

  const players = await db.all(
    `SELECT tp.player_id, tp.current_points, COALESCE(tp.start_rating, 1200) AS current_rating
     FROM tournament_players tp WHERE tp.tournament_id = $1`,
    [t.id]
  );
  const previousMatches = await db.all(
    'SELECT round_number, player1_id, player2_id, result FROM matches WHERE tournament_id = $1 AND round_number < $2',
    [t.id, roundNumber]
  );

  const verdict = validateRoundPairings({ pairings, players, previousMatches, roundNumber });
  if (!verdict.ok) {
    return res.status(400).json({ error: 'Pairings violate Swiss rules', ...verdict });
  }

  const replaceRound = db.transaction(async (tx) => {
    // Reverse the old bye's automatic point, then wipe the round.
    for (const m of existing) {
      if (m.player2_id == null && m.result === '1-0') {
        await tx.run(
          'UPDATE tournament_players SET current_points = current_points - 1 WHERE tournament_id = $1 AND player_id = $2',
          [t.id, m.player1_id]
        );
      }
    }
    await tx.run('DELETE FROM matches WHERE tournament_id = $1 AND round_number = $2', [t.id, roundNumber]);
    const ids = [];
    let board = 0;
    for (const p of pairings) {
      if (p.player2_id == null) {
        const r = await tx.run(
          "INSERT INTO matches (tournament_id, round_number, board_number, player1_id, player2_id, result) VALUES ($1, $2, NULL, $3, NULL, '1-0') RETURNING id",
          [t.id, roundNumber, p.player1_id]
        );
        await tx.run(
          'UPDATE tournament_players SET current_points = current_points + 1 WHERE tournament_id = $1 AND player_id = $2',
          [t.id, p.player1_id]
        );
        ids.push(r.rows[0].id);
      } else {
        board += 1;
        const r = await tx.run(
          'INSERT INTO matches (tournament_id, round_number, board_number, player1_id, player2_id) VALUES ($1, $2, $3, $4, $5) RETURNING id',
          [t.id, roundNumber, board, p.player1_id, p.player2_id]
        );
        ids.push(r.rows[0].id);
      }
    }
    return tx.all(
      `SELECT m.*, p1.first_name AS p1_first, p1.last_name AS p1_last,
              p2.first_name AS p2_first, p2.last_name AS p2_last
       FROM matches m
       LEFT JOIN players p1 ON p1.id = m.player1_id
       LEFT JOIN players p2 ON p2.id = m.player2_id
       WHERE m.id = ANY($1) ORDER BY m.board_number NULLS LAST`,
      [ids]
    );
  });

  const matches = await replaceRound();
  res.json({ round_number: roundNumber, matches, warnings: verdict.warnings });
});

// Delete the latest round entirely (points from its results are reversed).
router.delete('/tournaments/:id/rounds/:round', requireOrganizer, async (req, res) => {
  const t = await ownedTournament(req, res);
  if (!t) return;
  const roundNumber = await editableRound(req, res, t);
  if (!roundNumber) return;

  const deleteRound = db.transaction(async (tx) => {
    const matches = await tx.all(
      'SELECT * FROM matches WHERE tournament_id = $1 AND round_number = $2',
      [t.id, roundNumber]
    );
    for (const m of matches) {
      if (!m.result) continue;
      const [p1, p2] = POINTS[m.result];
      await tx.run(
        'UPDATE tournament_players SET current_points = current_points - $1 WHERE tournament_id = $2 AND player_id = $3',
        [p1, t.id, m.player1_id]
      );
      if (m.player2_id) {
        await tx.run(
          'UPDATE tournament_players SET current_points = current_points - $1 WHERE tournament_id = $2 AND player_id = $3',
          [p2, t.id, m.player2_id]
        );
      }
    }
    await tx.run('DELETE FROM matches WHERE tournament_id = $1 AND round_number = $2', [t.id, roundNumber]);
    return matches.length;
  });

  const removed = await deleteRound();
  res.json({ ok: true, round_number: roundNumber, removed });
});

export default router;
