---
name: closed-loop-brain
description: Orchestrates the closed-loop finance review across evidence, analysis, memory, and brief.
---

# Closed Loop Brain

Use when the CFO asks for a close review, weekly review, or any artifact that should produce a decision and update memory.

## Loop

1. Read source evidence in the connected folder.
2. Identify the finance signal.
3. Separate facts from assumptions.
4. Identify the decision required.
5. Check Notion for prior similar decisions.
6. Draft management-ready output.
7. Propose decision row(s) for Notion (do not write without approval).
8. On approval, hand off to `closed-loop-memory` to write, then to `closed-loop-audit` to seal the run.

## Output contract

Every output ends with:

- **Facts** (file-grounded)
- **Likely explanations**
- **Open questions**
- **Recommended follow-ups**
- **Proposed Notion entries** (Decision / Decision Date / Category / Owner / Decision Made)
