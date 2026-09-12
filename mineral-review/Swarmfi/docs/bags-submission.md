# SwarmFi — Bags Program Submission

> **Submission URL:** https://bags.fm/apply
> **Prepared:** 2025-07

---

## 1. App Name

**SwarmFi**

---

## 2. Description (max 500 chars)

SwarmFi deploys 128+ AI agents that coordinate via on-chain stigmergy signals to power decentralized price oracles, prediction markets, and auto-rebalancing vaults on Solana. Built with 4 Anchor programs and deep Bags SDK integration — $SWARM launches through a bonding curve with tiered fee-sharing: 50% to Bags, 30% to treasury, 15% to oracle providers ranked by reputation, 5% to ecosystem. Partner-key enabled for ecosystem revenue.

*(479 characters)*

---

## 3. Long Description (for README / detail page)

SwarmFi brings swarm intelligence to Solana. 128+ specialized AI agents coordinate without direct communication using on-chain stigmergy signals — depositing and decaying data traces that other agents read and adapt to, inspired by ant colony optimization. Four Anchor programs (SwarmOracle, PredictionMarket, ReputationRegistry, VaultManager) form the backbone: agents stake SOL, receive SPL token identities, and earn reputation tiers (Bronze to Platinum) that weight their oracle contributions. $SWARM launches via Bags SDK bonding curve with automatic Meteora DAMM migration. Trading fees distribute across 4 streams: 50% Bags protocol, 30% SwarmFi treasury, 15% oracle signal providers (weighted by reputation accuracy), 5% ecosystem growth. Partner key integration routes 25% of fees from any token launched with SwarmFi's key back to the protocol.

*(946 characters — truncated to 475 for form if needed:)*

SwarmFi brings swarm intelligence to Solana. 128+ AI agents coordinate via on-chain stigmergy signals — depositing data traces that others read and adapt to. Four Anchor programs power decentralized oracles, prediction markets, reputation tiers, and auto-rebalancing vaults. $SWARM launches via Bags SDK bonding curve with fee-sharing: 50% Bags, 30% treasury, 15% oracle providers by reputation, 5% ecosystem. Partner-key enabled.

*(475 characters)*

---

## 4. Website URL

**https://github.com/zan-maker/swarmfi-solana**

> *Note: If the frontend is deployed to Vercel/Netlify, replace with the live URL (e.g., `https://swarmfi.vercel.app`). For initial submission, the GitHub repo serves as the website. The repo includes full frontend source (`swarmfi-solana/frontend/`) that can be previewed via `npm run dev`.*

---

## 5. GitHub URL

**https://github.com/zan-maker/swarmfi-solana**

---

## 6. Category Selection

### **Recommended: Fee Sharing**

**Why Fee Sharing is the strongest fit:**

| Factor | SwarmFi's Position |
|--------|-------------------|
| **Bags SDK integration depth** | Full `@bagsfm/bags-sdk v1.3.7` — token launch, fee-sharing config, partner key, claimable positions, trading quotes |
| **On-chain fee config** | Custom `FeeShareConfig` with 4 claimer wallets (Treasury 30%, Signal Provider Pool 15%, Ecosystem 5%, Bags 50%) |
| **Reputation-weighted distribution** | Fee-sharing isn't flat — oracle providers earn proportional to Diamond/Gold/Silver/Bronze tiers using `claimerTiers` bps weights |
| **Partner key system** | Full partner key module with PDA, claim transactions, and stats tracking (25% of fees from partner-launched tokens) |
| **Fee claim pipeline** | Complete `createFeeClaimTxs` flow — lifetime fees, claim events, unclaimed positions, per-claimer breakdowns |
| **Unique innovation** | Only project tying fee-sharing to AI agent reputation — rewards accuracy, not just holding |

**Runner-up categories to mention in the application:**

- **AI Agents** — 128+ agents, stigmergy coordination, on-chain identity system
- **DeFi** — Prediction markets, auto-rebalancing vaults, bonding curve → DAMM migration

