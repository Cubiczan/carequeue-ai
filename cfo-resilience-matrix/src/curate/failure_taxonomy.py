"""
curate.failure_taxonomy — Failure Classification System
========================================================

Classifies inference failures into a structured taxonomy, inspired by
Pioneer Agent's failure diagnosis component.  Each failure is assigned
a category, severity, and a set of recommended remediation actions.

The taxonomy is designed to drive automated curriculum synthesis:
failures of the same category are grouped, and targeted training data
is generated to address the specific error mode.

Categories
----------
1. **HALLUCINATION**       — Response contains fabricated financial data
2. **PII_LEAK**            — Governance layer flagged PII in response
3. **LOW_CONFIDENCE**      — Confidence below acceptable threshold
4. **TIMEOUT_CASCADE**     — Gateway retried 3x then failover
5. **QUALITY_DEGRADATION**  — Parity check detected quality drop
6. **STATE_HALT**          — State machine transitioned to HALT
7. **RATE_LIMITED**        — Request was throttled (429)
8. **PROVIDER_OUTAGE**     — Provider returned 5xx errors
9. **MCP_FAILURE**         — Tool-call infrastructure failure
10. **CASCADING_FAILURE**   — Multiple providers failing simultaneously
11. **EMPTY_RESPONSE**      — Model returned empty or near-empty text
12. **CONTENT_BLOCKED**     — Response was blocked by governance
13. **UNKNOWN**             — Unclassifiable failure

Usage
-----
::

    taxonomy = FailureTaxonomy()
    diagnosis = taxonomy.diagnose(
        verdict="BLOCK",
        confidence=0.2,
        degradation_level=2,
        decision_state="HALT",
        event_types=["PII_DETECTED", "BLOCK"],
        pii_flags=["SSN (1)", "Email (1)"],
    )
    print(diagnosis.category)   # "PII_LEAK"
    print(diagnosis.severity)   # "HIGH"
    print(diagnosis.remediation) # ["Add PII scrubbing to system prompt", ...]
"""

from __future__ import annotations

import logging
import re
from dataclasses import asdict, dataclass, field
from enum import Enum
from typing import Any

logger = logging.getLogger("cfo_resilience.curate.taxonomy")


# ---------------------------------------------------------------------------
# Failure Categories
# ---------------------------------------------------------------------------


class FailureCategory(str, Enum):
    """Structured failure categories for inference errors."""

    HALLUCINATION = "hallucination"
    PII_LEAK = "pii_leak"
    LOW_CONFIDENCE = "low_confidence"
    TIMEOUT_CASCADE = "timeout_cascade"
    QUALITY_DEGRADATION = "quality_degradation"
    STATE_HALT = "state_halt"
    RATE_LIMITED = "rate_limited"
    PROVIDER_OUTAGE = "provider_outage"
    MCP_FAILURE = "mcp_failure"
    CASCADING_FAILURE = "cascading_failure"
    EMPTY_RESPONSE = "empty_response"
    CONTENT_BLOCKED = "content_blocked"
    UNKNOWN = "unknown"


class FailureSeverity(str, Enum):
    """Severity levels for failures."""

    LOW = "LOW"        # Non-critical, system recovered automatically
    MEDIUM = "MEDIUM"  # Noticeable degradation, user should be informed
    HIGH = "HIGH"      # Significant failure, response quality compromised
    CRITICAL = "CRITICAL"  # Complete failure, no useful response produced


# ---------------------------------------------------------------------------
# Hallucination detection patterns
# ---------------------------------------------------------------------------

# Patterns suggesting fabricated financial data
_HALLUCINATION_SIGNALS = [
    # Specific dollar amounts that look fabricated (not from prompt)
    re.compile(r"\$[\d,]+(?:\.\d{2})?\s*(?:million|billion|thousand)", re.IGNORECASE),
    # Very precise percentages that might be hallucinated
    re.compile(r"\b\d+\.\d{1,2}%\s*(?:growth|decline|increase|decrease)", re.IGNORECASE),
    # Exact dates that might be fabricated
    re.compile(r"\b(?:Q[1-4]\s+\d{4}|\d{1,2}/\d{1,2}/\d{4})", re.IGNORECASE),
    # Specific company names that might be hallucinated
    re.compile(r"\b(?:according to|per|reported by)\s+[A-Z]\w+\s+(?:Inc|Corp|LLC|Ltd)", re.IGNORECASE),
]


# ---------------------------------------------------------------------------
# Diagnosis dataclass
# ---------------------------------------------------------------------------


