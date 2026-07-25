-- build/01_reference.sql
-- Lookup / reference tables and their translations.
--
-- These carry no dependencies on the core domain: they are the vocabularies
-- (languages, federations, statuses, tie-breaks, …) that everything else
-- points at via foreign keys. Integrity is enforced by FK + seeds, not by
-- CHECK IN (...) lists, so new values can be added by seeding a row.
--
-- Consolidated from legacy migrations 001, 004 (tie-breaks, time controls,
-- tournament statuses).

-- ==========================================
-- 0. LOCALIZATION
-- ==========================================
-- Every *_translations table references this, so it must exist first.
CREATE TABLE languages (
    id VARCHAR(3) PRIMARY KEY
);

-- ==========================================
-- 1. ORGANIZATION / PEOPLE VOCABULARIES
-- ==========================================
CREATE TABLE federations (
    id VARCHAR(4) PRIMARY KEY
);

CREATE TABLE user_roles (
    id VARCHAR(20) PRIMARY KEY
);

CREATE TABLE official_titles (
    id VARCHAR(10) PRIMARY KEY,
    description VARCHAR(50) NOT NULL
);

-- ==========================================
-- 2. PLACES (translated)
-- ==========================================
CREATE TABLE locations (
    id VARCHAR(50) PRIMARY KEY
);

CREATE TABLE location_translations (
    location_id VARCHAR(50) REFERENCES locations(id) ON DELETE CASCADE,
    lang_code VARCHAR(3) REFERENCES languages(id),
    name VARCHAR(100) NOT NULL,
    PRIMARY KEY (location_id, lang_code)
);

-- ==========================================
-- 3. TOURNAMENT VOCABULARIES (translated)
-- ==========================================
CREATE TABLE tournament_levels (
    id VARCHAR(50) PRIMARY KEY
);

CREATE TABLE level_translations (
    level_id VARCHAR(50) REFERENCES tournament_levels(id) ON DELETE CASCADE,
    lang_code VARCHAR(3) REFERENCES languages(id),
    name VARCHAR(100) NOT NULL,
    PRIMARY KEY (level_id, lang_code)
);

CREATE TABLE rating_types (
    id VARCHAR(50) PRIMARY KEY
);

CREATE TABLE rating_translations (
    rating_type_id VARCHAR(50) REFERENCES rating_types(id) ON DELETE CASCADE,
    lang_code VARCHAR(3) REFERENCES languages(id),
    name VARCHAR(50) NOT NULL,
    PRIMARY KEY (rating_type_id, lang_code)
);

-- The "System" of an event (Swiss / Round-robin / Olympic / Team-match).
CREATE TABLE tournament_types (
    id VARCHAR(50) PRIMARY KEY
);

CREATE TABLE type_translations (
    tournament_type_id VARCHAR(50) REFERENCES tournament_types(id) ON DELETE CASCADE,
    lang_code VARCHAR(3) REFERENCES languages(id),
    name VARCHAR(50) NOT NULL,
    PRIMARY KEY (tournament_type_id, lang_code)
);

-- Lifecycle of a tournament. Referenced by tournaments.status (FK).
CREATE TABLE tournament_statuses (
    id VARCHAR(20) PRIMARY KEY
);

-- Ordered ranking criteria (Buchholz, Berger, …).
CREATE TABLE tie_breaks (
    id VARCHAR(30) PRIMARY KEY
);

CREATE TABLE tie_break_translations (
    tie_break_id VARCHAR(30) REFERENCES tie_breaks(id) ON DELETE CASCADE,
    lang_code VARCHAR(3) REFERENCES languages(id),
    name VARCHAR(100) NOT NULL,
    PRIMARY KEY (tie_break_id, lang_code)
);

-- Standard WTF time controls.
CREATE TABLE time_controls (
    id VARCHAR(30) PRIMARY KEY,
    description VARCHAR(100) NOT NULL
);

-- ==========================================
-- 4. PLAYER / RESULT VOCABULARIES
-- ==========================================
CREATE TABLE participant_types (
    id VARCHAR(10) PRIMARY KEY
);

CREATE TABLE genders (
    id VARCHAR(1) PRIMARY KEY
);

-- Sport ranks / titles (MSIC, MS, …).
CREATE TABLE titles (
    id VARCHAR(10) PRIMARY KEY,
    description VARCHAR(100)
);

-- Board / match result codes ('1-0', '0.5BYE', team '2-0', …).
CREATE TABLE match_results (
    id VARCHAR(10) PRIMARY KEY
);

-- Participant status within a tournament (ACTIVE / WITHDRAWN / …).
CREATE TABLE statuses (
    id VARCHAR(20) PRIMARY KEY
);
