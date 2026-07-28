-- seeds/01_reference_data.sql
-- All lookup / reference rows, in dependency order (languages first, since the
-- translation rows at the bottom reference them).
--
-- Consolidated from legacy seed.sql (reference portion), seed3.sql, seed4.sql,
-- and the tournament_statuses rows that lived inside migration 004.
-- Load order: run after build/, before 02_locations.sql and 03_accounts.sql.

-- ==========================================
-- LOCALIZATION
-- ==========================================
INSERT INTO languages (id) VALUES
    ('RUS'),
    ('ENG'),
    ('KAZ'),
    ('SPA'), -- Latin American Spanish
    ('TUR'), -- Turkish
    ('KOR'), -- Korean
    ('CZE'); -- Czech

-- ==========================================
-- ORGANIZATIONS / PEOPLE VOCABULARIES
-- ==========================================
INSERT INTO federations (id) VALUES ('KAZ'), ('WTF');

INSERT INTO user_roles (id) VALUES ('ADMIN'), ('ORGANIZER');

INSERT INTO official_titles (id, description) VALUES
    ('IA',   'International Arbiter'),
    ('FA',   'Federation Arbiter'),
    ('NA',   'National Arbiter'),
    ('None', 'No title');

-- Kazakhstan sport ranks for togyzkumalak.
INSERT INTO titles (id, description) VALUES
    ('MSIC', 'Master of Sport of International Class'),
    ('MS',   'Master of Sport'),
    ('CMS',  'Candidate Master of Sport'),
    ('R1',   'First rank'),
    ('R2',   'Second rank'),
    ('R3',   'Third rank');

-- ==========================================
-- PLAYER / RESULT VOCABULARIES
-- ==========================================
INSERT INTO genders (id) VALUES ('M'), ('F');

INSERT INTO statuses (id) VALUES ('ACTIVE'), ('WITHDRAWN'), ('DISQUALIFIED');

-- Board results, byes, and team-match results (2-0 / 1-1 / 0-2).
INSERT INTO match_results (id) VALUES
    ('1-0'), ('0-1'), ('0.5-0.5'), ('1/2-1/2'),
    ('+--'), ('--+'), ('=-='), ('---'),
    ('1BYE'), ('0.5BYE'), ('0BYE'),
    ('2-0'), ('1-1'), ('0-2');

-- Age brackets, adult/general categories, team categories and veteran brackets.
-- Youth brackets are every age 5..21 in all three flavours (B = boys,
-- G = girls, U = open), not only the even ones: odd brackets (U9, U11, …) are
-- regular school-level categories.
INSERT INTO participant_types (id)
SELECT prefix || age::TEXT
  FROM generate_series(5, 21) AS age,
       (VALUES ('B'), ('G'), ('U')) AS p(prefix)
ON CONFLICT (id) DO NOTHING;

INSERT INTO participant_types (id) VALUES
    -- Adults and general categories
    ('Men'), ('Women'), ('Seniors'), ('Veterans'), ('All'),
    -- Team categories
    ('Team_Men'), ('Team_Women'), ('Team_Mixed'),
    -- Veteran brackets
    ('V50'), ('V60'), ('V65')
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- TOURNAMENT VOCABULARIES
-- ==========================================
-- System / pairing engine.
INSERT INTO tournament_types (id) VALUES
    ('Swiss'), ('Round-robin'), ('Olympic'), ('Team-match');

INSERT INTO tournament_levels (id) VALUES
    ('International'), ('National'), ('Regional'), ('Club'), ('Other');

-- Classic / Rapid / Blitz plus the non-rated option used by the search filter.
INSERT INTO rating_types (id) VALUES ('Classic'), ('Rapid'), ('Blitz'), ('None');

-- Tournament lifecycle. Referenced by tournaments.status (FK), so must exist
-- before any tournament rows are inserted.
INSERT INTO tournament_statuses (id) VALUES
    ('DRAFT'),         -- organizer is still setting it up
    ('REGISTRATION'),  -- taking player entries
    ('ONGOING'),       -- actively being played
    ('COMPLETED'),     -- finished and rated
    ('CANCELLED');

