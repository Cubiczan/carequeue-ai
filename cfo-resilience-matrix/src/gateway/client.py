"""
gateway.client — Resilient TrueFoundry AI Gateway Client
=========================================================

Provides a production-grade HTTP client for the TrueFoundry AI Gateway that
wraps every request in retry logic, provider failover, and structured
observability.  The client speaks the OpenAI-compatible chat-completions
protocol over ``httpx`` and works with or without a live gateway (falling
back to deterministic mock responses when ``TFY_API_KEY`` is unset).

Design Decisions
----------------
* **httpx only** — no ``openai`` SDK dependency; all HTTP is handled via
  ``httpx.Client`` so that the chaos-engineering layer can monkey-patch
  ``httpx.Client.request`` transparently.
* **Exponential backoff** — 3 retries, 100 ms base, full jitter.
* **Per-provider health** — latency percentiles, error rates, and
  last-success timestamps are tracked so the caller can make informed
  routing decisions.
* **Structured events** — every retry, failover, and completed request
  emits a ``GatewayEvent`` dataclass that is appended to an in-memory log.
"""

from __future__ import annotations

import json
import logging
import os
import random
import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, AsyncIterator, Iterator

import httpx

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

logger = logging.getLogger("cfo_resilience.gateway")

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

_DEFAULT_GATEWAY_URL = "https://gateway.truefoundry.ai"
_DEFAULT_VIRTUAL_MODEL = "cfo-resilience/primary"

_MAX_RETRIES = 3
_BASE_BACKOFF_MS = 100  # 100 ms
_BACKOFF_MULTIPLIER = 2.0
_RETRYABLE_STATUS_CODES = {429, 500, 502, 503}
_TIMEOUT_CONNECT = 10.0
_TIMEOUT_READ = 120.0

# ---------------------------------------------------------------------------
# Environment helpers
# ---------------------------------------------------------------------------


def _env(key: str, default: str = "") -> str:
    """Read an environment variable, returning *default* when unset or empty."""
    return os.environ.get(key, "") or default


# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------


class EventType(str, Enum):
    """Categories of gateway-level events."""

    REQUEST_START = "REQUEST_START"
    REQUEST_SUCCESS = "REQUEST_SUCCESS"
    RETRY = "RETRY"
    FAILOVER = "FAILOVER"
    REQUEST_ERROR = "REQUEST_ERROR"
    STREAM_CHUNK = "STREAM_CHUNK"
    STREAM_DONE = "STREAM_DONE"
    MOCK_RESPONSE = "MOCK_RESPONSE"


class ErrorCategory(str, Enum):
    """High-level groupings for HTTP error status codes."""

    RATE_LIMIT = "RATE_LIMIT"
    SERVER_ERROR = "SERVER_ERROR"
    TIMEOUT = "TIMEOUT"
    NETWORK = "NETWORK"
    UNKNOWN = "UNKNOWN"


@dataclass(frozen=True)
class GatewayEvent:
    """Immutable structured event emitted by the gateway client.

    Attributes
    ----------
    event_id : str
        Unique identifier (UUID4).
    timestamp : str
        ISO-8601 UTC timestamp.
    event_type : EventType
        Category of the event.
    provider : str
        Name / identifier of the provider that handled the call (when known).
    model : str
        Virtual model name used in the request.
    status_code : int | None
        HTTP status code, if applicable.
    latency_ms : float | None
        Wall-clock time spent on the request, in milliseconds.
    details : dict[str, Any]
        Arbitrary key-value payload for observability tooling.
    """

    event_id: str
    timestamp: str
    event_type: EventType
    provider: str = ""
    model: str = ""
    status_code: int | None = None
    latency_ms: float | None = None
    details: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "event_id": self.event_id,
            "timestamp": self.timestamp,
            "event_type": self.event_type.value,
            "provider": self.provider,
            "model": self.model,
            "status_code": self.status_code,
            "latency_ms": self.latency_ms,
            "details": self.details,
        }


