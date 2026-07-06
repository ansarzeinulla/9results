# results.togyz — Tournament Management System

A complete togyzkumalak tournament platform with Swiss/Round-Robin pairings, Elo ratings, and dynamic standings.

**Status**: 7 phases complete, production-ready for Render + Vercel deployment.

---

## Quick Start (Local Development)

### Prerequisites
- Node 20+
- PostgreSQL (via Docker)

### 1. Start PostgreSQL
```bash
docker-compose up -d
```

### 2. Install & Seed
```bash
npm install
npm install --prefix backend
npm run seed --prefix backend
```

### 3. Run Both Servers
```bash
npm run dev
```

Open http://localhost:5173 and sign in:
- **Username**: organizer
- **Password**: password123

---

## Project Structure

```
9Results/
├── backend/                 # Express.js API (PostgreSQL)
│   ├── src/
│   │   ├── index.js        # App entry point
│   │   ├── db.js           # PostgreSQL connection & schema
│   │   ├── routes/         # API endpoints (auth, public, organizer)
│   │   ├── pairingEngine.js # Pure Swiss/Round-Robin pairing logic
│   │   ├── ratingEngine.js  # Pure Elo rating calculation
│   │   └── middleware/     # JWT authentication
│   ├── seed.js             # Demo data seeder
│   └── package.json
├── frontend/               # Vite + React
│   ├── src/
│   │   ├── pages/          # Tournament, standings, admin
│   │   ├── api.js          # Fetch helpers with auto-env detection
│   │   └── styles.css      # Mobile-friendly CSS
│   └── vite.config.js
├── docker-compose.yml      # PostgreSQL + pgAdmin
├── QUICK_DEPLOY.md         # 5-min production deployment
├── DEPLOY_RENDER_VERCEL.md # Full step-by-step guide
└── POSTGRES_SETUP.md       # Database configuration

```

---

## Architecture

### Backend (Express + PostgreSQL)
- **JWT auth** — organizers log in, get 12h token
- **Protected routes** — organizers can only access own tournaments
- **Pairing engine** — pure module for Swiss (with backtracking) and Round-Robin
- **Rating engine** — pure Elo calculation, applied on tournament finish
- **Transactions** — atomic point updates, rating recalculation
- **Async/await** — PostgreSQL via `pg` library with connection pooling

### Frontend (Vite + React)
- **Dynamic routing** — home, tournaments, standings, admin dashboard, player profiles
- **Auto-detection** — localhost calls local API, production calls Render backend
- **Export** — CSV download of standings
- **Print-friendly** — wall charts optimized for printing
- **Responsive** — mobile-first CSS

### Database (PostgreSQL)
- **Schema**: users, players, tournaments, tournament_players, matches
- **Buchholz tie-break**: computed dynamically from match history
- **Constraints**: unique users, no duplicate matches, result validation
- **Foreign keys**: enforced integrity

---

## Features

✅ **Tournaments**
- Create Swiss or Round-Robin tournaments
- Add players from global pool
- Track status (setup → ongoing → finished)

✅ **Pairings**
- Swiss: greedy with backtracking, prevents rematches, auto-byes
- Round-Robin: circle method, deterministic schedule
- Bye handling: lowest-ranked without prior bye gets free point

✅ **Results & Scoring**
- Enter match results: 1-0, 0-1, 0.5-0.5, 0-0 (plus forfeit codes)
- Transactional point updates (corrections allowed)
- Result reversal: old points deducted before new ones applied

✅ **Tie-Breaking**
- Buchholz score: sum of opponent points
- Sort: Points → Buchholz → Rating

✅ **Ratings**
- Standard Elo (K=20)
- Applied on tournament finish (idempotent)
- Live updated on global player list

✅ **Public Pages**
- Search tournaments & players
- View live standings
- Player tournament history
- CSV export & print view

✅ **Admin Dashboard**
- Organizer sees only own tournaments
- Tournament settings (name, location, system, status)
- Participant management
- Results entry with quick-score buttons
- Generate next round with one click

---

## Deployment

### Option 1: Local Development
```bash
docker-compose up -d
npm run dev
```

### Option 2: Render (Backend) + Vercel (Frontend)
See **QUICK_DEPLOY.md** for 5-min setup.

