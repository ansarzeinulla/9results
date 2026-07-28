-- seeds/05_simulation_players.sql
-- Part 1/3 of the simulation dataset.
-- Generates 200 players — rating stratified into 5 bands, mixed gender/title/fed.

DO $$
DECLARE
    -- Name pools
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

    c_bases  CONSTANT INT[]  := ARRAY[2250,2050,1850,1650,1450]; -- rating band floors

    v_gender VARCHAR; v_first TEXT; v_last TEXT; v_rating INT; v_year INT;
    v_title VARCHAR; v_fed VARCHAR; v_club VARCHAR; v_band INT;
    i INT;
BEGIN
    -- Idempotency guard.
    IF EXISTS (SELECT 1 FROM players WHERE id LIKE 'SIM%') THEN
        RAISE NOTICE 'seeds/05_simulation_players.sql: SIM players already present, skipping.';
        RETURN;
    END IF;

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

    RAISE NOTICE 'seeds/05_simulation_players.sql: generated 200 players.';
END $$;