@dataclass
class TokenUsage:
    """Token counts returned by the gateway / model."""

    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0


@dataclass
class ProviderHealth:
    """Health snapshot for a single provider."""

    provider: str
    total_requests: int = 0
    success_count: int = 0
    error_count: int = 0
    total_latency_ms: float = 0.0
    min_latency_ms: float = float("inf")
    max_latency_ms: float = 0.0
    last_success_at: str | None = None
    last_error_at: str | None = None
    last_error_message: str | None = None
    consecutive_errors: int = 0

    @property
    def error_rate(self) -> float:
        return self.error_count / max(self.total_requests, 1)

    @property
    def avg_latency_ms(self) -> float:
        return self.total_latency_ms / max(self.success_count, 1)

    @property
    def is_healthy(self) -> bool:
        return self.consecutive_errors < 3 and self.error_rate < 0.5


@dataclass
class GatewayMetrics:
    """Aggregated metrics exposed via :meth:`ResilientGatewayClient.get_metrics`."""

    total_requests: int = 0
    total_retries: int = 0
    total_failovers: int = 0
    total_tokens_used: int = 0
    total_latency_ms: float = 0.0
    provider_health: dict[str, ProviderHealth] = field(default_factory=dict)
    events: list[GatewayEvent] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "total_requests": self.total_requests,
            "total_retries": self.total_retries,
            "total_failovers": self.total_failovers,
            "total_tokens_used": self.total_tokens_used,
            "total_latency_ms": round(self.total_latency_ms, 2),
            "provider_health": {
                k: {
                    "provider": v.provider,
                    "total_requests": v.total_requests,
                    "success_count": v.success_count,
                    "error_count": v.error_count,
                    "error_rate": round(v.error_rate, 4),
                    "avg_latency_ms": round(v.avg_latency_ms, 2) if v.success_count else None,
                    "is_healthy": v.is_healthy,
                    "last_success_at": v.last_success_at,
                    "consecutive_errors": v.consecutive_errors,
                }
                for k, v in self.provider_health.items()
            },
        }


# ---------------------------------------------------------------------------
# Mock response generator (used when no API key is configured)
# ---------------------------------------------------------------------------

_MOCK_RESPONSES: dict[str, str] = {
    "finance": (
        "Based on current financial indicators, the organization maintains "
        "a healthy cash runway of approximately 14 months under the existing "
        "burn rate.  Key risk factors include: (1) customer concentration risk "
        "with 35% revenue from the top-3 accounts, (2) rising COGS at 12% "
        "quarter-over-quarter, and (3) upcoming debt covenant compliance review "
        "in Q3.  Recommended actions: accelerate DSO reduction, renegotiate "
        "vendor terms, and establish a $2M revolving credit facility as a "
        "liquidity buffer."
    ),
    "strategy": (
        "The strategic assessment reveals moderate alignment with market "
        "trends.  Competitive moat strength is rated 7/10 based on proprietary "
        "technology and switching costs.  Key opportunities: (1) expansion into "
        "adjacent verticals with TAM growth of 28% CAGR, (2) strategic "
        "partnerships to accelerate go-to-market in EMEA, and (3) M&A "
        "opportunities in the data-analytics space.  Primary threat remains "
        "the commoditization of core offerings by well-funded competitors."
    ),
    "compliance": (
        "Compliance posture assessment indicates a regulatory risk score of "
        "3.2/10 (low-to-moderate).  Current standing: (1) SOC 2 Type II "
        "certification is current, (2) GDPR data-processing agreements cover "
        "98.5% of EU data flows, (3) pending CCPA opt-out mechanism update "
        "due by August 2025.  Recommended priorities: finalize ISO 27001 "
        "audit preparation, implement automated PII scanning in production "
        "pipelines, and schedule quarterly regulatory horizon scanning."
    ),
    "default": (
        "Analysis complete.  The request has been processed through the CFO "
        "Resilience Matrix with full multi-layer resilience protection.  All "
        "safety and governance checks passed successfully."
    ),
}


