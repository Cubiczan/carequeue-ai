"""
Microsoft Fabric Notebook: Commodity Price Ingestion & AI Analysis

This notebook is designed to run inside Microsoft Fabric.
It ingests commodity data, runs GLI business rules, and generates
AI-powered insights using Azure AI Foundry (Kimi K2.6).

Prerequisites:
1. Create a Lakehouse in your Fabric workspace
2. Attach the Lakehouse to this notebook (Explorer -> Add data items)
3. Run notebooks/fabric_setup_lakehouse.py first to create Delta tables
4. Run each cell in order
"""

# =============================================================================
# CELL 0: Install Dependencies (run once)
# =============================================================================
# %pip install openai requests -q

# =============================================================================
# CELL 1: Configuration & Authentication
# =============================================================================

import os
import json
from datetime import datetime

# Azure AI Foundry (Kimi K2.6)
AZURE_AI_ENDPOINT = "https://samd-5839-resource.services.ai.azure.com/openai/v1"
AZURE_AI_KEY = os.getenv("AZURE_AI_KEY", "YOUR_KEY_HERE")
AZURE_AI_DEPLOYMENT = "Kimi-K2.6"

# Twelve Data API (commodity pricing)
TWELVE_DATA_KEY = os.getenv("TWELVE_DATA_API_KEY", "YOUR_KEY_HERE")

print(f"Configuration loaded at {datetime.utcnow().isoformat()}")
print(f"AI Endpoint: {AZURE_AI_ENDPOINT}")
print(f"Deployment: {AZURE_AI_DEPLOYMENT}")

# =============================================================================
# CELL 2: AI Analyzer Class (Azure AI Foundry)
# =============================================================================

from openai import OpenAI

class FabricAIAnalyzer:
    """Azure AI Foundry analyzer optimized for Fabric notebooks."""

    def __init__(self):
        self.client = OpenAI(
            base_url=AZURE_AI_ENDPOINT,
            api_key=AZURE_AI_KEY
        )
        self.deployment = AZURE_AI_DEPLOYMENT

    def analyze(self, system_prompt, user_content, temperature=0.3):
        try:
            completion = self.client.chat.completions.create(
                model=self.deployment,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content}
                ],
                temperature=temperature
            )
            return completion.choices[0].message.content
        except Exception as e:
            return f"AI Analysis Error: {str(e)}"

ai = FabricAIAnalyzer()
print("AI Analyzer initialized successfully.")

# =============================================================================
# CELL 3: Fetch Live Prices from Twelve Data + AlphaVantage
# =============================================================================

import requests
import time
from pyspark.sql import SparkSession
spark = SparkSession.builder.getOrCreate()

# Twelve Data has no commodity futures on free tier — use ETF proxies
# Conversion factors: ETF_price / factor = approximate spot price in USD/mt
METAL_CONFIG = {
    "Nickel":    {"symbol": "NICK", "factor": None,  "fallback": 17200.0},
    "Cobalt":    {"symbol": None,   "factor": None,  "fallback": 31500.0},
    "Lithium":   {"symbol": "LIT",  "factor": 0.0036,"fallback": 24500.0},
    "Copper":    {"symbol": "CPER", "factor": 0.0039,"fallback": 9200.0},
    "Manganese": {"symbol": "EMN",  "factor": None,  "fallback": 3800.0},
}

def fetch_twelvedata(symbol, api_key):
    try:
        url = f"https://api.twelvedata.com/price?symbol={symbol}&apikey={api_key}"
        resp = requests.get(url, timeout=10).json()
        if resp.get("price"):
            return float(resp["price"])
    except:
        pass
    return None

now = datetime.utcnow().isoformat()
price_rows = []
base_prices = {}
req_count = 0

for metal_name, config in METAL_CONFIG.items():
    price = config["fallback"]
    source = "benchmark"

    if config["symbol"]:
        req_count += 1
        if req_count > 7:
            time.sleep(10)  # Twelve Data free: 8 credits/min
        else:
            time.sleep(1)

        etf_price = fetch_twelvedata(config["symbol"], TWELVE_DATA_KEY)
        if etf_price and etf_price > 0:
            factor = config["factor"]
            if factor:
                price = round(etf_price / factor, 2)
                source = f"TwelveData/{config['symbol']} ETF"
            else:
                source = f"TwelveData/{config['symbol']} ETF (price={etf_price})"
    else:
        source = "benchmark (no ETF proxy)"

    base_prices[metal_name] = price
    print(f"  {metal_name}: ${price:,.2f}/mt ({source})")
    price_rows.append((now, metal_name, price, "USD/mt", source, 0.0))

df_new_prices = spark.createDataFrame(price_rows, [
    "timestamp", "metal", "price", "unit", "source", "change_pct"
])
df_new_prices.write.format("delta").mode("append").saveAsTable("commodityprices")
print(f"\n{len(price_rows)} prices written to commodityprices")

# =============================================================================
# CELL 4: GLI Business Rules (Contract Calculations)
# =============================================================================

GRADE_MULTIPLIER = 0.85
THRESHOLD_PRICE_PER_MT = 20000
FLOOR_DISCOUNT = 0.08
PROFIT_SHARE = 0.15