@dataclass
class FailureDiagnosis:
    """Structured diagnosis result from the failure taxonomy.

    Attributes
    ----------
    category : FailureCategory
        The classified failure category.
    severity : FailureSeverity
        Severity level of the failure.
    confidence_score : float
        How confident the classifier is in this diagnosis (0.0-1.0).
    signals : list[str]
        List of signals that led to this diagnosis.
    remediation : list[str]
        Recommended actions to prevent this failure.
    tags : list[str]
        Additional tags for filtering and grouping.
    """

    category: FailureCategory = FailureCategory.UNKNOWN
    severity: FailureSeverity = FailureSeverity.MEDIUM
    confidence_score: float = 0.5
    signals: list[str] = field(default_factory=list)
    remediation: list[str] = field(default_factory=list)
    tags: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "category": self.category.value,
            "severity": self.severity.value,
            "confidence_score": round(self.confidence_score, 3),
            "signals": self.signals,
            "remediation": self.remediation,
            "tags": self.tags,
        }


# ---------------------------------------------------------------------------
# Failure Taxonomy Classifier
# ---------------------------------------------------------------------------

# Remediation actions per category
_REMEDIATION_ACTIONS: dict[FailureCategory, list[str]] = {
    FailureCategory.HALLUCINATION: [
        "Add 'Use only data provided in the prompt' to system prompt",
        "Include grounding instruction: 'If uncertain, say so explicitly'",
        "Add few-shot examples with correct data attribution",
    ],
    FailureCategory.PII_LEAK: [
        "Strengthen system prompt PII prohibition",
        "Add post-generation PII scrubbing step",
        "Include PII-negative examples in training data",
    ],
    FailureCategory.LOW_CONFIDENCE: [
        "Increase model size or use domain-specific model",
        "Add more context to prompts (financial statements, KPIs)",
        "Include high-quality domain examples in training set",
    ],
    FailureCategory.TIMEOUT_CASCADE: [
        "Increase circuit-breaker threshold",
        "Add response caching for repeated queries",
        "Reduce model complexity for time-critical paths",
    ],
    FailureCategory.QUALITY_DEGRADATION: [
        "Switch to higher-quality base model for this task",
        "Add domain-specific vocabulary to system prompt",
        "Include structured output format in instructions",
    ],
    FailureCategory.STATE_HALT: [
        "Review recent prompts for adversarial patterns",
        "Add recovery prompts to training data",
        "Implement automatic state reset after N halts",
    ],
    FailureCategory.RATE_LIMITED: [
        "Implement request queuing with priority ordering",
        "Add response caching for repeated queries",
        "Upgrade API tier or add additional providers",
    ],
    FailureCategory.PROVIDER_OUTAGE: [
        "Add more fallback providers to the failover chain",
        "Implement provider health pre-checks before routing",
        "Set up multi-cloud provider redundancy",
    ],
    FailureCategory.MCP_FAILURE: [
        "Add timeout and retry logic for MCP tool calls",
        "Implement tool-call result caching",
        "Add graceful fallback when tools are unavailable",
    ],
    FailureCategory.CASCADING_FAILURE: [
        "Reduce dependency between providers",
        "Add circuit breakers per provider",
        "Implement bulkhead isolation pattern",
    ],
    FailureCategory.EMPTY_RESPONSE: [
        "Increase max_tokens for generation",
        "Add 'Always provide a complete answer' to system prompt",
        "Check for prompt-filtering issues with the provider",
    ],
    FailureCategory.CONTENT_BLOCKED: [
        "Review and relax content safety filters if over-triggering",
        "Rephrase prompts to avoid false-positive blocks",
        "Add approved terminology list to system prompt",
    ],
    FailureCategory.UNKNOWN: [
        "Collect more context about the failure pattern",
        "Add explicit error handling for this case",
        "Review logs for common precursor signals",
    ],
}

# Severity defaults per category
_SEVERITY_DEFAULTS: dict[FailureCategory, FailureSeverity] = {
    FailureCategory.HALLUCINATION: FailureSeverity.HIGH,
    FailureCategory.PII_LEAK: FailureSeverity.HIGH,
    FailureCategory.LOW_CONFIDENCE: FailureSeverity.MEDIUM,
    FailureCategory.TIMEOUT_CASCADE: FailureSeverity.MEDIUM,
    FailureCategory.QUALITY_DEGRADATION: FailureSeverity.MEDIUM,
    FailureCategory.STATE_HALT: FailureSeverity.HIGH,
    FailureCategory.RATE_LIMITED: FailureSeverity.LOW,
    FailureCategory.PROVIDER_OUTAGE: FailureSeverity.MEDIUM,
    FailureCategory.MCP_FAILURE: FailureSeverity.MEDIUM,
    FailureCategory.CASCADING_FAILURE: FailureSeverity.CRITICAL,
    FailureCategory.EMPTY_RESPONSE: FailureSeverity.MEDIUM,
    FailureCategory.CONTENT_BLOCKED: FailureSeverity.MEDIUM,
    FailureCategory.UNKNOWN: FailureSeverity.LOW,
}


