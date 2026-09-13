"""Ensure scent GC deletes via bound parameters, not concatenated SQL."""

import sqlite3
import time

from orchestrator.stigmergy import GC_THRESHOLD, ScentField, ScentSignal, ScentType


def test_gc_purges_expired_ids_without_sql_concat(tmp_path):
    db_path = tmp_path / "scent.db"
    field = ScentField(str(db_path))
    evil_id = "sig'); DROP TABLE scent_signals; --"
    field.emit(
        ScentSignal(
            signal_id=evil_id,
            task_id="t1",
            worker_id="w1",
            scent_type=ScentType.PROGRESS,
            intensity=GC_THRESHOLD / 100.0,
            emitted_at=time.time() - 10_000,
        )
    )
    field.garbage_collect()

    conn = sqlite3.connect(str(db_path))
    tables = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='scent_signals'"
    ).fetchall()
    remaining = conn.execute(
        "SELECT signal_id FROM scent_signals WHERE signal_id = ?", (evil_id,)
    ).fetchall()
    conn.close()

    assert tables, "scent_signals table must still exist after GC"
    assert remaining == []
