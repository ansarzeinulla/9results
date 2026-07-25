-- seeds/05_simulation.sql
-- Large stratified-random simulation dataset, all owned by the 'organizer' user:
--   * 200 players           — rating stratified into 5 bands, mixed gender/title/fed
--   * 200 arbiters           — officials + matching ORGANIZER login accounts
--   * 100 Swiss tournaments  — stratified level / rating type / category / size /
--                              round count (2..10) / lifecycle status, each played
--                              out round-by-round with results and standings, and
--                              (for the COMPLETED ones) finalized with rating deltas.
--
-- All generated rows use the 'SIM' player-id prefix and 'sim_' usernames /
-- 'sim-t-' slugs so they never collide with the hand-written 04_maybe.sql data.
-- Load order: after 01_reference_data.sql (vocabularies) and 02_locations.sql
-- (city rows); independent of 04_maybe.sql.
--
-- Re-runnable: if the simulated players already exist the block is a no-op, so a
-- second `psql -f` won't duplicate rows or trip the unique username/slug keys.
--
-- The pairing is Swiss-*like* — each round sorts the field by standing and pairs
-- neighbours with alternating colours and a bye for the odd player out. It does
-- not enforce the no-rematch rule; this is representative demo data, not a
-- certified pairing engine.

DO $$
DECLARE
    -- 'admin12345' bcrypt hash, same as 03_accounts.sql / 04_maybe.sql.
    c_hash CONSTANT VARCHAR := '$2b$12$7Thwno4xgoYwL73Rb1qnJOR3m38P3.T0.NmHYp/1d.i4cONmTqXqa';

    -- Name pools (reused for players and arbiters).
    c_male   CONSTANT TEXT[] := ARRAY['Alibek','Bakhyt','Chingiz','Daniyar','Erlan',
        'Farkhat','Galym','Nurlan','Olzhas','Rustam','Sanzhar','Timur','Ulan',
        'Yerbol','Zhanibek','Askar','Bekzat','Damir','Kanat','Marat'];
    c_female CONSTANT TEXT[] := ARRAY['Farida','Gulnaz','Aizhan','Inkar','Jamilya',
        'Kamila','Laura','Madina','Nazgul','Perizat','Saltanat','Tomiris','Ulzhan',
        'Venera','Zarina','Aigerim','Dana','Gauhar','Karlygash','Meruert'];
    c_last   CONSTANT TEXT[] := ARRAY['Sarsenov','Nurgaliyev','Ospanov','Khasanov',
        'Tulegenov','Iskakov','Muratov','Kasymov','Nurlanov','Omarov','Akhmetov',
        'Zhumagaliyev','Bekov','Dosanov','Yerzhanov','Kaliyev','Serikov','Toktarov',
        'Abenov','Baytursynov','Zhaksybekov','Suleimenov','Amanzholov','Karimov',
        'Nazarbayev','Auezov','Satpayev','Valikhanov','Kunanbayev','Aimanov'];

    -- Stratification vocabularies (all seeded in 01_reference_data / 02_locations).
    c_levels  CONSTANT TEXT[] := ARRAY['International','National','Regional','Club','Other'];
    c_rtypes  CONSTANT TEXT[] := ARRAY['Classic','Rapid','Blitz'];
    c_ptypes  CONSTANT TEXT[] := ARRAY['All','Men','Women','Seniors','Veterans','U20','U16'];
    c_locs    CONSTANT TEXT[] := ARRAY['Almaty','Astana','Shymkent','Karaganda','Taraz',
        'Aktobe','Pavlodar','Kostanay','Semey','Oral','Atyrau','Online'];
    c_tc      CONSTANT TEXT[] := ARRAY['Classic_90','Rapid_20','Blitz_5_3'];
    c_bases   CONSTANT INT[]  := ARRAY[2250,2050,1850,1650,1450]; -- rating band floors

    v_arb_ids INT[];       -- official ids of the arbiters we create, for random pick
    v_arb1 INT; v_arb2 INT;

    -- player loop
    v_gender VARCHAR; v_first TEXT; v_last TEXT; v_rating INT; v_year INT;
    v_title VARCHAR; v_fed VARCHAR; v_club VARCHAR; v_band INT;

    -- tournament loop
    t INT; r INT; i INT;
    v_tid INT; v_rid INT;
    v_np INT; v_rounds INT; v_n INT; v_board INT; v_idx INT; v_upto INT;
    v_status VARCHAR; v_rtype VARCHAR; v_start DATE;
    v_players VARCHAR[];
    v_white VARCHAR; v_black VARCHAR; v_res VARCHAR; v_rnd DOUBLE PRECISION;
    v_deltas JSONB;
    rec RECORD;
