-- seed.sql — reference data + demo data + admin & organizer accounts.

-- 1. ТІЛДЕРДІ ҚОСУ (Languages)
INSERT INTO languages (id) VALUES 
    ('RUS'), 
    ('ENG'), 
    ('KAZ'), 
    ('SPA'), -- Latin American Spanish
    ('TUR'), -- Turkish
    ('KOR'), -- Korean
    ('CZE'); -- Czech

-- 2. ФЕДЕРАЦИЯЛАР, РӨЛДЕР, ДӘРЕЖЕЛЕР МЕН СТАТУСТАР
INSERT INTO federations (id) VALUES ('KAZ'), ('WTF');

INSERT INTO user_roles (id) VALUES ('ADMIN'), ('ORGANIZER');

INSERT INTO official_titles (id, description) VALUES
    ('IA', 'International Arbiter'),
    ('FA', 'Federation Arbiter'),
    ('NA', 'National Arbiter'),
    ('None', 'No title');

-- Kazakhstan sport ranks for togyzkumalak
INSERT INTO titles (id, description) VALUES
    ('MSIC', 'Master of Sport of International Class'),
    ('MS', 'Master of Sport'),
    ('CMS', 'Candidate Master of Sport'),
    ('R1', 'First rank'),
    ('R2', 'Second rank'),
    ('R3', 'Third rank');

INSERT INTO genders (id) VALUES ('M'), ('F');

INSERT INTO statuses (id) VALUES ('ACTIVE'), ('WITHDRAWN'), ('DISQUALIFIED');

INSERT INTO match_results (id) VALUES
    ('1-0'), ('0-1'), ('0.5-0.5'), ('1/2-1/2'),
    ('+--'), ('--+'), ('=-='), ('---'),
    ('1BYE'), ('0.5BYE'), ('0BYE');

INSERT INTO participant_types (id) VALUES
    -- 6-20 жасқа дейінгілер
    ('B6'), ('G6'), ('U6'),
    ('B8'), ('G8'), ('U8'),
    ('B10'), ('G10'), ('U10'),
    ('B12'), ('G12'), ('U12'),
    ('B14'), ('G14'), ('U14'),
    ('B16'), ('G16'), ('U16'),
    ('B18'), ('G18'), ('U18'),
    ('B20'), ('G20'), ('U20'),
    -- Ересектер мен жалпы санаттар
    ('Men'), ('Women'), ('Seniors'), ('Veterans'), ('All');
    
-- 3. ТУРНИР ЖҮЙЕЛЕРІ (Tournament Types)
INSERT INTO tournament_types (id) VALUES 
    ('Swiss'), ('Round-robin'), ('Olympic'), ('Match');
    
INSERT INTO type_translations (tournament_type_id, lang_code, name) VALUES
    -- Swiss
    ('Swiss', 'ENG', 'Swiss System'), ('Swiss', 'RUS', 'Швейцарская система'), ('Swiss', 'KAZ', 'Швейцар жүйесі'),
    ('Swiss', 'SPA', 'Sistema Suizo'), ('Swiss', 'TUR', 'İsviçre Sistemi'), ('Swiss', 'KOR', '스위스 시스템'), ('Swiss', 'CZE', 'Švýcarský systém'),
    -- Round-robin
    ('Round-robin', 'ENG', 'Round-robin'), ('Round-robin', 'RUS', 'Круговая система'), ('Round-robin', 'KAZ', 'Айналма жүйесі'),
    ('Round-robin', 'SPA', 'Todos contra todos'), ('Round-robin', 'TUR', 'Döner Turnuva'), ('Round-robin', 'KOR', '라운드 로빈'), ('Round-robin', 'CZE', 'Každý s každým'),
    -- Olympic (formerly Knockout)
    ('Olympic', 'ENG', 'Olympic System'), ('Olympic', 'RUS', 'Олимпийская система'), ('Olympic', 'KAZ', 'Олимпиадалық жүйе'),
    ('Olympic', 'SPA', 'Sistema Olímpico'), ('Olympic', 'TUR', 'Olimpik Sistem'), ('Olympic', 'KOR', '올림픽 시스템'), ('Olympic', 'CZE', 'Olympijský systém'),
    -- Match
    ('Match', 'ENG', 'Match Tournament'), ('Match', 'RUS', 'Матч-турнир'), ('Match', 'KAZ', 'Матч-турнир'),
    ('Match', 'SPA', 'Torneo de Partidas'), ('Match', 'TUR', 'Maç Turnuvası'), ('Match', 'KOR', '매치 토너먼트'), ('Match', 'CZE', 'Zápasový turnaj');

