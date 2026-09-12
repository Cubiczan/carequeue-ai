# 02 — Deploy on GCP Vertex AI

## Prerequisites

- GCP project with billing enabled
- `gcloud` CLI authenticated (`gcloud auth login` + `gcloud auth application-default login`)
- A Notion integration token (https://www.notion.so/my-integrations) shared with the Decision Log DB
- Python 3.11+

## 1. Enable APIs

```bash
gcloud services enable \
  aiplatform.googleapis.com \
  storage.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com
```

## 2. Service account

```bash
PROJECT_ID=your-project-id
SA=closed-loop-finance
gcloud iam service-accounts create $SA --display-name="Closed Loop Finance"

for role in \
  roles/aiplatform.user \
  roles/storage.objectAdmin \
  roles/secretmanager.secretAccessor; do
  gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SA@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="$role"
done

gcloud iam service-accounts keys create ./sa-key.json \
  --iam-account=$SA@$PROJECT_ID.iam.gserviceaccount.com
```

Set `GOOGLE_APPLICATION_CREDENTIALS=./sa-key.json` in `.env`.

## 3. Create the Vector Search index

```bash
gcloud ai indexes create \
  --display-name=closed-loop-finance \
  --metadata-file=- <<EOF
{
  "contentsDeltaUri": "gs://${PROJECT_ID}-vector-staging/init/",
  "config": {
    "dimensions": 768,
    "approximateNeighborsCount": 50,
    "distanceMeasureType": "COSINE_DISTANCE",
    "algorithmConfig": { "treeAhConfig": { "leafNodeEmbeddingCount": 1000 } }
  }
}
EOF
```

Then create an endpoint and deploy the index:

```bash
gcloud ai index-endpoints create --display-name=closed-loop-finance-endpoint
gcloud ai index-endpoints deploy-index <ENDPOINT_ID> \
  --deployed-index-id=closed_loop_finance_v1 \
  --display-name=closed-loop-finance \
  --index=<INDEX_ID>
```

Capture `<INDEX_ID>` and `<ENDPOINT_ID>` and put them in `.env` as `VECTOR_INDEX_ID` and `VECTOR_INDEX_ENDPOINT_ID`.

## 4. (Optional) Cloud SQL for shared state

For multi-operator use, replace SqliteSaver with PostgresSaver:

```bash
gcloud sql instances create cl-finance-state --database-version=POSTGRES_15 --tier=db-f1-micro --region=us-central1
gcloud sql databases create langgraph --instance=cl-finance-state
```

Then in `orchestrator/graph.py`, swap:

```python
from langgraph.checkpoint.postgres import PostgresSaver
checkpointer = PostgresSaver.from_conn_string(os.environ["POSTGRES_URL"])
checkpointer.setup()
```

## 5. Index the corpus

```bash
cd agents
python scripts/index_corpus.py --root ..
# emits corpus.jsonl; upload to gs://${PROJECT_ID}-vector-staging and trigger an index update
```

## 6. Run

```bash
python -m src.run --period "2026-03 March Close"
```

## 7. Observability

- LangGraph's local dev UI: `langgraph dev` → http://localhost:2024
- Cloud Logging: `gcloud logging read 'resource.type="aiplatform.googleapis.com/Endpoint"' --limit 50`
- LangSmith (optional): set `LANGSMITH_API_KEY`, `LANGSMITH_PROJECT` to ship traces.

## Cost notes

- Gemini 2.5 Pro is the only expensive call (Analyst + CFO Brief). Evidence is deterministic, Memory uses Flash for keyword extraction.
- Vector Search: pay per index hour + per query. Keep one small index for the corpus; re-index on-change, not per run.
- Cloud SQL `db-f1-micro` is sufficient for state.
