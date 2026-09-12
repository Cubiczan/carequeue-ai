# Mineral Gateway: Agent-Powered Critical Minerals Traceability on Stellar

## Overview

Mineral Gateway is a Stellar/Soroban-based platform that combines on-chain critical minerals traceability with autonomous AI agent capabilities and machine-to-machine (M2M) payments. Built for US defense and industrial policy compliance, the platform tracks mineral provenance from mine to battery pack using SEP-41 tokenized asset lots — and exposes every operation as a payable, agent-accessible service via the x402 protocol and Machine Payments Protocol (MPP).

The core insight: supply chain compliance checking, provenance verification, and mineral tokenization are tasks that benefit enormously from autonomous agents. Compliance auditors, procurement systems, and regulatory agencies should not need to manually query blockchains or copy-paste data — they should be able to instruct agents that independently monitor, verify, pay for data access, and take action in real time. Mineral Gateway makes this possible by turning every supply chain operation into a payable HTTP endpoint on Stellar.

## Problem

The global critical minerals supply chain — lithium, cobalt, nickel, rare earths — is opaque, fragmented, and vulnerable to fraud. US defense and industrial policy (including FEOC — Foreign Entity of Concern — restrictions) requires verifiable provenance from mine to end product. Today, this verification is manual, slow, paper-based, and easily spoofed. Downstream manufacturers cannot reliably answer: "What percentage of this battery's minerals came from allied nations?" or "Has any batch been tainted by a sanctioned entity?"

Simultaneously, the rise of AI agents has created demand for machine-accessible compliance APIs. Existing systems require human-in-the-loop interactions: logging into portals, downloading spreadsheets, cross-referencing databases. There is no protocol-level mechanism for an autonomous procurement agent to request provenance data, verify it on-chain, and pay for the service — all without human intervention.

## Solution

Mineral Gateway solves both problems by building a vertically integrated traceability stack on Stellar, with first-class support for x402-enabled paid API endpoints and MPP payment flows. The platform:

1. **Tokenizes mineral asset lots** as SEP-41 tokens on Stellar, creating an immutable, auditable record of every lot from extraction through processing, shipping, and assembly.

2. **Maps the full supply chain** as a directed provenance graph stored on-chain via Soroban smart contracts, where each node represents a transformation step (mining, refining, smelting, cell manufacturing, pack assembly) and each edge is cryptographically signed by the responsible entity.

3. **Computes compliance metrics** in real time — domestic content percentage, allied-origin percentage, FEOC contamination flags — derived directly from on-chain provenance data. These metrics are always up-to-date because they reflect the current state of the tokenized supply chain.

4. **Exposes every operation as an x402-paid endpoint**: any agent with a Stellar wallet can invoke compliance checks, request provenance reports, or subscribe to monitoring feeds by attaching a micro-payment to a standard HTTP request. No API keys, no subscriptions — pay per call.

5. **Supports MPP machine-to-machine flows** for recurring supply chain payments: raw material purchases, assay fees, shipping payments, and compliance audit fees can all be automated between agents representing different supply chain participants.

## How It Works

### Architecture

```
AI Agents (Claude, GPT, custom) ──x402/MPP──> API Gateway ──> Soroban Smart Contracts ──> Stellar Mainnet
                                      │                   │
                                      ▼                   ▼
                               x402 Pay-per-call    SEP-41 Token Mgmt
                               MPP Recurring       Provenance Graph
                               Stripe On-ramp      Compliance Engine
```

### Stellar Integration

The platform runs on **Stellar Mainnet** with the following technical components:

- **Horizon API**: Used for ledger queries, transaction history, account details, and network fee stats. Provides the real-time data layer for the dashboard.
- **Soroban RPC**: Powers all smart contract interactions — invoking read-only contract functions, building and submitting signed transactions, and streaming contract events.
- **SEP-41 Token Interface**: Standard token operations for minting, transferring, and burning mineral asset lots. Each lot is a unique token representing a specific quantity and origin of a critical mineral.

### Core Modules

