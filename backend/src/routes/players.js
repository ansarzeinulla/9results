import { Router } from 'express';
import db from '../db.js';
import { FEDERATIONS } from '../shared/constants.js';

const router = Router();

const PLAYER_COLS =
  'id, first_name, last_name, middle_name, birth_year, federation, club, title, rating_blitz, rating_rapid, rating_classic';

// Public player self-registration (profile only, no login).
router.post('/players/register', async (req, res) => {
  const {
    first_name,
    last_name,
    middle_name,
    birth_year,
    federation,
    club,
    title,
    rating_blitz,
    rating_rapid,
    rating_classic,
  } = req.body || {};

  if (!first_name || !last_name) {
    return res.status(400).json({ error: 'first_name and last_name are required' });
  }
  const fed = FEDERATIONS.includes(federation) ? federation : 'KAZ';
  const clampRating = (v) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 && n <= 4000 ? Math.round(n) : 1200;
  };
  const year = Number(birth_year);
  const validYear = Number.isInteger(year) && year >= 1900 && year <= new Date().getFullYear() ? year : null;

  const result = await db.run(
    `INSERT INTO users (role, first_name, last_name, middle_name, birth_year, federation, club, title,
                        rating_blitz, rating_rapid, rating_classic)
     VALUES ('player', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING ${PLAYER_COLS}`,
    [
      first_name.trim(),
      last_name.trim(),
      middle_name?.trim() || null,
      validYear,
      fed,
      club?.trim() || null,
      title?.trim() || null,
      clampRating(rating_blitz),
      clampRating(rating_rapid),
      clampRating(rating_classic),
    ]
  );
  res.status(201).json(result.rows[0]);
});

// List players, optional federation + name search.
router.get('/players', async (req, res) => {
  const { federation, q } = req.query;
  const where = ["role = 'player'"];
  const params = [];
  if (federation) {
    params.push(federation);
    where.push(`federation = $${params.length}`);
  }
  if (q) {
    params.push(`%${q}%`);
    where.push(`(first_name ILIKE $${params.length} OR last_name ILIKE $${params.length})`);
  }
  const rows = await db.all(
    `SELECT ${PLAYER_COLS} FROM users WHERE ${where.join(' AND ')} ORDER BY rating_classic DESC`,
    params
  );
  res.json(rows);
});

// Player profile + tournament history.
router.get('/players/:id', async (req, res) => {
  const player = await db.get(
    `SELECT ${PLAYER_COLS} FROM users WHERE id = $1 AND role = 'player'`,
    [req.params.id]
  );
  if (!player) return res.status(404).json({ error: 'Player not found' });
  const history = await db.all(
    `SELECT t.id AS tournament_id, t.name, t.city, t.federation, t.level, t.rating_type, t.status,
            tp.current_points
     FROM tournament_players tp
     JOIN tournaments t ON t.id = tp.tournament_id
     WHERE tp.player_id = $1
     ORDER BY t.id DESC`,
    [req.params.id]
  );
  res.json({ player, history });
});

export default router;
