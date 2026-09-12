"""
ingest.py — Ingest Reddit threads into Actian VectorAI DB via bridge service

Fetches threads from configured subreddits via PRAW, embeds them using
the vectorai-bridge.py service (which wraps sentence-transformers +
Actian VectorAI DB), and stores them for semantic search.

Usage:
    pip install praw requests
    python vectorai-bridge.py &   # Start the bridge server first
    python ingest.py

Environment:
    REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USER_AGENT
    BRIDGE_URL (default http://localhost:27832)
    VECTORAI_COLLECTION (default reddit_threads)
    SUBREDDITS (comma-separated, default smallbusiness,startups,Entrepreneur,SaaS)
    INGEST_LIMIT (per subreddit, default 100)
"""

import os
import json
import time
import requests
from praw import Reddit

# ─── Config ──────────────────────────────────────────────────────────

BRIDGE_URL = os.environ.get("BRIDGE_URL", "http://localhost:27832")
COLLECTION = os.environ.get("VECTORAI_COLLECTION", "reddit_threads")
SUBREDDITS = os.environ.get("SUBREDDITS", "smallbusiness,startups,Entrepreneur,SaaS").split(",")
LIMIT = int(os.environ.get("INGEST_LIMIT", "100"))

# ─── Reddit Client ───────────────────────────────────────────────────

reddit = Reddit(
    client_id=os.environ.get("REDDIT_CLIENT_ID"),
    client_secret=os.environ.get("REDDIT_CLIENT_SECRET"),
    user_agent=os.environ.get("REDDIT_USER_AGENT", "semantiq-ingest/1.0"),
)

# ─── Functions ───────────────────────────────────────────────────────

def check_bridge_health():
    """Verify the bridge service is running and VectorAI DB is connected."""
    try:
        resp = requests.get(f"{BRIDGE_URL}/api/health", timeout=5)
        data = resp.json()
        vectorai_ok = data.get("vectorai_db", {}).get("status") == "connected"
        embedding_ok = data.get("embedding", {}).get("status") == "loaded"
        print(f"  Bridge: {data.get('status', 'unknown')}")
        print(f"  VectorAI DB: {data.get('vectorai_db', {}).get('status', 'unknown')}")
        print(f"  Embedding model: {data.get('embedding', {}).get('model', 'unknown')} ({data.get('embedding', {}).get('status', 'unknown')})")
        return vectorai_ok and embedding_ok
    except Exception as e:
        print(f"  Bridge not reachable: {e}")
        return False


def embed_texts(texts: list[str]) -> list[list[float]]:
    """Embed texts via the bridge service (sentence-transformers)."""
    response = requests.post(
        f"{BRIDGE_URL}/api/embed-batch",
        json={"texts": texts},
        timeout=60,
    )
    response.raise_for_status()
    return response.json()["embeddings"]


def init_collection():
    """Initialize the VectorAI DB collection via the bridge."""
    try:
        response = requests.post(
            f"{BRIDGE_URL}/api/collections/init",
            json={
                "name": COLLECTION,
                "dimension": 384,
            },
            timeout=15,
        )
        response.raise_for_status()
        print(f"  Collection '{COLLECTION}' ready.")
    except Exception as e:
        print(f"  Collection init warning: {e}")


def fetch_threads() -> list[dict]:
    """Fetch threads from configured subreddits."""
    threads = []
    for sub in SUBREDDITS:
        try:
            for submission in reddit.subreddit(sub).new(limit=LIMIT):
                threads.append({
                    "id": submission.id,
                    "subreddit": str(submission.subreddit),
                    "title": submission.title,
                    "selftext": (submission.selftext or "")[:5000],
                    "author": str(submission.author) if submission.author else "[deleted]",
                    "score": submission.score,
                    "num_comments": submission.num_comments,
                    "created_at_reddit": int(submission.created_utc),
                    "url": submission.url,
                })
            print(f"  r/{sub}: fetched {LIMIT} threads")
        except Exception as e:
            print(f"  r/{sub}: error - {e}")
    return threads


