"""Unit tests: db-proxy builds SQL via SQLAlchemy binds, not string concat."""

import os

os.environ.setdefault("COCKROACH_PASSWORD", "unused-for-unit-tests")

import pytest
from sqlalchemy.dialects import postgresql

from main import (
    _count_stmt,
    _insert_row_stmt,
    _select_all_stmt,
    _select_by_pk_stmt,
    _sql_ident,
)


def _compiled(stmt) -> str:
    return str(
        stmt.compile(
            dialect=postgresql.dialect(),
            compile_kwargs={"literal_binds": False},
        )
    )


@pytest.mark.parametrize(
    "bad",
    [
        'users"; DROP TABLE users; --',
        "x OR 1=1",
        "a b",
        "1table",
        "",
        "users-name",
    ],
)
def test_sql_ident_rejects_injection(bad):
    with pytest.raises(ValueError):
        _sql_ident(bad)


def test_sql_ident_accepts_plain_names():
    assert _sql_ident("triage_cases") == "triage_cases"
    assert _sql_ident("id") == "id"


def test_count_stmt_does_not_embed_payload():
    payload = "triage_cases"
    sql = _compiled(_count_stmt(payload))
    assert "count" in sql.lower()
    assert "triage_cases" in sql
    assert "'" not in sql or "DROP" not in sql


def test_select_by_pk_uses_bindparam():
    sql = _compiled(_select_by_pk_stmt("triage_cases", "id"))
    assert "pkval" in sql
    assert "injected" not in sql


def test_select_rejects_injected_table():
    with pytest.raises(ValueError):
        _select_all_stmt('cases"; DROP TABLE cases; --', limit=10)


def test_insert_binds_column_values():
    sql = _compiled(_insert_row_stmt("triage_cases", ["id", "name"]))
    assert "id" in sql and "name" in sql
    assert "triage_cases" in sql
    compiled_params = sql.lower()
    assert "%(id)s" in compiled_params or ":id" in compiled_params
    assert "%(name)s" in compiled_params or ":name" in compiled_params


def test_insert_rejects_injected_column():
    with pytest.raises(ValueError):
        _insert_row_stmt("triage_cases", ["id); DROP TABLE triage_cases; --"])
