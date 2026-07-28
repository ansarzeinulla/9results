-- build/06_functions.sql
-- Views, triggers, functions and stored procedures — the executable layer.
-- Each object appears once, in its FINAL form (e.g. the 13-argument
-- admin_upsert_player with aliases, not the earlier 12-argument version).
--
-- Consolidated from legacy migrations 001, 002, 005, 006.

-- ==========================================
-- 0. DROP SUPERSEDED OVERLOADS
-- ==========================================
-- CREATE OR REPLACE matches on the FULL argument signature, so when a
-- procedure gained an argument its earlier, shorter form is left behind as a
-- second overload rather than being replaced. Because the added arguments have
-- DEFAULTs, a call using the old arity then matches BOTH overloads and Postgres
-- raises "procedure ... is not unique" (42725). Running this script over a
-- database that previously had the legacy signatures would reintroduce exactly
-- that collision, so drop the stale forms first. Signatures are matched by
-- input argument types only (lengths and DEFAULTs are ignored).
DROP PROCEDURE IF EXISTS admin_create_official(
    VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR);              -- pre-federation (5-arg)
DROP PROCEDURE IF EXISTS admin_upsert_player(
    VARCHAR, VARCHAR, VARCHAR, VARCHAR, INT,
    VARCHAR, VARCHAR, INT, VARCHAR, VARCHAR, INT, INT);        -- pre-aliases (12-arg)

-- ==========================================
-- 1. TRIGGERS: bookkeeping columns
-- ==========================================
-- Bump tournaments.last_updated on every write.
CREATE OR REPLACE FUNCTION touch_last_updated() RETURNS trigger AS $$
BEGIN
    NEW.last_updated = clock_timestamp();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tournaments_touch ON tournaments;
CREATE TRIGGER trg_tournaments_touch
BEFORE UPDATE ON tournaments
FOR EACH ROW EXECUTE FUNCTION touch_last_updated();

-- ==========================================
-- 2. MULTI-ALPHABET SEARCH SUPPORT
-- ==========================================
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

-- ==========================================
-- 3. STANDINGS
-- ==========================================
-- Per-board points from both colours, byes included.
CREATE OR REPLACE VIEW v_match_stats AS
-- points for WHITE (including byes: black_player_id IS NULL)
SELECT
    r.tournament_id, r.round_number, r.id AS round_id,
    p.white_player_id AS player_id, p.black_player_id AS opponent_id,
    CASE WHEN p.result_id IN ('1-0', '+--', '1BYE') THEN 1
         WHEN p.result_id IN ('0.5-0.5', '1/2-1/2', '=-=', '0.5BYE') THEN 0.5
         ELSE 0 END::numeric AS points_earned,
    CASE WHEN p.result_id IN ('1-0', '+--') THEN 1 ELSE 0 END AS is_win
FROM pairings p JOIN rounds r ON p.round_id = r.id
WHERE p.result_id IS NOT NULL
UNION ALL
-- points for BLACK
SELECT
    r.tournament_id, r.round_number, r.id AS round_id,
    p.black_player_id AS player_id, p.white_player_id AS opponent_id,
    CASE WHEN p.result_id IN ('0-1', '--+') THEN 1
         WHEN p.result_id IN ('0.5-0.5', '1/2-1/2', '=-=') THEN 0.5
         ELSE 0 END::numeric AS points_earned,
    CASE WHEN p.result_id IN ('0-1', '--+') THEN 1 ELSE 0 END AS is_win
FROM pairings p JOIN rounds r ON p.round_id = r.id
WHERE p.result_id IS NOT NULL AND p.black_player_id IS NOT NULL;

