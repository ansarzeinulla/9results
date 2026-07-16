import { Router } from 'express';
import db from '../db.js';

const router = Router();

const PLAYER_COLS =
  'id, first_name, last_name, middle_name, birth_year, federation, club, title, rating_blitz, rating_rapid, rating_classic';

// Player registration is admin-only — see routes/admin.js.

// List players, optional federation + name search (public rating list, capped).
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
    `SELECT ${PLAYER_COLS} FROM users WHERE ${where.join(' AND ')} ORDER BY rating_classic DESC LIMIT 500`,
    params
  );
  res.json(rows);
});

// Player profile + tournament history. Also used by organizers to confirm an
// ID before adding the player to a tournament.
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
