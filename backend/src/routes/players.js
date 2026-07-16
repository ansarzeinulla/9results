import { Router } from 'express';
import db from '../db.js';

const router = Router();

const PLAYER_COLS =
  'id, first_name, last_name, middle_name, birth_year, federation, club, title, rating_blitz, rating_rapid, rating_classic';

// Player registration is admin-only — see routes/admin.js.

// List players, optional federation + name search (public rating list, capped).
router.get('/players', async (req, res) => {
  const { federation, q, birth_year, title, id } = req.query;
  const where = ['TRUE'];
  const params = [];
  if (federation) {
    params.push(federation);
    where.push(`federation = $${params.length}`);
  }
  if (q) {
    params.push(`%${q}%`);
    where.push(`(first_name ILIKE $${params.length} OR last_name ILIKE $${params.length})`);
  }
  if (birth_year && Number(birth_year)) {
    params.push(Number(birth_year));
    where.push(`birth_year = $${params.length}`);
  }
  if (title) {
    params.push(`%${title}%`);
    where.push(`title ILIKE $${params.length}`);
  }
  if (id && Number(id)) {
    params.push(Number(id));
    where.push(`id = $${params.length}`);
  }
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = 50;
  const cond = where.join(' AND ');
  const total = await db.get(`SELECT COUNT(*)::int AS n FROM players WHERE ${cond}`, params);
  const rows = await db.all(
    `SELECT ${PLAYER_COLS} FROM players WHERE ${cond}
     ORDER BY rating_classic DESC, id
     LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`,
    params
  );
  res.json({ players: rows, total: total.n, page, page_size: pageSize });
});

// Player profile + tournament history. Also used by organizers to confirm an
// ID before adding the player to a tournament.
router.get('/players/:id', async (req, res) => {
  const player = await db.get(
    `SELECT ${PLAYER_COLS} FROM players WHERE id = $1`,
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
  const rating_history = await db.all(
    `SELECT rh.id, rh.rating_type, rh.old_rating, rh.delta, rh.new_rating, rh.created_at,
            rh.tournament_id, t.name AS tournament_name
     FROM rating_history rh
     LEFT JOIN tournaments t ON t.id = rh.tournament_id
     WHERE rh.player_id = $1
     ORDER BY rh.created_at DESC, rh.id DESC`,
    [req.params.id]
  );
  res.json({ player, history, rating_history });
});

export default router;
