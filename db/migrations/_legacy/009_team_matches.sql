-- 009_team_matches.sql
-- Team-vs-team tournaments: fixed board lineups and the team-level schedule.
--
-- 008_teams.sql gave us `teams` and `tournament_participants.team_id`. What was
-- missing is the two things a team event actually runs on: a stable board order
-- within each team, and a record of which team met which in a given round.

-- A player's seat in the team lineup. Fixed for the whole tournament: a player
-- may not drift between boards from round to round.
ALTER TABLE tournament_participants
ADD COLUMN IF NOT EXISTS board_order INT;

ALTER TABLE tournament_participants
DROP CONSTRAINT IF EXISTS chk_board_order;

ALTER TABLE tournament_participants
ADD CONSTRAINT chk_board_order CHECK (board_order IS NULL OR board_order > 0);

-- Two players cannot share a seat. Partial, so the unlimited NULLs of an
-- ordinary individual tournament stay legal.
CREATE UNIQUE INDEX IF NOT EXISTS uq_tp_team_board
    ON tournament_participants (tournament_id, team_id, board_order)
    WHERE team_id IS NOT NULL AND board_order IS NOT NULL;

-- One team-vs-team matchup inside a round. team2_id NULL means team1 drew the
-- bye: it has no pairings at all, which is exactly why the matchup cannot be
-- inferred from the pairings themselves and needs its own row.
CREATE TABLE IF NOT EXISTS team_matches (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    round_id INT REFERENCES rounds(id) ON DELETE CASCADE,
    match_number INT NOT NULL,
    team1_id INT REFERENCES teams(id) ON DELETE CASCADE,
    team2_id INT REFERENCES teams(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_team_matches_round ON team_matches (round_id);

-- Nullable, so individual tournaments carry on untouched.
ALTER TABLE pairings
ADD COLUMN IF NOT EXISTS team_match_id INT REFERENCES team_matches(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_pairings_team_match ON pairings (team_match_id);

-- 008 created `teams` without touching RLS, so anon could not read it and team
-- names were invisible on the public tournament pages. Both new tables follow
-- the rule 003 set: anon reads, only the owner writes.
GRANT SELECT ON teams, team_matches TO anon;

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS anon_read_teams ON teams;
CREATE POLICY anon_read_teams ON teams FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS anon_read_team_matches ON team_matches;
CREATE POLICY anon_read_team_matches ON team_matches FOR SELECT TO anon USING (true);
