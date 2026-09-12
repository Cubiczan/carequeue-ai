---
name: closed-loop-audit
description: Writes the immutable audit note for each closed-loop run.
---

# Closed Loop Audit

## When to invoke

End of every closed-loop run, after memory writes are confirmed.

## Output

Write a new file: `07 Audit Trail/YYYY-MM-DD audit-note - <event>.md`

```
# Audit Note — <event>
- Run timestamp:
- Inputs read: (paths + sha256 if available)
- Agents/skills invoked:
- Notion rows written: (IDs)
- Outputs written: (paths)
- Open follow-ups:
- Operator: <human approver>
```

## Rules

- Append-only.
- Never edits prior notes; corrections go in a new note that references the corrected note's filename.
