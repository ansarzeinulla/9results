-- build/05_indexes.sql
-- All secondary indexes, in one place. pg_trgm powers the fuzzy name search
-- (gin_trgm_ops indexes here, word_similarity in build/06).
--
-- Consolidated from legacy migrations 001, 006, 007, 008, 009.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---- players ----
CREATE INDEX idx_players_last_name_trgm  ON players USING gin (last_name gin_trgm_ops);
CREATE INDEX idx_players_first_name_trgm ON players USING gin (first_name gin_trgm_ops);
CREATE INDEX idx_players_search_trgm     ON players USING gin (search_text gin_trgm_ops);

-- ---- tournaments ----
CREATE INDEX idx_tournaments_start_date       ON tournaments (start_date DESC);
CREATE INDEX idx_tournaments_federation       ON tournaments (federation_id);
CREATE INDEX idx_tournaments_type             ON tournaments (tournament_type_id);
CREATE INDEX idx_tournaments_participant_type ON tournaments (participant_type_id);
CREATE INDEX idx_tournaments_organizer        ON tournaments (organizer_id);
CREATE INDEX idx_tournaments_arbiter          ON tournaments (arbiter_id);

-- ---- schedule / entries / games ----
CREATE INDEX idx_rounds_tournament   ON rounds (tournament_id);
CREATE INDEX idx_pairings_round      ON pairings (round_id);
CREATE INDEX idx_pairings_team_match ON pairings (team_match_id);
CREATE INDEX idx_tp_tournament       ON tournament_participants (tournament_id);
CREATE INDEX idx_tp_team             ON tournament_participants (team_id);
CREATE INDEX idx_team_matches_round  ON team_matches (round_id);
CREATE INDEX idx_rating_history_player ON rating_history (player_id);

-- A player occupies at most one seat per team. Partial, so the unlimited NULLs
-- of an individual tournament stay legal.
CREATE UNIQUE INDEX uq_tp_team_board
    ON tournament_participants (tournament_id, team_id, board_order)
    WHERE team_id IS NOT NULL AND board_order IS NOT NULL;
