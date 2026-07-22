-- 008_teams.sql
-- Add support for teams in tournaments.

CREATE TABLE IF NOT EXISTS teams (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tournament_id INT REFERENCES tournaments(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL
);

ALTER TABLE tournament_participants 
ADD COLUMN IF NOT EXISTS team_id INT REFERENCES teams(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tp_team ON tournament_participants (team_id);
