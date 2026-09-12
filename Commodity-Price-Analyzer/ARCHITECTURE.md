# Architecture & Data Flow

This document maps the exact Airia orchestration flow defined in `flows/commodity_analyzer.json`. Every step name, node type, connection, and configuration value below corresponds directly to a node in the flow.

---

## Flow Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  STEP 1 — Input                                                              │
│  stepType: inputStep  |  id: 3fd75206-ac93-46d6-8a43-eaeaea83cfa3           │
│  User's natural-language question about GLI payables, margins, sensitivity   │
│  Supported input modes: FileUpload, Whiteboard, Code, Math                  │
└────────────────────────────┬────────────────────────────────────────────────┘
                             │ (parallel, both feed into AI Model)
              ┌──────────────┴──────────────┐
              │                             │
              ▼                             ▼
┌─────────────────────────┐   ┌──────────────────────────────────────────────┐
│  STEP 2 — Memory Load   │   │  (Input passes directly to AI Model)         │
│  stepType: memoryLoad   │   │                                              │
│  id: 78a375ec-3168-…    │   │                                              │
│  Memory: "GLI Contract  │   │                                              │
│  Parameters"            │   │                                              │
│  (shared, persistent)   │   │                                              │
└────────────┬────────────┘   └──────────────────────────────────────────────┘
             │                             │
             └──────────────┬──────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  STEP 3 — AI Model  (Stage 1: Price Fetch + Dispatch)                        │
│  stepType: AIOperation  |  id: 622bf2c5-69de-4401-90c0-eef2ef9a6d82         │
│  Model: Claude Haiku 4.5  (claude-haiku-4-5-20251001)                        │
│  Temperature: 0.2  |  Reasoning Effort: high                                │
│  Include DateTime: ✅  |  Include User Details: ✅                           │
│  Chat History: ✅  |  Attachments: ✅                                        │
│                                                                              │
│  MCP Tools registered:                                                       │
│  ├── AlphaVantage Sector (id: c3051a84-7581-4aaf-86dc-8cb13f9f14ba)         │
│  │   Fetches: NICKEL, COBALT, CURRENCY_EXCHANGE_RATE                        │
│  └── Regulations.Gov (id: 2f4a3e45-9fdb-4cd0-890f-781a02d5eb91)            │
│      Fetches: Federal regulation documents by searchterm                     │
│                                                                              │
│  Role: Parse query intent → fetch commodity prices via MCP tools →           │
│        normalize to USD/mt → structure JSON for Python node                  │
│                                                                              │
│  Output JSON schema:                                                         │
│  { query_context, timestamp, commodity_prices: {nickel, cobalt,              │
│    lithium_carbonate}, contracts_in_scope[], analysis_parameters }           │
└────────────────────────────┬────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  STEP 4 — Python Code  (Deterministic Business Rules Engine)                 │
│  stepType: pythonStep  |  id: 1f6bda0b-4cd9-4269-9ee9-9159607862c7          │
│                                                                              │
│  Input: Commodity prices JSON from AI Model                                  │
│  Extracts: ni_price, co_price, li_price (USD/mt)                            │
│                                                                              │
│  Functions executed (in order):                                              │
│  1. calculate_black_mass_payables(ni, co, grade_multiplier=0.85)            │
│  2. calculate_primary_offtaker_mhp_offtake(ni, co,                         │
│        floor_discount=0.08, profit_share_threshold=20000)                   │
│  3. calculate_lithium_carbonate_gtc(li,                                     │
│        contract_floor=20000, contract_ceiling=30000)                        │
│  4. calculate_li_cycle_feedstock(li, ni, co, feedstock_grade=0.92)         │
│  5. unit_conversions (USD/mt ↔ USD/lb via factor 2204.62)                  │
│  6. sensitivity_analysis (Ni ±$1,000, Co ±$1,000, Li ±$1,000)             │
│  7. business_insights[] — auto-generated trigger narratives                 │
│                                                                              │
│  Output: JSON with gli_calculations{}, unit_conversions{},                  │
│          business_insights[], sensitivity_analysis{}                         │
└────────────────────────────┬────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  STEP 5 — AI Model 1  (Stage 2: Financial Analyst Narrative)                 │
│  stepType: AIOperation  |  id: 6748ea8d-664e-4b5a-8eda-3f3b01320dad         │
│  Model: Claude Haiku 4.5  (claude-haiku-4-5-20251001)                        │
│  Temperature: 0.7  |  Reasoning Effort: default                             │
│  Include DateTime: ❌  |  Include User Details: ❌                           │
│  Chat History: ✅  |  Attachments: ✅                                        │
│                                                                              │
│  Role: Receive Python calculation results → synthesize executive narrative   │
│        → explain triggers, margins, risks in plain English                   │
│                                                                              │
│  Response structure:                                                         │
│  - Executive Summary (2–3 sentences)                                        │
│  - Current Market Conditions (commodity price snapshot)                      │
│  - Contract Performance Analysis (Black Mass / Primary Offtaker /            │
│    Li Carbonate / Li Cycle)                                                  │
│  - Key Insights & Triggers                                                   │
│  - Risk Exposure & Sensitivities                                             │
│  - Recommendations (optional)                                                │
└────────────┬───────────────────────────────────────────────────┬────────────┘
             │                                                   │
             ▼                                                   ▼
