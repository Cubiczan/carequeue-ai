# OpenClaw Intelligent Model Routing

Route thinking problems to Z.AI (GLM-4.7), routine work to Kimi K2.5 or Qwen3, and never burn expensive tokens on simple tasks. This guide configures OpenClaw to automatically select the right model at the right cost.

---

## The Core Problem

OpenClaw sends everything to one model by default. Heartbeats, file lookups, complex reasoning, memory searches — all hit the same primary model at the same price. This is equivalent to hiring a senior partner to answer the phone.

The fix is **model tiering**: different models for different task types, selected by complexity, not by accident.

---

## The Three-Tier Architecture

```
┌────────────────────────────────────────────────────────────┐
│  TIER 1: THINKING (Complex Reasoning)                      │
│  Model: Z.AI GLM-4.7                                      │
│  When: Multi-step reasoning, debugging, architecture,      │
│        novel problem-solving, agentic tool chains           │
│  Cost: ~$0.40/M input, ~$1.50/M output                    │
│  Why: Preserved Thinking across turns, 203K context,       │
│       84.9% LiveCodeBench, strongest open-source reasoner   │
├────────────────────────────────────────────────────────────┤
│  TIER 2: ROUTINE (Daily Driver)                            │
│  Model: Kimi K2.5 or Qwen3 Coder (cheapest wins)          │
│  When: General tasks, email drafting, summarization,       │
│        simple tool calls, file operations, web browsing     │
│  Cost: Kimi ~$0.45-0.60/M in, ~$2.50-3.00/M out          │
│        Qwen3 Coder ~$0.22/M in, ~$0.95/M out              │
│  Why: Strong enough for 80% of tasks at fraction of cost   │
├────────────────────────────────────────────────────────────┤
│  TIER 3: HEARTBEAT (Background Checks)                     │
│  Model: Qwen3-8B (via OpenRouter) or local Ollama          │
│  When: Heartbeats, status checks, simple file reads,       │
│        cron triggers, health checks                         │
│  Cost: ~$0.03-0.04/M input, ~$0.11/M output               │
│        or $0.00 if local via Ollama                         │
│  Why: Runs 48x/day — every cent matters at volume           │
└────────────────────────────────────────────────────────────┘
```

---

## Model Pricing Comparison (February 2026)

All prices per 1M tokens. Prices change frequently — verify before committing.

### Thinking Tier Candidates

| Model | Input | Output | Context | Strengths | Provider |
|---|---|---|---|---|---|
| **Z.AI GLM-4.7** | $0.40 | $1.50 | 203K | Preserved Thinking, agentic tool-use, coding (84.9% LiveCodeBench) | Z.AI direct, OpenRouter, Fireworks |
| Z.AI GLM-4.5 | $0.35 | $1.55 | 131K | Slightly cheaper, slightly less capable | Z.AI direct, OpenRouter |
| Kimi K2.5 Reasoning | $0.60 | $3.00 | 262K | Agent Swarm, strong multimodal, longest context | Moonshot, Fireworks, OpenRouter |

**Winner: GLM-4.7** — cheaper output than Kimi Reasoning ($1.50 vs $3.00), comparable quality, Preserved Thinking across turns means less context wasted on re-explaining.

### Routine Tier Candidates

| Model | Input | Output | Context | Strengths | Provider |
|---|---|---|---|---|---|
| **Qwen3 Coder 480B** | $0.22 | $0.95 | 262K | Cheapest capable model, strong coding, 262K context | OpenRouter, Alibaba Cloud |
| **Kimi K2.5** | $0.45–0.60 | $2.50–3.00 | 262K | Native multimodal, tool-calling, agent-ready | Moonshot, Fireworks, OpenRouter |
| Qwen3 Max | $1.20 | $6.00 | 256K | Strongest Qwen, but expensive | Alibaba Cloud, OpenRouter |
| Kimi K2 (non-reasoning) | $0.60 | $2.50 | 128K | Solid baseline, shorter context | Moonshot direct |

