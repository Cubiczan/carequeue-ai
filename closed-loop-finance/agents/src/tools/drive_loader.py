"""Drive / local-folder loader.

Reads every file in a period folder, parses by extension, and returns an
Evidence dict ready to flow through the graph state.
"""
from __future__ import annotations

import hashlib
import os
from pathlib import Path
from typing import Any

import pandas as pd
from pypdf import PdfReader

from ..state.schema import Evidence, FileEvidence


def _sha256(p: Path) -> str:
    h = hashlib.sha256()
    with p.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 16), b""):
            h.update(chunk)
    return h.hexdigest()


def _kind_for(p: Path) -> str:
    ext = p.suffix.lower().lstrip(".")
    return ext if ext in {"csv", "xlsx", "pdf", "md", "docx"} else "other"


def _parse(p: Path) -> tuple[Any, int | None, str | None]:
    """Return (parsed_payload, row_count_or_None, error_or_None)."""
    try:
        ext = p.suffix.lower()
        if ext == ".csv":
            df = pd.read_csv(p)
            return df.to_dict(orient="records"), len(df), None
        if ext == ".xlsx":
            sheets = pd.read_excel(p, sheet_name=None)
            payload = {name: df.to_dict(orient="records") for name, df in sheets.items()}
            rows = sum(len(df) for df in sheets.values())
            return payload, rows, None
        if ext == ".pdf":
            reader = PdfReader(str(p))
            text = "\n".join((page.extract_text() or "") for page in reader.pages)
            return {"text": text, "pages": len(reader.pages)}, None, None
        if ext in {".md", ".txt"}:
            return p.read_text(encoding="utf-8", errors="replace"), None, None
        return None, None, f"unsupported extension {ext}"
    except Exception as e:  # noqa: BLE001
        return None, None, f"{type(e).__name__}: {e}"


def load_period(repo_root: str, period: str) -> Evidence:
    """Walk `<repo_root>/03 Monthly Close/<period>/` and parse everything."""
    folder = Path(repo_root) / "03 Monthly Close" / period
    if not folder.exists():
        raise FileNotFoundError(folder)

    files: list[FileEvidence] = []
    parsed: dict[str, Any] = {}
    for p in sorted(folder.iterdir()):
        if not p.is_file() or p.name.startswith("."):
            continue
        payload, rows, err = _parse(p)
        files.append(
            FileEvidence(
                path=str(p),
                sha256=_sha256(p),
                kind=_kind_for(p),
                rows=rows,
                bytes=p.stat().st_size,
                error=err,
            )
        )
        if payload is not None:
            parsed[p.name] = payload

    return Evidence(
        period=period,
        folder=str(folder),
        files=files,
        parsed=parsed,
    )
