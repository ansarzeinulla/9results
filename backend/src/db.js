import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/results_togyz',
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client:', err);
  process.exit(-1);
});

// Initialize schema on first connection (deferred to avoid startup crash)
let schemaInitialized = false;

// bcrypt hash of "password123" (same as the seeded organizer's).
const SEED_PASSWORD_HASH = '$2b$10$4.Tw6opY6JyfpprLZDSSVu.I4mGySY0Pb8fBtKybXkdne3UhFuDNm';

async function initSchema() {
  if (schemaInitialized) return;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // One-time destructive migration: the current schema keeps login
    // accounts in `users` and player profiles in a dedicated `players`
    // table (plus matches.board_number). If an older layout is present,
    // drop and rebuild (authorized — throwaway data).
    const outdated = await client.query(`
      SELECT (
        EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'matches')
        AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'matches' AND column_name = 'board_number'
        )
      ) OR (
        EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users')
        AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'players')
      ) AS stale
    `);
    if (outdated.rows[0].stale) {
      await client.query('DROP TABLE IF EXISTS matches, tournament_players, tournaments, players, users CASCADE');
      console.log('✓ Dropped outdated schema (pre players-table split)');
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        role TEXT NOT NULL DEFAULT 'organizer' CHECK (role IN ('admin','organizer')),
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        federation TEXT NOT NULL DEFAULT 'KAZ'
      );

      CREATE TABLE IF NOT EXISTS players (
        id SERIAL PRIMARY KEY,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        middle_name TEXT,
        birth_year INTEGER,
        federation TEXT NOT NULL DEFAULT 'KAZ',
        club TEXT,
        title TEXT,
        rating_blitz INTEGER NOT NULL DEFAULT 1200,
        rating_rapid INTEGER NOT NULL DEFAULT 1200,
        rating_classic INTEGER NOT NULL DEFAULT 1200
      );

      CREATE TABLE IF NOT EXISTS tournaments (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        federation TEXT NOT NULL DEFAULT 'KAZ',
        city TEXT,
        level TEXT NOT NULL DEFAULT 'Regional' CHECK (level IN ('International','National','Regional','School','Test')),
        rating_type TEXT NOT NULL DEFAULT 'non_rated' CHECK (rating_type IN ('blitz','rapid','classic','non_rated')),
        status TEXT NOT NULL DEFAULT 'setup' CHECK (status IN ('setup','ongoing','finished')),
        gender TEXT NOT NULL DEFAULT 'all' CHECK (gender IN ('all','male','female')),
        age_category TEXT NOT NULL DEFAULT 'all' CHECK (age_category IN ('all','U6','U8','U10','U12','U14','U16','U18','U20')),
        organizer_id INTEGER REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        finished_at TIMESTAMPTZ,
        ratings_applied BOOLEAN NOT NULL DEFAULT false
      );

      CREATE TABLE IF NOT EXISTS tournament_players (
        id SERIAL PRIMARY KEY,
        tournament_id INTEGER NOT NULL REFERENCES tournaments(id),
        player_id INTEGER NOT NULL REFERENCES players(id),
        current_points DECIMAL NOT NULL DEFAULT 0,
        start_rating INTEGER,
        UNIQUE (tournament_id, player_id)
      );

      CREATE TABLE IF NOT EXISTS rating_history (
        id SERIAL PRIMARY KEY,
        player_id INTEGER NOT NULL REFERENCES players(id),
        tournament_id INTEGER REFERENCES tournaments(id),
        rating_type TEXT NOT NULL CHECK (rating_type IN ('blitz','rapid','classic')),
        old_rating INTEGER NOT NULL,
        delta INTEGER NOT NULL,
        new_rating INTEGER NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS matches (
        id SERIAL PRIMARY KEY,
        tournament_id INTEGER NOT NULL REFERENCES tournaments(id),
        round_number INTEGER NOT NULL,
        board_number INTEGER,
        player1_id INTEGER REFERENCES players(id),
        player2_id INTEGER REFERENCES players(id),
        result TEXT CHECK (result IS NULL OR result IN ('1-0','0-1','0.5-0.5','+--','--+','=-=','---'))
      );
    `);

    // Tie-breaks are computed on the fly; drop the never-used stored column.
    await client.query('ALTER TABLE tournament_players DROP COLUMN IF EXISTS tiebreak_score');

    // Seed login accounts so a fresh database is usable immediately.
    await client.query(
      `INSERT INTO users (role, username, password_hash, first_name, last_name, federation)
       SELECT 'admin', 'admin', $1, 'Site', 'Admin', 'KAZ'
       WHERE NOT EXISTS (SELECT 1 FROM users WHERE role = 'admin')`,
      [SEED_PASSWORD_HASH]
    );
    await client.query(
      `INSERT INTO users (role, username, password_hash, first_name, last_name, federation)
       SELECT 'organizer', 'organizer', $1, 'Askar', 'Organizer', 'KAZ'
       WHERE NOT EXISTS (SELECT 1 FROM users WHERE role = 'organizer')`,
      [SEED_PASSWORD_HASH]
    );

    await client.query('COMMIT');
    schemaInitialized = true;
    console.log('✓ Database schema initialized');
  } catch (e) {
    await client.query('ROLLBACK');
    // Benign races: another connection created the same table/sequence
    // concurrently ("already exists", or 23505 on pg_class internals).
    if (!e.message.includes('already exists') && e.code !== '23505') throw e;
    schemaInitialized = true;
  } finally {
    client.release();
  }
}

// Ensure schema init runs at most once, even under concurrent first requests.
let initPromise = null;
const ensureSchema = async () => {
  if (schemaInitialized) return;
  initPromise ??= initSchema().catch((e) => {
    initPromise = null; // allow a retry on genuine failures
    throw e;
  });
  await initPromise;
};

// Export convenience wrapper: query(sql, params) returns Promise<result>
export const db = {
  query: async (sql, params = []) => {
    await ensureSchema();
    return pool.query(sql, params);
  },
  get: async (sql, params) => {
    await ensureSchema();
    const res = await pool.query(sql, params);
    return res.rows[0] || null;
  },
  all: async (sql, params) => {
    await ensureSchema();
    const res = await pool.query(sql, params);
    return res.rows;
  },
  run: async (sql, params) => {
    await ensureSchema();
    const res = await pool.query(sql, params);
    return res;
  },
  prepare: (sql) => ({
    run: async (...params) => {
      await ensureSchema();
      return pool.query(sql, params);
    },
    get: async (...params) => {
      await ensureSchema();
      const res = await pool.query(sql, params);
      return res.rows[0] || null;
    },
    all: async (...params) => {
      await ensureSchema();
      const res = await pool.query(sql, params);
      return res.rows;
    },
  }),
  // fn receives a `tx` whose run/get/all execute on the SAME client as
  // BEGIN/COMMIT — using db.* inside would escape the transaction.
  transaction: (fn) => {
    return async (...args) => {
      await ensureSchema();
      const client = await pool.connect();
      const tx = {
        run: (sql, params = []) => client.query(sql, params),
        get: async (sql, params = []) => (await client.query(sql, params)).rows[0] || null,
        all: async (sql, params = []) => (await client.query(sql, params)).rows,
      };
      try {
        await client.query('BEGIN');
        const result = await fn(tx, ...args);
        await client.query('COMMIT');
        return result;
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    };
  },
  pool,
};

export default db;
