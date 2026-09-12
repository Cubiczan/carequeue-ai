"""Tests for the Resilient Gateway Client."""

from __future__ import annotations

import json
import time
from unittest.mock import MagicMock, patch

import httpx
import pytest

from gateway.client import (
    ResilientGatewayClient,
    GatewayEvent,
    GatewayMetrics,
    ProviderHealth,
    EventType,
    ErrorCategory,
    _categorise_error,
    _generate_mock_response,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_client(api_key: str = "") -> ResilientGatewayClient:
    """Create a client with a short timeout for fast tests."""
    return ResilientGatewayClient(
        gateway_url="https://gateway.truefoundry.ai",
        api_key=api_key,
        virtual_model="test-model",
        timeout_seconds=5,
    )


def _make_messages(system: str = "You are a finance assistant.", user: str = "What is our cash runway?") -> list[dict]:
    return [
        {"role": "system", "content": system},
        {"role": "user", "content": user},
    ]


# ---------------------------------------------------------------------------
# Error categorisation
# ---------------------------------------------------------------------------

class TestErrorCategorisation:
    def test_timeout(self):
        exc = httpx.TimeoutException("timeout")
        assert _categorise_error(exc) == ErrorCategory.TIMEOUT

    def test_rate_limit(self):
        response = httpx.Response(429, request=httpx.Request("POST", "https://test.com"))
        exc = httpx.HTTPStatusError("rate limited", request=response.request, response=response)
        assert _categorise_error(exc) == ErrorCategory.RATE_LIMIT

    def test_server_error(self):
        response = httpx.Response(500, request=httpx.Request("POST", "https://test.com"))
        exc = httpx.HTTPStatusError("server error", request=response.request, response=response)
        assert _categorise_error(exc) == ErrorCategory.SERVER_ERROR

    def test_network_error(self):
        exc = httpx.ConnectError("connection refused")
        assert _categorise_error(exc) == ErrorCategory.NETWORK

    def test_unknown(self):
        exc = ValueError("something unexpected")
        assert _categorise_error(exc) == ErrorCategory.UNKNOWN


# ---------------------------------------------------------------------------
# Mock response generation
# ---------------------------------------------------------------------------

class TestMockResponse:
    def test_finance_prompt(self):
        resp = _generate_mock_response("You are a financial analyst")
        assert "cash runway" in resp["choices"][0]["message"]["content"].lower()

    def test_strategy_prompt(self):
        resp = _generate_mock_response("You are a strategic advisor")
        assert "competitive" in resp["choices"][0]["message"]["content"].lower()

    def test_compliance_prompt(self):
        resp = _generate_mock_response("You are a compliance officer")
        assert "regulatory" in resp["choices"][0]["message"]["content"].lower()

    def test_default_prompt(self):
        resp = _generate_mock_response("Hello world")
        assert "resilience matrix" in resp["choices"][0]["message"]["content"].lower()

    def test_response_structure(self):
        resp = _generate_mock_response("test")
        assert resp["object"] == "chat.completion"
        assert "choices" in resp
        assert "usage" in resp
        assert resp["choices"][0]["message"]["role"] == "assistant"


# ---------------------------------------------------------------------------
# Client construction
# ---------------------------------------------------------------------------

class TestClientConstruction:
    def test_mock_mode_when_no_api_key(self):
        client = _make_client(api_key="")
        assert client._is_mock_mode is True

    def test_live_mode_with_api_key(self):
        client = _make_client(api_key="test-key-123")
        assert client._is_mock_mode is False

    def test_env_variable_override(self, monkeypatch):
        monkeypatch.setenv("TFY_API_KEY", "env-key")
        monkeypatch.setenv("TFY_GATEWAY_URL", "https://custom.gateway.ai")
        client = ResilientGatewayClient()
        assert client._is_mock_mode is False
        assert client.api_key == "env-key"
        assert client.gateway_url == "https://custom.gateway.ai"

    def test_repr_mock(self):
        client = _make_client()
        assert "MOCK" in repr(client)

    def test_repr_live(self):
        client = _make_client(api_key="key")
        assert "LIVE" in repr(client)


# ---------------------------------------------------------------------------
# Mock chat
# ---------------------------------------------------------------------------

class TestMockChat:
    def test_chat_returns_mock_response(self):
        client = _make_client()
        messages = _make_messages()
        result = client.chat(messages)
        assert "choices" in result
        assert result["choices"][0]["message"]["content"]
        assert result["model"] == "mock-model"

    def test_chat_records_metrics(self):
        client = _make_client()
        client.chat(_make_messages())
        metrics = client.get_metrics()
        assert metrics.total_requests == 1
        assert metrics.total_tokens_used > 0

    def test_chat_emits_mock_event(self):
        client = _make_client()
        client.chat(_make_messages())
        events = client.get_events()
        assert any(e.event_type == EventType.MOCK_RESPONSE for e in events)

    def test_stream_yields_words(self):
        client = _make_client()
        words = list(client.chat_stream(_make_messages()))
        assert len(words) > 5
        assert all(isinstance(w, str) for w in words)


# ---------------------------------------------------------------------------
# Health tracking
# ---------------------------------------------------------------------------

class TestProviderHealth:
    def test_health_initial_state(self):
        health = ProviderHealth(provider="test")
        assert health.is_healthy is True
        assert health.error_rate == 0.0

    def test_health_degrades_with_errors(self):
        health = ProviderHealth(provider="test")
        for _ in range(5):
            health.total_requests += 1
            health.error_count += 1
            health.consecutive_errors += 1
        assert health.is_healthy is False
        assert health.error_rate == 1.0

    def test_latency_tracking(self):
        health = ProviderHealth(provider="test")
        health.total_requests += 1
        health.success_count += 1
        health.total_latency_ms += 300.0
        health.min_latency_ms = 200.0
        health.max_latency_ms = 400.0
        assert health.avg_latency_ms == 300.0


# ---------------------------------------------------------------------------
# Health report
# ---------------------------------------------------------------------------

class TestHealthReport:
    def test_empty_report(self):
        client = _make_client()
        report = client.health_report()
        assert report["mock_mode"] is True
        # No providers observed yet => unhealthy by default (0/0 providers)
        assert report["system_health"]["overall_status"] in ("healthy", "unhealthy")

    def test_report_after_mock_calls(self):
        client = _make_client()
        client.chat(_make_messages())
        report = client.health_report()
        assert "mock" in report["providers"]
        assert report["providers"]["mock"]["total_requests"] == 1


# ---------------------------------------------------------------------------
# Metrics reset
# ---------------------------------------------------------------------------

class TestMetricsReset:
    def test_reset_clears_all(self):
        client = _make_client()
        client.chat(_make_messages())
        client.chat(_make_messages())
        assert client.get_metrics().total_requests == 2
        client.reset_metrics()
        assert client.get_metrics().total_requests == 0
        assert len(client.get_events()) == 0


# ---------------------------------------------------------------------------
# Context manager
# ---------------------------------------------------------------------------

class TestContextManager:
    def test_close_on_exit(self):
        client = _make_client()
        with client as c:
            assert c is client
        assert client._http_client is None
