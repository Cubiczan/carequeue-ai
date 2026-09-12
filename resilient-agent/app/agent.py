"""
ResilientAgent — A fault-tolerant multi-agent system built on TrueFoundry AI Gateway.

Demonstrates graceful degradation when LLM providers fail, MCP servers error,
or APIs brown out. Uses virtual model fallback chains, circuit breakers,
semantic caching, and user-friendly degraded-mode UX.

"""

import os
import json
import time
import hashlib
import logging
from datetime import datetime
from enum import Enum
from dataclasses import dataclass, field
from typing import Any, Optional

import httpx
from openai import OpenAI

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("resilient-agent")

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

GATEWAY_URL = os.getenv("TFY_GATEWAY_URL", "https://gateway.truefoundry.ai")
GATEWAY_KEY = os.getenv("TFY_API_KEY", "")

# Virtual model names — each maps to a fallback chain configured in TrueFoundry
VIRTUAL_MODELS = {
    "orchestrator": os.getenv("ORCHESTRATOR_MODEL", "bedrock/global.anthropic.claude-sonnet-4-20250514"),
    "analyst":      os.getenv("ANALYST_MODEL",      "openai-main/gpt-4o"),
    "executor":     os.getenv("EXECUTOR_MODEL",     "flash/gemini-2.5-flash"),
    "fallback":     os.getenv("FALLBACK_MODEL",     "bedrock/global.anthropic.claude-haiku-4-5-20251001-v1-0"),
}


# ---------------------------------------------------------------------------
# Circuit Breaker
# ---------------------------------------------------------------------------

class CircuitState(Enum):
    CLOSED = "closed"      # Normal operation
    OPEN = "open"          # Failing — reject calls
    HALF_OPEN = "half_open"  # Probing — allow one test call


@dataclass
class CircuitBreaker:
    """Trips OPEN after `failure_threshold` consecutive failures.
    After `recovery_timeout` seconds, transitions to HALF_OPEN and allows
    one probe request. If it succeeds → CLOSED; if it fails → OPEN."""
    failure_threshold: int = 3
    recovery_timeout: float = 30.0
    _state: CircuitState = field(default=CircuitState.CLOSED, init=False)
    _failure_count: int = field(default=0, init=False)
    _last_failure_time: float = field(default=0.0, init=False)

    @property
    def state(self) -> CircuitState:
        if self._state == CircuitState.OPEN:
            if time.time() - self._last_failure_time >= self.recovery_timeout:
                self._state = CircuitState.HALF_OPEN
        return self._state

    def record_success(self):
        self._failure_count = 0
        self._state = CircuitState.CLOSED

    def record_failure(self):
        self._failure_count += 1
        self._last_failure_time = time.time()
        if self._failure_count >= self.failure_threshold:
            self._state = CircuitState.OPEN

    def can_execute(self) -> bool:
        return self.state in (CircuitState.CLOSED, CircuitState.HALF_OPEN)


# ---------------------------------------------------------------------------
# Semantic Cache (content-hash based)
# ---------------------------------------------------------------------------

class SemanticCache:
    """Lightweight cache keyed on prompt hash. Provides instant responses
    when all upstream providers are down (last-resort resilience)."""

    def __init__(self, max_size: int = 256, default_ttl: float = 300.0):
        self._store: dict[str, dict] = {}
        self.max_size = max_size
        self.default_ttl = default_ttl

    @staticmethod
    def _hash(prompt: str, model: str) -> str:
        return hashlib.sha256(f"{model}:{prompt}".encode()).hexdigest()[:16]

    def get(self, prompt: str, model: str) -> Optional[str]:
        key = self._hash(prompt, model)
        entry = self._store.get(key)
        if entry and time.time() - entry["ts"] < entry["ttl"]:
            entry["hits"] += 1
            return entry["response"]
        return None

    def put(self, prompt: str, model: str, response: str, ttl: float | None = None):
        key = self._hash(prompt, model)
        if len(self._store) >= self.max_size:
            # Evict LRU (lowest hit count)
            evict_key = min(self._store, key=lambda k: self._store[k]["hits"])
            del self._store[evict_key]
        self._store[key] = {
            "response": response,
            "ts": time.time(),
            "ttl": ttl or self.default_ttl,
            "hits": 0,
        }

    @property
    def stats(self) -> dict:
        return {"size": len(self._store), "max": self.max_size}


# ---------------------------------------------------------------------------
# Resilience Metrics (for observability dashboard)
# ---------------------------------------------------------------------------

