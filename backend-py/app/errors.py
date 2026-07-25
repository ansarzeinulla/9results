"""Structured, translatable error payloads for the frontend.

Two kinds of failure travel to the browser, deliberately treated differently:

* **Business errors** (a closed round, a taken username, an unpairable field)
  carry a stable ``code`` plus an English ``message`` fallback. The frontend
  looks ``code`` up in ``messages/<lang>.json`` and shows the message *in the
  user's language*. ``params`` fills the ``{placeholders}`` in that text.

* **Database errors** are the exception the user explicitly asked for: they
  keep ``code = "db_error"`` and a *detailed English diagnostic* — the failing
  operation, the arguments it received, the SQLSTATE and Postgres error class,
  the primary message, DETAIL/HINT, and the constraint/column/table involved.
  The frontend shows this English text verbatim (it is not translated), so a
  developer sees exactly what the database rejected and why.

Every deliberate failure therefore sends ``detail`` as an object::

    {"code": "ROUND_CLOSED", "params": {}, "message": "Round is closed"}

FastAPI still emits pydantic's ``[{loc, msg}]`` list for request-schema
mismatches; the frontend keeps formatting those field-by-field.
"""
from __future__ import annotations

from contextlib import contextmanager

import psycopg
from fastapi import HTTPException


class AppError(HTTPException):
    """An HTTPException whose ``detail`` is a ``{code, params, message}`` object.

    ``code`` is a stable identifier the frontend translates; ``message`` is the
    English fallback shown when no translation exists (and always, for
    ``db_error``).
    """

    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        params: dict | None = None,
    ) -> None:
        self.code = code
        self.params = params or {}
        super().__init__(
            status_code=status_code,
            detail={"code": code, "params": self.params, "message": message},
        )


# --- database diagnostics ------------------------------------------------

def _status_for(sqlstate: str | None) -> int:
    """Best HTTP status for an otherwise-unhandled Postgres error."""
    if not sqlstate:
        return 500
    if sqlstate == "23505":  # unique_violation
        return 409
    cls = sqlstate[:2]
    if cls in ("23", "22"):  # integrity constraint / data exception
        return 422
    if sqlstate == "P0001":  # raise_exception (a hand-written RAISE)
        return 422
    return 500


def db_error(
    e: psycopg.Error, *, operation: str, params: object = None
) -> AppError:
    """Turn a raw psycopg error into a fully-diagnostic English ``AppError``.

    ``operation`` names the SQL/procedure that failed (e.g.
    ``"CALL org_add_round"``). ``params`` are the arguments that were sent, so
    the message states *what was received* next to *what went wrong*.
    """
    diag = getattr(e, "diag", None)
    sqlstate = getattr(diag, "sqlstate", None) or getattr(e, "sqlstate", None)

    primary = (getattr(diag, "message_primary", None) or str(e) or "").strip()
    message = f"Database error while executing {operation}"
    if params is not None:
        message += f" with arguments {params!r}"
    message += f": {primary or type(e).__name__}"

    extras: list[str] = []
    if sqlstate:
        try:
            name = psycopg.errors.lookup(sqlstate).__name__
        except Exception:
            name = "unknown"
        extras.append(f"SQLSTATE {sqlstate} ({name})")
    for label, attr in (
        ("constraint", "constraint_name"),
        ("column", "column_name"),
        ("table", "table_name"),
        ("datatype", "datatype_name"),
    ):
        val = getattr(diag, attr, None)
        if val:
            extras.append(f"{label} {val}")
    for label, attr in (("detail", "message_detail"), ("hint", "message_hint")):
        val = getattr(diag, attr, None)
        if val:
            extras.append(f"{label}: {val.strip()}")
    if extras:
        message += " (" + "; ".join(extras) + ")"

    return AppError(_status_for(sqlstate), "db_error", message)


@contextmanager
def db_guard(operation: str, *, conn=None, params: object = None):
    """Wrap a database call so any unhandled psycopg error reaches the frontend
    as a full English diagnostic instead of a bare HTTP 500.

    ``AppError`` (a deliberate business failure) and ``HTTPException`` pass
    through untouched; only raw driver errors are converted. When a ``conn`` is
    given it is rolled back first, so the transaction is left usable.
    """
    try:
        yield
    except (AppError, HTTPException):
        raise
    except psycopg.Error as e:
        if conn is not None:
            try:
                conn.rollback()
            except Exception:
                pass
        raise db_error(e, operation=operation, params=params)
