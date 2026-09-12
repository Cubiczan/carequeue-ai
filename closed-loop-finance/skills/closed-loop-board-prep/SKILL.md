---
name: closed-loop-board-prep
description: Builds the 3-message management/board summary from the close memo and forecast.
---

# Closed Loop Board Prep

## When to invoke

After the close review memo is finalized, or before any board / management standup.

## Output contract — exactly 3 messages

For each of the 3 messages:

```
M#: <one-sentence headline>
- What happened (1 line, file-grounded)
- Why it happened (1 line)
- What we're doing about it (1 line, link to Notion decision row if any)
```

## Selection rule

Pick the 3 messages with highest combined (financial materiality × strategic relevance × decision-readiness). Discard the rest into an appendix.