-- Recompute points, tie-breaks and final_rank for a whole tournament.
--
-- tie_break_1..4 are NOT fixed formulas: they mirror whatever 4 criteria the
-- organizer picked in tournament_tie_breaks (position 1..4, repeats allowed).
-- All 9 supported criteria are computed for every player first, then mapped
-- into tie_break_1..4 by position, and RANK() breaks ties in that same order.
CREATE OR REPLACE PROCEDURE calculate_standings(p_tour_id INT)
LANGUAGE plpgsql AS $$
BEGIN
    -- Points must be settled before anything else: several criteria
    -- (DirectEncounter, Buchholz family) read opponents' final points.
    UPDATE tournament_participants tp
    SET points = COALESCE((SELECT SUM(points_earned) FROM v_match_stats
                           WHERE player_id = tp.player_id AND tournament_id = p_tour_id), 0)
    WHERE tournament_id = p_tour_id;

    WITH opp_agg AS (
        SELECT
            ms.player_id,
            array_agg(opp_tp.points ORDER BY opp_tp.points) AS opp_pts_asc,
            SUM(opp_tp.points) AS buchholz,
            SUM(CASE
                    WHEN ms.points_earned = 1 THEN opp_tp.points
                    WHEN ms.points_earned = 0.5 THEN opp_tp.points * 0.5
                    ELSE 0
                END) AS berger,
            SUM(CASE WHEN opp_tp.points = tp_self.points THEN ms.points_earned ELSE 0 END)
                AS direct_encounter
        FROM v_match_stats ms
        JOIN tournament_participants opp_tp
          ON ms.opponent_id = opp_tp.player_id AND opp_tp.tournament_id = p_tour_id
        JOIN tournament_participants tp_self
          ON tp_self.player_id = ms.player_id AND tp_self.tournament_id = p_tour_id
        WHERE ms.tournament_id = p_tour_id
        GROUP BY ms.player_id
    ),
    wins AS (
        SELECT player_id, SUM(is_win) AS win_count
        FROM v_match_stats WHERE tournament_id = p_tour_id
        GROUP BY player_id
    ),
    cumulative AS (
        SELECT player_id, SUM(running) AS cumulative_score
        FROM (
            SELECT player_id,
                   SUM(SUM(points_earned)) OVER (PARTITION BY player_id ORDER BY round_number)
                       AS running
            FROM v_match_stats
            WHERE tournament_id = p_tour_id
            GROUP BY player_id, round_number
        ) per_round
        GROUP BY player_id
    ),
    metrics AS (
        SELECT
            tp.player_id,
            tp.points AS m_points,
            COALESCE(w.win_count, 0) AS m_wincount,
            COALESCE(o.direct_encounter, 0) AS m_direct,
            COALESCE(o.buchholz, 0) AS m_buchholz,
            COALESCE(o.berger, 0) AS m_berger,
            COALESCE(c.cumulative_score, 0) AS m_cumulative,
            COALESCE(o.buchholz, 0) - COALESCE(o.opp_pts_asc[1], 0)
                AS m_cut1,
            COALESCE(o.buchholz, 0)
                - COALESCE(o.opp_pts_asc[1], 0)
                - CASE WHEN array_length(o.opp_pts_asc, 1) >= 2
                       THEN o.opp_pts_asc[2] ELSE 0 END
                AS m_cut2,
            CASE WHEN array_length(o.opp_pts_asc, 1) >= 2
                 THEN COALESCE(o.buchholz, 0) - o.opp_pts_asc[1]
                      - o.opp_pts_asc[array_length(o.opp_pts_asc, 1)]
                 ELSE COALESCE(o.buchholz, 0)
            END AS m_median
        FROM tournament_participants tp
        LEFT JOIN opp_agg o ON o.player_id = tp.player_id
        LEFT JOIN wins w ON w.player_id = tp.player_id
        LEFT JOIN cumulative c ON c.player_id = tp.player_id
        WHERE tp.tournament_id = p_tour_id
    ),
    tb_pos AS (
        SELECT position, tie_break_id
        FROM tournament_tie_breaks
        WHERE tournament_id = p_tour_id
    )
    UPDATE tournament_participants tp
    SET
        tie_break_1 = CASE (SELECT tie_break_id FROM tb_pos WHERE position = 1)
            WHEN 'Points' THEN m.m_points
            WHEN 'DirectEncounter' THEN m.m_direct
            WHEN 'WinCount' THEN m.m_wincount
            WHEN 'Buchholz' THEN m.m_buchholz
            WHEN 'Berger' THEN m.m_berger
            WHEN 'BuchholzCut1' THEN m.m_cut1
            WHEN 'BuchholzCut2' THEN m.m_cut2
            WHEN 'MedianBuchholz' THEN m.m_median
            WHEN 'CumulativeScore' THEN m.m_cumulative
            ELSE 0 END,
        tie_break_2 = CASE (SELECT tie_break_id FROM tb_pos WHERE position = 2)
            WHEN 'Points' THEN m.m_points
            WHEN 'DirectEncounter' THEN m.m_direct
            WHEN 'WinCount' THEN m.m_wincount
            WHEN 'Buchholz' THEN m.m_buchholz
            WHEN 'Berger' THEN m.m_berger
            WHEN 'BuchholzCut1' THEN m.m_cut1
            WHEN 'BuchholzCut2' THEN m.m_cut2
            WHEN 'MedianBuchholz' THEN m.m_median
            WHEN 'CumulativeScore' THEN m.m_cumulative
            ELSE 0 END,
        tie_break_3 = CASE (SELECT tie_break_id FROM tb_pos WHERE position = 3)
            WHEN 'Points' THEN m.m_points
            WHEN 'DirectEncounter' THEN m.m_direct
            WHEN 'WinCount' THEN m.m_wincount
            WHEN 'Buchholz' THEN m.m_buchholz
            WHEN 'Berger' THEN m.m_berger
            WHEN 'BuchholzCut1' THEN m.m_cut1
            WHEN 'BuchholzCut2' THEN m.m_cut2
            WHEN 'MedianBuchholz' THEN m.m_median
            WHEN 'CumulativeScore' THEN m.m_cumulative
            ELSE 0 END,
        tie_break_4 = CASE (SELECT tie_break_id FROM tb_pos WHERE position = 4)
            WHEN 'Points' THEN m.m_points
            WHEN 'DirectEncounter' THEN m.m_direct
            WHEN 'WinCount' THEN m.m_wincount
            WHEN 'Buchholz' THEN m.m_buchholz
            WHEN 'Berger' THEN m.m_berger
            WHEN 'BuchholzCut1' THEN m.m_cut1
            WHEN 'BuchholzCut2' THEN m.m_cut2
            WHEN 'MedianBuchholz' THEN m.m_median
            WHEN 'CumulativeScore' THEN m.m_cumulative
            ELSE 0 END
    FROM metrics m
    WHERE tp.player_id = m.player_id AND tp.tournament_id = p_tour_id;

    WITH RankedPlayers AS (
        SELECT player_id,
               RANK() OVER(ORDER BY points DESC, tie_break_1 DESC,
                           tie_break_2 DESC, tie_break_3 DESC, tie_break_4 DESC) AS rnk
        FROM tournament_participants
        WHERE tournament_id = p_tour_id
    )
    UPDATE tournament_participants tp
    SET final_rank = rp.rnk
    FROM RankedPlayers rp
    WHERE tp.player_id = rp.player_id AND tp.tournament_id = p_tour_id;
