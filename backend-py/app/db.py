import os

import psycopg
from psycopg.rows import dict_row


def get_dsn():
    return os.environ.get(
        "DATABASE_URL", "postgresql://localhost:5432/results_togyz"
    )


def connect():
    # autocommit off; callers commit. prepare_threshold=None keeps this safe
    # behind Supabase's transaction-mode pooler (no server-side prepares).
    return psycopg.connect(get_dsn(), row_factory=dict_row, prepare_threshold=None)
