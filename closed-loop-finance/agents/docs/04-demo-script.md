# 04 — Demo Script (15 min)

Use this when presenting the build live. Pre-stage points marked with ⚙️ before the demo.

## Pre-stage (do once, before the demo)

⚙️ 1. `.env` populated, `gcloud` auth done, Notion token + DB ID set.
⚙️ 2. `python scripts/index_corpus.py --root ..` (Vector Search populated).
⚙️ 3. Drop the `2026-03 March Close` files into the period folder.
⚙️ 4. Open three windows side by side:
    - Terminal (running the CLI)
    - Browser tab → Notion Decision Log DB
    - File explorer → `03 Monthly Close/2026-03 March Close/` and `07 Audit Trail/`
⚙️ 5. Open `langgraph dev` in a fourth tab — the visual graph is your hero shot.

## 0–2 min — the problem

> "Most CFOs run an open loop. A decision is made, executed, and never measured.
> Here's what a closed loop looks like, with four agents instead of four humans."

Show the architecture diagram in `01-architecture.md`.

## 2–4 min — the criteria, mapped

Walk the criteria table in `agents/README.md` aloud — each row points at a file:

- 4 agents → `src/agents/`
- Vertex AI → `_llm.py`
- LangGraph → `orchestrator/graph.py`
- Session state → `memory/checkpointer.py`
- RAG → `tools/vector_store.py`
- End-to-end → the run we're about to do

## 4–7 min — kick off the run

In the terminal:

```bash
python -m src.run --period "2026-03 March Close"
```

Narrate as nodes stream:

- `evidence`: "Reads 9 files, hashes each, attaches parsed payloads. No LLM call yet — deterministic."
- `analyst`: "Pandas summarizes; Gemini 2.5 Pro reasons; output is schema-checked JSON."
- `memory_retrieve`: "Notion query for prior decisions in last 12 months + Vector Search for similar prior context."
- `cfo_brief`: "Synthesizes memo + 3 board messages + proposed Notion rows. Writes the memo and audit note."

## 7–9 min — show the artifacts, NOT yet committed

Open `03 Monthly Close/2026-03 March Close/2026-03 Close Review Memo.md` — the LLM-written memo, fully grounded.
Open `07 Audit Trail/<today> audit-note - closed-loop run 2026-03 March Close.md` — the SHA-256-stamped trace.

The CLI is now paused at the human gate, showing the proposal table. **Notion has not been touched yet.**

## 9–11 min — the human gate

Type `y` to approve.

Watch `memory_write` fire. Switch to the Notion tab and refresh — the new rows appear.

## 11–13 min — the loop in action

Re-run with the same period:

```bash
python -m src.run --period "2026-03 March Close"
```

Two things to point out:

1. The CLI mentions "checkpoint resumed" — **session state**.
2. The Memory Agent now retrieves **its own** prior write from Notion ("here's a similar decision we made last cycle"). That is the closed loop.

## 13–15 min — Q&A primers

- "How would you change models?" → swap `_llm.py`. Show `03-deploy-azure.md`.
- "How is memory persistent?" → SqliteSaver checkpoint file + Notion DB + Vector Search index. Three layers.
- "What stops it from going rogue?" → human gate before any external write; audit notes; deterministic file loaders; JSON-schema-checked LLM output.
- "Cost?" → 1 Pro call for Analyst, 1 Pro call for CFO Brief, ~2 Flash calls. ~$0.10–$0.30 per run at current pricing for a typical close.
