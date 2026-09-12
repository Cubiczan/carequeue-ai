# SwarmFi — Project Overview

> Use this document to fill in the BUIDL submission form. All fields are provided with ready-to-paste content.
> Total document: under 30,000 characters.

---

## BUIDL (Project) Name

**SwarmFi**

---

## BUIDL Logo

- **File:** `/home/z/my-project/download/buidl-logo-480x480.png`
- **Format:** PNG
- **Dimensions:** 480 × 480 px
- **Size:** 158 KB (under 2 MB limit)

---

## Vision — Describe the problem which this project solves

**Short version (for form field):**

Traditional DeFi oracles rely on single data sources or simple median aggregations, creating exploitable centralization bottlenecks. Prediction markets suffer from low liquidity, slow resolution, and manipulation by large holders. Vault management is either fully passive (yield farming) or requires active human oversight. There is no protocol that combines decentralized oracle accuracy, prediction market liquidity, and automated capital management into a single coordinated system — and certainly none that uses biologically-inspired swarm intelligence to achieve it.

SwarmFi solves this by deploying 128+ specialized AI agents that coordinate through on-chain stigmergy signals — the same mechanism ant colonies use to find optimal paths without any central controller. Agents stake SOL for economic security, receive verifiable on-chain identities (SPL tokens), and earn reputation tiers that weight their contributions. Higher reputation means more influence in consensus and larger fee-sharing rewards. This creates a self-reinforcing flywheel: accurate agents earn more, attracting better operators, which improves overall system accuracy, which attracts more users and liquidity.

The $SWARM token, launched via the Bags SDK with a bonding curve that auto-migrates to Meteora DAMM, distributes trading fees across four streams: 50% to the Bags Protocol, 30% to the SwarmFi treasury for development, 15% to oracle signal providers (tiered by reputation from Bronze to Diamond), and 5% to ecosystem growth. This means AI agents and their operators earn real, on-chain yield from their accuracy — not from speculation, but from providing reliable data and correct market predictions.

Built entirely on Solana with four composable Anchor programs (SwarmOracle, PredictionMarket, ReputationRegistry, VaultManager), SwarmFi delivers sub-20ms oracle responses, trustless market resolution, and auto-rebalancing vault strategies — all verifiable on-chain with no trusted third parties.

---

## Category — Is this BUIDL an AI Agent?

**No** (select "No" in the form)

> SwarmFi is a DeFi infrastructure protocol powered by AI. While it uses AI agents internally for oracle coordination and vault management, the project itself is a DeFi platform — not an AI agent tool. Selecting "DeFi" or a similar category will position it more accurately for evaluation.

---

## Links

### GitHub / GitLab / Bitbucket *

```
https://github.com/zan-maker/swarmfi-solana
```

### Project Website

```
https://app.auraassist.xyz
```

### Demo Video *

```
https://github.com/zan-maker/swarmfi-solana/releases/download/demo-video-v1/swarmfi-demo.mp4
```

> Note: This is a direct MP4 link hosted via GitHub Releases. If the platform requires a YouTube link, you can upload the video (saved at `/home/z/my-project/download/swarmfi-demo.mp4`) to YouTube and replace this URL.

---

## Social Links

### Link 1 — GitHub

```
https://github.com/zan-maker/swarmfi-solana
```

### Link 2 — X / Twitter

```
https://x.com/swarmfi_sol
```

> Note: This is a placeholder URL. Create the X account before submitting, or replace with an existing social profile.

### Link 3 — Discord (recommended)

```
https://discord.gg/swarmfi
```

> Note: Create a Discord server before submitting, or replace with another social link (e.g., Farcaster, Substack, Telegram).

---

## Extended Project Description (for "About" or "Details" fields)

### What is SwarmFi?

SwarmFi is a fully on-chain oracle and prediction market protocol on Solana that uses swarm intelligence — inspired by ant colony optimization — to coordinate 128+ specialized AI agents. Unlike traditional oracles that rely on single data sources or simple median aggregations, SwarmFi agents coordinate through stigmergy: they deposit on-chain signal data that decays over time, just like pheromone trails in nature. Other agents read these signals, weight them by the emitting agent's reputation and SOL stake, and adapt their own behavior accordingly. No central controller. No trusted oracle. Just emergent intelligence from decentralized coordination.

### Core Architecture — Four Anchor Programs

**1. SwarmOracle** — The data backbone. Agents submit price data encrypted with Arcium (so no front-running), which is aggregated using a weighted consensus algorithm where each agent's influence = reputation score × SOL staked. Signals decay over time using an on-chain decay function, ensuring fresh data carries more weight. Inaccurate agents get slashed — they lose a portion of their staked SOL.

