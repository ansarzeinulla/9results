-- 002_procedures.sql — PLAN2.md procedures ported with bye/forfeit handling,
-- closed-round guard, finalize_tournament and multilingual search.

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


CREATE OR REPLACE PROCEDURE calculate_standings(p_tour_id INT)
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE tournament_participants tp
    SET
        points = COALESCE((SELECT SUM(points_earned) FROM v_match_stats
                           WHERE player_id = tp.player_id AND tournament_id = p_tour_id), 0),
        tie_break_1 = COALESCE((SELECT SUM(is_win) FROM v_match_stats
                                WHERE player_id = tp.player_id AND tournament_id = p_tour_id), 0)
    WHERE tournament_id = p_tour_id;

    UPDATE tournament_participants tp
    SET
        tie_break_2 = COALESCE(( -- Buchholz
            SELECT SUM(opp_tp.points)
            FROM v_match_stats ms
            JOIN tournament_participants opp_tp
              ON ms.opponent_id = opp_tp.player_id AND opp_tp.tournament_id = p_tour_id
            WHERE ms.player_id = tp.player_id AND ms.tournament_id = p_tour_id
        ), 0),
        tie_break_3 = COALESCE(( -- Sonneborn-Berger
            SELECT SUM(
                CASE
                    WHEN ms.points_earned = 1 THEN opp_tp.points
                    WHEN ms.points_earned = 0.5 THEN opp_tp.points * 0.5
                    ELSE 0
                END)
            FROM v_match_stats ms
            JOIN tournament_participants opp_tp
              ON ms.opponent_id = opp_tp.player_id AND opp_tp.tournament_id = p_tour_id
            WHERE ms.player_id = tp.player_id AND ms.tournament_id = p_tour_id
        ), 0)
    WHERE tournament_id = p_tour_id;

    WITH RankedPlayers AS (
        SELECT player_id,
               RANK() OVER(ORDER BY points DESC, tie_break_2 DESC,
                           tie_break_3 DESC, tie_break_1 DESC) AS rnk
        FROM tournament_participants
        WHERE tournament_id = p_tour_id
    )
    UPDATE tournament_participants tp
    SET final_rank = rp.rnk
    FROM RankedPlayers rp
    WHERE tp.player_id = rp.player_id AND tp.tournament_id = p_tour_id;
END;
$$;


-- Full player profile upsert. The id is supplied by the admin, never generated.
-- There is deliberately no delete counterpart: players are permanent records.
CREATE OR REPLACE PROCEDURE admin_upsert_player(
    p_id VARCHAR(50), p_first VARCHAR(50), p_last VARCHAR(50),
    p_fed VARCHAR(4), p_rating INT,
    p_middle VARCHAR(50) DEFAULT NULL,
    p_gender VARCHAR(1) DEFAULT NULL,
    p_year INT DEFAULT NULL,
    p_title VARCHAR(10) DEFAULT NULL,
    p_club VARCHAR(100) DEFAULT NULL,
    p_rating_rapid INT DEFAULT 0,
    p_rating_blitz INT DEFAULT 0
)
LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO players (id, first_name, last_name, middle_name, federation_id,
                         gender_id, year_of_birth, title_id, club,
                         rating_classic, rating_rapid, rating_blitz)
    VALUES (p_id, p_first, p_last, p_middle, p_fed,
            p_gender, p_year, p_title, p_club,
            p_rating, p_rating_rapid, p_rating_blitz)
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
        rating_blitz = EXCLUDED.rating_blitz;
END;
$$;


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


CREATE OR REPLACE PROCEDURE admin_remove_from_tournament(p_tour_id INT, p_player_id VARCHAR(50))
LANGUAGE plpgsql AS $$
BEGIN
    DELETE FROM tournament_participants
    WHERE tournament_id = p_tour_id AND player_id = p_player_id;

    CALL sync_starting_ranks(p_tour_id);
END;
$$;


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


CREATE OR REPLACE PROCEDURE admin_create_official(
    p_first VARCHAR(50), p_last VARCHAR(50), p_title VARCHAR(10),
    p_username VARCHAR(50), p_password_hash VARCHAR(255)
)
LANGUAGE plpgsql AS $$
DECLARE
    v_official_id INT;
BEGIN
    INSERT INTO officials (first_name, last_name, title)
    VALUES (p_first, p_last, p_title)
    RETURNING id INTO v_official_id;

    INSERT INTO users (username, password_hash, role_id, official_id)
    VALUES (p_username, p_password_hash, 'ORGANIZER', v_official_id);
END;
$$;


CREATE OR REPLACE PROCEDURE org_close_round(p_tour_id INT, p_round_id INT)
LANGUAGE plpgsql AS $$
BEGIN
    CALL calculate_standings(p_tour_id);

    INSERT INTO standings_history (tournament_id, round_id, player_id, points,
                                   tie_break_1, tie_break_2, tie_break_3, rank_after_round)
    SELECT tournament_id, p_round_id, player_id, points,
           tie_break_1, tie_break_2, tie_break_3, final_rank
    FROM tournament_participants
    WHERE tournament_id = p_tour_id;

    UPDATE rounds SET is_closed = TRUE WHERE id = p_round_id;
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


-- Persist Python-computed Elo deltas; deltas jsonb:
-- [{"player_id": "x", "delta": 12.5, "new_rating": 1962}, ...]
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
