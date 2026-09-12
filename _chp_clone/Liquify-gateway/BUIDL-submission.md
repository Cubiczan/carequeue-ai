# Liquify Gateway

## Vision

Liquid staking on BNB Chain has a transparency problem. Delegators stake their BNB into validator pools and receive lstBNB tokens in return, but they have no way to answer fundamental questions about their yield: Which specific validators generated my rewards? How healthy are those validators right now? Am I exposed to slashing risk? What is the exact provenance of my yield from stake to claim?

Existing DeFi dashboards show balances and APYs, but they treat liquid staking as a black box. You can see your lstBNB balance and a snapshot of validator APYs, but you cannot trace the actual flow of your capital through the staking pipeline. This is a critical gap for institutional stakers, compliance teams, and sophisticated retail users who need to understand exactly where their yield comes from and what risks are embedded in their positions.

Liquify Gateway solves this by applying supply-chain provenance tracking concepts to BNB liquid staking. The core insight is architectural: the data structures required to trace a critical mineral from a mine, through a refinery, to a battery pack are mathematically identical to those required to trace staked BNB from a user wallet, through a liquidity pool, to a specific validator, and down to the exact yield generated. Both domains require tracking entities (mines/refineries vs. validators/pools), assets (mineral tokens vs. lstBNB), provenance chains (ore→refined→cell vs. stake→pool→validator→yield), and compliance checks (FEOC/IRA vs. slashing/health).

By leveraging the Liquify Indexer API as our structured data layer instead of slow and expensive BNB Chain RPCs, Liquify Gateway provides millisecond-speed queries across the full staking supply chain. This enables real-time risk monitoring, yield provenance tracing, and institutional-grade compliance reporting that was previously impossible on BNB Chain.

## How It Works

Liquify Gateway is built with React 18 + TypeScript + Vite + Tailwind CSS and shadcn/ui components, providing a polished, responsive dark-themed dashboard experience. The architecture consists of six interconnected modules:

**1. Staking Overview (Dashboard)**
The landing page displays real-time BNB Chain network metrics (block height, bond rate, block time), portfolio-level stats (total TVL, active stakers, network APR, active validators), a live staking event feed, a validator risk assessment panel, and a yield provenance summary — all visible at a glance. Network data is polled from the Liquify Indexer API every 12 seconds with intelligent fallback to mock data for demo environments.

**2. Staking Positions (Assets Module)**
Maps the mineral asset registry to staking positions. Users can view all their active lstBNB positions with validator delegation details, pending yield amounts, token balances, USD values, entry dates, and status (active/unbonding). The module includes a full transaction history for stakes, claims, and unstakes, plus quick-action cards for common operations (Stake BNB, Claim Rewards, Unstake). This gives delegators a complete picture of their capital deployment.

**3. Validator Directory (Entities Module)**
Transforms the mine/refinery entity registry into a comprehensive validator directory. Each validator card displays active stake, APR, commission rate, uptime percentage, delegator count, operator address, and live status (active/jailed/slashing). The performance tab provides a sortable table with all key metrics, and the delegation tiers tab categorizes validators by stake volume (Top 10, Professional, Community). This replaces the opaque "pick a validator" experience with full transparency.

**4. Yield Provenance (Supply Chain Module)**
This is the architectural centerpiece. Where traditional supply chain tracking traces a mineral from extraction to final product, Liquify Gateway traces the complete lifecycle of staked BNB: User Wallet → lstBNB Pool → Validator Delegation → Consensus Layer Participation → Yield Generation → Yield Distribution → lstBNB Claim. Each node in the provenance graph shows the stake amount, yield generated, APR, validator identity, and on-chain transaction reference. This enables delegators to understand exactly where their yield comes from.

**5. Risk & Compliance (Compliance Module)**
Replaces mineral compliance checks (FEOC exclusion, domestic content %, IRA attestation) with staking risk monitoring. Each validator receives a 0-100 risk score based on slashing history, missed blocks (24h), downtime (24h), commission changes (30d window), and overall health status (healthy/warning/critical). The alert policies engine enforces real-time thresholds — for example, a validator exceeding 6 hours downtime triggers a jail risk warning, while 24 hours triggers a critical slashing alert. This provides the kind of institutional risk monitoring that was previously only available on enterprise platforms.

**6. Event Log (Events Module)**
Captures the full stream of on-chain staking actions via the Liquify Indexer API's event/webhook endpoints. Events include stakes, unstakes, reward claims, redelegations, validator jails, and slash events. The transactions tab shows corresponding on-chain transaction hashes, gas fees, and block numbers. The live feed tab provides a real-time streaming view of events as they occur, giving delegators instant visibility into protocol activity.

## Technical Architecture

- **Frontend**: React 18 + TypeScript + Vite 5 + Tailwind CSS 3 + shadcn/ui (Radix UI primitives)
- **Data Layer**: Liquify Indexer API (replaces Stellar SDK / Soroban RPC calls)
- **Wallet**: MetaMask with BNB Smart Chain integration (replaces Stellar Freighter)
- **State Management**: TanStack React Query for server state + optimistic UI updates
- **Visualization**: Recharts for data visualization (used in dashboard charts and risk graphs)
- **Design System**: Custom dark theme with BNB gold (#D4A017) primary color, glassmorphism panels, monospace data displays
- **Responsive**: Mobile-first responsive design using Tailwind breakpoints

The Liquify Indexer API serves as our structured data lake. Instead of querying BNB Chain RPCs directly (which is computationally expensive for historical data), the Indexer provides pre-processed, indexed data for validators, positions, events, and risk metrics. This architectural decision is similar to how The Graph serves Ethereum dApps — it transforms raw blockchain data into queryable, structured data that can power real-time dashboards without expensive RPC calls.

## Why Liquify Indexer?

Querying historical validator performance, user yield accumulation, and slashing events directly from BNB Chain RPCs is computationally expensive and fundamentally too slow for a real-time compliance dashboard. A single yield provenance query might require tracing transactions across hundreds of blocks. The Liquify Indexer API solves this by maintaining a continuously updated, indexed view of all staking state changes. This allows our React frontend to filter, sort, and graph staking metrics instantly, enabling sub-100ms dashboard loads and real-time risk monitoring that would be impossible with direct RPC queries.

## Cross-Domain Architecture (Mental Model Reuse)

Liquify Gateway was originally architected as Mineral Gateway, a critical minerals traceability engine built on the Stellar blockchain. During development, we recognized that the supply chain data model — tracking entities (mines/refineries), assets (tokenized minerals), provenance (ore→battery), and compliance (FEOC/IRA) — maps 1:1 to liquid staking on BNB Chain. By swapping the domain (minerals→BNB) and the data source (Stellar/Soroban→Liquify Indexer), the entire architecture transfers seamlessly. This cross-domain reuse is not a shortcut — it is a deliberate application of mature supply-chain engineering patterns to DeFi infrastructure.

## Category
No (not an AI Agent)

## Links
- GitHub: https://github.com/icohangar-ops/liquify-gateway
