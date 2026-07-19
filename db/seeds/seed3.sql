-- seed3.sql — extended reference data.
-- (tournament_statuses is seeded in migration 004, because the FK on
--  tournaments.status depends on those rows already existing.)

-- ==========================================
-- 1. ҚОСЫМША ТАЙ-БРЕЙКТЕР / Additional tie-breaks
-- ==========================================
INSERT INTO tie_breaks (id) VALUES
    ('BuchholzCut1'),
    ('BuchholzCut2'),
    ('MedianBuchholz'),
    ('CumulativeScore'); -- progressive score (sum of scores after each round)

INSERT INTO tie_break_translations (tie_break_id, lang_code, name) VALUES
    ('BuchholzCut1', 'ENG', 'Buchholz Cut 1'),
    ('BuchholzCut1', 'RUS', 'Бухгольц без худшего результата'),
    ('BuchholzCut1', 'KAZ', 'Бухгольц (ең төменгі нәтижесіз)'),

    ('BuchholzCut2', 'ENG', 'Buchholz Cut 2'),
    ('BuchholzCut2', 'RUS', 'Бухгольц без двух худших результатов'),
    ('BuchholzCut2', 'KAZ', 'Бухгольц (екі төменгі нәтижесіз)'),

    ('MedianBuchholz', 'ENG', 'Median Buchholz'),
    ('MedianBuchholz', 'RUS', 'Медианный Бухгольц'),
    ('MedianBuchholz', 'KAZ', 'Медиандық Бухгольц'),

    ('CumulativeScore', 'ENG', 'Cumulative Score'),
    ('CumulativeScore', 'RUS', 'Нарастающий итог (Прогресс)'),
    ('CumulativeScore', 'KAZ', 'Үдемелі қорытынды (Прогресс)');

-- ==========================================
-- 2. КОМАНДАЛЫҚ ЖӘНЕ ВЕТЕРАН САНАТТАРЫ / Team and veteran categories
-- ==========================================
INSERT INTO participant_types (id) VALUES
    -- Team categories
    ('Team_Men'), ('Team_Women'), ('Team_Mixed'),
    -- Veteran brackets
    ('V50'), ('V60'), ('V65');

-- ==========================================
-- 3. КОМАНДАЛЫҚ НӘТИЖЕЛЕР / Team match results
-- Match points for team events, as opposed to board points.
-- ==========================================
INSERT INTO match_results (id) VALUES
    ('2-0'),  -- team win
    ('1-1'),  -- team draw
    ('0-2');  -- team loss

-- ==========================================
-- 4. УАҚЫТ БАҚЫЛАУЫ / Standard WTF time controls
-- ==========================================
INSERT INTO time_controls (id, description) VALUES
    ('Classic_90',  '90 minutes per player'),
    ('Classic_60',  '60 minutes per player'),
    ('Rapid_20',    '20 minutes per player'),
    ('Rapid_15_10', '15 minutes + 10 seconds increment'),
    ('Blitz_7',     '7 minutes per player'),
    ('Blitz_5_3',   '5 minutes + 3 seconds increment');
