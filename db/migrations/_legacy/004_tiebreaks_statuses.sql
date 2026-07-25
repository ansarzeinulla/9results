-- 004_tiebreaks_statuses.sql
-- Adds the reference tables the extended seeds depend on:
--   * tie_breaks / tie_break_translations  (ranking criteria, per info.md)
--   * tournament_tie_breaks                (ordered criteria per tournament)
--   * tournament_statuses                  (lifecycle of a tournament)
--   * time_controls                        (standard WTF time controls)
-- and migrates tournaments.status from a CHECK constraint to a real FK.

-- ==========================================
-- 1. TIE-BREAKS
-- ==========================================
CREATE TABLE IF NOT EXISTS tie_breaks (
    id VARCHAR(30) PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS tie_break_translations (
    tie_break_id VARCHAR(30) REFERENCES tie_breaks(id) ON DELETE CASCADE,
    lang_code VARCHAR(3) REFERENCES languages(id),
    name VARCHAR(100) NOT NULL,
    PRIMARY KEY (tie_break_id, lang_code)
);

-- Ordered ranking criteria for a tournament (position 1 = applied first).
CREATE TABLE IF NOT EXISTS tournament_tie_breaks (
    tournament_id INT REFERENCES tournaments(id) ON DELETE CASCADE,
    tie_break_id VARCHAR(30) REFERENCES tie_breaks(id),
    position INT NOT NULL,
    PRIMARY KEY (tournament_id, position),
    CONSTRAINT chk_tie_break_position CHECK (position > 0 AND position <= 10)
);

-- ==========================================
-- 2. TIME CONTROLS
-- ==========================================
CREATE TABLE IF NOT EXISTS time_controls (
    id VARCHAR(30) PRIMARY KEY,
    description VARCHAR(100) NOT NULL
);

-- ==========================================
-- 3. TOURNAMENT STATUSES
-- ==========================================
CREATE TABLE IF NOT EXISTS tournament_statuses (
    id VARCHAR(20) PRIMARY KEY
);

-- Seeded here (not in seeds/) because the FK below depends on these rows.
INSERT INTO tournament_statuses (id) VALUES
    ('DRAFT'),         -- organizer is still setting it up
    ('REGISTRATION'),  -- taking player entries
    ('ONGOING'),       -- actively being played
    ('COMPLETED'),     -- finished and rated
    ('CANCELLED')
ON CONFLICT (id) DO NOTHING;

-- Map the old values, then swap the CHECK constraint for a foreign key.
ALTER TABLE tournaments DROP CONSTRAINT IF EXISTS chk_tourn_status;
ALTER TABLE tournaments ALTER COLUMN status DROP DEFAULT;

UPDATE tournaments SET status = 'ONGOING' WHERE status = 'ACTIVE';
UPDATE tournaments SET status = 'COMPLETED' WHERE status = 'FINISHED';
UPDATE tournaments SET status = 'REGISTRATION' WHERE status IS NULL;

ALTER TABLE tournaments ALTER COLUMN status SET DEFAULT 'REGISTRATION';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_tournament_status'
    ) THEN
        ALTER TABLE tournaments
            ADD CONSTRAINT fk_tournament_status
            FOREIGN KEY (status) REFERENCES tournament_statuses(id);
    END IF;
END
$$;
