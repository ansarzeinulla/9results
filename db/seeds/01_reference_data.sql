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
INSERT INTO participant_types (id) VALUES
    -- Youth (to age 20)
    ('B6'), ('G6'), ('U6'),
    ('B8'), ('G8'), ('U8'),
    ('B10'), ('G10'), ('U10'),
    ('B12'), ('G12'), ('U12'),
    ('B14'), ('G14'), ('U14'),
    ('B16'), ('G16'), ('U16'),
    ('B18'), ('G18'), ('U18'),
    ('B20'), ('G20'), ('U20'),
    -- Adults and general categories
    ('Men'), ('Women'), ('Seniors'), ('Veterans'), ('All'),
    -- Team categories
    ('Team_Men'), ('Team_Women'), ('Team_Mixed'),
    -- Veteran brackets
    ('V50'), ('V60'), ('V65');

-- ==========================================
-- TOURNAMENT VOCABULARIES
-- ==========================================
-- System / pairing engine.
INSERT INTO tournament_types (id) VALUES
    ('Swiss'), ('Round-robin'), ('Olympic'), ('Match');

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
    ('Buchholz'), ('Berger'), ('BlitzPlayoff'),
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
               WHEN 'BlitzPlayoff' THEN 'Блиц тай-брейк'
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
               WHEN 'BlitzPlayoff' THEN 'Blitz playoff'
               WHEN 'BuchholzCut1' THEN 'Buchholz Cut 1'
               WHEN 'BuchholzCut2' THEN 'Buchholz Cut 2'
               WHEN 'MedianBuchholz' THEN 'Median Buchholz'
               WHEN 'CumulativeScore' THEN 'Cumulative score'
               ELSE tb.id
           END
       END
FROM tie_breaks tb CROSS JOIN languages l
ON CONFLICT (tie_break_id, lang_code) DO NOTHING;
