import { Router } from 'express';
import db from '../db.js';

const router = Router();

// Public labels → internal status values
const STATUS_MAP = { upcoming: 'setup', live: 'ongoing', finished: 'finished' };

router.get('/tournaments', (req, res) => {
  const { status } = req.query;
  let rows;
  if (status) {
    const internal = STATUS_MAP[String(status).toLowerCase()] || status;
    rows = db
      .prepare(
        `SELECT t.*, COUNT(tp.id) AS player_count
         FROM tournaments t LEFT JOIN tournament_players tp ON tp.tournament_id = t.id
         WHERE t.status = ? GROUP BY t.id ORDER BY t.id DESC`
      )
      .all(internal);
  } else {
    rows = db
      .prepare(
        `SELECT t.*, COUNT(tp.id) AS player_count
         FROM tournaments t LEFT JOIN tournament_players tp ON tp.tournament_id = t.id
         GROUP BY t.id ORDER BY t.id DESC`
      )
      .all();
  }
  res.json(rows);
});

router.get('/tournaments/:id', (req, res) => {
  const t = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
  if (!t) return res.status(404).json({ error: 'Tournament not found' });
  res.json(t);
});

router.get('/tournaments/:id/standings', (req, res) => {
  const t = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
  if (!t) return res.status(404).json({ error: 'Tournament not found' });
  // Buchholz = sum of current_points of every opponent actually faced
  // (byes excluded), computed live from the match history.
  const standings = db
    .prepare(
      `SELECT p.id AS player_id, p.full_name, p.current_rating,
              tp.current_points, tp.tiebreak_score,
              COALESCE((
                SELECT SUM(opp.current_points)
                FROM matches m
                JOIN tournament_players opp
                  ON opp.tournament_id = m.tournament_id
                 AND opp.player_id = CASE WHEN m.player1_id = p.id THEN m.player2_id ELSE m.player1_id END
                WHERE m.tournament_id = tp.tournament_id
                  AND (m.player1_id = p.id OR m.player2_id = p.id)
                  AND m.player1_id IS NOT NULL
                  AND m.player2_id IS NOT NULL
              ), 0) AS buchholz
       FROM tournament_players tp
       JOIN players p ON p.id = tp.player_id
       WHERE tp.tournament_id = ?
       ORDER BY tp.current_points DESC, buchholz DESC, p.current_rating DESC`
    )
    .all(req.params.id);
  res.json({ tournament: t, standings });
});

router.get('/tournaments/:id/matches', (req, res) => {
  const t = db.prepare('SELECT id FROM tournaments WHERE id = ?').get(req.params.id);
  if (!t) return res.status(404).json({ error: 'Tournament not found' });
  const matches = db
    .prepare(
      `SELECT m.*, p1.full_name AS player1_name, p2.full_name AS player2_name
       FROM matches m
       LEFT JOIN players p1 ON p1.id = m.player1_id
       LEFT JOIN players p2 ON p2.id = m.player2_id
       WHERE m.tournament_id = ?
       ORDER BY m.round_number DESC, m.id`
    )
    .all(req.params.id);
  res.json(matches);
});

router.get('/players/:id', (req, res) => {
  const player = db.prepare('SELECT * FROM players WHERE id = ?').get(req.params.id);
  if (!player) return res.status(404).json({ error: 'Player not found' });
  const history = db
    .prepare(
      `SELECT t.id AS tournament_id, t.name, t.location, t.status,
              tp.current_points, tp.tiebreak_score
       FROM tournament_players tp
       JOIN tournaments t ON t.id = tp.tournament_id
       WHERE tp.player_id = ?
       ORDER BY t.id DESC`
    )
    .all(req.params.id);
  res.json({ player, history });
});

router.get('/players', (_req, res) => {
  res.json(db.prepare('SELECT * FROM players ORDER BY current_rating DESC').all());
});

router.get('/search', (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) return res.json({ tournaments: [], players: [] });
  const like = `%${q}%`;
  res.json({
    tournaments: db
      .prepare('SELECT id, name, location, status FROM tournaments WHERE name LIKE ? OR location LIKE ? LIMIT 10')
      .all(like, like),
    players: db
      .prepare('SELECT id, full_name, current_rating FROM players WHERE full_name LIKE ? LIMIT 10')
      .all(like),
  });
});

export default router;