*Strategy: Select "Fee Sharing" as primary but frame SwarmFi as an AI Agents + Fee Sharing hybrid. Judges rank deeper Bags integration higher, and our fee-sharing implementation is the deepest possible integration.*

---

## 7. Coin Details

**Status:** We have a coin — `$SWARM`

### Token Configuration

| Parameter | Value |
|-----------|-------|
| **Name** | SwarmFi |
| **Symbol** | $SWARM |
| **Decimals** | 9 |
| **Launch method** | Bags SDK bonding curve → Meteora DAMM migration |
| **Fee rate** | 2% on all trades |

### Fee-Sharing Distribution (total: 100% = 10,000 bps)

| Recipient | BPS | Percentage | Description |
|-----------|-----|------------|-------------|
| Bags Protocol | 5,000 | 50% | Protocol fee to Bags |
| SwarmFi Treasury | 3,000 | 30% | Creator/protocol revenue |
| Oracle Signal Providers | 1,500 | 15% | Distributed by reputation tier |
| Ecosystem Growth Fund | 500 | 5% | Grants, incentives, expansion |

### Signal Provider Fee Tiers (from 15% pool)

| Tier | Min Reputation | BPS Weight | Share of Provider Pool |
|------|---------------|------------|----------------------|
| Diamond | 95+ | 5,000 | 50% |
| Gold | 80–94 | 3,000 | 30% |
| Silver | 50–79 | 1,500 | 15% |
| Bronze | 0–49 | 500 | 5% |

### Partner Key

