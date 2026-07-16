import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import publicRoutes from './routes/public.js';
import organizerRoutes from './routes/organizer.js';
import playerRoutes from './routes/players.js';
import adminRoutes from './routes/admin.js';

const app = express();

// CORS configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://9results.vercel.app',
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('CORS not allowed'));
      }
    },
    credentials: true,
  })
);
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api', authRoutes);
app.use('/api', organizerRoutes);
app.use('/api', adminRoutes);
app.use('/api', playerRoutes);
app.use('/api', publicRoutes);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`results.togyz API listening on http://localhost:${PORT}`);
});