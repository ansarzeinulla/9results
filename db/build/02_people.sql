-- build/02_people.sql
-- People and organizations: arbiters/directors (officials), login accounts
-- (users) and organizing bodies (organizations).
--
-- Consolidated from legacy migration 001.

CREATE TABLE officials (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    middle_name VARCHAR(50),
    last_name VARCHAR(50) NOT NULL,
    title VARCHAR(10) REFERENCES official_titles(id)
);

CREATE TABLE users (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role_id VARCHAR(20) REFERENCES user_roles(id),
    official_id INT REFERENCES officials(id), -- NULL for the main admin
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE organizations (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    federation_id VARCHAR(4) REFERENCES federations(id)
);
