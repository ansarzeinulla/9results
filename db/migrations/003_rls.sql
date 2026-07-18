-- 003_rls.sql — lock the schema down: anon is read-only on public data,
-- has no access to users/user_roles, and cannot execute procedures.
-- The FastAPI backend connects as the table owner (postgres / service role),
-- which bypasses RLS.

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

-- Public read-only tables (everything except accounts).
GRANT SELECT ON
    languages, federations, official_titles, officials, organizations,
    locations, location_translations,
    tournament_levels, level_translations,
    rating_types, rating_translations,
    tournament_types, type_translations,
    participant_types, genders, titles, match_results, statuses,
    players, tournaments, tournament_participants,
    rounds, pairings, standings_history, rating_history
TO anon;

-- Read-only search helpers are fine for anon.
GRANT EXECUTE ON FUNCTION search_tournaments TO anon;
GRANT EXECUTE ON FUNCTION search_players TO anon;

-- Enable RLS everywhere with read policies for public tables. The owner
-- bypasses RLS; anon writes are impossible (no GRANT + no write policies).
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
        'rounds', 'pairings', 'standings_history', 'rating_history'
    ]
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format(
            'CREATE POLICY %I ON %I FOR SELECT TO anon USING (true)',
            'anon_read_' || t, t
        );
    END LOOP;
END
$$;

-- Account tables: RLS on, no grants, no policies — invisible to anon.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
