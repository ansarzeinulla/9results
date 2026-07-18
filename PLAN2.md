CREATE OR REPLACE VIEW v_match_stats AS
-- Очки для БЕЛЫХ
SELECT 
    r.tournament_id, r.round_number, p.white_player_id AS player_id, p.black_player_id AS opponent_id,
    CASE WHEN p.result_id IN ('1-0', '+--') THEN 1 
         WHEN p.result_id IN ('0.5-0.5', '1/2-1/2', '=-=') THEN 0.5 
         ELSE 0 END AS points_earned,
    CASE WHEN p.result_id IN ('1-0', '+--') THEN 1 ELSE 0 END AS is_win
FROM pairings p JOIN rounds r ON p.round_id = r.id WHERE p.result_id IS NOT NULL
UNION ALL
-- Очки для ЧЕРНЫХ
SELECT 
    r.tournament_id, r.round_number, p.black_player_id AS player_id, p.white_player_id AS opponent_id,
    CASE WHEN p.result_id IN ('0-1', '--+') THEN 1 
         WHEN p.result_id IN ('0.5-0.5', '1/2-1/2', '=-=') THEN 0.5 
         ELSE 0 END AS points_earned,
    CASE WHEN p.result_id IN ('0-1', '--+') THEN 1 ELSE 0 END AS is_win
FROM pairings p JOIN rounds r ON p.round_id = r.id WHERE p.result_id IS NOT NULL;





CREATE OR REPLACE PROCEDURE calculate_standings(p_tour_id INT)
LANGUAGE plpgsql AS $$
BEGIN
    -- 1. Сначала обновляем базовые Очки (Points) и Количество побед (TB_Wins)
    UPDATE tournament_participants tp
    SET 
        points = COALESCE((SELECT SUM(points_earned) FROM v_match_stats WHERE player_id = tp.player_id AND tournament_id = p_tour_id), 0),
        tie_break_1 = COALESCE((SELECT SUM(is_win) FROM v_match_stats WHERE player_id = tp.player_id AND tournament_id = p_tour_id), 0) -- TB1: Кол-во побед
    WHERE tournament_id = p_tour_id;

    -- 2. Считаем Бухгольц (TB2) и Бергер (TB3)
    -- Бухгольц: Сумма очков всех оппонентов
    -- Бергер: Сумма очков поверженных оппонентов + половина очков оппонентов, с кем ничья
    UPDATE tournament_participants tp
    SET 
        tie_break_2 = COALESCE(( -- TB2: Бухгольц
            SELECT SUM(opp_tp.points)
            FROM v_match_stats ms
            JOIN tournament_participants opp_tp ON ms.opponent_id = opp_tp.player_id AND opp_tp.tournament_id = p_tour_id
            WHERE ms.player_id = tp.player_id AND ms.tournament_id = p_tour_id
        ), 0),
        tie_break_3 = COALESCE(( -- TB3: Бергер
            SELECT SUM(
                CASE 
                    WHEN ms.points_earned = 1 THEN opp_tp.points 
                    WHEN ms.points_earned = 0.5 THEN opp_tp.points * 0.5 
                    ELSE 0 
                END
            )
            FROM v_match_stats ms
            JOIN tournament_participants opp_tp ON ms.opponent_id = opp_tp.player_id AND opp_tp.tournament_id = p_tour_id
            WHERE ms.player_id = tp.player_id AND ms.tournament_id = p_tour_id
        ), 0)
    WHERE tournament_id = p_tour_id;

    -- 3. Присваиваем Финальные Ранги (Места)
    -- Сортировка: Очки -> Бухгольц -> Бергер -> Кол-во побед
    WITH RankedPlayers AS (
        SELECT player_id, 
               RANK() OVER(ORDER BY points DESC, tie_break_2 DESC, tie_break_3 DESC, tie_break_1 DESC) as rnk
        FROM tournament_participants
        WHERE tournament_id = p_tour_id
    )
    UPDATE tournament_participants tp
    SET final_rank = rp.rnk
    FROM RankedPlayers rp
    WHERE tp.player_id = rp.player_id AND tp.tournament_id = p_tour_id;
END;
$$;






CREATE OR REPLACE PROCEDURE admin_upsert_player(
    p_id VARCHAR(50), p_first VARCHAR(50), p_last VARCHAR(50), 
    p_fed VARCHAR(4), p_rating INT
)
LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO players (id, first_name, last_name, federation_id, rating_classic)
    VALUES (p_id, p_first, p_last, p_fed, p_rating)
    ON CONFLICT (id) DO UPDATE 
    SET first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        federation_id = EXCLUDED.federation_id,
        rating_classic = EXCLUDED.rating_classic;
END;
$$;



CREATE OR REPLACE PROCEDURE admin_add_to_tournament(p_tour_id INT, p_player_id VARCHAR(50))
LANGUAGE plpgsql AS $$
BEGIN
    -- Добавляем участника, фиксируем его текущий рейтинг
    INSERT INTO tournament_participants (tournament_id, player_id, rating_at_tournament)
    SELECT p_tour_id, p_player_id, rating_classic FROM players WHERE id = p_player_id;

    -- ПЕРЕСЧЕТ СТАРТОВЫХ НОМЕРОВ (сортировка по рейтингу убыванию)
    WITH SortedRanks AS (
        SELECT player_id, 
               ROW_NUMBER() OVER(ORDER BY rating_at_tournament DESC, player_id ASC) as new_rank
        FROM tournament_participants WHERE tournament_id = p_tour_id
    )
    UPDATE tournament_participants tp
    SET starting_rank = sr.new_rank
    FROM SortedRanks sr
    WHERE tp.player_id = sr.player_id AND tp.tournament_id = p_tour_id;
