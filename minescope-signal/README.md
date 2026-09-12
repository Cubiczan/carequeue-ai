# Minescope.Signal

**Mining Intelligence Platform — Fabric + AI Foundry**

A Microsoft Fabric-native mining intelligence system that extracts actionable signals from commodity pricing, reserve estimates, production data, and AISC benchmarks. AI Foundry agents provide comparative cross-company analysis and narrative intelligence.

> **Variant of** [Minescope](https://codeberg.org/cubiczan/minescope) — rebuilt entirely on the Fabric + AI Foundry stack. Original Minescope (AWS/Airia) is untouched.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Minescope.Signal                              │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │  Commodity    │  │  Reserve     │  │  Production          │   │
│  │  Pricing      │  │  Estimation  │  │  Analytics           │   │
│  │  (AV/FRED)    │  │  (NI 43-101) │  │  (Grade/Guidance)    │   │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────────────┘   │
│         │                 │                  │                   │
│  ┌──────┴─────────────────┴──────────────────┴───────────────┐   │
│  │              Mining Intelligence Service                    │   │
│  │   Signal Scoring │ Cost Benchmarking │ NPV Sensitivity     │   │
│  └──────────────────────────┬────────────────────────────────┘   │
│                             │                                    │
│  ┌──────────────────────────┴────────────────────────────────┐   │
│  │              Azure AI Foundry Agents                       │   │
│  │   Intelligence Briefing │ Comparative Analysis             │   │
│  └──────────────────────────┬────────────────────────────────┘   │
│                             │                                    │
│  ┌──────────────────────────┴────────────────────────────────┐   │
│  │              Fabric Lakehouse (Delta Tables)               │   │
│  │   14 tables: companies, mines, reserves, production,       │   │
│  │   prices, AISC, signals, cost curves, AI analyses          │   │
│  └────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Signal Score Methodology

Each mining company receives a composite **0–100 signal score** across five dimensions:

| Dimension | Weight | What It Measures |
|-----------|--------|------------------|
| **Grade** | 25% | Reserve quality (avg grade, P/P ratio) |
| **Cost** | 25% | AISC percentile rank (lower = better) |
| **Production** | 20% | Guidance beat rate, recovery efficiency |
| **Growth** | 15% | Reserve-to-resource conversion potential |
| **ESG** | 15% | ESG score (0–100) |

**Rating bands:** Strong Buy (80+) · Buy (65–80) · Hold (50–65) · Underperform (35–50) · Sell (<35)

---

## Project Structure

```
minescope-signal/
├── src/
│   ├── __init__.py                    # Package metadata
│   ├── models/                        # Domain models
│   │   ├── mining_company.py          # MiningCompany, CompanyTier
│   │   ├── mine_site.py               # MineSite, MineStatus, ProcessingMethod
│   │   ├── reserve_estimate.py        # ReserveEstimate, ResourceClassification
│   │   ├── production_record.py       # ProductionRecord, PeriodType
│   │   ├── commodity_price.py         # CommodityPrice, PriceUnit, unit conversions
│   │   └── aisc_metric.py             # AiscMetric, cost benchmarking
│   └── services/                      # Business logic
│       ├── pricing_service.py         # AlphaVantage, FRED, fallback prices
│       ├── reserve_service.py         # Aggregation, NPV sensitivity, comparison
│       ├── production_service.py      # Trends, guidance, recovery analysis
│       ├── aisc_service.py            # Cost curves, margins, peer benchmarking
│       └── mining_intelligence_service.py  # Orchestrator + signal scoring
├── notebooks/
│   ├── fabric_setup_lakehouse.py      # 14 Delta tables + seed data (14 cells)
│   └── fabric_mining_dashboard.py     # Full pipeline + AI agents (14 cells)
├── tests/
│   └── test_minescope_signal.py       # 64 tests (all passing)
└── README.md
```

---

## Domain Models

### MiningCompany
Core entity — tier (Major/Mid-Tier/Junior/Royalty), sector, commodities, market cap, ESG score.

### MineSite
Individual operation — location, status (Active/C&M/Development/Exploration), processing method, mill capacity, mine life.

### ReserveEstimate
NI 43-101 / JORC compliant — tonnage, grade, classification (Proven/Probable/Measured/Indicated/Inferred), contained metal calculations.

### ProductionRecord
Quarterly/annual output — tonnes milled, ore grade, recovery, metal produced, AISC, guidance beat/miss.

### CommodityPrice
Price data with automatic unit conversion (oz ↔ lb ↔ mt ↔ kg). Tracks 52-week ranges and source attribution.

### AiscMetric
All-In Sustaining Cost — mining/processing/G&A/ Capex breakdown, by-product credits, industry benchmarking, percentile ranks, cost quartiles.

---

## Services

### PricingService
- AlphaVantage API (5 req/min rate limiting)
- FRED API integration
- 14-commodity fallback pricing
- Automatic USD/mt ↔ USD/lb ↔ USD/oz conversion

### ReserveService
- Aggregate by classification tier
- Proven + Probable total
- Tonnage-weighted average grade
- Reserve-to-resource conversion ratio
- NPV sensitivity across price scenarios
- Cross-entity reserve comparison

### ProductionService
- Annualized production from quarterly data
- Ore grade trend analysis (improving/stable/declining)
- Recovery efficiency statistics
- Guidance beat/miss tracking with consistency rating

### AiscService
- Industry median calculation
- Percentile ranking
- Cost curve construction with cumulative production
- Breakeven price analysis
- Margin analysis at given commodity prices
- Peer comparison across companies

### MiningIntelligenceService
- Composite signal score (0–100) with 5 weighted dimensions
- AI-ready context builder for Foundry agent prompts
- Cross-company orchestrator

---

## Fabric Notebooks

### 1. fabric_setup_lakehouse.py (14 cells)
Creates **14 Delta tables** with realistic seed data:

| Table | Rows | Content |
|-------|------|---------|
| mining_companies | 8 | Barrick, Newmont, FCX, Glencore, Rio Tinto, LAC, SCCO, FNV |
| mine_sites | 14 | Carlin, Goldstrike, Cortez, Grasberg, Morenci, Escondida, etc. |
| reserve_estimates | 18 | Gold, copper, lithium — Proven through Inferred |
| production_records | 12 | Q1–Q4 2024 production with AISC |
| commodity_prices | 10 | Au, Ag, Cu, Ni, Co, Li, Fe, Zn, Pt, Pd |
| aisc_metrics | 9 | Per-mine AISC with cost quartiles |
| signal_scores | — | Computed signal scores |
| cost_curves | — | AISC cost curve data |
| reserve_comparisons | — | Cross-entity reserve rankings |
| production_comparisons | — | Cross-entity production rankings |
| ai_analyses | — | Per-company AI intelligence briefings |
| ai_comparative | — | Cross-company AI comparative reports |
| pipeline_runs | — | Pipeline execution logs |

### 2. fabric_mining_dashboard.py (14 cells)
Full analytics pipeline:
1. Configuration (AI endpoint, weights, targets)
2. Model imports
3. Delta table data loading
4. Commodity price snapshot dashboard
5. Reserve analysis by company
6. AISC benchmarking (Gold + Copper mines)
7. Signal score calculation per company
8. AI Foundry agent: Mining Intelligence Analyst
9. AI analysis per company (narrative briefing)
10. AI Comparative Analysis Agent (cross-company ranking)
11. Signal scores → Delta write
12. AI analyses → Delta write
13. Pipeline run log
14. Final summary dashboard

---

## Seed Data (8 Companies)

| Company | Ticker | Tier | Primary |
|---------|--------|------|---------|
| Barrick Gold | GOLD | Major | Gold, Copper |
| Newmont | NEM | Major | Gold, Copper, Silver |
| Freeport-McMoRan | FCX | Major | Copper, Gold, Mo |
| Glencore | GLEN | Major | Cu, Zn, Ni, Coal |
| Rio Tinto | RIO | Major | Iron, Al, Cu |
| Lithium Americas | LAC | Junior | Lithium |
| Southern Copper | SCCO | Mid-Tier | Copper |
| Franco-Nevada | FNV | Royalty | Gold |

---

## Getting Started

### Prerequisites
- Microsoft Fabric workspace with Lakehouse
- Azure AI Foundry endpoint + API key
- AlphaVantage API key (free tier)
- FRED API key (free)

### Setup
```bash
# 1. Clone
git clone https://codeberg.org/cubiczan/minescope-signal.git
cd minescope-signal

# 2. Upload to Fabric workspace
#    - Upload src/ to /Files/src/
#    - Import notebooks/ as Fabric Notebooks

# 3. Set environment variables in Fabric notebook
import os
os.environ["AZURE_AI_ENDPOINT"] = "https://your.openai.azure.com/"
os.environ["AZURE_AI_KEY"] = "your-key"
os.environ["AZURE_AI_DEPLOYMENT"] = "gpt-4o"

# 4. Run fabric_setup_lakehouse.py first
# 5. Run fabric_mining_dashboard.py for analytics
```

### Local Development
```bash
# Install dependencies
pip install requests pandas numpy pytest

# Run tests
pytest tests/ -v
```

---

## API Keys Required

| API | Purpose | Free Tier |
|-----|---------|-----------|
| Azure AI Foundry | LLM analysis, narrative generation | Pay-per-use |
| AlphaVantage | Commodity price data | 5 req/min, 500/day |
| FRED | Macro-economic data | 120 req/min |

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Data Lakehouse | Microsoft Fabric Delta Tables |
| AI/LLM | Azure AI Foundry (GPT-4o / Kimi K2.6) |
| Notebooks | Fabric Notebook (PySpark + Python) |
| API Integration | AlphaVantage, FRED, Twelve Data |
| Language | Python 3.10+ |
| Testing | pytest (64 tests) |

---

## License

MIT License — 2026

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