**Costs**:
- Free tier: $0/month (Render sleeps after 15 min idle)
- Production: ~$7/month (Render Starter for always-on)

**Databases supported**:
- Supabase (recommended, free tier included)
- Neon (alternative, free tier)
- Any PostgreSQL with a connection string

---

## API Endpoints

### Public (No Auth)
```
GET  /api/tournaments              # List all tournaments
GET  /api/tournaments/:id          # Single tournament details
GET  /api/tournaments/:id/standings # Standings with Buchholz
GET  /api/tournaments/:id/matches  # Match history
GET  /api/players                  # All players (by rating)
GET  /api/players/:id              # Player profile + history
GET  /api/search?q=...             # Search tournaments & players
```

### Auth
```
POST /api/register                 # Create organizer account
POST /api/login                    # Get JWT token
```

### Protected (Require JWT)
```
GET  /api/my/tournaments           # Organizer's tournaments
POST /api/tournaments              # Create new tournament
PUT  /api/tournaments/:id          # Update settings, finish & apply ratings
POST /api/tournaments/:id/add-player      # Register player
POST /api/tournaments/:id/matches         # Create match pairing
POST /api/tournaments/:id/results         # Enter match result
POST /api/tournaments/:id/generate-round  # Auto-generate pairings
```

---

## Testing

### Unit Tests (Pairings & Ratings)
```bash
cd backend
node --input-type=module -e "
import { generateSwissRound, generateRoundRobinRound } from './src/pairingEngine.js';
import { calculateElo } from './src/ratingEngine.js';
// See backend tests in commit history for full examples
"
```

### Manual Testing
1. Sign in as organizer
2. Create a tournament
3. Add 5+ players
4. Generate a round
5. Enter results (watch Buchholz update)
6. Finish tournament (watch ratings update)
7. Verify CSV export works

---

## Known Limitations

- **Render free tier**: sleeps after 15 min inactivity (upgrade to Starter for always-on)
- **Buchholz**: excludes byes (design choice — only real opponents count)
- **Ratings**: K-factor is fixed at 20 (can be parameterized later)
- **Pairings**: Swiss doesn't optimize for color balance (enhancement future)

---

## Tech Stack

| Layer | Tech | Version |
|-------|------|---------|
| Frontend | Vite, React, React Router | Latest |
| Backend | Express, node-postgres | v4, pg v8 |
| Database | PostgreSQL | 16 |
| Auth | JWT (jsonwebtoken) | v9 |
| Password | bcryptjs | v2 |
| Hosting | Render (backend), Vercel (frontend) | N/A |

---

## Development

### Add a feature
1. Design in a `.md` file (see DESIGN docs)
2. Implement backend route (async/await, parameterized queries)
3. Implement frontend component + page
4. Test locally (`npm run dev`)
5. Commit, push → auto-deploys to Render/Vercel

### Update database schema
1. Modify `backend/src/db.js` `CREATE TABLE` block
2. Delete old local database: `rm backend/database.db` (local SQLite) or reset Postgres
3. Run seed: `npm run seed --prefix backend`

### Common Tasks

**Change JWT expiry** → `backend/src/middleware/auth.js`
**Change Elo K-factor** → `backend/src/ratingEngine.js`
**Adjust CORS** → `backend/src/index.js`
**Update API base URL** → `frontend/src/api.js`

---

## Future Enhancements

- [ ] Tiebreak preferences (Buchholz, Berger, Koya)
- [ ] Color balance in Swiss pairings
- [ ] Tournament templates (Lightning, Blitz, Classical)
- [ ] Live leaderboard (WebSocket updates)
- [ ] Photo uploads for players
- [ ] Mobile app (React Native)
- [ ] Admin panel for user management
- [ ] Email notifications

---

## Support

- **Docs**: See `QUICK_DEPLOY.md`, `DEPLOY_RENDER_VERCEL.md`, `POSTGRES_SETUP.md`
- **Logs**: Check Render/Vercel dashboards
- **Issues**: Check `backend/src/index.js` logs or browser console

---

## License

MIT (open source)

---

**Ready to deploy?** → Read **QUICK_DEPLOY.md** 🚀
