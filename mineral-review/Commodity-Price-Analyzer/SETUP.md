# Setup Guide

This guide covers everything required to import and run the Commodity Price Analyzer in your Airia environment.

---

## Prerequisites

| Requirement | Notes |
|---|---|
| Airia account with MCP Gateway enabled | Contact your Airia administrator to confirm gateway access |
| AlphaVantage API key (Premium tier) | Commodity data requires Premium; free tier does not include metals (`NICKEL`, `COBALT`) |
| Regulations.Gov API key | Free; register at [api.data.gov](https://api.data.gov/signup/) |
| Access to this repository | Clone or download the `flows/` directory |

---

## Step 1 — Import the Airia Flow

1. Log into your Airia dashboard
2. Navigate to **Agents → Import**
3. Upload `flows/commodity_analyzer.json`
4. The flow will be imported with the name **"Commodity Price Analyzer"** (agent ID `20013153-1e89-4496-adf7-27f2924ac70d`)

After import, the following components will be present in your workspace:

| Component | Name | Notes |
|---|---|---|
| AI Model step | `AI Model` | Claude Haiku 4.5, temp 0.2, reasoning: high |
| Python step | `Python Code` | Business rules engine |
| AI Model step | `AI Model 1` | Claude Haiku 4.5, temp 0.7 |
| Memory | `GLI Contract Parameters` | Shared, persistent — must be populated (Step 3) |
| Memory | `Historical Pricing Data` | Shared, persistent — auto-populated on first run |
| Tool | `Sector Information` | AlphaVantage — requires credential setup (Step 2) |
| Tool | `Regulations GOV` | Regulations.Gov — requires credential setup (Step 2) |

---

## Step 2 — Configure API Credentials

Credentials are stored in Airia's credential vault and are **never embedded in the flow JSON**. Each user configures their own keys.

### AlphaVantage

1. In Airia, go to **Settings → Credentials → Add Credential**
2. Select type: **AlphaVantage**
3. Enter your AlphaVantage Premium API key
4. Save — the key will be automatically used by the `Sector Information` tool

> ⚠️ **Important:** If you are importing a flow that previously had an API key visible in an annotation or comment field, rotate that key immediately. See [SECURITY.md](./SECURITY.md) for details.

### Regulations.Gov

1. In Airia, go to **Settings → Credentials → Add Credential**
2. Select type: **GovRegulationsApiKey**
3. Enter your Regulations.Gov API key (obtainable free from [api.data.gov](https://api.data.gov/signup/))
4. Save

---

## Step 3 — Populate the `GLI Contract Parameters` Memory

The `GLI Contract Parameters` memory (`id: f18b7405-05c6-4efd-bb52-2d9530509fa8`) is loaded at the start of every run. It provides the AI Model with current contract context — counterparty names, payable percentages, index assignments, floor/ceiling values, and grade bands.

This memory must be populated before the agent can run correctly.

### What to Store

Add a structured document to the memory containing your active contract parameters. Suggested format:

```
GLI CONTRACT PARAMETERS — Current as of [DATE]

BLACK MASS PAYABLES
- Grade multiplier: 85% of LME 3-month Ni/Co
- Active counterparties: Atoka, Li-Cycle, Redwood
- Pricing basis: LME 3-month average

PRIMARY OFFTAKER MHP OFFTAKE
- Counterparty: [Primary Offtaker Name]
- Floor discount: 8% below Fastmarkets MB
- Profit share threshold: $20,000/mt Ni
- Profit share rate: 15% above threshold
- Pricing basis: Fastmarkets MB CO-0005 monthly average

LITHIUM CARBONATE GTC
- Floor: $20,000/mt
- Ceiling: $30,000/mt
- Pricing basis: Fastmarkets Li₂CO₃ 99.5% CIF

LI CYCLE FEEDSTOCK
- Li content: 92% grade @ 75% payable
- Ni content: 3% @ 90% payable
- Co content: 2% @ 90% payable
- Pricing basis: Mixed Fastmarkets/LME composite
```

### How to Populate

1. In Airia, navigate to **Memory → GLI Contract Parameters**
2. Add the contract parameters document as memory content
3. This memory is shared (not user-specific) — all users of the agent will access the same parameters

---

## Step 4 — Verify the Model Availability

The flow uses **Claude Haiku 4.5** (`claude-haiku-4-5-20251001`, model ID `988d449f-5ed2-4f52-8ebf-ee823714c3fe`) for both AI Model steps.

Confirm this model is available in your Airia workspace under **Settings → Models**. If it is not available, contact your Airia administrator.

---

## Step 5 — Test the Agent

Once credentials are configured and the GLI Contract Parameters memory is populated, run a test query:

**Simple test:**
```
What is the current Ni price and what does it mean for our black mass payables?
```

**Expected flow:** Memory loads → AI Model fetches NICKEL price from AlphaVantage → Python computes black mass payables → AI Model 1 returns a narrative with the calculated payable value.

**Profit-share test (if Ni > $20,000/mt):**
```
Has the Primary Offtaker profit share triggered this month?
```

**Li carbonate floor/ceiling test:**
```
Is our Li carbonate GTC floor or ceiling currently active?
```

---

## Step 6 — Configure Deployment (Optional)

The flow is pre-configured as a **Chat** deployment with these input modes enabled: FileUpload, Whiteboard, Code, Math.

To adjust deployment settings, navigate to **Agents → Commodity Price Analyzer → Deployment** in the Airia dashboard.

---

## Updating Contract Parameters

When GLI amends a contract:

1. Update the `GLI Contract Parameters` memory with the new terms
2. If the change affects the Python computation logic (e.g., a new payable percentage, a new floor value), update the relevant constants in the Python Code step:
   - `FLOOR_DISCOUNT` — currently `0.08`
   - `THRESHOLD_PRICE_PER_MT` — currently `20000`
   - `PROFIT_SHARE` — currently `0.15`
   - `contract_floor` / `contract_ceiling` in `calculate_lithium_carbonate_gtc` — currently `20000` / `30000`
3. Document the change in [CHANGELOG.md](./CHANGELOG.md)

See [CONTRIBUTING.md](./CONTRIBUTING.md) for instructions on adding entirely new contract types.