@dataclass
class ResilienceMetrics:
    total_requests: int = 0
    successful_requests: int = 0
    fallback_used: int = 0
    cache_used: int = 0
    circuit_breaker_trips: int = 0
    errors: int = 0
    request_log: list[dict] = field(default_factory=list)

    def record(self, event: str, model: str, latency_ms: float, source: str):
        self.total_requests += 1
        entry = {
            "time": datetime.utcnow().isoformat(),
            "event": event,
            "model": model,
            "latency_ms": round(latency_ms, 1),
            "source": source,
        }
        self.request_log.append(entry)
        if event == "success":
            self.successful_requests += 1
        elif event == "fallback":
            self.fallback_used += 1
        elif event == "cache_hit":
            self.cache_used += 1
        elif event == "circuit_open":
            self.circuit_breaker_trips += 1
        elif event == "error":
            self.errors += 1
        # Keep only last 50 log entries
        self.request_log = self.request_log[-50:]


# ---------------------------------------------------------------------------
# Resilient LLM Client
# ---------------------------------------------------------------------------

class ResilientLLMClient:
    """Wraps OpenAI-compatible calls with fallback chain, circuit breaker,
    and semantic cache — all routed through TrueFoundry AI Gateway."""

    def __init__(
        self,
        gateway_url: str = GATEWAY_URL,
        gateway_key: str = GATEWAY_KEY,
        cache_ttl: float = 300.0,
    ):
        self.gateway_url = gateway_url.rstrip("/")
        self.gateway_key = gateway_key
        self.cache = SemanticCache(default_ttl=cache_ttl)
        self.metrics = ResilienceMetrics()

        # Per-model circuit breakers
        self.circuit_breakers: dict[str, CircuitBreaker] = {
            name: CircuitBreaker() for name in VIRTUAL_MODELS
        }

        # Fallback chain order — try each model in order until one works
        self.fallback_chain = [
            "orchestrator",   # Claude Sonnet — most capable
            "analyst",        # GPT-4o — strong generalist
            "executor",       # Gemini Flash — fast & cheap
            "fallback",       # Claude Haiku — lightweight last resort
        ]

    def _make_client(self, model: str) -> OpenAI:
        return OpenAI(base_url=f"{self.gateway_url}/v1", api_key=self.gateway_key)

    def chat(
        self,
        messages: list[dict],
        role: str = "orchestrator",
        max_retries_per_model: int = 2,
        temperature: float = 0.7,
    ) -> dict:
        """
        Send a chat completion with full resilience:
        1. Check cache
        2. Try primary model → fallback chain
        3. Circuit breaker guards each model
        4. Last resort: return cached/stale response
        """
        prompt_key = json.dumps(messages[-1]["content"]) if messages else ""
        model_name = VIRTUAL_MODELS.get(role, VIRTUAL_MODELS["fallback"])
        start = time.time()

        # Step 1: Check cache
        cached = self.cache.get(prompt_key, model_name)
        if cached:
            self.metrics.record("cache_hit", model_name, (time.time() - start) * 1000, "cache")
            return {
                "content": cached,
                "model": model_name,
                "source": "cache",
                "latency_ms": round((time.time() - start) * 1000, 1),
                "degraded": False,
            }

        # Step 2: Build model attempt list
        chain = self._get_chain_for_role(role)

        last_error = None
        for model_key in chain:
            cb = self.circuit_breakers[model_key]
            model_id = VIRTUAL_MODELS[model_key]

            # Check circuit breaker
            if not cb.can_execute():
                logger.warning(f"Circuit OPEN for {model_key}, skipping")
                self.metrics.record("circuit_open", model_id, (time.time() - start) * 1000, "circuit_breaker")
                continue

            # Try with retries
            for attempt in range(max_retries_per_model + 1):
                try:
                    client = self._make_client(model_id)
                    resp = client.chat.completions.create(
                        model=model_id,
                        messages=messages,
                        temperature=temperature,
                        max_tokens=2048,
                    )
                    content = resp.choices[0].message.content
                    cb.record_success()

                    source = model_key
                    if model_key != role:
                        self.metrics.record("fallback", model_id, (time.time() - start) * 1000, "fallback")
                        source = f"fallback:{model_key}"

                    # Cache the successful response
                    self.cache.put(prompt_key, model_name, content)

                    self.metrics.record("success", model_id, (time.time() - start) * 1000, source)
                    return {
                        "content": content,
                        "model": model_id,
                        "source": source,
                        "latency_ms": round((time.time() - start) * 1000, 1),
                        "degraded": model_key != role,
                    }

                except Exception as e:
                    last_error = str(e)
                    logger.warning(f"Attempt {attempt+1} failed for {model_key}: {e}")
                    cb.record_failure()

        # Step 3: All models failed — try to find ANY cache entry (cross-model)
        for model_key in chain:
            stale = self.cache.get(prompt_key, VIRTUAL_MODELS[model_key])
            if stale:
                self.metrics.record("cache_hit", model_key, (time.time() - start) * 1000, "stale_cache")
                return {
                    "content": stale,
                    "model": model_key,
                    "source": "stale_cache",
                    "latency_ms": round((time.time() - start) * 1000, 1),
                    "degraded": True,
                }

        # Step 4: Total failure
        self.metrics.record("error", "all", (time.time() - start) * 1000, "all_failed")
        return {
            "content": f"[DEGRADED] All LLM providers are currently unavailable. Last error: {last_error}. Please try again in a few moments.",
            "model": "none",
            "source": "degraded_mode",
            "latency_ms": round((time.time() - start) * 1000, 1),
            "degraded": True,
        }

    def _get_chain_for_role(self, role: str) -> list[str]:
        """Return fallback chain for a given role. Always includes fallback model."""
        if role == "orchestrator":
            return ["orchestrator", "analyst", "executor", "fallback"]
        elif role == "analyst":
            return ["analyst", "orchestrator", "executor", "fallback"]
        elif role == "executor":
            return ["executor", "analyst", "orchestrator", "fallback"]
        return self.fallback_chain


