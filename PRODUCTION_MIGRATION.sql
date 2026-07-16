-- =====================================================================
-- Players-table migration for Supabase.
-- Run this ONCE in the Supabase SQL Editor (Dashboard → SQL Editor → New query).
-- Rebuilds the schema: login accounts (admin/organizer) in `users`,
-- player profiles in a dedicated `players` table, Swiss-only tournaments
-- with gender/age attributes, match board numbers.
-- WARNING: this deletes existing tournaments/players/matches (throwaway test data).
-- =====================================================================

DROP TABLE IF EXISTS rating_history CASCADE;
DROP TABLE IF EXISTS matches CASCADE;
DROP TABLE IF EXISTS tournament_players CASCADE;
DROP TABLE IF EXISTS tournaments CASCADE;
DROP TABLE IF EXISTS players CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  role TEXT NOT NULL DEFAULT 'organizer' CHECK (role IN ('admin','organizer')),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  federation TEXT NOT NULL DEFAULT 'KAZ'
);

CREATE TABLE players (
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

CREATE TABLE tournaments (
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

CREATE TABLE tournament_players (
  id SERIAL PRIMARY KEY,
  tournament_id INTEGER NOT NULL REFERENCES tournaments(id),
  player_id INTEGER NOT NULL REFERENCES players(id),
  current_points DECIMAL NOT NULL DEFAULT 0,
  start_rating INTEGER,
  UNIQUE (tournament_id, player_id)
);

CREATE TABLE rating_history (
  id SERIAL PRIMARY KEY,
  player_id INTEGER NOT NULL REFERENCES players(id),
  tournament_id INTEGER REFERENCES tournaments(id),
  rating_type TEXT NOT NULL CHECK (rating_type IN ('blitz','rapid','classic')),
  old_rating INTEGER NOT NULL,
  delta INTEGER NOT NULL,
  new_rating INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE matches (
  id SERIAL PRIMARY KEY,
  tournament_id INTEGER NOT NULL REFERENCES tournaments(id),
  round_number INTEGER NOT NULL,
  board_number INTEGER,
  player1_id INTEGER REFERENCES players(id),
  player2_id INTEGER REFERENCES players(id),
  result TEXT CHECK (result IS NULL OR result IN ('1-0','0-1','0.5-0.5','+--','--+','=-=','---'))
);

-- Logins (password for both: password123)
INSERT INTO users (role, username, password_hash, first_name, last_name, federation) VALUES
  ('admin',     'admin',     '$2b$10$4.Tw6opY6JyfpprLZDSSVu.I4mGySY0Pb8fBtKybXkdne3UhFuDNm', 'Site',  'Admin',     'KAZ'),
  ('organizer', 'organizer', '$2b$10$4.Tw6opY6JyfpprLZDSSVu.I4mGySY0Pb8fBtKybXkdne3UhFuDNm', 'Askar', 'Organizer', 'KAZ');

-- Players
INSERT INTO players (first_name, last_name, birth_year, federation, club, title, rating_blitz, rating_rapid, rating_classic) VALUES
  ('Aslan',   'Bekov',       1990, 'KAZ', 'Almaty TK',    'GM',  2180, 2150, 2200),
  ('Dana',    'Serikova',    1995, 'KAZ', 'Astana TK',    'WGM', 2065, 2040, 2080),
  ('Yerlan',  'Nurpeisov',   1988, 'KAZ', 'Shymkent TK',  'IM',  1990, 1975, 2010),
  ('Aigerim', 'Tulegenova',  2000, 'KAZ', 'Karaganda TK', 'WIM', 1920, 1900, 1940),
  ('Marat',   'Zhaksybek',   1992, 'KAZ', 'Taraz TK',     'FM',  1855, 1840, 1870),
  ('Saule',   'Amanzholova', 1998, 'KAZ', 'Pavlodar TK',  NULL,  1790, 1780, 1800),
  ('Nurlan',  'Kairatuly',   2003, 'KAZ', 'Oskemen TK',   NULL,  1705, 1690, 1720),
  ('Zhanel',  'Ospanova',    2005, 'KAZ', 'Semey TK',     NULL,  1640, 1620, 1660),
  ('Timur',   'Abenov',      1985, 'WDF', 'Bishkek DC',   'CM',  1530, 1520, 1550),
  ('Madina',  'Yesimova',    2001, 'WDF', 'Tashkent DC',  NULL,  1445, 1430, 1460);

-- Demo tournaments (organizer id = 2)
INSERT INTO tournaments (name, federation, city, level, rating_type, status, gender, age_category, organizer_id) VALUES
  ('Almaty Open 2026',            'KAZ', 'Almaty',   'National', 'classic',   'ongoing',  'all', 'all', 2),
  ('Astana Blitz Cup 2026',       'KAZ', 'Astana',   'Regional', 'blitz',     'finished', 'all', 'all', 2),
  ('Shymkent School Championship','KAZ', 'Shymkent', 'School',   'non_rated', 'setup',    'all', 'U12', 2);
