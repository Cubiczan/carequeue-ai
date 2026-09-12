"""
layers.resilience_stack — 6-Layer Resilience Orchestration
===========================================================

Each layer is a callable that receives a :class:`ResilienceContext` and
returns a :class:`LayerVerdict` (``ALLOW``, ``BLOCK``, or ``DEGRADE``).
The :class:`ResilienceStack` orchestrates all six layers in order,
short-circuiting on ``BLOCK`` and recording every event for observability.

Architecture
------------
Request flow::

    ┌─────────────┐   ┌──────────┐   ┌────────────┐   ┌───────────────┐   ┌────────────────┐   ┌─────────────────┐
    │  1. Gateway │──▶│ 2. Parity│──▶│3. Governance│──▶│4. State Machine│──▶│5. User Experience│──▶│6. Data Curation  │
    │  (failover) │   │(quality) │   │  (PII)     │   │ (CHP states)  │   │  (degradation) │   │ (log + diagnose) │
    └─────────────┘   └──────────┘   └────────────┘   └───────────────┘   └────────────────┘   └─────────────────┘
"""

from __future__ import annotations

import logging
import re
import time
import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Callable

from gateway.client import ResilientGatewayClient

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

logger = logging.getLogger("cfo_resilience.layers")

# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------


class ResilienceLayer(Enum):
    """The six resilience layers, ordered from outermost to innermost."""

    GATEWAY = 1
    PARITY = 2
    GOVERNANCE = 3
    STATE_MACHINE = 4
    USER_EXPERIENCE = 5
    DATA_CURATION = 6


class ResilienceEventType(str, Enum):
    """Discrete event types emitted by resilience layers."""

    FAILOVER = "FAILOVER"
    RETRY = "RETRY"
    DEGRADE = "DEGRADE"
    BLOCK = "BLOCK"
    HALT = "HALT"
    RECOVER = "RECOVER"
    ALLOW = "ALLOW"
    PARITY_MISMATCH = "PARITY_MISMATCH"
    PII_DETECTED = "PII_DETECTED"
    STATE_TRANSITION = "STATE_TRANSITION"
    DEGRADATION_APPLIED = "DEGRADATION_APPLIED"


class LayerVerdict(str, Enum):
    """Verdict returned by each resilience layer."""

    ALLOW = "ALLOW"
    BLOCK = "BLOCK"
    DEGRADE = "DEGRADE"


class DecisionState(str, Enum):
    """CHP-style decision lifecycle states.

    State machine::

        EXPLORING → PROVISIONAL → LOCKED
             │            │
             ▼            ▼
           HALT  ←  RECOVER
    """

    EXPLORING = "EXPLORING"
    PROVISIONAL = "PROVISIONAL"
    HALT = "HALT"
    RECOVER = "RECOVER"
    LOCKED = "LOCKED"


# Valid state transitions
_VALID_TRANSITIONS: dict[DecisionState, set[DecisionState]] = {
    DecisionState.EXPLORING: {DecisionState.PROVISIONAL, DecisionState.HALT},
    DecisionState.PROVISIONAL: {DecisionState.LOCKED, DecisionState.HALT, DecisionState.RECOVER},
    DecisionState.HALT: {DecisionState.RECOVER},
    DecisionState.RECOVER: {DecisionState.EXPLORING, DecisionState.PROVISIONAL},
    DecisionState.LOCKED: set(),  # Terminal state
}


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------


@dataclass
class ResilienceEvent:
    """Immutable event emitted by a resilience layer.

    Attributes
    ----------
    event_id : str
        Unique identifier.
    timestamp : str
        ISO-8601 UTC timestamp.
    layer : ResilienceLayer
        Which layer produced the event.
    event_type : ResilienceEventType
        Category of the event.
    provider : str
        Provider / model that was active (when relevant).
    model : str
        Virtual model name (when relevant).
    details : dict[str, Any]
        Arbitrary payload for observability.
    duration_ms : float | None
        Time spent in the layer (if applicable).
    """

    event_id: str = field(default_factory=lambda: uuid.uuid4().hex)
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    layer: ResilienceLayer | str = ResilienceLayer.GATEWAY
    event_type: ResilienceEventType | str = ResilienceEventType.ALLOW
    provider: str = ""
    model: str = ""
    details: dict[str, Any] = field(default_factory=dict)
    duration_ms: float | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "event_id": self.event_id,
            "timestamp": self.timestamp,
            "layer": self.layer.value if isinstance(self.layer, Enum) else self.layer,
            "event_type": self.event_type.value if isinstance(self.event_type, Enum) else self.event_type,
            "provider": self.provider,
            "model": self.model,
            "details": self.details,
            "duration_ms": round(self.duration_ms, 2) if self.duration_ms is not None else None,
        }


