# Contract Logic — Python Business Rules Engine

This document contains the exact Python code executed in the **Python Code** step (`id: 1f6bda0b-4cd9-4269-9ee9-9159607862c7`) of the Airia flow, with full annotation explaining each function's commercial rationale.

> **Design principle:** The language model (AI Model, Stage 1) fetches prices and passes structured JSON. The Python step performs all arithmetic. AI Model 1 (Stage 2) interprets results. Numbers never flow from a language model directly — only from deterministic code.

---

## Full Python Code

```python
import json
from datetime import datetime

# Parse input - expecting commodity price data from AI Model tool calls
try:
    if isinstance(input, str):
        data = json.loads(input)
    else:
        data = input
except Exception:
    data = {"prices": {}}

# Initialize results
results = {
    "timestamp": datetime.now().isoformat(),
    "gli_calculations": {},
    "unit_conversions": {},
    "business_insights": []
}

# Extract commodity prices from input
# Supports both short-form keys (NI, CO, LI) and long-form (nickel, cobalt, lithium)
prices = data.get("prices", {})
ni_price = prices.get("NI", prices.get("nickel", 18000))   # USD/mt
co_price = prices.get("CO", prices.get("cobalt", 35000))   # USD/mt
li_price = prices.get("LI", prices.get("lithium", 25000))  # USD/mt
```

---

## Contract Functions

### 1. Black Mass Payables

**Commercial context:** Black mass is the intermediate output from battery shredding. Payables reference the LME 3-month average for Ni and Co with an 85% grade multiplier applied to contained metal value. Active counterparties: Atoka, Li-Cycle, Redwood.

```python
def calculate_black_mass_payables(ni_price, co_price, grade_multiplier=0.85):
    """Black mass payables based on Ni/Co prices and grade multiples.
    Basis: LME 3-month average.
    Grade multiplier default: 85% of contained metal value (mixed black mass).
    """
    ni_payable = ni_price * grade_multiplier
    co_payable = co_price * grade_multiplier

    return {
        "ni_payable_usd_per_mt":  round(ni_payable, 2),
        "co_payable_usd_per_mt":  round(co_payable, 2),
        "ni_input_price":         ni_price,
        "co_input_price":         co_price,
        "grade_multiplier":       grade_multiplier,
        "basis":                  "LME 3-month average",
        "total_value_per_mt":     round(ni_payable + co_payable, 2),
    }
```

**Key output fields:**
- `ni_payable_usd_per_mt` / `co_payable_usd_per_mt` — payable values after grade multiplier
- `total_value_per_mt` — combined Ni + Co payable per metric tonne
- `grade_multiplier` — recorded for audit trail (default 0.85)

---

### 2. Primary Offtaker MHP Offtake

**Commercial context:** MHP (Mixed Hydroxide Precipitate) is sold to battery precursor manufacturers. The Primary Offtaker agreement references Fastmarkets MB CO-0005 monthly. Key provisions:
- **8% floor discount** — Primary Offtaker receives Ni and Co at 8% below spot as a structural discount
- **15% profit share above $20,000/mt Ni** — when LME Ni exceeds this threshold, 15% of the incremental value above threshold flows back to MHP as a profit share

```python
THRESHOLD_PRICE_PER_MT = 20000  # USD/mt — Ni profit-share trigger
FLOOR_DISCOUNT = 0.08           # 8% floor discount applied to both Ni and Co
PROFIT_SHARE = 0.15             # 15% of incremental Ni value above threshold

def calculate_primary_offtaker_mhp_offtake(
    ni_price: float,
    co_price: float,
    floor_discount: float = FLOOR_DISCOUNT,
    profit_share_threshold: float = THRESHOLD_PRICE_PER_MT,
):
    """Primary Offtaker / MHP Offtaker MHP offtake pricing.
    
    Structure:
    - Primary Offtaker receives 8% discount to spot on both Ni and Co (floor discount).
    - For Ni prices above $20,000/mt, Primary Offtaker shares 15% of the incremental
      value above $20,000/mt back with MHP as a profit share.
    """
    # Base floor prices after 8% discount
    floor_ni = ni_price * (1 - floor_discount)
    floor_co = co_price * (1 - floor_discount)

    # Profit share trigger logic (Ni only)
    profit_share_triggered = ni_price > profit_share_threshold
    incremental_price_above_threshold = max(0.0, ni_price - profit_share_threshold)
    profit_share_amount = (
        incremental_price_above_threshold * PROFIT_SHARE
        if profit_share_triggered else 0.0
    )

    # Realized Ni payable to Primary Offtaker after profit share flows to MHP
    realized_ni = floor_ni - profit_share_amount

    return {
        "floor_ni_usd_per_mt":               round(floor_ni, 2),
        "floor_co_usd_per_mt":               round(floor_co, 2),
        "floor_discount_pct":                floor_discount * 100,
        "profit_share_triggered":            profit_share_triggered,
        "incremental_price_above_threshold": round(incremental_price_above_threshold, 2),
        "profit_share_amount":               round(profit_share_amount, 2),
        "realized_ni_payable":               round(realized_ni, 2),
        "basis":                             "Fastmarkets MB CO-0005 monthly average",
        "margin_vs_spot":                    round(
            (floor_ni - ni_price) / ni_price * 100, 2
        ) if ni_price else 0,
        "counterparty_label":                "Primary Offtaker / MHP Offtaker",
    }
```