-- Ranking criteria (tie-breaks).
INSERT INTO tie_breaks (id) VALUES
    ('Points'), ('DirectEncounter'), ('WinCount'),
    ('Buchholz'), ('Berger'),
    ('BuchholzCut1'), ('BuchholzCut2'), ('MedianBuchholz'),
    ('CumulativeScore'); -- progressive score (sum of scores after each round)

-- Standard WTF time controls.
INSERT INTO time_controls (id, description) VALUES
    ('Classic_90',  '90 minutes per player'),
    ('Classic_60',  '60 minutes per player'),
    ('Rapid_20',    '20 minutes per player'),
    ('Rapid_15_10', '15 minutes + 10 seconds increment'),
    ('Blitz_7',     '7 minutes per player'),
    ('Blitz_5_3',   '5 minutes + 3 seconds increment');

-- ==========================================
-- TRANSLATIONS
-- ==========================================
-- Human-readable name for the non-rated option.
INSERT INTO rating_translations (rating_type_id, lang_code, name)
SELECT 'None', l.id,
       CASE l.id
           WHEN 'RUS' THEN 'Без рейтинга'
           WHEN 'KAZ' THEN 'Рейтингісіз'
           ELSE 'Non-rated'
       END
FROM languages l
ON CONFLICT (rating_type_id, lang_code) DO NOTHING;

-- Human-readable names for the tie-break criteria.
INSERT INTO tie_break_translations (tie_break_id, lang_code, name)
SELECT tb.id, l.id,
       CASE WHEN l.id = 'RUS' THEN
           CASE tb.id
               WHEN 'Points' THEN 'Очки'
               WHEN 'DirectEncounter' THEN 'Личная встреча'
               WHEN 'WinCount' THEN 'Количество побед'
               WHEN 'Buchholz' THEN 'Бухгольц'
               WHEN 'Berger' THEN 'Бергер'
               WHEN 'BuchholzCut1' THEN 'Бухгольц (без 1)'
               WHEN 'BuchholzCut2' THEN 'Бухгольц (без 2)'
               WHEN 'MedianBuchholz' THEN 'Средний Бухгольц'
               WHEN 'CumulativeScore' THEN 'Прогрессивный счёт'
               ELSE tb.id
           END
       ELSE
           CASE tb.id
               WHEN 'Points' THEN 'Points'
               WHEN 'DirectEncounter' THEN 'Direct encounter'
               WHEN 'WinCount' THEN 'Number of wins'
               WHEN 'Buchholz' THEN 'Buchholz'
               WHEN 'Berger' THEN 'Sonneborn-Berger'
               WHEN 'BuchholzCut1' THEN 'Buchholz Cut 1'
               WHEN 'BuchholzCut2' THEN 'Buchholz Cut 2'
               WHEN 'MedianBuchholz' THEN 'Median Buchholz'
               WHEN 'CumulativeScore' THEN 'Cumulative score'
               ELSE tb.id
           END
       END
FROM tie_breaks tb CROSS JOIN languages l
ON CONFLICT (tie_break_id, lang_code) DO NOTHING;

-- Tournament level names — without these the level filter renders empty.
INSERT INTO level_translations (level_id, lang_code, name) VALUES
    ('International', 'RUS', 'Международный'),
    ('International', 'KAZ', 'Халықаралық'),
    ('International', 'ENG', 'International'),
    ('International', 'SPA', 'Internacional'),
    ('International', 'TUR', 'Uluslararası'),
    ('International', 'KOR', '국제'),
    ('International', 'CZE', 'Mezinárodní'),
    ('National', 'RUS', 'Национальный'),
    ('National', 'KAZ', 'Ұлттық'),
    ('National', 'ENG', 'National'),
    ('National', 'SPA', 'Nacional'),
    ('National', 'TUR', 'Ulusal'),
    ('National', 'KOR', '전국'),
    ('National', 'CZE', 'Národní'),
    ('Regional', 'RUS', 'Региональный'),
    ('Regional', 'KAZ', 'Аймақтық'),
    ('Regional', 'ENG', 'Regional'),
    ('Regional', 'SPA', 'Regional'),
    ('Regional', 'TUR', 'Bölgesel'),
    ('Regional', 'KOR', '지역'),
    ('Regional', 'CZE', 'Regionální'),
    ('Club', 'RUS', 'Клубный'),
    ('Club', 'KAZ', 'Клубтық'),
    ('Club', 'ENG', 'Club'),
    ('Club', 'SPA', 'De club'),
    ('Club', 'TUR', 'Kulüp'),
    ('Club', 'KOR', '클럽'),
    ('Club', 'CZE', 'Klubový'),
    ('Other', 'RUS', 'Другой'),
    ('Other', 'KAZ', 'Басқа'),
    ('Other', 'ENG', 'Other'),
    ('Other', 'SPA', 'Otro'),
    ('Other', 'TUR', 'Diğer'),
    ('Other', 'KOR', '기타'),
    ('Other', 'CZE', 'Jiný')
