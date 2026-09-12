# Data Sources & MCP Tool Configuration

This document covers the two MCP tools registered in the Airia flow, their exact API configurations, how symbols map to GLI contract indices, and the normalization rules the AI Model (Stage 1) must apply before passing prices to the Python step.

---

## Registered MCP Tools

Both tools are registered in Airia's MCP Gateway and called by the **AI Model** step (Stage 1). The model accesses them by tool name — it never holds or sees underlying API keys.

| Tool Name | Tool ID | Type | Provider |
|---|---|---|---|
| `Sector Information` | `c3051a84-7581-4aaf-86dc-8cb13f9f14ba` | `AlphaVantageSector` | AlphaVantage |
| `Regulations GOV` | `2f4a3e45-9fdb-4cd0-890f-781a02d5eb91` | `RegulationsGov` | Regulations.Gov |

Credential type for both: **User-Provided** (`credentialsSourceType: userProvided`). Each user configures their own API keys in Airia's credential vault. Keys are never embedded in the flow JSON.

---

## Tool 1 — AlphaVantage (Sector Information)

### Configuration

| Field | Value |
|---|---|
| Tool ID | `c3051a84-7581-4aaf-86dc-8cb13f9f14ba` |
| Type | `AlphaVantageSector` |
| Method | GET |
| Base Endpoint | `https://www.alphavantage.co/query?function=<sector>` |
| Credential Type | `AlphaVantage` (user-provided) |
| Request Timeout | 100s |
| Reroute via Airia | Yes (`shouldReroute: true`) |

### Parameters

| Parameter | Type | Required | Default | Example Values |
|---|---|---|---|---|
| `sector` (Property 1) | string | Required | — | `NICKEL`, `COBALT` |
| `Property (2)` | string | Optional | — | `COBALT`, `CURRENCY_EXCHANGE_RATE` |
| `Property (3)` | string | Optional | — | `CURRENCY_EXCHANGE_RATE` |

### Commodities Fetched

The AI Model is instructed to call this tool for:

| Commodity | AlphaVantage Function | Raw Unit | Normalized Unit |
|---|---|---|---|
| Nickel | `NICKEL` | USD/lb | USD/mt (× 2,204.62) |
| Cobalt | `COBALT` | USD/lb | USD/mt (× 2,204.62) |
| Currency rates | `CURRENCY_EXCHANGE_RATE` | — | As returned |

### Index Mapping — AlphaVantage to GLI Contract Reference

| GLI Contract Reference | AlphaVantage Function | Notes |
|---|---|---|
| LME 3-month Ni | `NICKEL` | Stage 1 model computes monthly average from daily closes |
| LME 3-month Co | `COBALT` | Same; monthly average applied |
| Fastmarkets MB CO-0005 low monthly | `COBALT` | AV cobalt used as proxy; flag in output when Fastmarkets MCP not available |
| Fastmarkets Li₂CO₃ 99.5% CIF | Fastmarkets feed via AV (where available) | Fall back to last confirmed value if unavailable |

### Unit Conversion

```python
# Applied by AI Model (Stage 1) before structuring JSON for Python step
USD_PER_MT = usd_per_lb * 2204.62
```

This conversion is applied to every Ni and Co price fetched from AlphaVantage before the price is passed to the Python computation layer.

---

## Tool 2 — Regulations.Gov

### Configuration

| Field | Value |
|---|---|
| Tool ID | `2f4a3e45-9fdb-4cd0-890f-781a02d5eb91` |
| Type | `RegulationsGov` |
| Method | GET |
| Endpoint | `https://api.regulations.gov/v4/documents?sort=-postedDate&filter[searchTerm]=<searchterm>` |
| Credential Type | `GovRegulationsApiKey` (user-provided) |
| Request Timeout | 100s |
| Reroute via Airia | Yes (`shouldReroute: true`) |

### Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `searchterm` | string | Required | Free-text search term for federal regulation documents |

### What It's Used For

Regulations.Gov is the secondary data source. The AI Model calls it when the query involves regulatory context — not for real-time commodity prices. Primary use cases:

**Regulatory monitoring:** Tracking policy changes that affect battery recycling economics, including IRA (Inflation Reduction Act) battery material sourcing requirements, critical minerals classifications, trade policy changes (tariffs, export controls), and environmental regulations for recycling operations.

