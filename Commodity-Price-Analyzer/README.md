# Commodity Price Analyzer

> *Calculate the impact of commodity prices, exchange rates, and government regulations on product output price.*

[![AI Model](https://img.shields.io/badge/AI-Kimi%20K2.6%20(Azure%20AI%20Foundry)-blue)](https://ai.azure.com)
[![Data Platform](https://img.shields.io/badge/Platform-Microsoft%20Fabric-purple)](https://app.fabric.microsoft.com)
[![Language](https://img.shields.io/badge/Python-3.12+-green)](https://python.org)
[![Tests](https://img.shields.io/badge/Tests-15%20passed-brightgreen)](tests/)
[![License](https://img.shields.io/badge/License-Proprietary-orange)](LICENSE)

---

## What It Does

GLI runs complex payables and offtake structures across Nickel (Ni), Cobalt (Co), Lithium (Li), and Mixed Hydroxide Precipitate (MHP). **Commodity Price Analyzer** turns term sheets into a living model that continuously re-prices GLI's contracts off real-time commodity curves, powered by **Azure AI Foundry** (Kimi K2.6) for intelligent analysis and **Microsoft Fabric** for enterprise data storage and analytics.

### Architecture Overview

```
                    +-----------------------+
                    |   Commodity Prices    |
                    |  (AlphaVantage API)   |
                    +-----------+-----------+
                                |
                    +-----------v-----------+
                    |  Data Ingestion      |
                    |  (fetcher.py)        |
                    +-----------+-----------+
                                |
                    +-----------v-----------+
                    |  GLI Business Rules  |
                    |  (business_rules.py) |
                    |  - Black Mass        |
                    |  - MHP Offtaker      |
                    |  - Li Carbonate GTC  |
                    |  - Li Cycle Feedstock|
                    +-----------+-----------+
                                |
                    +-----------v-----------+      +-----------------------+
                    |  Azure AI Foundry    | <---->|  Kimi K2.6            |
                    |  (ai/analyzer.py)    |      |  Trend Analysis       |
                    |  - Contract interp.  |      |  Risk Assessment      |
                    |  - Risk analysis     |      |  Executive Summary    |
                    +-----------+-----------+      +-----------------------+
                                |
                    +-----------v-----------+
                    |  Microsoft Fabric    |
                    |  (fabric/client.py)  |
                    |  - OneLake Storage   |
                    |  - Delta Tables      |
                    |  - Power BI Dashboards|
                    +-----------------------+
```

### Pipeline Flow

A single command or natural-language question triggers the full pipeline:

**Data Fetch → Contract Calculations → AI Analysis → Fabric Storage → Results**

---

## Modernized Tech Stack (Microsoft)

| Layer | Technology | Purpose |
|---|---|---|
| **AI/ML** | Azure AI Foundry — Kimi K2.6 | Trend analysis, contract interpretation, risk assessment, executive summaries |
| **Data Platform** | Microsoft Fabric — Lakehouse | Data storage (OneLake), Delta tables, historical analytics |
| **BI/Visualization** | Fabric — Power BI | Real-time dashboards, KPI panels, trend charts |
| **Data Ingestion** | Fabric — Data Factory | Scheduled pipelines, API connectors |
| **Computation** | Python 3.12+ | Deterministic GLI business rules, unit conversions |
| **Market Data** | AlphaVantage API | Real-time Ni, Co, Li, Cu, Mn pricing |
| **Regulatory Data** | Regulations.Gov API | Policy monitoring, trade regulation tracking |
| **Authentication** | MSAL / Azure AD | Service principal auth for Fabric REST API |

### Legacy Components (Preserved)

The original Airia orchestration flow (`commodity_price_analyzer.json`) is preserved in the repository for reference. The new Python-based architecture replaces the Airia-specific components while maintaining identical business logic.

---

## Encoded Contract Structures

| Contract | Index Basis | Key Rules |
|---|---|---|
| **Black Mass Payables** | LME 3-month Ni/Co | 85% grade multiplier; counterparties: Atoka, Li-Cycle, Redwood |
| **Primary Offtaker MHP Offtake** | Fastmarkets MB CO-0005 monthly | 8% floor discount; 15% profit share above $20,000/mt Ni |
| **Lithium Carbonate GTC** | Fastmarkets Li2CO3 99.5% CIF | Floor $20,000/mt, Ceiling $30,000/mt |
| **Li Cycle Feedstock** | Mixed Fastmarkets/LME composite | 92% Li @ 75% payable, 3% Ni @ 90%, 2% Co @ 90% |

---

## Repository Structure

```
Commodity-Price-Analyzer/
├── src/
│   ├── __init__.py              # Main pipeline orchestrator
│   ├── config/
│   │   ├── __init__.py
│   │   └── settings.py          # Environment-based configuration
│   ├── data/
│   │   ├── __init__.py
│   │   └── fetcher.py           # Commodity price data ingestion
│   ├── contracts/
│   │   ├── __init__.py
│   │   └── business_rules.py    # GLI contract calculation engine
│   ├── ai/
│   │   ├── __init__.py
│   │   └── analyzer.py          # Azure AI Foundry (Kimi K2.6) integration
│   └── fabric/
│       ├── __init__.py
│       └── client.py            # Microsoft Fabric REST API client
├── notebooks/
│   ├── fabric_setup_lakehouse.py    # Fabric notebook: Lakehouse table setup
│   └── fabric_commodity_analyzer.py # Fabric notebook: Full analysis pipeline
├── tests/
│   ├── __init__.py
│   └── test_business_rules.py   # 15 unit tests for GLI business rules
├── .env                         # Environment variables (DO NOT commit real keys)
├── .env.example                 # Template for environment variables
├── .gitignore                   # Git ignore rules
├── requirements.txt             # Python dependencies
├── commodity_price_analyzer.json  # Original Airia flow (preserved)
├── ARCHITECTURE.md              # Detailed architecture documentation
├── CONTRACT_LOGIC.md            # Contract logic documentation
├── DATA_SOURCES.md              # Data source documentation
├── README.md                    # This file
└── LICENSE                      # Proprietary license
```

---

## Quick Start

### 1. Clone the Repository

```bash
git clone https://codeberg.org/cubiczan/Commodity-Price-Analyzer.git
cd Commodity-Price-Analyzer
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Environment

```bash
cp .env.example .env
# Edit .env with your Azure AI Foundry and Fabric credentials
```

### 4. Run the Pipeline

```bash
# Full pipeline with AI analysis
python -m src

# Quick natural-language query
python -m src --quick "What is the current Ni/Co margin vs Offtaker?"

# Skip AI analysis (testing)
python -m src --skip-ai

# Custom metals
python -m src --metals nickel cobalt lithium copper

# Save results to file
python -m src --output results.json
```

### 5. Run Tests

```bash
python -m pytest tests/ -v
```

---

## Microsoft Fabric Setup

### Step 1: Create Lakehouse Tables

1. Open your Fabric workspace: [Fabric Workspace](https://app.fabric.microsoft.com/groups/26da3f54-de30-4f32-8700-00850ba0c457)
2. Create a new **Lakehouse** item
3. Create a new **Notebook**
4. Copy the contents of `notebooks/fabric_setup_lakehouse.py` into the notebook
5. Run all cells to create the Delta tables:
   - `CommodityPrices` — Raw price data
   - `ContractCalculations` — GLI calculation results
   - `ContractAnalysis` — AI-powered analysis records
   - `RegulatoryAlerts` — Regulatory monitoring data

### Step 2: Run Analysis Notebook

1. Create another **Notebook**
2. Copy the contents of `notebooks/fabric_commodity_analyzer.py`
3. Add your Azure AI key to Fabric Workspace Settings > Manage connections > New connection
4. Run all cells to execute the full pipeline

### Step 3: Create Power BI Dashboard

1. In your Lakehouse, create a new **Semantic Model** from the Delta tables
2. Build a Power BI report with:
   - Commodity price trends (line chart)
   - Black mass payable value (gauge)
   - MHP profit share trigger status (card)
   - Lithium floor/ceiling status (indicator)
   - AI analysis history (text visual)

---

## Azure Resources Required

### Currently Configured
| Resource | Status | Details |
|---|---|---|
| Azure AI Foundry | Configured | Kimi K2.6 deployment |
| AI Endpoint | Active | `samd-5839-resource.services.ai.azure.com` |

### Additional Resources to Set Up

| Resource | Purpose | How to Get |
|---|---|---|
| **Fabric Capacity** | Run notebooks and pipelines | Microsoft Fabric Admin portal |
| **Azure AD Service Principal** | Authenticate to Fabric REST API | Azure Portal > App Registrations > New registration |
| **Fabric Workspace** | Store Lakehouse and notebooks | Already created |
| **Azure Key Vault** (recommended) | Securely store API keys | Azure Portal > Key Vaults > Create |
| **AlphaVantage API Key** | Real-time commodity pricing | [alphavantage.co/support/#api-key](https://www.alphavantage.co/support/#api-key) (Premium tier for metals) |
| **Regulations.Gov API Key** | Regulatory monitoring | [api.data.gov/signup](https://api.data.gov/signup/) (Free) |

### Service Principal Setup for Fabric

```bash
# 1. Create Service Principal in Azure AD
az ad sp create-for-rbac --name "fabric-commodity-analyzer" --role Contributor

# 2. Grant Fabric access
# In Fabric Workspace > Access > Add people/groups > add the Service Principal

# 3. Add credentials to .env
FABRIC_TENANT_ID=<your-tenant-id>
FABRIC_CLIENT_ID=<service-principal-app-id>
FABRIC_CLIENT_SECRET=<service-principal-password>
```

---

## AI Analysis Capabilities (Kimi K2.6)

The Azure AI Foundry integration provides four analysis modes:

| Mode | Method | Description |
|---|---|---|
| **Trend Analysis** | `analyze_trends()` | Current price levels, market drivers, 30-day outlook |
| **Contract Interpretation** | `interpret_contracts()` | Executive narrative with contract performance breakdown |
| **Risk Assessment** | `assess_risk()` | Volatility, counterparty, regulatory, and concentration risk ratings |
| **Daily Summary** | `generate_summary()` | 2-minute CFO briefing with action items |

---

## License

Proprietary — GLI Internal Use Only.

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
- **Category**: Mining / Supply Chain
- **Foundation Threshold**: 75
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

