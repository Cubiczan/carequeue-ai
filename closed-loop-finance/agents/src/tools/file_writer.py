"""Write CFO outputs back to the Drive folder."""
from __future__ import annotations

from datetime import datetime
from pathlib import Path


def write_close_memo(repo_root: str, period: str, body_md: str) -> str:
    folder = Path(repo_root) / "03 Monthly Close" / period
    folder.mkdir(parents=True, exist_ok=True)
    name = f"{period.split(' ')[0]} Close Review Memo.md"
    out = folder / name
    out.write_text(body_md, encoding="utf-8")
    return str(out)


def write_audit_note(repo_root: str, event: str, body_md: str) -> str:
    folder = Path(repo_root) / "07 Audit Trail"
    folder.mkdir(parents=True, exist_ok=True)
    stamp = datetime.utcnow().strftime("%Y-%m-%d")
    name = f"{stamp} audit-note - {event}.md"
    out = folder / name
    out.write_text(body_md, encoding="utf-8")
    return str(out)
