import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import publicRoutes from './routes/public.js';
import organizerRoutes from './routes/organizer.js';

const app = express();
app.use(
  cors({
    origin: [
      'http://localhost:5173', // Local Vite dev
      'http://localhost:3000', // Fallback
      'https://9results.vercel.app', // Vercel production
      process.env.FRONTEND_URL, // Allow env override
    ].filter(Boolean),
    credentials: true,
  })
);
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api', authRoutes);
app.use('/api', organizerRoutes);
app.use('/api', publicRoutes);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`results.togyz API listening on http://localhost:${PORT}`);
});