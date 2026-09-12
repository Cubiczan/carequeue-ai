"""
chaos.engine — Chaos Engineering Engine for Resilience Testing
================================================================

The :class:`ChaosEngine` intercepts ``httpx.Client.request`` calls to
inject controlled failures, latency spikes, and cascading outages into
the gateway traffic.  This allows demo-ing the five-layer resilience
stack without needing a real failure-prone infrastructure.

Usage
-----
::

    engine = ChaosEngine(scenarios=[ChaosScenario.PROVIDER_DOWN])
    engine.activate()        # patches httpx.Client.request
    # ... run agent calls ...
    engine.deactivate()      # restores original behaviour
    print(engine.stats)      # inspection

The engine patches at the *class* level on ``httpx.Client`` so that
*any* ``httpx.Client`` instance created after activation is affected.
"""

from __future__ import annotations

import functools
import logging
import random
import time
import threading
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Callable
from unittest.mock import MagicMock, patch

import httpx

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

logger = logging.getLogger("cfo_resilience.chaos")

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

_GATEWAY_PATHS = {"/v1/chat/completions"}
_INTERMITTENT_ERROR_RATE = 0.4  # 40% of calls fail
_CASCADING_FAILURE_THRESHOLD = 3  # Failures before next provider is tried
_SLOW_RESPONSE_DELAY_S = 12.0  # 12 seconds
_FULL_OUTAGE_CALLS = 20  # All requests fail for first N calls


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------


class ChaosScenario(str, Enum):
    """Supported chaos scenarios."""

    PROVIDER_DOWN = "provider_down"
    RATE_LIMITED = "rate_limited"
    INTERMITTENT_ERRORS = "intermittent"
    MCP_SERVER_ERROR = "mcp_server_error"
    SLOW_RESPONSE = "slow_response"
    CASCADING_FAILURE = "cascading"
    FULL_OUTAGE = "full_outage"


@dataclass
class ChaosStats:
    """Aggregate statistics from the chaos engine."""

    total_calls_intercepted: int = 0
    total_injections: int = 0
    injections_by_scenario: dict[str, int] = field(default_factory=lambda: defaultdict(int))
    injections_by_provider: dict[str, int] = field(default_factory=lambda: defaultdict(int))
    recovery_count: int = 0
    total_delay_injected_s: float = 0.0
    calls_since_last_injection: int = 0
    start_time: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    active_scenarios: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "total_calls_intercepted": self.total_calls_intercepted,
            "total_injections": self.total_injections,
            "injections_by_scenario": dict(self.injections_by_scenario),
            "injections_by_provider": dict(self.injections_by_provider),
            "recovery_count": self.recovery_count,
            "total_delay_injected_s": round(self.total_delay_injected_s, 3),
            "calls_since_last_injection": self.calls_since_last_injection,
            "start_time": self.start_time,
            "active_scenarios": self.active_scenarios,
            "injection_rate": (
                round(self.total_injections / max(self.total_calls_intercepted, 1), 3)
            ),
        }


# ---------------------------------------------------------------------------
# Failure response builders
# ---------------------------------------------------------------------------


def _build_error_response(status_code: int, error_type: str, message: str) -> httpx.Response:
    """Construct a synthetic ``httpx.Response`` that mimics an API error."""
    # We build a minimal request for the response to reference
    request = httpx.Request(
        method="POST",
        url="https://gateway.truefoundry.ai/v1/chat/completions",
    )
    response = httpx.Response(
        status_code=status_code,
        json={
            "error": {
                "message": f"[CHAOS ENGINE] {message}",
                "type": error_type,
                "param": None,
                "code": str(status_code),
            }
        },
        request=request,
    )
    return response


def _build_429_response() -> httpx.Response:
    return _build_error_response(
        status_code=429,
        error_type="rate_limit_error",
        message="Rate limit exceeded. Please retry after 60 seconds.",
    )


def _build_503_response() -> httpx.Response:
    return _build_error_response(
        status_code=503,
        error_type="server_error",
        message="Service unavailable. The provider is temporarily down.",
    )


def _build_500_response() -> httpx.Response:
    return _build_error_response(
        status_code=500,
        error_type="internal_server_error",
        message="Internal server error. An unexpected condition was encountered.",
    )


def _build_mcp_error_response() -> httpx.Response:
    return _build_error_response(
        status_code=500,
        error_type="mcp_server_error",
        message="MCP tool call failed: tool execution timed out after 30s.",
    )


# ---------------------------------------------------------------------------
# Chaos Engine
# ---------------------------------------------------------------------------