END;
$$;

-- Renumber starting_rank by rating (highest first, id as tiebreak).
CREATE OR REPLACE PROCEDURE sync_starting_ranks(p_tour_id INT)
LANGUAGE plpgsql AS $$
BEGIN
    WITH SortedRanks AS (
        SELECT player_id,
               ROW_NUMBER() OVER(ORDER BY rating_at_tournament DESC, player_id ASC) AS new_rank
        FROM tournament_participants WHERE tournament_id = p_tour_id
    )
    UPDATE tournament_participants tp
    SET starting_rank = sr.new_rank
    FROM SortedRanks sr
    WHERE tp.player_id = sr.player_id AND tp.tournament_id = p_tour_id;
END;
$$;

-- ==========================================
-- 4. PLAYER ADMINISTRATION
-- ==========================================
-- Full player profile upsert. The id is supplied by the admin, never
-- generated. NULL aliases keeps the existing value. There is deliberately no
-- delete counterpart: players are permanent records.
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

-- Deleting a player must never silently erase tournament history: the cascades
-- on tournament_participants and standings_history would take results with
-- them. Callers check this first.
CREATE OR REPLACE FUNCTION player_has_history(p_player_id VARCHAR(50))
RETURNS BOOLEAN
LANGUAGE sql STABLE AS $$
    SELECT EXISTS (SELECT 1 FROM tournament_participants WHERE player_id = p_player_id)
        OR EXISTS (SELECT 1 FROM pairings
                   WHERE white_player_id = p_player_id
                      OR black_player_id = p_player_id)
        OR EXISTS (SELECT 1 FROM rating_history WHERE player_id = p_player_id);