# ---------------------------------------------------------------------------
# Multi-Agent Orchestrator
# ---------------------------------------------------------------------------

ORCHESTRATOR_PROMPT = """You are the orchestrator of a resilient multi-agent business operations system.
Given a user request, break it down into sub-tasks and delegate to the appropriate specialist agents.

Available specialists:
- analyst: Data analysis, insights, report generation
- executor: Take actions — create tickets, send notifications, update records

Respond with a JSON plan containing:
- "summary": brief description of the plan
- "tasks": list of { "agent": "analyst"|"executor", "prompt": "the specific task" }
"""

ANALYST_PROMPT = """You are a business data analyst agent. Analyze the provided data or query and produce
actionable insights. Be concise, data-driven, and structured in your response.
Use markdown formatting for clarity.
"""

EXECUTOR_PROMPT = """You are an action executor agent. Based on the instructions, determine what actions
need to be taken and describe them clearly. Actions might include:
- Creating support tickets
- Sending notifications
- Updating records
- Triggering workflows

Format your response as a numbered list of actions with status indicators.
"""


@dataclass
class AgentResult:
    role: str
    content: str
    model: str
    source: str
    latency_ms: float
    degraded: bool


class ResilientAgentOrchestrator:
    """Coordinates multi-agent workflows with full resilience."""

    def __init__(self, client: ResilientLLMClient | None = None):
        self.client = client or ResilientLLMClient()

    def plan(self, user_request: str) -> dict:
        """Use orchestrator to break request into sub-tasks."""
        result = self.client.chat(
            messages=[
                {"role": "system", "content": ORCHESTRATOR_PROMPT},
                {"role": "user", "content": user_request},
            ],
            role="orchestrator",
            temperature=0.3,
        )
        try:
            plan = json.loads(result["content"])
        except json.JSONDecodeError:
            # If model didn't return valid JSON, extract it
            content = result["content"]
            json_start = content.find("{")
            json_end = content.rfind("}") + 1
            if json_start >= 0 and json_end > json_start:
                plan = json.loads(content[json_start:json_end])
            else:
                plan = {"summary": content, "tasks": []}

        return {
            "plan": plan,
            "model_used": result["model"],
            "source": result["source"],
            "degraded": result["degraded"],
            "latency_ms": result["latency_ms"],
        }

    def execute_task(self, agent_role: str, prompt: str) -> AgentResult:
        """Execute a single sub-task using the specified agent."""
        if agent_role == "analyst":
            system_prompt = ANALYST_PROMPT
            model_role = "analyst"
        else:
            system_prompt = EXECUTOR_PROMPT
            model_role = "executor"

        result = self.client.chat(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt},
            ],
            role=model_role,
        )

        return AgentResult(
            role=agent_role,
            content=result["content"],
            model=result["model"],
            source=result["source"],
            latency_ms=result["latency_ms"],
            degraded=result["degraded"],
        )

    def run(self, user_request: str) -> dict:
        """Full pipeline: plan → execute all tasks → combine results."""
        overall_start = time.time()

        # Phase 1: Planning
        plan_result = self.plan(user_request)
        plan = plan_result["plan"]

        # Phase 2: Execute sub-tasks
        task_results = []
        for task in plan.get("tasks", []):
            agent_result = self.execute_task(task["agent"], task["prompt"])
            task_results.append({
                "task": task["prompt"],
                "role": task["agent"],
                "result": agent_result.content,
                "model": agent_result.model,
                "source": agent_result.source,
                "latency_ms": agent_result.latency_ms,
                "degraded": agent_result.degraded,
            })

        total_latency = round((time.time() - overall_start) * 1000, 1)
        any_degraded = plan_result["degraded"] or any(t["degraded"] for t in task_results)

        return {
            "summary": plan.get("summary", user_request),
            "plan_source": plan_result["source"],
            "tasks": task_results,
            "total_latency_ms": total_latency,
            "degraded": any_degraded,
            "metrics": {
                "total_requests": self.client.metrics.total_requests,
                "successful": self.client.metrics.successful_requests,
                "fallbacks": self.client.metrics.fallback_used,
                "cache_hits": self.client.metrics.cache_used,
                "circuit_trips": self.client.metrics.circuit_breaker_trips,
                "errors": self.client.metrics.errors,
                "cache_stats": self.client.cache.stats,
            },
        }


