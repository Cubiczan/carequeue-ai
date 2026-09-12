"""Notion Decision Log client.

Two ops:
- `query_prior(topic_keywords, since_days)` → list of similar prior decisions
- `write_decision(decision)`               → row created in DB

The DB schema (from notion-setup.md):
  Decision (title), Decision Date (date), Category (select),
  Owner (rich_text), Decision Made (rich_text)
"""
from __future__ import annotations

import os
from datetime import datetime, timedelta
from typing import Any

from notion_client import Client

from ..state.schema import PriorDecision, ProposedDecision


def _client() -> Client:
    token = os.environ.get("NOTION_TOKEN")
    if not token:
        raise RuntimeError("NOTION_TOKEN not set")
    return Client(auth=token)


def _db_id() -> str:
    db = os.environ.get("NOTION_DECISION_DB_ID")
    if not db:
        raise RuntimeError("NOTION_DECISION_DB_ID not set")
    return db


def query_prior(keywords: list[str], since_days: int = 365, limit: int = 5) -> list[PriorDecision]:
    """Naive keyword filter on Decision title; richer ranking is done by the
    Memory Agent over Vertex Vector Search."""
    n = _client()
    since = (datetime.utcnow() - timedelta(days=since_days)).date().isoformat()

    or_filters = [
        {"property": "Decision", "title": {"contains": kw}} for kw in keywords if kw
    ] or [{"property": "Decision", "title": {"is_not_empty": True}}]

    resp = n.databases.query(
        database_id=_db_id(),
        filter={
            "and": [
                {"property": "Decision Date", "date": {"on_or_after": since}},
                {"or": or_filters},
            ]
        },
        page_size=limit,
    )
    out: list[PriorDecision] = []
    for r in resp.get("results", []):
        props = r.get("properties", {})
        out.append(PriorDecision(
            notion_id=r["id"],
            decision=_title(props.get("Decision")),
            decision_date=_date(props.get("Decision Date")),
            category=_select(props.get("Category")),
            owner=_text(props.get("Owner")),
            decision_made=_text(props.get("Decision Made")),
            similarity=0.0,
        ))
    return out


def write_decision(d: ProposedDecision) -> str:
    n = _client()
    page = n.pages.create(
        parent={"database_id": _db_id()},
        properties={
            "Decision": {"title": [{"text": {"content": d["decision"][:200]}}]},
            "Decision Date": {"date": {"start": d["decision_date"]}},
            "Category": {"select": {"name": d["category"]}},
            "Owner": {"rich_text": [{"text": {"content": d["owner"]}}]},
            "Decision Made": {"rich_text": [{"text": {"content": d["decision_made"][:1900]}}]},
        },
    )
    return page["id"]


# ───── helpers ────────────────────────────────────────────────────────
def _title(prop: Any) -> str:
    if not prop:
        return ""
    arr = prop.get("title", []) or []
    return "".join(t.get("plain_text", "") for t in arr)


def _text(prop: Any) -> str:
    if not prop:
        return ""
    arr = prop.get("rich_text", []) or []
    return "".join(t.get("plain_text", "") for t in arr)


def _select(prop: Any) -> str:
    if not prop:
        return ""
    s = prop.get("select")
    return s.get("name", "") if s else ""


def _date(prop: Any) -> str:
    if not prop:
        return ""
    d = prop.get("date")
    return d.get("start", "") if d else ""
