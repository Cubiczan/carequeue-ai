# Contributing

How to extend the Commodity Price Analyzer with new contracts, data sources, or commodity coverage.

---

## Adding a New Contract Type

New contracts follow the same pattern as the four existing functions in the Python Code step.

### 1. Define the contract function

Add a new function to the Python Code step in the Airia flow editor. Follow the existing pattern:

```python
def calculate_new_contract(
    price_a: float,
    price_b: float,
    contract_param_1: float,
    contract_param_2: float,
) -> dict:
    """
    Brief description of the contract.
    Basis: [index name]
    Key provisions: [summary]
    """
    # ... deterministic calculation ...
    
    return {
        "realized_value":   round(realized, 2),
        "theoretical_max":  round(theoretical, 2),
        "provision_active": bool_condition,
        "basis":            "Index name",
        "contract_version": "COUNTERPARTY_TYPE_v1.0_YYYYMMDD",
    }
```

Rules for contract functions:
- **Stateless** — same inputs always produce same outputs
- **Return a dict** — all relevant intermediate values, not just the final figure
- **Include `basis`** — records the index used for auditability
- **Round all dollar values** to 2 decimal places

### 2. Add the function call to the execution block

```python
results["gli_calculations"]["new_contract"] = calculate_new_contract(
    price_a, price_b, param_1, param_2
)
```

### 3. Add a business insight trigger if appropriate

```python
new_calc = results["gli_calculations"]["new_contract"]
if new_calc["provision_active"]:
    results["business_insights"].append(
        f"New contract provision triggered: [plain English explanation]"
    )
```

### 4. Update the GLI Contract Parameters memory

Add the new contract's parameters to the `GLI Contract Parameters` memory so the AI Model (Stage 1) knows it exists and can select it when relevant queries arrive.

### 5. Update the AI Model (Stage 1) system prompt

In the Airia flow editor, add the new contract to the **"Critical Contract Structures You Must Understand"** section of the Stage 1 prompt. Describe:
- The index it references
- Key provisions (floor, ceiling, payable %, profit share)
- Key phrases that should trigger this contract's calculation

### 6. Document the contract in CONTRACT_LOGIC.md

Add a section to `CONTRACT_LOGIC.md` following the same structure as the existing four contracts: commercial context, annotated code, parameter table, and worked example.

---

## Adding a New Data Source

### 1. Register the MCP endpoint in Airia

In Airia's MCP Gateway, register the new data source as a tool. You will need:
- The API endpoint URL with parameter placeholders
- The HTTP method (GET/POST)
- Parameter definitions
- Credential type

### 2. Add the tool to the AI Model (Stage 1) step

In the Airia flow editor, open the AI Model step and add the new tool to `toolIds`. The model will then be able to call it.

### 3. Update the symbol map in DATA_SOURCES.md

Add a row to the symbol map table showing how the new source's field names map to GLI contract index references.

### 4. Update the normalization instructions in the Stage 1 system prompt

Add the new source's unit convention and any frequency alignment requirements to the normalization instructions section of the Stage 1 prompt.

---

## Extending Commodity Coverage (Mn, Cu)

The project roadmap includes extending coverage to Manganese (Mn) and Copper (Cu). When ready:

1. Confirm AlphaVantage (or a new MCP source) has the relevant function names and test the API response format
2. Add the symbols to the Stage 1 prompt's commodity list
3. Add the corresponding contract functions for any GLI contracts that reference Mn or Cu
4. Add the unit conversion factors if they differ from the Ni/Co convention

---

## Updating Existing Contract Parameters

For parameter changes that don't require new logic (e.g., the profit-share threshold changes from $20,000/mt to $22,000/mt):

1. Update the constant in the Python Code step:
   ```python
   THRESHOLD_PRICE_PER_MT = 22000  # updated from 20000
   ```
2. Update the GLI Contract Parameters memory with the new value
3. Update the Stage 1 system prompt contract description to reflect the new threshold
4. Add a CHANGELOG entry

---

## Code Style

- Python functions: `snake_case`
- All financial values: `float`, rounded to 2 decimal places in return dicts
- Boolean trigger fields: named `{provision}_active` or `{provision}_triggered`
- All return dicts: include a `basis` field naming the pricing index
- No external library imports — the Python step runs in a restricted environment; only `json` and `datetime` from the standard library are available

---

## Testing

Before deploying changes to the live flow:

1. Test the Python functions locally with representative price inputs:

```python
# Test at below-threshold Ni price
result = calculate_primary_offtaker_mhp_offtake(ni_price=18000, co_price=35000)
assert result["profit_share_triggered"] == False

# Test at above-threshold Ni price
result = calculate_primary_offtaker_mhp_offtake(ni_price=22000, co_price=35000)
assert result["profit_share_triggered"] == True
assert result["profit_share_amount"] == round((22000 - 20000) * 0.15, 2)  # = 300.0

# Test Li carbonate floor
result = calculate_lithium_carbonate_gtc(li_price=15000)
assert result["floor_protection_active"] == True
assert result["effective_price_usd_per_mt"] == 20000

# Test Li carbonate ceiling
result = calculate_lithium_carbonate_gtc(li_price=35000)
assert result["ceiling_cap_active"] == True
assert result["effective_price_usd_per_mt"] == 30000
```

2. Verify the JSON output structure matches what AI Model 1's system prompt expects

3. Run a test query in the Airia chat interface and confirm the narrative output is coherent and numerically accurate