def upsert_to_vectorai(threads: list[dict], embeddings: list[list[float]]):
    """Upsert threads into VectorAI DB via the bridge."""
    records = []
    for thread, embedding in zip(threads, embeddings):
        if not embedding:
            continue
        records.append({
            "id": thread["id"],
            "vector": embedding,
            "metadata": {
                "subreddit": thread["subreddit"],
                "title": thread["title"],
                "author": thread["author"],
                "score": thread["score"],
                "num_comments": thread["num_comments"],
                "created_at_reddit": thread["created_at_reddit"],
                "url": thread["url"],
            },
        })

    # Upsert in batches of 50
    batch_size = 50
    upserted = 0
    for i in range(0, len(records), batch_size):
        batch = records[i : i + batch_size]
        response = requests.post(
            f"{BRIDGE_URL}/api/collections/{COLLECTION}/upsert",
            json={
                "ids": [r["id"] for r in batch],
                "vectors": [r["vector"] for r in batch],
                "metadata": [r["metadata"] for r in batch],
            },
            timeout=30,
        )
        response.raise_for_status()
        upserted += len(batch)
        print(f"  Upserted batch {i // batch_size + 1} ({len(batch)} threads)")

    return upserted


def semantic_search(query: str, top_k: int = 5) -> list[dict]:
    """Test semantic search via the bridge."""
    # Embed query via bridge
    response = requests.post(
        f"{BRIDGE_URL}/api/embed",
        json={"text": query},
        timeout=30,
    )
    response.raise_for_status()
    query_vector = response.json()["embedding"]

    # Search via bridge
    response = requests.post(
        f"{BRIDGE_URL}/api/collections/{COLLECTION}/search",
        json={
            "vector": query_vector,
            "top_k": top_k,
            "include_metadata": True,
        },
        timeout=30,
    )
    response.raise_for_status()
    return response.json().get("results", [])


# ─── Main ────────────────────────────────────────────────────────────

def main():
    print("=" * 50)
    print("  SemantiQ — Reddit Ingestion Pipeline")
    print("  Powered by Actian VectorAI DB")
    print("=" * 50)
    print(f"  Bridge URL:     {BRIDGE_URL}")
    print(f"  Collection:     {COLLECTION}")
    print(f"  Subreddits:     {SUBREDDITS}")
    print(f"  Limit:          {LIMIT} per subreddit")
    print("=" * 50)
    print()

    # Health check
    print("Checking bridge health...")
    if not check_bridge_health():
        print("\nERROR: Bridge service is not ready.")
        print("Make sure to start it first:")
        print("  pip install actian-vectorai sentence-transformers flask flask-cors")
        print("  python vectorai-bridge.py")
        return
    print()

    # Init collection
    print("Initializing VectorAI DB collection...")
    init_collection()
    print()

    # Fetch
    print("Fetching threads from Reddit...")
    start = time.time()
    threads = fetch_threads()
    print(f"Fetched {len(threads)} total threads in {time.time() - start:.1f}s")
    print()

    # Embed
    print("Embedding threads via bridge...")
    start = time.time()
    texts = [f"{t['title']} {t['selftext']}" for t in threads]
    embeddings = embed_texts(texts)
    print(f"Embedded {len(embeddings)} threads in {time.time() - start:.1f}s")
    print()

    # Upsert
    print("Upserting into VectorAI DB via bridge...")
    start = time.time()
    upserted = upsert_to_vectorai(threads, embeddings)
    print(f"Upserted {upserted} threads in {time.time() - start:.1f}s")
    print()

    # Test search
    print("Testing semantic search...")
    results = semantic_search("best tool for managing client invoices", top_k=5)
    print(f"Found {len(results)} results:")
    for i, r in enumerate(results):
        title = r.get("metadata", {}).get("title", "N/A")
        sim = r.get("score", r.get("distance", "N/A"))
        sub = r.get("metadata", {}).get("subreddit", "")
        print(f"  {i+1}. [score={sim}] r/{sub}: {title[:80]}")

    print()
    print("Done!")


if __name__ == "__main__":
    main()