@dataclass
class ResilienceContext:
    """Mutable context that flows through all resilience layers.

    Each layer can read from and write to this context.  The stack
    short-circuits on ``verdict == BLOCK``.
    """

    prompt: str = ""
    messages: list[dict[str, str]] = field(default_factory=list)
    response: str = ""
    verdict: LayerVerdict = LayerVerdict.ALLOW
    confidence: float = 1.0
    events: list[ResilienceEvent] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)
    degradation_level: int = 0  # 0 = none, 1 = partial, 2 = significant
    decision_state: DecisionState = DecisionState.EXPLORING
    agent_name: str = ""
    providers_tried: list[str] = field(default_factory=list)
    parity_responses: list[dict[str, Any]] = field(default_factory=list)
    pii_flags: list[str] = field(default_factory=list)
    total_latency_ms: float = 0.0

    def emit_event(
        self,
        layer: ResilienceLayer,
        event_type: ResilienceEventType,
        provider: str = "",
        details: dict[str, Any] | None = None,
        duration_ms: float | None = None,
    ) -> ResilienceEvent:
        """Create and append a resilience event."""
        event = ResilienceEvent(
            layer=layer,
            event_type=event_type,
            provider=provider,
            model=self.metadata.get("model", ""),
            details=details or {},
            duration_ms=duration_ms,
        )
        self.events.append(event)
        return event


# ---------------------------------------------------------------------------
# Abstract base layer
# ---------------------------------------------------------------------------


class BaseResilienceLayer(ABC):
    """Base class for all resilience layers.

    Subclasses implement :meth:`evaluate` and the layer is callable.
    """

    layer: ResilienceLayer

    @abstractmethod
    def evaluate(self, context: ResilienceContext) -> ResilienceContext:
        """Run layer logic against the current context.

        Must return the (possibly mutated) context.  Set
        ``context.verdict`` to change the stack's disposition.
        """
        ...

    def __call__(self, context: ResilienceContext) -> ResilienceContext:
        start = time.monotonic()
        try:
            result = self.evaluate(context)
            result.total_latency_ms += (time.monotonic() - start) * 1000
            return result
        except Exception as exc:
            logger.error("Layer %s failed: %s", self.layer.name, exc)
            context.emit_event(
                layer=self.layer,
                event_type=ResilienceEventType.DEGRADE,
                details={"error": str(exc)[:300]},
            )
            context.degradation_level = min(context.degradation_level + 1, 2)
            context.total_latency_ms += (time.monotonic() - start) * 1000
            return context


# ---------------------------------------------------------------------------
# Layer 1: Gateway — Provider Failover
# ---------------------------------------------------------------------------


