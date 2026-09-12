"""Tests for the Chaos Engineering Engine."""

from __future__ import annotations

import time
from unittest.mock import patch

import httpx
import pytest

from chaos.engine import (
    ChaosEngine,
    ChaosScenario,
    ChaosStats,
    _build_429_response,
    _build_503_response,
    _build_500_response,
    _build_mcp_error_response,
)


# ---------------------------------------------------------------------------
# Error response builders
# ---------------------------------------------------------------------------

class TestErrorResponses:
    def test_429_response(self):
        resp = _build_429_response()
        assert resp.status_code == 429
        body = resp.json()
        assert "rate_limit" in body["error"]["type"]

    def test_503_response(self):
        resp = _build_503_response()
        assert resp.status_code == 503
        assert "CHAOS ENGINE" in resp.json()["error"]["message"]

    def test_500_response(self):
        resp = _build_500_response()
        assert resp.status_code == 500

    def test_mcp_error_response(self):
        resp = _build_mcp_error_response()
        assert resp.status_code == 500
        assert "MCP" in resp.json()["error"]["message"]


# ---------------------------------------------------------------------------
# ChaosEngine construction
# ---------------------------------------------------------------------------

class TestChaosEngineConstruction:
    def test_no_scenarios(self):
        engine = ChaosEngine()
        assert not engine.scenarios
        assert not engine.active

    def test_with_scenarios(self):
        engine = ChaosEngine(scenarios=[ChaosScenario.PROVIDER_DOWN])
        assert len(engine.scenarios) == 1

    def test_deterministic_seed(self):
        engine = ChaosEngine(scenarios=[ChaosScenario.INTERMITTENT_ERRORS], seed=42)
        results = [engine.should_fail("test") for _ in range(20)]
        # Same seed should produce same results
        engine2 = ChaosEngine(scenarios=[ChaosScenario.INTERMITTENT_ERRORS], seed=42)
        results2 = [engine2.should_fail("test") for _ in range(20)]
        assert results == results2

    def test_repr(self):
        engine = ChaosEngine(scenarios=[ChaosScenario.PROVIDER_DOWN])
        assert "INACTIVE" in repr(engine)
        engine.activate()
        assert "ACTIVE" in repr(engine)
        engine.deactivate()


# ---------------------------------------------------------------------------
# Provider down scenario
# ---------------------------------------------------------------------------

class TestProviderDown:
    def test_always_fails(self):
        engine = ChaosEngine(scenarios=[ChaosScenario.PROVIDER_DOWN])
        for _ in range(10):
            assert engine.should_fail("openai")

    def test_returns_503(self):
        engine = ChaosEngine(scenarios=[ChaosScenario.PROVIDER_DOWN])
        resp = engine.get_failure("openai")
        assert resp is not None
        assert resp.status_code == 503


# ---------------------------------------------------------------------------
# Rate limited scenario
# ---------------------------------------------------------------------------

class TestRateLimited:
    def test_every_third_call(self):
        engine = ChaosEngine(scenarios=[ChaosScenario.RATE_LIMITED])
        results = [engine.should_fail("openai") for _ in range(9)]
        # Should fail on 3rd, 6th, 9th call
        assert results[2] is True
        assert results[5] is True
        assert results[8] is True
        assert results[0] is False

    def test_returns_429(self):
        engine = ChaosEngine(scenarios=[ChaosScenario.RATE_LIMITED])
        # Advance to 3rd call
        engine.should_fail("openai")
        engine.should_fail("openai")
        resp = engine.get_failure("openai")
        assert resp is not None
        assert resp.status_code == 429


# ---------------------------------------------------------------------------
# Full outage scenario
# ---------------------------------------------------------------------------

class TestFullOutage:
    def test_fails_for_threshold_calls(self):
        engine = ChaosEngine(scenarios=[ChaosScenario.FULL_OUTAGE])
        for i in range(20):
            should = engine.should_fail("openai")
            if i < 20:
                assert should is True

    def test_auto_recovers(self):
        engine = ChaosEngine(scenarios=[ChaosScenario.FULL_OUTAGE])
        # Exhaust all outage calls
        for _ in range(25):
            engine.get_failure("openai")
        assert engine.stats.recovery_count >= 1


