import bcrypt from 'bcryptjs';
import db from './src/db.js';

// --- Organizers (fixed federation, have credentials) ---
const organizers = [
  { username: 'organizer', password: 'password123', first_name: 'Askar', last_name: 'Organizer', federation: 'KAZ' },
];

for (const o of organizers) {
  const existing = await db.get('SELECT id FROM users WHERE username = $1', [o.username]);
  if (existing) {
    console.log(`Organizer ${o.username} already exists, skipping`);
    continue;
  }
  await db.run(
    `INSERT INTO users (role, username, password_hash, first_name, last_name, federation)
     VALUES ('organizer', $1, $2, $3, $4, $5)`,
    [o.username, bcrypt.hashSync(o.password, 10), o.first_name, o.last_name, o.federation]
  );
  console.log(`Seeded organizer ${o.username} (federation ${o.federation}, password: ${o.password})`);
}

// --- Players (rich profiles, no credentials) ---
const players = [
  { first: 'Aslan', last: 'Bekov', birth: 1990, fed: 'KAZ', club: 'Almaty TK', title: 'GM', blitz: 2180, rapid: 2150, classic: 2200 },
  { first: 'Dana', last: 'Serikova', birth: 1995, fed: 'KAZ', club: 'Astana TK', title: 'WGM', blitz: 2065, rapid: 2040, classic: 2080 },
  { first: 'Yerlan', last: 'Nurpeisov', birth: 1988, fed: 'KAZ', club: 'Shymkent TK', title: 'IM', blitz: 1990, rapid: 1975, classic: 2010 },
  { first: 'Aigerim', last: 'Tulegenova', birth: 2000, fed: 'KAZ', club: 'Karaganda TK', title: 'WIM', blitz: 1920, rapid: 1900, classic: 1940 },
  { first: 'Marat', last: 'Zhaksybek', birth: 1992, fed: 'KAZ', club: 'Taraz TK', title: 'FM', blitz: 1855, rapid: 1840, classic: 1870 },
  { first: 'Saule', last: 'Amanzholova', birth: 1998, fed: 'KAZ', club: 'Pavlodar TK', title: null, blitz: 1790, rapid: 1780, classic: 1800 },
  { first: 'Nurlan', last: 'Kairatuly', birth: 2003, fed: 'KAZ', club: 'Oskemen TK', title: null, blitz: 1705, rapid: 1690, classic: 1720 },
  { first: 'Zhanel', last: 'Ospanova', birth: 2005, fed: 'KAZ', club: 'Semey TK', title: null, blitz: 1640, rapid: 1620, classic: 1660 },
  { first: 'Timur', last: 'Abenov', birth: 1985, fed: 'WDF', club: 'Bishkek DC', title: 'CM', blitz: 1530, rapid: 1520, classic: 1550 },
  { first: 'Madina', last: 'Yesimova', birth: 2001, fed: 'WDF', club: 'Tashkent DC', title: null, blitz: 1445, rapid: 1430, classic: 1460 },
];

const count = await db.get("SELECT COUNT(*) AS n FROM users WHERE role = 'player'");
if (Number(count.n) === 0) {
  for (const p of players) {
    await db.run(
      `INSERT INTO users (role, first_name, last_name, birth_year, federation, club, title, rating_blitz, rating_rapid, rating_classic)
       VALUES ('player', $1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [p.first, p.last, p.birth, p.fed, p.club, p.title, p.blitz, p.rapid, p.classic]
    );
  }
  console.log(`Seeded ${players.length} players`);
} else {
  console.log(`Players already exist (${count.n}), skipping`);
}

// --- Demo tournaments ---
const tCount = await db.get('SELECT COUNT(*) AS n FROM tournaments');
if (Number(tCount.n) === 0) {
  const org = await db.get("SELECT id FROM users WHERE role = 'organizer' ORDER BY id LIMIT 1");
  const demos = [
    ['Almaty Open 2026', 'KAZ', 'Almaty', 'National', 'classic', 'ongoing', 'swiss'],
    ['Astana Blitz Cup 2026', 'KAZ', 'Astana', 'Regional', 'blitz', 'finished', 'round_robin'],
    ['Shymkent School Championship', 'KAZ', 'Shymkent', 'School', 'non_rated', 'setup', 'swiss'],
  ];
  for (const [name, fed, city, level, ratingType, status, system] of demos) {
    await db.run(
      `INSERT INTO tournaments (name, federation, city, level, rating_type, status, system_type, organizer_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [name, fed, city, level, ratingType, status, system, org.id]
    );
  }
  console.log(`Seeded ${demos.length} demo tournaments`);
} else {
  console.log(`Tournaments already exist (${tCount.n}), skipping`);
}

console.log('Seeding complete.');
process.exit(0);