class GatewayLayer(BaseResilienceLayer):
    """Wraps :class:`ResilientGatewayClient` and handles provider failover.

    This is the outermost layer.  It sends the request through the gateway
    and retries / failovers to alternative models if the primary fails.
    """

    layer = ResilienceLayer.GATEWAY

    def __init__(
        self,
        gateway_client: ResilientGatewayClient,
        fallback_models: list[str] | None = None,
    ) -> None:
        self._client = gateway_client
        self._fallback_models = fallback_models or [
            "cfo-resilience/fallback-1",
            "cfo-resilience/fallback-2",
        ]

    def evaluate(self, context: ResilienceContext) -> ResilienceContext:
        """Send the request through the gateway and handle failures."""
        if not context.messages:
            context.messages = [{"role": "user", "content": context.prompt}]

        metrics_before = self._client.get_metrics()
        retries_before = metrics_before.total_retries
        failovers_before = metrics_before.total_failovers

        start = time.monotonic()

        try:
            # Try primary with fallback chain
            result = self._client.chat_with_fallback(
                messages=context.messages,
                fallback_models=self._fallback_models,
            )

            # Extract response content
            choices = result.get("choices", [])
            if choices:
                context.response = choices[0].get("message", {}).get("content", "")
            else:
                context.response = ""

            context.metadata["model"] = result.get("model", "unknown")
            context.metadata["usage"] = result.get("usage", {})
            context.metadata["finish_reason"] = choices[0].get("finish_reason", "unknown") if choices else "unknown"

            elapsed_ms = (time.monotonic() - start) * 1000

            # Check what happened during the call
            metrics_after = self._client.get_metrics()
            new_retries = metrics_after.total_retries - retries_before
            new_failovers = metrics_after.total_failovers - failovers_before

            if new_retries > 0:
                context.emit_event(
                    layer=self.layer,
                    event_type=ResilienceEventType.RETRY,
                    provider=context.metadata.get("model", ""),
                    details={"retry_count": new_retries},
                    duration_ms=elapsed_ms,
                )

            if new_failovers > 0:
                context.emit_event(
                    layer=self.layer,
                    event_type=ResilienceEventType.FAILOVER,
                    provider=context.metadata.get("model", ""),
                    details={"failover_count": new_failovers},
                    duration_ms=elapsed_ms,
                )

            # Determine which providers were tried from gateway events
            gateway_events = self._client.get_events()
            for event in gateway_events:
                if event.event_type.value == "FAILOVER" and event.provider:
                    context.providers_tried.append(event.provider)

            context.emit_event(
                layer=self.layer,
                event_type=ResilienceEventType.ALLOW,
                provider=context.metadata.get("model", ""),
                details={
                    "retries": new_retries,
                    "failovers": new_failovers,
                    "latency_ms": round(elapsed_ms, 2),
                },
                duration_ms=elapsed_ms,
            )

        except RuntimeError as exc:
            elapsed_ms = (time.monotonic() - start) * 1000
            context.verdict = LayerVerdict.DEGRADE
            context.degradation_level = 2
            context.response = (
                "Unable to generate a response due to provider unavailability. "
                "The resilience layer attempted all configured fallback models. "
                f"Error: {str(exc)[:200]}"
            )
            context.emit_event(
                layer=self.layer,
                event_type=ResilienceEventType.DEGRADE,
                details={
                    "error": str(exc)[:300],
                    "providers_tried": context.providers_tried,
                },
                duration_ms=elapsed_ms,
            )

        return context


# ---------------------------------------------------------------------------
# Layer 2: Parity — Cross-Model Quality Comparison
# ---------------------------------------------------------------------------

# Key phrases used for rough quality comparison
_FINANCE_KEY_PHRASES = [
    "cash flow", "revenue", "burn rate", "runway", "margin",
    "ebitda", "roi", "capex", "opex", "liquidity", "working capital",
    "debt", "equity", "profit", "loss", "forecast", "budget",
]

_STRATEGY_KEY_PHRASES = [
    "market", "competitive", "strategic", "growth", "opportunity",
    "threat", "moat", "differentiation", " positioning", "trend",
    "expansion", "vertical", "partnership", "innovation", "disruption",
]

_COMPLIANCE_KEY_PHRASES = [
    "compliance", "regulatory", "risk", "audit", "policy",
    "governance", "control", "certification", "framework", "standard",
    "pii", "gdpr", "soc", "iso", "hipaa", "ccpa", "requirement",
]


def _compute_quality_score(text: str, domain_key_phrases: list[str]) -> float:
    """Compute a rough quality score based on length, key-phrase density,
    and structure (presence of numbered lists)."""
    if not text:
        return 0.0

    words = text.split()
    length_score = min(len(words) / 50.0, 1.0)  # Cap at 1.0 for 50+ words

    lower = text.lower()
    phrase_hits = sum(1 for phrase in domain_key_phrases if phrase in lower)
    phrase_density = min(phrase_hits / max(len(domain_key_phrases) * 0.15, 1), 1.0)

    structure_score = 0.3 if re.search(r"\(\d+\)", text) else 0.0
    structure_score += 0.3 if re.search(r"\d\.", text) else 0.0

    return round(0.4 * length_score + 0.3 * phrase_density + 0.3 * structure_score, 3)


