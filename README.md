# results.togyz — Togyzkumalak Tournament Platform

A modern chess-results-style platform for togyzkumalak tournaments: Swiss pairings,
Elo ratings, live standings with tie-breaks, and a multilingual (RU/EN/KZ),
mobile-first public site.

## Architecture

| Layer | Tech | Hosting | Role |
|---|---|---|---|
| `frontend-next/` | Next.js (App Router) + Tailwind + next-intl | Vercel | Public pages read directly from Supabase (RLS read-only); organizer UI calls the API |
| `backend-py/` | Python FastAPI | Render | JWT auth, Swiss pairing engine, Elo engine, calls SQL procedures |
| `db/` | PostgreSQL (Supabase) | Supabase | Normalized schema, translations, stored procedures, RLS |

## Repository layout

```
db/build/                         # consolidated, final-state schema — for a fresh database
db/seeds/                         # reference data + bootstrap accounts (idempotent)
db/rebuild.sh                     # drop & replay build/ + seeds/ in one command (see db/README.md)
backend-py/app/engines/swiss.py   # FIDE-Dutch-style Swiss engine (ported from JS, 25 tests)
backend-py/app/engines/rating.py  # Elo (K=20)
backend-py/app/routers/           # auth, organizer/admin actions
frontend-next/src/app/[locale]/   # ru/en/kk/tr/es/cs/ko routes: tournaments, players, organizer
```

See `db/README.md` for the full schema layout and how `build/`, `seeds/`, and the
archived `migrations/_legacy/` chain relate to each other.

## Local development

```bash
# 1. Postgres (docker, or a local server on :5432) — schema + seeds in one step
docker compose up -d
db/rebuild.sh

# 2. Backend API on :8000
cd backend-py
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/results_togyz \
JWT_SECRET=dev-secret .venv/bin/uvicorn app.main:app --port 8000

# 3. Frontend on :3000
cd frontend-next && npm install
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/results_togyz npm run dev
```

Default admin: `admin` / `admin12345` (change in production!).

## Tests

```bash
cd backend-py && .venv/bin/pytest        # schema, procedures, RLS, engines, API (377+ tests)
cd frontend-next && npx tsc --noEmit     # type check
cd frontend-next && npm test             # Vitest component tests + i18n key-parity check
cd frontend-next && npm run build        # production build check
```

All four run automatically on every push/PR — see `.github/workflows/ci.yml`.

## Deployment

1. **Supabase**: on a brand-new (or emptied) project there is no schema yet, so run
   both directories in order:
   ```bash
   for f in db/build/*.sql db/seeds/*.sql; do psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"; done
   ```
   (via the SQL editor or `psql "$SUPABASE_DB_URL"`). `build/` is not idempotent —
   only apply it to an empty database. Once the schema exists, redeploying only
   new reference data is `db/rebuild.sh` with `DATABASE_URL` set, which replays
   `seeds/` alone (all seeds are `ON CONFLICT DO NOTHING`). Replace the seeded
   admin password afterwards: `UPDATE users SET password_hash = crypt(...)` with
   a bcrypt hash of your own.
2. **Render** (backend): root dir `backend-py`, build `pip install -r requirements.txt`,
   start `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
   Env: `DATABASE_URL` (Supabase *direct* connection string), `JWT_SECRET`,
   `CORS_ORIGINS=https://<your-app>.vercel.app`.
3. **Vercel** (frontend): repository root (vercel.json points at `frontend-next`).
   Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `NEXT_PUBLIC_API_URL=https://<your-api>.onrender.com`.

## Organizer flow

Login → create tournament → add players by ID (starting ranks auto-sync by rating) →
generate Swiss round → enter results with one tap (1-0 / ½-½ / 0-1 + special results) →
close round (snapshots standings history) → repeat → finalize (applies Elo, writes
rating history, marks the tournament FINISHED).