| Module | Description |
|--------|-------------|
| **Dashboard** | Real-time Stellar network status, supply chain overview, compliance metrics, and recent on-chain events. Provides a high-level operational picture for human operators and summary data for agents. |
| **Assets** | Full SEP-41 token lifecycle management — mint new mineral lots upon extraction, transfer lots between entities along the supply chain, burn retired lots upon consumption in manufacturing. |
| **Entities** | Registry of all supply chain participants: miners, refiners, shippers, manufacturers, auditors. Each entity has a verified Stellar address, role designation, and compliance history. |
| **Supply Chain** | Visual provenance graph showing the complete journey of mineral lots from mine to battery pack. Every node and edge is backed by on-chain Soroban contract state. |
| **Compliance** | Real-time policy attestation engine computing domestic content %, allied origin %, and FEOC contamination checks. Results are stored on-chain for auditability. |
| **Events** | Chronological log of all Soroban contract events — token mints, transfers, compliance certifications, entity registrations. Enables agents to monitor supply chain activity programmatically. |

### Agent Integration (x402 + MPP)

This is where Mineral Gateway directly addresses the **Stellar Hacks: Agents** hackathon theme:

**x402 Pay-Per-Call API Endpoints**:

Any AI agent with a Stellar wallet can make standard HTTP requests to Mineral Gateway endpoints. The x402 protocol intercepts these requests, negotiates a micro-payment in USDC or XLM, and only processes the request once payment is confirmed on-chain. This enables:

- **Compliance Check Agent**: A procurement agent for a defense contractor queries "What is the domestic content percentage of lithium lot #LC-2026-0442?" and pays 0.001 XLM for the response, which is computed from on-chain data and returned as a signed attestation.
- **Provenance Verification Agent**: An auditor agent requests the full provenance chain for a cobalt shipment, paying per-request rather than maintaining a subscription.
- **Monitoring Agent**: A regulatory agent subscribes to real-time FEOC contamination alerts by making periodic paid calls to the events endpoint, receiving immediate notification when any flagged entity appears in the supply chain.

**MPP Machine-to-Machine Payment Flows**:

For recurring operations, Mineral Gateway supports MPP-style payment flows between supply chain participants:

- **Automated raw material payments**: A manufacturer agent automatically pays a miner agent upon verified delivery of a mineral lot, with payment triggered by a Soroban smart contract condition (delivery confirmation on-chain).
- **Assay fee payments**: When a new mineral lot is registered, the platform agent automatically dispatches payment to an accredited assay lab for independent testing, with results posted back on-chain.
- **Compliance audit payments**: Regulatory agents can set up automated payment streams to continuously audit the supply chain, with payment amounts proportional to the number of lots being monitored.

### Smart Contract Design (Soroban)

The platform uses Soroban smart contracts compiled from Rust to WASM:

- **MineralToken Contract**: Implements SEP-41 interface with extensions for mineral-specific metadata (mine of origin, extraction date, mineral type, grade, assay results).
- **SupplyChain Contract**: Maintains the provenance graph as a mapping of lot IDs to transformation steps. Each step records the input lots, output lots, processing entity, timestamp, and compliance status.
- **Compliance Contract**: Computes compliance metrics by traversing the provenance graph and evaluating each entity's origin against policy rules (domestic, allied, FEOC-flagged). Results are stored as on-chain attestations.
- **EntityRegistry Contract**: Manages the list of verified supply chain participants with their Stellar addresses, roles, verification status, and trust scores.

### Frontend

The user-facing dashboard is built with React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui components, providing:

- Real-time Stellar network status indicators
- Interactive supply chain provenance visualization
- Asset token management with mint/transfer/burn operations
- Entity registry with role-based views
- Compliance dashboards with policy-specific breakdowns
- Event log with filterable on-chain contract events

The frontend uses React Query (@tanstack/react-query) for data fetching, React Router for navigation, and Recharts for data visualization. All components follow the shadcn/ui design system for consistency and accessibility.

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Blockchain | Stellar Mainnet |
| Smart Contracts | Soroban (Rust → WASM) |
| Token Standard | SEP-41 |
| SDK | @stellar/stellar-sdk v14.6.1 |
| Frontend | React 18 + TypeScript + Vite 5 |
| UI Framework | Tailwind CSS 3 + shadcn/ui |
| Data Fetching | @tanstack/react-query v5 |
| Routing | react-router-dom v6 |
| Charts | Recharts v2 |
| Forms | react-hook-form + zod |
| Build Tool | Vite + SWC |
| Testing | Vitest + Playwright + Testing Library |
| Agent Payments | x402 Protocol / MPP |

## Stellar Mainnet Interaction

Mineral Gateway interacts with the Stellar mainnet through multiple channels, satisfying the hackathon's core requirement:

1. **Horizon Server** (`horizon.stellar.org`): Queries for account details, transaction history, and network fee statistics. Used by the dashboard to display real-time network status and account balances.

