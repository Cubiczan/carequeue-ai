"""LangGraph StateGraph for the Closed Loop Finance crew.

Nodes:
    evidence       -> analyst -> memory_retrieve -> cfo_brief
                                                      |
                                                      v
                                         (human approval interrupt)
                                                      |
                                                      v
                                              memory_write -> END

Session state is persisted via a SqliteSaver checkpointer keyed by
`thread_id`. Re-running with the same `thread_id` resumes from the last
checkpoint — that gives us contextual continuity across months.
"""
from __future__ import annotations

import os
from pathlib import Path

from langgraph.checkpoint.sqlite import SqliteSaver
from langgraph.graph import END, START, StateGraph

from ..agents.analyst import analyst_node
from ..agents.cfo_brief import cfo_brief_node
from ..agents.evidence import evidence_node
from ..agents.memory import memory_retrieve_node, memory_write_node
from ..state.schema import GraphState


def build_graph():
    g = StateGraph(GraphState)

    g.add_node("evidence", evidence_node)
    g.add_node("analyst", analyst_node)
    g.add_node("memory_retrieve", memory_retrieve_node)
    g.add_node("cfo_brief", cfo_brief_node)
    g.add_node("memory_write", memory_write_node)

    g.add_edge(START, "evidence")
    g.add_edge("evidence", "analyst")
    g.add_edge("analyst", "memory_retrieve")
    g.add_edge("memory_retrieve", "cfo_brief")

    # Human-in-the-loop: pause after cfo_brief, resume into memory_write
    g.add_edge("cfo_brief", "memory_write")
    g.add_edge("memory_write", END)

    db_path = os.environ.get("CHECKPOINT_DB", "./checkpoints.sqlite")
    Path(db_path).parent.mkdir(parents=True, exist_ok=True)
    checkpointer = SqliteSaver.from_conn_string(db_path).__enter__()

    # interrupt_before triggers a pause; the host process inspects the
    # state, takes human input, sets `human_approved`, then resumes.
    return g.compile(
        checkpointer=checkpointer,
        interrupt_before=["memory_write"],
    )
