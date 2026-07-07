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

async function initSchema() {
  if (schemaInitialized) return;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        role TEXT NOT NULL DEFAULT 'player' CHECK (role IN ('organizer','player')),
        username TEXT UNIQUE,
        password_hash TEXT,
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
        system_type TEXT NOT NULL DEFAULT 'swiss' CHECK (system_type IN ('swiss','round_robin')),
        organizer_id INTEGER REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        finished_at TIMESTAMPTZ,
        ratings_applied BOOLEAN NOT NULL DEFAULT false
      );

      CREATE TABLE IF NOT EXISTS tournament_players (
        id SERIAL PRIMARY KEY,
        tournament_id INTEGER NOT NULL REFERENCES tournaments(id),
        player_id INTEGER NOT NULL REFERENCES users(id),
        current_points DECIMAL NOT NULL DEFAULT 0,
        tiebreak_score DECIMAL NOT NULL DEFAULT 0,
        start_rating INTEGER,
        UNIQUE (tournament_id, player_id)
      );

      CREATE TABLE IF NOT EXISTS matches (
        id SERIAL PRIMARY KEY,
        tournament_id INTEGER NOT NULL REFERENCES tournaments(id),
        round_number INTEGER NOT NULL,
        player1_id INTEGER REFERENCES users(id),
        player2_id INTEGER REFERENCES users(id),
        result TEXT CHECK (result IS NULL OR result IN ('1-0','0-1','0.5-0.5','+--','--+','=-=','---'))
      );
    `);
    await client.query('COMMIT');
    schemaInitialized = true;
    console.log('✓ Database schema initialized');
  } catch (e) {
    await client.query('ROLLBACK');
    if (!e.message.includes('already exists')) throw e;
    schemaInitialized = true;
  } finally {
    client.release();
  }
}

// Wrapper to ensure schema is initialized before queries
const ensureSchema = async () => {
  if (!schemaInitialized) await initSchema();
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
  transaction: (fn) => {
    return async (...args) => {
      await ensureSchema();
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await fn(...args);
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
