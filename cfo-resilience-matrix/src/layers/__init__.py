"""
CFO Resilience Matrix — Resilience Layers Package
====================================================

Five-layer resilience orchestration for AI agent requests flowing through
the TrueFoundry AI Gateway.

Layers (outermost → innermost)
-------------------------------
1. **GATEWAY**          — Provider failover via the gateway's priority routing.
2. **PARITY**           — Cross-model response quality comparison.
3. **GOVERNANCE**       — PII / content-safety screening.
4. **STATE_MACHINE**    — CHP-style decision-state lifecycle management.
5. **USER_EXPERIENCE**  — Graceful degradation and response formatting.
"""

from __future__ import annotations

from layers.resilience_stack import (
    ResilienceLayer,
    ResilienceEventType,
    ResilienceEvent,
    ResilienceContext,
    GatewayLayer,
    ParityLayer,
    GovernanceLayer,
    StateMachineLayer,
    UserExperienceLayer,
    ResilienceStack,
)

__all__ = [
    "ResilienceLayer",
    "ResilienceEventType",
    "ResilienceEvent",
    "ResilienceContext",
    "GatewayLayer",
    "ParityLayer",
    "GovernanceLayer",
    "StateMachineLayer",
    "UserExperienceLayer",
    "ResilienceStack",
]