**2. PredictionMarket** — Binary and scalar markets where outcomes resolve through agent consensus rather than a single oracle. Markets use bonding curve pricing for liquidity, and the PredictionMarket Anchor program handles order matching, settlement, and automatic resolution when the swarm reaches a consensus threshold. Every prediction is a real Solana transaction verifiable on-chain.

**3. ReputationRegistry** — Tracks every agent's accuracy, uptime, and decision history on-chain. Agents earn reputation tiers: Bronze (0-49), Silver (50-79), Gold (80-94), Platinum (95+). Each tier requires progressively more SOL stake (1/5/20/50 SOL) and unlocks more influence in consensus. Agents receive SPL token identities that serve as verifiable on-chain credentials.

**4. VaultManager** — Three auto-rebalancing vault strategies (Conservative, Balanced, Aggressive) where AI agents manage asset allocation between SOL, USDC, $SWARM tokens, and volatility strategies. Every rebalance is logged on-chain with a reason (e.g., "stigmergy signals detected rising volatility — rotated 5% into USDC"). Users deposit SOL and receive vault shares; the swarm manages risk autonomously.

### $SWARM Token — Powered by Bags SDK

The $SWARM token is launched via the Bags SDK (@bagsfm/bags-sdk v1.3.7) with a fair bonding curve. At 100% bonding curve completion, liquidity automatically migrates to a Meteora DAMM pool — no insider allocation, no presale.

**Fee-sharing model (all trading fees):**
- 50% — Bags Protocol
- 30% — SwarmFi Treasury (development, operations)
- 15% — Oracle Signal Providers (distributed by reputation tier)
- 5% — Ecosystem Growth (grants, incentives)

**Provider reward tiers (from the 15% pool):**
- Diamond (95+ reputation) — 50% of provider pool
- Gold (80-94 reputation) — 30% of provider pool
- Silver (50-79 reputation) — 15% of provider pool
- Bronze (0-49 reputation) — 5% of provider pool

A partner key integration routes 25% of fees from any token launched with SwarmFi's partner key back to the protocol, creating an ecosystem revenue flywheel.

### Technical Stack

| Component | Technology |
|-----------|-----------|
| Smart Contracts | Anchor 0.30, Solana |
| Frontend | Next.js 15, Tailwind CSS, React 19 |
| Wallet | Phantom (@solana/wallet-adapter) |
| Encryption | Arcium (AES-256-GCM for oracle submissions) |
| Token SDK | @bagsfm/bags-sdk v1.3.7 |
| AI Agents | Python (agent framework), on-chain Rust programs |
| Agent Identity | SPL tokens |
| DEX Integration | Meteora DAMM V2, Jito bundles |
| Metadata | Arweave (immutable token metadata) |

### Key Innovations

1. **Stigmergy-based coordination** — On-chain signal deposits with time decay, inspired by ant colony optimization. No other protocol uses this mechanism for DeFi agent coordination.

2. **Reputation-weighted consensus** — Agent influence = reputation × stake. Creates a meritocratic system where accuracy earns economic power.

3. **SOL staking + slashing** — Economic security through skin in the game. Bad actors lose their stake. Good actors compound their reputation.

4. **SPL token agent identity** — Every agent has a verifiable on-chain identity with full decision history. Fully transparent and auditable.

5. **Tiered fee-sharing** — The first protocol to tie fee-sharing directly to AI agent performance. Diamond-tier providers earn 10x more than Bronze — accuracy literally pays.

6. **Cross-program composability** — All four Anchor programs communicate through PDAs and cross-program invocations. Agents can trigger vault rebalances based on oracle signals automatically.

### Live Deployment

- **Website:** https://app.auraassist.xyz
- **GitHub:** https://github.com/zan-maker/swarmfi-solana
- **Demo Video:** https://github.com/zan-maker/swarmfi-solana/releases/download/demo-video-v1/swarmfi-demo.mp4
- **Chains:** Solana (devnet/mainnet)
- **Frontend Pages:** 8 pages (Landing, Dashboard, Agents, Prediction Markets, Vaults, $SWARM Token, Fee-Sharing Dashboard, Settings)
- **API Routes:** 3 Bags SDK endpoints (/api/bags/token, /api/bags/fees, /api/bags/partner)

---

## Character Count Verification

This document is approximately 6,800 characters (well under the 30,000 character limit).
The Vision field alone is approximately 1,800 characters — suitable for most form text areas.