END;
$$;



CREATE OR REPLACE PROCEDURE admin_remove_from_tournament(p_tour_id INT, p_player_id VARCHAR(50))
LANGUAGE plpgsql AS $$
BEGIN
    DELETE FROM tournament_participants WHERE tournament_id = p_tour_id AND player_id = p_player_id;
    
    -- Снова пересчитываем стартовые номера, чтобы не было "дырок" (1, 2, 4, 5...)
    WITH SortedRanks AS (
        SELECT player_id, 
               ROW_NUMBER() OVER(ORDER BY rating_at_tournament DESC, player_id ASC) as new_rank
        FROM tournament_participants WHERE tournament_id = p_tour_id
    )
    UPDATE tournament_participants tp
    SET starting_rank = sr.new_rank
    FROM SortedRanks sr
    WHERE tp.player_id = sr.player_id AND tp.tournament_id = p_tour_id;
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
    -- Удаляем партии
    DELETE FROM pairings WHERE round_id = p_round_id;
    -- Полностью пересчитываем турнир, так как очки могли пропасть
    CALL calculate_standings(v_tour_id);
END;
$$;





CREATE OR REPLACE PROCEDURE org_set_result(p_pairing_id INT, p_result VARCHAR(7))
LANGUAGE plpgsql AS $$
DECLARE
    v_tour_id INT;
BEGIN
    -- Ставим результат
    UPDATE pairings SET result_id = p_result WHERE id = p_pairing_id;
    
    -- Узнаем ID турнира
    SELECT r.tournament_id INTO v_tour_id 
    FROM pairings p JOIN rounds r ON p.round_id = r.id 
    WHERE p.id = p_pairing_id;

    -- МАГИЯ: Автоматически пересчитываем очки, Бухгольц, Бергер и Места!
    CALL calculate_standings(v_tour_id);
END;
$$;





CREATE OR REPLACE PROCEDURE org_cancel_result(p_pairing_id INT)
LANGUAGE plpgsql AS $$
DECLARE
    v_tour_id INT;
BEGIN
    UPDATE pairings SET result_id = NULL WHERE id = p_pairing_id;
    
    SELECT r.tournament_id INTO v_tour_id 
    FROM pairings p JOIN rounds r ON p.round_id = r.id 
    WHERE p.id = p_pairing_id;

    CALL calculate_standings(v_tour_id);
END;
$$;



-- ФУНКЦИЯ АДМИНА: Создать нового судью/организатора
CREATE OR REPLACE PROCEDURE admin_create_official(
    p_first VARCHAR(50), p_last VARCHAR(50), p_title VARCHAR(3),
    p_username VARCHAR(50), p_password_hash VARCHAR(255)
)
LANGUAGE plpgsql AS $$
DECLARE
    v_official_id INT;
BEGIN
    -- 1. Создаем профиль судьи
    INSERT INTO officials (first_name, last_name, title) 
    VALUES (p_first, p_last, p_title)
    RETURNING id INTO v_official_id;

    -- 2. Создаем ему аккаунт для входа
    INSERT INTO users (username, password_hash, role_id, official_id)
    VALUES (p_username, p_password_hash, 'ORGANIZER', v_official_id);
END;
$$;



CREATE OR REPLACE PROCEDURE org_close_round(p_tour_id INT, p_round_id INT)
LANGUAGE plpgsql AS $$
BEGIN
    -- Считаем текущее положение (как мы делали в предыдущем ответе)
    CALL calculate_standings(p_tour_id);

    -- Делаем "снимок" и сохраняем в историю навсегда
    INSERT INTO standings_history (tournament_id, round_id, player_id, points, tie_break_1, tie_break_2, tie_break_3, rank_after_round)
    SELECT tournament_id, p_round_id, player_id, points, tie_break_1, tie_break_2, tie_break_3, final_rank
    FROM tournament_participants
    WHERE tournament_id = p_tour_id;
END;
$$;


-- ПОИСК ТУРНИРОВ (С фильтрами и пагинацией)
CREATE OR REPLACE FUNCTION search_tournaments(
    p_fed VARCHAR DEFAULT NULL,
    p_location VARCHAR DEFAULT NULL,
    p_start_date DATE DEFAULT NULL,
    p_limit INT DEFAULT 100,
    p_offset INT DEFAULT 0
)
RETURNS TABLE (
    id INT, name VARCHAR, federation VARCHAR, location VARCHAR, dates VARCHAR, rounds INT
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id, t.name, t.federation_id, lt.name AS location_name, 
        (t.start_date || ' - ' || t.end_date)::VARCHAR, t.rounds
    FROM tournaments t
    LEFT JOIN location_translations lt ON t.location_id = lt.location_id AND lt.lang_code = 'RUS'
    WHERE 
        (p_fed IS NULL OR t.federation_id = p_fed) AND
        (p_location IS NULL OR t.location_id = p_location) AND
        (p_start_date IS NULL OR t.start_date >= p_start_date)
    ORDER BY t.start_date DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$;

-- ПОИСК ИГРОКОВ (По ФИО, ID и т.д.)
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



-- Когда игрок снимается, организатор дергает эту функцию:
CREATE OR REPLACE PROCEDURE org_withdraw_player(p_tour_id INT, p_player_id VARCHAR(50))
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE tournament_participants 
    SET status = 'WITHDRAWN' 
    WHERE tournament_id = p_tour_id AND player_id = p_player_id;
END;
$$;