# ---------------------------------------------------------------------------
# Slow response scenario
# ---------------------------------------------------------------------------

class TestSlowResponse:
    def test_injects_delay(self):
        engine = ChaosEngine(scenarios=[ChaosScenario.SLOW_RESPONSE], seed=42)
        delay_ms = engine.inject_delay_ms()
        assert delay_ms >= 8000  # min 8 seconds
        assert delay_ms <= 15000  # max 15 seconds

    def test_no_failure_response(self):
        engine = ChaosEngine(scenarios=[ChaosScenario.SLOW_RESPONSE], seed=42)
        # should_fail returns True (for delay), but get_failure returns None
        assert engine.should_fail("test") is True
        # get_failure via _get_failure returns None for SLOW_RESPONSE
        assert engine._get_failure("test") is None


# ---------------------------------------------------------------------------
# Cascading failure scenario
# ---------------------------------------------------------------------------

class TestCascadingFailure:
    def test_fails_until_threshold(self):
        engine = ChaosEngine(scenarios=[ChaosScenario.CASCADING_FAILURE])
        failures = 0
        for _ in range(10):
            resp = engine._get_failure("provider-a")
            if resp is not None:
                failures += 1
        assert failures > 0

    def test_resets_cascading(self):
        engine = ChaosEngine(scenarios=[ChaosScenario.CASCADING_FAILURE])
        engine._get_failure("provider-a")
        engine._get_failure("provider-a")
        engine.reset_cascading()
        assert engine._cascading_provider_failures == {}


# ---------------------------------------------------------------------------
# Stats tracking
# ---------------------------------------------------------------------------

class TestStatsTracking:
    def test_initial_stats(self):
        engine = ChaosEngine(scenarios=[ChaosScenario.PROVIDER_DOWN])
        stats = engine.stats
        assert stats.total_calls_intercepted == 0
        assert stats.total_injections == 0

    def test_stats_serialization(self):
        engine = ChaosEngine(scenarios=[ChaosScenario.PROVIDER_DOWN])
        d = engine.stats.to_dict()
        assert "total_calls_intercepted" in d
        assert "injection_rate" in d
        assert "active_scenarios" in d

    def test_reset_stats(self):
        engine = ChaosEngine(scenarios=[ChaosScenario.PROVIDER_DOWN])
        engine.get_failure("test")
        engine.reset_stats()
        assert engine.stats.total_injections == 0


# ---------------------------------------------------------------------------
# Scenario management
# ---------------------------------------------------------------------------

class TestScenarioManagement:
    def test_add_scenario(self):
        engine = ChaosEngine(scenarios=[ChaosScenario.PROVIDER_DOWN])
        engine.add_scenario(ChaosScenario.RATE_LIMITED)
        assert len(engine.scenarios) == 2

    def test_remove_scenario(self):
        engine = ChaosEngine(scenarios=[ChaosScenario.PROVIDER_DOWN, ChaosScenario.RATE_LIMITED])
        engine.remove_scenario(ChaosScenario.PROVIDER_DOWN)
        assert len(engine.scenarios) == 1
        assert ChaosScenario.RATE_LIMITED in engine.scenarios

    def test_add_duplicate_noop(self):
        engine = ChaosEngine(scenarios=[ChaosScenario.PROVIDER_DOWN])
        engine.add_scenario(ChaosScenario.PROVIDER_DOWN)
        assert len(engine.scenarios) == 1


# ---------------------------------------------------------------------------
# Force recovery
# ---------------------------------------------------------------------------

class TestForceRecovery:
    def test_force_recovery_clears_state(self):
        engine = ChaosEngine(scenarios=[ChaosScenario.FULL_OUTAGE])
        for _ in range(5):
            engine.get_failure("test")
        engine.force_recovery()
        assert engine.stats.recovery_count >= 1


# ---------------------------------------------------------------------------
# Context manager
# ---------------------------------------------------------------------------

class TestContextManager:
    def test_activate_deactivate(self):
        engine = ChaosEngine(scenarios=[ChaosScenario.PROVIDER_DOWN])
        with engine:
            assert engine.active is True
        assert engine.active is False