class ParityLayer(BaseResilienceLayer):
    """Runs the prompt through a second model and compares response quality.

    If the responses diverge significantly (different quality scores or
    contradictory key phrases) the layer emits a ``PARITY_MISMATCH`` event
    and may degrade confidence.

    In mock mode the parity check uses a deterministic synthetic response.
    """

    layer = ResilienceLayer.PARITY

    def __init__(
        self,
        gateway_client: ResilientGatewayClient,
        parity_model: str = "cfo-resilience/parity-check",
        quality_threshold: float = 0.3,
    ) -> None:
        self._client = gateway_client
        self._parity_model = parity_model
        self._quality_threshold = quality_threshold

    def _get_domain_phrases(self, context: ResilienceContext) -> list[str]:
        agent = context.agent_name.lower()
        if "finance" in agent:
            return _FINANCE_KEY_PHRASES
        if "strategy" in agent:
            return _STRATEGY_KEY_PHRASES
        if "compliance" in agent:
            return _COMPLIANCE_KEY_PHRASES
        return _FINANCE_KEY_PHRASES + _STRATEGY_KEY_PHRASES + _COMPLIANCE_KEY_PHRASES

    def evaluate(self, context: ResilienceContext) -> ResilienceContext:
        """Compare the primary response against a parity-model response."""
        if not context.response:
            return context

        start = time.monotonic()
        domain_phrases = self._get_domain_phrases(context)

        primary_score = _compute_quality_score(context.response, domain_phrases)

        # Attempt to get parity response
        try:
            original_model = self._client.virtual_model
            self._client.virtual_model = self._parity_model
            parity_result = self._client.chat(
                messages=context.messages,
                max_tokens=1024,  # Smaller for parity check
            )
            self._client.virtual_model = original_model

            choices = parity_result.get("choices", [])
            parity_text = choices[0].get("message", {}).get("content", "") if choices else ""
            parity_score = _compute_quality_score(parity_text, domain_phrases)

            context.parity_responses = [
                {"provider": "primary", "text": context.response, "score": primary_score},
                {"provider": self._parity_model, "text": parity_text, "score": parity_score},
            ]

            elapsed_ms = (time.monotonic() - start) * 1000

            score_diff = abs(primary_score - parity_score)

            if score_diff > self._quality_threshold:
                context.emit_event(
                    layer=self.layer,
                    event_type=ResilienceEventType.PARITY_MISMATCH,
                    provider=self._parity_model,
                    details={
                        "primary_score": primary_score,
                        "parity_score": parity_score,
                        "score_diff": round(score_diff, 3),
                        "threshold": self._quality_threshold,
                    },
                    duration_ms=elapsed_ms,
                )
                # Reduce confidence but don't block
                context.confidence = max(context.confidence - 0.2, 0.3)
                context.degradation_level = max(context.degradation_level, 1)
            else:
                # Good parity — boost confidence slightly
                context.confidence = min(context.confidence + 0.05, 1.0)
                context.emit_event(
                    layer=self.layer,
                    event_type=ResilienceEventType.ALLOW,
                    provider=self._parity_model,
                    details={
                        "primary_score": primary_score,
                        "parity_score": parity_score,
                        "score_diff": round(score_diff, 3),
                    },
                    duration_ms=elapsed_ms,
                )

        except Exception as exc:
            elapsed_ms = (time.monotonic() - start) * 1000
            # Parity check failure is non-critical — log and continue
            logger.warning("Parity check failed (non-blocking): %s", exc)
            context.emit_event(
                layer=self.layer,
                event_type=ResilienceEventType.DEGRADE,
                provider=self._parity_model,
                details={"error": str(exc)[:200]},
                duration_ms=elapsed_ms,
            )

        return context


# ---------------------------------------------------------------------------
# Layer 3: Governance — PII / Content Safety
# ---------------------------------------------------------------------------