-- 4. ҚОСЫМША КӨРСЕТКІШТЕР / ТАЙ-БРЕЙК (Tie Breaks)
INSERT INTO tie_breaks (id) VALUES 
    ('Points'), ('DirectEncounter'), ('WinCount'), ('Buchholz'), ('Berger'), ('BlitzPlayoff');
    
INSERT INTO tie_break_translations (tie_break_id, lang_code, name) VALUES
    -- Points
    ('Points', 'ENG', 'Points'), ('Points', 'RUS', 'Количество очков'), ('Points', 'KAZ', 'Жинаған ұпайлар саны'),
    ('Points', 'SPA', 'Puntos'), ('Points', 'TUR', 'Puan'), ('Points', 'KOR', '점수'), ('Points', 'CZE', 'Body'),
    -- DirectEncounter
    ('DirectEncounter', 'ENG', 'Direct Encounter'), ('DirectEncounter', 'RUS', 'Личная встреча'), ('DirectEncounter', 'KAZ', 'Жеке кездесу'),
    ('DirectEncounter', 'SPA', 'Encuentro directo'), ('DirectEncounter', 'TUR', 'Doğrudan Karşılaşma'), ('DirectEncounter', 'KOR', '직접 대결'), ('DirectEncounter', 'CZE', 'Vzájemný zápas'),
    -- WinCount
    ('WinCount', 'ENG', 'Number of wins'), ('WinCount', 'RUS', 'Количество побед'), ('WinCount', 'KAZ', 'Жеңістер саны'),
    ('WinCount', 'SPA', 'Número de victorias'), ('WinCount', 'TUR', 'Galibiyet Sayısı'), ('WinCount', 'KOR', '승리 횟수'), ('WinCount', 'CZE', 'Počet výher'),
    -- Buchholz
    ('Buchholz', 'ENG', 'Buchholz System'), ('Buchholz', 'RUS', 'Коэффициент Бухгольца'), ('Buchholz', 'KAZ', 'Бухгольц коэффициенті'),
    ('Buchholz', 'SPA', 'Sistema Buchholz'), ('Buchholz', 'TUR', 'Buchholz Sistemi'), ('Buchholz', 'KOR', '부흐홀츠 시스템'), ('Buchholz', 'CZE', 'Buchholzův systém'),
    -- Berger
    ('Berger', 'ENG', 'Berger Coefficient'), ('Berger', 'RUS', 'Коэффициент Бергера'), ('Berger', 'KAZ', 'Бергер коэффициенті'),
    ('Berger', 'SPA', 'Coeficiente Berger'), ('Berger', 'TUR', 'Berger Katsayısı'), ('Berger', 'KOR', '베르거 계수'), ('Berger', 'CZE', 'Bergerův koeficient'),
    -- BlitzPlayoff
    ('BlitzPlayoff', 'ENG', 'Additional Blitz Playoff'), ('BlitzPlayoff', 'RUS', 'Дополнительный блиц-матч'), ('BlitzPlayoff', 'KAZ', 'Қосымша блиц-ойын'),
    ('BlitzPlayoff', 'SPA', 'Desempate Blitz'), ('BlitzPlayoff', 'TUR', 'Ekstra Blitz Maçı'), ('BlitzPlayoff', 'KOR', '추가 블리츠 플레이오프'), ('BlitzPlayoff', 'CZE', 'Dodatečný bleskový zápas');

