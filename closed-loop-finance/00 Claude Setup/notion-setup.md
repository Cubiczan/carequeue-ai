# Notion Setup — Decision Log

The Notion page is the **structured memory layer**. Drive holds evidence; Notion holds decisions.

## 1. Create the page

Create a top-level Notion page titled:

> **[Company Name] Finance Decisions Log**

## 2. Add the database

Inside that page, add an inline database titled **`Decision Log`** with these properties:

| Field | Type | Notes |
|---|---|---|
| Decision | Title | Short, action-oriented title |
| Decision Date | Date | When the decision was made |
| Category | Select | Close, FP&A, Capital, Treasury, Tax, Compensation, Audit, M&A, Other |
| Owner | Person or Text | Accountable named individual |
| Decision Made | Rich text | One-paragraph summary of what was decided and why |

## 3. Seed the database

Import `../05 Decisions Log/Decision Log.csv` into the database (Notion → `…` → Merge with CSV).

## 4. Connect to Claude Cowork

In Claude Cowork: **Settings → Connectors → Add → Notion** → authorize the workspace that contains this page.

## 5. Wire the URL

Copy the page URL and paste it into `project-instructions.md` where it says `[NOTION_PAGE_URL]`.

## What Notion is NOT

- Not a document repository. Keep spreadsheets, close packs, and board materials in Drive.
- Not a financial system of record. Financial truth lives in Drive / your ERP.
- Not free-form notes. Every entry is one structured row.
