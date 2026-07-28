-- seeds/06_simulation_arbiters.sql
-- Part 2/3 of the simulation dataset.
-- Generates 200 arbiters — officials + matching login accounts.

DO $$
DECLARE
    -- 'admin12345' bcrypt hash
    c_hash CONSTANT VARCHAR := '$2b$12$7Thwno4xgoYwL73Rb1qnJOR3m38P3.T0.NmHYp/1d.i4cONmTqXqa';

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

    v_gender VARCHAR; v_first TEXT; v_last TEXT;
    i INT;
BEGIN
    -- Idempotency guard.
    IF EXISTS (SELECT 1 FROM users WHERE username LIKE 'sim_arb_%') THEN
        RAISE NOTICE 'seeds/06_simulation_arbiters.sql: sim arbiters already present, skipping.';
        RETURN;
    END IF;

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

    RAISE NOTICE 'seeds/06_simulation_arbiters.sql: generated 200 arbiters.';
END $$;