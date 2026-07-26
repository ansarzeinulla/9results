-- build/04_tournament_data.sql
-- The per-tournament running data: the schedule (rounds, team_matches),
-- entries (tournament_participants), games (pairings), and the historical
-- record (standings_history, rating_history). Plus each tournament's chosen
-- ranking criteria (tournament_tie_breaks).
--
-- Team columns (team_id, board_order) and pairings.team_match_id are shown in
-- final form rather than as later ALTERs.
--
-- Consolidated from legacy migrations 001, 004, 008, 009.

-- ==========================================
-- SCHEDULE
-- ==========================================
CREATE TABLE rounds (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tournament_id INT REFERENCES tournaments(id) ON DELETE CASCADE,
    round_number INT NOT NULL,
    is_closed BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE (tournament_id, round_number)
);

-- One team-vs-team matchup inside a round. team2_id NULL means team1 drew the
-- bye: it has no pairings at all, which is why the matchup cannot be inferred
-- from the pairings and needs its own row.
CREATE TABLE team_matches (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    round_id INT REFERENCES rounds(id) ON DELETE CASCADE,
    match_number INT NOT NULL,
    team1_id INT REFERENCES teams(id) ON DELETE CASCADE,
    team2_id INT REFERENCES teams(id) ON DELETE CASCADE
);

-- ==========================================
-- ENTRIES
-- ==========================================
--   team_id      set for team events (NULL otherwise).
--   board_order  the player's fixed seat in the team lineup; may not change
--                round to round. NULL for individual tournaments.
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
    tie_break_4 DECIMAL(6,2) DEFAULT 0.0,
    final_rank INT,

    rating_change DECIMAL(5,1),
    status VARCHAR(20) REFERENCES statuses(id) DEFAULT 'ACTIVE',

    team_id INT REFERENCES teams(id) ON DELETE SET NULL,
    board_order INT,

    PRIMARY KEY (tournament_id, player_id),
    CONSTRAINT chk_board_order CHECK (board_order IS NULL OR board_order > 0)
);

-- ==========================================
-- GAMES
-- ==========================================
--   team_match_id  links the board to its team matchup (NULL for individual
--                  tournaments).
CREATE TABLE pairings (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    round_id INT REFERENCES rounds(id) ON DELETE CASCADE,
    board_number INT NOT NULL,
    white_player_id VARCHAR(50) REFERENCES players(id),
    black_player_id VARCHAR(50) REFERENCES players(id), -- NULL = bye
    result_id VARCHAR(10) REFERENCES match_results(id),
    team_match_id INT REFERENCES team_matches(id) ON DELETE CASCADE,

    CONSTRAINT chk_board CHECK (board_number > 0 AND board_number < 1000)
);

-- ==========================================
-- HISTORY
-- ==========================================
-- Standings snapshot taken when a round is closed.
CREATE TABLE standings_history (
    tournament_id INT REFERENCES tournaments(id) ON DELETE CASCADE,
    round_id INT REFERENCES rounds(id) ON DELETE CASCADE,
    player_id VARCHAR(50) REFERENCES players(id) ON DELETE CASCADE,

    points DECIMAL(4,1),
    tie_break_1 DECIMAL(6,2),
    tie_break_2 DECIMAL(6,2),
    tie_break_3 DECIMAL(6,2),
    tie_break_4 DECIMAL(6,2),
    rank_after_round INT,

    PRIMARY KEY (round_id, player_id)
);

-- Rating change ledger, one row per player per rated tournament.
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
-- RANKING CRITERIA
-- ==========================================
-- Ordered tie-break criteria for a tournament (position 1 = applied first).
CREATE TABLE tournament_tie_breaks (
    tournament_id INT REFERENCES tournaments(id) ON DELETE CASCADE,
    tie_break_id VARCHAR(30) REFERENCES tie_breaks(id),
    position INT NOT NULL,
    PRIMARY KEY (tournament_id, position),
    CONSTRAINT chk_tie_break_position CHECK (position > 0 AND position <= 10)
);
