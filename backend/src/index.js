import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import publicRoutes from './routes/public.js';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api', authRoutes);
app.use('/api', publicRoutes);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`results.togyz API listening on http://localhost:${PORT}`);
});
