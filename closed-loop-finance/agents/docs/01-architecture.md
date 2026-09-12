# 01 — Architecture

## Goal

Showcase a **stateful, orchestrated multi-agent system** that automates the closed-loop finance review:

- ingests month-end evidence from Drive,
- runs deterministic + LLM-backed analysis,
- consults persistent memory (Notion + RAG),
- produces a CFO-ready brief,
- gates writes behind a human approver,
- and seals the run with an immutable audit note — all in one orchestrated graph.

## System diagram

```
┌────────────────────────────────────────────────────────────────────────────┐
│                          LangGraph StateGraph                              │
│                                                                            │
│   START ─► evidence ─► analyst ─► memory_retrieve ─► cfo_brief             │
│                                                              │             │
│                                                  interrupt_before          │
│                                                              │             │
│                                            human approval (CLI / UI)       │
│                                                              │             │
│                                                              ▼             │
│                                                       memory_write ─► END  │
│                                                                            │
│   ── shared GraphState (TypedDict) ── persisted via Sqlite/Postgres saver ─│
└────────────────────────────────────────────────────────────────────────────┘

        Vertex AI                                        Notion
   ┌────────────────┐                              ┌────────────────┐
   │ Gemini 2.5 Pro │  ◄─ Analyst, CFO Brief ─►    │  Decision Log  │
   │ Gemini 2.5 Flash│ ◄─ Evidence summary  ─►     │  (DB)          │
   │ text-embedding │  ◄── chunks / queries ─►     └────────────────┘
   │      -005      │                                       ▲
   │ Vector Search  │  ◄── prior context ───────────────────┘
   └────────────────┘
```

## Component table

| Component | Choice | Why |
|---|---|---|
| Cloud platform | **GCP Vertex AI** | Native Gemini access, Vector Search w/ deterministic recall, Cloud SQL for state |
| Reasoning model | `gemini-2.5-pro` | Long-context for whole close packs, strong reasoning |
| Fast model | `gemini-2.5-flash` | Cheap deterministic tasks (evidence summary, classification) |
| Embeddings | `text-embedding-005` | Vertex-native, low latency |
| Vector store | **Vertex AI Vector Search** | Same trust boundary as the LLM; sub-100ms retrieval |
| Orchestrator | **LangGraph** | First-class state, checkpointing, interrupts, observability |
| State persistence | `SqliteSaver` (dev) → `PostgresSaver` on Cloud SQL (prod) | Resume runs across days/operators |
| Structured memory | **Notion** Decision Log DB | Human-legible, filterable, audit-friendly |
| File parsing | Pandas, openpyxl, pypdf | Deterministic numerical inputs to the Analyst |

## Agents (responsibilities + boundaries)

### 1. Evidence Agent
- **Responsibility:** Load every file under the period folder, parse, hash, return typed `Evidence`.
- **Bounds:** No analysis. No LLM call required (pure-function node).
- **Output:** `state.evidence` populated.

### 2. Analyst Agent
- **Responsibility:** Variance / cut-off / cash / inventory analysis. Produces `Findings` separating facts vs. assumptions.
- **Bounds:** Cannot invent numbers. Cannot write outputs. JSON-only LLM output, schema-checked.
- **Output:** `state.findings` populated.

### 3. Memory Agent (two phases)
- **Pre-brief:** Query Notion (structured) + Vector Search (unstructured) for prior context.
- **Post-brief:** After human approval, write proposed decisions to Notion.
- **Bounds:** Never writes without `state.human_approved == True`.
- **Output:** `state.prior_decisions`, `state.notion_rows_written`.

### 4. CFO Brief Agent
- **Responsibility:** Synthesize close memo + 3 board messages + proposed Notion rows. Writes memo and audit note to Drive folder.
- **Bounds:** Cannot write to Notion (that's the Memory Agent's job, post-approval).
- **Output:** `state.cfo_brief` populated; files written under `03 Monthly Close/<period>/` and `07 Audit Trail/`.

## State schema (shared across all nodes)

```python
class GraphState(TypedDict, total=False):
    period: str
    repo_root: str
    evidence: Evidence
    findings: Findings
    prior_decisions: list[PriorDecision]
    cfo_brief: CFOBrief
    human_approved: bool
    approver: str
    notion_rows_written: list[str]
    messages: Annotated[list, add_messages]
    errors: list[str]
```

Every node returns a partial-state dict; LangGraph merges and persists. `messages` is the conversation trace — you can replay any past run by loading the checkpoint and inspecting messages.

## Session continuity (the "stateful" requirement)

`thread_id` = `close-<YYYY-MM>` (one per finance period). The SqliteSaver checkpoints state after every node. Concretely:

- A close run that pauses at the human gate **on Monday** can be resumed **on Wednesday** by re-invoking the graph with the same `thread_id`. State picks up exactly where it left off.
- A re-opened close (correction posted) re-uses the thread; the new run streams alongside prior checkpoints, giving the CFO a full timeline.
- Cross-period continuity is achieved through the **Memory Agent** retrieving prior periods' decisions from Notion + Vector Search.

## Persistent context / RAG

- **Indexed corpus:** every `.md`, `.txt`, `.csv` under the repo (excluding `agents/`).
- **Chunking:** 4,000-char windows (token-aware splitter is a swap).
- **Embeddings:** `text-embedding-005`.
- **Index:** Vertex AI Vector Search, deployed to a public/private endpoint.
- **Retrieval:** top-k by cosine, restricted by metadata namespace `path`.
- **Combined with Notion:** The Memory Agent fuses (a) keyword search of the Decision Log and (b) vector recall of the broader corpus.

## Trust & auditability

- Evidence Agent records SHA-256 for every file read.
- CFO Brief Agent writes an immutable note to `07 Audit Trail/` listing inputs, agents, outputs, and proposed decisions.
- Memory Agent writes only after explicit human approval — never as a side effect.
- The Notion DB is append-only by convention; corrections are new rows referencing the prior `notion_id`.
