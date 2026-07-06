import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { generateRound, PairingError } from '../pairingEngine.js';

const router = Router();

// Points awarded to (player1, player2) for each result code
const POINTS = {
  '1-0': [1, 0],
  '0-1': [0, 1],
  '0.5-0.5': [0.5, 0.5],
  '0-0': [0, 0],
  '+--': [1, 0],
  '--+': [0, 1],
  '=-=': [0, 0],
};

function ownedTournament(req, res) {
  const t = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
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

router.get('/my/tournaments', requireAuth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT t.*, COUNT(tp.id) AS player_count
       FROM tournaments t LEFT JOIN tournament_players tp ON tp.tournament_id = t.id
       WHERE t.organizer_id = ? GROUP BY t.id ORDER BY t.id DESC`
    )
    .all(req.user.id);
  res.json(rows);
});

router.post('/tournaments', requireAuth, (req, res) => {
  const { name, location, system_type } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name is required' });
  const type = system_type === 'round_robin' ? 'round_robin' : 'swiss';
  const info = db
    .prepare('INSERT INTO tournaments (name, location, system_type, organizer_id) VALUES (?, ?, ?, ?)')
    .run(name, location || null, type, req.user.id);
  res.status(201).json(db.prepare('SELECT * FROM tournaments WHERE id = ?').get(info.lastInsertRowid));
});

router.put('/tournaments/:id', requireAuth, (req, res) => {
  const t = ownedTournament(req, res);
  if (!t) return;
  const { name, location, system_type, status } = req.body || {};
  const next = {
    name: name ?? t.name,
    location: location ?? t.location,
    system_type: ['swiss', 'round_robin'].includes(system_type) ? system_type : t.system_type,
    status: ['setup', 'ongoing', 'finished'].includes(status) ? status : t.status,
  };
  db.prepare('UPDATE tournaments SET name = ?, location = ?, system_type = ?, status = ? WHERE id = ?')
    .run(next.name, next.location, next.system_type, next.status, t.id);
  res.json(db.prepare('SELECT * FROM tournaments WHERE id = ?').get(t.id));
});

router.post('/tournaments/:id/add-player', requireAuth, (req, res) => {
  const t = ownedTournament(req, res);
  if (!t) return;
  const { player_id } = req.body || {};
  const player = db.prepare('SELECT id FROM players WHERE id = ?').get(player_id);
  if (!player) return res.status(400).json({ error: 'Unknown player_id' });
  try {
    db.prepare('INSERT INTO tournament_players (tournament_id, player_id) VALUES (?, ?)').run(t.id, player_id);
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) {
      return res.status(409).json({ error: 'Player already in tournament' });
    }
    throw e;
  }
  res.status(201).json({ ok: true });
});

router.post('/tournaments/:id/matches', requireAuth, (req, res) => {
  const t = ownedTournament(req, res);
  if (!t) return;
  const { round_number, player1_id, player2_id } = req.body || {};
  if (!round_number || !player1_id) {
    return res.status(400).json({ error: 'round_number and player1_id are required' });
  }
  const inTournament = db.prepare(
    'SELECT 1 FROM tournament_players WHERE tournament_id = ? AND player_id = ?'
  );
  if (!inTournament.get(t.id, player1_id) || (player2_id && !inTournament.get(t.id, player2_id))) {
    return res.status(400).json({ error: 'Both players must be tournament participants' });
  }
  const info = db
    .prepare('INSERT INTO matches (tournament_id, round_number, player1_id, player2_id) VALUES (?, ?, ?, ?)')
    .run(t.id, round_number, player1_id, player2_id || null);
  res.status(201).json(db.prepare('SELECT * FROM matches WHERE id = ?').get(info.lastInsertRowid));
});

const submitResult = db.transaction((tournamentId, match, result) => {
  const adjust = db.prepare(
    'UPDATE tournament_players SET current_points = current_points + ? WHERE tournament_id = ? AND player_id = ?'
  );
  // Reverse previously applied points if the match already had a result
  if (match.result) {
    const [oldP1, oldP2] = POINTS[match.result];
    adjust.run(-oldP1, tournamentId, match.player1_id);
    if (match.player2_id) adjust.run(-oldP2, tournamentId, match.player2_id);
  }
  const [p1, p2] = POINTS[result];
  adjust.run(p1, tournamentId, match.player1_id);
  if (match.player2_id) adjust.run(p2, tournamentId, match.player2_id);
  db.prepare('UPDATE matches SET result = ? WHERE id = ?').run(result, match.id);
});

router.post('/tournaments/:id/results', requireAuth, (req, res) => {
  const t = ownedTournament(req, res);
  if (!t) return;
  const { match_id, result } = req.body || {};
  if (!(result in POINTS)) {
    return res.status(400).json({ error: `result must be one of: ${Object.keys(POINTS).join(', ')}` });
  }
  const match = db
    .prepare('SELECT * FROM matches WHERE id = ? AND tournament_id = ?')
    .get(match_id, t.id);
  if (!match) return res.status(404).json({ error: 'Match not found in this tournament' });

  submitResult(t.id, match, result);
  res.json(db.prepare('SELECT * FROM matches WHERE id = ?').get(match.id));
});

const insertRound = db.transaction((tournamentId, roundNumber, pairings) => {
  const insertMatch = db.prepare(
    'INSERT INTO matches (tournament_id, round_number, player1_id, player2_id, result) VALUES (?, ?, ?, ?, ?)'
  );
  const awardByePoint = db.prepare(
    'UPDATE tournament_players SET current_points = current_points + 1 WHERE tournament_id = ? AND player_id = ?'
  );
  const ids = [];
  for (const p of pairings) {
    if (p.player2_id == null) {
      // Bye: recorded as a decided match, free point awarded immediately
      ids.push(insertMatch.run(tournamentId, roundNumber, p.player1_id, null, '1-0').lastInsertRowid);
      awardByePoint.run(tournamentId, p.player1_id);
    } else {
      ids.push(insertMatch.run(tournamentId, roundNumber, p.player1_id, p.player2_id, null).lastInsertRowid);
    }
  }
  return ids;
});

router.post('/tournaments/:id/generate-round', requireAuth, (req, res) => {
  const t = ownedTournament(req, res);
  if (!t) return;

  const players = db
    .prepare(
      `SELECT tp.player_id, tp.current_points, tp.tiebreak_score, p.current_rating
       FROM tournament_players tp JOIN players p ON p.id = tp.player_id
       WHERE tp.tournament_id = ?`
    )
    .all(t.id);
  const previousMatches = db
    .prepare('SELECT round_number, player1_id, player2_id, result FROM matches WHERE tournament_id = ?')
    .all(t.id);

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

  const ids = insertRound(t.id, roundNumber, pairings);
  const created = db
    .prepare(
      `SELECT m.*, p1.full_name AS player1_name, p2.full_name AS player2_name
       FROM matches m
       LEFT JOIN players p1 ON p1.id = m.player1_id
       LEFT JOIN players p2 ON p2.id = m.player2_id
       WHERE m.id IN (${ids.map(() => '?').join(',')})`
    )
    .all(...ids);
  res.status(201).json({ round_number: roundNumber, matches: created });
});

export default router;