$$;

-- ==========================================
-- 5. TOURNAMENT ENTRIES
-- ==========================================
-- Add a player and re-sort the whole start list.
CREATE OR REPLACE PROCEDURE admin_add_to_tournament(p_tour_id INT, p_player_id VARCHAR(50))
LANGUAGE plpgsql AS $$
DECLARE
    v_rating_type VARCHAR(50);
BEGIN
    SELECT rating_type_id INTO v_rating_type FROM tournaments WHERE id = p_tour_id;
    INSERT INTO tournament_participants (tournament_id, player_id, rating_at_tournament, club)
    SELECT p_tour_id, p_player_id,
           CASE v_rating_type
               WHEN 'Rapid' THEN rating_rapid
               WHEN 'Blitz' THEN rating_blitz
               ELSE rating_classic
           END,
           club
    FROM players WHERE id = p_player_id;

    CALL sync_starting_ranks(p_tour_id);
END;
$$;

-- Bulk-add variant that skips the re-sort: adding N players one at a time
-- re-sorted the whole start list on every insert (O(n^2)). Callers insert all
-- players, then call sync_starting_ranks once.
CREATE OR REPLACE PROCEDURE admin_add_to_tournament_nosync(
    p_tour_id INT, p_player_id VARCHAR(50)
)
LANGUAGE plpgsql AS $$
DECLARE
    v_rating_type VARCHAR(50);
BEGIN
    SELECT rating_type_id INTO v_rating_type FROM tournaments WHERE id = p_tour_id;
    INSERT INTO tournament_participants (tournament_id, player_id,
                                         rating_at_tournament, club)
    SELECT p_tour_id, p_player_id,
           CASE v_rating_type
               WHEN 'Rapid' THEN rating_rapid
               WHEN 'Blitz' THEN rating_blitz
               ELSE rating_classic
           END,
           club
    FROM players WHERE id = p_player_id;
END;
$$;

CREATE OR REPLACE PROCEDURE admin_remove_from_tournament(p_tour_id INT, p_player_id VARCHAR(50))
LANGUAGE plpgsql AS $$
BEGIN
    DELETE FROM tournament_participants
    WHERE tournament_id = p_tour_id AND player_id = p_player_id;

    CALL sync_starting_ranks(p_tour_id);
END;
$$;

CREATE OR REPLACE PROCEDURE org_withdraw_player(p_tour_id INT, p_player_id VARCHAR(50))
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE tournament_participants
    SET status = 'WITHDRAWN'
    WHERE tournament_id = p_tour_id AND player_id = p_player_id;
END;
$$;

-- ==========================================
-- 6. ROUNDS, PAIRINGS AND RESULTS
-- ==========================================
CREATE OR REPLACE PROCEDURE org_add_round(p_tour_id INT, p_round_num INT)
LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO rounds (tournament_id, round_number) VALUES (p_tour_id, p_round_num);
END;
$$;

CREATE OR REPLACE PROCEDURE org_add_pairing(
    p_round_id INT, p_board INT, p_white VARCHAR(50), p_black VARCHAR(50)
)
LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO pairings (round_id, board_number, white_player_id, black_player_id)
    VALUES (p_round_id, p_board, p_white, p_black);
END;
$$;

CREATE OR REPLACE PROCEDURE org_cancel_pairings(p_round_id INT)
LANGUAGE plpgsql AS $$
DECLARE
    v_tour_id INT;
BEGIN
    SELECT tournament_id INTO v_tour_id FROM rounds WHERE id = p_round_id;
    DELETE FROM pairings WHERE round_id = p_round_id;
    CALL calculate_standings(v_tour_id);
END;
$$;

-- Setting/clearing a result recomputes standings; a closed round is frozen.
CREATE OR REPLACE PROCEDURE org_set_result(p_pairing_id INT, p_result VARCHAR(10))
LANGUAGE plpgsql AS $$
DECLARE
    v_tour_id INT;
    v_closed BOOLEAN;
