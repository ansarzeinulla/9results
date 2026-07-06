import bcrypt from 'bcryptjs';
import db from './src/db.js';

const organizer = await db.get('SELECT id FROM users WHERE username = $1', ['organizer']);
if (!organizer) {
  await db.run('INSERT INTO users (username, password_hash) VALUES ($1, $2)', [
    'organizer',
    bcrypt.hashSync('password123', 10),
  ]);
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

const count = await db.get('SELECT COUNT(*) AS n FROM players');
if (count.n === 0) {
  for (const [name, rating] of players) {
    await db.run('INSERT INTO players (full_name, current_rating) VALUES ($1, $2)', [name, rating]);
  }
  console.log(`Seeded ${players.length} players`);
} else {
  console.log(`Players table already has ${count.n} rows, skipping`);
}

const tCount = await db.get('SELECT COUNT(*) AS n FROM tournaments');
if (tCount.n === 0) {
  const org = await db.get('SELECT id FROM users WHERE username = $1', ['organizer']);
  const almaty = await db.run(
    'INSERT INTO tournaments (name, location, status, system_type, organizer_id) VALUES ($1, $2, $3, $4, $5) RETURNING id',
    ['Almaty Open 2026', 'Almaty', 'ongoing', 'swiss', org.id]
  );
  const almaty_id = almaty.rows[0].id;

  const astana = await db.run(
    'INSERT INTO tournaments (name, location, status, system_type, organizer_id) VALUES ($1, $2, $3, $4, $5) RETURNING id',
    ['Astana Championship 2026', 'Astana', 'finished', 'round_robin', org.id]
  );
  const astana_id = astana.rows[0].id;

  await db.run(
    'INSERT INTO tournaments (name, location, status, system_type, organizer_id) VALUES ($1, $2, $3, $4, $5)',
    ['Shymkent Cup 2026', 'Shymkent', 'setup', 'swiss', org.id]
  );

  const allPlayers = await db.all('SELECT id FROM players ORDER BY id');
  const live = allPlayers.slice(0, 8).map((p) => p.id);
  const livePoints = [2, 2, 1.5, 1, 1, 0.5, 0, 0];
  for (let i = 0; i < live.length; i++) {
    await db.run('INSERT INTO tournament_players (tournament_id, player_id, current_points, tiebreak_score) VALUES ($1, $2, $3, $4)', [
      almaty_id,
      live[i],
      livePoints[i],
      livePoints[i] / 2,
    ]);
  }

  // Insert matches for Almaty
  const matches = [
    [almaty_id, 1, live[0], live[7], '1-0'],
    [almaty_id, 1, live[1], live[6], '1-0'],
    [almaty_id, 1, live[2], live[5], '0.5-0.5'],
    [almaty_id, 1, live[3], live[4], '0.5-0.5'],
    [almaty_id, 2, live[0], live[3], '1-0'],
    [almaty_id, 2, live[1], live[2], '1-0'],
    [almaty_id, 2, live[4], live[6], '+--'],
    [almaty_id, 2, live[5], live[7], null],
  ];
  for (const [tid, rnd, p1, p2, res] of matches) {
    await db.run('INSERT INTO matches (tournament_id, round_number, player1_id, player2_id, result) VALUES ($1, $2, $3, $4, $5)', [
      tid,
      rnd,
      p1,
      p2,
      res,
    ]);
  }

  // Astana finished tournament
  const done = allPlayers.slice(4, 10).map((p) => p.id);
  const donePoints = [4, 3.5, 3, 2, 1.5, 1];
  for (let i = 0; i < done.length; i++) {
    await db.run('INSERT INTO tournament_players (tournament_id, player_id, current_points, tiebreak_score) VALUES ($1, $2, $3, $4)', [
      astana_id,
      done[i],
      donePoints[i],
      donePoints[i] / 2,
    ]);
  }

  const astanaMatches = [
    [astana_id, 1, done[0], done[5], '1-0'],
    [astana_id, 1, done[1], done[4], '1-0'],
    [astana_id, 1, done[2], done[3], '0.5-0.5'],
  ];
  for (const [tid, rnd, p1, p2, res] of astanaMatches) {
    await db.run('INSERT INTO matches (tournament_id, round_number, player1_id, player2_id, result) VALUES ($1, $2, $3, $4, $5)', [
      tid,
      rnd,
      p1,
      p2,
      res,
    ]);
  }

  console.log('Seeded 3 demo tournaments with standings and matches');
} else {
  console.log(`Tournaments table already has ${tCount.n} rows, skipping`);
}

console.log('Seeding complete. Exiting...');
process.exit(0);
