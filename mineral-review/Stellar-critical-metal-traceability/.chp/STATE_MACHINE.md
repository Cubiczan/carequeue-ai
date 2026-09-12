# CHP State Machine

> **Repository**: Stellar-critical-metal-traceability (Mineral Gateway)
> **Domain**: Blockchain/DeFi
> **Foundation Threshold**: 85
> **CHP Version**: cognitive-mesh-orchestrator 0.1.0

---

## States

### 1. EXPLORING

The default initial state. Agents are gathering context, reading codebase, formulating
approaches, and performing R0 feasibility checks. No mutations to CHP-governed paths
are permitted.

**Allowed Actions**:
- Read-only exploration of codebase and documentation
- R0 gate evaluation (Solvable, Scoped, Valid, Worth_it)
- Drafting proposals in `.chp/local/` (untracked)
- Foundation disclosure analysis

**Exit Conditions**:
- All R0 checks pass → transition to `ADVISORY_LOCK`

---

### 2. ADVISORY_LOCK

Adversarial review gate. A mandatory devil's advocate phase where at least one
independent challenge from `.chp/ADVERSARIAL_PROMPTS.md` must be executed against
the proposed approach. No code changes to CHP-governed paths.

**Allowed Actions**:
- Run adversarial challenge templates
- Revise proposals based on challenge results
- Request third-party review
- Continue foundation disclosure refinement

**Exit Conditions**:
- Challenges addressed and documented → transition to `PROVISIONAL_LOCK`
- Critical challenge unresolvable → revert to `EXPLORING`

---

### 3. PROVISIONAL_LOCK

Approach is tentatively approved. Code changes may begin on non-critical paths,
but final merge or deployment to CHP-governed paths is blocked until third-party
CONFIRM is received.

**Allowed Actions**:
- Implement changes on provisional branches
- Run test suites and validation
- Request independent third-party CONFIRM/REJECT
- Update `CHP_COMPLIANCE.md` with progress

**Exit Conditions**:
- Third-party CONFIRM received → transition to `LOCKED`
- Third-party REJECT or critical finding → revert to `ADVISORY_LOCK`

---

### 4. LOCKED

Decision is final and immutable within this protocol cycle. Changes to CHP-governed
paths are sealed. A new cycle must be initiated for further modifications.

**Allowed Actions**:
- Merge approved changes
- Deploy sealed artifacts
- Archive compliance record

**Exit Conditions**:
- New protocol cycle initiated → transition to `EXPLORING` (new cycle)

---

## State Transition Diagram

```
                    ┌─────────────┐
                    │  EXPLORING  │◄──────────────────────┐
                    └──────┬──────┘                       │
                           │ R0 passes                    │
                           ▼                              │
                    ┌──────────────┐                      │
                    │ ADVISORY_LOCK │───(unresolvable)────┘
                    └──────┬───────┘
                           │ challenges addressed
                           ▼
                 ┌────────────────────┐
                 │  PROVISIONAL_LOCK  │───(REJECT)──► ADVISORY_LOCK
                 └────────┬───────────┘
                          │ CONFIRM
                          ▼
                    ┌──────────┐
                    │  LOCKED  │───(new cycle)──► EXPLORING
                    └──────────┘
```

---

## Domain Configuration

```yaml
domain: blockchain_defi
repository: Stellar-critical-metal-traceability
description: Stellar/Soroban critical metal traceability and tokenization platform
threshold: 85
governed_paths:
  - "src/lib/stellar.ts"
  - "src/components/CompliancePanel.tsx"
  - "src/components/SupplyChainFlow.tsx"
  - "src/components/EntityRegistry.tsx"
  - "src/pages/Compliance.tsx"
  - "src/pages/Assets.tsx"
  - "src/pages/SupplyChain.tsx"
risk_classifications:
  - smart_contract_interaction
  - token_mint_burn
  - compliance_attestation
  - supply_chain_provenance
  - feoc_screening
```

## Policy-Specific Constraints

Given this repository's domain (critical minerals traceability on Stellar with
regulatory compliance), the following additional constraints apply:

1. **No assumption of trustless operation** — Soroban contract calls must always
   validate return values; never assume on-chain data is correct without verification.
2. **Compliance attestation immutability** — Once a compliance attestation is
   recorded on-chain, the state machine must treat it as LOCKED regardless of
   the current protocol cycle.
3. **Supply chain provenance integrity** — Any changes to provenance graph logic
   must pass through a full ADVISORY_LOCK cycle with domain-specific challenges.
4. **FEOC screening overrides** — Foreign Entity of Concern detection logic changes
   require an additional adversarial review focused on false-negative risk.

---

*This state machine is auto-managed by CHP. Manual state changes are not permitted.*