-- 5. ТУРНИР ДЕҢГЕЙІ (Tournament Levels)
INSERT INTO tournament_levels (id) VALUES ('International'), ('National'), ('Regional'), ('Club'), ('Other');

INSERT INTO level_translations (level_id, lang_code, name) VALUES
    ('International', 'ENG', 'International'), ('International', 'RUS', 'Международный'), ('International', 'KAZ', 'Халықаралық'),
    ('International', 'SPA', 'Internacional'), ('International', 'TUR', 'Uluslararası'), ('International', 'KOR', '국제'), ('International', 'CZE', 'Mezinárodní'),
    
    ('National', 'ENG', 'National'), ('National', 'RUS', 'Национальный'), ('National', 'KAZ', 'Ұлттық'),
    ('National', 'SPA', 'Nacional'), ('National', 'TUR', 'Ulusal'), ('National', 'KOR', '국가'), ('National', 'CZE', 'Národní'),
    
    ('Regional', 'ENG', 'Regional'), ('Regional', 'RUS', 'Региональный'), ('Regional', 'KAZ', 'Аймақтық'),
    ('Regional', 'SPA', 'Regional'), ('Regional', 'TUR', 'Bölgesel'), ('Regional', 'KOR', '지역'), ('Regional', 'CZE', 'Regionální'),
    
    ('Club', 'ENG', 'Club'), ('Club', 'RUS', 'Клубный'), ('Club', 'KAZ', 'Клубтық'),
    ('Club', 'SPA', 'De Club'), ('Club', 'TUR', 'Kulüp'), ('Club', 'KOR', '클럽'), ('Club', 'CZE', 'Klubový'),
    
    ('Other', 'ENG', 'Other'), ('Other', 'RUS', 'Другое'), ('Other', 'KAZ', 'Басқа'),
    ('Other', 'SPA', 'Otro'), ('Other', 'TUR', 'Diğer'), ('Other', 'KOR', '기타'), ('Other', 'CZE', 'Jiné');

-- РЕЙТИНГ ТҮРЛЕРІ (Rating Types)
INSERT INTO rating_types (id) VALUES ('Classic'), ('Rapid'), ('Blitz');

INSERT INTO rating_translations (rating_type_id, lang_code, name) VALUES
    ('Classic', 'ENG', 'Classic'), ('Classic', 'RUS', 'Классика'), ('Classic', 'KAZ', 'Классика'),
    ('Classic', 'SPA', 'Clásico'), ('Classic', 'TUR', 'Klasik'), ('Classic', 'KOR', '클래식'), ('Classic', 'CZE', 'Klasické'),
    
    ('Rapid', 'ENG', 'Rapid'), ('Rapid', 'RUS', 'Рапид'), ('Rapid', 'KAZ', 'Рапид'),
    ('Rapid', 'SPA', 'Rápido'), ('Rapid', 'TUR', 'Hızlı'), ('Rapid', 'KOR', '래피드'), ('Rapid', 'CZE', 'Rapid'),
    
    ('Blitz', 'ENG', 'Blitz'), ('Blitz', 'RUS', 'Блиц'), ('Blitz', 'KAZ', 'Блиц'),
    ('Blitz', 'SPA', 'Blitz'), ('Blitz', 'TUR', 'Yıldırım (Blitz)'), ('Blitz', 'KOR', '블리츠'), ('Blitz', 'CZE', 'Bleskové (Blitz)');

-- 7. АККАУНТТАР / ACCOUNTS
-- Admin account (password: admin12345 — change in production!)
INSERT INTO users (username, password_hash, role_id)
VALUES ('admin', '$2b$12$7Thwno4xgoYwL73Rb1qnJOR3m38P3.T0.NmHYp/1d.i4cONmTqXqa', 'ADMIN');

-- Organizer account (password: admin12345 — change in production!)
INSERT INTO users (username, password_hash, role_id)
VALUES ('organizer', '$2b$12$7Thwno4xgoYwL73Rb1qnJOR3m38P3.T0.NmHYp/1d.i4cONmTqXqa', 'ORGANIZER');