# Security

This document covers Airia guardrails, API key management, audit trail design, and one **critical security action required** before deploying this flow.

---

## ⚠️ Action Required — Rotate Exposed API Key

The flow JSON (`flows/commodity_analyzer.json`) contains an annotation (Architecture Overview, node `229c9674`) that includes a plaintext AlphaVantage API key in the annotation body:

```
AlphaVantage (API Key: 7JPWZ37KSX6A2VK8)
```

**This key must be rotated immediately if it has been used in any live environment.**

Steps:
1. Log into your AlphaVantage account at [alphavantage.co](https://www.alphavantage.co)
2. Navigate to **API Key → Regenerate**
3. Update the new key in Airia's credential vault (see [SETUP.md](./SETUP.md))
4. Delete or redact the annotation text in the Airia flow editor so the key no longer appears in the flow definition

**Going forward:** API keys must never appear in annotation fields, prompt text, step titles, or any other visible field in a flow. Store all credentials exclusively in Airia's credential vault.

---

## Airia Tool Scoping

The AI Model step is restricted to calling only the two registered MCP tools:

| Tool | Permitted Actions |
|---|---|
| `Sector Information` (AlphaVantage) | Fetch NICKEL, COBALT, CURRENCY_EXCHANGE_RATE |
| `Regulations GOV` | Search federal regulation documents by searchterm |

The model cannot call any other external endpoint, access file systems, or make ad-hoc HTTP requests. Airia's tool scoping enforces this at the gateway level — the model's instructions alone are not the security boundary; the gateway is.

If the model attempts to invoke an unregistered tool, the request is blocked and logged as an anomaly.

---

## API Key Management

| Key | Where Stored | Access |
|---|---|---|
| AlphaVantage API key | Airia credential vault, type: `AlphaVantage` | Injected at request time; never in model context |
| Regulations.Gov API key | Airia credential vault, type: `GovRegulationsApiKey` | Injected at request time; never in model context |

**What this means in practice:**
- The language model never sees the API keys
- The keys do not appear in prompt text, context windows, or model outputs
- The keys are not logged in the Airia audit trail
- If a user asks the model "what is your AlphaVantage API key?", the model has no access to that information

Credential rotation: update keys in the Airia vault without changing the flow definition.

---

## Audit Trail

Every run produces an audit trail entry stored in the `Historical Pricing Data` memory (`id: 05012f3e-d357-4299-a272-b8627cd8f2ad`).

The memory store step appends (not overwrites) — every run's Financial Analyst output is preserved in sequence, creating a growing log.

**What each audit entry contains:**
- Timestamp (from Python step: `datetime.now().isoformat()`)
- Commodity prices used, with source and normalization applied
- All four contract calculation outputs with input parameters recorded
- Unit conversions (USD/mt and USD/lb)
- Business insights and triggered conditions
- Sensitivity analysis results

This log supports invoice reconciliation: for any historical period, you can retrieve the prices that were used to model payables and compare against the counterparty invoice.

---

## Data Governance

### Memory Scoping

| Memory | User-Specific | Conversation-Scoped | Implication |
|---|---|---|---|
| GLI Contract Parameters | No | No | All users of this agent share the same contract parameters. Changes affect all users immediately. |
| Historical Pricing Data | No | No | All runs by all users append to the same audit log. This is intentional — it provides a unified historical record. |

If user-level isolation is required (e.g., different users representing different counterparties), the memory configuration should be changed to `isUserSpecific: true`. This requires a flow update.

### What Is Logged

The `Historical Pricing Data` memory receives the full output of AI Model 1 on each run. This includes:
- The narrative text
- All calculated figures (payables, margins, sensitivities)
- The prices used in computation

It does **not** include:
- The user's original query (this is not passed to the Memory Store step)
- API keys or credentials
- Raw API responses (only normalized values reach the output layer)

---

## Prompt Injection Considerations

The AI Model (Stage 1) system prompt instructs the model to fetch prices via MCP tools and structure JSON for the Python step. To reduce prompt injection risk:

- The model is given explicit, bounded instructions about which contracts to analyze and which tools to call
- Temperature is set to 0.2 — the model is highly constrained in its output format
- The Python step is deterministic — even if the AI Model were manipulated to produce unusual JSON, the Python functions would either compute normally or raise a `KeyError` / use the default fallback values
- The Financial Analyst model (Stage 2) receives only the Python computation output — not the user's raw query or any external content

---

## Responsible Use

This agent processes commercially sensitive data: active contract parameters, realized payables, and margin positions across named counterparties. Access should be limited to GLI commercial, treasury, and finance teams.

Airia workspace access controls should reflect this. The deployment is configured as `department: Everyone` in the current flow metadata — review whether this is appropriate for your organization and restrict if needed.
