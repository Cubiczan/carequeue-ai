<p align="center">
  <h1 align="center">Liquify Gateway</h1>
  <p align="center">Institutional-grade liquid staking dashboard for BNB Chain with yield provenance tracking, real-time risk monitoring, and validator compliance reporting.</p>
  <p align="center">
    <img src="https://img.shields.io/badge/BNB_Chain-Mainnet-F3BA2F?logo=binance&logoColor=white" alt="BNB Chain" />
    <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black" alt="React" />
    <img src="https://img.shields.io/badge/TypeScript-5-blue?logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white" alt="Vite" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
    <img src="https://img.shields.io/badge/shadcn/ui-black" alt="shadcn/ui" />
    <img src="https://img.shields.io/badge/License-MIT-green" alt="MIT License" />
  </p>
</p>

## Demo

https://github.com/user-attachments/assets/demo.mp4

## Screenshots

<details>
<summary>📊 Dashboard</summary>
<img src="demo/01-dashboard.png" alt="Dashboard" />
</details>

<details>
<summary>💎 Staking Positions</summary>
<img src="demo/02-assets.png" alt="Assets" />
</details>

<details>
<summary>🖥️ Validator Directory</summary>
<img src="demo/03-entities.png" alt="Entities" />
</details>

<details>
<summary>🔗 Yield Provenance</summary>
<img src="demo/04-supply-chain.png" alt="Supply Chain" />
</details>

<details>
<summary>🛡️ Risk & Compliance</summary>
<img src="demo/05-compliance.png" alt="Compliance" />
</details>

<details>
<summary>📋 Event Log</summary>
<img src="demo/06-events.png" alt="Events" />
</details>

<details>
<summary>⚙️ Settings</summary>
<img src="demo/07-settings.png" alt="Settings" />
</details>

## Overview

**Liquify Gateway** is a real-time liquid staking transparency dashboard for BNB Chain. It applies supply-chain provenance tracking concepts to DeFi staking, enabling delegators to trace the complete lifecycle of their staked BNB from wallet to validator to yield. The platform provides institutional-grade risk monitoring, yield provenance tracing, and compliance reporting that was previously impossible on BNB Chain.

### The Problem

Liquid staking on BNB Chain has a transparency gap. Delegators stake their BNB into validator pools and receive lstBNB tokens in return, but they have no way to answer fundamental questions about their yield: Which specific validators generated my rewards? How healthy are those validators right now? Am I exposed to slashing risk? What is the exact provenance of my yield from stake to claim?

Existing DeFi dashboards show balances and APYs, but they treat liquid staking as a black box. This is a critical gap for institutional stakers, compliance teams, and sophisticated retail users who need to understand exactly where their yield comes from and what risks are embedded in their positions.

### The Solution

Liquify Gateway solves this by leveraging the Liquify Indexer API as a structured data layer. Instead of querying slow and expensive BNB Chain RPCs directly, the Indexer provides pre-processed, indexed data for validators, positions, events, and risk metrics. This enables sub-100ms dashboard loads and real-time risk monitoring.

The architectural insight is that the data structures required to trace a mineral from mine to battery pack are mathematically identical to those required to trace staked BNB from a user wallet, through a liquidity pool, to a specific validator, and down to the exact yield generated. Both domains require tracking entities, assets, provenance chains, and compliance checks.

## Architecture