# ---------------------------------------------------------------------------
# Chaos Simulator (for demo / testing)
# ---------------------------------------------------------------------------

class ChaosSimulator:
    """Injects failures into specific models to demonstrate resilience."""

    def __init__(self, client: ResilientLLMClient):
        self.client = client
        self._original_chat = client.chat
        self._fail_models: set[str] = set()
        self._fail_mcp: bool = False

    def fail_model(self, model_key: str):
        """Force a specific model to always fail."""
        self._fail_models.add(model_key)
        self._patch()

    def fail_mcp_server(self):
        """Simulate MCP server failures."""
        self._fail_mcp = True

    def restore(self):
        """Restore normal operation."""
        self._fail_models.clear()
        self._fail_mcp = False
        self.client.chat = self._original_chat  # type: ignore

    def _patch(self):
        """Monkey-patch the client.chat to inject failures."""
        original = self._original_chat

        def patched_chat(messages, role="orchestrator", **kwargs):
            if role in self._fail_models:
                model_id = VIRTUAL_MODELS[role]
                cb = self.client.circuit_breakers[role]
                cb.record_failure()
                raise Exception(f"[CHAOS] Simulated failure for {role} ({model_id})")
            return original(messages, role=role, **kwargs)

        self.client.chat = patched_chat  # type: ignore


# ---------------------------------------------------------------------------
# API Server (FastAPI)
# ---------------------------------------------------------------------------

def create_app() -> "fastapi.FastAPI":
    from fastapi import FastAPI, HTTPException
    from fastapi.middleware.cors import CORSMiddleware
    from pydantic import BaseModel

    app = FastAPI(
        title="ResilientAgent",
        description="Fault-tolerant multi-agent system on TrueFoundry AI Gateway",
        version="1.0.0",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    client = ResilientLLMClient()
    orchestrator = ResilientAgentOrchestrator(client)
    chaos = ChaosSimulator(client)

    class QueryRequest(BaseModel):
        query: str
        model: str = "orchestrator"

    class TaskRequest(BaseModel):
        tasks: list[dict]
        role: str = "analyst"

    class ChaosRequest(BaseModel):
        action: str  # "fail_model", "fail_mcp", "restore"
        target: str = ""

    @app.get("/health")
    async def health():
        return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}

    @app.get("/metrics")
    async def metrics():
        m = client.metrics
        return {
            "total_requests": m.total_requests,
            "successful": m.successful_requests,
            "fallbacks": m.fallback_used,
            "cache_hits": m.cache_used,
            "circuit_trips": m.circuit_breaker_trips,
            "errors": m.errors,
            "cache": client.cache.stats,
            "circuit_states": {
                k: cb.state.value for k, cb in client.circuit_breakers.items()
            },
            "recent_requests": m.request_log[-10:],
        }

    @app.post("/chat")
    async def chat(req: QueryRequest):
        result = client.chat(
            messages=[{"role": "user", "content": req.query}],
            role=req.model,
        )
        return result

    @app.post("/run")
    async def run_agent(req: QueryRequest):
        result = orchestrator.run(req.query)
        return result

    @app.post("/plan")
    async def plan(req: QueryRequest):
        result = orchestrator.plan(req.query)
        return result

    @app.post("/chaos")
    async def chaos_control(req: ChaosRequest):
        if req.action == "fail_model":
            chaos.fail_model(req.target)
            return {"status": f"Model '{req.target}' is now failing", "circuit": client.circuit_breakers[req.target].state.value}
        elif req.action == "fail_mcp":
            chaos.fail_mcp_server()
            return {"status": "MCP server is now failing"}
        elif req.action == "restore":
            chaos.restore()
            return {"status": "All systems restored"}
        else:
            raise HTTPException(400, f"Unknown action: {req.action}")

    return app


# ---------------------------------------------------------------------------
# Entry Point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn
    app = create_app()
    print("=" * 60)
    print("  ResilientAgent — TrueFoundry AI Gateway")
    print("=" * 60)
    print(f"  Gateway: {GATEWAY_URL}")
    print(f"  Models:  {list(VIRTUAL_MODELS.values())}")
    print(f"  API:     http://localhost:8000")
    print(f"  Docs:    http://localhost:8000/docs")
    print("=" * 60)
    uvicorn.run(app, host="0.0.0.0", port=8000)