ON CONFLICT (level_id, lang_code) DO NOTHING;

-- Rated categories ("None" is translated above).
INSERT INTO rating_translations (rating_type_id, lang_code, name) VALUES
    ('Classic', 'RUS', 'Классика'),
    ('Classic', 'KAZ', 'Классика'),
    ('Classic', 'ENG', 'Classic'),
    ('Classic', 'SPA', 'Clásico'),
    ('Classic', 'TUR', 'Klasik'),
    ('Classic', 'KOR', '클래식'),
    ('Classic', 'CZE', 'Klasik'),
    ('Rapid', 'RUS', 'Рапид'),
    ('Rapid', 'KAZ', 'Рапид'),
    ('Rapid', 'ENG', 'Rapid'),
    ('Rapid', 'SPA', 'Rápido'),
    ('Rapid', 'TUR', 'Hızlı'),
    ('Rapid', 'KOR', '래피드'),
    ('Rapid', 'CZE', 'Rapid'),
    ('Blitz', 'RUS', 'Блиц'),
    ('Blitz', 'KAZ', 'Блиц'),
    ('Blitz', 'ENG', 'Blitz'),
    ('Blitz', 'SPA', 'Blitz'),
    ('Blitz', 'TUR', 'Yıldırım'),
    ('Blitz', 'KOR', '블리츠'),
    ('Blitz', 'CZE', 'Blesk')
ON CONFLICT (rating_type_id, lang_code) DO NOTHING;

-- Pairing systems.
INSERT INTO type_translations (tournament_type_id, lang_code, name) VALUES
    ('Swiss', 'RUS', 'Швейцарская'),
    ('Swiss', 'KAZ', 'Швейцариялық'),
    ('Swiss', 'ENG', 'Swiss'),
    ('Swiss', 'SPA', 'Suizo'),
    ('Swiss', 'TUR', 'İsviçre'),
    ('Swiss', 'KOR', '스위스'),
    ('Swiss', 'CZE', 'Švýcarský'),
    ('Round-robin', 'RUS', 'Круговая'),
    ('Round-robin', 'KAZ', 'Айналмалы'),
    ('Round-robin', 'ENG', 'Round-robin'),
    ('Round-robin', 'SPA', 'Todos contra todos'),
    ('Round-robin', 'TUR', 'Lig usulü'),
    ('Round-robin', 'KOR', '라운드로빈'),
    ('Round-robin', 'CZE', 'Každý s každým'),
    ('Olympic', 'RUS', 'Олимпийская'),
    ('Olympic', 'KAZ', 'Олимпиялық'),
    ('Olympic', 'ENG', 'Olympic (knock-out)'),
    ('Olympic', 'SPA', 'Eliminatoria'),
    ('Olympic', 'TUR', 'Eleme'),
    ('Olympic', 'KOR', '토너먼트'),
    ('Olympic', 'CZE', 'Vyřazovací'),
    ('Team-match', 'RUS', 'Командный матч'),
    ('Team-match', 'KAZ', 'Командалық матч'),
    ('Team-match', 'ENG', 'Team match'),
    ('Team-match', 'SPA', 'Match por equipos'),
    ('Team-match', 'TUR', 'Takım maçı'),
    ('Team-match', 'KOR', '단체전'),
    ('Team-match', 'CZE', 'Týmový zápas')
ON CONFLICT (tournament_type_id, lang_code) DO NOTHING;
