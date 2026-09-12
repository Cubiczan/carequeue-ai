"""Light Pandas helpers the Analyst Agent calls deterministically.

We compute the obvious metrics in code (no LLM) and let the LLM reason
over the numbers. This gives the Analyst Agent grounded inputs.
"""
from __future__ import annotations

from typing import Any

import pandas as pd


def variance_summary(pl_records: list[dict]) -> dict[str, Any]:
    """From a P&L actual-vs-budget records list, return materiality table."""
    if not pl_records:
        return {"rows": [], "total_lines": 0}
    df = pd.DataFrame(pl_records)
    # Tolerate column-name variants
    cols = {c.lower(): c for c in df.columns}
    line = cols.get("line")
    actual = cols.get("actual")
    budget = cols.get("budget")
    variance = cols.get("variance")
    pct = cols.get("variance %") or cols.get("variance%")
    if not (line and actual and budget):
        return {"rows": [], "total_lines": len(df), "warning": "columns missing"}

    rows = []
    for _, r in df.iterrows():
        a = pd.to_numeric(r.get(actual), errors="coerce")
        b = pd.to_numeric(r.get(budget), errors="coerce")
        v = pd.to_numeric(r.get(variance), errors="coerce") if variance else (a - b)
        p = pd.to_numeric(r.get(pct), errors="coerce") if pct else (
            (v / b) if pd.notna(b) and b != 0 else None
        )
        rows.append({
            "line": r.get(line),
            "actual": None if pd.isna(a) else float(a),
            "budget": None if pd.isna(b) else float(b),
            "variance": None if pd.isna(v) else float(v),
            "variance_pct": None if p is None or pd.isna(p) else float(p),
        })
    return {"rows": rows, "total_lines": len(df)}


def ar_aging_buckets(ar_records: list[dict]) -> dict[str, float]:
    if not ar_records:
        return {}
    df = pd.DataFrame(ar_records)
    buckets = ["Current", "1-30", "31-60", "61-90", "90+"]
    out: dict[str, float] = {}
    for b in buckets:
        if b in df.columns:
            out[b] = float(pd.to_numeric(df[b], errors="coerce").sum(skipna=True))
    return out


def cash_movement(bank_records: list[dict]) -> dict[str, Any]:
    if not bank_records:
        return {}
    df = pd.DataFrame(bank_records)
    debit_col = next((c for c in df.columns if c.lower() == "debit"), None)
    credit_col = next((c for c in df.columns if c.lower() == "credit"), None)
    if not (debit_col and credit_col):
        return {"warning": "debit/credit columns missing"}
    debits = pd.to_numeric(df[debit_col], errors="coerce").sum(skipna=True)
    credits = pd.to_numeric(df[credit_col], errors="coerce").sum(skipna=True)
    return {"total_debits": float(debits), "total_credits": float(credits), "net": float(credits - debits)}


def inventory_total(inv_records: list[dict]) -> float:
    if not inv_records:
        return 0.0
    df = pd.DataFrame(inv_records)
    col = next((c for c in df.columns if c.lower() in {"extended cost", "extended_cost"}), None)
    if not col:
        return 0.0
    return float(pd.to_numeric(df[col], errors="coerce").sum(skipna=True))
