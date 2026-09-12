"""Agent 3 — Memory Agent.

Two phases:
  - Pre-brief : retrieve prior decisions (Notion) and prior context (Vector
                Search) so the CFO Brief can ground its recommendations.
  - Post-brief: after human approval, write proposed decisions to Notion.

We expose two graph nodes — `memory_retrieve` and `memory_write` — and the
graph wires them on either side of the human approval gate.
"""
from __future__ import annotations

from langchain_core.messages import AIMessage

from ..state.schema import GraphState
from ..tools import notion_client, vector_store


def _topic_keywords(findings: dict) -> list[str]:
    blob = " ".join(findings.get("facts", []) + findings.get("follow_ups", []))
    # simple keyword extraction — replace with KeyBERT or Gemini if desired
    seeds = ["EBITDA", "inventory", "cash", "revenue", "margin", "AR", "accrual",
             "debt", "headcount", "forecast", "budget"]
    return [s for s in seeds if s.lower() in blob.lower()][:6]


def memory_retrieve_node(state: GraphState) -> dict:
    findings = state.get("findings", {})
    keywords = _topic_keywords(findings)

    # 1. Structured prior decisions
    try:
        priors = notion_client.query_prior(keywords=keywords, since_days=365, limit=5)
    except Exception as e:  # noqa: BLE001
        priors = []
        err = f"notion query failed: {e}"
    else:
        err = None

    # 2. Unstructured context via Vertex Vector Search
    rag_hits: list[dict] = []
    try:
        for fact in findings.get("facts", [])[:3]:
            rag_hits.extend(vector_store.retrieve(fact, k=3))
    except Exception as e:  # noqa: BLE001
        err = (err or "") + f" | rag failed: {e}"

    msg = (
        f"Memory retrieved {len(priors)} prior decisions and {len(rag_hits)} RAG hits."
        + (f" (warnings: {err})" if err else "")
    )
    return {
        "prior_decisions": priors,
        "messages": [AIMessage(content=msg, name="memory")],
    }


def memory_write_node(state: GraphState) -> dict:
    """Runs only after human approval. Writes the proposed decisions to Notion."""
    if not state.get("human_approved"):
        return {"messages": [AIMessage(content="Memory write skipped — not approved.", name="memory")]}

    brief = state.get("cfo_brief", {})
    written: list[str] = []
    errors: list[str] = list(state.get("errors", []))
    for d in brief.get("proposed_decisions", []):
        try:
            row_id = notion_client.write_decision(d)
            written.append(row_id)
        except Exception as e:  # noqa: BLE001
            errors.append(f"notion write failed for {d.get('decision','?')}: {e}")

    return {
        "notion_rows_written": written,
        "errors": errors,
        "messages": [AIMessage(content=f"Wrote {len(written)} decision rows to Notion.", name="memory")],
    }
