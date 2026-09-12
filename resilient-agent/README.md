# ResilientAgent

> **Fault-tolerant multi-agent system built on TrueFoundry AI Gateway**
> Graceful degradation when LLM providers fail, MCP servers error, or APIs brown out.

---

## The Problem

AI agents are only as reliable as their infrastructure. When OpenAI browns out, Anthropic errors, or an MCP server crashes, most agents simply fail — leaving users staring at error messages. In production environments, this is unacceptable. Business operations agents handling customer support, data analysis, and workflow automation must remain functional even when the underlying AI infrastructure is in chaos.

## The Solution

**ResilientAgent** is a multi-agent orchestration system that routes every LLM call through TrueFoundry's AI Gateway with five layers of resilience:

### Architecture

```
User Request
    │
    ▼
┌──────────────────────────────────────────────────┐
│              ResilientAgent                       │
│                                                   │
│  ┌─────────┐  ┌─────────┐  ┌─────────────────┐  │
│  │ Circuit  │  │ Fallback│  │  Semantic       │  │
│  │ Breaker  │  │ Chain   │  │  Cache          │  │
│  │ Layer    │  │ Layer   │  │  Layer          │  │
│  └────┬─────┘  └────┬────┘  └───────┬─────────┘  │
│       │             │                │            │
│  ┌────▼─────────────▼────────────────▼─────────┐  │
│  │        TrueFoundry AI Gateway                │  │
│  │   (Virtual Models, Retry, Load Balancing)    │  │
│  └────┬──────────┬──────────┬──────────┬───────┘  │
│       │          │          │          │          │
│  Claude Sonnet  GPT-4o   Gemini Flash  Claude Haiku│
│  (Primary)      (Backup)  (Fast)       (Last Resort)│
└──────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────┐
│           Multi-Agent Orchestrator                 │
│                                                   │
│  ┌──────────────┐  ┌───────────────────────────┐ │
│  │  Orchestrator │  │  Sub-Agents (parallel)    │ │
│  │  (Claude)     │  │  • Analyst (GPT-4o)       │ │
│  │              │──│  • Executor (Gemini Flash) │ │
│  │  Plans &     │  │                            │ │
│  │  Delegates   │  │  Each with own fallback    │ │
│  └──────────────┘  └───────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

### Five Layers of Resilience

| Layer | What It Does | User Impact |
|-------|-------------|-------------|
| **1. TrueFoundry Virtual Models** | Retry + fallback across providers | Invisible failover between Claude, GPT-4o, Gemini |
| **2. Circuit Breaker** | Stops hammering a failing provider | Fast failure detection, no wasted latency |
| **3. Multi-Level Fallback Chain** | orchestrator → analyst → executor → fallback | Every request finds a working model |
| **4. Semantic Cache** | Serves recent responses instantly | Zero-latency responses for repeat queries during outage |
| **5. Degraded Mode UX** | Clear status indicators, not raw errors | Users always get a response, never a stack trace |

### Demo Scenarios

The system handles these real-world chaos scenarios:

1. **Single Provider Outage** — Claude Sonnet goes down → seamless fallback to GPT-4o
2. **Cascade Failure** — 3 of 4 providers fail → routes to last healthy model
3. **Circuit Breaker Trip** — Failing provider circuit opens → skipped instantly (no timeout)
4. **Cache Rescue** — All providers down → serves cached response (zero latency)
5. **Total Failure** — Everything down → friendly degraded-mode message with context
6. **Auto-Recovery** — Providers come back → circuits close → normal operation resumes

---

## Quick Start

### Prerequisites

- Python 3.10+
- [TrueFoundry account](https://www.truefoundry.com/) with API key
- TrueFoundry CLI: `pip install truefoundry`

### 1. Get Your TrueFoundry Credentials

```bash
# Login to TrueFoundry
tfy login --host https://your-org.truefoundry.cloud

# Or set environment variables
export TFY_GATEWAY_URL=https://gateway.truefoundry.ai
export TFY_API_KEY=tfy-your-key-here
```

### 2. Configure Virtual Models

In your TrueFoundry dashboard, create these virtual models with fallback chains:

| Virtual Model | Primary | Fallback 1 | Fallback 2 |
|--------------|---------|------------|------------|
| orchestrator | Claude Sonnet (Bedrock) | GPT-4o (OpenAI) | Gemini Flash |
| analyst | GPT-4o (OpenAI) | Claude Sonnet (Bedrock) | Gemini Flash |
| executor | Gemini Flash | GPT-4o (OpenAI) | Claude Haiku |

### 3. Run

```bash
# Install dependencies
pip install -r requirements.txt

# Copy and edit environment
cp .env.example .env
# Edit .env with your TFY_API_KEY

# Start the server
make run
# or: python -m uvicorn app.agent:create_app --factory --host 0.0.0.0 --port 8000 --reload
```

### 4. Run Chaos Demo

```bash
make demo
# or: python -m tools.chaos_demo
```

This simulates provider outages and shows resilience in action.

---

## API Reference

Once running at `http://localhost:8000`:

### `POST /run` — Execute Multi-Agent Workflow

```bash
curl -X POST http://localhost:8000/run \
  -H "Content-Type: application/json" \
  -d '{"query": "Analyze Q3 revenue data and create action items for underperforming regions"}'
```

