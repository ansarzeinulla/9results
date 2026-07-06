import { Router } from 'express';
import db from '../db.js';

const router = Router();

const STATUS_MAP = { upcoming: 'setup', live: 'ongoing', finished: 'finished' };

router.get('/tournaments', async (req, res) => {
  const { status } = req.query;
  let query = `
    SELECT t.*, COUNT(tp.id) AS player_count
    FROM tournaments t LEFT JOIN tournament_players tp ON tp.tournament_id = t.id
  `;
  const params = [];
  if (status) {
    const internal = STATUS_MAP[String(status).toLowerCase()] || status;
    query += ' WHERE t.status = $1';
    params.push(internal);
  }
  query += ' GROUP BY t.id ORDER BY t.id DESC';
  const rows = await db.all(query, params);
  res.json(rows);
});

router.get('/tournaments/:id', async (req, res) => {
  const t = await db.get('SELECT * FROM tournaments WHERE id = $1', [req.params.id]);
  if (!t) return res.status(404).json({ error: 'Tournament not found' });
  res.json(t);
});

router.get('/tournaments/:id/standings', async (req, res) => {
  const t = await db.get('SELECT * FROM tournaments WHERE id = $1', [req.params.id]);
  if (!t) return res.status(404).json({ error: 'Tournament not found' });

  // Buchholz = sum of current_points of every opponent actually faced (byes excluded)
  const standings = await db.all(
    `
    SELECT p.id AS player_id, p.full_name, p.current_rating,
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
    WHERE tp.tournament_id = $1
    ORDER BY tp.current_points DESC, buchholz DESC, p.current_rating DESC
    `,
    [req.params.id]
  );
  res.json({ tournament: t, standings });
});

router.get('/tournaments/:id/matches', async (req, res) => {
  const t = await db.get('SELECT id FROM tournaments WHERE id = $1', [req.params.id]);
  if (!t) return res.status(404).json({ error: 'Tournament not found' });
  const matches = await db.all(
    `
    SELECT m.*, p1.full_name AS player1_name, p2.full_name AS player2_name
    FROM matches m
    LEFT JOIN players p1 ON p1.id = m.player1_id
    LEFT JOIN players p2 ON p2.id = m.player2_id
    WHERE m.tournament_id = $1
    ORDER BY m.round_number DESC, m.id
    `,
    [req.params.id]
  );
  res.json(matches);
});

router.get('/players/:id', async (req, res) => {
  const player = await db.get('SELECT * FROM players WHERE id = $1', [req.params.id]);
  if (!player) return res.status(404).json({ error: 'Player not found' });
  const history = await db.all(
    `
    SELECT t.id AS tournament_id, t.name, t.location, t.status,
           tp.current_points, tp.tiebreak_score
    FROM tournament_players tp
    JOIN tournaments t ON t.id = tp.tournament_id
    WHERE tp.player_id = $1
    ORDER BY t.id DESC
    `,
    [req.params.id]
  );
  res.json({ player, history });
});

router.get('/players', async (req, res) => {
  const rows = await db.all('SELECT * FROM players ORDER BY current_rating DESC');
  res.json(rows);
});

router.get('/search', async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) return res.json({ tournaments: [], players: [] });
  const like = `%${q}%`;
  const [tournaments, players] = await Promise.all([
    db.all(
      'SELECT id, name, location, status FROM tournaments WHERE name ILIKE $1 OR location ILIKE $2 LIMIT 10',
      [like, like]
    ),
    db.all('SELECT id, full_name, current_rating FROM players WHERE full_name ILIKE $1 LIMIT 10', [like]),
  ]);
  res.json({ tournaments, players });
});

export default router;
