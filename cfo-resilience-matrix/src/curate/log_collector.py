"""
curate.log_collector — Inference Log Collector
===============================================

Captures every agent inference call into a structured log that serves as
the foundation for failure diagnosis and training data curation.

Every log entry records the full lifecycle of an inference request:
prompt, system prompt, response, confidence, verdict, degradation level,
decision state, resilience events, provider info, latency, and timestamps.

The collector is designed to be attached to the DataCurationLayer so that
every call through the resilience stack is automatically logged.

Usage
-----
::

    collector = InferenceLogCollector()
    collector.log(prompt="...", response="...", confidence=0.9, ...)
    entries = collector.get_entries()
    collector.export_jsonl("inference_logs.jsonl")
    collector.export_trainable("training_data.jsonl")
"""

from __future__ import annotations

import json
import logging
import uuid
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

logger = logging.getLogger("cfo_resilience.curate.collector")


@dataclass
class InferenceLogEntry:
    """Structured record of a single inference request-response pair.

    Attributes
    ----------
    entry_id : str
        Unique identifier for this log entry.
    timestamp : str
        ISO-8601 UTC timestamp of the inference call.
    agent_name : str
        Name of the agent that produced this inference (e.g. "finance").
    prompt : str
        The user's input prompt.
    system_prompt : str
        The system prompt used for the inference.
    response : str
        The LLM-generated response text.
    confidence : float
        Confidence score after resilience evaluation (0.0-1.0).
    verdict : str
        Final verdict: ALLOW, BLOCK, or DEGRADE.
    degradation_level : int
        Degradation level (0=none, 1=partial, 2=significant).
    decision_state : str
        CHP decision state after evaluation.
    latency_ms : float
        Total wall-clock time in milliseconds.
    model : str
        Model / provider used for the inference.
    providers_tried : list[str]
        List of providers attempted (including failovers).
    pii_flags : list[str]
        PII patterns detected in the response.
    event_types : list[str]
        Types of resilience events that fired during this call.
    chaos_scenario : str
        Active chaos scenario (empty string if none).
    metadata : dict[str, Any]
        Additional metadata.
    """

    entry_id: str = field(default_factory=lambda: uuid.uuid4().hex[:12])
    timestamp: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    agent_name: str = ""
    prompt: str = ""
    system_prompt: str = ""
    response: str = ""
    confidence: float = 1.0
    verdict: str = "ALLOW"
    degradation_level: int = 0
    decision_state: str = "EXPLORING"
    latency_ms: float = 0.0
    model: str = ""
    providers_tried: list[str] = field(default_factory=list)
    pii_flags: list[str] = field(default_factory=list)
    event_types: list[str] = field(default_factory=list)
    chaos_scenario: str = ""
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @property
    def is_failure(self) -> bool:
        """Whether this entry represents a failure."""
        return (
            self.verdict == "BLOCK"
            or self.confidence < 0.5
            or self.degradation_level >= 2
            or self.decision_state == "HALT"
        )

    @property
    def is_high_quality(self) -> bool:
        """Whether this entry is a high-quality example for training."""
        return (
            self.verdict == "ALLOW"
            and self.confidence >= 0.8
            and self.degradation_level == 0
            and self.decision_state in ("PROVISIONAL", "LOCKED")
            and len(self.response) > 100
            and not self.pii_flags
        )

    @property
    def is_regression_candidate(self) -> bool:
        """Whether this should be in the regression set (always must pass)."""
        return (
            self.verdict == "ALLOW"
            and self.confidence >= 0.7
            and len(self.response) > 50
        )


