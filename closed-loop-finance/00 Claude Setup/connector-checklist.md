# Connector Checklist

Before running the first close, verify each connector:

- [ ] **Local folder** — Claude Cowork project points to this repo's local path
- [ ] **Notion** — Decision Log page is reachable; test write with a dummy row, then delete
- [ ] **Google Drive** (optional) — only if you sync this folder via Drive Desktop
- [ ] **Skill pack** — `skills/` is present and the four base skills appear in the skill manager
- [ ] **Project instructions** — `[Company Name]` and `[NOTION_PAGE_URL]` tokens replaced

## Smoke-test prompt

```
List the files you can see in this project. Then read 03 Monthly Close/2026-03 March Close/controller-close-notes.md and summarize it in three bullets.
```

If Claude returns the file tree and a clean three-bullet summary, the wiring is correct.
