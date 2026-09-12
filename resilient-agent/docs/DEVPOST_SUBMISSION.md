# ResilientAgent — Project Overview

## Project Title
ResilientAgent — AI Agents That Never Go Down

## Short Description (one-liner)
A fault-tolerant multi-agent system on TrueFoundry AI Gateway with 5 layers of resilience: virtual model fallback, circuit breakers, multi-level fallback chains, semantic caching, and degraded-mode UX.

## Full Description

### What It Does
ResilientAgent is a multi-agent orchestration system that routes every LLM call through TrueFoundry's AI Gateway with five layers of resilience. When LLM providers fail, MCP servers error, or APIs brown out, users never see an unhandled error — they get a response from a fallback model, a cached result, or a clear degraded-mode message.

### How We Built It
The system uses TrueFoundry's AI Gateway as the unified endpoint for all LLM calls, with four different models (Claude Sonnet, GPT-4o, Gemini Flash, Claude Haiku) each configured as virtual models with fallback chains. On top of the gateway, we built:

1. **Circuit Breaker Pattern** — Each model has an independent circuit breaker (3-failure threshold, 30s recovery timeout) that stops wasting latency on failing providers
2. **Multi-Level Fallback Chains** — Every request cascades through orchestrator → analyst → executor → fallback until it finds a healthy model
3. **Semantic Cache** — Content-hash cache serves instant responses for repeat queries, critical when all providers are down
4. **Degraded Mode UX** — Status indicators and clear messages replace raw errors
5. **Chaos Simulator** — Built-in tool to inject failures and demonstrate resilience (POST /chaos endpoint)

The architecture uses a planner-orchestrator pattern: a Claude Sonnet orchestrator breaks requests into sub-tasks, delegates to specialized agents (GPT-4o for analysis, Gemini Flash for execution), and combines results. Each sub-agent independently benefits from the full resilience stack.

### Challenges We Ran Into
- Designing the fallback chain so that provider-level failover (TrueFoundry) and application-level fallback (our code) work together without conflict
- Making the circuit breaker thresholds realistic — too aggressive and it trips on transient errors, too lenient and users wait through timeouts
- Handling the "total failure" scenario gracefully — when ALL models are down, the system falls back to cache and then to a friendly degraded message

### What's Next
- MCP server resilience (retry queuing for tool calls when MCP servers are down)
- Semantic similarity cache (using embeddings instead of exact hash matching)
- Cost-aware routing (prefer cheaper models for simple tasks, only escalate to premium for complex reasoning)
- Production observability dashboard (real-time circuit breaker states, cost tracking, latency percentiles)

### Tech Stack
- TrueFoundry AI Gateway (virtual models, retry, fallback, load balancing)
- Claude Sonnet, GPT-4o, Gemini Flash, Claude Haiku via single gateway endpoint
- Python 3.12, FastAPI, OpenAI SDK
- Docker + Docker Compose

## Demo Video
https://github.com/icohangar-ops/resilient-agent/blob/main/docs/video/ResilientAgent_Demo.mp4

## Screenshots
- Dashboard: https://github.com/icohangar-ops/resilient-agent/blob/main/docs/screenshots/dashboard.png
- Chaos Simulation: https://github.com/icohangar-ops/resilient-agent/blob/main/docs/screenshots/chaos_simulation.png
- Architecture: https://github.com/icohangar-ops/resilient-agent/blob/main/docs/screenshots/architecture.png
- API Docs: https://github.com/icohangar-ops/resilient-agent/blob/main/docs/screenshots/api_docs.png

## Try It Out
```bash
git clone https://github.com/icohangar-ops/resilient-agent.git
cd resilient-agent
pip install -r requirements.txt
cp .env.example .env  # Add your TrueFoundry API key
make run
# Visit http://localhost:8000/docs for interactive API
```