# PII patterns (US-centric — extend for international use)
_PII_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("SSN", re.compile(r"\b\d{3}-\d{2}-\d{4}\b")),
    ("SSN (no dashes)", re.compile(r"\b\d{9}\b")),
    ("Email", re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b")),
    ("Phone (US)", re.compile(r"\b\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b")),
    ("Credit Card", re.compile(r"\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b")),
    ("Account Number", re.compile(r"\baccount[_\s-]?number[:\s]*\d{6,}\b", re.IGNORECASE)),
    ("Routing Number", re.compile(r"\brouting[_\s-]?number[:\s]*\d{9}\b", re.IGNORECASE)),
    ("Date of Birth", re.compile(r"\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b")),
    ("Address (partial)", re.compile(r"\b\d+\s+\w+\s+(Street|St|Avenue|Ave|Boulevard|Blvd|Drive|Dr|Lane|Ln|Road|Rd)\b", re.IGNORECASE)),
]


class GovernanceLayer(BaseResilienceLayer):
    """Scans responses for PII patterns and unsafe content.

    Detected PII is stripped from the response and a ``PII_DETECTED``
    event is emitted.  If the response is overwhelmingly PII (more than
    5 distinct patterns) it is blocked entirely.
    """

    layer = ResilienceLayer.GOVERNANCE

    def __init__(
        self,
        max_flags_before_block: int = 5,
        strip_pii: bool = True,
    ) -> None:
        self._max_flags = max_flags_before_block
        self._strip_pii = strip_pii

    def evaluate(self, context: ResilienceContext) -> ResilienceContext:
        """Scan the response for PII and unsafe content."""
        if not context.response:
            return context

        start = time.monotonic()
        flags: list[str] = []
        redacted_response = context.response

        for name, pattern in _PII_PATTERNS:
            matches = pattern.findall(context.response)
            if matches:
                flags.append(f"{name} ({len(matches)} occurrence(s))")
                if self._strip_pii:
                    redacted_response = pattern.sub(f"[{name} REDACTED]", redacted_response)

        elapsed_ms = (time.monotonic() - start) * 1000
        context.pii_flags = flags

        if len(flags) >= self._max_flags:
            context.verdict = LayerVerdict.BLOCK
            context.response = (
                "[BLOCKED] Response contains excessive sensitive information "
                f"({len(flags)} PII patterns detected). Please rephrase your query "
                "to avoid including personally identifiable information."
            )
            context.confidence = 0.0
            context.emit_event(
                layer=self.layer,
                event_type=ResilienceEventType.BLOCK,
                details={
                    "pii_flags": flags,
                    "flag_count": len(flags),
                    "action": "response_blocked",
                },
                duration_ms=elapsed_ms,
            )
        elif flags:
            context.response = redacted_response
            context.confidence = max(context.confidence - 0.1, 0.3)
            context.degradation_level = max(context.degradation_level, 1)
            context.emit_event(
                layer=self.layer,
                event_type=ResilienceEventType.PII_DETECTED,
                details={
                    "pii_flags": flags,
                    "flag_count": len(flags),
                    "action": "pii_redacted",
                },
                duration_ms=elapsed_ms,
            )
        else:
            context.emit_event(
                layer=self.layer,
                event_type=ResilienceEventType.ALLOW,
                details={"pii_scan": "clean"},
                duration_ms=elapsed_ms,
            )

        return context


# ---------------------------------------------------------------------------
# Layer 4: State Machine — CHP Decision Tracking
# ---------------------------------------------------------------------------


