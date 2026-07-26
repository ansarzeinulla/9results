#!/usr/bin/env bash
# Drop and recreate the database from build/ + seeds/ — the whole schema and
# all reference data live in those files, so this is always safe to re-run.
#
#   db/rebuild.sh                          # rebuilds results_togyz locally
#   DB=my_db db/rebuild.sh                 # another local database
#   DATABASE_URL=postgres://… db/rebuild.sh  # remote: seeds only, no drop
#
# With DATABASE_URL set the script does NOT drop anything: it just applies the
# files in order, which is safe because every seed is written to be idempotent
# (ON CONFLICT DO NOTHING) while build/ is not — apply build/ to a live
# database only when you know it is empty.
set -euo pipefail

cd "$(dirname "$0")/.."
DB="${DB:-results_togyz}"

if [[ -n "${DATABASE_URL:-}" ]]; then
  target="$DATABASE_URL"
  files=(db/seeds/*.sql)
  echo "Applying seeds to \$DATABASE_URL (no drop)…"
else
  target="postgresql://localhost:5432/$DB"
  files=(db/build/*.sql db/seeds/*.sql)
  echo "Rebuilding local database '$DB' from scratch…"
  dropdb --if-exists "$DB"
  createdb "$DB"
fi

for f in "${files[@]}"; do
  echo "  → $f"
  psql -q "$target" -v ON_ERROR_STOP=1 -f "$f" >/dev/null
done
echo "Done."
