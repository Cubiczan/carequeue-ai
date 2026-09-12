"""Agent 1 — Evidence Agent.

Deterministic by design: it loads files and returns structured evidence.
We don't need an LLM here; using a deterministic loader keeps the audit
trail clean and the cost low. The node still emits a chat message so the
LangGraph trace shows what happened.
"""
from __future__ import annotations

from langchain_core.messages import AIMessage

from ..state.schema import GraphState
from ..tools.drive_loader import load_period


def evidence_node(state: GraphState) -> dict:
    period = state["period"]
    repo_root = state["repo_root"]
    evidence = load_period(repo_root=repo_root, period=period)
    summary = (
        f"Evidence loaded from `{evidence['folder']}`: "
        f"{len(evidence['files'])} files, "
        f"{sum(1 for f in evidence['files'] if not f.get('error'))} parsed cleanly."
    )
    return {
        "evidence": evidence,
        "messages": [AIMessage(content=summary, name="evidence")],
    }
