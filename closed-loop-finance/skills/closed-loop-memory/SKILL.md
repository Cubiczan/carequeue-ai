---
name: closed-loop-memory
description: Reads and writes the Notion Decision Log. Checks prior context before any new decision recommendation.
---

# Closed Loop Memory

## Read pattern

Before any material recommendation, query Notion for `Decision` containing the topic keywords AND `Decision Date` within the last 12 months. Surface up to 5 prior rows.

## Write pattern

Write only when explicitly asked. Use the schema:

| Field | Source |
|---|---|
| Decision | Short imperative title |
| Decision Date | Today, ISO |
| Category | Controlled vocab (Close/FP&A/Capital/Treasury/Tax/Comp/Audit/M&A/Board/Other) |
| Owner | Named individual (not a role) |
| Decision Made | One paragraph; what + why + trigger to revisit |

## Never

- Never store sensitive raw figures in the Decision Made field if a Drive file path conveys the same info.
- Never edit historical rows. Add a new row that supersedes prior with `Decision Made` referencing the prior row ID.
