"""Typed shared state for the Closed Loop Finance graph.

Every node reads from and writes to this single object. LangGraph merges
partial updates returned by each node back into the graph state; the
checkpointer persists the full state per `thread_id` so a session can be
resumed later.
"""
from __future__ import annotations

from typing import Annotated, Any, Literal, Optional, TypedDict

from langgraph.graph.message import add_messages


class FileEvidence(TypedDict):
    path: str
    sha256: str
    kind: Literal["csv", "xlsx", "pdf", "md", "docx", "other"]
    rows: Optional[int]
    bytes: int
    error: Optional[str]


class Evidence(TypedDict):
    period: str
    folder: str
    files: list[FileEvidence]
    parsed: dict[str, Any]   # filename -> parsed payload (e.g., dict of dataframes)


class Findings(TypedDict):
    facts: list[str]
    likely_causes: list[str]
    open_questions: list[str]
    follow_ups: list[str]


class PriorDecision(TypedDict):
    notion_id: str
    decision: str
    decision_date: str
    category: str
    owner: str
    decision_made: str
    similarity: float


class ProposedDecision(TypedDict):
    decision: str
    decision_date: str
    category: str
    owner: str
    decision_made: str


class CFOBrief(TypedDict):
    memo_path: str          # absolute path written to Drive folder
    audit_note_path: str
    three_messages: list[dict]
    proposed_decisions: list[ProposedDecision]


class GraphState(TypedDict, total=False):
    """The shared state object that flows through the LangGraph."""

    # Inputs
    period: str
    repo_root: str

    # Per-node outputs
    evidence: Evidence
    findings: Findings
    prior_decisions: list[PriorDecision]
    cfo_brief: CFOBrief

    # Human gate
    human_approved: bool
    approver: str
    notion_rows_written: list[str]

    # Conversation trace (for observability)
    messages: Annotated[list, add_messages]

    # Errors collected during run
    errors: list[str]
