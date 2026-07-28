-- seeds/07_simulation_tournaments.sql
-- Part 3/3 of the simulation dataset.
-- Generates 100 Swiss tournaments — played out round-by-round and finalized.
-- Dependencies: 05_simulation_players.sql and 06_simulation_arbiters.sql must run first.

DO $$
DECLARE
    -- Stratification vocabularies (all seeded in 01_reference_data / 02_locations).
    c_levels  CONSTANT TEXT[] := ARRAY['International','National','Regional','Club','Other'];
    c_rtypes  CONSTANT TEXT[] := ARRAY['Classic','Rapid','Blitz'];
    c_ptypes  CONSTANT TEXT[] := ARRAY['All','Men','Women','Seniors','Veterans','U20','U16'];
    c_locs    CONSTANT TEXT[] := ARRAY['Almaty','Astana','Shymkent','Karaganda','Taraz',
        'Aktobe','Pavlodar','Kostanay','Semey','Oral','Atyrau','Online'];
    c_tc      CONSTANT TEXT[] := ARRAY['Classic_90','Rapid_20','Blitz_5_3'];

    v_arb_ids INT[];       -- official ids of the arbiters we create, for random pick
    v_arb1 INT; v_arb2 INT;

    t INT; r INT;
    v_tid INT; v_rid INT;
    v_np INT; v_rounds INT; v_n INT; v_board INT; v_idx INT; v_upto INT;
    v_status VARCHAR; v_rtype VARCHAR; v_start DATE;
    v_players VARCHAR[];
    v_white VARCHAR; v_black VARCHAR; v_res VARCHAR; v_rnd DOUBLE PRECISION;
    v_deltas JSONB;
    rec RECORD;
BEGIN
    -- Idempotency guard.
    IF EXISTS (SELECT 1 FROM tournaments WHERE slug LIKE 'sim-t-%') THEN
        RAISE NOTICE 'seeds/07_simulation_tournaments.sql: SIM tournaments already present, skipping.';
        RETURN;
    END IF;

    -- Capture the real official ids: the IDENTITY sequence can have gaps, so we
    -- must pick arbiters from the ids that actually exist, not from arithmetic.
    SELECT array_agg(official_id) INTO v_arb_ids
    FROM users WHERE username LIKE 'sim_arb_%';

    IF v_arb_ids IS NULL THEN
         RAISE EXCEPTION 'Arbiter data missing! Run 06_simulation_arbiters.sql first.';
    END IF;

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

    RAISE NOTICE 'seeds/07_simulation_tournaments.sql: generated 100 tournaments.';
END $$;