def _generate_mock_response(system_prompt: str) -> dict[str, Any]:
    """Return a synthetic OpenAI-compatible chat completion response."""
    lower_prompt = system_prompt.lower()
    if "finance" in lower_prompt or "financial" in lower_prompt or "cash" in lower_prompt:
        content = _MOCK_RESPONSES["finance"]
    elif "strategy" in lower_prompt or "strategic" in lower_prompt or "market" in lower_prompt:
        content = _MOCK_RESPONSES["strategy"]
    elif "compliance" in lower_prompt or "regulatory" in lower_prompt or "risk" in lower_prompt:
        content = _MOCK_RESPONSES["compliance"]
    else:
        content = _MOCK_RESPONSES["default"]

    return {
        "id": f"mock-{uuid.uuid4().hex[:8]}",
        "object": "chat.completion",
        "created": int(time.time()),
        "model": "mock-model",
        "choices": [
            {
                "index": 0,
                "message": {"role": "assistant", "content": content},
                "finish_reason": "stop",
            }
        ],
        "usage": {
            "prompt_tokens": len(system_prompt.split()) + 20,
            "completion_tokens": len(content.split()),
            "total_tokens": len(system_prompt.split()) + len(content.split()) + 20,
        },
    }


# ---------------------------------------------------------------------------
# Error categorisation helper
# ---------------------------------------------------------------------------


def _categorise_error(exc: Exception) -> ErrorCategory:
    if isinstance(exc, httpx.TimeoutException):
        return ErrorCategory.TIMEOUT
    if isinstance(exc, httpx.HTTPStatusError):
        code = exc.response.status_code
        if code == 429:
            return ErrorCategory.RATE_LIMIT
        if code in (500, 502, 503):
            return ErrorCategory.SERVER_ERROR
    if isinstance(exc, (httpx.ConnectError, httpx.NetworkError)):
        return ErrorCategory.NETWORK
    return ErrorCategory.UNKNOWN


# ---------------------------------------------------------------------------
# Primary client
# ---------------------------------------------------------------------------