class ChaosEngine:
    """Injects controlled failures into ``httpx`` calls to the AI Gateway.

    The engine patches ``httpx.Client.request`` at the class level so that
    all HTTP clients (including those created lazily by
    :class:`ResilientGatewayClient`) are affected.

    Parameters
    ----------
    scenarios : list[ChaosScenario] | None
        List of scenarios to activate.  ``None`` or empty disables all
        injection.
    seed : int | None
        Optional random seed for deterministic behaviour (useful for tests).

    Attributes
    ----------
    active : bool
        Whether the engine is currently intercepting calls.
    stats : ChaosStats
        Live statistics about injections.
    """

    def __init__(
        self,
        scenarios: list[ChaosScenario] | None = None,
        seed: int | None = None,
    ) -> None:
        self._scenarios: list[ChaosScenario] = scenarios or []
        self._rng = random.Random(seed)
        self._active = False
        self._original_request: Callable[..., Any] | None = None
        self._lock = threading.Lock()

        # Per-scenario internal state
        self._intermittent_call_count: int = 0
        self._cascading_failures_remaining: int = 0
        self._cascading_provider_failures: dict[str, int] = defaultdict(int)
        self._full_outage_call_count: int = 0
        self._rate_limit_counter: int = 0

        # Statistics
        self._stats = ChaosStats(active_scenarios=[s.value for s in self._scenarios])

    # ------------------------------------------------------------------
    # Properties
    # ------------------------------------------------------------------

    @property
    def active(self) -> bool:
        return self._active

    @property
    def stats(self) -> ChaosStats:
        return self._stats

    @property
    def scenarios(self) -> list[ChaosScenario]:
        return list(self._scenarios)

    # ------------------------------------------------------------------
    # Activation / deactivation
    # ------------------------------------------------------------------

    def activate(self) -> None:
        """Patch ``httpx.Client.request`` to inject chaos."""
        if self._active:
            logger.warning("ChaosEngine already active — ignoring duplicate activate()")
            return

        if not self._scenarios:
            logger.info("ChaosEngine activated with no scenarios — pass-through mode")
            self._active = True
            return

        self._original_request = httpx.Client.request

        @functools.wraps(self._original_request)  # type: ignore[arg-type]
        def _chaos_request(self_client: httpx.Client, method: str, url: str, **kwargs: Any) -> httpx.Response:
            return self._intercept(self_client, method, url, **kwargs)

        httpx.Client.request = _chaos_request  # type: ignore[assignment]
        self._active = True
        logger.info(
            "ChaosEngine ACTIVATED with scenarios: %s",
            [s.value for s in self._scenarios],
        )

    def deactivate(self) -> None:
        """Restore the original ``httpx.Client.request``."""
        if not self._active:
            return

        if self._original_request is not None:
            httpx.Client.request = self._original_request  # type: ignore[assignment]
            self._original_request = None

        self._active = False
        logger.info("ChaosEngine DEACTIVATED")
        logger.info("Final stats: %s", self._stats.to_dict())

    def __enter__(self) -> ChaosEngine:
        self.activate()
        return self

    def __exit__(self, *args: Any) -> None:
        self.deactivate()

    # ------------------------------------------------------------------
    # Request interception
    # ------------------------------------------------------------------

    def _intercept(
        self,
        client: httpx.Client,
        method: str,
        url: str,
        **kwargs: Any,
    ) -> httpx.Response:
        """Intercept an HTTP request and decide whether to inject a fault."""
        with self._lock:
            self._stats.total_calls_intercepted += 1

            # Only intercept gateway chat-completions calls
            is_gateway_call = any(
                path_fragment in url
                for path_fragment in _GATEWAY_PATHS
            )

            if not is_gateway_call or method.upper() != "POST":
                return self._original_request(client, method, url, **kwargs)  # type: ignore[misc]

            # Check delay injection first (applies before response)
            delay = self._inject_delay_ms() / 1000.0
            if delay > 0:
                self._stats.total_delay_injected_s += delay
                logger.info("[CHAOS] Injecting %.1fs delay", delay)
                time.sleep(delay)

            # Determine if we should fail this call
            failure_response = self._get_failure(provider=self._extract_provider(url))

            if failure_response is not None:
                self._stats.total_injections += 1
                self._stats.calls_since_last_injection = 0
                provider = self._extract_provider(url)
                self._stats.injections_by_provider[provider] += 1
                logger.info(
                    "[CHAOS] Injecting failure: status=%d for provider=%s",
                    failure_response.status_code,
                    provider,
                )
                return failure_response

            self._stats.calls_since_last_injection += 1
            return self._original_request(client, method, url, **kwargs)  # type: ignore[misc]

    # ------------------------------------------------------------------
    # Failure determination
    # ------------------------------------------------------------------

    def should_fail(self, provider: str = "unknown") -> bool:
        """Determine whether the next call to *provider* should fail.

        This method is stateless in the sense that it examines the current
        internal counters and RNG state.  It is useful for pre-checking
        or testing.

        Returns
        -------
        bool
            ``True`` if a failure should be injected.
        """
        if not self._scenarios:
            return False

        for scenario in self._scenarios:
            if scenario == ChaosScenario.PROVIDER_DOWN:
                return True
            elif scenario == ChaosScenario.RATE_LIMITED:
                self._rate_limit_counter += 1
                return self._rate_limit_counter % 3 == 0  # Every 3rd call
            elif scenario == ChaosScenario.INTERMITTENT_ERRORS:
                return self._rng.random() < _INTERMITTENT_ERROR_RATE
            elif scenario == ChaosScenario.MCP_SERVER_ERROR:
                return self._rng.random() < 0.5
            elif scenario == ChaosScenario.SLOW_RESPONSE:
                return True  # Always inject delay (actual failure depends on timeout)
            elif scenario == ChaosScenario.CASCADING_FAILURE:
                if self._cascading_failures_remaining > 0:
                    self._cascading_failures_remaining -= 1
                    return True
                if self._cascading_provider_failures.get(provider, 0) < _CASCADING_FAILURE_THRESHOLD:
                    self._cascading_provider_failures[provider] += 1
                    return True
                return False
            elif scenario == ChaosScenario.FULL_OUTAGE:
                return self._full_outage_call_count < _FULL_OUTAGE_CALLS

        return False

    def get_failure(self, provider: str = "unknown") -> httpx.Response | None:
        """Return a simulated failure response (or ``None`` if no failure).

        This method advances internal state, so calling it mutates the
        engine.  Use :meth:`should_fail` for a pure check.
        """
        if not self.should_fail(provider):
            return None

        # Determine which scenario triggers and record it
        scenario = self._scenarios[0] if self._scenarios else ChaosScenario.PROVIDER_DOWN

        if ChaosScenario.RATE_LIMITED in self._scenarios:
            scenario = ChaosScenario.RATE_LIMITED
        elif ChaosScenario.INTERMITTENT_ERRORS in self._scenarios and self._rng.random() < _INTERMITTENT_ERROR_RATE:
            scenario = ChaosScenario.INTERMITTENT_ERRORS
        elif ChaosScenario.CASCADING_FAILURE in self._scenarios:
            scenario = ChaosScenario.CASCADING_FAILURE
        elif ChaosScenario.MCP_SERVER_ERROR in self._scenarios and self._rng.random() < 0.5:
            scenario = ChaosScenario.MCP_SERVER_ERROR

        self._stats.injections_by_scenario[scenario.value] += 1

        # SLOW_RESPONSE only injects latency — no error response needed
        if scenario == ChaosScenario.SLOW_RESPONSE:
            return None

        response_map: dict[ChaosScenario, Callable[[], httpx.Response]] = {
            ChaosScenario.PROVIDER_DOWN: _build_503_response,
            ChaosScenario.RATE_LIMITED: _build_429_response,
            ChaosScenario.INTERMITTENT_ERRORS: _build_500_response,
            ChaosScenario.MCP_SERVER_ERROR: _build_mcp_error_response,
            ChaosScenario.SLOW_RESPONSE: _build_503_response,  # Fallback (should not reach here)
            ChaosScenario.CASCADING_FAILURE: _build_503_response,
            ChaosScenario.FULL_OUTAGE: _build_503_response,
        }

        builder = response_map.get(scenario, _build_503_response)

        # Track full outage progress
        if scenario == ChaosScenario.FULL_OUTAGE:
            self._full_outage_call_count += 1
            # Auto-recover after threshold
            if self._full_outage_call_count >= _FULL_OUTAGE_CALLS:
                self._stats.recovery_count += 1
                logger.info("[CHAOS] Full outage auto-recovering after %d calls", _FULL_OUTAGE_CALLS)

        return builder()

    def _get_failure(self, provider: str) -> httpx.Response | None:
        """Internal method that pairs failure determination with response building."""
        if not self._scenarios:
            return None

        for scenario in self._scenarios:
            response = self._evaluate_scenario(scenario, provider)
            if response is not None:
                self._stats.injections_by_scenario[scenario.value] += 1
                return response

        return None

    def _evaluate_scenario(
        self, scenario: ChaosScenario, provider: str
    ) -> httpx.Response | None:
        """Evaluate a single scenario and return a failure response or None."""
        if scenario == ChaosScenario.PROVIDER_DOWN:
            # Always fail — simulates primary provider outage
            return _build_503_response()

        elif scenario == ChaosScenario.RATE_LIMITED:
            self._rate_limit_counter += 1
            # Fail every 3rd call to simulate periodic rate limiting
            if self._rate_limit_counter % 3 == 0:
                return _build_429_response()
            return None

        elif scenario == ChaosScenario.INTERMITTENT_ERRORS:
            self._intermittent_call_count += 1
            if self._rng.random() < _INTERMITTENT_ERROR_RATE:
                # Alternate between 500 and 502
                if self._rng.random() < 0.5:
                    return _build_500_response()
                else:
                    return _build_error_response(502, "bad_gateway", "Bad Gateway: upstream provider returned invalid response")
            return None

        elif scenario == ChaosScenario.MCP_SERVER_ERROR:
            if self._rng.random() < 0.5:
                return _build_mcp_error_response()
            return None

        elif scenario == ChaosScenario.SLOW_RESPONSE:
            # Delay is handled separately in _intercept; this scenario
            # doesn't inject an error response — just latency
            return None

        elif scenario == ChaosScenario.CASCADING_FAILURE:
            # Track failures per provider; cascade after threshold
            prov_failures = self._cascading_provider_failures.get(provider, 0)
            if prov_failures < _CASCADING_FAILURE_THRESHOLD:
                self._cascading_provider_failures[provider] = prov_failures + 1
                if prov_failures >= _CASCADING_FAILURE_THRESHOLD - 1:
                    # Recovery triggered
                    self._stats.recovery_count += 1
                return _build_503_response()
            # After threshold failures, provider "recovers"
            self._cascading_provider_failures[provider] = 0
            return None

        elif scenario == ChaosScenario.FULL_OUTAGE:
            if self._full_outage_call_count < _FULL_OUTAGE_CALLS:
                self._full_outage_call_count += 1
                return _build_503_response()
            else:
                # Auto-recover
                self._stats.recovery_count += 1
                logger.info(
                    "[CHAOS] Full outage recovered after %d blocked calls",
                    _FULL_OUTAGE_CALLS,
                )
                # Reset counter for potential re-trigger
                self._full_outage_call_count = 0
                return None

        return None

    # ------------------------------------------------------------------
    # Delay injection
    # ------------------------------------------------------------------

    def inject_delay_ms(self) -> float:
        """Return the delay (in milliseconds) to add to the next call.

        Returns 0 if no delay scenario is active.
        """
        return self._inject_delay_ms()

    def _inject_delay_ms(self) -> float:
        """Internal delay calculation."""
        if ChaosScenario.SLOW_RESPONSE in self._scenarios:
            # Random delay between 8s and 15s
            delay_ms = self._rng.uniform(8000, 15000)
            logger.info("[CHAOS] Injecting %.0fms delay (slow_response)", delay_ms)
            return delay_ms
        return 0.0

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _extract_provider(url: str) -> str:
        """Try to extract a provider identifier from the URL or headers."""
        if "truefoundry" in url.lower():
            return "truefoundry"
        if "openai" in url.lower():
            return "openai"
        if "anthropic" in url.lower():
            return "anthropic"
        return "unknown"

    # ------------------------------------------------------------------
    # Stats & control
    # ------------------------------------------------------------------

    def reset_stats(self) -> None:
        """Clear all accumulated statistics."""
        self._stats = ChaosStats(active_scenarios=[s.value for s in self._scenarios])
        self._intermittent_call_count = 0
        self._cascading_failures_remaining = 0
        self._cascading_provider_failures.clear()
        self._full_outage_call_count = 0
        self._rate_limit_counter = 0

    def reset_cascading(self) -> None:
        """Reset the cascading-failure state to allow re-triggering."""
        self._cascading_failures_remaining = 0
        self._cascading_provider_failures.clear()

    def force_recovery(self) -> None:
        """Force all scenarios into a recovered state."""
        self._full_outage_call_count = _FULL_OUTAGE_CALLS + 1
        self._cascading_failures_remaining = 0
        self._cascading_provider_failures.clear()
        self._rate_limit_counter = 0
        self._intermittent_call_count = 0
        self._stats.recovery_count += 1
        logger.info("[CHAOS] Forced recovery for all scenarios")

    def add_scenario(self, scenario: ChaosScenario) -> None:
        """Add a scenario to the active set at runtime."""
        if scenario not in self._scenarios:
            self._scenarios.append(scenario)
            self._stats.active_scenarios.append(scenario.value)
            logger.info("[CHAOS] Added scenario: %s", scenario.value)

    def remove_scenario(self, scenario: ChaosScenario) -> None:
        """Remove a scenario from the active set at runtime."""
        if scenario in self._scenarios:
            self._scenarios.remove(scenario)
            self._stats.active_scenarios = [s.value for s in self._scenarios]
            logger.info("[CHAOS] Removed scenario: %s", scenario.value)

    def __repr__(self) -> str:
        status = "ACTIVE" if self._active else "INACTIVE"
        scenarios = [s.value for s in self._scenarios] or ["none"]
        return (
            f"ChaosEngine(status={status}, "
            f"scenarios={scenarios}, "
            f"injections={self._stats.total_injections})"
        )
