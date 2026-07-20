-- 006_aliases_search.sql
-- Multi-alphabet player search: aliases, transliteration, trigram fuzzy
-- matching, and the omni-search that answers "where is X playing right now".

-- ==========================================
-- 1. ALIASES + SEARCH TEXT
-- ==========================================
ALTER TABLE players ADD COLUMN IF NOT EXISTS aliases JSONB NOT NULL DEFAULT '[]';
ALTER TABLE players ADD COLUMN IF NOT EXISTS search_text TEXT NOT NULL DEFAULT '';

-- Cyrillic (Russian + Kazakh) -> Latin. Twin of backend-py/app/translit.py:
-- keep the mappings identical, both sides index and query the same spelling.
CREATE OR REPLACE FUNCTION translit_latin(t TEXT) RETURNS TEXT
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
    SELECT translate(
        replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(
            lower(t),
        'щ', 'shch'), 'ш', 'sh'), 'ч', 'ch'), 'ж', 'zh'), 'ю', 'yu'),
        'я', 'ya'), 'ё', 'yo'), 'х', 'kh'), 'ц', 'ts'), 'э', 'e'),
        'абвгдезийклмнопрстуфыәғқңөұүһіъь',
        'abvgdeziiklmnoprstufyagknouuhi'  -- 2 shorter: ъ and ь are dropped
    );
$$;

-- Everything a player can be found by, in both alphabets, in one column.
CREATE OR REPLACE FUNCTION players_build_search_text(
    p_first TEXT, p_last TEXT, p_middle TEXT, p_aliases JSONB
) RETURNS TEXT
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
    SELECT lower(concat_ws(' ',
        p_last, p_first, p_middle,
        translit_latin(concat_ws(' ', p_last, p_first, p_middle)),
        (SELECT string_agg(a || ' ' || translit_latin(a), ' ')
         FROM jsonb_array_elements_text(coalesce(p_aliases, '[]'::jsonb)) AS a)
    ));
$$;

CREATE OR REPLACE FUNCTION players_search_text_trigger() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    NEW.search_text := players_build_search_text(
        NEW.first_name, NEW.last_name, NEW.middle_name, NEW.aliases);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_players_search_text ON players;
CREATE TRIGGER trg_players_search_text
BEFORE INSERT OR UPDATE OF first_name, last_name, middle_name, aliases ON players
FOR EACH ROW EXECUTE FUNCTION players_search_text_trigger();

-- Backfill existing rows.
UPDATE players SET search_text = players_build_search_text(
    first_name, last_name, middle_name, aliases);

CREATE INDEX IF NOT EXISTS idx_players_search_trgm
    ON players USING gin (search_text gin_trgm_ops);

-- ==========================================
-- 2. FUZZY SEARCH (replaces search_players)
-- ==========================================
-- Word similarity tolerates typos and matches a short query against the best
-- word inside the long search_text; the query is also transliterated so a
-- Cyrillic query finds a Latin-registered player and vice versa.
CREATE OR REPLACE FUNCTION search_players_fuzzy(
    p_q TEXT,
    p_limit INT DEFAULT 20
)
RETURNS TABLE (
    id VARCHAR, first_name VARCHAR, last_name VARCHAR, middle_name VARCHAR,
    title_id VARCHAR, club VARCHAR, federation_id VARCHAR,
    rating_classic INT, rating_rapid INT, rating_blitz INT,
    rank REAL
) LANGUAGE plpgsql STABLE
SECURITY DEFINER SET search_path = public AS $$
DECLARE
    ql TEXT := lower(trim(p_q));
    qt TEXT := translit_latin(lower(trim(p_q)));
BEGIN
    RETURN QUERY
    SELECT p.id, p.first_name, p.last_name, p.middle_name,
           p.title_id, p.club, p.federation_id,
           p.rating_classic, p.rating_rapid, p.rating_blitz,
           greatest(word_similarity(ql, p.search_text),
                    word_similarity(qt, p.search_text)) AS rank
    FROM players p
    WHERE p.search_text ILIKE '%' || ql || '%'
       OR p.search_text ILIKE '%' || qt || '%'
       OR ql <% p.search_text
       OR qt <% p.search_text
       OR p.id ILIKE '%' || ql || '%'
    ORDER BY rank DESC, p.rating_classic DESC
    LIMIT p_limit;
END;
$$;