**Winner: Qwen3 Coder as primary, Kimi K2.5 as fallback.** Qwen3 Coder is 2–3x cheaper on output than Kimi K2.5 and handles routine tasks well. Kimi K2.5 picks up when Qwen hits rate limits or when multimodal capability is needed.

### Heartbeat Tier Candidates

| Model | Input | Output | Context | Notes |
|---|---|---|---|---|
| **Qwen3-8B** | $0.03 | $0.11 | 32K | Cheapest cloud option. Via OpenRouter. |
| Ollama (local) | $0.00 | $0.00 | Varies | Zero cost. Requires local hardware. |
| Gemma 3 4B | $0.02 | $0.03 | 32K | Even cheaper but less capable |

**Winner: Qwen3-8B** for cloud, **Ollama** if you have local hardware. At 48 heartbeats/day, Qwen3-8B costs ~$0.005/day ($0.15/month). Claude Sonnet for the same would be ~$0.24/day ($7.20/month). That's a 48x difference.

---

## Cost Projections

Based on moderate usage: 100 interactions/day (80 routine, 15 thinking, 5 heartbeats × 48/day).

### Without Model Routing (Everything on Kimi K2.5)

```
Daily: ~100 interactions × ~2K tokens avg = 200K tokens
Monthly input:  6M tokens × $0.60/M  = $3.60
Monthly output: 6M tokens × $3.00/M  = $18.00
Heartbeats:     48/day × 30 × $0.60  = $2.59 (wasted)
Total: ~$24/month
```

### With Intelligent Routing

```
Thinking (GLM-4.7): 15/day × 4K tokens × 30 days
  Input:  1.8M × $0.40/M  = $0.72
  Output: 1.8M × $1.50/M  = $2.70

Routine (Qwen3 Coder): 80/day × 1.5K tokens × 30 days
  Input:  3.6M × $0.22/M  = $0.79
  Output: 3.6M × $0.95/M  = $3.42

Heartbeat (Qwen3-8B): 48/day × 500 tokens × 30 days
  Input:  0.72M × $0.03/M = $0.02
  Output: 0.72M × $0.11/M = $0.08

Total: ~$7.73/month
```

**Savings: ~68% ($24 → $7.73).** With heavier usage, savings scale proportionally.

---

## The Configuration

### Complete `openclaw.json`

```json
{
  "gateway": {
    "host": "127.0.0.1",
    "port": 18789,
    "auth": {
      "password": "${GATEWAY_PASSWORD}"
    }
  },

  "agents": {
    "defaults": {
      "model": {
        "primary": "openrouter/qwen/qwen3-coder",
        "fallbacks": [
          "moonshot/kimi-k2.5",
          "z-ai/glm-4.7",
          "openrouter/qwen/qwen3-8b"
        ]
      },

      "imageModel": {
        "primary": "moonshot/kimi-k2.5",
        "fallbacks": ["z-ai/glm-4.7"]
      },

      "heartbeat": {
        "model": "openrouter/qwen/qwen3-8b",
        "interval": 1800,
        "enabled": true
      },

      "subagents": {
        "model": "openrouter/qwen/qwen3-coder",
        "maxConcurrent": 8
      },

      "maxConcurrent": 4,

      "memorySearch": {
        "enabled": true,
        "provider": "openai",
        "model": "text-embedding-3-small",
        "remote": {
          "apiKey": "${OPENAI_API_KEY}"
        },
        "limits": {
          "maxResults": 6,
          "timeoutMs": 4000
        }
      },

      "contextPruning": {
        "mode": "cache-ttl",
        "cacheTtl": "6h",
        "keepLastAssistants": 3
      },

      "compaction": {
        "mode": "safeguard",
        "reserveTokensFloor": 20000,
        "memoryFlush": {
          "enabled": true,
          "softThresholdTokens": 40000,
          "systemPrompt": "CRITICAL: Session nearing compaction. Save all important context NOW.",
          "prompt": "Write decisions, state changes, lessons learnt, and pending actions to memory/YYYY-MM-DD.md. Focus on what matters for continuity. Skip routine exchanges. Reply NO_REPLY if nothing worth storing."
        }
      },

      "sandbox": {
        "mode": "docker"
      }
    }
  },

  "models": {
    "providers": {
      "openrouter": {
        "type": "openrouter",
        "apiKey": "${OPENROUTER_API_KEY}"
      },
      "moonshot": {
        "type": "openai",
        "baseUrl": "https://api.moonshot.ai/v1",
        "apiKey": "${KIMI_API_KEY}",
        "models": ["kimi-k2.5", "kimi-k2"]
      },
      "z-ai": {
        "type": "openai",
        "baseUrl": "https://open.bigmodel.cn/api/paas/v4",
        "apiKey": "${ZAI_API_KEY}",
        "models": ["glm-4.7", "glm-4.5"]
      }
    }
  },

  "tools": {
    "exec": {
      "host": "sandbox",
      "approvals": "on"
    }
  },

  "logging": {
    "redactSensitive": "tools"
  }
}
```