```
┌───────────────────────────────────────────────────────────────────┐
│                        Liquify Gateway                            │
├───────────────────────────────────────────────────────────────────┤
│                     React Frontend (Vite)                         │
│  ┌──────────┐ ┌──────────────┐ ┌──────────┐ ┌──────────────┐     │
│  │Dashboard │ │   Staking    │ │Validator │ │    Yield     │     │
│  │Overview  │ │  Positions   │ │Directory │ │  Provenance  │     │
│  └──────────┘ └──────────────┘ └──────────┘ └──────────────┘     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                        │
│  │  Risk &  │ │  Event   │ │ Settings │                        │
│  │Compliance│ │   Log    │ │          │                        │
│  └──────────┘ └──────────┘ └──────────┘                        │
├───────────────────────────────────────────────────────────────────┤
│                    Service Layer (TypeScript)                      │
│           src/lib/liquify.ts · MetaMask Wallet (BNB Chain)        │
├───────────────────────────────────────────────────────────────────┤
│                     Liquify Indexer API                            │
│  ┌──────────────┐ ┌───────────┐ ┌──────────┐ ┌────────────┐     │
│  │  Network     │ │Validators │ │ Positions│ │   Risk     │     │
│  │  Metrics     │ │  & Stats  │ │ & Yield  │ │ Assessments│     │
│  └──────────────┘ └───────────┘ └──────────┘ └────────────┘     │
├───────────────────────────────────────────────────────────────────┤
│                       BNB Smart Chain                              │
│              Consensus · Staking · lstBNB Protocol                 │
└───────────────────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| Blockchain | BNB Smart Chain Mainnet |
| Data Layer | Liquify Indexer API |
| Wallet | MetaMask (BNB Chain) |
| Frontend | React 18 + TypeScript + Vite 5 |
| UI Framework | Tailwind CSS 3 + shadcn/ui (Radix UI) |
| State Management | TanStack React Query v5 |
| Routing | React Router DOM v6 |
| Charts | Recharts v2 |
| Forms | React Hook Form + Zod |
| Testing | Vitest + Playwright + Testing Library |

## Modules

| Module | Description |
|--------|-------------|
| **Dashboard** | Real-time BNB Chain network metrics, portfolio stats, staking event feed, risk panel, and yield provenance summary |
| **Staking Positions** | Active lstBNB positions with validator details, pending yield, token balances, USD values, and transaction history |
| **Validator Directory** | Comprehensive validator cards with APR, commission, uptime, stake, delegator count, performance tables, and delegation tiers |
| **Yield Provenance** | Complete lifecycle tracing: User Wallet → lstBNB Pool → Validator → Consensus Layer → Yield Distribution → Claim |
| **Risk & Compliance** | Validator risk scoring (0-100), slashing history, missed blocks, downtime monitoring, and configurable alert policies |
| **Event Log** | Full stream of on-chain staking actions: stakes, unstakes, claims, redelegations, validator jails, and slash events |
| **Settings** | Network configuration, wallet management, and platform preferences |

## Key Features

- **Yield Provenance Tracing** — Follow the complete lifecycle of staked BNB from wallet through liquidity pool to validator and back as yield. Each node in the provenance graph shows stake amount, yield generated, APR, validator identity, and on-chain transaction reference.
- **Real-Time Risk Monitoring** — Every validator receives a 0-100 risk score computed from slashing history, missed blocks (24h), downtime (24h), commission changes (30d), and overall health status (healthy/warning/critical).
- **Alert Policy Engine** — Configurable thresholds enforce real-time alerts: 6 hours downtime triggers a jail risk warning, 24 hours triggers a critical slashing alert, commission spikes trigger review workflows.
- **Liquify Indexer Integration** — Pre-processed, indexed data replaces slow BNB Chain RPC queries. Network data is polled every 12 seconds with intelligent fallback to mock data for demo environments.
- **MetaMask Wallet** — BNB Smart Chain wallet connection with automatic chain switching, account change detection, and formatted address display.
- **Delegation Tiers** — Validators categorized by stake volume: Top 10 (institutional-grade), Professional (proven track record), Community (emerging validators).
- **Responsive Dark Theme** — Custom dark theme with BNB gold primary color, glassmorphism panels, monospace data displays, and mobile-first responsive design.
- **Immutable Audit Trail** — Complete on-chain event log with transaction hashes, gas fees, and block numbers for regulatory compliance and transparency.

## Getting Started

### Prerequisites

- Node.js 18+
- MetaMask browser extension
- BNB Smart Chain network configured in MetaMask

### Installation

```bash
git clone https://github.com/icohangar-ops/liquify-gateway.git
cd Liquify-gateway
npm install
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production