-- ==========================================
-- 3. OMNI-SEARCH: player + their active game
-- ==========================================
-- "Where is X playing right now": for each matched player, the pairing in the
-- latest open (not closed) round of a live tournament, if any.
CREATE OR REPLACE FUNCTION omni_search(
    p_q TEXT,
    p_limit INT DEFAULT 8
)
RETURNS TABLE (
    id VARCHAR, first_name VARCHAR, last_name VARCHAR, title_id VARCHAR,
    rating_classic INT,
    tournament_id INT, tournament_name VARCHAR, tournament_slug VARCHAR,
    round_number INT, board_number INT, side INT,
    opponent_first VARCHAR, opponent_last VARCHAR, result_id VARCHAR
) LANGUAGE sql STABLE
SECURITY DEFINER SET search_path = public AS $$
    SELECT
        s.id, s.first_name, s.last_name, s.title_id, s.rating_classic,
        m.tournament_id, m.tournament_name, m.tournament_slug,
        m.round_number, m.board_number, m.side,
        m.opponent_first, m.opponent_last, m.result_id
    FROM search_players_fuzzy(p_q, p_limit) s
    LEFT JOIN LATERAL (
        SELECT t.id AS tournament_id, t.name AS tournament_name,
               t.slug AS tournament_slug, r.round_number,
               pr.board_number,
               CASE WHEN pr.white_player_id = s.id THEN 1 ELSE 2 END AS side,
               op.first_name AS opponent_first, op.last_name AS opponent_last,
               pr.result_id
        FROM pairings pr
        JOIN rounds r ON r.id = pr.round_id AND r.is_closed = FALSE
        JOIN tournaments t ON t.id = r.tournament_id
                          AND t.status IN ('ONGOING', 'REGISTRATION')
        LEFT JOIN players op
               ON op.id = CASE WHEN pr.white_player_id = s.id
                               THEN pr.black_player_id
                               ELSE pr.white_player_id END
        WHERE pr.white_player_id = s.id OR pr.black_player_id = s.id
        ORDER BY r.round_number DESC
        LIMIT 1
    ) m ON TRUE;
$$;

-- ==========================================
-- 4. FULL-PROFILE UPSERT WITH ALIASES
-- (overrides the 002 version; NULL aliases = keep the existing value)
-- ==========================================
-- Drop the 002 signature first: otherwise the 12- and 13-argument versions
-- coexist and short calls become ambiguous.
DROP PROCEDURE IF EXISTS admin_upsert_player(
    VARCHAR, VARCHAR, VARCHAR, VARCHAR, INT, VARCHAR, VARCHAR, INT,
    VARCHAR, VARCHAR, INT, INT);

CREATE OR REPLACE PROCEDURE admin_upsert_player(
    p_id VARCHAR(50), p_first VARCHAR(50), p_last VARCHAR(50),
    p_fed VARCHAR(4), p_rating INT,
    p_middle VARCHAR(50) DEFAULT NULL,
    p_gender VARCHAR(1) DEFAULT NULL,
    p_year INT DEFAULT NULL,
    p_title VARCHAR(10) DEFAULT NULL,
    p_club VARCHAR(100) DEFAULT NULL,
    p_rating_rapid INT DEFAULT 0,
    p_rating_blitz INT DEFAULT 0,
    p_aliases JSONB DEFAULT NULL
)
LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO players (id, first_name, last_name, middle_name, federation_id,
                         gender_id, year_of_birth, title_id, club,
                         rating_classic, rating_rapid, rating_blitz, aliases)
    VALUES (p_id, p_first, p_last, p_middle, p_fed,
            p_gender, p_year, p_title, p_club,
            p_rating, p_rating_rapid, p_rating_blitz,
            coalesce(p_aliases, '[]'::jsonb))
    ON CONFLICT (id) DO UPDATE
    SET first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        middle_name = EXCLUDED.middle_name,
        federation_id = EXCLUDED.federation_id,
        gender_id = EXCLUDED.gender_id,
        year_of_birth = EXCLUDED.year_of_birth,
        title_id = EXCLUDED.title_id,
        club = EXCLUDED.club,
        rating_classic = EXCLUDED.rating_classic,
        rating_rapid = EXCLUDED.rating_rapid,
        rating_blitz = EXCLUDED.rating_blitz,
        aliases = coalesce(p_aliases, players.aliases);
END;
$$;

-- ==========================================
-- 5. GRANTS (public read-only search via Supabase RPC)
-- ==========================================
GRANT EXECUTE ON FUNCTION translit_latin TO anon;
GRANT EXECUTE ON FUNCTION search_players_fuzzy TO anon;
GRANT EXECUTE ON FUNCTION omni_search TO anon;