class FailureTaxonomy:
    """Classifies inference failures into a structured taxonomy.

    The classifier uses a rule-based approach that examines the verdict,
    confidence, degradation level, event types, PII flags, and response
    content to determine the most likely failure category.

    Parameters
    ----------
    custom_remediation : dict[str, list[str]] | None
        Optional custom remediation actions per category.
    """

    def __init__(
        self,
        custom_remediation: dict[str, list[str]] | None = None,
    ) -> None:
        self._remediations = {**_REMEDIATION_ACTIONS}
        if custom_remediation:
            for cat_name, actions in custom_remediation.items():
                try:
                    cat = FailureCategory(cat_name)
                    self._remediations[cat] = actions
                except ValueError:
                    logger.warning("Unknown failure category: %s", cat_name)

        self._diagnosis_count = 0
        self._category_counts: dict[str, int] = {}

    def diagnose(
        self,
        verdict: str = "ALLOW",
        confidence: float = 1.0,
        degradation_level: int = 0,
        decision_state: str = "EXPLORING",
        event_types: list[str] | None = None,
        pii_flags: list[str] | None = None,
        response: str = "",
        prompt: str = "",
        providers_tried: list[str] | None = None,
    ) -> FailureDiagnosis:
        """Classify a failure based on inference metadata.

        Parameters
        ----------
        verdict : str
            Final verdict (ALLOW, BLOCK, DEGRADE).
        confidence : float
            Confidence score (0.0-1.0).
        degradation_level : int
            Degradation level (0-2).
        decision_state : str
            CHP decision state.
        event_types : list[str] | None
            Resilience event types that fired.
        pii_flags : list[str] | None
            PII patterns detected.
        response : str
            The model's response text.
        prompt : str
            The user's input prompt.
        providers_tried : list[str] | None
            Providers attempted during the call.

        Returns
        -------
        FailureDiagnosis
            Structured diagnosis with category, severity, and remediation.
        """
        self._diagnosis_count += 1
        event_types = event_types or []
        pii_flags = pii_flags or []
        providers_tried = providers_tried or []
        signals: list[str] = []
        tags: list[str] = []

        category = FailureCategory.UNKNOWN
        severity = FailureSeverity.LOW
        diag_confidence = 0.5

        # Rule 1: Content blocked (highest priority — governance blocked it)
        if verdict == "BLOCK" and pii_flags:
            category = FailureCategory.PII_LEAK
            severity = FailureSeverity.HIGH
            diag_confidence = 0.95
            signals.append(f"BLOCK verdict with {len(pii_flags)} PII flags")
            signals.extend(pii_flags)
            tags.extend(["governance", "pii"])

        elif verdict == "BLOCK":
            category = FailureCategory.CONTENT_BLOCKED
            severity = FailureSeverity.MEDIUM
            diag_confidence = 0.8
            signals.append("BLOCK verdict (non-PII)")
            tags.append("governance")

        # Rule 2: State machine HALT
        elif decision_state == "HALT":
            category = FailureCategory.STATE_HALT
            severity = FailureSeverity.HIGH
            diag_confidence = 0.9
            signals.append(f"Decision state HALT (confidence={confidence:.2f})")
            tags.append("state_machine")

            # Sub-classify based on what caused the halt
            if confidence < 0.3:
                signals.append("Very low confidence triggered HALT")
                tags.append("low_confidence")
            if degradation_level >= 2:
                signals.append("High degradation triggered HALT")
                tags.append("degradation")

        # Rule 3: Rate limiting
        elif "RETRY" in event_types and any("429" in str(e) for e in event_types):
            category = FailureCategory.RATE_LIMITED
            severity = FailureSeverity.LOW
            diag_confidence = 0.85
            signals.append("429 rate limit detected in events")
            tags.append("rate_limit")

        # Rule 4: Provider outage / cascading
        elif "FAILOVER" in event_types:
            if len(providers_tried) > 2:
                category = FailureCategory.CASCADING_FAILURE
                severity = FailureSeverity.CRITICAL
                diag_confidence = 0.8
                signals.append(f"Cascading: {len(providers_tried)} providers tried")
                tags.extend(["cascade", "failover"])
            else:
                category = FailureCategory.PROVIDER_OUTAGE
                severity = FailureSeverity.MEDIUM
                diag_confidence = 0.75
                signals.append(f"Failover to {len(providers_tried)} providers")
                tags.append("failover")

        # Rule 5: Quality degradation via parity
        elif "PARITY_MISMATCH" in event_types:
            category = FailureCategory.QUALITY_DEGRADATION
            severity = FailureSeverity.MEDIUM
            diag_confidence = 0.85
            signals.append("Parity mismatch between primary and check model")
            tags.append("parity")

        # Rule 6: Low confidence without explicit block
        elif confidence < 0.5:
            category = FailureCategory.LOW_CONFIDENCE
            severity = FailureSeverity.MEDIUM if confidence >= 0.3 else FailureSeverity.HIGH
            diag_confidence = 0.7
            signals.append(f"Low confidence: {confidence:.2f}")
            tags.append("confidence")

        # Rule 7: High degradation
        elif degradation_level >= 2:
            category = FailureCategory.QUALITY_DEGRADATION
            severity = FailureSeverity.HIGH
            diag_confidence = 0.7
            signals.append(f"Degradation level {degradation_level}")
            tags.append("degradation")

        # Rule 8: Empty response
        elif len(response.strip()) < 20:
            category = FailureCategory.EMPTY_RESPONSE
            severity = FailureSeverity.MEDIUM
            diag_confidence = 0.9
            signals.append(f"Empty/near-empty response ({len(response)} chars)")
            tags.append("empty")

        # Rule 9: MCP failure
        elif any("mcp" in str(e).lower() for e in event_types):
            category = FailureCategory.MCP_FAILURE
            severity = FailureSeverity.MEDIUM
            diag_confidence = 0.7
            signals.append("MCP-related event in log")
            tags.append("mcp")

        # Rule 10: Timeout cascade (many retries)
        elif event_types.count("RETRY") >= 3:
            category = FailureCategory.TIMEOUT_CASCADE
            severity = FailureSeverity.MEDIUM
            diag_confidence = 0.7
            signals.append(f"{event_types.count('RETRY')} retries detected")
            tags.append("timeout")

        # Rule 11: Hallucination heuristics (only for ALLOW with moderate confidence)
        elif verdict == "ALLOW" and confidence >= 0.5:
            halluc_signals = self._detect_hallucination_signals(response, prompt)
            if halluc_signals:
                category = FailureCategory.HALLUCINATION
                severity = FailureSeverity.MEDIUM
                diag_confidence = min(0.5 + 0.1 * len(halluc_signals), 0.85)
                signals.extend(halluc_signals)
                tags.append("hallucination")

        # Build diagnosis
        diagnosis = FailureDiagnosis(
            category=category,
            severity=severity,
            confidence_score=diag_confidence,
            signals=signals,
            remediation=self._remediations.get(category, []),
            tags=tags,
        )

        # Track stats
        self._category_counts[category.value] = (
            self._category_counts.get(category.value, 0) + 1
        )

        return diagnosis

    def _detect_hallucination_signals(
        self, response: str, prompt: str
    ) -> list[str]:
        """Detect potential hallucination signals in a response."""
        if not response:
            return []

        signals: list[str] = []
        lower_response = response.lower()

        for pattern in _HALLUCINATION_SIGNALS:
            matches = pattern.findall(response)
            if matches:
                # Only flag if the signal appears in the response but not in the prompt
                prompt_match = pattern.findall(prompt)
                if not prompt_match or len(matches) > len(prompt_match):
                    signals.append(f"Potential fabrication: {matches[0][:60]}")

        # Check for hedging language that suggests uncertainty
        hedging_patterns = [
            r"\b(?:i think|it seems|probably|maybe|possibly|approximately|roughly)\b",
            r"\b(?:not sure|cannot confirm|unable to verify)\b",
        ]
        hedging_count = 0
        for pat in hedging_patterns:
            hedging_count += len(re.findall(pat, lower_response))

        if hedging_count >= 3:
            signals.append(f"Excessive hedging language ({hedging_count} instances)")

        return signals

    def get_taxonomy_report(self) -> dict[str, Any]:
        """Return aggregate taxonomy classification statistics."""
        return {
            "total_diagnoses": self._diagnosis_count,
            "category_distribution": dict(self._category_counts),
            "categories_available": [c.value for c in FailureCategory],
        }

    def reset(self) -> None:
        """Reset all counters."""
        self._diagnosis_count = 0
        self._category_counts.clear()

    def __repr__(self) -> str:
        return (
            f"FailureTaxonomy(diagnoses={self._diagnosis_count}, "
            f"categories={len(self._category_counts)})"
        )