### What Each Section Does

**`model.primary`: Qwen3 Coder** — Your daily driver. Handles 80% of tasks at $0.22/$0.95 per million tokens. This is the coordinator model for routine work.

**`model.fallbacks`: Kimi → GLM → Qwen3-8B** — If Qwen3 Coder is rate-limited or unavailable, fall to Kimi K2.5 (stronger but costlier), then GLM-4.7 (thinking-capable), then Qwen3-8B (bare minimum). This chain provides resilience across three different providers.

**`heartbeat.model`: Qwen3-8B** — The cheapest viable model. Heartbeats run every 30 minutes and do simple checks (read a file, check a condition). No reasoning power needed. At $0.03/$0.11 per million, heartbeats cost nearly nothing.

**`subagents.model`: Qwen3 Coder** — When the main agent spawns parallel workers, they use the cheap default. Sub-agents typically do focused, narrow tasks that don't need frontier reasoning.

**`memorySearch`: text-embedding-3-small** — Cheap embeddings for searching memory files. Thousands of searches cost ~$0.10. Using a premium model for the same: $5–10+.

**`contextPruning`: cache-ttl mode** — Keeps prompt cache valid for 6 hours, drops old messages when cache expires, preserves the last 3 assistant responses for continuity. Without this, you pay for re-processing the same context on every turn.

**`compaction.memoryFlush`** — When context hits 40K tokens, the agent distills the session into `memory/YYYY-MM-DD.md`. The flush prompt focuses on decisions, state changes, and lessons — not routine exchanges.

---

## Routing Thinking Tasks to GLM-4.7

OpenClaw doesn't natively auto-detect "thinking vs. routine" and switch models mid-conversation. You have two approaches:

### Approach 1: Manual Model Override (Recommended)

When you need heavy reasoning, tell the agent to switch:

```
/model z-ai/glm-4.7
```

Or in chat:
```
Switch to GLM-4.7 for this task — I need deep reasoning.
```

After the thinking task is done:
```
/model openrouter/qwen/qwen3-coder
```

This keeps you in control of when expensive models are used.

### Approach 2: Agent-Specific Model Pinning

Create a dedicated "thinking agent" that always uses GLM-4.7:

```json
{
  "agents": {
    "list": [
      {
        "id": "thinker",
        "name": "Deep Thinker",
        "model": {
          "primary": "z-ai/glm-4.7",
          "fallbacks": ["moonshot/kimi-k2.5"]
        },
        "description": "Complex reasoning, architecture, debugging, multi-step analysis"
      },
      {
        "id": "worker",
        "name": "Worker",
        "model": {
          "primary": "openrouter/qwen/qwen3-coder",
          "fallbacks": ["moonshot/kimi-k2.5"]
        },
        "description": "Routine tasks, email, summaries, file ops, simple tool calls"
      }
    ]
  }
}
```

Route messages to specific agents:
```
@thinker Debug why the Atoka facility commissioning script fails on step 3
@worker Draft a follow-up email to Bell Potter about the engagement letter
```

### Approach 3: System Prompt Self-Routing

Add this to your SOUL.md or system prompt:

