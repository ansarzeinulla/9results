import { Router } from 'express';
import db from '../db.js';
import { requireRole } from '../middleware/auth.js';
import { FEDERATIONS } from '../shared/constants.js';

const router = Router();
const requireAdmin = requireRole('admin');

const PLAYER_COLS =
  'id, first_name, last_name, middle_name, birth_year, federation, club, title, rating_blitz, rating_rapid, rating_classic';

const clampRating = (v, fallback = 1200) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 && n <= 4000 ? Math.round(n) : fallback;
};
const validYear = (v) => {
  const year = Number(v);
  return Number.isInteger(year) && year >= 1900 && year <= new Date().getFullYear() ? year : null;
};

// Paginated player search for the admin panel.
router.get('/admin/players', requireAdmin, async (req, res) => {
  const q = String(req.query.q || '').trim();
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = 25;
  const params = [];
  let where = "role = 'player'";
  if (q) {
    params.push(`%${q}%`);
    where += /^\d+$/.test(q)
      ? ` AND (id = ${Number(q)} OR first_name ILIKE $1 OR last_name ILIKE $1)`
      : ' AND (first_name ILIKE $1 OR last_name ILIKE $1 OR club ILIKE $1)';
  }
  const total = await db.get(`SELECT COUNT(*)::int AS n FROM users WHERE ${where}`, params);
  const rows = await db.all(
    `SELECT ${PLAYER_COLS} FROM users WHERE ${where}
     ORDER BY id DESC LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`,
    params
  );
  res.json({ players: rows, total: total.n, page, page_size: pageSize });
});

// Admin creates a player (registration is admin-only).
router.post('/admin/players', requireAdmin, async (req, res) => {
  const {
    first_name, last_name, middle_name, birth_year, federation, club, title,
    rating_blitz, rating_rapid, rating_classic,
  } = req.body || {};

  if (!first_name || !last_name) {
    return res.status(400).json({ error: 'first_name and last_name are required' });
  }
  const result = await db.run(
    `INSERT INTO users (role, first_name, last_name, middle_name, birth_year, federation, club, title,
                        rating_blitz, rating_rapid, rating_classic)
     VALUES ('player', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING ${PLAYER_COLS}`,
    [
      first_name.trim(),
      last_name.trim(),
      middle_name?.trim() || null,
      validYear(birth_year),
      FEDERATIONS.includes(federation) ? federation : 'KAZ',
      club?.trim() || null,
      title?.trim() || null,
      clampRating(rating_blitz),
      clampRating(rating_rapid),
      clampRating(rating_classic),
    ]
  );
  res.status(201).json(result.rows[0]);
});

// Admin edits any player field, including ratings.
router.put('/admin/players/:id', requireAdmin, async (req, res) => {
  const player = await db.get("SELECT * FROM users WHERE id = $1 AND role = 'player'", [req.params.id]);
  if (!player) return res.status(404).json({ error: 'Player not found' });

  const b = req.body || {};
  const next = {
    first_name: (b.first_name ?? player.first_name)?.trim() || player.first_name,
    last_name: (b.last_name ?? player.last_name)?.trim() || player.last_name,
    middle_name: 'middle_name' in b ? b.middle_name?.trim() || null : player.middle_name,
    birth_year: 'birth_year' in b ? validYear(b.birth_year) : player.birth_year,
    federation: FEDERATIONS.includes(b.federation) ? b.federation : player.federation,
    club: 'club' in b ? b.club?.trim() || null : player.club,
    title: 'title' in b ? b.title?.trim() || null : player.title,
    rating_blitz: 'rating_blitz' in b ? clampRating(b.rating_blitz, player.rating_blitz) : player.rating_blitz,
    rating_rapid: 'rating_rapid' in b ? clampRating(b.rating_rapid, player.rating_rapid) : player.rating_rapid,
    rating_classic: 'rating_classic' in b ? clampRating(b.rating_classic, player.rating_classic) : player.rating_classic,
  };

  const result = await db.run(
    `UPDATE users SET first_name=$1, last_name=$2, middle_name=$3, birth_year=$4, federation=$5,
                      club=$6, title=$7, rating_blitz=$8, rating_rapid=$9, rating_classic=$10
     WHERE id=$11 RETURNING ${PLAYER_COLS}`,
    [
      next.first_name, next.last_name, next.middle_name, next.birth_year, next.federation,
      next.club, next.title, next.rating_blitz, next.rating_rapid, next.rating_classic,
      player.id,
    ]
  );
  res.json(result.rows[0]);
});

export default router;