BEGIN
    SELECT r.tournament_id, r.is_closed INTO v_tour_id, v_closed
    FROM pairings p JOIN rounds r ON p.round_id = r.id
    WHERE p.id = p_pairing_id;

    IF v_closed THEN
        RAISE EXCEPTION 'round_closed';
    END IF;

    UPDATE pairings SET result_id = p_result WHERE id = p_pairing_id;
    CALL calculate_standings(v_tour_id);
END;
$$;

CREATE OR REPLACE PROCEDURE org_cancel_result(p_pairing_id INT)
LANGUAGE plpgsql AS $$
DECLARE
    v_tour_id INT;
    v_closed BOOLEAN;
BEGIN
    SELECT r.tournament_id, r.is_closed INTO v_tour_id, v_closed
    FROM pairings p JOIN rounds r ON p.round_id = r.id
    WHERE p.id = p_pairing_id;

    IF v_closed THEN
        RAISE EXCEPTION 'round_closed';
    END IF;

    UPDATE pairings SET result_id = NULL WHERE id = p_pairing_id;
    CALL calculate_standings(v_tour_id);
END;
$$;

-- Snapshot standings into standings_history and freeze the round.
CREATE OR REPLACE PROCEDURE org_close_round(p_tour_id INT, p_round_id INT)
LANGUAGE plpgsql AS $$
BEGIN
    CALL calculate_standings(p_tour_id);

    INSERT INTO standings_history (tournament_id, round_id, player_id, points,
                                   tie_break_1, tie_break_2, tie_break_3,
                                   tie_break_4, rank_after_round)
    SELECT tournament_id, p_round_id, player_id, points,
           tie_break_1, tie_break_2, tie_break_3, tie_break_4, final_rank
    FROM tournament_participants
    WHERE tournament_id = p_tour_id;

    UPDATE rounds SET is_closed = TRUE WHERE id = p_round_id;
END;
$$;

-- ==========================================
-- 7. OFFICIALS
-- ==========================================
-- Create an official plus a matching ORGANIZER login account.
CREATE OR REPLACE PROCEDURE admin_create_official(
    p_first VARCHAR(50), p_last VARCHAR(50), p_title VARCHAR(10),
    p_username VARCHAR(50), p_password_hash VARCHAR(255),
    p_federation VARCHAR(4) DEFAULT NULL
)
LANGUAGE plpgsql AS $$
DECLARE
    v_official_id INT;
BEGIN
    INSERT INTO officials (first_name, last_name, title)
    VALUES (p_first, p_last, p_title)
    RETURNING id INTO v_official_id;

    INSERT INTO users (username, password_hash, role_id, official_id, federation_id)
    VALUES (p_username, p_password_hash, 'ORGANIZER', v_official_id, p_federation);
END;
$$;

-- ==========================================
-- 8. FINALIZE (apply Python-computed Elo deltas)
-- ==========================================
-- p_deltas jsonb: [{"player_id": "x", "delta": 12.5, "new_rating": 1962}, ...]
CREATE OR REPLACE PROCEDURE finalize_tournament(p_tour_id INT, p_deltas JSONB)
LANGUAGE plpgsql AS $$
DECLARE
    v_rating_type VARCHAR(50);
    rec RECORD;
    v_before INT;
