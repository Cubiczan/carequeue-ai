---
name: defeatbeta-api
description: Financial data API integration for market analysis. Provides stock prices, financial statements, earnings transcripts, SEC filings, and valuation metrics via defeatbeta-api (open-source alternative to Yahoo Finance). Supports DCF analysis and LLM-powered earnings analysis.
---

# Defeat Beta API Integration

## Installation
```bash
pip install defeatbeta-api
```

## Core Capabilities

### 1. Stock Price Data
```python
from defeatbeta_api.data.ticker import Ticker
ticker = Ticker('AAPL')
prices = ticker.price()  # OHLCV history
```

### 2. Financial Statements
```python
# Quarterly income statement
income = ticker.quarterly_income_statement()

# Balance sheet
balance = ticker.quarterly_balance_sheet()

# Cash flow
cashflow = ticker.quarterly_cash_flow()
```

### 3. Extended Valuation Metrics
- TTM EPS, TTM PE
- Market Cap (historical)
- PS Ratio, PB Ratio, PEG Ratio
- ROE, ROIC, ROA
- WACC
- Equity Multiplier, Asset Turnover

### 4. Earnings Call Transcripts
```python
transcripts = ticker.earning_call_transcripts()
transcripts.get_transcripts_list()  # List available quarters
transcripts.get_transcript(2024, 4)  # Get Q4 2024 transcript
```

### 5. SEC Filings
```python
filings = ticker.sec_filings()
```

### 6. Automated DCF Valuation
```python
dcf = ticker.dcf()
# Generates Excel output with:
# - WACC calculation
# - 10-year cash flow projections
# - Enterprise value & fair price
# - Buy/sell recommendations
```

## Use Cases for Trade Recommendations

### Technical Analysis
- Price history for chart patterns
- Volume analysis
- Support/resistance levels

### Fundamental Analysis
- Revenue growth trends
- Margin expansion/contraction
- Cash flow generation
- Balance sheet strength

### Sentiment Analysis
- Earnings call transcript analysis
- Management tone and guidance
- Analyst Q&A insights

### Valuation
- DCF fair value estimation
- Multiple comparison (PE, PS, PB)
- Historical valuation ranges

## Example Workflow

```python
from defeatbeta_api.data.ticker import Ticker

ticker = Ticker('AAPL')

# Get price data
prices = ticker.price()
current_price = prices['close'].iloc[-1]

# Get valuation metrics
valuation = ticker.valuation()
pe_ratio = valuation['trailing_pe']
fair_value_dcf = ticker.dcf()['fair_price']

# Get latest earnings sentiment
transcripts = ticker.earning_call_transcripts()
latest_call = transcripts.get_transcript(2024, 4)

# Analyze for trade opportunity
if current_price < fair_value_dcf * 0.9 and pe_ratio < 25:
    recommendation = "LONG - Undervalued, strong fundamentals"
```

## Rate Limits
- Data hosted on Hugging Face (reliable, no scraping issues)
- Powered by DuckDB OLAP engine (sub-second queries)
- No API keys required for basic usage

## MCP Server Available
The API also provides an MCP server for AI integration:
https://github.com/defeat-beta/defeatbeta-api/tree/main/mcp
