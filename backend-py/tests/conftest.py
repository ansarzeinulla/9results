import os
import pathlib
import subprocess

import psycopg
import pytest

REPO_ROOT = pathlib.Path(__file__).resolve().parents[2]
DB_DIR = REPO_ROOT / "db"

TEST_DSN = os.environ.get(
    "TEST_DATABASE_URL", "postgresql://localhost:5432/results_togyz_test"
)
ADMIN_DSN = os.environ.get(
    "ADMIN_DATABASE_URL", "postgresql://localhost:5432/postgres"
)


def apply_sql_files(conn, paths):
    for path in paths:
        conn.execute(path.read_text())
    conn.commit()


@pytest.fixture(scope="session")
def migrated_db():
    """Drop and recreate the test database, apply all migrations + seeds."""
    dbname = psycopg.conninfo.conninfo_to_dict(TEST_DSN)["dbname"]
    with psycopg.connect(ADMIN_DSN, autocommit=True) as admin:
        admin.execute(f'DROP DATABASE IF EXISTS "{dbname}" WITH (FORCE)')
        admin.execute(f'CREATE DATABASE "{dbname}"')
    with psycopg.connect(TEST_DSN) as conn:
        migrations = sorted((DB_DIR / "migrations").glob("*.sql"))
        seeds = sorted((DB_DIR / "seeds").glob("*.sql"))
        apply_sql_files(conn, migrations + seeds)
    return TEST_DSN


@pytest.fixture()
def db(migrated_db):
    """A connection that rolls back everything after the test."""
    conn = psycopg.connect(migrated_db)
    yield conn
    conn.rollback()
    conn.close()