```
## Model Awareness

You are currently running on a cost-optimized model for routine tasks.

If you encounter a task that requires:
- Multi-step reasoning or debugging
- Architectural decisions
- Complex analysis with multiple variables
- Novel problem-solving with no clear precedent
- Mathematical proofs or formal logic

Then STOP and tell me: "This task would benefit from switching to the 
thinking model (GLM-4.7). Should I proceed on the current model or 
would you like to switch?"

Do not attempt complex reasoning on a lightweight model. Flag it instead.
```

---

## Provider Setup

### Z.AI (GLM-4.7 / GLM-4.5)

```bash
# Sign up at https://open.bigmodel.cn or https://z.ai
# Get API key from the platform dashboard

export ZAI_API_KEY="your-z-ai-api-key"
```

Direct API: `https://open.bigmodel.cn/api/paas/v4`
OpenRouter: `openrouter/z-ai/glm-4.7` (may have markup)
Chat access: `https://chat.z.ai` — $3/month for web interface

GLM-4.7 features Preserved Thinking (reasoning chains persist across turns) and supports `reasoning` parameter for controlling thinking depth per request. This means you can disable thinking for simple follow-ups within a complex session, saving tokens.

### Moonshot / Kimi K2.5

```bash
# Sign up at https://platform.moonshot.ai
# First $5 recharge gets $5 bonus (effectively 2x your first purchase)

export KIMI_API_KEY="your-moonshot-api-key"
```

Direct API: `https://api.moonshot.ai/v1` (OpenAI-compatible)
OpenRouter: `openrouter/moonshotai/kimi-k2.5`
Fireworks: `fireworks/accounts/kimi/models/kimi-k2-5` (fastest at 203.9 t/s)

Kimi K2.5 has automatic context caching — repeated context costs 75% less ($0.15/M vs $0.60/M). No configuration needed.

### Qwen3 (Alibaba Cloud)

```bash
# Access via OpenRouter (simplest) or Alibaba Cloud DashScope
export OPENROUTER_API_KEY="your-openrouter-api-key"
```

OpenRouter: `openrouter/qwen/qwen3-coder` ($0.22/$0.95)
Alibaba Cloud: `qwen3-coder-480b-a35b` via DashScope API
Free tier available on Alibaba Cloud (Singapore region only, limited quota)

Qwen3 Coder is a sparse MoE with 480B total parameters but only 35B activated per token — excellent quality/cost ratio for routine agentic tasks.

### OpenRouter (Unified Access)

```bash
# One API key, access to all models
# Sign up at https://openrouter.ai
export OPENROUTER_API_KEY="your-openrouter-api-key"
```

Advantages: single billing, no per-provider API key management, automatic provider-level failover. OpenRouter does not mark up provider pricing. For OpenClaw specifically, `openrouter/openrouter/auto` can auto-select models by prompt complexity, but explicit routing gives you more control.

---

## Memory Search Configuration

Use the cheapest viable embeddings. Memory search runs frequently but processes small chunks.

```json
{
  "agents": {
    "defaults": {
      "memorySearch": {
        "enabled": true,
        "provider": "openai",
        "model": "text-embedding-3-small",
        "remote": {
          "apiKey": "${OPENAI_API_KEY}"
        }
      }
    }
  }
}
```

**Cost comparison for 10,000 memory searches:**

| Embedding Model | Cost per 10K Searches | Notes |
|---|---|---|
| text-embedding-3-small (OpenAI) | ~$0.10 | Best cost/quality for retrieval |
| text-embedding-3-large (OpenAI) | ~$1.30 | Marginal quality gain, 13x cost |
| Local (node-llama-cpp) | $0.00 | Free, requires local GGUF model |
| Gemini embedding-001 | ~$0.10 | Google alternative, similar pricing |

For zero-cost option, use local embeddings:

```json
{
  "memorySearch": {
    "provider": "local",
    "local": {
      "modelPath": "auto"
    }
  }
}
```

Requires `pnpm approve-builds` for node-llama-cpp. Works well on Mac Mini with Apple Silicon.

