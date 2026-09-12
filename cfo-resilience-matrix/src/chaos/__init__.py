"""
CFO Resilience Matrix — Chaos Engineering Package
====================================================

Infrastructure-failure simulation engine that monkey-patches ``httpx`` to
inject controlled faults into gateway calls, demonstrating the resilience
layers in action.
"""

from __future__ import annotations

from chaos.engine import (
    ChaosScenario,
    ChaosEngine,
    ChaosStats,
)

__all__ = [
    "ChaosScenario",
    "ChaosEngine",
    "ChaosStats",
]
