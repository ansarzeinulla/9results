# SQLite → PostgreSQL Migration Checklist

## What Changed

| Aspect | SQLite | PostgreSQL |
|--------|--------|-----------|
| **Driver** | `better-sqlite3` | `pg` (node-postgres) |
| **API** | Sync (`.run()`, `.get()`, `.all()`) | Async (Promises) |
| **IDs** | `INTEGER PRIMARY KEY AUTOINCREMENT` | `SERIAL PRIMARY KEY` |
| **Parameters** | `?` placeholders | `$1, $2, ...` placeholders |
| **Queries** | SQLite-specific syntax | Standard PostgreSQL |
| **Decimals** | `REAL` | `DECIMAL` (for points) |
| **Case-insensitive search** | `LIKE` | `ILIKE` |
| **Transactions** | Synchronous | Asynchronous |
| **Connection** | File-based | TCP connection pool |

## Files Modified

✓ `backend/src/db.js` — Replaced better-sqlite3 with pg Pool, schema creation via SQL
✓ `backend/src/routes/auth.js` — Made async, updated parameter syntax
✓ `backend/src/routes/public.js` — Async queries, PostgreSQL syntax, ILIKE for search
✓ `backend/src/routes/organizer.js` — Async everywhere, $1/$2 params, pg error codes
✓ `backend/seed.js` — Async seeding with await
✓ `backend/package.json` — Removed better-sqlite3, added pg
✓ `backend/.env` — Added DATABASE_URL
✓ New: `POSTGRES_SETUP.md` — Complete setup instructions
✓ New: `docker-compose.yml` — Local Postgres via Docker

## Setup Instructions

### Local Development (Docker)
```bash
docker-compose up -d          # Start PostgreSQL
npm run dev                    # Backend auto-creates schema on connection
npm run seed                   # Populate demo data
# Visit http://localhost:5173
```

### Production (Supabase)
1. Create free account at https://supabase.com
2. Create a PostgreSQL project
3. Copy connection string to Vercel environment variables as `DATABASE_URL`
4. Deploy — schema is auto-created on first connection
5. Optional: `npm run seed` to add demo data

### Production (Neon)
1. Create free account at https://neon.tech
2. Create a PostgreSQL project
3. Copy connection string (includes SSL)
4. Same process as Supabase

## API Changes (For Developers)

### Database Calls Now Return Promises
```javascript
// Before (SQLite)
const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);

// After (PostgreSQL)
const user = await db.get('SELECT * FROM users WHERE id = $1', [id]);
```

### All Route Handlers Are Now Async
```javascript
// Before
router.post('/path', (req, res) => { ... })

// After
router.post('/path', async (req, res) => { ... })
```

### Error Handling for Unique Constraint
```javascript
// Before (SQLite)
if (String(e.message).includes('UNIQUE')) { ... }

// After (PostgreSQL)
if (e.code === '23505') { ... }  // PostgreSQL unique violation error code
```

## Schema Validation

Run this on a fresh PostgreSQL instance to verify all tables exist:

```sql
\dt                    -- List all tables
SELECT * FROM users;
SELECT * FROM players;
SELECT * FROM tournaments;
SELECT * FROM tournament_players;
SELECT * FROM matches;
```

## Data Integrity

- All foreign keys preserved (PostgreSQL enforces strictly)
- UNIQUE constraints on (username, tournament_player pair)
- CHECK constraints on status and result types
- Transactions still work perfectly (now async-based)
- Rating updates are still atomic

## Backward Compatibility

Old SQLite `database.db` file is no longer used. PostgreSQL database is configured entirely via `DATABASE_URL` environment variable.

To export data from SQLite if needed:
```bash
sqlite3 database.db ".dump" > schema.sql  # Save SQLite schema
psql $DATABASE_URL < schema.sql           # Import to PostgreSQL (may need adaptation)
```

## Performance Notes

- PostgreSQL connection pooling (default pool size: 10)
- Parameterized queries prevent SQL injection
- Buchholz calculation now uses proper SQL subqueries
- ILIKE for case-insensitive search (better than LIKE)
- DECIMAL for monetary values (better precision than REAL)

## Known Limitations

- Docker daemon required for local dev (`docker-compose up`)
- Supabase/Neon add slight network latency vs local SQLite
- For Vercel serverless, recommend connection pooling (Vercel Functions are ephemeral)

## Testing Checklist

Before shipping to production, verify:

- [ ] Auth login/register works
- [ ] Can create tournaments
- [ ] Can add players to tournaments
- [ ] Can generate rounds (Swiss + Round Robin)
- [ ] Can enter results and see points update
- [ ] Can finish tournament and see ratings update
- [ ] Buchholz tie-break displays correctly
- [ ] CSV export works
- [ ] Search finds tournaments and players
- [ ] Organizer can only access own tournaments