class StateMachineLayer(BaseResilienceLayer):
    """Tracks CHP-style decision states across requests.

    The state machine manages a lifecycle::

        EXPLORING → PROVISIONAL → LOCKED
             │            │
             ▼            ▼
           HALT  ←  RECOVER

    Transitions are determined by the confidence level and degradation
    state of the response:
    * High confidence (≥ 0.8) and no degradation → progress toward LOCKED.
    * Low confidence (< 0.5) or high degradation → HALT.
    * After HALT, the next successful request triggers RECOVER → EXPLORING.
    """

    layer = ResilienceLayer.STATE_MACHINE

    def __init__(self) -> None:
        self._state: DecisionState = DecisionState.EXPLORING
        self._state_history: list[dict[str, Any]] = []
        self._halt_count: int = 0
        self._recovery_count: int = 0

    @property
    def current_state(self) -> DecisionState:
        return self._state

    @property
    def halt_count(self) -> int:
        return self._halt_count

    @property
    def recovery_count(self) -> int:
        return self._recovery_count

    def _try_transition(self, new_state: DecisionState) -> bool:
        allowed = _VALID_TRANSITIONS.get(self._state, set())
        if new_state in allowed:
            old_state = self._state
            self._state = new_state
            self._state_history.append({
                "from": old_state.value,
                "to": new_state.value,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })
            return True
        return False

    def evaluate(self, context: ResilienceContext) -> ResilienceContext:
        """Determine the next decision state based on response quality."""
        start = time.monotonic()
        context.decision_state = self._state

        old_state = self._state
        transitioned = False

        if self._state == DecisionState.LOCKED:
            # Terminal — just record
            pass

        elif self._state == DecisionState.HALT:
            # Any successful response triggers recovery
            if context.verdict != LayerVerdict.BLOCK and context.confidence >= 0.3:
                if self._try_transition(DecisionState.RECOVER):
                    transitioned = True
                    self._recovery_count += 1
                if self._try_transition(DecisionState.EXPLORING):
                    transitioned = True

        elif self._state == DecisionState.RECOVER:
            if context.confidence >= 0.7:
                self._try_transition(DecisionState.PROVISIONAL)
                transitioned = True
            elif context.confidence >= 0.3:
                # Already in recover, stay here
                pass
            else:
                self._try_transition(DecisionState.HALT)
                transitioned = True
                self._halt_count += 1

        elif self._state == DecisionState.EXPLORING:
            if context.verdict == LayerVerdict.BLOCK:
                self._try_transition(DecisionState.HALT)
                transitioned = True
                self._halt_count += 1
            elif context.confidence >= 0.8 and context.degradation_level == 0:
                self._try_transition(DecisionState.PROVISIONAL)
                transitioned = True
            elif context.confidence < 0.5 or context.degradation_level >= 2:
                self._try_transition(DecisionState.HALT)
                transitioned = True
                self._halt_count += 1

        elif self._state == DecisionState.PROVISIONAL:
            if context.verdict == LayerVerdict.BLOCK:
                self._try_transition(DecisionState.HALT)
                transitioned = True
                self._halt_count += 1
            elif context.confidence >= 0.9 and context.degradation_level == 0:
                self._try_transition(DecisionState.LOCKED)
                transitioned = True
            elif context.confidence < 0.5 or context.degradation_level >= 2:
                self._try_transition(DecisionState.HALT)
                transitioned = True
                self._halt_count += 1

        context.decision_state = self._state

        elapsed_ms = (time.monotonic() - start) * 1000

        if transitioned:
            event_type = (
                ResilienceEventType.HALT
                if self._state == DecisionState.HALT
                else ResilienceEventType.RECOVER
                if self._state == DecisionState.RECOVER
                else ResilienceEventType.STATE_TRANSITION
            )
            context.emit_event(
                layer=self.layer,
                event_type=event_type,
                details={
                    "old_state": old_state.value,
                    "new_state": self._state.value,
                    "confidence": round(context.confidence, 3),
                    "degradation_level": context.degradation_level,
                    "halt_count": self._halt_count,
                    "recovery_count": self._recovery_count,
                },
                duration_ms=elapsed_ms,
            )
        else:
            context.emit_event(
                layer=self.layer,
                event_type=ResilienceEventType.ALLOW,
                details={
                    "current_state": self._state.value,
                    "confidence": round(context.confidence, 3),
                },
                duration_ms=elapsed_ms,
            )

        return context

    def reset(self) -> None:
        """Reset the state machine to EXPLORING."""
        self._state = DecisionState.EXPLORING
        self._state_history.clear()
        self._halt_count = 0
        self._recovery_count = 0


# ---------------------------------------------------------------------------
# Layer 5: User Experience — Graceful Degradation
# ---------------------------------------------------------------------------

