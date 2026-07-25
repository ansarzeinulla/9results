-- build/07_security.sql
-- Lock the schema down: anon is read-only on public data, has no access to
-- account tables (users / user_roles), and cannot execute the admin/org
-- procedures. The FastAPI backend connects as the table owner (postgres /
-- service role), which bypasses RLS entirely.
--
-- Consolidated from legacy migrations 003, 006 (search grants), 009 (teams).
--
-- NOTE — carried forward from the legacy chain, flagged for review:
-- the reference tables added after the original 003 (tie_breaks,
-- tie_break_translations, time_controls, tournament_statuses,
-- tournament_tie_breaks) were never added to the anon read set, so anon
-- currently cannot SELECT them. This build reproduces that exact behavior.
-- If the public UI needs to display these, add them to the array below.

DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
        CREATE ROLE anon NOLOGIN;
    END IF;
END
$$;

-- Start from zero.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, PUBLIC;
REVOKE ALL ON ALL PROCEDURES IN SCHEMA public FROM anon, PUBLIC;
GRANT USAGE ON SCHEMA public TO anon;

-- ==========================================
-- 1. PUBLIC READ-ONLY TABLES
-- ==========================================
-- Everything except the account tables. Enable RLS and attach a permissive
-- SELECT policy for anon; the owner bypasses RLS, and anon writes are
-- impossible (no GRANT + no write policy).
DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'languages', 'federations', 'official_titles', 'officials',
        'organizations', 'locations', 'location_translations',
        'tournament_levels', 'level_translations', 'rating_types',
        'rating_translations', 'tournament_types', 'type_translations',
        'participant_types', 'genders', 'titles', 'match_results', 'statuses',
        'players', 'tournaments', 'tournament_participants',
        'rounds', 'pairings', 'standings_history', 'rating_history',
        'teams', 'team_matches', 'tournament_arbiters'
    ]
    LOOP
        EXECUTE format('GRANT SELECT ON %I TO anon', t);
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'anon_read_' || t, t);
        EXECUTE format(
            'CREATE POLICY %I ON %I FOR SELECT TO anon USING (true)',
            'anon_read_' || t, t
        );
    END LOOP;
END
$$;

-- ==========================================
-- 2. READ-ONLY SEARCH HELPERS (public RPC)
-- ==========================================
GRANT EXECUTE ON FUNCTION search_tournaments TO anon;
GRANT EXECUTE ON FUNCTION search_players TO anon;
GRANT EXECUTE ON FUNCTION translit_latin TO anon;
GRANT EXECUTE ON FUNCTION search_players_fuzzy TO anon;
GRANT EXECUTE ON FUNCTION omni_search TO anon;

-- ==========================================
-- 3. ACCOUNT TABLES: invisible to anon
-- ==========================================
-- RLS on, no grants, no policies.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
