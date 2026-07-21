-- seed4.sql — data added alongside migration 007 (search & profiles).
-- Lives in seeds because languages/tie_breaks are seeded after migrations
-- run on a fresh database.

-- Non-rated option for the rating-type filter.
INSERT INTO rating_types (id) VALUES ('None') ON CONFLICT (id) DO NOTHING;
INSERT INTO rating_translations (rating_type_id, lang_code, name)
SELECT 'None', l.id,
       CASE l.id
           WHEN 'RUS' THEN 'Без рейтинга'
           WHEN 'KAZ' THEN 'Рейтингісіз'
           ELSE 'Non-rated'
       END
FROM languages l
ON CONFLICT (rating_type_id, lang_code) DO NOTHING;


-- Human-readable names for the tie-break criteria (previously unseeded).
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
