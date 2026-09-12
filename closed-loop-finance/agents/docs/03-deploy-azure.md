# 03 — Alternative: Azure AI Foundry Deployment

The architecture is provider-agnostic. To run on Azure AI Foundry instead of Vertex:

## Swap surface

| Concern | GCP Vertex | Azure AI Foundry |
|---|---|---|
| Reasoning model | `gemini-2.5-pro` | `gpt-5` (or `gpt-4.1`) deployed in your Foundry project |
| Fast model | `gemini-2.5-flash` | `gpt-5-mini` |
| Embeddings | `text-embedding-005` | `text-embedding-3-large` |
| Vector store | Vertex AI Vector Search | **Azure AI Search** (vector index) |
| Orchestrator | LangGraph | LangGraph (no change) **or** Semantic Kernel |
| State | Cloud SQL Postgres | Azure Database for PostgreSQL |
| Auth | Service account JSON | `DefaultAzureCredential` (workload identity) |

## Code change — swap `_llm.py`

```python
# agents/src/agents/_llm.py (Azure variant)
import os
from langchain_openai import AzureChatOpenAI

def reasoning_llm(temperature=0.1):
    return AzureChatOpenAI(
        azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
        api_version=os.environ.get("AZURE_OPENAI_API_VERSION", "2024-10-21"),
        azure_deployment=os.environ.get("AZURE_AI_MODEL_REASONING", "gpt-5"),
        temperature=temperature,
    )

def fast_llm(temperature=0.0):
    return AzureChatOpenAI(
        azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
        api_version=os.environ.get("AZURE_OPENAI_API_VERSION", "2024-10-21"),
        azure_deployment=os.environ.get("AZURE_AI_MODEL_FAST", "gpt-5-mini"),
        temperature=temperature,
    )
```

## Code change — swap `vector_store.py`

Replace the Vertex `find_neighbors` body with `azure-search-documents`:

```python
from azure.search.documents import SearchClient
from azure.search.documents.models import VectorizedQuery
from azure.identity import DefaultAzureCredential

client = SearchClient(
    endpoint=os.environ["AZURE_SEARCH_ENDPOINT"],
    index_name=os.environ["AZURE_SEARCH_INDEX"],
    credential=DefaultAzureCredential(),
)
results = client.search(
    search_text=None,
    vector_queries=[VectorizedQuery(vector=q_vec, k_nearest_neighbors=k, fields="embedding")],
)
```

## Semantic Kernel as orchestrator (optional)

If your team standardizes on SK rather than LangGraph, model each agent as an SK `KernelAgent` and wire them with an `AgentGroupChat` plus a custom termination strategy. The State and Memory abstractions translate 1:1; the human-in-the-loop becomes a `SelectionStrategy` that yields control to a "human" participant after the CFO Brief.
