# CFO Resilience Matrix

**6-Layer AI Agent Resilience for CFO Operations**

[![153 tests passing](https://img.shields.io/badge/tests-153%20passing-brightgreen)](tests/)
[![Python 3.11+](https://img.shields.io/badge/python-3.11%2B-blue)](pyproject.toml)
[![Apache 2.0](https://img.shields.io/badge/license-Apache%202.0-orange)](LICENSE)

![Thumbnail](docs/thumbnail.png)

---

## The Problem

AI agents powering enterprise finance operations face constant infrastructure chaos:

- **LLM provider outages** — OpenAI, Claude, or Gemini go down without warning
- **Rate limiting** — API brownouts throttle critical decision-making workflows
- **MCP server errors** — Tool-calling infrastructure fails mid-execution
- **Network partitions** — Intermittent connectivity breaks gateway connections
- **Cascading failures** — One provider's outage triggers overload on fallbacks

When these failures hit, most agent systems either **crash** or **return garbage responses** — neither is acceptable when a CFO is waiting for a cash-flow analysis or compliance risk assessment.

## Our Solution

**CFO Resilience Matrix** wraps every LLM call through a **6-layer resilience stack** built on top of [TrueFoundry's AI Gateway](https://docs.truefoundry.com/gateway/docs/ai-gateway), ensuring that CFO agents **degrade gracefully** instead of failing catastrophically.

```
┌──────────────┐   ┌───────────┐   ┌────────────┐   ┌───────────────┐   ┌────────────────┐   ┌─────────────────┐
│ 1. GATEWAY   │──▶│ 2. PARITY │──▶│3. GOVERNANCE│──▶│4. STATE MACHINE│──▶│5. USER EXPERIENCE│──▶│6. DATA CURATION │
│  (failover)  │   │ (quality) │   │   (PII)    │   │  (CHP states) │   │  (degradation)  │   │ (log + diagnose) │
└──────────────┘   └───────────┘   └────────────┘   └───────────────┘   └────────────────┘   └─────────────────┘
```

### Layer 1: Gateway — Provider Failover
Routes requests through the TrueFoundry AI Gateway with automatic failover across multiple LLM providers. Exponential backoff with full jitter (3 retries, 100ms base). Per-provider health tracking with consecutive-error circuit breakers.

### Layer 2: Parity — Cross-Model Quality Comparison
Runs a parity check against a second model and compares response quality using domain-specific key-phrase density, structural scoring, and length normalization. Detects model drift and contradictory outputs in real time.

### Layer 3: Governance — PII & Content Safety
Scans every response for 9 categories of PII (SSN, email, phone, credit card, account numbers, routing numbers, dates of birth, addresses). Excessive PII triggers a full block; minor detections are redacted in-place.

### Layer 4: State Machine — CHP Decision Lifecycle
Manages agent decisions through a formal state machine (`EXPLORING → PROVISIONAL → LOCKED`), with `HALT` and `RECOVER` states for degraded conditions. Confidence and degradation levels drive state transitions automatically.

### Layer 5: User Experience — Graceful Degradation
Formats the final response with degradation notices at two levels (reduced confidence vs. significant degradation), structured resilience metadata, and actionable guidance for the end user.

### Layer 6: Data Curation — Observability & Continuous Learning
Observes every inference passively without blocking responses. Collects structured logs (prompts, responses, confidence, latency, verdict), diagnoses failures via a 13-category taxonomy (hallucination, PII leak, timeout cascade, quality degradation, state halt, rate limited, provider outage, MCP failure, cascading failure, empty response, content blocked, low confidence, unknown), and curates training datasets for fine-tuning via [axolotl](https://github.com/OpenAccess-AI-Collective/axolotl) or [unsloth](https://github.com/unslothai/unsloth). Inspired by [Pioneer Agent](https://arxiv.org/abs/2407.21343)'s closed-loop adaptation pattern.

## Demo

[![Watch the 3-minute demo](docs/thumbnail.png)](docs/demo-3min.mp4)

**Click the thumbnail above to watch the 3-minute demo video**, or run it locally:

```bash
# Install dependencies
pip install httpx pytest

# Run the full demo (all 7 chaos scenarios)
PYTHONPATH=src python demo.py

# Run a single scenario
PYTHONPATH=src python demo.py --scenario provider_down

# Fast mode (skip slow scenarios)
PYTHONPATH=src python demo.py --fast

# JSON output for CI/CD
PYTHONPATH=src python demo.py --scenario none --json
```

### Chaos Scenarios Demonstrated

| Scenario | What Simulates | Resilience Response |
|----------|---------------|-------------------|
| **Provider Down** | Primary LLM returns 503 | Failover to fallback models |
| **Intermittent Errors** | Random 500/502 at 40% rate | Retry with exponential backoff |
| **Rate Limited** | HTTP 429 every 3rd call | Backoff + retry + provider rotation |
| **MCP Server Error** | Tool-call timeouts at 50% | Graceful degradation, cached responses |
| **Cascading Failure** | Provider fails repeatedly | Circuit-breaker pattern + recovery |
| **Full Outage** | Complete outage for 20 calls | Auto-recovery after threshold |
| **None (Clean)** | Normal operation | Full 6-layer validation |

## Architecture

```
src/
├── __init__.py                 # Package docstring + quick start
├── gateway/
│   ├── __init__.py
│   └── client.py               # TrueFoundry AI Gateway client (httpx)
│                                 - Retry with exponential backoff
│                                 - Provider failover chain
│                                 - Per-provider health tracking
│                                 - Structured event logging
│                                 - Mock mode (no API key needed)
├── layers/
│   ├── __init__.py
│   └── resilience_stack.py      # 6-layer orchestration
│                                 - GatewayLayer (failover)
│                                 - ParityLayer (quality comparison)
│                                 - GovernanceLayer (PII scanning)
│                                 - StateMachineLayer (CHP states)
│                                 - UserExperienceLayer (degradation)
│                                 - DataCurationLayer (log + diagnose)
│                                 - ResilienceStack (orchestrator)
├── curate/
│   ├── __init__.py
│   ├── log_collector.py          # InferenceLogCollector + InferenceLogEntry
│   │                               - Ring-buffer (100K entries)
│   │                               - Structured logging (16 fields)
│   │                               - JSONL export, trainable export
│   │                               - Disk persistence, filtering, stats
│   ├── failure_taxonomy.py       # 13-category failure classification
│   │                               - HALLUCINATION, PII_LEAK, TIMEOUT_CASCADE
│   │                               - QUALITY_DEGRADATION, STATE_HALT
│   │                               - RATE_LIMITED, PROVIDER_OUTAGE, MCP_FAILURE
│   │                               - CASCADING_FAILURE, EMPTY_RESPONSE
│   │                               - CONTENT_BLOCKED, LOW_CONFIDENCE, UNKNOWN
│   │                               - Severity scoring + remediation actions
│   ├── data_curator.py           # Training dataset builder
│   │                               - Composite quality scoring
│   │                               - Deduplication via content hashing
│   │                               - Train/eval/regression/failure splits
│   │                               - JSONL export for axolotl & unsloth
│   ├── finetune_pipeline.py      # Fine-tuning config generator
│   │                               - axolotl YAML config (4 base models)
│   │                               - unsloth SFTTrainer Python script
│   │                               - Dockerfile (unsloth/unsloth:latest)
│   │                               - Run commands (install/train/test)
│   └── curate_layer.py           # Layer 6: observational, never blocks
├── agents/
│   ├── __init__.py
│   └── cfo_agents.py            # 3 CFO-specialized agents
│                                 - FinanceAgent (cash flow, runway)
│                                 - StrategyAgent (competitive moat)
│                                 - ComplianceAgent (regulatory risk)
│                                 - AgentResult (structured output)
├── chaos/
│   ├── __init__.py
│   └── engine.py                # Chaos engineering engine
│                                 - 7 fault-injection scenarios
│                                 - httpx monkey-patching
│                                 - Deterministic seed for reproducibility
│                                 - Per-scenario statistics
tests/
├── __init__.py
├── test_gateway.py              # 19 tests — client, health, metrics
├── test_resilience_stack.py     # 30 tests — all 6 layers + stack
├── test_chaos.py                # 22 tests — all 7 scenarios
├── test_agents.py               # 12 tests — agents + factory
└── test_curate.py               # 70 tests — log, taxonomy, curator,
                                  #             finetune, layer 6
demo.py                          # Demo runner
docs/
├── thumbnail.png                # Video thumbnail (1280x720)
├── demo-3min.mp4                # 3-minute demo video (1920x1080)
└── slides/                      # 8 source slides
    ├── slide_01.png             # Title card
    ├── slide_02.png             # Problem statement
    ├── slide_03.png             # Architecture overview
    ├── slide_04.png             # Layer 1: Gateway
    ├── slide_05.png             # Layers 2-3: Parity + Governance
    ├── slide_06.png             # Layers 4-5: State Machine + UX
    ├── slide_07.png             # 7 Chaos Scenarios
    └── slide_08.png             # End card + stats
```

## Quick Start

### Prerequisites
- Python 3.11 or 3.12
- No LLM API key required (runs in mock mode by default)

### Installation

```bash
git clone https://github.com/icohangar-ops/cfo-resilience-matrix.git
cd cfo-resilience-matrix
pip install httpx pytest
```

### Run Tests

```bash
PYTHONPATH=src pytest tests/ -v
# 153 passed in 0.60s
```

### Run Demo

```bash
# Full demo with all chaos scenarios
PYTHONPATH=src python demo.py

# Specific scenario
PYTHONPATH=src python demo.py -s cascading

# With TrueFoundry API key (live mode)
TFY_API_KEY=your-key-here PYTHONPATH=src python demo.py
```

### Use as a Library

```python
from gateway.client import ResilientGatewayClient
from agents.cfo_agents import create_agents

client = ResilientGatewayClient(
    api_key="your-tfy-key",  # Or omit for mock mode
    virtual_model="cfo-resilience/primary",
)

finance, strategy, compliance, stack = create_agents(client)

# Analyze with full resilience protection
result = finance.analyze("What is our cash runway?")
print(result.response)
print(result.resilience_summary())

# Inject chaos for testing
from chaos.engine import ChaosEngine, ChaosScenario

with ChaosEngine(scenarios=[ChaosScenario.PROVIDER_DOWN]):
    result = strategy.analyze("Evaluate our competitive moat.")
    print(result.verdict)  # Still ALLOW — failover handled it
```

## Failure Mode Coverage

| Failure Mode | Conventional Agent | CFO Resilience Matrix |
|-------------|-------------------|----------------------|
| LLM server down | Crash / timeout | **Gateway failover** to fallback model |
| OpenAI brownout | 429 error propagated to user | **Exponential backoff** + provider rotation |
| Claude errors out | Request fails silently | **Failover chain** tries next provider |
| MCP server errors | Tool call hangs forever | **Timeout + degradation** with cached response |
| Cascading outages | All agents stop working | **Circuit breaker** + auto-recovery |
| Response contains PII | Compliance violation | **PII detection + redaction** or block |
| Quality degrades unnoticed | Bad decisions reach CFO | **Parity check** + confidence scoring |
| User gets no feedback | "Something went wrong" | **Structured degradation notices** with context |

## Technical Highlights

- **Zero external dependencies** — Only `httpx` required (no OpenAI SDK, no LangChain, no heavy frameworks)
- **Chaos engineering by design** — Built-in chaos engine monkey-patches `httpx.Client.request` for transparent fault injection
- **Deterministic testing** — Seedable RNG makes chaos scenarios reproducible across runs
- **CHP integration** — State machine layer implements the Consensus Hardening Protocol's decision lifecycle
- **Closed-loop learning** — Data curation layer collects inference logs, classifies failures (13 categories), and curates training datasets for fine-tuning via axolotl or unsloth
- **Pioneer-inspired adaptation** — Inspired by [Pioneer Agent](https://arxiv.org/abs/2407.21343)'s closed-loop system: Collect → Diagnose → Curate → Train → Evaluate
- **Zero-training-footprint** — FinetunePipeline generates configs (axolotl YAML, unsloth scripts, Dockerfiles) but never runs training — keeping the core library dependency-free
- **EGIS-ready** — Governance layer is designed to wrap EGIS AI's runtime governance SDK
- **Mock mode** — Full demo runs without any API keys or network connectivity
- **153 tests, 0.60s** — Comprehensive test coverage across all 6 layers + curation pipeline

## Built With

- **[TrueFoundry AI Gateway](https://docs.truefoundry.com/gateway/docs/ai-gateway)** — LLM routing and provider failover
- **[EGIS AI](https://egisai.co)** — Runtime governance for AI agents (PII, content safety)
- **[Consensus Hardening Protocol](https://github.com/icohangar-ops/consensus-hardening-protocol)** — Decision lifecycle management
- **[Multi-Agent CFO OS](https://github.com/icohangar-ops/multi-agent-cfo-os)** — Agent architecture foundation

## Related Repos

| Repository | Role |
|-----------|------|
| [multi-agent-cfo-os](https://github.com/icohangar-ops/multi-agent-cfo-os) | Flagship multi-agent system with EGIS governance |
| [cfo-command-center](https://github.com/icohangar-ops/cfo-command-center) | Notion-integrated finance ops hub |
| [consensus-hardening-protocol](https://github.com/icohangar-ops/consensus-hardening-protocol) | Decision governance framework |
| [resilient-agent](https://github.com/icohangar-ops/resilient-agent) | Original agent resilience prototype |
| [Pioneer Agent](https://arxiv.org/abs/2407.21343) | Inspiration for closed-loop data curation |

## License

Apache 2.0 — see [LICENSE](LICENSE)