2. **Soroban RPC** (`soroban-rpc.mainnet.stellar.gateway.fm`): Invokes smart contract functions for token operations, supply chain management, and compliance computation. Supports both simulated (read-only) and signed (state-changing) transactions.

3. **Contract Event Streaming**: Polls Soroban contract events to power the real-time Events module, enabling both human operators and autonomous agents to monitor supply chain activity.

4. **Transaction Submission**: Builds, signs, and submits Soroban transactions for minting tokens, recording supply chain steps, and storing compliance attestations — all confirmed on the Stellar mainnet ledger.

The `src/lib/stellar.ts` service layer provides a clean abstraction over these interactions, exporting functions like `getLatestLedger()`, `getAccount()`, `invokeContractRead()`, `buildContractTransaction()`, `submitTransaction()`, `getContractEvents()`, `getAccountTransactions()`, and `getFeeStats()`.

## Demo Walkthrough

A typical user flow demonstrates the platform's end-to-end capability:

1. **Entity Registration**: A mining company registers on the platform by connecting their Stellar wallet. The EntityRegistry contract creates a verified entry with their public key and role (Miner).

2. **Mineral Lot Minting**: Upon extracting 50 tonnes of lithium from a domestic mine, the miner uses the Assets module to mint a new SEP-41 token representing this lot. The token metadata includes origin coordinates, extraction date, mineral grade, and assay certificate hash.

3. **Supply Chain Tracking**: The lithium lot is transferred through the supply chain — from miner to refiner to cell manufacturer to battery pack assembler. Each transfer is recorded as a new node in the on-chain provenance graph.

4. **Compliance Computation**: At any point, the Compliance module computes real-time metrics: "This battery pack contains 72% domestic minerals, 28% allied-origin minerals, 0% FEOC-contaminated minerals." The result is stored as a signed on-chain attestation.

5. **Agent-Paid Query**: An AI agent representing a defense procurement office makes an x402-paid HTTP request to verify the compliance status. The agent's Stellar wallet is charged 0.001 XLM, the compliance engine computes the latest metrics from on-chain data, and a signed attestation is returned.

## Differentiation

- **First supply chain platform with native x402/MPP agent payments**: Unlike existing traceability solutions (IBM Food Trust, Circulor, Minespider), Mineral Gateway doesn't just track — it enables autonomous agents to interact with the supply chain through paid API calls, creating a machine-native economic layer.

- **Real-time on-chain compliance**: Compliance metrics are not computed off-chain and uploaded as PDFs. They are derived from live on-chain state via Soroban contracts, ensuring they always reflect the current supply chain reality.

- **Stellar-native design**: Built from day one on Stellar mainnet with Soroban smart contracts, not retrofitted from Ethereum or Hyperledger. Leverages Stellar's low fees, fast settlement, and strong stablecoin infrastructure for micro-payment viability.

- **Defense-grade policy engine**: Specifically designed for US defense and industrial policy compliance (FEOC, domestic content, allied origin), addressing a real and urgent regulatory need in the critical minerals space.

## Future Roadmap

- **Stripe On-Ramp Integration**: Add Stripe-powered fiat-to-XLM on-ramp so non-crypto-native supply chain participants can pay for agent calls with credit cards, while the agent interactions still settle on Stellar.

- **Cross-Chain Bridges**: Extend traceability to other blockchains (Ethereum, Polygon) for supply chains that span multiple platforms, using Stellar as the settlement layer.

- **Advanced Agent Workflows**: Enable multi-step agent orchestration — for example, an agent that monitors for FEOC contamination, automatically triggers a re-audit, and if confirmed, flags the lot and alerts all downstream purchasers, all through paid MPP flows.

- **Oracle Integration**: Connect to IoT sensors at mines and refineries for real-time production data ingestion, creating a verifiable link between physical and digital supply chains.

- **Governance DAO**: Implement on-chain governance for updating compliance rules, adding new policy frameworks, and managing the entity verification process.

## Links

- **GitHub Repository**: [https://github.com/zan-maker/stellar-Metal-and-mineral-traceability-and-tokenization-platform](https://github.com/zan-maker/stellar-Metal-and-mineral-traceability-and-tokenization-platform)
- **Tech Stack**: React, TypeScript, Vite, Tailwind CSS, shadcn/ui, @stellar/stellar-sdk, Soroban, SEP-41

## Built For

**Stellar Hacks: Agents** — DoraHacks Hackathon by Stellar Development Foundation
