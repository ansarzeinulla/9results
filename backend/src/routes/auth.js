import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db.js';
import { JWT_SECRET } from '../middleware/auth.js';

const router = Router();

function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, federation: user.federation, role: user.role },
    JWT_SECRET,
    { expiresIn: '12h' }
  );
}

// Admin/organizer login. There is no self-registration.
router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password are required' });
  }
  const user = await db.get(
    "SELECT * FROM users WHERE username = $1 AND role IN ('admin','organizer')",
    [username]
  );
  if (!user || !user.password_hash || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }
  res.json({
    token: signToken(user),
    user: { id: user.id, username: user.username, federation: user.federation, role: user.role },
  });
});

export default router;