def calculate_all(ni_price, co_price, li_price):
    black_mass = {
        "ni_payable": round(ni_price * GRADE_MULTIPLIER, 2),
        "co_payable": round(co_price * GRADE_MULTIPLIER, 2),
        "total_value": round((ni_price + co_price) * GRADE_MULTIPLIER, 2),
    }
    floor_ni = ni_price * (1 - FLOOR_DISCOUNT)
    floor_co = co_price * (1 - FLOOR_DISCOUNT)
    profit_share_triggered = ni_price > THRESHOLD_PRICE_PER_MT
    incremental = max(0, ni_price - THRESHOLD_PRICE_PER_MT)
    profit_share_amt = incremental * PROFIT_SHARE if profit_share_triggered else 0
    mhp = {
        "floor_ni": round(floor_ni, 2), "floor_co": round(floor_co, 2),
        "profit_share_triggered": profit_share_triggered,
        "profit_share_amount": round(profit_share_amt, 2),
        "realized_ni": round(floor_ni - profit_share_amt, 2),
    }
    effective_li = max(20000, min(li_price, 30000))
    li_gtc = {
        "spot_price": li_price, "effective_price": effective_li,
        "floor_active": li_price < 20000, "ceiling_active": li_price > 30000,
    }
    li_cycle = {
        "li_payable": round(li_price * 0.92 * 0.75, 2),
        "ni_payable": round(ni_price * 0.03 * 0.90, 2),
        "co_payable": round(co_price * 0.02 * 0.90, 2),
        "total_value": round(li_price * 0.92 * 0.75 + ni_price * 0.03 * 0.90 + co_price * 0.02 * 0.90, 2),
    }
    return {
        "black_mass": black_mass, "mhp_offtaker": mhp,
        "lithium_gtc": li_gtc, "li_cycle": li_cycle,
        "timestamp": datetime.utcnow().isoformat(),
    }

ni, co, li = base_prices["Nickel"], base_prices["Cobalt"], base_prices["Lithium"]
results = calculate_all(ni, co, li)
print("GLI Contract Calculations:")
print(json.dumps(results, indent=2))

# =============================================================================
# CELL 5: AI-Powered Analysis (Kimi K2.6)
# =============================================================================

system_prompt = (
    "You are a Financial Analyst for GLI (Global Lithium Innovations), "
    "a battery metals recycling company. Analyze the contract economics "
    "and provide actionable insights."
)

user_content = f"""
## Current Commodity Prices (USD/mt)
- Nickel: ${ni:,.2f}
- Cobalt: ${co:,.2f}
- Lithium Carbonate: ${li:,.2f}

## GLI Contract Calculations
{json.dumps(results, indent=2)}

Please provide:
1. Executive Summary (2-3 sentences)
2. Contract Performance Analysis
3. Key Insights & Triggers
4. Risk Exposure & Recommendations
"""

analysis = ai.analyze(system_prompt, user_content, temperature=0.4)
print("=" * 60)
print("AI ANALYSIS (Kimi K2.6 via Azure AI Foundry)")
print("=" * 60)
print(analysis)

# =============================================================================
# CELL 6: Write Results Back to Lakehouse
# =============================================================================

# Write contract calculations
calc_json = json.dumps(results)
spark.createDataFrame([(datetime.utcnow().isoformat(), "all_contracts", calc_json)], [
    "timestamp", "contract_type", "values_json"
]).write.format("delta").mode("append").saveAsTable("contractcalculations")
print("Calculations saved to contractcalculations")

# Write AI analysis
spark.createDataFrame([{
    "timestamp": datetime.utcnow().isoformat(),
    "ni_price": ni, "co_price": co, "li_price": li,
    "black_mass_value": results["black_mass"]["total_value"],
    "mhp_profit_share_triggered": results["mhp_offtaker"]["profit_share_triggered"],
    "li_floor_active": results["lithium_gtc"]["floor_active"],
    "li_ceiling_active": results["lithium_gtc"]["ceiling_active"],
    "ai_analysis": analysis,
}]).write.format("delta").mode("append").saveAsTable("contractanalysis")
print("Analysis saved to contractanalysis")

# =============================================================================
# CELL 7: Display Latest Analysis Summary
# =============================================================================

latest = spark.table("contractanalysis") \
    .orderBy("timestamp", ascending=False).limit(1).toPandas()

if len(latest) > 0:
    row = latest.iloc[0]
    print(f"Latest Analysis: {row['timestamp']}")
    print(f"  Ni: ${row['ni_price']:,.2f}/mt | Co: ${row['co_price']:,.2f}/mt | Li: ${row['li_price']:,.2f}/mt")
    print(f"  Black Mass Value: ${row['black_mass_value']:,.2f}/mt")
    print(f"  MHP Profit Share: {'TRIGGERED' if row['mhp_profit_share_triggered'] else 'Not Triggered'}")
    print(f"  Li Floor: {'ACTIVE' if row['li_floor_active'] else 'Inactive'}")
    print(f"  Li Ceiling: {'ACTIVE' if row['li_ceiling_active'] else 'Inactive'}")

print(f"\nTables state:")
for t in spark.catalog.listTables():
    print(f"  {t.name}: {spark.table(t.name).count()} records")
