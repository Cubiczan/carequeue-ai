# 05 — Operator Runbook

## Routine ops

### Monthly: run the close

```bash
cd agents
python -m src.run --period "YYYY-MM Month Close"
```

The CLI prints each node trace, pauses at the human gate, then writes to Notion on approval.

### Quarterly: re-index the corpus

```bash
python scripts/index_corpus.py --root ..
```

Run after any meaningful change to `01 Company Context/`, `06 Finance Processes/`, or after archiving an old period.

### Quarterly: export Notion DB

```bash
python scripts/export_notion.py --out "../05 Decisions Log/Decision Log.csv"
```

Commit the CSV. This is the offline / audit-friendly snapshot.

## Failure modes

| Symptom | Likely cause | Fix |
|---|---|---|
| `Analyst output unparseable` | Gemini wrapped JSON in extra prose | Re-run; if persistent, lower temperature in `analyst.py` |
| Notion rows not written | `human_approved=False` or token expired | Re-run with `--auto-approve` only after manually verifying; or rotate `NOTION_TOKEN` |
| `find_neighbors` returns 0 | Index not deployed or env vars unset | Confirm `VECTOR_INDEX_ENDPOINT_ID` and `VECTOR_DEPLOYED_INDEX_ID`; redeploy index |
| Checkpoint resumes mid-flight unexpectedly | Same `thread_id` re-used across periods | Use one `thread_id` per period (default behavior) |
| `FileNotFoundError` on period folder | Folder name typo | Folder must match exactly: `YYYY-MM Month Close` (with trailing space-separated label) |

## Rotating credentials

- **Notion:** create a new integration token, share with the DB, swap `NOTION_TOKEN` in `.env`.
- **GCP service account:** `gcloud iam service-accounts keys create` and update `GOOGLE_APPLICATION_CREDENTIALS`.
- **Codeberg / GitHub PATs:** see `../docs/git-push-runbook.md`.

## Escalation

- LLM hallucination found in a memo → file an audit note in `07 Audit Trail/` correcting it; do **not** edit the original memo.
- Notion DB schema change → update `query_prior` and `write_decision` in `tools/notion_client.py` and the Memory Agent system prompt.
- Vector index drift (irrelevant retrievals) → bump chunk size, narrow `restricts`, or move to a domain-tuned embedding model.
