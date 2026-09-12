"""Helpers around the LangGraph checkpointer.

For local/dev: SqliteSaver (single-file). For prod: swap to PostgresSaver
backed by Cloud SQL or AlloyDB so multiple operators can share state.

Each finance period (e.g. "2026-03") gets its own `thread_id`. Re-running
the graph with the same `thread_id` resumes the period from the last
checkpoint (useful when the close gets re-opened or the human approval is
delayed).
"""
from __future__ import annotations


def thread_id_for(period: str) -> str:
    # Slugify minimal — periods like "2026-03 March Close" -> "close-2026-03"
    parts = period.split()
    if parts and parts[0].count("-") == 1:
        return f"close-{parts[0]}"
    return f"close-{period.replace(' ', '_')}"
