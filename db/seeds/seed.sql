-- seed.sql — reference data + demo data + admin account.

INSERT INTO languages (id) VALUES ('RUS'), ('ENG'), ('KAZ');

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
    ('B8'), ('G8'), ('B10'), ('G10'), ('B12'), ('G12'),
    ('U18'), ('Men'), ('Women'), ('Seniors'), ('All');

INSERT INTO locations (id) VALUES ('Online'), ('Astana'), ('Almaty');
INSERT INTO location_translations (location_id, lang_code, name) VALUES
    ('Online', 'RUS', 'Онлайн'), ('Online', 'ENG', 'Online'), ('Online', 'KAZ', 'Онлайн'),
    ('Astana', 'RUS', 'Астана'), ('Astana', 'ENG', 'Astana'), ('Astana', 'KAZ', 'Астана'),
    ('Almaty', 'RUS', 'Алматы'), ('Almaty', 'ENG', 'Almaty'), ('Almaty', 'KAZ', 'Алматы');

INSERT INTO tournament_levels (id) VALUES
    ('International'), ('National'), ('Regional'), ('Club'), ('Other');
INSERT INTO level_translations (level_id, lang_code, name) VALUES
    ('International', 'RUS', 'Международный'), ('International', 'ENG', 'International'), ('International', 'KAZ', 'Халықаралық'),
    ('National', 'RUS', 'Национальный'), ('National', 'ENG', 'National'), ('National', 'KAZ', 'Ұлттық'),
    ('Regional', 'RUS', 'Региональный'), ('Regional', 'ENG', 'Regional'), ('Regional', 'KAZ', 'Аймақтық'),
    ('Club', 'RUS', 'Клубный'), ('Club', 'ENG', 'Club'), ('Club', 'KAZ', 'Клубтық'),
    ('Other', 'RUS', 'Другое'), ('Other', 'ENG', 'Other'), ('Other', 'KAZ', 'Басқа');

INSERT INTO rating_types (id) VALUES ('Classic'), ('Rapid'), ('Blitz');
INSERT INTO rating_translations (rating_type_id, lang_code, name) VALUES
    ('Classic', 'RUS', 'Классика'), ('Classic', 'ENG', 'Classic'), ('Classic', 'KAZ', 'Классика'),
    ('Rapid', 'RUS', 'Рапид'), ('Rapid', 'ENG', 'Rapid'), ('Rapid', 'KAZ', 'Рапид'),
    ('Blitz', 'RUS', 'Блиц'), ('Blitz', 'ENG', 'Blitz'), ('Blitz', 'KAZ', 'Блиц');

INSERT INTO tournament_types (id) VALUES ('Swiss'), ('Round-robin'), ('Knockout'), ('Match');
INSERT INTO type_translations (tournament_type_id, lang_code, name) VALUES
    ('Swiss', 'RUS', 'Швейцарская'), ('Swiss', 'ENG', 'Swiss'), ('Swiss', 'KAZ', 'Швейцария жүйесі'),
    ('Round-robin', 'RUS', 'Круговая'), ('Round-robin', 'ENG', 'Round-robin'), ('Round-robin', 'KAZ', 'Айналмалы'),
    ('Knockout', 'RUS', 'Нокаут'), ('Knockout', 'ENG', 'Knockout'), ('Knockout', 'KAZ', 'Нокаут'),
    ('Match', 'RUS', 'Матч'), ('Match', 'ENG', 'Match'), ('Match', 'KAZ', 'Матч');

-- Admin account (password: admin12345 — change in production!)
INSERT INTO users (username, password_hash, role_id)
VALUES ('admin', '$2b$12$7Thwno4xgoYwL73Rb1qnJOR3m38P3.T0.NmHYp/1d.i4cONmTqXqa', 'ADMIN');
