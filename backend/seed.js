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

const tCount = db.prepare('SELECT COUNT(*) AS n FROM tournaments').get().n;
if (tCount === 0) {
  const orgId = db.prepare('SELECT id FROM users WHERE username = ?').get('organizer').id;
  const insertT = db.prepare(
    'INSERT INTO tournaments (name, location, status, system_type, organizer_id) VALUES (?, ?, ?, ?, ?)'
  );
  const almaty = insertT.run('Almaty Open 2026', 'Almaty', 'ongoing', 'swiss', orgId).lastInsertRowid;
  const astana = insertT.run('Astana Championship 2026', 'Astana', 'finished', 'round_robin', orgId).lastInsertRowid;
  insertT.run('Shymkent Cup 2026', 'Shymkent', 'setup', 'swiss', orgId);

  const allPlayers = db.prepare('SELECT id FROM players ORDER BY id').all().map((p) => p.id);
  const insertTP = db.prepare(
    'INSERT INTO tournament_players (tournament_id, player_id, current_points, tiebreak_score) VALUES (?, ?, ?, ?)'
  );
  const insertM = db.prepare(
    'INSERT INTO matches (tournament_id, round_number, player1_id, player2_id, result) VALUES (?, ?, ?, ?, ?)'
  );

  const seedDemo = db.transaction(() => {
    // Almaty Open (live): 8 players, 2 rounds played
    const live = allPlayers.slice(0, 8);
    const livePoints = [2, 2, 1.5, 1, 1, 0.5, 0, 0];
    live.forEach((pid, i) => insertTP.run(almaty, pid, livePoints[i], livePoints[i] / 2));
    insertM.run(almaty, 1, live[0], live[7], '1-0');
    insertM.run(almaty, 1, live[1], live[6], '1-0');
    insertM.run(almaty, 1, live[2], live[5], '0.5-0.5');
    insertM.run(almaty, 1, live[3], live[4], '0.5-0.5');
    insertM.run(almaty, 2, live[0], live[3], '1-0');
    insertM.run(almaty, 2, live[1], live[2], '1-0');
    insertM.run(almaty, 2, live[4], live[6], '+--');
    insertM.run(almaty, 2, live[5], live[7], null);

    // Astana Championship (finished): 6 players
    const done = allPlayers.slice(4, 10);
    const donePoints = [4, 3.5, 3, 2, 1.5, 1];
    done.forEach((pid, i) => insertTP.run(astana, pid, donePoints[i], donePoints[i] / 2));
    insertM.run(astana, 1, done[0], done[5], '1-0');
    insertM.run(astana, 1, done[1], done[4], '1-0');
    insertM.run(astana, 1, done[2], done[3], '0.5-0.5');
  });
  seedDemo();
  console.log('Seeded 3 demo tournaments with standings and matches');
} else {
  console.log(`Tournaments table already has ${tCount} rows, skipping`);
}
