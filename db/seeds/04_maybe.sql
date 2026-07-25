-- seeds/08_mock_data.sql
-- Generates 10 players, 2 organizers (organizations), 2 arbiters (officials), 
-- and 2 full 3-round tournaments (one Classic, one Blitz) fully played and finalized.

DO $$
DECLARE
    org1_id INT;
    org2_id INT;
    arbiter1_id INT;
    arbiter2_id INT;
    
    t1_id INT;
    t2_id INT;
    
    r1_id INT; r2_id INT; r3_id INT;
    r4_id INT; r5_id INT; r6_id INT;
BEGIN
    -- ==========================================
    -- 1. LOCATIONS & TRANSLATIONS
    -- ==========================================
    INSERT INTO locations (id) VALUES ('Almaty'), ('Astana') ON CONFLICT DO NOTHING;
    INSERT INTO location_translations (location_id, lang_code, name) VALUES
        ('Almaty', 'ENG', 'Almaty'), ('Almaty', 'RUS', 'Алматы'),
        ('Astana', 'ENG', 'Astana'), ('Astana', 'RUS', 'Астана')
    ON CONFLICT DO NOTHING;

    -- ==========================================
    -- 2. ORGANIZERS (Organizations)
    -- ==========================================
    INSERT INTO organizations (name, federation_id) 
    VALUES ('Almaty Chess & Togyzkumalak Club', 'KAZ')
    RETURNING id INTO org1_id;

    INSERT INTO organizations (name, federation_id) 
    VALUES ('Astana Mind Sports Academy', 'KAZ')
    RETURNING id INTO org2_id;

    -- ==========================================
    -- 3. ARBITERS (Officials & Login Accounts)
    -- Both get the 'admin12345' password hash from 03_accounts.sql
    -- ==========================================
    CALL admin_create_official('Serik', 'Akhmetov', 'IA', 'serik_arb', '$2b$12$7Thwno4xgoYwL73Rb1qnJOR3m38P3.T0.NmHYp/1d.i4cONmTqXqa');
    SELECT official_id INTO arbiter1_id FROM users WHERE username = 'serik_arb';

    CALL admin_create_official('Bolat', 'Zhumagaliyev', 'FA', 'bolat_arb', '$2b$12$7Thwno4xgoYwL73Rb1qnJOR3m38P3.T0.NmHYp/1d.i4cONmTqXqa');
    SELECT official_id INTO arbiter2_id FROM users WHERE username = 'bolat_arb';

    -- ==========================================
    -- 4. 10 PLAYERS
    -- ==========================================
    -- ID, First, Last, Fed, Classic, Middle, Gender, Year, Title, Club, Rapid, Blitz, Aliases
    CALL admin_upsert_player('KAZ001', 'Alibek', 'Sarsenov', 'KAZ', 2100, NULL, 'M', 1990, 'MS', 'Almaty Club', 2050, 2000, '[]');
    CALL admin_upsert_player('KAZ002', 'Bakhyt', 'Nurgaliyev', 'KAZ', 2050, NULL, 'M', 1992, 'CMS', 'Astana Club', 2000, 1950, '[]');
    CALL admin_upsert_player('KAZ003', 'Chingiz', 'Ospanov', 'KAZ', 2000, NULL, 'M', 1988, 'R1', NULL, 1950, 1900, '[]');
    CALL admin_upsert_player('KAZ004', 'Daniyar', 'Khasanov', 'KAZ', 1950, NULL, 'M', 1995, 'R1', NULL, 1900, 1850, '[]');
    CALL admin_upsert_player('KAZ005', 'Erlan', 'Tulegenov', 'KAZ', 1900, NULL, 'M', 1998, 'R2', NULL, 1850, 1800, '[]');
    
    CALL admin_upsert_player('KAZ006', 'Farida', 'Iskakova', 'KAZ', 2150, NULL, 'F', 1991, 'MSIC', 'Almaty Club', 2100, 2050, '[]');
    CALL admin_upsert_player('KAZ007', 'Gulnaz', 'Muratova', 'KAZ', 2000, NULL, 'F', 1994, 'MS', NULL, 1950, 1900, '[]');
    CALL admin_upsert_player('KAZ008', 'Aizhan', 'Kasymova', 'KAZ', 1950, NULL, 'F', 1997, 'CMS', 'Astana Club', 1900, 1850, '[]');
    CALL admin_upsert_player('KAZ009', 'Inkar', 'Nurlanova', 'KAZ', 1850, NULL, 'F', 2000, 'R1', NULL, 1800, 1750, '[]');
    CALL admin_upsert_player('KAZ010', 'Jamilya', 'Omarova', 'KAZ', 1800, NULL, 'F', 2002, 'R2', NULL, 1750, 1700, '[]');

    -- ==========================================
    -- 5. TOURNAMENT 1 (CLASSIC, ALMATY)
    -- ==========================================
    INSERT INTO tournaments (
        name, slug, federation_id, organizer_id, arbiter_id, location_id, 
        start_date, end_date, level_id, rating_type_id, tournament_type_id, 
        participant_type_id, rounds, status
    ) VALUES (
        'Almaty Open Classic 2024', 'almaty-open-classic-2024', 'KAZ', org1_id, arbiter1_id, 'Almaty', 
        CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE - INTERVAL '8 days', 
        'National', 'Classic', 'Swiss', 'All', 3, 'REGISTRATION'
    ) RETURNING id INTO t1_id;

    -- Assigned arbiters (multi-arbiter join table)
    INSERT INTO tournament_arbiters (tournament_id, official_id)
    VALUES (t1_id, arbiter1_id), (t1_id, arbiter2_id);

    -- Ranking Criteria
    INSERT INTO tournament_tie_breaks (tournament_id, tie_break_id, position) 
    VALUES (t1_id, 'Points', 1), (t1_id, 'Buchholz', 2), (t1_id, 'Berger', 3);

    -- Add Players
    CALL admin_add_to_tournament_nosync(t1_id, 'KAZ001'); CALL admin_add_to_tournament_nosync(t1_id, 'KAZ002');
    CALL admin_add_to_tournament_nosync(t1_id, 'KAZ003'); CALL admin_add_to_tournament_nosync(t1_id, 'KAZ004');
    CALL admin_add_to_tournament_nosync(t1_id, 'KAZ005'); CALL admin_add_to_tournament_nosync(t1_id, 'KAZ006');
    CALL admin_add_to_tournament_nosync(t1_id, 'KAZ007'); CALL admin_add_to_tournament_nosync(t1_id, 'KAZ008');
    CALL admin_add_to_tournament_nosync(t1_id, 'KAZ009'); CALL admin_add_to_tournament_nosync(t1_id, 'KAZ010');
    CALL sync_starting_ranks(t1_id);
    UPDATE tournaments SET status = 'ONGOING' WHERE id = t1_id;

    -- T1 ROUND 1
    INSERT INTO rounds (tournament_id, round_number) VALUES (t1_id, 1) RETURNING id INTO r1_id;
    INSERT INTO pairings (round_id, board_number, white_player_id, black_player_id, result_id) VALUES
    (r1_id, 1, 'KAZ006', 'KAZ001', '1-0'),     (r1_id, 2, 'KAZ002', 'KAZ007', '0.5-0.5'),
    (r1_id, 3, 'KAZ003', 'KAZ008', '0-1'),     (r1_id, 4, 'KAZ004', 'KAZ009', '1-0'),
    (r1_id, 5, 'KAZ005', 'KAZ010', '0-1');
    CALL org_close_round(t1_id, r1_id);

    -- T1 ROUND 2
    INSERT INTO rounds (tournament_id, round_number) VALUES (t1_id, 2) RETURNING id INTO r2_id;
    INSERT INTO pairings (round_id, board_number, white_player_id, black_player_id, result_id) VALUES
    (r2_id, 1, 'KAZ004', 'KAZ006', '0-1'),     (r2_id, 2, 'KAZ008', 'KAZ010', '1-0'),
    (r2_id, 3, 'KAZ007', 'KAZ002', '0.5-0.5'), (r2_id, 4, 'KAZ001', 'KAZ003', '1-0'),
    (r2_id, 5, 'KAZ009', 'KAZ005', '0-1');
    CALL org_close_round(t1_id, r2_id);

    -- T1 ROUND 3
    INSERT INTO rounds (tournament_id, round_number) VALUES (t1_id, 3) RETURNING id INTO r3_id;
    INSERT INTO pairings (round_id, board_number, white_player_id, black_player_id, result_id) VALUES
    (r3_id, 1, 'KAZ006', 'KAZ008', '1-0'),     (r3_id, 2, 'KAZ005', 'KAZ004', '1-0'),
    (r3_id, 3, 'KAZ010', 'KAZ001', '0-1'),     (r3_id, 4, 'KAZ002', 'KAZ009', '1-0'),
    (r3_id, 5, 'KAZ003', 'KAZ007', '0.5-0.5');
    CALL org_close_round(t1_id, r3_id);

    -- T1 FINALIZE (Push Elo rating changes to history and player profiles)
    CALL finalize_tournament(t1_id, '[
        {"player_id": "KAZ006", "delta": 15.0, "new_rating": 2165},
        {"player_id": "KAZ001", "delta": 5.0,  "new_rating": 2105},
        {"player_id": "KAZ002", "delta": 2.5,  "new_rating": 2052},
        {"player_id": "KAZ008", "delta": 5.0,  "new_rating": 1955},
        {"player_id": "KAZ005", "delta": 0.0,  "new_rating": 1900},
        {"player_id": "KAZ007", "delta": -2.5, "new_rating": 1997},
        {"player_id": "KAZ004", "delta": -5.0, "new_rating": 1945},
        {"player_id": "KAZ010", "delta": -5.0, "new_rating": 1795},
        {"player_id": "KAZ003", "delta": -7.5, "new_rating": 1992},
        {"player_id": "KAZ009", "delta": -10.0,"new_rating": 1840}
    ]'::jsonb);

    -- ==========================================
    -- 6. TOURNAMENT 2 (BLITZ, ASTANA)
    -- ==========================================
    INSERT INTO tournaments (
        name, slug, federation_id, organizer_id, arbiter_id, location_id, 
        start_date, end_date, level_id, rating_type_id, tournament_type_id, 
        participant_type_id, rounds, status
    ) VALUES (
        'Astana Blitz Championship', 'astana-blitz-2024', 'KAZ', org2_id, arbiter2_id, 'Astana', 
        CURRENT_DATE - INTERVAL '2 days', CURRENT_DATE - INTERVAL '2 days', 
        'National', 'Blitz', 'Round-robin', 'All', 3, 'REGISTRATION'
    ) RETURNING id INTO t2_id;

    -- Assigned arbiters (multi-arbiter join table)
    INSERT INTO tournament_arbiters (tournament_id, official_id)
    VALUES (t2_id, arbiter2_id);

    INSERT INTO tournament_tie_breaks (tournament_id, tie_break_id, position)
    VALUES (t2_id, 'Points', 1), (t2_id, 'DirectEncounter', 2), (t2_id, 'Berger', 3);

    -- Add Players
    CALL admin_add_to_tournament_nosync(t2_id, 'KAZ001'); CALL admin_add_to_tournament_nosync(t2_id, 'KAZ002');
    CALL admin_add_to_tournament_nosync(t2_id, 'KAZ003'); CALL admin_add_to_tournament_nosync(t2_id, 'KAZ004');
    CALL admin_add_to_tournament_nosync(t2_id, 'KAZ005'); CALL admin_add_to_tournament_nosync(t2_id, 'KAZ006');
    CALL admin_add_to_tournament_nosync(t2_id, 'KAZ007'); CALL admin_add_to_tournament_nosync(t2_id, 'KAZ008');
    CALL admin_add_to_tournament_nosync(t2_id, 'KAZ009'); CALL admin_add_to_tournament_nosync(t2_id, 'KAZ010');
    CALL sync_starting_ranks(t2_id);
    UPDATE tournaments SET status = 'ONGOING' WHERE id = t2_id;

    -- T2 ROUND 1
    INSERT INTO rounds (tournament_id, round_number) VALUES (t2_id, 1) RETURNING id INTO r4_id;
    INSERT INTO pairings (round_id, board_number, white_player_id, black_player_id, result_id) VALUES
    (r4_id, 1, 'KAZ001', 'KAZ010', '1-0'), (r4_id, 2, 'KAZ002', 'KAZ009', '1-0'),
    (r4_id, 3, 'KAZ003', 'KAZ008', '1-0'), (r4_id, 4, 'KAZ004', 'KAZ007', '0-1'),
    (r4_id, 5, 'KAZ005', 'KAZ006', '0-1');
    CALL org_close_round(t2_id, r4_id);

    -- T2 ROUND 2
    INSERT INTO rounds (tournament_id, round_number) VALUES (t2_id, 2) RETURNING id INTO r5_id;
    INSERT INTO pairings (round_id, board_number, white_player_id, black_player_id, result_id) VALUES
    (r5_id, 1, 'KAZ006', 'KAZ001', '0.5-0.5'), (r5_id, 2, 'KAZ007', 'KAZ002', '0-1'),
    (r5_id, 3, 'KAZ008', 'KAZ003', '1-0'),     (r5_id, 4, 'KAZ009', 'KAZ004', '0-1'),
    (r5_id, 5, 'KAZ010', 'KAZ005', '0.5-0.5');
    CALL org_close_round(t2_id, r5_id);

    -- T2 ROUND 3
    INSERT INTO rounds (tournament_id, round_number) VALUES (t2_id, 3) RETURNING id INTO r6_id;
    INSERT INTO pairings (round_id, board_number, white_player_id, black_player_id, result_id) VALUES
    (r6_id, 1, 'KAZ002', 'KAZ006', '0.5-0.5'), (r6_id, 2, 'KAZ001', 'KAZ008', '1-0'),
    (r6_id, 3, 'KAZ004', 'KAZ010', '1-0'),     (r6_id, 4, 'KAZ005', 'KAZ007', '1-0'),
    (r6_id, 5, 'KAZ003', 'KAZ009', '1-0');
    CALL org_close_round(t2_id, r6_id);

    -- T2 FINALIZE
    CALL finalize_tournament(t2_id, '[
        {"player_id": "KAZ001", "delta": 12.0, "new_rating": 2012},
        {"player_id": "KAZ002", "delta": 10.0, "new_rating": 1960},
        {"player_id": "KAZ003", "delta": -5.0, "new_rating": 1895},
        {"player_id": "KAZ004", "delta": 8.0,  "new_rating": 1858},
        {"player_id": "KAZ005", "delta": -2.0, "new_rating": 1798},
        {"player_id": "KAZ006", "delta": 5.0,  "new_rating": 2055},
        {"player_id": "KAZ007", "delta": -5.0, "new_rating": 1895},
        {"player_id": "KAZ008", "delta": 2.0,  "new_rating": 1852},
        {"player_id": "KAZ009", "delta": -12.0,"new_rating": 1738},
        {"player_id": "KAZ010", "delta": -8.0, "new_rating": 1692}
    ]'::jsonb);

END $$;