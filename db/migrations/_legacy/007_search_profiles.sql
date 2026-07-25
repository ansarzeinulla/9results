-- 007_search_profiles.sql
-- * rounds becomes optional: the schedule grows as pairings are generated,
--   so the strict "must be declared upfront" CHECK goes away.
-- * a 'None' rating type so tournaments can be searched as non-rated.
-- Note: the "System" (Swiss / Round-robin / …) is the existing
-- tournament_types lookup — no new column is needed.

ALTER TABLE tournaments DROP CONSTRAINT IF EXISTS chk_tourn_rounds;
ALTER TABLE tournaments
    ADD CONSTRAINT chk_tourn_rounds
    CHECK (rounds IS NULL OR (rounds > 0 AND rounds <= 50));

-- Faster search on the new tournament filters.
CREATE INDEX IF NOT EXISTS idx_tournaments_type ON tournaments (tournament_type_id);
CREATE INDEX IF NOT EXISTS idx_tournaments_participant_type ON tournaments (participant_type_id);
CREATE INDEX IF NOT EXISTS idx_tournaments_organizer ON tournaments (organizer_id);
CREATE INDEX IF NOT EXISTS idx_tournaments_arbiter ON tournaments (arbiter_id);
