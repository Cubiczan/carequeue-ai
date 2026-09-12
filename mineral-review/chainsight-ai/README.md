# ChainSight AI

**AI-Powered On-Chain Anomaly Detection for the Mantle Network**

---

## Vision

On-chain DeFi ecosystems generate millions of transactions daily, creating an overwhelming noise-to-signal ratio for traders, researchers, and security teams. Existing block explorers show raw transaction data but provide zero intelligence about *what* is actually happening — who is accumulating tokens, who is executing sandwich attacks, which smart money wallets are positioning before major moves, and where flash loan exploits are being attempted.

ChainSight AI solves this problem by acting as an intelligent monitoring layer on top of the Mantle Network's DeFi infrastructure. It continuously monitors on-chain activity across major DEXes — Merchant Moe, Agni Finance, and Fluxion — detecting six categories of anomalous behavior in real time: flash loan attacks, sandwich attacks, whale accumulation patterns, wash trading, unusual volume spikes, and MEV extraction. Each detected anomaly is analyzed by an AI engine that produces natural-language risk assessments with actionable recommendations, transforming raw blockchain data into intelligence that anyone can understand and act on.

The platform is designed for DeFi traders who need an edge in identifying smart money movements before they become public knowledge, for security researchers who need automated detection of exploitative patterns, and for protocol teams who need visibility into the health of their liquidity pools. By making on-chain intelligence accessible and actionable, ChainSight AI bridges the gap between raw blockchain data and human decision-making.

---

## Key Features

### Real-Time Anomaly Detection

ChainSight AI monitors the Mantle Network's DeFi ecosystem and detects six types of anomalous on-chain behavior:

| Anomaly Type | Description |
|---|---|
| **Flash Loan Attacks** | Detects large capital borrowed and repaid within a single block, a common attack vector used to exploit price oracle manipulation or governance attacks |
| **Sandwich Attacks** | Identifies front-running and back-running patterns around large swaps that extract value from regular users |
| **Whale Accumulation** | Tracks significant token accumulation by large wallet addresses across multiple DEXes, signaling potential market-moving events |
| **Wash Trading** | Detects coordinated trading between related addresses designed to artificially inflate volume and manipulate token prices |
| **Unusual Volume** | Flags sudden volume spikes that deviate significantly from historical averages, often preceding price discovery events |
| **MEV Extraction** | Identifies maximal extractable value bot activity, including arbitrage across DEXes and liquidation sniping |

Each anomaly is assigned a confidence score (0–100%) and severity level (low, medium, high, critical) based on pattern analysis.

### AI-Powered Analysis

When an anomaly is detected, users can trigger an AI-powered deep analysis that:

- **Summarizes** the event in plain English, explaining exactly what happened and why it matters
- **Assesses risk level** based on the anomaly type, scale, and historical context
- **Provides actionable recommendations** such as "reduce exposure to affected pools," "monitor the involved address for follow-up transactions," or "set price alerts for the affected token"

The AI engine uses a specialized system prompt tuned for on-chain analysis, ensuring that every assessment is specific about amounts, addresses, DEXes, and timing rather than generic.

### Interactive Dashboard

The ChainSight AI dashboard provides four core views:

1. **Overview** — Real-time stats (transactions monitored, active anomalies, critical alerts, tracked addresses), DEX volume distribution chart, anomaly severity breakdown, and recent activity feeds
2. **Anomaly Feed** — Filterable, paginated stream of all detected anomalies with severity badges, confidence indicators, and one-click AI analysis
3. **Transaction Explorer** — Full searchable, filterable transaction log with expandable details showing hashes, gas costs, block numbers, and counterparty addresses
4. **AI Analysis Hub** — Centralized view of all AI-generated analyses with risk-level color coding and actionable recommendations

### Smart Address Monitoring

ChainSight AI maintains a curated watchlist of whale addresses, active traders, MEV bots, and smart contracts on Mantle. Each address is assigned a risk score and type label. The system cross-references every transaction against this watchlist to surface relevant activity.

### Alert System

Every detected anomaly generates an alert with severity classification. Unread alerts are prominently displayed in the UI notification bell. The alert system is designed to be extended with Telegram and Discord bot integrations for real-time push notifications.

---

## Technical Architecture

### Frontend

- **Framework:** Next.js 16 with App Router and TypeScript
- **UI Library:** shadcn/ui component library with Tailwind CSS 4
- **Charts:** Recharts for data visualization (volume charts, anomaly distribution, severity breakdowns)
- **State:** TanStack Query for server state management
- **Theme:** Dark cybersecurity aesthetic with emerald green accents, custom glow effects, and monospace fonts for blockchain data

### Backend

- **API:** 7 RESTful endpoints serving paginated, filterable data
- **Database:** Prisma ORM with SQLite (6 models: MonitoredAddress, OnchainTransaction, Anomaly, Alert, AIAnalysis)
- **AI Engine:** z-ai-web-dev-sdk for LLM-powered anomaly analysis with a specialized on-chain analyst system prompt

### API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/dashboard` | GET | Aggregate stats, DEX volumes, anomaly distributions, recent activity |
| `/api/anomalies` | GET | Paginated anomaly feed with severity/type/analyzed filters |
| `/api/transactions` | GET | Paginated transaction explorer with DEX/token/type filters |
| `/api/analyze` | POST | AI-powered anomaly analysis via LLM |
| `/api/alerts` | GET/POST | Alert management and mark-as-read |
| `/api/addresses` | GET | All monitored wallet/contract addresses |

### Data Models

```
MonitoredAddress  — Tracked whale/MEV/contract addresses with risk scores
OnchainTransaction — Raw DEX transactions with token, value, gas, DEX, type
Anomaly           — Detected anomalous events with type, severity, confidence
Alert             — User-facing notifications generated from anomalies
AIAnalysis        — LLM-generated risk assessments and recommendations
```

---

## How It Works

1. **Ingest** — On-chain transaction data from Mantle's DEX ecosystem (Merchant Moe, Agni Finance, Fluxion) is ingested and stored with full metadata including token, USD value, gas cost, and transaction type.

2. **Detect** — Pattern recognition algorithms analyze transaction flows to identify six categories of anomalous behavior. Each detection is scored by confidence and classified by severity.

3. **Alert** — Detected anomalies generate color-coded alerts (green for low-risk, amber for medium, red for high, purple for critical) that surface immediately in the dashboard.

4. **Analyze** — Users trigger AI deep analysis on any anomaly. The LLM receives structured context (type, severity, confidence, description, metadata) and produces a natural-language risk assessment with actionable recommendations.

5. **Act** — Users can filter the anomaly feed by type and severity, review AI recommendations, and make informed decisions about their DeFi positions.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 + shadcn/ui |
| Database | Prisma ORM + SQLite |
| Charts | Recharts |
| AI | z-ai-web-dev-sdk (LLM) |
| Icons | Lucide React |
| State | TanStack Query + Zustand |

---

## Getting Started

### Prerequisites

- Node.js 18+
- Bun runtime

### Installation

```bash
git clone https://codeberg.org/<username>/chainsight-ai.git
cd chainsight-ai
bun install
cp .env.example .env  # Configure DATABASE_URL
bun run db:push       # Initialize database
bun run seed          # Seed with demo data
bun run dev           # Start development server
```

### Environment Variables

```env
DATABASE_URL=file:./db/custom.db
```

---

## Built For

- [Mantle Network](https://www.mantle.xyz/) — Premier L2 distribution layer

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
- **Category**: Blockchain / DeFi
- **Foundation Threshold**: 85
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

