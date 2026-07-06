# results.togyz — Phase 1 Design: Project Setup, Database Schema, Auth

Date: 2026-07-06

## Purpose

Tournament management web app for togyzkumalak, modeled on chess-results.com. Phase 1 delivers the project skeleton: Express API, SQLite database, Vite/React frontend, JWT auth, and seed data.

## Decisions

- **Auth:** JWT bearer tokens (`jsonwebtoken`), 12h expiry, passwords hashed with bcryptjs. `/api/register` is open for now (lock down in a later phase).
- **Database:** `better-sqlite3`, file at `backend/database.db`, schema created idempotently on connection, `foreign_keys = ON`, WAL mode.
- **Match results:** TEXT column, allowed values `1-0`, `0-1`, `0.5-0.5` (rated) and `+--`, `--+`, `=-=` (absence/forfeit — excluded from future rating calculations). `NULL` = not yet played.

## Architecture

- `backend/` — Express 4 (ESM), port 3001.
  - `src/db.js` — connection + schema DDL (single source of truth for the schema).
  - `src/routes/auth.js` — `POST /api/register` (201 / 409 duplicate), `POST /api/login` (200 + token / 401).
  - `src/middleware/auth.js` — `requireAuth` bearer-token middleware for later phases.
  - `seed.js` — idempotent seed: organizer (`organizer` / `password123`) + 10 players (ratings 1445–2180).
- `frontend/` — Vite + React 18 (JS). `Login.jsx` posts to `/api/login` (Vite dev proxy → :3001), stores token in localStorage, shows a placeholder dashboard with logout.
- Root `package.json` — `npm run dev` uses `concurrently` to run both servers.

## Schema

| Table | Columns |
|---|---|
| users | id, username UNIQUE, password_hash |
| players | id, full_name, current_rating (default 1200) |
| tournaments | id, name, location, status (setup/ongoing/finished), system_type (swiss/round_robin), organizer_id → users |
| tournament_players | id, tournament_id, player_id, current_points, tiebreak_score, UNIQUE(tournament_id, player_id) |
| matches | id, tournament_id, round_number, player1_id, player2_id (NULL = bye), result (CHECK constraint above) |

## Error handling

- 400 missing fields, 401 bad credentials/token, 409 duplicate username. JSON `{error}` bodies throughout; frontend surfaces the message under the form.

## Verification (performed)

- Login with seeded credentials returns a JWT; wrong password → 401; duplicate register → 409.
- 5 tables present; 10 players and 1 organizer seeded.
- Frontend production build passes.
