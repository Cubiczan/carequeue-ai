"""Agent 2 — Analyst Agent.

Deterministic Pandas summaries are passed to Gemini, which produces a typed
Findings object (facts / likely_causes / open_questions / follow_ups).
"""
from __future__ import annotations

import json

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

from ..state.schema import Findings, GraphState
from ..tools import pandas_tool
from ._llm import reasoning_llm

_SYSTEM = """You are the Analyst Agent in a Closed Loop Finance crew.

You are given:
  - Pandas-computed summaries (variance, AR aging, cash, inventory)
  - File-level evidence metadata

Return a JSON object with EXACTLY these keys:
  facts          : list[str]   # each item must reference a file
  likely_causes  : list[str]
  open_questions : list[str]
  follow_ups     : list[str]   # action items with implicit owner

Rules:
- Never invent numbers. If a number is not in the summaries, do not state it.
- If evidence is incomplete, list it under open_questions.
- Use concise CFO language.
- Output JSON only. No prose."""


def _summaries_from_evidence(evidence: dict) -> dict:
    parsed = evidence.get("parsed", {})
    pl = parsed.get("pl-actual-vs-budget.csv") or []
    ar = parsed.get("ar-aging-detail.csv") or []
    bank = parsed.get("bank-activity-export.csv") or []
    inv = parsed.get("inventory-valuation.csv") or []
    return {
        "variance": pandas_tool.variance_summary(pl),
        "ar_aging": pandas_tool.ar_aging_buckets(ar),
        "cash": pandas_tool.cash_movement(bank),
        "inventory_total": pandas_tool.inventory_total(inv),
        "files": [
            {"path": f["path"], "kind": f["kind"], "rows": f.get("rows"), "error": f.get("error")}
            for f in evidence.get("files", [])
        ],
    }


def analyst_node(state: GraphState) -> dict:
    evidence = state["evidence"]
    summaries = _summaries_from_evidence(evidence)

    llm = reasoning_llm(temperature=0.1)
    msg = llm.invoke([
        SystemMessage(content=_SYSTEM),
        HumanMessage(content=json.dumps(summaries, default=str)),
    ])

    raw = msg.content if isinstance(msg.content, str) else str(msg.content)
    try:
        # Strip ```json fences if Gemini adds them
        cleaned = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        data = json.loads(cleaned)
        findings = Findings(
            facts=list(data.get("facts", [])),
            likely_causes=list(data.get("likely_causes", [])),
            open_questions=list(data.get("open_questions", [])),
            follow_ups=list(data.get("follow_ups", [])),
        )
    except Exception as e:  # noqa: BLE001
        findings = Findings(
            facts=[],
            likely_causes=[],
            open_questions=[f"Analyst output unparseable: {e}"],
            follow_ups=["Re-run analyst node with stricter JSON prompt"],
        )

    return {
        "findings": findings,
        "messages": [AIMessage(content="Analyst produced findings.", name="analyst")],
    }
