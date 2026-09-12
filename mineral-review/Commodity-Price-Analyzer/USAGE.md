# Usage Guide

Example queries, what each one triggers in the pipeline, and what the response looks like.

---

## How to Ask Questions

The agent understands natural language. You don't need to use specific syntax. However, certain phrases reliably trigger specific contract analyses — see the mapping in [DATA_SOURCES.md](./DATA_SOURCES.md#key-phrases-and-query-routing).

---

## Example Queries

### Black Mass Payables

```
What are our realized Ni and Co payables on black mass this month?
```
**Triggers:** AlphaVantage NICKEL + COBALT fetch → `calculate_black_mass_payables(grade_multiplier=0.85)` → narrative with USD/mt payable values, grade-adjusted breakdown, and comparison to 100% theoretical.

```
What's our Ni/Co margin vs Offtaker this month on Atoka output?
```
**Triggers:** Same calculation, with the Financial Analyst model framing the answer specifically around the Atoka counterparty context loaded from GLI Contract Parameters memory.

---

### Primary Offtaker MHP Offtake

```
Has the Primary Offtaker profit share triggered this month?
```
**Triggers:** AlphaVantage NICKEL fetch → `calculate_primary_offtaker_mhp_offtake()` → checks `profit_share_triggered` boolean → narrative explains whether Ni is above/below $20,000/mt threshold and, if triggered, the exact dollar amount flowing to MHP as profit share.

**Example response (when triggered):**
> *LME Nickel is currently at $21,400/mt, which is $1,400/mt above the $20,000/mt profit-share threshold. Under the Primary Offtaker agreement, 15% of this incremental value — $210/mt — flows back to MHP. The realized Ni payable after the 8% floor discount and profit share is $19,488/mt, compared to a theoretical maximum (at 100% spot) of $21,400/mt. Payable capture is 91.1%.*

```
What is the impact of the 8% floor discount on our MHP realized value this month?
```
**Triggers:** Same calculation — the Financial Analyst model explains `margin_vs_spot` in dollar and percentage terms.

---

### Lithium Carbonate GTC

```
Is our Li carbonate GTC floor or ceiling currently active?
```
**Triggers:** AlphaVantage Li price fetch → `calculate_lithium_carbonate_gtc(floor=20000, ceiling=30000)` → `floor_protection_active` and `ceiling_cap_active` booleans → narrative states which condition applies and the realized vs spot difference.

**Example response (floor active):**
> *Fastmarkets Li₂CO₃ 99.5% CIF is currently at $17,800/mt, which is below the GTC floor of $20,000/mt. The floor protection is active — GLI realizes $20,000/mt rather than spot, a benefit of $2,200/mt. At current volumes this represents a meaningful positive variance vs unprotected spot exposure.*

```
How much value is the Li carbonate ceiling costing us at current spot?
```
**Triggers:** Same — Financial Analyst reports `realized_vs_spot_diff` as a cost when ceiling is active.

---

### Li Cycle Feedstock

```
What's the all-in realized value per tonne of Li Cycle feedstock at today's prices?
```
**Triggers:** AlphaVantage NICKEL + COBALT + Li fetch → `calculate_li_cycle_feedstock(feedstock_grade=0.92)` → breakdown of Li, Ni, and Co contributions to total feedstock value.

```
How much of the Li Cycle feedstock value comes from Li vs the Ni/Co credits?
```
**Triggers:** Same — Financial Analyst model breaks out the three components and their percentage contributions to `total_feedstock_value`.

---

### Cross-Contract Sensitivity

```
Run sensitivity: what happens to all our contract margins if Ni drops $1,000/mt?
```
**Triggers:** Full price fetch → all four contract functions → `sensitivity_analysis` block → Financial Analyst presents the delta table:

| Contract | Ni −$1,000/mt Impact |
|---|---|
| Black Mass | −$850/mt (85% grade multiplier) |
| Primary Offtaker Floor | −$920/mt (92% = 1 − 8% discount) |
| Li Cycle Ni credit | −$27/mt (3% content × 90% payable) |
| Li Carbonate GTC | No impact (Li-indexed only) |

```
What's our total P&L sensitivity to a 10% move in Cobalt?
```
**Triggers:** AlphaVantage COBALT fetch → sensitivity re-run with Co ±10% shock → aggregate dollar impact across black mass, Primary Offtaker, and Li Cycle contracts.

---

### Regulatory Context

```
Are there any new IRA regulations that could affect our Li carbonate pricing?
```
**Triggers:** Regulations.Gov search for "IRA lithium carbonate battery" → AI Model synthesizes relevant regulatory documents → Financial Analyst frames implications for GLI's GTC structure.

```
Has there been any regulatory activity on critical minerals that affects our contracts?
```
**Triggers:** Regulations.Gov search → summary of recent filings → narrative on potential contract exposure.

---

## Response Structure

Every response from AI Model 1 follows this structure (from the Financial Analyst system prompt):

**Executive Summary** — 2–3 sentence snapshot of the most important finding. Answers the user's question directly.

**Current Market Conditions** — Commodity price snapshot with sources (AlphaVantage, date/time of fetch). Shows Ni, Co, Li in USD/mt.

**Contract Performance Analysis** — Section for each contract in scope. Includes realized vs. theoretical payable, active provisions (floor, ceiling, profit share), and margin vs. benchmark.

**Key Insights & Triggers** — Bullet points on triggered conditions: profit share active, floor protection active, ceiling cap active, significant price moves vs. last run.

**Risk Exposure & Sensitivities** — Delta table showing P&L impact of commodity price moves. Sourced directly from `sensitivity_analysis` in Python output.

**Recommendations** (optional) — Only included when the analysis surfaces a clear actionable insight (e.g., a ceiling is consistently active and worth renegotiating).

---

## What the Agent Will Not Do

- **Perform calculations in the language model** — all arithmetic runs through the Python step. If the Python step output is missing, the Financial Analyst model will flag the data gap rather than estimate.
- **Access instruments outside registered MCP tools** — Airia tool scoping prevents calls to any endpoint not registered in the MCP Gateway.
- **Make trading recommendations** — the agent provides commercial intelligence; investment or hedging decisions remain with GLI's commercial team.
- **Expose API keys** — credentials are managed in Airia's vault and never visible in model outputs or logs.