**Profit-share trigger example:**
If Ni = $22,000/mt:
- Floor Ni = $22,000 × 0.92 = $20,240/mt
- Incremental above threshold = $22,000 − $20,000 = $2,000
- Profit share = $2,000 × 15% = $300/mt
- Realized Ni payable = $20,240 − $300 = **$19,940/mt**

The `business_insights` generator (see below) automatically narrates this when triggered.

---

### 3. Lithium Carbonate GTC

**Commercial context:** Lithium Carbonate is sold under a General Trading Confirmation (GTC) structure referencing Fastmarkets Li₂CO₃ 99.5% CIF. The agreement includes a hard floor ($20,000/mt) and ceiling ($30,000/mt) that cap the effective price regardless of spot movement.

```python
def calculate_lithium_carbonate_gtc(
    li_price,
    contract_floor=20000,
    contract_ceiling=30000
):
    """Lithium carbonate GTC pricing with floor and ceiling protection.
    Basis: Fastmarkets lithium carbonate 99.5% CIF.
    """
    effective_price = max(contract_floor, min(li_price, contract_ceiling))

    floor_active   = li_price < contract_floor
    ceiling_active = li_price > contract_ceiling

    return {
        "spot_li_price_usd_per_mt":    li_price,
        "effective_price_usd_per_mt":  effective_price,
        "contract_floor":              contract_floor,
        "contract_ceiling":            contract_ceiling,
        "floor_protection_active":     floor_active,
        "ceiling_cap_active":          ceiling_active,
        "realized_vs_spot_diff":       round(effective_price - li_price, 2),
        "basis":                       "Fastmarkets lithium carbonate 99.5% CIF",
    }
```

**State logic:**
- `floor_protection_active = True` → spot is below $20,000/mt; GLI is protected and receives the floor
- `ceiling_cap_active = True` → spot is above $30,000/mt; GLI's upside is capped
- Neither active → effective price equals spot (within the band)

---

### 4. Li Cycle Feedstock

**Commercial context:** Li Cycle purchases battery recycling feedstock from GLI. The agreement is a multi-commodity payable structure: the primary value driver is lithium content (92% grade, 75% payable), with credit for residual Ni (3% content, 90% payable) and Co (2% content, 90% payable).

```python
def calculate_li_cycle_feedstock(
    li_price,
    ni_price,
    co_price,
    feedstock_grade=0.92
):
    """Li Cycle feedstock pricing — multi-commodity payable structure.
    
    Li content:  92% of feedstock @ 75% payable
    Ni content:   3% of feedstock @ 90% payable
    Co content:   2% of feedstock @ 90% payable
    Basis: Mixed Fastmarkets/LME composite
    """
    li_payable = li_price * feedstock_grade * 0.75   # primary value driver
    ni_payable = ni_price * 0.03 * 0.90              # residual Ni credit
    co_payable = co_price * 0.02 * 0.90              # residual Co credit

    total_value = li_payable + ni_payable + co_payable

    return {
        "li_payable_usd_per_mt":  round(li_payable, 2),
        "ni_payable_usd_per_mt":  round(ni_payable, 2),
        "co_payable_usd_per_mt":  round(co_payable, 2),
        "total_feedstock_value":  round(total_value, 2),
        "feedstock_grade":        feedstock_grade,
        "basis":                  "Mixed Fastmarkets/LME composite",
    }
```

---

## Unit Conversions

```python
def convert_usd_mt_to_lb(price_usd_mt):
    """Convert USD/metric ton to USD/lb"""
    return round(price_usd_mt / 2204.62, 4)

def convert_usd_lb_to_mt(price_usd_lb):
    """Convert USD/lb to USD/metric ton"""
    return round(price_usd_lb * 2204.62, 2)
```

AlphaVantage returns Ni and Co prices in **USD/lb**. All contract functions expect **USD/mt**. The AI Model (Stage 1) is instructed to apply this conversion before passing prices to the Python step. The unit_conversions block in the output records both representations for auditability.

```python
results["unit_conversions"] = {
    "ni_usd_per_lb": convert_usd_mt_to_lb(ni_price),
    "co_usd_per_lb": convert_usd_mt_to_lb(co_price),
    "li_usd_per_lb": convert_usd_mt_to_lb(li_price),
    "ni_usd_per_mt": ni_price,
    "co_usd_per_mt": co_price,
    "li_usd_per_mt": li_price,
}
```

---

