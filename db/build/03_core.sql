-- build/03_core.sql
-- The heart of the domain: players, tournaments, and teams.
--
-- Columns are shown in their FINAL form — the multi-alphabet search columns
-- that legacy migration 006 bolted onto players, and the status-as-FK /
-- optional-rounds shape that migrations 004 and 007 gave tournaments, are
-- folded in here rather than left as later ALTERs.
--
-- Consolidated from legacy migrations 001, 004, 006, 007, 008.

-- ==========================================
-- PLAYERS
-- ==========================================
-- id is supplied by the admin, never generated. Players are permanent records
-- (there is no delete procedure; see player_has_history in build/06).
--   aliases      alternate spellings, JSON array of strings.
--   search_text  denormalized, both-alphabet search blob, maintained by the
--                trg_players_search_text trigger (build/06).
CREATE TABLE players (
    id VARCHAR(50) PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    middle_name VARCHAR(50),
    federation_id VARCHAR(4) REFERENCES federations(id),
    gender_id VARCHAR(1) REFERENCES genders(id),
    year_of_birth INT,
    title_id VARCHAR(10) REFERENCES titles(id),
    club VARCHAR(100),
    rating_classic INT DEFAULT 0,
    rating_rapid INT DEFAULT 0,
    rating_blitz INT DEFAULT 0,
    aliases JSONB NOT NULL DEFAULT '[]',
    search_text TEXT NOT NULL DEFAULT '',
    CONSTRAINT chk_player_year CHECK (year_of_birth > 1900 AND year_of_birth < 2200)
);

-- ==========================================
-- TOURNAMENTS
-- ==========================================
--   status  FK to tournament_statuses, default REGISTRATION.
--   rounds  optional: the schedule can grow as pairings are generated, so it
--           may be NULL until fixed.
CREATE TABLE tournaments (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE,
    federation_id VARCHAR(4) REFERENCES federations(id),

    organizer_id INT REFERENCES organizations(id),
    director_id INT REFERENCES officials(id),
    arbiter_id INT REFERENCES officials(id),
    owner_user_id INT REFERENCES users(id),

    location_id VARCHAR(50) REFERENCES locations(id),
    start_date DATE,
    end_date DATE,
    level_id VARCHAR(50) REFERENCES tournament_levels(id),
    rating_type_id VARCHAR(50) REFERENCES rating_types(id),
    tournament_type_id VARCHAR(50) REFERENCES tournament_types(id),
    participant_type_id VARCHAR(10) REFERENCES participant_types(id),

    time_control VARCHAR(100),
    rounds INT,
    status VARCHAR(20) REFERENCES tournament_statuses(id) DEFAULT 'REGISTRATION',
    games_available BOOLEAN DEFAULT FALSE,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_tourn_rounds CHECK (rounds IS NULL OR (rounds > 0 AND rounds <= 50)),
    CONSTRAINT chk_tourn_dates CHECK (end_date >= start_date)
);

-- ==========================================
-- TEAMS
-- ==========================================
-- A team belongs to a single tournament (team events only).
CREATE TABLE teams (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tournament_id INT REFERENCES tournaments(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL
);

-- ==========================================
-- TOURNAMENT ARBITERS
-- ==========================================
-- A tournament may be assigned several arbiters (officials). Replaces the
-- single tournaments.arbiter_id for assignment purposes; that column is kept
-- for the legacy "chief arbiter" display but new arbiters live here.
CREATE TABLE tournament_arbiters (
    tournament_id INT REFERENCES tournaments(id) ON DELETE CASCADE,
    official_id INT REFERENCES officials(id),
    PRIMARY KEY (tournament_id, official_id)
);