class InferenceLogCollector:
    """Accumulates inference log entries and provides export utilities.

    Parameters
    ----------
    max_entries : int
        Maximum number of entries to keep in memory (ring buffer).
    persist_path : Path | str | None
        Optional path to a JSONL file for persistence.
    """

    def __init__(
        self,
        max_entries: int = 100_000,
        persist_path: Path | str | None = None,
    ) -> None:
        self._entries: list[InferenceLogEntry] = []
        self._max_entries = max_entries
        self._persist_path = Path(persist_path) if persist_path else None

    @property
    def entry_count(self) -> int:
        return len(self._entries)

    def log(
        self,
        prompt: str,
        response: str,
        agent_name: str = "",
        system_prompt: str = "",
        confidence: float = 1.0,
        verdict: str = "ALLOW",
        degradation_level: int = 0,
        decision_state: str = "EXPLORING",
        latency_ms: float = 0.0,
        model: str = "",
        providers_tried: list[str] | None = None,
        pii_flags: list[str] | None = None,
        event_types: list[str] | None = None,
        chaos_scenario: str = "",
        metadata: dict[str, Any] | None = None,
    ) -> InferenceLogEntry:
        """Record a new inference log entry.

        Returns the created entry for immediate inspection.
        """
        entry = InferenceLogEntry(
            agent_name=agent_name,
            prompt=prompt,
            system_prompt=system_prompt,
            response=response,
            confidence=confidence,
            verdict=verdict,
            degradation_level=degradation_level,
            decision_state=decision_state,
            latency_ms=latency_ms,
            model=model,
            providers_tried=providers_tried or [],
            pii_flags=pii_flags or [],
            event_types=event_types or [],
            chaos_scenario=chaos_scenario,
            metadata=metadata or {},
        )

        self._entries.append(entry)

        # Ring buffer: drop oldest entries if over limit
        if len(self._entries) > self._max_entries:
            self._entries = self._entries[-self._max_entries :]

        # Persist if configured
        if self._persist_path:
            self._append_to_disk(entry)

        return entry

    def log_from_context(
        self,
        context: Any,
        latency_ms: float = 0.0,
        chaos_scenario: str = "",
    ) -> InferenceLogEntry:
        """Create a log entry from a ResilienceContext object.

        This is the primary integration point with the resilience stack.
        """
        # Extract event types
        event_types: list[str] = []
        if hasattr(context, "events"):
            for ev in context.events:
                et = ev.event_type.value if hasattr(ev.event_type, "value") else str(ev.event_type)
                event_types.append(et)

        # Extract decision state
        ds = context.decision_state
        ds_val = ds.value if hasattr(ds, "value") else str(ds)

        # Extract verdict
        v = context.verdict
        v_val = v.value if hasattr(v, "value") else str(v)

        return self.log(
            prompt=context.prompt,
            response=context.response,
            agent_name=context.agent_name,
            system_prompt=(
                context.messages[0].get("content", "")
                if context.messages and context.messages[0].get("role") == "system"
                else ""
            ),
            confidence=context.confidence,
            verdict=v_val,
            degradation_level=context.degradation_level,
            decision_state=ds_val,
            latency_ms=latency_ms,
            model=context.metadata.get("model", ""),
            providers_tried=context.providers_tried,
            pii_flags=context.pii_flags,
            event_types=event_types,
            chaos_scenario=chaos_scenario,
            metadata=context.metadata,
        )

    def get_entries(
        self,
        agent_name: str | None = None,
        verdict: str | None = None,
        min_confidence: float | None = None,
        max_confidence: float | None = None,
        failures_only: bool = False,
        high_quality_only: bool = False,
    ) -> list[InferenceLogEntry]:
        """Filter and return log entries matching the given criteria."""
        entries = self._entries

        if agent_name:
            entries = [e for e in entries if e.agent_name == agent_name]
        if verdict:
            entries = [e for e in entries if e.verdict == verdict]
        if min_confidence is not None:
            entries = [e for e in entries if e.confidence >= min_confidence]
        if max_confidence is not None:
            entries = [e for e in entries if e.confidence <= max_confidence]
        if failures_only:
            entries = [e for e in entries if e.is_failure]
        if high_quality_only:
            entries = [e for e in entries if e.is_high_quality]

        return entries

    def get_stats(self) -> dict[str, Any]:
        """Return aggregate statistics about the collected logs."""
        if not self._entries:
            return {"total_entries": 0}

        total = len(self._entries)
        failures = sum(1 for e in self._entries if e.is_failure)
        high_quality = sum(1 for e in self._entries if e.is_high_quality)
        regression = sum(1 for e in self._entries if e.is_regression_candidate)

        by_agent: dict[str, int] = {}
        by_verdict: dict[str, int] = {}
        by_decision_state: dict[str, int] = {}
        avg_confidence = 0.0
        avg_latency = 0.0

        for e in self._entries:
            by_agent[e.agent_name] = by_agent.get(e.agent_name, 0) + 1
            by_verdict[e.verdict] = by_verdict.get(e.verdict, 0) + 1
            by_decision_state[e.decision_state] = by_decision_state.get(e.decision_state, 0) + 1
            avg_confidence += e.confidence
            avg_latency += e.latency_ms

        return {
            "total_entries": total,
            "failure_count": failures,
            "failure_rate": round(failures / max(total, 1), 3),
            "high_quality_count": high_quality,
            "regression_candidates": regression,
            "avg_confidence": round(avg_confidence / max(total, 1), 3),
            "avg_latency_ms": round(avg_latency / max(total, 1), 2),
            "by_agent": by_agent,
            "by_verdict": by_verdict,
            "by_decision_state": by_decision_state,
        }

    def export_jsonl(self, path: Path | str) -> int:
        """Export all entries as a JSONL file.

        Returns the number of entries written.
        """
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)

        count = 0
        with open(path, "w") as f:
            for entry in self._entries:
                f.write(json.dumps(entry.to_dict(), ensure_ascii=False) + "\n")
                count += 1

        logger.info("Exported %d entries to %s", count, path)
        return count

    def export_trainable(
        self,
        path: Path | str,
        min_confidence: float = 0.7,
        min_response_length: int = 50,
    ) -> int:
        """Export high-quality entries as training examples in JSONL.

        Each line is a chat-format training example suitable for fine-tuning::

            {"messages": [{"role": "system", "content": "..."},
                          {"role": "user", "content": "..."},
                          {"role": "assistant", "content": "..."}]}

        Returns the number of examples written.
        """
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)

        candidates = [
            e for e in self._entries
            if e.confidence >= min_confidence
            and len(e.response) >= min_response_length
            and e.verdict == "ALLOW"
        ]

        count = 0
        with open(path, "w") as f:
            for entry in candidates:
                messages = []
                if entry.system_prompt:
                    messages.append({"role": "system", "content": entry.system_prompt})
                messages.append({"role": "user", "content": entry.prompt})
                messages.append({"role": "assistant", "content": entry.response})

                example = {"messages": messages}
                f.write(json.dumps(example, ensure_ascii=False) + "\n")
                count += 1

        logger.info(
            "Exported %d trainable examples to %s (from %d candidates)",
            count, path, len(candidates),
        )
        return count

    def clear(self) -> None:
        """Clear all collected entries."""
        self._entries.clear()

    def _append_to_disk(self, entry: InferenceLogEntry) -> None:
        """Append a single entry to the persistence file."""
        if not self._persist_path:
            return
        try:
            self._persist_path.parent.mkdir(parents=True, exist_ok=True)
            with open(self._persist_path, "a") as f:
                f.write(json.dumps(entry.to_dict(), ensure_ascii=False) + "\n")
        except Exception as exc:
            logger.warning("Failed to persist log entry: %s", exc)

    def __repr__(self) -> str:
        return (
            f"InferenceLogCollector(entries={len(self._entries)}, "
            f"max={self._max_entries})"
        )
