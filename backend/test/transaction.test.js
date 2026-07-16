// Requires a local Postgres (uses a dedicated scratch database).
// Verifies db.transaction actually rolls back all inner writes on failure.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';

const TEST_DB = 'results_togyz_unittest';
process.env.DATABASE_URL = `postgresql://postgres:postgres@localhost:5432/${TEST_DB}`;

let db;

before(async () => {
  execSync(`psql -h localhost -U postgres -c "DROP DATABASE IF EXISTS ${TEST_DB}" -c "CREATE DATABASE ${TEST_DB}"`, {
    stdio: 'ignore',
  });
  ({ default: db } = await import('../src/db.js'));
  await db.run('CREATE TABLE IF NOT EXISTS tx_probe (id SERIAL PRIMARY KEY, note TEXT)');
});

after(async () => {
  await db.pool.end();
});

test('transaction rolls back earlier writes when a later statement throws', async () => {
  await db.run('DELETE FROM tx_probe');
  const failing = db.transaction(async (tx) => {
    await tx.run("INSERT INTO tx_probe (note) VALUES ('should vanish')");
    throw new Error('boom');
  });
  await assert.rejects(failing(), /boom/);
  const rows = await db.all('SELECT * FROM tx_probe');
  assert.equal(rows.length, 0, 'insert inside a failed transaction must be rolled back');
});

test('transaction commits all writes on success', async () => {
  await db.run('DELETE FROM tx_probe');
  const ok = db.transaction(async (tx) => {
    await tx.run("INSERT INTO tx_probe (note) VALUES ('a')");
    await tx.run("INSERT INTO tx_probe (note) VALUES ('b')");
    return 42;
  });
  assert.equal(await ok(), 42);
  const rows = await db.all('SELECT * FROM tx_probe ORDER BY id');
  assert.deepEqual(rows.map((r) => r.note), ['a', 'b']);
});

test('transaction writes are read back consistently inside the transaction', async () => {
  await db.run('DELETE FROM tx_probe');
  const fn = db.transaction(async (tx) => {
    await tx.run("INSERT INTO tx_probe (note) VALUES ('x')");
    const inside = await tx.all('SELECT * FROM tx_probe');
    return inside.length;
  });
  assert.equal(await fn(), 1);
});
