"""One-time / on-change indexer for Vertex AI Vector Search."""
from __future__ import annotations

import argparse

from dotenv import load_dotenv
from rich import print

from src.tools.vector_store import index_corpus  # noqa: E402


def main() -> None:
    load_dotenv()
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default="..", help="Repo root to walk")
    args = ap.parse_args()
    result = index_corpus(args.root)
    print(result)


if __name__ == "__main__":
    main()
