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

-- 4. ҚОСЫМША КӨРСЕТКІШТЕР / ТАЙ-БРЕЙК (Tie Breaks)
INSERT INTO tie_breaks (id) VALUES 
    ('Points'), ('DirectEncounter'), ('WinCount'), ('Buchholz'), ('Berger'), ('BlitzPlayoff');

-- 5. ТУРНИР ДЕҢГЕЙІ (Tournament Levels)
INSERT INTO tournament_levels (id) VALUES ('International'), ('National'), ('Regional'), ('Club'), ('Other');

-- РЕЙТИНГ ТҮРЛЕРІ (Rating Types)
INSERT INTO rating_types (id) VALUES ('Classic'), ('Rapid'), ('Blitz');

-- 7. АККАУНТТАР / ACCOUNTS
-- Admin account (password: admin12345 — change in production!)
INSERT INTO users (username, password_hash, role_id)
VALUES ('admin', '$2b$12$7Thwno4xgoYwL73Rb1qnJOR3m38P3.T0.NmHYp/1d.i4cONmTqXqa', 'ADMIN');

-- Organizer account (password: admin12345 — change in production!)
INSERT INTO users (username, password_hash, role_id)
VALUES ('organizer', '$2b$12$7Thwno4xgoYwL73Rb1qnJOR3m38P3.T0.NmHYp/1d.i4cONmTqXqa', 'ORGANIZER');
