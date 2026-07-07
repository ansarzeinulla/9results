import { Router } from 'express';
import db from '../db.js';
import { POINTS, RATED_RESULTS, RATING_COLUMN } from '../shared/constants.js';
import { calculateElo } from '../ratingEngine.js';

const router = Router();

const STATUS_MAP = { upcoming: 'setup', live: 'ongoing', finished: 'finished' };

function playerName(row, prefix) {
  const f = row[`${prefix}_first`];
  const l = row[`${prefix}_last`];
  return f ? `${f} ${l}` : null;
}

// GET /api/tournaments — faceted search.
router.get('/tournaments', async (req, res) => {
  const { federation, city, status, level, rating_type, created_from, created_to, ended_from, ended_to } = req.query;
  const where = [];
  const params = [];
  const add = (clause, value) => {
    params.push(value);
    where.push(clause.replace('?', `$${params.length}`));
  };

  if (federation) add('t.federation = ?', federation);
  if (city) add('t.city = ?', city);
  if (status) add('t.status = ?', STATUS_MAP[String(status).toLowerCase()] || status);
  if (level) add('t.level = ?', level);
  if (rating_type) add('t.rating_type = ?', rating_type);
  if (created_from) add('t.created_at >= ?', created_from);
  if (created_to) add('t.created_at <= ?', created_to);
  if (ended_from) add('t.finished_at >= ?', ended_from);
  if (ended_to) add('t.finished_at <= ?', ended_to);

  const rows = await db.all(
    `SELECT t.*, COUNT(tp.id) AS player_count
     FROM tournaments t LEFT JOIN tournament_players tp ON tp.tournament_id = t.id
     ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
     GROUP BY t.id ORDER BY t.created_at DESC, t.id DESC`,
    params
  );
  res.json(rows);
});

router.get('/tournaments/:id', async (req, res) => {
  const t = await db.get('SELECT * FROM tournaments WHERE id = $1', [req.params.id]);
  if (!t) return res.status(404).json({ error: 'Tournament not found' });
  res.json(t);
});

// GET /api/tournaments/:id/rounds — each round with its pairings.
router.get('/tournaments/:id/rounds', async (req, res) => {
  const t = await db.get('SELECT id FROM tournaments WHERE id = $1', [req.params.id]);
  if (!t) return res.status(404).json({ error: 'Tournament not found' });
  const matches = await db.all(
    `SELECT m.id, m.round_number, m.player1_id, m.player2_id, m.result,
            p1.first_name AS p1_first, p1.last_name AS p1_last,
            p2.first_name AS p2_first, p2.last_name AS p2_last
     FROM matches m
     LEFT JOIN users p1 ON p1.id = m.player1_id
     LEFT JOIN users p2 ON p2.id = m.player2_id
     WHERE m.tournament_id = $1
     ORDER BY m.round_number, m.id`,
    [req.params.id]
  );
  const byRound = new Map();
  for (const m of matches) {
    if (!byRound.has(m.round_number)) byRound.set(m.round_number, []);
    byRound.get(m.round_number).push({
      id: m.id,
      player1_id: m.player1_id,
      player2_id: m.player2_id,
      player1_name: playerName(m, 'p1'),
      player2_name: playerName(m, 'p2'),
      result: m.result,
    });
  }
  const rounds = [...byRound.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([round_number, pairings]) => ({ round_number, pairings }));
  res.json({ max_round: rounds.length ? rounds[rounds.length - 1].round_number : 0, rounds });
});