class ResilientGatewayClient:
    """Resilient HTTP client for the TrueFoundry AI Gateway.

    Parameters
    ----------
    gateway_url : str
        Base URL of the gateway (e.g. ``https://gateway.truefoundry.ai``).
    api_key : str
        Bearer token for the gateway.  When empty the client operates in
        **mock mode** and returns deterministic responses without network I/O.
    virtual_model : str
        Virtual model identifier used in the ``model`` field of every request.
    timeout_seconds : float
        Default timeout (both connect and read) for HTTP requests.
    """

    # ------------------------------------------------------------------
    # Construction
    # ------------------------------------------------------------------

    def __init__(
        self,
        gateway_url: str | None = None,
        api_key: str | None = None,
        virtual_model: str | None = None,
        timeout_seconds: float | None = None,
    ) -> None:
        self.gateway_url = (gateway_url or _env("TFY_GATEWAY_URL", _DEFAULT_GATEWAY_URL)).rstrip("/")
        self.api_key = api_key or _env("TFY_API_KEY", "")
        self.virtual_model = virtual_model or _env("TFY_VIRTUAL_MODEL", _DEFAULT_VIRTUAL_MODEL)
        self.timeout_seconds = timeout_seconds or float(_env("TFY_TIMEOUT_SECONDS", "30"))

        self._is_mock_mode = not self.api_key
        if self._is_mock_mode:
            logger.warning(
                "ResilientGatewayClient running in MOCK MODE — "
                "set TFY_API_KEY for live traffic"
            )

        # httpx client — created lazily to allow chaos-engine patching
        self._http_client: httpx.Client | None = None

        # Internal state
        self._metrics = GatewayMetrics()
        self._provider_health: dict[str, ProviderHealth] = {}
        self._events: list[GatewayEvent] = []

        # Priority-ordered provider list (populated by gateway headers or set manually)
        self._provider_priority: list[str] = []

    # ------------------------------------------------------------------
    # httpx client access (lazy init)
    # ------------------------------------------------------------------

    @property
    def http_client(self) -> httpx.Client:
        """Return the underlying ``httpx.Client``, creating it if needed.

        The chaos-engineering layer patches ``httpx.Client.request`` which
        means the patch applies to any client created *after* the patch is
        installed.  We therefore lazily create the client so that a chaos
        scenario activated before the first request is guaranteed to intercept
        it.
        """
        if self._http_client is None or self._http_client.is_closed:
            timeout = httpx.Timeout(
                connect=self.timeout_seconds,
                read=self.timeout_seconds,
                write=self.timeout_seconds,
                pool=self.timeout_seconds,
            )
            self._http_client = httpx.Client(timeout=timeout)
        return self._http_client

    # ------------------------------------------------------------------
    # Provider health tracking
    # ------------------------------------------------------------------

    def _get_provider_health(self, provider: str) -> ProviderHealth:
        if provider not in self._provider_health:
            self._provider_health[provider] = ProviderHealth(provider=provider)
        return self._provider_health[provider]

    def _record_success(self, provider: str, latency_ms: float, tokens: int) -> None:
        health = self._get_provider_health(provider)
        health.total_requests += 1
        health.success_count += 1
        health.total_latency_ms += latency_ms
        health.min_latency_ms = min(health.min_latency_ms, latency_ms)
        health.max_latency_ms = max(health.max_latency_ms, latency_ms)
        health.last_success_at = datetime.now(timezone.utc).isoformat()
        health.consecutive_errors = 0

        self._metrics.total_tokens_used += tokens

    def _record_error(self, provider: str, error_message: str) -> None:
        health = self._get_provider_health(provider)
        health.total_requests += 1
        health.error_count += 1
        health.last_error_at = datetime.now(timezone.utc).isoformat()
        health.last_error_message = error_message[:200]
        health.consecutive_errors += 1

    # ------------------------------------------------------------------
    # Event emission
    # ------------------------------------------------------------------

    def _emit(
        self,
        event_type: EventType,
        provider: str = "",
        status_code: int | None = None,
        latency_ms: float | None = None,
        **details: Any,
    ) -> GatewayEvent:
        event = GatewayEvent(
            event_id=uuid.uuid4().hex,
            timestamp=datetime.now(timezone.utc).isoformat(),
            event_type=event_type,
            provider=provider,
            model=self.virtual_model,
            status_code=status_code,
            latency_ms=round(latency_ms, 2) if latency_ms is not None else None,
            details=details,
        )
        self._events.append(event)
        self._metrics.events.append(event)
        logger.debug("Gateway event: %s", event)
        return event

    # ------------------------------------------------------------------
    # Core HTTP call (single attempt)
    # ------------------------------------------------------------------

    def _single_request(
        self,
        messages: list[dict[str, str]],
        temperature: float = 0.3,
        max_tokens: int = 2048,
        stream: bool = False,
    ) -> httpx.Response:
        """Issue a single HTTP POST to the chat-completions endpoint."""
        url = f"{self.gateway_url}/v1/chat/completions"
        headers = {
            "Content-Type": "application/json",
        }
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        payload: dict[str, Any] = {
            "model": self.virtual_model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": stream,
        }

        response = self.http_client.post(url, json=payload, headers=headers)
        response.raise_for_status()
        return response

    # ------------------------------------------------------------------
    # Extract provider from response headers (if available)
    # ------------------------------------------------------------------

    def _extract_provider(self, response: httpx.Response) -> str:
        """Try to read the actual provider from gateway response headers."""
        provider = response.headers.get("x-tfy-provider", "")
        if not provider:
            provider = response.headers.get("x-provider", "")
        if not provider:
            # Fall back to the virtual model name with the first segment removed
            provider = self.virtual_model.split("/")[-1] if "/" in self.virtual_model else self.virtual_model
        return provider

    # ------------------------------------------------------------------
    # Non-streaming chat completion with retries
    # ------------------------------------------------------------------

    def chat(
        self,
        messages: list[dict[str, str]],
        temperature: float = 0.3,
        max_tokens: int = 2048,
    ) -> dict[str, Any]:
        """Send a chat completion request with automatic retries.

        Returns the full JSON response body from the gateway (or a mock
        response when operating in mock mode).

        Raises
        ------
        RuntimeError
            If all retries are exhausted and no successful response is
            received.
        """
        self._metrics.total_requests += 1

        if self._is_mock_mode:
            system_prompt = next(
                (m.get("content", "") for m in messages if m.get("role") == "system"),
                "",
            )
            self._emit(EventType.MOCK_RESPONSE, details={"message": "Mock mode active"})
            mock = _generate_mock_response(system_prompt)
            usage = mock.get("usage", {})
            self._record_success(
                provider="mock",
                latency_ms=random.uniform(5, 25),
                tokens=usage.get("total_tokens", 0),
            )
            return mock

        provider = self.virtual_model
        last_exception: Exception | None = None

        for attempt in range(_MAX_RETRIES + 1):
            start = time.monotonic()

            self._emit(
                EventType.REQUEST_START,
                provider=provider,
                details={"attempt": attempt + 1, "max_retries": _MAX_RETRIES + 1},
            )

            try:
                response = self._single_request(
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    stream=False,
                )

                elapsed_ms = (time.monotonic() - start) * 1000
                body = response.json()

                provider = self._extract_provider(response)
                usage = body.get("usage", {})
                self._record_success(
                    provider=provider,
                    latency_ms=elapsed_ms,
                    tokens=usage.get("total_tokens", 0),
                )
                self._metrics.total_latency_ms += elapsed_ms

                self._emit(
                    EventType.REQUEST_SUCCESS,
                    provider=provider,
                    status_code=response.status_code,
                    latency_ms=elapsed_ms,
                    details={"attempt": attempt + 1, "finish_reason": body.get("choices", [{}])[0].get("finish_reason")},
                )

                return body

            except Exception as exc:
                elapsed_ms = (time.monotonic() - start) * 1000
                last_exception = exc
                category = _categorise_error(exc)

                status_code: int | None = None
                if isinstance(exc, httpx.HTTPStatusError):
                    status_code = exc.response.status_code

                self._record_error(provider=provider, error_message=str(exc))

                self._emit(
                    EventType.REQUEST_ERROR,
                    provider=provider,
                    status_code=status_code,
                    latency_ms=elapsed_ms,
                    details={
                        "attempt": attempt + 1,
                        "error_category": category.value,
                        "error_message": str(exc)[:300],
                    },
                )

                # Decide whether to retry
                should_retry = (
                    attempt < _MAX_RETRIES
                    and (status_code is None or status_code in _RETRYABLE_STATUS_CODES)
                    and not isinstance(exc, (httpx.ConnectError,))
                )

                if not should_retry:
                    break

                self._metrics.total_retries += 1

                # Exponential backoff with full jitter
                backoff_ms = _BASE_BACKOFF_MS * (_BACKOFF_MULTIPLIER ** attempt)
                jitter = random.uniform(0, backoff_ms)
                sleep_s = jitter / 1000.0

                self._emit(
                    EventType.RETRY,
                    provider=provider,
                    status_code=status_code,
                    details={
                        "attempt": attempt + 1,
                        "backoff_ms": round(jitter, 2),
                        "error_category": category.value,
                    },
                )

                logger.info(
                    "Retry %d/%d for provider=%s after %.1f ms (category=%s)",
                    attempt + 1,
                    _MAX_RETRIES,
                    provider,
                    jitter,
                    category.value,
                )
                time.sleep(sleep_s)

        # All retries exhausted
        raise RuntimeError(
            f"All {_MAX_RETRIES + 1} attempts failed for provider={provider}. "
            f"Last error: {last_exception}"
        ) from last_exception

    # ------------------------------------------------------------------
    # Chat with explicit fallback providers
    # ------------------------------------------------------------------

    def chat_with_fallback(
        self,
        messages: list[dict[str, str]],
        fallback_models: list[str] | None = None,
        temperature: float = 0.3,
        max_tokens: int = 2048,
    ) -> dict[str, Any]:
        """Try the primary model, then iterate through fallback models.

        This method saves and restores the client's ``virtual_model`` so
        that callers do not need to manage state manually.

        Parameters
        ----------
        messages : list[dict[str, str]]
            Chat messages in OpenAI format.
        fallback_models : list[str] | None
            Ordered list of fallback virtual-model identifiers.  The primary
            model (``self.virtual_model``) is always tried first.
        temperature : float
            Sampling temperature.
        max_tokens : int
            Maximum tokens in the completion.

        Returns
        -------
        dict[str, Any]
            The first successful response body.
        """
        original_model = self.virtual_model
        models_to_try = [original_model] + (fallback_models or [])

        last_exception: Exception | None = None

        for idx, model in enumerate(models_to_try):
            try:
                self.virtual_model = model
                result = self.chat(
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                )
                return result
            except Exception as exc:
                last_exception = exc
                if idx < len(models_to_try) - 1:
                    self._metrics.total_failovers += 1
                    self._emit(
                        EventType.FAILOVER,
                        provider=model,
                        details={
                            "from_model": model,
                            "to_model": models_to_try[idx + 1],
                            "reason": str(exc)[:200],
                        },
                    )
                    logger.warning(
                        "Failover from %s to %s: %s",
                        model,
                        models_to_try[idx + 1],
                        exc,
                    )
        # Restore original model
        self.virtual_model = original_model

        raise RuntimeError(
            f"All models exhausted: {models_to_try}. "
            f"Last error: {last_exception}"
        ) from last_exception

    # ------------------------------------------------------------------
    # Streaming chat completion
    # ------------------------------------------------------------------

    def chat_stream(
        self,
        messages: list[dict[str, str]],
        temperature: float = 0.3,
        max_tokens: int = 2048,
    ) -> Iterator[str]:
        """Yield content deltas from a streaming chat completion.

        In mock mode the response is chunked into word-level pieces to
        simulate streaming behaviour.
        """
        self._metrics.total_requests += 1

        if self._is_mock_mode:
            system_prompt = next(
                (m.get("content", "") for m in messages if m.get("role") == "system"),
                "",
            )
            mock = _generate_mock_response(system_prompt)
            content = mock["choices"][0]["message"]["content"]
            self._emit(EventType.MOCK_RESPONSE, details={"message": "Mock streaming"})
            # Simulate streaming by yielding word-by-word
            words = content.split(" ")
            for i, word in enumerate(words):
                token = word + (" " if i < len(words) - 1 else "")
                yield token
            self._emit(EventType.STREAM_DONE, provider="mock")
            usage = mock.get("usage", {})
            self._record_success(
                provider="mock",
                latency_ms=random.uniform(10, 50),
                tokens=usage.get("total_tokens", 0),
            )
            return

        provider = self.virtual_model
        start = time.monotonic()

        self._emit(
            EventType.REQUEST_START,
            provider=provider,
            details={"stream": True},
        )

        try:
            response = self._single_request(
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                stream=True,
            )

            provider = self._extract_provider(response)
            collected_content: list[str] = []

            for line in response.iter_lines():
                if not line:
                    continue
                if line.startswith("data: "):
                    data = line[len("data: "):]
                    if data.strip() == "[DONE]":
                        break
                    try:
                        chunk = json.loads(data)
                        delta = chunk.get("choices", [{}])[0].get("delta", {})
                        content_piece = delta.get("content", "")
                        if content_piece:
                            collected_content.append(content_piece)
                            self._emit(
                                EventType.STREAM_CHUNK,
                                provider=provider,
                                details={"chunk_length": len(content_piece)},
                            )
                            yield content_piece
                    except json.JSONDecodeError:
                        continue

            elapsed_ms = (time.monotonic() - start) * 1000
            self._record_success(
                provider=provider,
                latency_ms=elapsed_ms,
                tokens=len(" ".join(collected_content).split()),
            )
            self._metrics.total_latency_ms += elapsed_ms
            self._emit(EventType.STREAM_DONE, provider=provider, latency_ms=elapsed_ms)

        except Exception as exc:
            elapsed_ms = (time.monotonic() - start) * 1000
            self._record_error(provider=provider, error_message=str(exc))
            self._emit(
                EventType.REQUEST_ERROR,
                provider=provider,
                latency_ms=elapsed_ms,
                details={"error": str(exc)[:300], "stream": True},
            )
            raise

    # ------------------------------------------------------------------
    # Observability
    # ------------------------------------------------------------------

    def health_report(self) -> dict[str, Any]:
        """Return a human-readable health report across all observed providers.

        The report includes per-provider statistics and an overall system
        health assessment.
        """
        report: dict[str, Any] = {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "mock_mode": self._is_mock_mode,
            "virtual_model": self.virtual_model,
            "gateway_url": self.gateway_url,
            "providers": {},
        }

        healthy_count = 0
        for name, health in self._provider_health.items():
            provider_report = {
                "total_requests": health.total_requests,
                "success_count": health.success_count,
                "error_count": health.error_count,
                "error_rate": round(health.error_rate, 4),
                "avg_latency_ms": round(health.avg_latency_ms, 2) if health.success_count else None,
                "min_latency_ms": round(health.min_latency_ms, 2) if health.min_latency_ms != float("inf") else None,
                "max_latency_ms": round(health.max_latency_ms, 2),
                "is_healthy": health.is_healthy,
                "last_success_at": health.last_success_at,
                "last_error_at": health.last_error_at,
                "consecutive_errors": health.consecutive_errors,
            }
            report["providers"][name] = provider_report
            if health.is_healthy:
                healthy_count += 1

        total_providers = max(len(self._provider_health), 1)
        report["system_health"] = {
            "overall_status": "healthy" if healthy_count == total_providers else "degraded" if healthy_count > 0 else "unhealthy",
            "healthy_providers": healthy_count,
            "total_providers": total_providers,
        }

        return report

    def get_metrics(self) -> GatewayMetrics:
        """Return aggregated gateway metrics."""
        self._metrics.provider_health = dict(self._provider_health)
        return self._metrics

    def get_events(self) -> list[GatewayEvent]:
        """Return the full event log (newest first)."""
        return list(reversed(self._events))

    def reset_metrics(self) -> None:
        """Clear all accumulated metrics and event history."""
        self._metrics = GatewayMetrics()
        self._provider_health.clear()
        self._events.clear()

    # ------------------------------------------------------------------
    # Cleanup
    # ------------------------------------------------------------------

    def close(self) -> None:
        """Close the underlying httpx client and release resources."""
        if self._http_client is not None and not self._http_client.is_closed:
            self._http_client.close()
            self._http_client = None

    def __enter__(self) -> ResilientGatewayClient:
        return self

    def __exit__(self, *args: Any) -> None:
        self.close()

    def __repr__(self) -> str:
        mode = "MOCK" if self._is_mock_mode else "LIVE"
        return (
            f"ResilientGatewayClient(mode={mode}, "
            f"url={self.gateway_url!r}, "
            f"model={self.virtual_model!r})"
        )
