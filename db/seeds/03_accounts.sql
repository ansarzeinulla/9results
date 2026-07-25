-- seeds/03_accounts.sql
-- Bootstrap login accounts. Load last (depends on user_roles from
-- 01_reference_data.sql).
--
-- Both passwords are 'admin12345' — CHANGE IN PRODUCTION.
-- Consolidated from legacy seed.sql (accounts portion).

INSERT INTO users (username, password_hash, role_id)
VALUES ('admin', '$2b$12$7Thwno4xgoYwL73Rb1qnJOR3m38P3.T0.NmHYp/1d.i4cONmTqXqa', 'ADMIN');

INSERT INTO users (username, password_hash, role_id)
VALUES ('organizer', '$2b$12$7Thwno4xgoYwL73Rb1qnJOR3m38P3.T0.NmHYp/1d.i4cONmTqXqa', 'ORGANIZER');