BEGIN
    SELECT rating_type_id INTO v_rating_type FROM tournaments WHERE id = p_tour_id;

    FOR rec IN
        SELECT (d->>'player_id') AS player_id,
               (d->>'delta')::numeric AS delta,
               (d->>'new_rating')::int AS new_rating
        FROM jsonb_array_elements(p_deltas) d
    LOOP
        SELECT CASE v_rating_type
                   WHEN 'Rapid' THEN rating_rapid
                   WHEN 'Blitz' THEN rating_blitz
                   ELSE rating_classic
               END INTO v_before
        FROM players WHERE id = rec.player_id;

        UPDATE players SET
            rating_classic = CASE WHEN v_rating_type NOT IN ('Rapid', 'Blitz')
                                  THEN rec.new_rating ELSE rating_classic END,
            rating_rapid = CASE WHEN v_rating_type = 'Rapid'
                                THEN rec.new_rating ELSE rating_rapid END,
            rating_blitz = CASE WHEN v_rating_type = 'Blitz'
                                THEN rec.new_rating ELSE rating_blitz END
        WHERE id = rec.player_id;

        UPDATE tournament_participants
        SET rating_change = rec.delta
        WHERE tournament_id = p_tour_id AND player_id = rec.player_id;

        INSERT INTO rating_history (player_id, tournament_id, rating_type_id,
                                    rating_before, rating_after)
        VALUES (rec.player_id, p_tour_id, COALESCE(v_rating_type, 'Classic'),
                v_before, rec.new_rating);
    END LOOP;

    UPDATE tournaments SET status = 'COMPLETED' WHERE id = p_tour_id;
END;
$$;

-- ==========================================
-- 9. SEARCH
-- ==========================================
CREATE OR REPLACE FUNCTION search_tournaments(
    p_fed VARCHAR DEFAULT NULL,
    p_location VARCHAR DEFAULT NULL,
    p_start_date DATE DEFAULT NULL,
    p_lang VARCHAR DEFAULT 'RUS',
    p_limit INT DEFAULT 100,
    p_offset INT DEFAULT 0
)
RETURNS TABLE (
    id INT, name VARCHAR, federation VARCHAR, location VARCHAR,
    start_date DATE, end_date DATE, rounds INT, slug VARCHAR
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.id, t.name, t.federation_id, lt.name AS location_name,
        t.start_date, t.end_date, t.rounds, t.slug
    FROM tournaments t
    LEFT JOIN location_translations lt
      ON t.location_id = lt.location_id AND lt.lang_code = p_lang
    WHERE
        (p_fed IS NULL OR t.federation_id = p_fed) AND
        (p_location IS NULL OR t.location_id = p_location) AND
        (p_start_date IS NULL OR t.start_date >= p_start_date)
    ORDER BY t.start_date DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$;

-- Simple substring search. Kept for backward compatibility; new callers should
-- prefer search_players_fuzzy below.
CREATE OR REPLACE FUNCTION search_players(
    p_search_text VARCHAR,
    p_limit INT DEFAULT 50
)
RETURNS TABLE (
    id VARCHAR, title VARCHAR, full_name VARCHAR, rating INT, fed VARCHAR
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id, p.title_id,
        (p.last_name || ' ' || p.first_name || COALESCE(' ' || p.middle_name, ''))::VARCHAR,
        p.rating_classic, p.federation_id
    FROM players p
    WHERE
        p.id ILIKE '%' || p_search_text || '%' OR
        p.last_name ILIKE '%' || p_search_text || '%' OR
        p.first_name ILIKE '%' || p_search_text || '%'
    ORDER BY p.rating_classic DESC
    LIMIT p_limit;
END;
$$;

-- Fuzzy, both-alphabet name search. word_similarity tolerates typos and matches
-- a short query against the best word inside search_text; the query is also
-- transliterated so a Cyrillic query finds a Latin-registered player and back.
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
-- 10. DIRECTORY COUNTERS
-- ==========================================
-- The organizer / arbiter directories show how many tournaments each person
-- ran. The number is derived, not stored: a denormalized counter column would
-- have to be maintained on every insert, delete and organizer reassignment,
-- and silently drifts the first time one of those paths is missed.
CREATE OR REPLACE VIEW v_organizations AS
SELECT o.*,
       (SELECT COUNT(*) FROM tournaments t WHERE t.organizer_id = o.id)::INT
           AS tournaments_count
FROM organizations o;

-- An official counts a tournament once whether they were its arbiter, its
-- director, or one of the extra arbiters in tournament_arbiters.
CREATE OR REPLACE VIEW v_officials AS
SELECT o.*,
       (SELECT COUNT(*) FROM tournaments t
         WHERE t.arbiter_id = o.id
            OR t.director_id = o.id
            OR EXISTS (SELECT 1 FROM tournament_arbiters ta
                        WHERE ta.tournament_id = t.id
                          AND ta.official_id = o.id))::INT
           AS tournaments_count
FROM officials o;
