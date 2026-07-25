# Database

PostgreSQL / Supabase schema for the togyzkumalak (and chess/checkers-style)
tournament platform.

There are two ways to stand up the schema. Use **`build/`** for a fresh
database; use **`migrations/`** to evolve one that already has data.

## Layout

```
db/
├── build/            # consolidated, final-state schema — for a fresh rebuild
│   ├── 01_reference.sql        lookup/reference tables + their translations
│   ├── 02_people.sql           officials, users, organizations
│   ├── 03_core.sql             players, tournaments, teams
│   ├── 04_tournament_data.sql  rounds, team_matches, participants, pairings, history
│   ├── 05_indexes.sql          all secondary indexes (+ pg_trgm)
│   ├── 06_functions.sql        views, triggers, functions, procedures
│   └── 07_security.sql         RLS policies + anon grants
├── seeds/            # reference data + bootstrap accounts
│   ├── 01_reference_data.sql   languages, statuses, tie-breaks, time controls, …
│   ├── 02_locations.sql        Kazakhstan regions/cities + translations
│   └── 03_accounts.sql         admin & organizer login accounts
├── migrations/
│   └── _legacy/      # the original append-only chain 001–009 (archived)
└── docs/
    └── game-rules.md # source game rules the schema is modeled on
```

## Rebuild from scratch (fresh database)

Run the `build/` files, then the `seeds/`, each group in numeric order:

```bash
for f in db/build/*.sql db/seeds/*.sql; do
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"
done
```

Ordering matters and is encoded in the filename prefixes:
`build/` (schema) before `seeds/` (data); within `seeds/`,
`01_reference_data.sql` seeds `languages` and the lookup rows that
`02_locations.sql` and `03_accounts.sql` depend on.

## Evolve an existing database

Apply `migrations/_legacy/001…009` in order. These are the original,
append-only migrations; `build/` is their consolidated end state, so **do not
run both** against the same database.

## Notes

- `build/` collapses each table to its final shape. Columns added by later
  legacy migrations (e.g. `players.aliases`, `tournament_participants.team_id`,
  `tournaments.status` as an FK) appear inline, not as `ALTER TABLE`.
- The backend connects as the table owner and bypasses RLS; `anon` is
  read-only. See the review note at the top of `build/07_security.sql` about
  newer lookup tables that are intentionally not exposed to `anon`.
- Change the seeded `admin` / `organizer` passwords before production
  (`seeds/03_accounts.sql`).
```
