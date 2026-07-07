// Drops all tables so the rebuilt schema in db.js can be recreated fresh.
// Usage: node reset.js   (then run: npm run seed)
import db from './src/db.js';

await db.query(`
  DROP TABLE IF EXISTS matches CASCADE;
  DROP TABLE IF EXISTS tournament_players CASCADE;
  DROP TABLE IF EXISTS tournaments CASCADE;
  DROP TABLE IF EXISTS players CASCADE;
  DROP TABLE IF EXISTS users CASCADE;
`);

console.log('✓ All tables dropped. Run `npm run seed` to recreate and populate.');
process.exit(0);