┌────────────────────────────┐              ┌────────────────────────────────┐
│  STEP 6 — Output           │              │  STEP 7 — Memory Store         │
│  stepType: outputStep      │              │  stepType: memoryStoreStep     │
│  id: b8fa4c0a-f68d-…       │              │  id: a049986f-15b7-…           │
│                            │              │  Memory: "Historical Pricing   │
│  Rendered to user as       │              │  Data"                         │
│  chat response             │              │  Mode: Append (audit log)      │
│                            │              │  (shared, persistent)          │
└────────────────────────────┘              └────────────────────────────────┘
```

---

## Node Reference

### Step 1 — Input
| Field | Value |
|---|---|
| ID | `3fd75206-ac93-46d6-8a43-eaeaea83cfa3` |
| Type | `inputStep` |
| Input Variables | None (free-form chat input) |
| Output Handle | `ea6f7753-6417-43ea-a341-7207c6253782` → AI Model |

---

### Step 2 — Memory Load (`GLI Contract Parameters`)
| Field | Value |
|---|---|
| ID | `78a375ec-3168-4299-9220-ac17e5b1829f` |
| Type | `memoryLoadStep` |
| Memory ID | `f18b7405-05c6-4efd-bb52-2d9530509fa8` |
| Memory Name | `GLI Contract Parameters` |
| Scope | Shared (not user-specific, not conversation-scoped) |
| Output Handle | `a4a4ec52-58fd-4f7e-8bee-a32860298adc` → AI Model |

**Contents:** Active contract parameters — counterparty names, payable percentages, floor/ceiling values, index assignments, and grade bands. Loaded at the start of every run so the AI Model has current contract context before fetching prices.

---

### Step 3 — AI Model (Stage 1)
| Field | Value |
|---|---|
| ID | `622bf2c5-69de-4401-90c0-eef2ef9a6d82` |
| Type | `AIOperation` |
| Model | Claude Haiku 4.5 (`claude-haiku-4-5-20251001`) |
| Model ID | `988d449f-5ed2-4f52-8ebf-ee823714c3fe` |
| Prompt ID | `78001683-9a4a-49a5-9e4c-db48eeffb49c` |
| Prompt Version | `77b9f75f-bbcb-4af5-868d-deceaa1caff5` |
| Temperature | 0.2 (low — deterministic routing and data fetching) |
| Reasoning Effort | High |
| DateTime Context | Included |
| User Details Context | Included |
| Tools | AlphaVantage (`c3051a84`) + Regulations.Gov (`2f4a3e45`) |
| Inputs | Memory Load output + Input step output |
| Output Handle | `59005851-da08-49ff-a793-9d0209aac75d` → Python Code |

**System Prompt Role:** GLI Commodity Price Analyzer — expert in battery metals recycling economics. Parses query, selects contracts in scope, fetches prices via MCP tools, normalizes to USD/mt, and outputs structured JSON for the Python node.

---

### Step 4 — Python Code
| Field | Value |
|---|---|
| ID | `1f6bda0b-4cd9-4269-9ee9-9159607862c7` |
| Type | `pythonStep` |
| Code Block ID | `1f6bda0b-4cd9-4269-9ee9-9159607862c7` |
| Input | AI Model output (commodity prices JSON) |
| Output Handle | `13504a8e-0a42-4ece-83a6-9c9892ae036d` → AI Model 1 |

Full code in [CONTRACT_LOGIC.md](./CONTRACT_LOGIC.md).

---

### Step 5 — AI Model 1 (Stage 2)
| Field | Value |
|---|---|
| ID | `6748ea8d-664e-4b5a-8eda-3f3b01320dad` |
| Type | `AIOperation` |
| Model | Claude Haiku 4.5 (`claude-haiku-4-5-20251001`) |
| Model ID | `988d449f-5ed2-4f52-8ebf-ee823714c3fe` |
| Prompt ID | `244d32ab-2f98-4e0e-adde-8163ad80f577` |
| Prompt Version | `288a8e6a-8fb0-4e00-98f5-0c121ba445b5` |
| Temperature | 0.7 (higher — narrative synthesis, explanatory language) |
| Reasoning Effort | Default |
| DateTime Context | Not included |
| User Details Context | Not included |
| Input | Python Code output |
| Output Handles | `b5aaf839` → Output step + Memory Store step |

**System Prompt Role:** Financial Analyst specialized in GLI contract economics. Synthesizes Python results into executive narrative. Does not perform calculations — cites only figures passed from the Python layer.

---

### Step 6 — Output
| Field | Value |
|---|---|
| ID | `b8fa4c0a-f68d-463f-889d-3dacf5c56205` |
| Type | `outputStep` |
| Input | AI Model 1 output (same handle `b5aaf839`) |

Renders the final narrative response to the user in the Airia chat interface.

---

### Step 7 — Memory Store (`Historical Pricing Data`)
| Field | Value |
|---|---|
| ID | `a049986f-15b7-44c4-b7be-0260e069aab9` |
| Type | `memoryStoreStep` |
| Memory ID | `05012f3e-d357-4299-a272-b8627cd8f2ad` |
| Memory Name | `Historical Pricing Data` |
| Mode | **Append** (`memoryStoreStepAppendText: true`) |
| Scope | Shared (not user-specific, not conversation-scoped) |
| Input | AI Model 1 output (same handle `b5aaf839`) |

Each run's AI Model 1 output is appended to the Historical Pricing Data memory store. This creates a persistent, growing audit log of all pricing analyses, enabling delta comparison across runs and supporting invoice reconciliation.

---

## Memory Architecture

| Memory | ID | Direction | Scope | Mode |
|---|---|---|---|---|
| GLI Contract Parameters | `f18b7405-05c6-4efd-bb52-2d9530509fa8` | Load (Step 2) | Shared, persistent | Read |
| Historical Pricing Data | `05012f3e-d357-4299-a272-b8627cd8f2ad` | Store (Step 7) | Shared, persistent | Append |

---

## Temperature Strategy

The two AI Model steps are deliberately configured at different temperatures:

**AI Model (Stage 1) — temp 0.2, reasoning: high**
Low temperature is correct here because this step is doing analytical work: parsing user intent, selecting MCP tools, fetching prices, and producing a structured JSON payload. Determinism and precision matter. High reasoning effort ensures the model carefully identifies which contracts and indices are in scope before committing to tool calls.

**AI Model 1 (Stage 2) — temp 0.7, reasoning: default**
Higher temperature is appropriate for the narrative synthesis step. The calculations are already locked in by the Python layer; the model's job is to explain them in natural, fluent business language. A slightly higher temperature produces more readable, less robotic prose without any risk to numerical accuracy.

---

## Connection Map (Edge List)

| From Step | From Handle | To Step | To Handle |
|---|---|---|---|
| Input | `ea6f7753` | AI Model | `71407cc4` |
| Memory Load | `a4a4ec52` | AI Model | `71407cc4` |
| AI Model | `59005851` | Python Code | `212b4e34` |
| Python Code | `13504a8e` | AI Model 1 | `4b7fe4cd` |
| AI Model 1 | `b5aaf839` | Output | `deab4e97` |
| AI Model 1 | `b5aaf839` | Memory Store | `7b955bdb` |
