import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/results_togyz',
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client:', err);
  process.exit(-1);
});

// Initialize schema on startup
async function initSchema() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS players (
        id SERIAL PRIMARY KEY,
        full_name TEXT NOT NULL,
        current_rating INTEGER NOT NULL DEFAULT 1200
      );

      CREATE TABLE IF NOT EXISTS tournaments (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        location TEXT,
        status TEXT NOT NULL DEFAULT 'setup' CHECK (status IN ('setup','ongoing','finished')),
        system_type TEXT NOT NULL DEFAULT 'swiss' CHECK (system_type IN ('swiss','round_robin')),
        organizer_id INTEGER REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS tournament_players (
        id SERIAL PRIMARY KEY,
        tournament_id INTEGER NOT NULL REFERENCES tournaments(id),
        player_id INTEGER NOT NULL REFERENCES players(id),
        current_points DECIMAL NOT NULL DEFAULT 0,
        tiebreak_score DECIMAL NOT NULL DEFAULT 0,
        UNIQUE (tournament_id, player_id)
      );

      CREATE TABLE IF NOT EXISTS matches (
        id SERIAL PRIMARY KEY,
        tournament_id INTEGER NOT NULL REFERENCES tournaments(id),
        round_number INTEGER NOT NULL,
        player1_id INTEGER REFERENCES players(id),
        player2_id INTEGER REFERENCES players(id),
        result TEXT CHECK (result IS NULL OR result IN ('1-0','0-1','0.5-0.5','0-0','+--','--+','=-='))
      );
    `);
    await client.query('COMMIT');
    console.log('Database schema initialized');
  } catch (e) {
    await client.query('ROLLBACK');
    if (!e.message.includes('already exists')) throw e;
  } finally {
    client.release();
  }
}

await initSchema();

// Export convenience wrapper: query(sql, params) returns Promise<result>
export const db = {
  query: (sql, params = []) => pool.query(sql, params),
  get: async (sql, params) => {
    const res = await pool.query(sql, params);
    return res.rows[0] || null;
  },
  all: async (sql, params) => {
    const res = await pool.query(sql, params);
    return res.rows;
  },
  run: async (sql, params) => {
    const res = await pool.query(sql, params);
    return res;
  },
  prepare: (sql) => ({
    run: (...params) => pool.query(sql, params),
    get: (...params) => pool.query(sql, params).then((r) => r.rows[0] || null),
    all: (...params) => pool.query(sql, params).then((r) => r.rows),
  }),
  transaction: (fn) => {
    return async (...args) => {
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
