import bcrypt from 'bcryptjs';
import db from './src/db.js';

const organizer = db.prepare('SELECT id FROM users WHERE username = ?').get('organizer');
if (!organizer) {
  db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)')
    .run('organizer', bcrypt.hashSync('password123', 10));
  console.log('Seeded organizer (username: organizer, password: password123)');
} else {
  console.log('Organizer already exists, skipping');
}

const players = [
  ['Aslan Bekov', 2180],
  ['Dana Serikova', 2065],
  ['Yerlan Nurpeisov', 1990],
  ['Aigerim Tulegenova', 1920],
  ['Marat Zhaksybek', 1855],
  ['Saule Amanzholova', 1790],
  ['Nurlan Kairatuly', 1705],
  ['Zhanel Ospanova', 1640],
  ['Timur Abenov', 1530],
  ['Madina Yesimova', 1445],
];

const count = db.prepare('SELECT COUNT(*) AS n FROM players').get().n;
if (count === 0) {
  const insert = db.prepare('INSERT INTO players (full_name, current_rating) VALUES (?, ?)');
  const insertAll = db.transaction((rows) => rows.forEach((r) => insert.run(...r)));
  insertAll(players);
  console.log(`Seeded ${players.length} players`);
} else {
  console.log(`Players table already has ${count} rows, skipping`);
}