BEGIN
    -- Idempotency guard.
    IF EXISTS (SELECT 1 FROM players WHERE id LIKE 'SIM%') THEN
        RAISE NOTICE 'seeds/05_simulation.sql: SIM data already present, skipping.';
        RETURN;
    END IF;

    -- ==========================================
    -- 1. 200 PLAYERS (rating-band stratified)
    -- ==========================================
    FOR i IN 1..200 LOOP
        v_band   := i % 5;                                   -- even spread across 5 bands
        v_gender := CASE WHEN i % 2 = 0 THEN 'M' ELSE 'F' END;
        v_first  := CASE WHEN v_gender = 'M'
                         THEN c_male[1 + (i % array_length(c_male, 1))]
                         ELSE c_female[1 + (i % array_length(c_female, 1))] END;
        v_last   := c_last[1 + ((i * 7) % array_length(c_last, 1))];
        v_rating := c_bases[v_band + 1] + floor(random() * 150)::int;
        v_year   := 1965 + floor(random() * 45)::int;        -- 1965..2009
        v_fed    := CASE WHEN random() < 0.1 THEN 'WTF' ELSE 'KAZ' END;
        v_title  := CASE
                        WHEN v_rating >= 2300 THEN 'MSIC'
                        WHEN v_rating >= 2100 THEN 'MS'
                        WHEN v_rating >= 1900 THEN 'CMS'
                        WHEN v_rating >= 1700 THEN 'R1'
                        WHEN v_rating >= 1500 THEN 'R2'
                        ELSE 'R3' END;
        v_club   := CASE (i % 4)
                        WHEN 0 THEN 'Almaty Club'
                        WHEN 1 THEN 'Astana Club'
                        WHEN 2 THEN 'Shymkent Club'
                        ELSE NULL END;

        CALL admin_upsert_player(
            'SIM' || lpad(i::text, 3, '0'),
            v_first, v_last, v_fed, v_rating,
            NULL, v_gender, v_year, v_title, v_club,
            greatest(v_rating - 50, 100), greatest(v_rating - 100, 100), '[]');
    END LOOP;

    -- ==========================================
    -- 2. 200 ARBITERS (officials + organizer logins)
    -- ==========================================
    FOR i IN 1..200 LOOP
        v_gender := CASE WHEN i % 2 = 0 THEN 'M' ELSE 'F' END;
        v_first  := CASE WHEN v_gender = 'M'
                         THEN c_male[1 + (i % array_length(c_male, 1))]
                         ELSE c_female[1 + (i % array_length(c_female, 1))] END;
        v_last   := c_last[1 + ((i * 13) % array_length(c_last, 1))];
        CALL admin_create_official(
            v_first, v_last,
            (ARRAY['IA','FA','NA','None'])[1 + (i % 4)],
            'sim_arb_' || i, c_hash, 'KAZ');
    END LOOP;
    -- Capture the real official ids: the IDENTITY sequence can have gaps, so we
    -- must pick arbiters from the ids that actually exist, not from arithmetic.
    SELECT array_agg(official_id) INTO v_arb_ids
    FROM users WHERE username LIKE 'sim_arb_%';

    -- ==========================================
    -- 3. 100 SWISS TOURNAMENTS (stratified, played out)
    -- ==========================================
    FOR t IN 1..100 LOOP
        -- Lifecycle mix: ~10% still taking entries, ~20% live, ~70% finished.
        v_status := CASE
                        WHEN t % 10 = 0 THEN 'REGISTRATION'
                        WHEN t % 10 IN (1, 2) THEN 'ONGOING'
                        ELSE 'COMPLETED' END;
        v_rtype  := c_rtypes[1 + (t % 3)];

        -- Stratified field size (5..24) and round count (2..10, capped by field).
        v_np     := 5 + (t % 20);
        v_rounds := LEAST(2 + (t % 9), 10, GREATEST(v_np - 1, 1));

        v_start  := CASE WHEN v_status = 'REGISTRATION'
                         THEN CURRENT_DATE + 14
                         ELSE CURRENT_DATE - ((100 - t) * 3) END;

        v_arb1 := v_arb_ids[1 + floor(random() * array_length(v_arb_ids, 1))::int];
        v_arb2 := v_arb_ids[1 + floor(random() * array_length(v_arb_ids, 1))::int];

        INSERT INTO tournaments (
            name, slug, federation_id, arbiter_id, owner_user_id, location_id,
            start_date, end_date, level_id, rating_type_id, tournament_type_id,
            participant_type_id, time_control, rounds, status
        ) VALUES (
            'Simulated ' || c_rtypes[1 + (t % 3)] || ' Tournament #' || t,
            'sim-t-' || t,
            'KAZ',
            v_arb1,
            (SELECT id FROM users WHERE username = 'organizer'),
            c_locs[1 + (t % array_length(c_locs, 1))],
            v_start,
            v_start + GREATEST(v_rounds, 1),
            c_levels[1 + (t % 5)],
            v_rtype,
            'Swiss',
            c_ptypes[1 + (t % array_length(c_ptypes, 1))],
            c_tc[1 + (t % 3)],
            v_rounds,
            'REGISTRATION'                      -- flipped below once entries are in
        ) RETURNING id INTO v_tid;

        INSERT INTO tournament_arbiters (tournament_id, official_id)
        VALUES (v_tid, v_arb1) ON CONFLICT DO NOTHING;
        INSERT INTO tournament_arbiters (tournament_id, official_id)
        VALUES (v_tid, v_arb2) ON CONFLICT DO NOTHING;

        INSERT INTO tournament_tie_breaks (tournament_id, tie_break_id, position)
        VALUES (v_tid, 'Points', 1), (v_tid, 'Buchholz', 2), (v_tid, 'Berger', 3);

        -- Stratified-random field drawn from the 200 simulated players.
        FOR rec IN
            SELECT id FROM players WHERE id LIKE 'SIM%' ORDER BY random() LIMIT v_np
        LOOP
            CALL admin_add_to_tournament_nosync(v_tid, rec.id);
        END LOOP;
        CALL sync_starting_ranks(v_tid);

        -- REGISTRATION events stop here: entrants but no games yet.
        IF v_status = 'REGISTRATION' THEN
            CONTINUE;
        END IF;

        UPDATE tournaments SET status = 'ONGOING' WHERE id = v_tid;

        -- Play each round: re-rank, pair neighbours, random result, close.
        FOR r IN 1..v_rounds LOOP
            SELECT array_agg(player_id ORDER BY points DESC, tie_break_2 DESC,
                             rating_at_tournament DESC, player_id)
            INTO v_players
            FROM tournament_participants
            WHERE tournament_id = v_tid AND status = 'ACTIVE';

            v_n := COALESCE(array_length(v_players, 1), 0);
            EXIT WHEN v_n < 2;

            INSERT INTO rounds (tournament_id, round_number)
            VALUES (v_tid, r) RETURNING id INTO v_rid;

            -- Odd field: lowest-ranked player takes a full-point bye.
            IF v_n % 2 = 1 THEN
                INSERT INTO pairings (round_id, board_number, white_player_id,
                                      black_player_id, result_id)
                VALUES (v_rid, 99, v_players[v_n], NULL, '1BYE');
                v_upto := v_n - 1;
            ELSE
                v_upto := v_n;
            END IF;

            v_board := 1;
            v_idx := 1;
            WHILE v_idx <= v_upto LOOP
                -- Alternate colours by board+round for variety.
                IF (v_board + r) % 2 = 0 THEN
                    v_white := v_players[v_idx];     v_black := v_players[v_idx + 1];
                ELSE
                    v_white := v_players[v_idx + 1]; v_black := v_players[v_idx];
                END IF;

                v_rnd := random();
                v_res := CASE
                             WHEN v_rnd < 0.48 THEN '1-0'
                             WHEN v_rnd < 0.85 THEN '0-1'
                             ELSE '0.5-0.5' END;

                INSERT INTO pairings (round_id, board_number, white_player_id,
                                      black_player_id, result_id)
                VALUES (v_rid, v_board, v_white, v_black, v_res);

                v_board := v_board + 1;
                v_idx := v_idx + 2;
            END LOOP;

            CALL org_close_round(v_tid, v_rid);
        END LOOP;

        -- COMPLETED events get finalized with small random rating deltas.
        IF v_status = 'COMPLETED' THEN
            SELECT jsonb_agg(jsonb_build_object(
                       'player_id',  s.player_id,
                       'delta',      s.dv,
                       'new_rating', GREATEST(s.rating_at_tournament + s.dv, 100)))
            INTO v_deltas
            FROM (
                SELECT player_id, rating_at_tournament,
                       (floor(random() * 41) - 20)::int AS dv   -- -20..+20
                FROM tournament_participants
                WHERE tournament_id = v_tid
            ) s;

            IF v_deltas IS NOT NULL THEN
                CALL finalize_tournament(v_tid, v_deltas);       -- sets COMPLETED
            END IF;
        END IF;
    END LOOP;

    RAISE NOTICE 'seeds/05_simulation.sql: generated 200 players, 200 arbiters, 100 tournaments.';
END $$;
