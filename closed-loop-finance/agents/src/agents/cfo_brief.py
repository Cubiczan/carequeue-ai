"""Agent 4 — CFO Brief Agent.

Synthesizes Findings + prior Memory into:
  a) close memo Markdown (written to period folder)
  b) exactly 3 board messages
  c) proposed Notion decision rows
"""
from __future__ import annotations

import json
from datetime import date

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

from ..state.schema import CFOBrief, GraphState, ProposedDecision
from ..tools import file_writer
from ._llm import reasoning_llm

_SYSTEM = """You are the CFO Brief Agent.

You write three artifacts for the CFO:

1. A Markdown close-review memo. Sections (in order):
   - Headline (1 sentence)
   - What happened (3–5 bullets, each grounded in a file)
   - Why (likely causes; flag uncertainty)
   - Open questions
   - Recommended follow-ups
   - Decisions surfaced (each links to a proposed Notion row by index)

2. Exactly 3 board messages. Each:
   - headline (≤ 12 words)
   - what (1 line)
   - why (1 line)
   - action (1 line)

3. Proposed Notion decision rows. Each row:
   - decision        (short imperative)
   - decision_date   (today, ISO)
   - category        (Close | FP&A | Capital | Treasury | Tax | Compensation | Audit | M&A | Board | Other)
   - owner           (named individual, e.g. "Controller" or "CFO")
   - decision_made   (one paragraph: what + why + when to revisit)

Output JSON ONLY with keys: memo_md, three_messages, proposed_decisions.
No prose outside JSON."""


def cfo_brief_node(state: GraphState) -> dict:
    findings = state.get("findings", {})
    priors = state.get("prior_decisions", [])
    period = state["period"]
    repo_root = state["repo_root"]

    payload = {
        "period": period,
        "today": date.today().isoformat(),
        "findings": findings,
        "prior_decisions": priors,
    }
    llm = reasoning_llm(temperature=0.2)
    msg = llm.invoke([
        SystemMessage(content=_SYSTEM),
        HumanMessage(content=json.dumps(payload, default=str)),
    ])
    raw = msg.content if isinstance(msg.content, str) else str(msg.content)
    cleaned = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()

    try:
        data = json.loads(cleaned)
    except Exception as e:  # noqa: BLE001
        data = {
            "memo_md": f"# Close Memo — {period}\n\n_LLM output unparseable: {e}_\n",
            "three_messages": [],
            "proposed_decisions": [],
        }

    memo_path = file_writer.write_close_memo(repo_root, period, data.get("memo_md", ""))
    audit_body = _audit_body(state, memo_path, data)
    audit_path = file_writer.write_audit_note(
        repo_root,
        event=f"closed-loop run {period}",
        body_md=audit_body,
    )

    proposed: list[ProposedDecision] = []
    for d in data.get("proposed_decisions", []):
        proposed.append(ProposedDecision(
            decision=d.get("decision", "")[:200],
            decision_date=d.get("decision_date", date.today().isoformat()),
            category=d.get("category", "Other"),
            owner=d.get("owner", "CFO"),
            decision_made=d.get("decision_made", ""),
        ))

    brief = CFOBrief(
        memo_path=memo_path,
        audit_note_path=audit_path,
        three_messages=list(data.get("three_messages", []))[:3],
        proposed_decisions=proposed,
    )
    return {
        "cfo_brief": brief,
        "messages": [AIMessage(
            content=f"Wrote memo → {memo_path} and audit note → {audit_path}.",
            name="cfo_brief",
        )],
    }


def _audit_body(state: GraphState, memo_path: str, brief_data: dict) -> str:
    ev = state.get("evidence", {})
    files = ev.get("files", [])
    file_list = "\n".join(
        f"- `{f['path']}` ({f['kind']}, {f.get('rows','-')} rows, sha256={f['sha256'][:12]}…)"
        for f in files
    )
    return (
        f"# Audit Note — closed-loop run {state['period']}\n\n"
        f"- Run date: {date.today().isoformat()}\n"
        f"- Period: {state['period']}\n"
        f"- Folder: `{ev.get('folder')}`\n\n"
        f"## Inputs read\n{file_list}\n\n"
        f"## Agents invoked\n- evidence\n- analyst\n- memory (retrieve)\n- cfo_brief\n- memory (write — pending approval)\n\n"
        f"## Outputs written\n- Memo: `{memo_path}`\n\n"
        f"## Decisions proposed\n"
        + "\n".join(f"- {d.get('decision','?')}" for d in brief_data.get("proposed_decisions", []))
        + "\n"
    )