**Index cross-reference:** In some queries the model uses Regulations.Gov to cross-check whether an index referenced in a GLI contract (e.g. Fastmarkets MB CO-0005) has been cited in a regulatory filing, which helps verify that the correct index definition is being used.

**Compliance audit trail:** Some contract audit requirements specify that pricing must be traceable to a publicly accessible published source. Regulations.Gov documents can serve as that reference.

### Data Lag Note

Regulations.Gov publishes documents with a lag. It is **not** a real-time price source. It is used for regulatory context and compliance audit, not for computing realized payables.

---

## AI Model (Stage 1) — Price Normalization Instructions

The system prompt for AI Model (Stage 1) includes explicit normalization requirements. The following rules must be applied before the model structures the JSON payload for the Python step.

### Unit Standardization

```
CRITICAL: Always normalize pricing data.
Unit Conversion: Convert between USD/mt ↔ USD/lb (1 mt = 2204.62 lbs)
```

### Index Mapping Instructions (from System Prompt)

```
Index Mapping:
- Map "Fastmarkets MB CO 0005" → specific AlphaVantage symbol
- Map "LME 3-month Ni" → NICKEL function in AlphaVantage
- Align pricing frequency (daily vs monthly average)
```

### Structured Output to Python Node

The AI Model must output this JSON structure to the Python step:

```json
{
  "query_context": "User's original question",
  "timestamp": "2025-01-XX",
  "commodity_prices": {
    "nickel": {
      "price": 18500.00,
      "unit": "USD/mt",
      "source": "AlphaVantage",
      "index": "LME 3-month"
    },
    "cobalt": {
      "price": 32000.00,
      "unit": "USD/mt",
      "source": "AlphaVantage",
      "index": "LME 3-month"
    },
    "lithium_carbonate": {
      "price": 25000.00,
      "unit": "USD/mt",
      "source": "AlphaVantage",
      "index": "Fastmarkets battery-grade"
    }
  },
  "contracts_in_scope": ["black_mass", "mhp_offtaker", "lithium_carbonate", "li_cycle"],
  "analysis_parameters": {
    "period": "current_month",
    "sensitivity_range": 1000
  }
}
```

The Python step then accesses `data["prices"]["nickel"]`, `data["prices"]["cobalt"]`, and `data["prices"]["lithium"]` (or the short-form `NI`, `CO`, `LI`) to extract the USD/mt values.

---

## Key Phrases and Query Routing

The AI Model's system prompt maps natural-language phrases to specific contract and data source selections:

| Phrase in Query | Data Source Called | Contracts Selected |
|---|---|---|
| "margin vs Primary Offtaker" | AlphaVantage NICKEL + COBALT | `mhp_offtaker` |
| "Atoka output" | AlphaVantage NICKEL + COBALT | `black_mass` (Atoka counterparty) |
| "realized vs theoretical payables" | AlphaVantage NICKEL + COBALT | All contracts |
| "profit share triggers" | AlphaVantage NICKEL | `mhp_offtaker` |
| "floor protection" | AlphaVantage NICKEL + COBALT or Li | `mhp_offtaker` or `li_carbonate_gtc` |
| "sensitivity to index moves" | AlphaVantage NICKEL + COBALT + Li | All contracts |
| "regulatory risk" / "IRA" / "tariff" | Regulations.Gov | Context only (no payable calc) |

---

## Roadmap — Additional Data Sources

The flow annotations and project description identify the following data sources as planned additions:

| Source | Status | Use Case |
|---|---|---|
| Fastmarkets (direct MCP) | Planned — when MCP equivalent available | Replace AV proxy for FM MB CO-0005 and Li₂CO₃ CIF |
| SMM (Shanghai Metals Market) | Planned | Asia-Pacific Li and Co price reference |
| ERP / Treasury integration | Planned | Invoice reconciliation, realized vs. modelled P&L variance |
| Mn, Cu commodity feeds | Planned | Extend feedstock basket beyond Ni/Co/Li |

When new MCP endpoints are registered in Airia's gateway, no changes to contract functions are required — only the symbol map and data source routing in the AI Model system prompt need to be updated.
