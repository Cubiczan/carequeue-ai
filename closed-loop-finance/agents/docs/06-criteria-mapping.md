# 06 — Criteria Mapping (for reviewer / scorer)

Use this table when defending the build against the brief.

| Criterion | Met? | Where (file → component) |
|---|---|---|
| Minimum 3 collaborating agents (4 preferred) | ✅ 4 | `src/agents/{evidence,analyst,memory,cfo_brief}.py` |
| Built on Azure AI Foundry **or** GCP Vertex AI | ✅ Vertex (Azure adapter included) | `src/agents/_llm.py` (`ChatVertexAI`); `docs/03-deploy-azure.md` |
| Use an orchestration framework (LangGraph / Semantic Kernel / equivalent) | ✅ LangGraph | `src/orchestrator/graph.py` (`StateGraph`, `interrupt_before`) |
| Implement session state management for contextual continuity | ✅ | `SqliteSaver` checkpointer keyed by `thread_id`; resume across runs (`src/memory/checkpointer.py`) |
| Include persistent context / memory storage (RAG or similar) | ✅ Two-layer | Vertex AI Vector Search (`src/tools/vector_store.py`) + Notion Decision Log (`src/tools/notion_client.py`) |
| Demonstrate end-to-end agentic workflow | ✅ | `src/run.py` → evidence → analyst → memory_retrieve → cfo_brief → human gate → memory_write → audit note |
| Stateful, orchestrated, not just standalone interactions | ✅ | All nodes share `GraphState`; checkpointer persists between calls; HITL interrupt; outputs feed back into memory for the next cycle |

## Talking points

- **Each agent has clear, non-overlapping responsibility** (Evidence loads, Analyst reasons, Memory remembers, CFO Brief synthesizes). This is enforced in code: only Memory writes to Notion, only Evidence reads files, etc.
- **The "closed loop" is structural, not just narrative.** The Memory Agent on cycle N+1 retrieves what the Memory Agent wrote on cycle N. This is the feedback signal the brief is built on.
- **Determinism where it counts.** File loading and numerical summaries are pure-Python; the LLM only reasons over already-grounded numbers. This minimizes hallucination risk in finance outputs.
- **Human-in-the-loop is non-optional.** No external write happens without `state.human_approved == True`.