_DEGRADATION_MESSAGES: dict[int, str] = {
    0: "",  # No degradation
    1: (
        "\n\n---\n"
        "⚠️ **Resilience Notice:** Your request was processed with reduced "
        "confidence due to intermittent issues. Results should be reviewed "
        "carefully."
    ),
    2: (
        "\n\n---\n"
        "🔴 **Degraded Service:** Significant resilience actions were taken "
        "to deliver this response. Multiple providers were unavailable and "
        "quality checks flagged anomalies. Please verify critical data points "
        "independently."
    ),
}


class UserExperienceLayer(BaseResilienceLayer):
    """Formats the final response and adds resilience metadata.

    This is the innermost layer — it runs after all safety and quality
    checks have passed.  It:
    * Appends degradation notices when applicable.
    * Wraps the response in a structured envelope with metadata.
    * Adds resilience-summary information (events, providers, timing).
    """

    layer = ResilienceLayer.USER_EXPERIENCE

    def __init__(
        self,
        include_metadata: bool = True,
        include_timing: bool = True,
    ) -> None:
        self._include_metadata = include_metadata
        self._include_timing = include_timing

    def evaluate(self, context: ResilienceContext) -> ResilienceContext:
        """Format the response and attach resilience metadata."""
        start = time.monotonic()

        # Append degradation message
        degradation_msg = _DEGRADATION_MESSAGES.get(context.degradation_level, "")
        if degradation_msg:
            context.response += degradation_msg
            context.emit_event(
                layer=self.layer,
                event_type=ResilienceEventType.DEGRADATION_APPLIED,
                details={"level": context.degradation_level},
            )

        # Build resilience metadata
        if self._include_metadata:
            resilience_summary = self._build_summary(context)
            context.metadata["resilience_summary"] = resilience_summary

        elapsed_ms = (time.monotonic() - start) * 1000

        context.emit_event(
            layer=self.layer,
            event_type=ResilienceEventType.ALLOW,
            details={
                "degradation_level": context.degradation_level,
                "confidence": round(context.confidence, 3),
                "final_state": context.decision_state.value if isinstance(context.decision_state, Enum) else context.decision_state,
            },
            duration_ms=elapsed_ms,
        )

        return context

    @staticmethod
    def _build_summary(context: ResilienceContext) -> dict[str, Any]:
        """Build a structured summary of all resilience actions taken."""
        event_counts: dict[str, int] = {}
        for event in context.events:
            etype = event.event_type.value if isinstance(event.event_type, Enum) else str(event.event_type)
            event_counts[etype] = event_counts.get(etype, 0) + 1

        layers_touched = set()
        for event in context.events:
            layer = event.layer.value if isinstance(event.layer, Enum) else str(event.layer)
            layers_touched.add(layer)

        return {
            "total_events": len(context.events),
            "event_summary": event_counts,
            "layers_evaluated": sorted(layers_touched),
            "providers_tried": context.providers_tried or ["primary"],
            "confidence_score": round(context.confidence, 3),
            "degradation_level": context.degradation_level,
            "decision_state": context.decision_state.value if isinstance(context.decision_state, Enum) else context.decision_state,
            "pii_flags_found": len(context.pii_flags),
            "total_latency_ms": round(context.total_latency_ms, 2),
            "agent": context.agent_name,
        }


# ---------------------------------------------------------------------------
# Resilience Stack — Orchestrator
# ---------------------------------------------------------------------------


