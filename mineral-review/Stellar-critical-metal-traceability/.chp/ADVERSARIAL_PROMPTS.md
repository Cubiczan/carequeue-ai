# CHP Adversarial Challenge Templates

> **Domain**: Blockchain/DeFi — Stellar Critical Metal Traceability
> **Threshold**: 85
> **Purpose**: Standardized devil's advocate challenges for ADVISORY_LOCK phase.

---

## Usage

During the ADVISORY_LOCK phase, at least **one** of these domain-specific templates
must be executed against any proposed change to CHP-governed paths. The challenger
must document their findings in `.chp/CHP_COMPLIANCE.md`.

---

## Template 1: On-Chain Immutability Risk

> **Challenge**: "This change modifies logic that interacts with on-chain immutable
> state on the Stellar network. Argue that the proposed approach could corrupt or
> irreversibly alter the provenance record for at least one mineral asset lot, and
> explain how a bad actor could exploit this to falsify domestic-content attestations
> for IRA compliance."

### Focus Areas
- SEP-41 token metadata integrity
- Soroban contract state mutations
- Provenance graph append-only guarantees
- Compliance attestation rollback scenarios

### Evaluation Criteria
- Does the response identify at least one concrete immutability risk?
- Is the exploitation scenario technically plausible on Stellar/Soroban?
- Does the response propose a specific mitigation or guard?

---

## Template 2: FEOC False-Negative Exploitation

> **Challenge**: "The proposed change touches entity screening or compliance logic.
> Construct a scenario where a Foreign Entity of Concern (FEOC) bypasses the updated
> screening process by exploiting a supply chain entity with partial domestic
> processing — a 'laundered origin' attack. Show how this would pass the current
> DPA compliance check but violate the intent of EO 14017."

### Focus Areas
- Entity registry trust boundaries
- Multi-hop provenance gaps (transshipment through intermediaries)
- Partial processing false positives (e.g., 49% domestic → 51% domestic rounding)
- Stellar address verification limits

### Evaluation Criteria
- Is the bypass scenario technically feasible?
- Does it account for multi-party supply chain complexity?
- Are the compliance gaps specific to the proposed change?

---

## Template 3: Token Economics Attack Vector

> **Challenge**: "This change affects SEP-41 token mint, transfer, or burn flows.
> Describe an economic attack where an adversary creates, transfers, or burns
> mineral asset tokens in a way that artificially inflates domestic-content
> percentages across the supply chain, enabling IRA tax credit fraud. What is the
> minimum capital required, and what on-chain signals would reveal this attack?"

### Focus Areas
- Token mint/burn ratio manipulation
- Cross-lot transfer timing attacks
- Oracle/manipulation of provenance percentages
- Stellar transaction fee economics as a friction factor

### Evaluation Criteria
- Is the attack economically rational for the adversary?
- Are Stellar-specific constraints (fees, finality, lumen reserves) considered?
- Does the response identify detectable on-chain patterns?

---

## Template 4: Smart Contract Upgrade Conflict

> **Challenge**: "The Soroban smart contracts governing this platform may need to
> be upgraded. Analyze how the proposed change interacts with a hypothetical
> contract upgrade that changes the SEP-41 interface or adds new attestation
> fields. Could the current frontend/state machine logic silently accept invalid
> data from the new contract version? Construct a specific failure mode."

### Focus Areas
- SEP-41 interface versioning assumptions
- Soroban contract migration patterns
- Frontend-backend contract alignment
- Event schema backward compatibility

### Evaluation Criteria
- Is the upgrade conflict scenario realistic for Soroban's deployment model?
- Does it identify a specific data integrity failure mode?
- Is a migration strategy or versioning guard proposed?

---

## Template 5: Regulatory Shift Preparedness

> **Challenge**: "US critical mineral policy is evolving rapidly. Assume the IRA
> domestic-content threshold increases from 40% to 60%, or DPA adds a new 'allied
> nation exclusion' for a specific country. Show how the proposed code change would
> fail or produce incorrect compliance results under this new regulatory regime,
> and estimate the effort to remediate."

### Focus Areas
- Hardcoded vs. configurable compliance thresholds
- Policy rule engine extensibility
- On-chain vs. off-chain attestation flexibility
- Soroban contract parameter upgradability

### Evaluation Criteria
- Is the regulatory scenario plausible (based on proposed legislation/trends)?
- Does it expose brittle assumptions in the current architecture?
- Is the remediation estimate grounded in actual code change scope?

---

## Template Rotation Policy

Templates should be rotated across successive ADVISORY_LOCK cycles to prevent
challenge habituation. Track template usage in the compliance audit trail.

| Cycle | Template Used | Challenger | Outcome |
|-------|--------------|------------|---------|
| — | — | — | — |

---

*These templates are calibrated for the blockchain_defi domain at threshold 85.
Custom templates may be added but must be reviewed and approved before use.*