---

## Context Pruning

```json
{
  "contextPruning": {
    "mode": "cache-ttl",
    "cacheTtl": "6h",
    "keepLastAssistants": 3
  }
}
```

**What `cache-ttl` mode does:**
- Keeps prompt cache valid for 6 hours
- Automatically drops messages older than the TTL
- Preserves the last 3 assistant responses for conversational continuity
- Anthropic models support prompt caching natively (50% discount on cached tokens)
- Kimi K2.5 also has automatic caching (75% discount)

**Without this:** You hit token limits faster and pay for re-processing the same context repeatedly. A 200K context conversation without pruning can cost 10–50x more than the same conversation with aggressive TTL management.

---

## Compaction and Memory Flush

```json
{
  "compaction": {
    "mode": "safeguard",
    "reserveTokensFloor": 20000,
    "memoryFlush": {
      "enabled": true,
      "softThresholdTokens": 40000,
      "systemPrompt": "CRITICAL: Session nearing compaction. Save all important context NOW.",
      "prompt": "Write decisions, state changes, lessons learnt, and pending actions to memory/YYYY-MM-DD.md. Focus on what matters for continuity. Skip routine exchanges. Reply NO_REPLY if nothing worth storing."
    }
  }
}
```

**Why 40K threshold (not default 4K):** A higher threshold gives the agent more runway to write a comprehensive memory dump before context gets compressed. At 4K remaining tokens, the model barely has room to think about what to save.

**The flush prompt matters.** The default prompt is generic and the model often writes `NO_REPLY`. The prompt above explicitly instructs: save decisions, state changes, lessons, and pending actions. Skip routine exchanges. This produces useful daily logs that compound into long-term agent intelligence.

**`NO_REPLY` is intentional.** If nothing worth storing happened (e.g., a simple weather check), the agent skips the write. No clutter in daily logs. This is correct behavior — don't disable it.

---

## Concurrency Limits

```json
{
  "agents": {
    "defaults": {
      "maxConcurrent": 4,
      "subagents": {
        "maxConcurrent": 8
      }
    }
  }
}
```

**Why this matters:** Without limits, one bad task can spawn 50 retries and burn your API quota in minutes. Rate limit errors cascade — the agent retries, each retry spawns sub-agents, each sub-agent retries.

4 concurrent main tasks + 8 sub-agents is a safe starting point. Increase only after monitoring actual usage patterns. If you're on free tiers or low-spend API plans, reduce to `maxConcurrent: 2`.

---

## Data Sovereignty Notes

GLM-4.7 (Z.AI / Zhipu) and Kimi K2.5 (Moonshot AI) are Chinese AI models. API calls transit through servers in China.

**Routing rules for sensitive work:**

| Data Classification | Allowed Models | Rationale |
|---|---|---|
| PUBLIC (general research, public info) | Any model | No sensitivity |
| INTERNAL (internal docs, non-secret) | Kimi, Qwen, GLM, OpenRouter | Low risk |
| CONFIDENTIAL (financials, investor materials, contracts) | Local Ollama only or US-hosted providers | Data sovereignty |
| RESTRICTED (API keys, credentials, legal) | Never send to any external API | Keep local |

If your work involves regulated data (financial services, defense, healthcare), consider:
- **Fireworks AI** as a US-hosted intermediary for Kimi K2.5 (fastest provider at 203.9 t/s, US servers)
- **OpenRouter** routes through US infrastructure but may forward to provider endpoints
- **Ollama** for fully local inference on sensitive tasks (zero external API calls)

Add to MEMORY.md:

```
## MODEL ROUTING: DATA SOVEREIGNTY

Never route CONFIDENTIAL or RESTRICTED data through Chinese-hosted APIs.
For sensitive tasks, use Ollama local or US-hosted providers only.
For routine, non-sensitive tasks, use the cheapest available model.
```

---

## Security Baseline

These settings are bundled into the config above but deserve explicit callout:

