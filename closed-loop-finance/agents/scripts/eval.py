"""Lightweight eval: run the graph on a fixture period and assert outputs."""
from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

from src.memory.checkpointer import thread_id_for
from src.orchestrator.graph import build_graph


def main() -> None:
    load_dotenv()
    period = "2026-03 March Close"
    repo_root = str(Path(os.environ.get("REPO_ROOT", "..")).resolve())
    graph = build_graph()
    config = {"configurable": {"thread_id": thread_id_for(period) + "-eval"}}
    final = None
    for s in graph.stream({"period": period, "repo_root": repo_root}, config=config, stream_mode="values"):
        final = s
    assert final is not None
    assert "evidence" in final, "evidence missing"
    assert "findings" in final, "findings missing"
    assert "cfo_brief" in final, "cfo_brief missing"
    print("OK")


if __name__ == "__main__":
    main()
