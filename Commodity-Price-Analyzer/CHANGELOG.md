# Changelog

All significant changes to the Commodity Price Analyzer flow are recorded here.

Format: `[Flow Version] — Date — Description`

---

## [3.00] — 2026-03-01

**Initial public release (Preview state)**

- Flow exported: `20260226132027_EditBraveNativeEntries`
- Agent ID: `20013153-1e89-4496-adf7-27f2924ac70d`
- Contributor: Shyam Desigan

### What's included in v3.00

**Architecture**
- 7-step Airia orchestration flow: Input → Memory Load → AI Model → Python Code → AI Model 1 → Output + Memory Store
- Two AI Model steps both use Claude Haiku 4.5 (`claude-haiku-4-5-20251001`)
- Stage 1 (AI Model): temperature 0.2, reasoning effort: high — price fetch and dispatch
- Stage 2 (AI Model 1): temperature 0.7 — Financial Analyst narrative synthesis

**MCP Tools Registered**
- AlphaVantage (`AlphaVantageSector`) — NICKEL, COBALT, CURRENCY_EXCHANGE_RATE
- Regulations.Gov — federal regulation document search

**Contract Logic (Python Step)**
- `calculate_black_mass_payables` — 85% grade multiplier on LME 3-month Ni/Co; counterparties: Atoka, Li-Cycle, Redwood
- `calculate_primary_offtaker_mhp_offtake` — 8% floor discount; 15% profit share above $20,000/mt Ni threshold; Fastmarkets MB CO-0005 basis
- `calculate_lithium_carbonate_gtc` — $20,000/mt floor, $30,000/mt ceiling; Fastmarkets Li₂CO₃ 99.5% CIF basis
- `calculate_li_cycle_feedstock` — 92% Li @ 75% payable, 3% Ni @ 90%, 2% Co @ 90%; mixed Fastmarkets/LME composite basis
- Unit conversion utilities (USD/mt ↔ USD/lb, factor 2204.62)
- Sensitivity analysis (±$1,000/mt shocks across Ni, Co, Li)
- Auto-generated business insights for triggered conditions

**Memory**
- `GLI Contract Parameters` (load) — shared, persistent contract configuration
- `Historical Pricing Data` (store, append) — shared, persistent audit log

**Prompts**
- Stage 1 system prompt: GLI Commodity Price Analyzer (consolidated from multiple prompt segments)
- Stage 2 system prompt: Financial Analyst specialized in GLI contract economics

**Deployment**
- Type: Chat
- Input modes: FileUpload, Whiteboard, Code, Math
- Department: Everyone

### Known Issues / Planned in Next Release
- AlphaVantage used as proxy for Fastmarkets MB CO-0005; direct Fastmarkets MCP not yet available
- Mn and Cu commodity coverage not yet implemented
- ERP/treasury integration not yet connected
- API key visible in Architecture annotation — **rotate immediately** (see [SECURITY.md](./SECURITY.md))

---

## Upcoming

### [3.01] — Planned
- Redact API key from Architecture annotation node
- Add Fastmarkets MCP when available
- Extend sensitivity range to ±$2,000/mt and ±10% percentage-based shocks

### [4.00] — Planned
- Mn and Cu commodity coverage
- ERP/treasury integration for invoice reconciliation
- SMM (Shanghai Metals Market) data source
- User-level memory isolation option