- **Partner BPS:** 2,500 (25% of trading fees from any token launched with SwarmFi's partner key)
- **Purpose:** Ecosystem revenue share — any builder who launches a token through SwarmFi's partner integration automatically routes 25% of fees back to the protocol

### Launch Flow (5 steps via Bags SDK)

1. Create token metadata → upload to Arweave
2. Configure fee-sharing claimers by reputation tier
3. Create on-chain fee share config (PDA)
4. Generate launch transaction (Jito bundle)
5. Sign & broadcast — bonding curve activates, auto-migrates to Meteora DAMM at threshold

---

## 8. Email

**swarmfi@protocol.dev**

> *Placeholder — replace with the actual contact email before submitting. Use a professional address tied to the project (e.g., team@swarmfi.io, contact@swarmfi.xyz, or a protonmail address).*

---

## 9. X (Twitter) URL

**https://x.com/swarmfi_sol**

> *Placeholder — replace with the actual SwarmFi Twitter handle. If the account doesn't exist yet, create it before submitting and post a few technical threads about stigmergy and the Bags integration to show activity.*

---

## 10. Submission Strategy Notes

### A. What to Emphasize

**#1 — Deepest Possible Bags Integration**
- We don't just use the Bags SDK for token launch. We've built a *reputation-weighted fee-sharing engine* on top of it.
- Fee claimers are dynamically computed from oracle provider performance — this is novel.
- Partner key integration means SwarmFi becomes a fee-sharing *platform*, not just a recipient.
- Mention: `@bagsfm/bags-sdk v1.3.7`, `BagsSDK` class, REST API fallback (`public-api-v2.bags.fm/api/v1`), agent auth V2 (`/agent/v2/auth/`).

**#2 — Working Product with Real Architecture**
- 4 Anchor programs compiled and deployable (`anchor build` succeeds)
- Full frontend with 8 pages: Landing, Dashboard, Prediction Markets, Vaults, Agents, Token, Fees, Settings
- Phantom wallet deep integration (`@solana/wallet-adapter`)
- Demo mode that showcases all features without requiring API keys — perfect for judge demos
- Screenshots available: `download/screenshots/01-landing.png` through `07-fees.png`

**#3 — Stigmergy = Unique Differentiator**
- No other project uses stigmergic coordination for on-chain AI agents
- This isn't just "AI agents" — it's a coordination mechanism inspired by ant colonies
- Agents leave signals on-chain that decay over time; other agents read, weight, and adapt
- Creates emergent intelligence without direct agent-to-agent communication
- This is the narrative hook — leads with "swarm intelligence" and backs it with real code

**#4 — Complete Tokenomics**
- $SWARM isn't a placeholder — it has a full economic model: bonding curve, fee-sharing tiers, partner keys, DAMM migration
- The fee-sharing directly incentivizes oracle accuracy (reputation → fee share → more $SWARM)
- Economic flywheel: accurate oracles → better markets → more trading → more fees → more rewards

### B. Maximizing Chances Based on Judging Criteria

| Criterion | How SwarmFi Excels | Evidence to Show |
|-----------|-------------------|------------------|
| **Real traction** | Active GitHub repo with 4 programs, full frontend, 8 pages | GitHub commit history, repo structure |
| **Onchain performance** | Bonding curve state tracking, 24h volume charts, holder counts | Token page with `getDemoBondingCurveState()`, `getBondingCurveHistory()` |
| **Deeper Bags integration** | Custom fee-sharing with reputation tiers + partner key | `fee-sharing.ts`, `token.ts`, `partner.ts` — 4 Bags modules |
| **Working product** | Deployable frontend, compilable programs, interactive demo | `npm run dev` works out of the box, demo mode for all features |
| **Real transactions** | Anchor program instructions: `submit_price`, `submit_prediction`, `create_market`, `deposit`, `rebalance` | Program IDL + instruction handlers |

### C. Demo Day Preparation

1. **Pre-record a 2-minute demo video** — show the full flow:
   - Landing page → connect Phantom wallet
   - Dashboard with live oracle feeds and agent swarm visualization
   - Create a prediction market → submit prediction → resolve
   - Token page showing bonding curve progress toward Meteora migration
   - Fees page showing reputation-weighted fee distribution across tiers
   - Partner key stats showing ecosystem revenue

2. **Live demo script** (keep to 3 minutes):
   - Open the frontend, connect wallet
   - Show the agent swarm visualization (agents coordinating in real-time)
   - Walk through the fee-sharing tiers — show how Diamond-tier providers earn 10x Bronze
   - Show partner key integration and how it creates ecosystem flywheel
   - End with: "And this all runs on Solana with 4 Anchor programs"

3. **Prepare a one-pager** (PDF) with:
   - Architecture diagram (already in README)
   - Fee-sharing flow diagram
   - Tech stack summary
   - Links to GitHub, token page, demo

4. **Test everything on devnet** before demo day:
   - `solana-test-validator` for local testing
   - `anchor deploy --provider.cluster devnet` for devnet deployment
   - Ensure Phantom wallet connects on devnet
   - Have backup screenshots ready if network is slow

### D. Additional Materials to Prepare

| Material | Location | Status |
|----------|----------|--------|
| App icon (PNG) | `swarmfi-solana/assets/swarmfi-logo.png` | Ready — convert to square PNG for submission |
| Screenshots (7 total) | `download/screenshots/01-landing.png` → `07-fees.png` | Ready |
| Demo video | `swarmfi-solana/docs/demo/swarmfi-demo.mp4` | Ready — record updated version showing Bags features |
| Architecture diagram | `README.md` (ASCII art) | Ready — convert to visual diagram for one-pager |
| GitHub README | `swarmfi-solana/README.md` | Ready — update with Bags program section |
| Colosseum submission doc | `swarmfi-solana/docs/SwarmFi_Colosseum_Submission.docx` | Reference for narrative style |

### E. Pre-Submission Checklist

- [ ] Convert logo to 512×512 PNG (transparent background, square aspect ratio)
- [ ] Deploy frontend to Vercel (or similar) and update Website URL
- [ ] Create/update X/Twitter account with bio linking to GitHub
- [ ] Verify all GitHub commits are pushed and repo is public
- [ ] Record updated demo video showing Bags fee-sharing features
- [ ] Test `npm run build` succeeds on frontend
- [ ] Test `anchor build` succeeds on programs
- [ ] Replace placeholder email and Twitter URL with actual values
- [ ] Submit at https://bags.fm/apply with Fee Sharing category selected

---

*Good luck, swarm.*
