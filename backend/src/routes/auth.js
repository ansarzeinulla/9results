import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db.js';
import { JWT_SECRET } from '../middleware/auth.js';

const router = Router();

function signToken(user) {
  return jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '12h' });
}

router.post('/register', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password are required' });
  }
  const existing = await db.get('SELECT id FROM users WHERE username = $1', [username]);
  if (existing) return res.status(409).json({ error: 'Username already taken' });

  const password_hash = bcrypt.hashSync(password, 10);
  const result = await db.run('INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username', [
    username,
    password_hash,
  ]);
  const user = result.rows[0];
  res.status(201).json({ token: signToken(user), user });
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password are required' });
  }
  const user = await db.get('SELECT * FROM users WHERE username = $1', [username]);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }
  res.json({ token: signToken(user), user: { id: user.id, username: user.username } });
});

export default router;
