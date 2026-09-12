"""
curate.curate_layer — Layer 6: Data Curation
=============================================

The DataCurationLayer is the sixth and final layer in the resilience stack.
It sits after the UserExperience layer and is purely observational — it
never blocks or degrades responses.  Instead, it:

1. Logs every inference to the InferenceLogCollector
2. Diagnoses failures via the FailureTaxonomy
3. Accumulates training signals for fine-tuning

This layer implements Pioneer Agent's "observe and learn" pattern:
every production inference call becomes a potential training example,
and every failure becomes a targeted improvement signal.

Architecture
------------
Request flow (updated)::

    ┌─────────────┐   ┌──────────┐   ┌────────────┐   ┌───────────────┐   ┌────────────────┐   ┌─────────────────┐
    │  1. Gateway │──▶│ 2. Parity│──▶│3. Governance│──▶│4. State Machine│──▶│5. User Experience│──▶│6. Data Curation  │
    │  (failover) │   │(quality) │   │  (PII)     │   │ (CHP states)  │   │  (degradation) │   │ (log + diagnose) │
    └─────────────┘   └──────────┘   └────────────┘   └───────────────┘   └────────────────┘   └─────────────────┘
"""

from __future__ import annotations

import logging
import time
from typing import Any

from curate.failure_taxonomy import FailureTaxonomy
from curate.log_collector import InferenceLogCollector
from layers.resilience_stack import (
    BaseResilienceLayer,
    ResilienceContext,
    ResilienceEvent,
    ResilienceEventType,
    ResilienceLayer,
)


# Sentinel value for Layer 6 — cannot be added to the enum without
# modifying the shared layers package, so we use an integer directly.
LAYER_6_VALUE = 6

logger = logging.getLogger("cfo_resilience.curate.layer")


# New event types for data curation
_DATA_CURATION_EVENT_TYPES = {
    "LOGGED": "LOGGED",
    "FAILURE_DIAGNOSED": "FAILURE_DIAGNOSED",
    "TRAINING_SIGNAL": "TRAINING_SIGNAL",
}


class DataCurationLayer(BaseResilienceLayer):
    """Observational layer that logs inferences and diagnoses failures.

    This layer NEVER blocks or modifies the response.  It sits at the end
    of the stack and purely observes, classifies, and accumulates data
    for downstream fine-tuning.

    Parameters
    ----------
    collector : InferenceLogCollector | None
        The inference log collector.  If None, a new one is created.
    taxonomy : FailureTaxonomy | None
        The failure taxonomy classifier.  If None, a new one is created.
    chaos_scenario : str
        The active chaos scenario (for log metadata).
    """

    layer: ResilienceLayer = ResilienceLayer.DATA_CURATION

    def __init__(
        self,
        collector: InferenceLogCollector | None = None,
        taxonomy: FailureTaxonomy | None = None,
        chaos_scenario: str = "",
    ) -> None:
        self._collector = collector or InferenceLogCollector()
        self._taxonomy = taxonomy or FailureTaxonomy()
        self._chaos_scenario = chaos_scenario
        self._log_count: int = 0
        self._diagnosis_count: int = 0

    @property
    def collector(self) -> InferenceLogCollector:
        """Access the inference log collector."""
        return self._collector

    @property
    def taxonomy(self) -> FailureTaxonomy:
        """Access the failure taxonomy."""
        return self._taxonomy

    @property
    def log_count(self) -> int:
        return self._log_count

    @property
    def diagnosis_count(self) -> int:
        return self._diagnosis_count

    def evaluate(self, context: ResilienceContext) -> ResilienceContext:
        """Log the inference and diagnose any failures.

        This method never modifies the verdict, confidence, or response.
        It is purely observational.
        """
        start = time.monotonic()

        # Extract event types for diagnosis
        event_types: list[str] = []
        for ev in context.events:
            et = ev.event_type.value if hasattr(ev.event_type, "value") else str(ev.event_type)
            event_types.append(et)

        # Determine verdict string
        v = context.verdict
        verdict_str = v.value if hasattr(v, "value") else str(v)

        # Determine decision state string
        ds = context.decision_state
        ds_str = ds.value if hasattr(ds, "value") else str(ds)

        # Log the inference
        entry = self._collector.log(
            prompt=context.prompt,
            response=context.response,
            agent_name=context.agent_name,
            system_prompt=(
                context.messages[0].get("content", "")
                if context.messages and context.messages[0].get("role") == "system"
                else ""
            ),
            confidence=context.confidence,
            verdict=verdict_str,
            degradation_level=context.degradation_level,
            decision_state=ds_str,
            latency_ms=context.total_latency_ms,
            model=context.metadata.get("model", ""),
            providers_tried=context.providers_tried,
            pii_flags=context.pii_flags,
            event_types=event_types,
            chaos_scenario=self._chaos_scenario,
            metadata=context.metadata,
        )
        self._log_count += 1

        # Diagnose failures
        diagnosis = self._taxonomy.diagnose(
            verdict=verdict_str,
            confidence=context.confidence,
            degradation_level=context.degradation_level,
            decision_state=ds_str,
            event_types=event_types,
            pii_flags=context.pii_flags,
            response=context.response,
            prompt=context.prompt,
            providers_tried=context.providers_tried,
        )
        self._diagnosis_count += 1

        elapsed_ms = (time.monotonic() - start) * 1000

        # Emit events (observational only — never modify context)
        context.emit_event(
            layer=ResilienceLayer.DATA_CURATION,
            event_type=ResilienceEventType.ALLOW,
            provider=context.metadata.get("model", ""),
            details={
                "curation_action": "logged",
                "entry_id": entry.entry_id,
                "is_failure": entry.is_failure,
                "is_high_quality": entry.is_high_quality,
            },
            duration_ms=elapsed_ms,
        )

        # If failure was diagnosed, emit a diagnostic event
        if entry.is_failure or diagnosis.category.value != "unknown":
            context.emit_event(
                layer=ResilienceLayer.DATA_CURATION,
                event_type=ResilienceEventType.DEGRADE,  # Signal for observability
                provider=context.metadata.get("model", ""),
                details={
                    "curation_action": "failure_diagnosed",
                    "failure_category": diagnosis.category.value,
                    "failure_severity": diagnosis.severity.value,
                    "diagnosis_confidence": diagnosis.confidence_score,
                    "remediation_count": len(diagnosis.remediation),
                },
                duration_ms=0.0,
            )

        # Store diagnosis in metadata
        context.metadata["curation"] = {
            "entry_id": entry.entry_id,
            "is_failure": entry.is_failure,
            "is_high_quality": entry.is_high_quality,
            "failure_diagnosis": diagnosis.to_dict(),
        }

        logger.debug(
            "DataCurationLayer: logged entry %s, failure=%s, diagnosis=%s",
            entry.entry_id,
            entry.is_failure,
            diagnosis.category.value,
        )

        return context

    def get_status(self) -> dict[str, Any]:
        """Return the current status of the data curation layer."""
        collector_stats = self._collector.get_stats()
        taxonomy_report = self._taxonomy.get_taxonomy_report()

        return {
            "log_count": self._log_count,
            "diagnosis_count": self._diagnosis_count,
            "collector_stats": collector_stats,
            "taxonomy_report": taxonomy_report,
        }

    def reset(self) -> None:
        """Reset the layer state (clear logs and taxonomy counts)."""
        self._collector.clear()
        self._taxonomy.reset()
        self._log_count = 0
        self._diagnosis_count = 0

    def __repr__(self) -> str:
        return (
            f"DataCurationLayer(logs={self._log_count}, "
            f"diagnoses={self._diagnosis_count})"
        )