## Business Insights Auto-Generation

After running all four contract functions, the Python step auto-generates plain-English insight strings that are passed to AI Model 1 as part of the results JSON. These seed the narrative but the Financial Analyst model expands them.

```python
# Profit share trigger insight
primary_offtaker = results["gli_calculations"]["primary_offtaker_mhp_offtake"]
if primary_offtaker["profit_share_triggered"]:
    results["business_insights"].append(
        f"Primary Offtaker profit share triggered: Ni price ${ni_price}/mt exceeds "
        f"the $20,000/mt threshold. An additional "
        f"${primary_offtaker['profit_share_amount']}/mt is shared back with MHP."
    )

# Black mass summary
black_mass = results["gli_calculations"]["black_mass_payables"]
results["business_insights"].append(
    f"Black mass total value: ${black_mass['total_value_per_mt']}/mt "
    f"(Ni: ${black_mass['ni_payable_usd_per_mt']}, "
    f"Co: ${black_mass['co_payable_usd_per_mt']})"
)

# Li carbonate floor / ceiling insights
li_gtc = results["gli_calculations"]["lithium_carbonate_gtc"]
if li_gtc["floor_protection_active"]:
    results["business_insights"].append(
        f"Lithium floor protection active: Spot ${li_price}/mt is below the "
        f"contract floor of ${li_gtc['contract_floor']}/mt."
    )
elif li_gtc["ceiling_cap_active"]:
    results["business_insights"].append(
        f"Lithium ceiling cap active: Spot ${li_price}/mt is above the "
        f"contract ceiling of ${li_gtc['contract_ceiling']}/mt."
    )
```

---

## Sensitivity Analysis

The sensitivity block re-applies contract multipliers at ±$1,000/mt price moves across each commodity. This gives the Financial Analyst model concrete delta figures for the risk exposure section.

```python
results["sensitivity_analysis"] = {
    "ni_plus_1000": {
        "black_mass_delta":             round(1000 * 0.85, 2),   # = $850/mt
        "primary_offtaker_floor_delta": round(1000 * 0.92, 2),  # = $920/mt
    },
    "co_plus_1000": {
        "black_mass_delta":             round(1000 * 0.85, 2),   # = $850/mt
        "primary_offtaker_floor_delta": round(1000 * 0.92, 2),  # = $920/mt
    },
    "li_plus_1000": {
        "gtc_delta":      "depends on floor/ceiling",  # bounded by contract structure
        "feedstock_delta": round(1000 * 0.92 * 0.75, 2),        # = $690/mt
    },
}
```

**Interpreting the Ni sensitivity:**
A $1,000/mt increase in LME Ni adds $850/mt to black mass payables (85% multiplier) and $920/mt to the Primary Offtaker floor price (92% = 1 − 8% discount). If that move also pushes Ni above the $20,000/mt profit-share threshold, an additional 15% of the increment flows to MHP — which the `calculate_primary_offtaker_mhp_offtake` function captures automatically.

---

## Contract Parameters Summary (from Flow Annotation)

These are the exact values encoded in the flow annotations and Python constants:

| Contract | Parameter | Value |
|---|---|---|
| Black Mass | Grade multiplier | 85% of LME 3-month Ni/Co |
| Black Mass | Counterparties | Atoka, Li-Cycle, Redwood |
| Primary Offtaker MHP | Floor discount | 8% below Fastmarkets MB |
| Primary Offtaker MHP | Profit share threshold | $20,000/mt Ni |
| Primary Offtaker MHP | Profit share rate | 15% of incremental Ni above threshold |
| Primary Offtaker MHP | Basis | Fastmarkets MB CO-0005 monthly |
| Li Carbonate GTC | Floor | $20,000/mt |
| Li Carbonate GTC | Ceiling | $30,000/mt |
| Li Carbonate GTC | Basis | Fastmarkets Li₂CO₃ 99.5% CIF |
| Li Cycle Feedstock | Li content / payable | 92% grade · 75% payable |
| Li Cycle Feedstock | Ni content / payable | 3% content · 90% payable |
| Li Cycle Feedstock | Co content / payable | 2% content · 90% payable |

---

## Execution Order

```python
# All four contracts run on every query (no conditional branching)
results["gli_calculations"]["black_mass_payables"]        = calculate_black_mass_payables(ni_price, co_price)
results["gli_calculations"]["primary_offtaker_mhp_offtake"] = calculate_primary_offtaker_mhp_offtake(ni_price, co_price)
results["gli_calculations"]["lithium_carbonate_gtc"]       = calculate_lithium_carbonate_gtc(li_price)
results["gli_calculations"]["li_cycle_feedstock"]          = calculate_li_cycle_feedstock(li_price, ni_price, co_price)

# Unit conversions and sensitivity always computed
# Business insights generated based on triggered conditions

output = json.dumps(results, indent=2)
```

The full `results` JSON is the payload passed to AI Model 1 for narrative synthesis.