```bash
npm run build
npm run preview
```

### Testing

```bash
npm run test          # Run unit tests
npm run test:watch    # Watch mode
```

## Project Structure

```
Liquify-gateway/
├── README.md                         # This file
├── package.json                      # Dependencies and scripts
├── vite.config.ts                    # Vite build configuration
├── tsconfig.json                     # TypeScript configuration
├── tailwind.config.ts                # Tailwind CSS configuration
├── vitest.config.ts                  # Test runner configuration
├── playwright.config.ts              # E2E test configuration
│
├── src/
│   ├── App.tsx                       # Root application with routing
│   ├── main.tsx                      # Vite entry point
│   ├── index.css                     # Global styles and Tailwind imports
│   │
│   ├── pages/
│   │   ├── Index.tsx                 # Dashboard overview
│   │   ├── Assets.tsx                # Staking positions
│   │   ├── Entities.tsx              # Validator directory
│   │   ├── SupplyChain.tsx           # Yield provenance
│   │   ├── Compliance.tsx            # Risk & compliance monitoring
│   │   ├── Events.tsx                # Event log
│   │   ├── Settings.tsx              # Platform settings
│   │   └── NotFound.tsx              # 404 page
│   │
│   ├── components/
│   │   ├── AppLayout.tsx             # Main layout with sidebar
│   │   ├── AppSidebar.tsx            # Navigation sidebar
│   │   ├── DashboardHeader.tsx       # Top header bar
│   │   ├── StatsGrid.tsx             # Dashboard metric cards
│   │   ├── NetworkStatus.tsx         # BNB Chain network status
│   │   ├── YieldProvenance.tsx       # Yield provenance graph
│   │   ├── RiskPanel.tsx             # Risk assessment panel
│   │   ├── ValidatorRegistry.tsx     # Validator summary table
│   │   ├── RecentEvents.tsx          # Recent staking events feed
│   │   ├── NavLink.tsx               # Navigation link component
│   │   └── ui/                       # shadcn/ui primitives
│   │
│   ├── lib/
│   │   ├── liquify.ts                # Liquify Indexer API client + types + mock data
│   │   ├── wallet.ts                 # MetaMask BNB Chain wallet connection
│   │   └── utils.ts                  # Utility functions (cn helper)
│   │
│   └── test/                         # Test utilities
│
├── demo/                             # Screenshots
│   ├── 01-dashboard.png
│   ├── 02-assets.png
│   ├── 03-entities.png
│   ├── 04-supply-chain.png
│   ├── 05-compliance.png
│   ├── 06-events.png
│   └── 07-settings.png
│
└── scripts/                          # Build and utility scripts
```

## API Layer

The `src/lib/liquify.ts` service layer provides the bridge between the React frontend and the Liquify Indexer:

- **`getNetworkMetrics()`** — Total TVL, active stakers, average APR, validator count, bond rate, block height
- **`getValidators()`** — Full validator list with stake, commission, APR, uptime, delegator count, status
- **`getUserPositions(address)`** — Per-wallet staking positions with pending rewards and lstBNB balances
- **`getValidatorRisk(id)`** — Validator risk assessment with slashing history, missed blocks, downtime, commission changes
- **`getStakingEvents()`** — Paginated staking event stream (stakes, unstakes, claims, redelegations, jails, slashes)
- **`getYieldProvenance(address)`** — Full yield provenance graph for a wallet's staking lifecycle

All functions include intelligent fallback to mock data when the Indexer API is unreachable, enabling seamless demo environments.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Author

**Cubiczan** — [github.com/Cubiczan](https://github.com/icohangar-ops)

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