// GET /api/tournaments/:id/standings?through_round=N
// N omitted or negative = final; 0 = pre-tournament (start ratings, 0 points).
router.get('/tournaments/:id/standings', async (req, res) => {
  const t = await db.get('SELECT * FROM tournaments WHERE id = $1', [req.params.id]);
  if (!t) return res.status(404).json({ error: 'Tournament not found' });

  const participants = await db.all(
    `SELECT tp.player_id, tp.start_rating,
            u.first_name, u.last_name, u.federation,
            u.rating_blitz, u.rating_rapid, u.rating_classic
     FROM tournament_players tp JOIN users u ON u.id = tp.player_id
     WHERE tp.tournament_id = $1`,
    [req.params.id]
  );
  const matches = await db.all(
    'SELECT round_number, player1_id, player2_id, result FROM matches WHERE tournament_id = $1 ORDER BY round_number, id',
    [req.params.id]
  );

  const maxRound = matches.reduce((m, r) => Math.max(m, r.round_number), 0);
  const asked = req.query.through_round;
  const throughRound = asked == null || Number(asked) < 0 ? maxRound : Math.min(Number(asked), maxRound);

  const rated = t.rating_type !== 'non_rated';
  const ratingCol = RATING_COLUMN[t.rating_type];

  // Base rating per player: snapshot at join (start_rating) or current column.
  const baseRating = new Map();
  const points = new Map();
  const projected = new Map();
  for (const p of participants) {
    const base = p.start_rating ?? (rated ? p[ratingCol] : null);
    baseRating.set(p.player_id, base);
    points.set(p.player_id, 0);
    projected.set(p.player_id, base);
  }

  // Replay matches round by round up to throughRound: accumulate points and,
  // for rated tournaments, project Elo sequentially.
  for (const m of matches) {
    if (m.round_number > throughRound || !m.result) continue;
    const [p1, p2] = POINTS[m.result] ?? [0, 0];
    if (points.has(m.player1_id)) points.set(m.player1_id, points.get(m.player1_id) + p1);
    if (m.player2_id != null && points.has(m.player2_id)) {
      points.set(m.player2_id, points.get(m.player2_id) + p2);
    }
    if (rated && m.player2_id != null && RATED_RESULTS.includes(m.result)) {
      const r1 = projected.get(m.player1_id);
      const r2 = projected.get(m.player2_id);
      if (r1 != null && r2 != null) {
        const resultNum = m.result === '1-0' ? 1 : m.result === '0-1' ? 0 : 0.5;
        const { rating1_new, rating2_new } = calculateElo(r1, r2, resultNum);
        projected.set(m.player1_id, rating1_new);
        projected.set(m.player2_id, rating2_new);
      }
    }
  }

  // Buchholz as-of-round: sum of opponents' points (through the same round).
  const buchholz = new Map(participants.map((p) => [p.player_id, 0]));
  for (const m of matches) {
    if (m.round_number > throughRound || m.player2_id == null) continue;
    if (buchholz.has(m.player1_id)) buchholz.set(m.player1_id, buchholz.get(m.player1_id) + (points.get(m.player2_id) ?? 0));
    if (buchholz.has(m.player2_id)) buchholz.set(m.player2_id, buchholz.get(m.player2_id) + (points.get(m.player1_id) ?? 0));
  }

  const standings = participants
    .map((p) => ({
      player_id: p.player_id,
      full_name: `${p.first_name} ${p.last_name}`,
      federation: p.federation,
      start_rating: baseRating.get(p.player_id),
      projected_rating: rated ? projected.get(p.player_id) : null,
      current_points: points.get(p.player_id),
      buchholz: buchholz.get(p.player_id),
    }))
    .sort(
      (a, b) =>
        b.current_points - a.current_points ||
        b.buchholz - a.buchholz ||
        (b.start_rating ?? 0) - (a.start_rating ?? 0)
    );

  res.json({ tournament: t, through_round: throughRound, max_round: maxRound, rated, standings });
});

// Global search for the home page.
router.get('/search', async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) return res.json({ tournaments: [], players: [] });
  const like = `%${q}%`;
  const [tournaments, players] = await Promise.all([
    db.all(
      'SELECT id, name, city, federation, status FROM tournaments WHERE name ILIKE $1 OR city ILIKE $1 LIMIT 10',
      [like]
    ),
    db.all(
      "SELECT id, first_name, last_name, federation, rating_classic FROM users WHERE role='player' AND (first_name ILIKE $1 OR last_name ILIKE $1) LIMIT 10",
      [like]
    ),
  ]);
  res.json({ tournaments, players });
});

export default router;