Response includes the plan, per-task results, which model handled each task, and whether fallback was used.

### `POST /chat` — Direct Chat with Resilience

```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "Summarize the latest financial report", "model": "analyst"}'
```

### `POST /chaos` — Simulate Infrastructure Chaos

```bash
# Fail the primary orchestrator model
curl -X POST http://localhost:8000/chaos \
  -d '{"action": "fail_model", "target": "orchestrator"}'

# Fail MCP server
curl -X POST http://localhost:8000/chaos \
  -d '{"action": "fail_mcp"}'

# Restore all systems
curl -X POST http://localhost:8000/chaos \
  -d '{"action": "restore"}'
```

### `GET /metrics` — Resilience Observability

```bash
curl http://localhost:8000/metrics
```

Returns: total requests, success rate, fallback usage, cache hits, circuit breaker states, and recent request log.

### `GET /health` — Health Check

```bash
curl http://localhost:8000/health
```

### Interactive Docs

Visit `http://localhost:8000/docs` for Swagger UI.

---

## Docker

```bash
# Build
docker build -t resilient-agent .

# Run
docker run -p 8000:8000 --env-file .env resilient-agent

# Or with docker-compose
docker compose up -d
```

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| **AI Gateway** | TrueFoundry AI Gateway (virtual models, retry, fallback) |
| **LLM Providers** | Claude Sonnet, GPT-4o, Gemini Flash, Claude Haiku |
| **Multi-Agent** | Custom orchestrator with parallel sub-agent execution |
| **Resilience** | Circuit breaker, fallback chains, semantic caching |
| **API** | FastAPI with OpenAPI docs |
| **Runtime** | Python 3.12, Uvicorn |
| **Container** | Docker + Docker Compose |

---

## How It Works

### Fallback Chain

Every LLM call goes through a priority-ordered fallback chain:

```
Request for "orchestrator"
  → Try Claude Sonnet (Bedrock)
    ✗ Timeout/Error → Circuit breaker records failure
  → Try GPT-4o (OpenAI)
    ✗ Rate limited → Circuit breaker records failure
  → Try Gemini Flash
    ✓ Success! Cache response, return to user
```

If all models fail, the system checks its semantic cache for any recent matching response. If found, it serves the cached result instantly. If nothing is cached, it returns a friendly degraded-mode message explaining the situation.

### Circuit Breaker

Each model has an independent circuit breaker that tracks consecutive failures:

- **CLOSED** (normal): Requests flow through
- **OPEN** (failing): After 3 consecutive failures, circuit opens for 30 seconds — no requests sent
- **HALF_OPEN** (probing): After timeout, allows one test request to check if provider recovered

### Multi-Agent Orchestration

The orchestrator agent receives user requests and creates execution plans:

1. **Orchestrator** (Claude Sonnet) analyzes the request and creates a task plan
2. **Analyst** (GPT-4o) handles data analysis, insights, and report generation tasks
3. **Executor** (Gemini Flash) handles action items — tickets, notifications, workflows

Each sub-agent independently benefits from the full resilience stack.

---

## Why This Matters

Traditional AI agents have a single point of failure — their LLM provider. ResilientAgent eliminates this by:

- **Never showing users an error** — every request gets a response, even during total infrastructure failure
- **Transparent observability** — metrics endpoint shows exactly what's happening: which models are up, which circuits are open, how often fallback is used
- **Zero-config resilience** — TrueFoundry's virtual models handle provider-level failover; our code adds application-level circuit breaking and caching
- **Cost optimization** — cheaper models (Gemini Flash) handle simple tasks; premium models (Claude Sonnet) handle complex planning; fallback ensures continuity

---

## License

MIT

---

## CHP Governance

This repository is hardened with the [Consensus Hardening Protocol (CHP)](https://codeberg.org/cubiczan/consensus-hardening-protocol), Cubiczan's decision-governance layer for multi-agent AI systems.

### Protocol Layers
- **R0 Gate**: All decisions must pass Solvable, Scoped, Valid, Worth_it checks
- **Foundation Disclosure**: 1-3 weakest assumptions, 1-2 invalidation conditions, 1 key vulnerability
- **Adversarial Layer**: Mandatory devil's advocate at Phase 0 and Round 3
- **State Machine**: EXPLORING → PROVISIONAL → PROVISIONAL_LOCK → LOCKED
- **Third-Party Validation**: Independent CONFIRM/REJECT before lock

### Domain Configuration
- **Category**: AI / Agents
- **Foundation Threshold**: 70
- **CFO Accuracy Guard**: Disabled

### Compliance Artifacts
| File | Purpose |
|------|---------|
| `.chp/STATE_MACHINE.md` | Decision state transitions |
| `.chp/R0_CONFIG.yaml` | Domain-calibrated thresholds |
| `.chp/ADVERSARIAL_PROMPTS.md` | Standardized challenge templates |
| `.chp/CHP_COMPLIANCE.md` | Compliance tracking & audit trail |

### CHP Version
cognitive-mesh-orchestrator 0.1.0 | [Protocol Docs](https://codeberg.org/cubiczan/consensus-hardening-protocol)

