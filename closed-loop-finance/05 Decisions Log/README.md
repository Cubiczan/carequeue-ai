# Decisions Log

`Decision Log.csv` is the seed file for the Notion database. After import, **Notion is the source of truth** for decisions — but keep a periodic CSV export here for audit history and offline portability.

## Categories (controlled vocabulary)

- Close
- FP&A
- Capital
- Treasury
- Tax
- Compensation
- Audit
- M&A
- Board
- Other

## Workflow

1. Claude proposes a decision entry in chat.
2. CFO approves.
3. Claude writes the row to Notion.
4. Quarterly: export Notion DB to CSV, replace this file, commit.