```bash
# 1. Gateway is localhost-only
netstat -an | grep 18789 | grep LISTEN
# Must show: 127.0.0.1:18789, NOT 0.0.0.0:18789

# 2. Validate config
openclaw doctor --fix

# 3. Lock permissions
chmod 700 ~/.openclaw
chmod 600 ~/.openclaw/openclaw.json
chmod 700 ~/.openclaw/credentials

# 4. Check for leaked secrets
grep -r "sk-" ~/.openclaw/   # Should find nothing

# 5. Log redaction is on
# logging.redactSensitive: "tools" in config
```

**Logging options:**
- `"off"` — No redaction. API keys visible in logs. Dangerous.
- `"tools"` — Redacts sensitive data in tool output only. **Recommended.**
- `"all"` — Aggressive redaction. Can make debugging harder.

---

## Environment Variables

```bash
# Add to ~/.zshrc (Mac) or ~/.bashrc (Linux)

# Model providers
export ZAI_API_KEY="your-z-ai-api-key"
export KIMI_API_KEY="your-moonshot-api-key"
export OPENROUTER_API_KEY="your-openrouter-api-key"
export OPENAI_API_KEY="your-openai-key-for-embeddings-only"

# Gateway
export GATEWAY_PASSWORD="$(openssl rand -hex 32)"

# Dashboard (if using task dashboard)
export DASHBOARD_API_KEY="your-dashboard-key"
export DASHBOARD_URL="http://localhost:3000/api/openclaw/tasks"
```

Never store API keys in `openclaw.json`. Always use `${ENV_VAR}` references.

---

## Workspace File Structure

```
~/.openclaw/
├── openclaw.json              # Main config (this file)
├── credentials/               # API keys (chmod 600)
│   ├── openrouter
│   ├── moonshot
│   ├── z-ai
│   └── openai
└── agents/
    └── <agentId>/
        ├── MEMORY.md          # Long-term memory (curated)
        ├── SOUL.md            # Agent personality and rules
        ├── USER.md            # User preferences
        ├── AGENTS.md          # Multi-agent routing config
        ├── TOOLS.md           # Available tools reference
        ├── HEARTBEAT.md       # Heartbeat check instructions
        ├── models.json        # Custom provider models
        ├── memory/
        │   ├── 2026-02-07.md  # Daily logs (append-only)
        │   └── ...
        └── skills/
            └── your-skills/
```

---

## Quick-Start Checklist

1. ☐ Set up API keys: Z.AI, Moonshot, OpenRouter, OpenAI (embeddings)
2. ☐ Export all keys as environment variables
3. ☐ Copy the `openclaw.json` config above with your env var references
4. ☐ Run `openclaw doctor --fix` to validate
5. ☐ Verify gateway binds to 127.0.0.1: `netstat -an | grep 18789`
6. ☐ Send a test message — should route to Qwen3 Coder (primary)
7. ☐ Test `/model z-ai/glm-4.7` switch for thinking tasks
8. ☐ Verify heartbeats use Qwen3-8B: check logs for model name
9. ☐ Add data sovereignty rules to MEMORY.md
10. ☐ Monitor first week's token usage and adjust tiers if needed

---

## Model Selection Decision Tree

```
Is the task sensitive/confidential?
├── YES → Use Ollama local or US-hosted provider only
└── NO
    │
    Does it require multi-step reasoning, debugging, or architecture?
    ├── YES → Switch to GLM-4.7 (Tier 1: Thinking)
    │         /model z-ai/glm-4.7
    └── NO
        │
        Is it a heartbeat, health check, or status ping?
        ├── YES → Qwen3-8B (Tier 3: Heartbeat) — auto-routed
        └── NO
            │
            Routine task → Qwen3 Coder (Tier 2: Routine) — default primary
            If rate-limited → auto-fallback to Kimi K2.5
```

---

*Prices verified February 2026 via PricePerToken, Artificial Analysis, and OpenRouter. All models are available via open-source weights on Hugging Face for local deployment if you'd rather avoid all API costs. The routing architecture works regardless of which specific models you choose — the principle is: cheap defaults, expensive only when needed, cheapest possible for background tasks.*