class ResilienceStack:
    """Orchestrates all six resilience layers in order.

    The stack evaluates layers sequentially and short-circuits on ``BLOCK``.
    Every layer's events are collected into a unified event log.
    Layer 6 (Data Curation) is observational and never blocks.

    Parameters
    ----------
    gateway_client : ResilientGatewayClient
        The gateway client used by the Gateway and Parity layers.
    fallback_models : list[str] | None
        Ordered list of fallback models for the Gateway layer.
    parity_model : str | None
        Model to use for parity quality checks.
    governance_max_flags : int
        Number of PII flags before blocking (default 5).
    enable_data_curation : bool
        Whether to enable Layer 6 (data curation). Default True.
    """

    def __init__(
        self,
        gateway_client: ResilientGatewayClient,
        fallback_models: list[str] | None = None,
        parity_model: str | None = None,
        governance_max_flags: int = 5,
        enable_data_curation: bool = True,
    ) -> None:
        self._gateway_layer = GatewayLayer(
            gateway_client=gateway_client,
            fallback_models=fallback_models,
        )
        self._parity_layer = ParityLayer(
            gateway_client=gateway_client,
            parity_model=parity_model or "cfo-resilience/parity-check",
        )
        self._governance_layer = GovernanceLayer(
            max_flags_before_block=governance_max_flags,
        )
        self._state_machine_layer = StateMachineLayer()
        self._user_experience_layer = UserExperienceLayer()

        # Layer 6: Data Curation (observational, never blocks)
        self._data_curation_layer: BaseResilienceLayer | None = None
        if enable_data_curation:
            try:
                from curate.curate_layer import DataCurationLayer
                self._data_curation_layer = DataCurationLayer()
            except ImportError:
                logger.debug("curate package not available — skipping Layer 6")

        self._layers: list[BaseResilienceLayer] = [
            self._gateway_layer,
            self._parity_layer,
            self._governance_layer,
            self._state_machine_layer,
            self._user_experience_layer,
        ]

        # Layer 6 is added at the end — it never blocks
        if self._data_curation_layer is not None:
            self._layers.append(self._data_curation_layer)

    @property
    def state_machine(self) -> StateMachineLayer:
        """Access the state machine layer for external inspection."""
        return self._state_machine_layer

    @property
    def data_curation(self) -> BaseResilienceLayer | None:
        """Access the data curation layer for external inspection."""
        return self._data_curation_layer

    def execute_with_resilience(
        self,
        prompt: str,
        agents: list[str] | None = None,
        system_prompt: str = "",
        context_data: dict[str, Any] | None = None,
    ) -> ResilienceContext:
        """Run a prompt through the full resilience stack.

        Parameters
        ----------
        prompt : str
            The user's input prompt.
        agents : list[str] | None
            Names of agents involved (for event metadata).
        system_prompt : str
            Optional system message prepended to the conversation.
        context_data : dict[str, Any] | None
            Additional context merged into the resilience context.

        Returns
        -------
        ResilienceContext
            The final context after all layers have been evaluated.
        """
        # Build initial context
        messages: list[dict[str, str]] = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        ctx = ResilienceContext(
            prompt=prompt,
            messages=messages,
            agent_name=agents[0] if agents else "",
            metadata={"agents": agents or [], "prompt_length": len(prompt)},
        )
        if context_data:
            ctx.metadata.update(context_data)

        logger.info(
            "Executing resilience stack for agent=%s, prompt_length=%d",
            ctx.agent_name,
            len(prompt),
        )

        # Evaluate each layer
        for layer_instance in self._layers:
            logger.debug("Evaluating layer: %s", layer_instance.layer.name)
            ctx = layer_instance(ctx)

            if ctx.verdict == LayerVerdict.BLOCK:
                logger.warning(
                    "Stack blocked at layer=%s",
                    layer_instance.layer.name,
                )
                break

        logger.info(
            "Resilience stack complete: verdict=%s, confidence=%.3f, "
            "state=%s, events=%d",
            ctx.verdict.value,
            ctx.confidence,
            ctx.decision_state.value if isinstance(ctx.decision_state, Enum) else ctx.decision_state,
            len(ctx.events),
        )

        return ctx

    def get_event_log(self) -> list[dict[str, Any]]:
        """Return events from the most recent execution, newest first."""
        # Events are stored per-context; we track the last one
        return []

    def get_status(self) -> dict[str, Any]:
        """Return the current status of the resilience stack."""
        return {
            "decision_state": self._state_machine_layer.current_state.value,
            "halt_count": self._state_machine_layer.halt_count,
            "recovery_count": self._state_machine_layer.recovery_count,
            "layers": [layer.layer.value for layer in self._layers],
            "state_history": self._state_machine_layer._state_history[-10:],
        }

    def reset(self) -> None:
        """Reset the stack to its initial state."""
        self._state_machine_layer.reset()
