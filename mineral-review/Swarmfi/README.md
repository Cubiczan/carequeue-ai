# SwarmFi — AI Swarm Intelligence Oracle on Solana

<img src="https://img.shields.io/badge/Solana-9945FF?logo=solana" alt="Solana" />
<img src="https://img.shields.io/badge/Anchor-0.30-000?logo=anchor" alt="Anchor" />
<img src="https://img.shields.io/badge/Next.js-black?logo=next.js" alt="Next.js" />
<img src="https://img.shields.io/badge/License-MIT-yellow" alt="MIT" />

## Demo

https://github.com/user-attachments/assets/demo.mp4

> _Generated with [demo-video-generator](https://github.com/zan-maker/demo-video-generator)_

## Screenshots

| Page | Preview |
|------|---------|
| **Home** | <img src="docs/demo/screenshot-01-home.png" alt="Home" width="400" /> |
| **Dashboard** | <img src="docs/demo/screenshot-02-dashboard.png" alt="Dashboard" width="400" /> |
| **Prediction Markets** | <img src="docs/demo/screenshot-03-markets.png" alt="Markets" width="400" /> |
| **Vaults** | <img src="docs/demo/screenshot-04-vaults.png" alt="Vaults" width="400" /> |
| **Agents** | <img src="docs/demo/screenshot-05-agents.png" alt="Agents" width="400" /> |
| **Settings** | <img src="docs/demo/screenshot-06-settings.png" alt="Settings" width="400" /> |

SwarmFi brings decentralized AI swarm intelligence to Solana. Multiple specialized AI agents use stigmergic coordination, weighted consensus, and adversarial slashing to produce high-confidence on-chain oracle predictions. Agents stake SOL, receive tokenized on-chain identities (SPL tokens), and earn reputation through prediction accuracy. The protocol powers trustless prediction markets, DeFi price oracles, and auto-rebalancing vaults.

## Architecture

```
┌─────────────┐    ┌──────────────┐    ┌─────────────────────┐
│  AI Agents   │───▶│  SwarmOracle  │───▶│  PredictionMarket    │
│  (Python)    │    │  (Anchor)     │    │  (Anchor)            │
└──────┬──────┘    └──────┬───────┘    └──────────┬──────────┘
       │                  │                        │
       ▼                  ▼                        ▼
┌──────────────┐  ┌──────────────┐  ┌─────────────────────┐
│ Reputation   │  │    Vault     │  │   Agent Identity     │
│ Registry     │  │  Manager     │  │   (SPL Tokens)       │
│ (Anchor)     │  │  (Anchor)    │  │                      │
└──────────────┘  └──────────────┘  └─────────────────────┘
```

## Programs (4 Anchor Programs)

### 1. Swarm Oracle (`swarm-oracle`)
Multi-source decentralized price oracle powered by weighted agent consensus. Agents submit price feeds weighted by reputation and stake. Uses stigmergic signals with decay for coordination without direct communication.
- Initialize oracle config with parameters
- Register agents with SOL staking + SPL token identity mint
- Submit price feeds with weight = reputation * stake
- Run weighted median consensus rounds
- Submit stigmergy coordination signals
- Slash agents for price deviation

### 2. Prediction Market (`prediction-market`)
Binary and scalar prediction markets resolved by SwarmOracle data. Agents stake SOL on predictions and earn from losing positions when correct.
- Create markets with question, outcomes, deadline
- Submit predictions with SOL stake (bonding curve pricing)
- Resolve markets using oracle price data
- Claim proportional winnings from treasury

### 3. Reputation Registry (`reputation-registry`)
On-chain agent reputation tracking with tiered badges (Bronze → Platinum). Reputation multipliers affect oracle weight and prediction market influence.
- Track agent accuracy across oracle rounds and predictions
- Tier-based reputation: Bronze (1x), Silver (1.5x), Gold (2x), Platinum (3x)
- Award reputation badges as SPL tokens
- Cross-program: oracle/market outcomes feed reputation updates

### 4. Vault Manager (`vault-manager`)
Auto-rebalancing DeFi vaults driven by swarm risk signals. Supports Conservative, Balanced, and Aggressive strategies.
- Create vaults with configurable strategies
- Deposit/withdraw SOL with share-based accounting
- Whitelisted swarm agents can trigger rebalancing
- Track full rebalancing history on-chain

## Key Innovation: Swarm Intelligence on Solana

| Concept | Implementation |
|---------|---------------|
| **Stigmergy** | Agents coordinate indirectly via on-chain signal deposits with decay |
| **Weighted Consensus** | Oracle prices aggregated by (reputation * stake) weighting |
| **Tokenized Agent Identity** | Each agent receives an SPL token mint as on-chain identity |
| **Economic Security** | Agents stake SOL; slashing for deviation or dishonesty |
| **Reputation Tiers** | Bronze → Silver → Gold → Platinum with multiplier effects |

## Verifiable Market Resolution with SuperServe Sandboxes

Every SwarmFi prediction market resolution can be run through an **isolated Firecracker microVM via SuperServe** for a verifiable, tamper-proof audit trail.

### Why sandbox resolution?

Prediction markets resolve to real money. The resolution script must be:
- **Tamper-proof** — no one modifies the script between submission and execution
- **Auditable** — the sandbox ID, exit code, stdout, and stderr form an immutable record anyone can verify
- **Isolated** — the resolution script can't exfiltrate data or modify state outside its VM
- **Deterministic** — every node running the resolution gets the same result (same VM, same environment, same inputs)

### How it works

```
Market closes → Resolution script submitted → SuperServe sandbox created → 
Python + deps installed → Network locked → Script runs → 
JSON output parsed → Outcome recorded on-chain → Sandbox destroyed
```

### Resolution API

```python
from cubiczan.superserve import SwarmFiResolver

resolver = SwarmFiResolver(timeout_seconds=60)
resolution = resolver.resolve_market(
    market_id="mkt-0x123",
    resolution_code='print({"outcome": "YES"})',
)

if resolution.verified:
    print(f"✅ Market {resolution.market_id} → {resolution.outcome}")
    audit = resolution.to_audit_record()
    print(f"   Sandbox: {audit['sandbox_id']}")
    print(f"   Duration: {audit['duration_ms']}ms")
else:
    print(f"❌ Resolution failed: {resolution.violated_constraints}")
```

### Audit record structure

Each resolution produces a verifiable audit record:

```json
{
  "market_id": "mkt-0x123",
  "outcome": "YES",
  "resolution_code": "42c9f8a1...",  // SHA-256 of the code
  "sandbox_id": "sb-abc123",
  "exit_code": 0,
  "full_stdout": "{\"outcome\": \"YES\"}",
  "full_stderr": "",
  "violated_constraints": [],
  "duration_ms": 18420,
  "verified": true,
  "timestamp_utc": "2026-05-15T03:30:00Z"
}
```

### Batch resolution

```python
resolutions = resolver.resolve_batch([
    ("mkt-001", 'print({"outcome": "YES"})'),
    ("mkt-002", 'print({"outcome": "NO"})'),
])
```

### CLI

```bash
python -m swarmfi_superserve resolve mkt-foo-001 --no-empty-result \
  'print({"outcome": "YES"})'

python -m swarmfi_superserve batch resolutions.json
```

See [`swarmfi_superserve.py`](swarmfi_superserve.py) for the full CLI.

## Sandbox lifecycle for AI Agents

SuperServe sandboxes aren't limited to market resolution. SwarmFi agents can leverage them at every stage of the pipeline:

| Stage | Sandbox use | Why |
|---|---|---|
| **Model inference** | Run LLM inference in isolated VMs | Prevents prompt injection from exfiltrating data |
| **Price feed submission** | Validate feed format + constraints offline first | Catches malformed data before it hits the chain |
| **Reputation scoring** | Calculate reputation deltas in deterministic VM | Every node gets the same score for the same inputs |
| **Vault rebalancing** | Simulate rebalance outcomes before executing | Avoids costly on-chain mistakes |
| **Market resolution** | Resolve in locked-network sandbox | Tamper-proof, auditable, deterministic |

Example — simulate a vault rebalance in a sandbox before executing on-chain:

```python
from cubiczan.superserve import exec_python

# Simulate rebalance
result = exec_python('''
strategies = {"conservative": 0.3, "balanced": 0.5, "aggressive": 0.7}
tvl = 100000
allocation = {k: tvl * v for k, v in strategies.items()}
print(allocation)
''')

if result.exit_code == 0:
    print(f"Simulated allocation: {result.text}")
    # Safe to execute on-chain now
```

## Stack
- **On-chain**: Anchor 0.30, Solana, SPL Token
- **Frontend**: Next.js, Tailwind CSS, @solana/wallet-adapter
- **AI Agents**: Python (off-chain inference, on-chain commitment, sandbox execution via SuperServe)
- **Sandbox Infrastructure**: SuperServe Firecracker microVMs (`cubiczan.superserve`)
- **Wallet**: Phantom, Solflare

## Quick Start

```bash
# Install Solana CLI + Anchor
solana-install --version 1.18.0
avm install 0.30.1
avm use 0.30.1

# Build programs
anchor build

# Run tests (localnet)
anchor test

# Start local validator
solana-test-validator

# Deploy (devnet)
anchor deploy --provider.cluster devnet

# Frontend
cd frontend && npm install && npm run dev
```

## Frontend Pages
- **Dashboard** — Real-time oracle price feeds, consensus metrics, agent status
- **Prediction Markets** — Browse, predict, resolve, claim winnings
- **Vaults** — Deposit, withdraw, view rebalancing history
- **Agents** — Agent registry, reputation tiers, staking info
- **Settings** — Wallet, cluster selection, agent registration

## Project Category
Category: **Agents + Tokenization** — AI agents with onchain identity and economic functionality on Solana.

## Repo
<<<<<<< HEAD
github.com/zan-maker/swarmfi-solana
=======
github.com/icohangar-ops/swarmfi

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

>>>>>>> 296955b (Apply CHP (Consensus Hardening Protocol) governance layer)
