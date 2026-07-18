-- 001_schema.sql — PLAN.md schema ported to PostgreSQL.
-- Lookup tables are extensible: integrity via FK + seeds, no CHECK IN lists.

-- ==========================================
-- 0. LOCALIZATION
-- ==========================================
CREATE TABLE languages (
    id VARCHAR(3) PRIMARY KEY
);

-- ==========================================
-- 1. PEOPLE AND ORGANIZATIONS
-- ==========================================
CREATE TABLE federations (
    id VARCHAR(4) PRIMARY KEY
);

CREATE TABLE user_roles (
    id VARCHAR(20) PRIMARY KEY
);

CREATE TABLE official_titles (
    id VARCHAR(10) PRIMARY KEY,
    description VARCHAR(50) NOT NULL
);

CREATE TABLE officials (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    middle_name VARCHAR(50),
    last_name VARCHAR(50) NOT NULL,
    title VARCHAR(10) REFERENCES official_titles(id)
);

CREATE TABLE users (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role_id VARCHAR(20) REFERENCES user_roles(id),
    official_id INT REFERENCES officials(id), -- NULL for the main admin
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE organizations (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    federation_id VARCHAR(4) REFERENCES federations(id)
);

-- ==========================================
-- 2. TRANSLATED REFERENCE TABLES
-- ==========================================
CREATE TABLE locations (
    id VARCHAR(50) PRIMARY KEY
);

CREATE TABLE location_translations (
    location_id VARCHAR(50) REFERENCES locations(id) ON DELETE CASCADE,
    lang_code VARCHAR(3) REFERENCES languages(id),
    name VARCHAR(100) NOT NULL,
    PRIMARY KEY (location_id, lang_code)
);

CREATE TABLE tournament_levels (
    id VARCHAR(50) PRIMARY KEY
);

CREATE TABLE level_translations (
    level_id VARCHAR(50) REFERENCES tournament_levels(id) ON DELETE CASCADE,
    lang_code VARCHAR(3) REFERENCES languages(id),
    name VARCHAR(100) NOT NULL,
    PRIMARY KEY (level_id, lang_code)
);

CREATE TABLE rating_types (
    id VARCHAR(50) PRIMARY KEY
);

CREATE TABLE rating_translations (
    rating_type_id VARCHAR(50) REFERENCES rating_types(id) ON DELETE CASCADE,
    lang_code VARCHAR(3) REFERENCES languages(id),
    name VARCHAR(50) NOT NULL,
    PRIMARY KEY (rating_type_id, lang_code)
);

CREATE TABLE tournament_types (
    id VARCHAR(50) PRIMARY KEY
);

CREATE TABLE type_translations (
    tournament_type_id VARCHAR(50) REFERENCES tournament_types(id) ON DELETE CASCADE,
    lang_code VARCHAR(3) REFERENCES languages(id),
    name VARCHAR(50) NOT NULL,
    PRIMARY KEY (tournament_type_id, lang_code)
);

-- ==========================================
-- 3. CHARACTERISTICS AND RESULTS
-- ==========================================
CREATE TABLE participant_types (
    id VARCHAR(10) PRIMARY KEY
);

CREATE TABLE genders (
    id VARCHAR(1) PRIMARY KEY
);

CREATE TABLE titles (
    id VARCHAR(10) PRIMARY KEY,
    description VARCHAR(100)
);

CREATE TABLE match_results (
    id VARCHAR(10) PRIMARY KEY
);

CREATE TABLE statuses (
    id VARCHAR(20) PRIMARY KEY
);

-- ==========================================
-- 4. CORE (Players and Tournaments)
-- ==========================================
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
    CONSTRAINT chk_player_year CHECK (year_of_birth > 1900 AND year_of_birth < 2200)
);

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
    status VARCHAR(20) DEFAULT 'ACTIVE',
    games_available BOOLEAN DEFAULT FALSE,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_tourn_rounds CHECK (rounds > 0 AND rounds <= 50),
    CONSTRAINT chk_tourn_dates CHECK (end_date >= start_date),
    CONSTRAINT chk_tourn_status CHECK (status IN ('DRAFT', 'ACTIVE', 'FINISHED'))
);

CREATE OR REPLACE FUNCTION touch_last_updated() RETURNS trigger AS $$
BEGIN
    NEW.last_updated = clock_timestamp();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tournaments_touch
BEFORE UPDATE ON tournaments
FOR EACH ROW EXECUTE FUNCTION touch_last_updated();

-- ==========================================
-- 5. TOURNAMENT DATA
-- ==========================================
CREATE TABLE tournament_participants (
    tournament_id INT REFERENCES tournaments(id) ON DELETE CASCADE,
    player_id VARCHAR(50) REFERENCES players(id) ON DELETE CASCADE,
    club VARCHAR(100),

    starting_rank INT,
    rating_at_tournament INT,

    points DECIMAL(4,1) DEFAULT 0.0,
    tie_break_1 DECIMAL(6,2) DEFAULT 0.0,
    tie_break_2 DECIMAL(6,2) DEFAULT 0.0,
    tie_break_3 DECIMAL(6,2) DEFAULT 0.0,
    final_rank INT,

    rating_change DECIMAL(5,1),
    status VARCHAR(20) REFERENCES statuses(id) DEFAULT 'ACTIVE',

    PRIMARY KEY (tournament_id, player_id)
);

CREATE TABLE rounds (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tournament_id INT REFERENCES tournaments(id) ON DELETE CASCADE,
    round_number INT NOT NULL,
    is_closed BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE (tournament_id, round_number)
);

CREATE TABLE pairings (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    round_id INT REFERENCES rounds(id) ON DELETE CASCADE,
    board_number INT NOT NULL,
    white_player_id VARCHAR(50) REFERENCES players(id),
    black_player_id VARCHAR(50) REFERENCES players(id), -- NULL = bye
    result_id VARCHAR(10) REFERENCES match_results(id),

    CONSTRAINT chk_board CHECK (board_number > 0 AND board_number < 1000)
);

CREATE TABLE standings_history (
    tournament_id INT REFERENCES tournaments(id) ON DELETE CASCADE,
    round_id INT REFERENCES rounds(id) ON DELETE CASCADE,
    player_id VARCHAR(50) REFERENCES players(id) ON DELETE CASCADE,

    points DECIMAL(4,1),
    tie_break_1 DECIMAL(6,2),
    tie_break_2 DECIMAL(6,2),
    tie_break_3 DECIMAL(6,2),
    rank_after_round INT,

    PRIMARY KEY (round_id, player_id)
);

CREATE TABLE rating_history (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    player_id VARCHAR(50) REFERENCES players(id) ON DELETE CASCADE,
    tournament_id INT REFERENCES tournaments(id) ON DELETE SET NULL,
    rating_type_id VARCHAR(50) REFERENCES rating_types(id),
    rating_before INT NOT NULL,
    rating_after INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 6. INDEXES
-- ==========================================
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_players_last_name_trgm ON players USING gin (last_name gin_trgm_ops);
CREATE INDEX idx_players_first_name_trgm ON players USING gin (first_name gin_trgm_ops);
CREATE INDEX idx_tournaments_start_date ON tournaments (start_date DESC);
CREATE INDEX idx_tournaments_federation ON tournaments (federation_id);
CREATE INDEX idx_rounds_tournament ON rounds (tournament_id);
CREATE INDEX idx_pairings_round ON pairings (round_id);
CREATE INDEX idx_tp_tournament ON tournament_participants (tournament_id);
CREATE INDEX idx_rating_history_player ON rating_history (player_id);
