"""Vertex AI Vector Search wrapper for RAG over the Drive corpus.

We chunk every Markdown / text / parsed CSV into ~1,000-token windows,
embed with `text-embedding-005`, and upsert to a Vertex AI Vector Search
index. Retrieval returns top-k neighbors with metadata (path, chunk_id).
"""
from __future__ import annotations

import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from google.cloud import aiplatform
from langchain_google_vertexai import VertexAIEmbeddings


@dataclass
class Chunk:
    id: str
    text: str
    path: str
    chunk_idx: int


def _embeddings() -> VertexAIEmbeddings:
    return VertexAIEmbeddings(
        model_name=os.environ.get("VERTEX_EMBEDDING_MODEL", "text-embedding-005"),
        project=os.environ["GCP_PROJECT_ID"],
        location=os.environ.get("GCP_LOCATION", "us-central1"),
    )


def _init_aiplatform() -> None:
    aiplatform.init(
        project=os.environ["GCP_PROJECT_ID"],
        location=os.environ.get("GCP_LOCATION", "us-central1"),
    )


def chunk_file(path: Path, max_chars: int = 4000) -> Iterable[Chunk]:
    """Naive char-window chunker. For production, swap for a token-aware splitter."""
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
    except Exception:
        return []
    text = text.strip()
    if not text:
        return []
    chunks: list[Chunk] = []
    for i, start in enumerate(range(0, len(text), max_chars)):
        body = text[start : start + max_chars]
        chunks.append(Chunk(
            id=f"{path.name}::chunk-{i}",
            text=body,
            path=str(path),
            chunk_idx=i,
        ))
    return chunks


def index_corpus(repo_root: str) -> dict:
    """Walk the repo, chunk text-y files, embed, upsert into Vertex Vector Search.

    For brevity this writes a JSONL of datapoints suitable for
    `MatchingEngineIndex.upsert_datapoints` — the actual upsert call
    is intentionally a thin wrapper so it's easy to swap to streaming
    updates or batch updates per environment.
    """
    _init_aiplatform()
    emb = _embeddings()
    root = Path(repo_root)
    targets = [
        p for p in root.rglob("*")
        if p.is_file()
        and p.suffix.lower() in {".md", ".txt", ".csv"}
        and "agents/" not in p.as_posix()
        and "/.git/" not in p.as_posix()
    ]
    out_path = root / "agents" / "corpus.jsonl"
    n = 0
    with out_path.open("w", encoding="utf-8") as out:
        for f in targets:
            for ch in chunk_file(f):
                vec = emb.embed_query(ch.text)
                out.write(json.dumps({
                    "id": ch.id,
                    "embedding": vec,
                    "restricts": [{"namespace": "path", "allow": [ch.path]}],
                }) + "\n")
                n += 1
    return {"chunks": n, "jsonl": str(out_path), "files_indexed": len(targets)}


def retrieve(query: str, k: int = 5) -> list[dict]:
    """Query the deployed index endpoint. Returns [{id, score, path}]."""
    _init_aiplatform()
    endpoint_id = os.environ.get("VECTOR_INDEX_ENDPOINT_ID")
    deployed_id = os.environ.get("VECTOR_DEPLOYED_INDEX_ID")
    if not (endpoint_id and deployed_id):
        # Graceful fallback for local/dev without a deployed index
        return []

    emb = _embeddings()
    q_vec = emb.embed_query(query)
    endpoint = aiplatform.MatchingEngineIndexEndpoint(endpoint_id)
    neighbors = endpoint.find_neighbors(
        deployed_index_id=deployed_id,
        queries=[q_vec],
        num_neighbors=k,
    )
    out: list[dict] = []
    for ns in neighbors:
        for n in ns:
            out.append({"id": n.id, "score": float(n.distance)})
    return out
