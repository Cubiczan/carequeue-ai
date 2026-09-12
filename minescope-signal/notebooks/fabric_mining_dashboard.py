# %% [markdown]
# # Minescope.Signal — Mining Intelligence Dashboard
# # Microsoft Fabric Notebook
#
# Full pipeline: price ingestion → reserve analysis → production analytics →
# AISC benchmarking → signal scoring → AI comparative intelligence → Delta write.
#
# Prerequisites: Run fabric_setup_lakehouse.py first to create tables.

# %%
# Cell 1 — Configuration
# =======================
import os

LAKEHOUSE_NAME = "minescope_lakehouse"

# Azure AI Foundry
AZURE_AI_ENDPOINT = os.environ.get("AZURE_AI_ENDPOINT", "https://your-resource.openai.azure.com/")
AZURE_AI_KEY = os.environ.get("AZURE_AI_KEY", "")
AZURE_AI_DEPLOYMENT = os.environ.get("AZURE_AI_DEPLOYMENT", "gpt-4o")
AZURE_AI_VERSION = os.environ.get("AZURE_AI_VERSION", "2024-08-01-preview")

# API Keys
FRED_API_KEY = os.environ.get("FRED_API_KEY", "")
ALPHA_VANTAGE_KEY = os.environ.get("ALPHA_VANTAGE_KEY", "")

# Signal Score Weights
SIGNAL_WEIGHTS = {
    "grade": 0.25,
    "cost": 0.25,
    "production": 0.20,
    "growth": 0.15,
    "esg": 0.15,
}

# Target Companies for Analysis
TARGET_COMPANIES = ["Barrick Gold", "Newmont", "Freeport-McMoRan", "Rio Tinto"]

print(f"Minescope.Signal v0.1.0")
print(f"AI Model: {AZURE_AI_DEPLOYMENT}")
print(f"Target companies: {TARGET_COMPANIES}")

# %%
# Cell 2 — Import Models (local package)
# =======================================
import sys
sys.path.insert(0, "/lakehouse/default/Files/src")  # Fabric workspace path

# If running locally or in dev, adjust path
try:
    from models import (
        MiningCompany, CompanyTier,
        ReserveEstimate, ResourceClassification,
        ProductionRecord, CommodityPrice, PriceUnit,
        AiscMetric,
    )
    print("✓ Models imported from workspace")
except ImportError:
    print("⚠ Models not found in workspace — using inline definitions")

# %%
# Cell 3 — Data Loading from Delta Tables
# ========================================
print("Loading data from Lakehouse...")

df_companies = spark.read.format("delta").table(f"{LAKEHOUSE_NAME}.mining_companies")
df_mines = spark.read.format("delta").table(f"{LAKEHOUSE_NAME}.mine_sites")
df_reserves = spark.read.format("delta").table(f"{LAKEHOUSE_NAME}.reserve_estimates")
df_production = spark.read.format("delta").table(f"{LAKEHOUSE_NAME}.production_records")
df_prices = spark.read.format("delta").table(f"{LAKEHOUSE_NAME}.commodity_prices")
df_aisc = spark.read.format("delta").table(f"{LAKEHOUSE_NAME}.aisc_metrics")

print(f"  Companies: {df_companies.count()}")
print(f"  Mine Sites: {df_mines.count()}")
print(f"  Reserves: {df_reserves.count()}")
print(f"  Production Records: {df_production.count()}")
print(f"  Commodity Prices: {df_prices.count()}")
print(f"  AISC Metrics: {df_aisc.count()}")

# Convert to Pandas for analytics
pdf_companies = df_companies.toPandas()
pdf_reserves = df_reserves.toPandas()
pdf_production = df_production.toPandas()
pdf_prices = df_prices.toPandas()
pdf_aisc = df_aisc.toPandas()

print("✓ Data loaded and converted to Pandas")

# %%
# Cell 4 — Commodity Price Dashboard
# ===================================
import pandas as pd
import numpy as np

print("=" * 70)
print("COMMODITY PRICE SNAPSHOT")
print("=" * 70)

price_display = pdf_prices[["commodity", "price", "unit", "source", "change_pct_24h",
                            "low_52w", "high_52w", "price_range_pct"]].copy()
for _, row in price_display.iterrows():
    range_bar = "▓" * int(row["price_range_pct"] / 5) + "░" * (20 - int(row["price_range_pct"] / 5))
    change = f"{row['change_pct_24h']:+.2f}%" if pd.notna(row["change_pct_24h"]) else "  N/A"
    print(f"  {row['commodity']:<10} ${row['price']:>12,.2f} {row['unit']:<8} {change:>7}  |{range_bar}|")

print(f"\n  {'─' * 66}")
print(f"  52w range bar: ░ = low ─── ▓ = high")

# %%
# Cell 5 — Reserve Analysis
# ==========================
print("\n" + "=" * 70)
print("RESERVE ANALYSIS BY COMPANY")
print("=" * 70)

# Join reserves with mine sites to get company
pdf_mines_pd = df_mines.toPandas()
pdf_res_merged = pdf_reserves.merge(pdf_mines_pd[["mine_name", "company_name"]], on="mine_name", how="left")

for company in TARGET_COMPANIES:
    co_reserves = pdf_res_merged[pdf_res_merged["company_name"] == company]
    if co_reserves.empty:
        print(f"\n  {company}: No reserve data")
        continue

    pp = co_reserves[co_reserves["is_reserve"] == True]
    pp_tonnage = pp["tonnage_kt"].sum()
    pp_metal = pp["contained_metal"].sum()
    all_tonnage = co_reserves["tonnage_kt"].sum()
    avg_grade = (co_reserves["grade"] * co_reserves["tonnage_kt"]).sum() / co_reserves["tonnage_kt"].sum()
    conv_ratio = pp_tonnage / all_tonnage if all_tonnage > 0 else 0

    print(f"\n  {company}")
    print(f"    Proven + Probable: {pp_tonnage:,.0f} kt | {pp_metal:,.0f} contained units")
    print(f"    Total Resources:   {all_tonnage:,.0f} kt")
    print(f"    Avg Grade:         {avg_grade:.3f}")
    print(f"    P/P Ratio:         {conv_ratio:.1%}")

    for _, row in pp.iterrows():
        print(f"      {row['mine_name']:<20} {row['classification']:<10} "
              f"{row['tonnage_kt']:>8,.0f} kt @ {row['grade']:.3f} {row['grade_unit']}")

# %%
# Cell 6 — AISC Benchmarking
# ===========================
print("\n" + "=" * 70)
print("AISC BENCHMARKING")
print("=" * 70)

# Gold mines
gold_aisc = pdf_aisc[pdf_aisc["commodity"] == "Gold"].sort_values("aisc")
copper_aisc = pdf_aisc[pdf_aisc["commodity"] == "Copper"].sort_values("aisc")

print("\n  Gold Mines (USD/oz):")
gold_median = gold_aisc["aisc"].median() if not gold_aisc.empty else 0
print(f"  {'Mine':<22} {'AISC':>8} {'Net AISC':>10} {'oz (koz)':>10} {'Quartile':<12} {'vs Median':>10}")
print(f"  {'─' * 72}")
for _, row in gold_aisc.iterrows():
    vs_med = row["aisc"] - gold_median
    print(f"  {row['entity_name']:<22} ${row['aisc']:>7,.0f} ${row['net_aisc']:>9,.0f} "
          f"{row['ounces_produced_koz']:>9,.0f} {row['cost_quartile']:<12} ${vs_med:>+8,.0f}")
print(f"  {'─' * 72}")
print(f"  Industry Median: ${gold_median:,.0f}/oz\n")

print("  Copper Mines (USD/lb):")
cu_median = copper_aisc["aisc"].median() if not copper_aisc.empty else 0
print(f"  {'Mine':<22} {'AISC':>8} {'Net AISC':>10} {'kt':>8} {'Quartile':<12} {'vs Median':>10}")
print(f"  {'─' * 68}")
for _, row in copper_aisc.iterrows():
    vs_med = row["aisc"] - cu_median
    oz = row["ounces_produced_koz"]
    print(f"  {row['entity_name']:<22} ${row['aisc']:>7,.2f} ${row['net_aisc']:>9,.2f} "
          f"{oz:>7,.0f} {row['cost_quartile']:<12} ${vs_med:>+8,.2f}")
print(f"  {'─' * 68}")
print(f"  Industry Median: ${cu_median:,.2f}/lb")

# %%
# Cell 7 — Signal Score Calculation
# ==================================
print("\n" + "=" * 70)
print("SIGNAL SCORE CALCULATION")
print("=" * 70)

def calculate_signal_score(row, pdf_res, pdf_prod, pdf_aisc_co, commodity_price=None):
    """Calculate composite signal score for a company."""
    scores = {}

    # Grade signal
    co_res = pdf_res.merge(
        pdf_mines_pd[["mine_name", "company_name"]], on="mine_name", how="inner"
    )
    co_res = co_res[co_res["company_name"] == row["name"]]
    if not co_res.empty:
        avg_grade = (co_res["grade"] * co_res["tonnage_kt"]).sum() / co_res["tonnage_kt"].sum()
        pp = co_res[co_res["is_reserve"] == True]
        pp_ton = pp["tonnage_kt"].sum()
        all_ton = co_res["tonnage_kt"].sum()
        conv = pp_ton / all_ton if all_ton > 0 else 0
        scores["grade"] = min(100, max(0, (avg_grade / 5.0) * 50 + (conv * 100)))
    else:
        scores["grade"] = 50.0

    # Cost signal
    co_aisc = pdf_aisc_co[pdf_aisc_co["entity_name"].isin(
        pdf_mines_pd[pdf_mines_pd["company_name"] == row["name"]]["mine_name"].tolist()
    )]
    if not co_aisc.empty:
        latest_aisc = co_aisc.iloc[0]["aisc"] if len(co_aisc) > 0 else gold_median
        if gold_median > 0:
            scores["cost"] = min(100, max(0, 100 - (latest_aisc / gold_median) * 50))
        else:
            scores["cost"] = 50.0
    else:
        scores["cost"] = 50.0

    # Production signal
    co_prod = pdf_production[pdf_production["company_name"] == row["name"]]
    if not co_prod.empty:
        beat_guidance = co_prod["beat_guidance"].astype(int).sum()
        total = len(co_prod)
        scores["production"] = (beat_guidance / total * 100) if total > 0 else 50
    else:
        scores["production"] = 50.0

    # Growth signal
    if not co_res.empty:
        pp_ton = co_res[co_res["is_reserve"] == True]["tonnage_kt"].sum()
        all_ton = co_res["tonnage_kt"].sum()
        scores["growth"] = min(100, (pp_ton / all_ton * 150)) if all_ton > 0 else 50
    else:
        scores["growth"] = 50.0

    # ESG signal
    scores["esg"] = row["esg_score"] if pd.notna(row["esg_score"]) else 50.0

    # Weighted composite
    composite = (
        scores["grade"] * SIGNAL_WEIGHTS["grade"]
        + scores["cost"] * SIGNAL_WEIGHTS["cost"]
        + scores["production"] * SIGNAL_WEIGHTS["production"]
        + scores["growth"] * SIGNAL_WEIGHTS["growth"]
        + scores["esg"] * SIGNAL_WEIGHTS["esg"]
    )

    # Rating
    if composite >= 80: rating = "Strong Buy"
    elif composite >= 65: rating = "Buy"
    elif composite >= 50: rating = "Hold"
    elif composite >= 35: rating = "Underperform"
    else: rating = "Sell"

    return composite, scores, rating

gold_price = pdf_prices[pdf_prices["commodity"] == "Gold"]["price"].iloc[0] if not pdf_prices.empty else 2340

for _, company in pdf_companies.iterrows():
    if company["name"] not in TARGET_COMPANIES:
        continue
    composite, scores, rating = calculate_signal_score(
        company, pdf_reserves, pdf_production, pdf_aisc, gold_price
    )
    print(f"\n  {company['name']} ({company['ticker']}) — {rating}")
    print(f"    Composite: {composite:.1f}/100")
    for k, v in scores.items():
        bar = "▓" * int(v / 5) + "░" * (20 - int(v / 5))
        print(f"    {k.capitalize():<12} {v:>5.1f}  |{bar}|")

# %%
# Cell 8 — AI Foundry Agent: Mining Intelligence Analyst
# =======================================================
import json
import time

try:
    from openai import OpenAI

    ai_client = OpenAI(
        api_key=AZURE_AI_KEY,
        base_url=f"{AZURE_AI_ENDPOINT}/openai/deployments/{AZURE_AI_DEPLOYMENT}",
        default_headers={"api-key": AZURE_AI_KEY},
    )
    print(f"✓ AI Foundry client initialized: {AZURE_AI_DEPLOYMENT}")
except Exception as e:
    print(f"✗ AI client error: {e}")
    ai_client = None

ANALYSIS_PROMPT = """You are a senior mining equity research analyst. Analyze the following
mining company data and provide a concise investment intelligence briefing.

Structure your response as:
## Company Overview
(2-3 sentences on positioning)

## Reserve Quality Assessment
(Grade quality, reserve life, conversion potential)

## Cost Competitiveness
(AISC quartile, by-product credits, margin analysis)

## Production Execution
(Guidance track record, recovery efficiency, growth trajectory)

## Key Risks
(Top 3 risks with severity: HIGH/MEDIUM/LOW)

## Signal Assessment
(Confirm or challenge the computed signal score with rationale)

Company Data:
{context}

Current Commodity Prices:
{prices}

Computed Signal Score: {score}/100 ({rating})
"""

# %%
# Cell 9 — Run AI Analysis per Company
# =====================================
import uuid

analysis_results = []

for _, company in pdf_companies.iterrows():
    if company["name"] not in TARGET_COMPANIES:
        continue

    print(f"\n{'─' * 50}")
    print(f"Analyzing: {company['name']}...")
    print(f"{'─' * 50}")

    # Build context
    co_mines = pdf_mines_pd[pdf_mines_pd["company_name"] == company["name"]]
    co_reserves = pdf_reserves.merge(co_mines[["mine_name"]], on="mine_name", how="inner")
    co_production = pdf_production[pdf_production["company_name"] == company["name"]]
    co_aisc = pdf_aisc[pdf_aisc["entity_name"].isin(co_mines["mine_name"].tolist())]

    context_lines = [
        f"Company: {company['name']} ({company['ticker']})",
        f"Tier: {company['company_tier']} | Sector: {company['sector']}",
        f"HQ: {company['headquarters']} | Exchange: {company['listing_exchange']}",
        f"Market Cap: ${company['market_cap_usd'] / 1e9:.1f}B" if pd.notna(company['market_cap_usd']) else "",
        f"Employees: {int(company['employees']):,}" if pd.notna(company['employees']) else "",
        f"ESG Score: {company['esg_score']}/100" if pd.notna(company['esg_score']) else "",
        "",
        f"Mines ({len(co_mines)}):",
    ]
    for _, m in co_mines.iterrows():
        context_lines.append(f"  - {m['mine_name']} ({m['country']}): {m['status']}, {m['processing_method']}")

    if not co_reserves.empty:
        pp = co_reserves[co_reserves["is_reserve"] == True]
        context_lines.append(f"\nReserves (P+P): {pp['tonnage_kt'].sum():,.0f} kt, {pp['contained_metal'].sum():,.0f} contained")

    if not co_production.empty:
        total_prod = co_production["metal_produced"].sum()
        context_lines.append(f"Latest Production: {total_prod:,.1f} {co_production.iloc[0]['metal_unit']}")

    if not co_aisc.empty:
        latest = co_aisc.iloc[0]
        context_lines.append(f"AISC: ${latest['aisc']:,.0f} {latest['cost_unit']} ({latest['cost_quartile']})")

    context = "\n".join(context_lines)
    prices_str = "\n".join(f"  {r['commodity']}: ${r['price']:,.2f} {r['unit']}" for _, r in pdf_prices.iterrows())
    composite, scores, rating = calculate_signal_score(
        company, pdf_reserves, pdf_production, pdf_aisc, gold_price
    )

    if ai_client:
        prompt = ANALYSIS_PROMPT.format(context=context, prices=prices_str, score=f"{composite:.1f}", rating=rating)
        try:
            start_time = time.time()
            response = ai_client.chat.completions.create(
                model=AZURE_AI_DEPLOYMENT,
                messages=[
                    {"role": "system", "content": "You are a senior mining equity research analyst with 20 years of experience."},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.3,
                max_tokens=1500,
            )
            elapsed = time.time() - start_time
            analysis_md = response.choices[0].message.content
            tokens_used = response.usage.total_tokens if response.usage else 0

            analysis_results.append({
                "analysis_id": str(uuid.uuid4()),
                "company_name": company["name"],
                "analysis_type": "intelligence_briefing",
                "commodity": ", ".join(company["primary_commodities"]),
                "ai_model": AZURE_AI_DEPLOYMENT,
                "analysis_markdown": analysis_md,
                "confidence_level": "HIGH" if composite >= 60 else "MEDIUM",
            })

            print(f"✓ Analysis complete ({elapsed:.1f}s, {tokens_used} tokens)")
            print(analysis_md[:500] + "...")

        except Exception as e:
            print(f"✗ AI analysis failed: {e}")
    else:
        print("  Skipping AI analysis (no client)")

# %%
# Cell 10 — AI Comparative Analysis Agent
# ========================================
COMPARATIVE_PROMPT = """You are a senior mining sector strategist. Compare the following mining
companies and identify the most attractive investment opportunity.

For each company, assess:
1. Reserve quality and mine life
2. Cost position (AISC quartile)
3. Production growth trajectory
4. Commodity diversification
5. ESG and jurisdictional risk

Provide a ranked recommendation with clear rationale.

Company Data:
{company_data}

Signal Scores:
{signal_scores}

Commodity Price Context:
{prices}
"""

# Build comparative context
co_data_lines = []
signal_lines = []
for _, company in pdf_companies.iterrows():
    if company["name"] not in TARGET_COMPANIES:
        continue
    composite, scores, rating = calculate_signal_score(
        company, pdf_reserves, pdf_production, pdf_aisc, gold_price
    )
    co_data_lines.append(f"### {company['name']} ({company['ticker']})")
    co_data_lines.append(f"Tier: {company['company_tier']} | Sector: {company['sector']}")

    co_mines = pdf_mines_pd[pdf_mines_pd["company_name"] == company["name"]]
    co_reserves = pdf_reserves.merge(co_mines[["mine_name"]], on="mine_name", how="inner")
    pp = co_reserves[co_reserves["is_reserve"] == True]
    if not pp.empty:
        co_data_lines.append(f"P/P Reserves: {pp['tonnage_kt'].sum():,.0f} kt")

    co_prod = pdf_production[pdf_production["company_name"] == company["name"]]
    if not co_prod.empty:
        co_data_lines.append(f"Production: {co_prod['metal_produced'].sum():,.0f} {co_prod.iloc[0]['metal_unit']}")

    co_data_lines.append(f"Active Mines: {len(co_mines)}")
    co_data_lines.append("")

    signal_lines.append(f"- {company['name']}: {composite:.1f}/100 ({rating})")

comparative_md = "No comparative analysis generated."

if ai_client:
    print("Running Comparative Analysis Agent...")
    try:
        comp_prompt = COMPARATIVE_PROMPT.format(
            company_data="\n".join(co_data_lines),
            signal_scores="\n".join(signal_lines),
            prices=prices_str,
        )
        start = time.time()
        response = ai_client.chat.completions.create(
            model=AZURE_AI_DEPLOYMENT,
            messages=[
                {"role": "system", "content": "You are a senior mining sector strategist."},
                {"role": "user", "content": comp_prompt},
            ],
            temperature=0.2,
            max_tokens=2000,
        )
        comparative_md = response.choices[0].message.content
        elapsed = time.time() - start
        print(f"✓ Comparative analysis complete ({elapsed:.1f}s)")
        print(comparative_md[:800] + "...")
    except Exception as e:
        print(f"✗ Comparative analysis failed: {e}")

# %%
# Cell 11 — Write Signal Scores to Delta
# =======================================
from pyspark.sql.types import *

signal_rows = []
for _, company in pdf_companies.iterrows():
    composite, scores, rating = calculate_signal_score(
        company, pdf_reserves, pdf_production, pdf_aisc, gold_price
    )
    signal_rows.append((
        str(uuid.uuid4()),
        company["name"],
        company["ticker"],
        company["company_tier"],
        composite,
        scores.get("grade", 50),
        scores.get("cost", 50),
        scores.get("production", 50),
        scores.get("growth", 50),
        scores.get("esg", 50),
        rating,
        gold_price,
    ))

signal_schema = StructType([
    StructField("score_id", StringType()),
    StructField("company_name", StringType()),
    StructField("ticker", StringType()),
    StructField("company_tier", StringType()),
    StructField("composite_score", DoubleType()),
    StructField("grade_score", DoubleType()),
    StructField("cost_score", DoubleType()),
    StructField("production_score", DoubleType()),
    StructField("growth_score", DoubleType()),
    StructField("esg_score", DoubleType()),
    StructField("rating", StringType()),
    StructField("commodity_price_at_calc", DoubleType()),
])

df_signals = spark.createDataFrame(signal_rows, signal_schema)
df_signals.write.mode("append").format("delta").saveAsTable(f"{LAKEHOUSE_NAME}.signal_scores")
print(f"✓ Wrote {len(signal_rows)} signal scores to Delta")

# %%
# Cell 12 — Write AI Analyses to Delta
# =====================================
if analysis_results:
    ai_schema = StructType([
        StructField("analysis_id", StringType()),
        StructField("company_name", StringType()),
        StructField("analysis_type", StringType()),
        StructField("commodity", StringType()),
        StructField("ai_model", StringType()),
        StructField("analysis_markdown", StringType()),
        StructField("confidence_level", StringType()),
    ])

    df_ai = spark.createDataFrame(analysis_results, ai_schema)
    df_ai.write.mode("append").format("delta").saveAsTable(f"{LAKEHOUSE_NAME}.ai_analyses")
    print(f"✓ Wrote {len(analysis_results)} AI analyses to Delta")

# Write comparative
if comparative_md != "No comparative analysis generated.":
    comp_row = [(
        str(uuid.uuid4()),
        TARGET_COMPANIES,
        ["Gold", "Copper", "Silver"],
        comparative_md,
        json.dumps({r["company_name"]: r for r in signal_rows if isinstance(r, dict)}),
        AZURE_AI_DEPLOYMENT,
    )]

    comp_schema = StructType([
        StructField("comparison_id", StringType()),
        StructField("companies", ArrayType(StringType())),
        StructField("commodities", ArrayType(StringType())),
        StructField("comparative_markdown", StringType()),
        StructField("signal_scores_json", StringType()),
        StructField("ai_model", StringType()),
    ])

    df_comp = spark.createDataFrame(comp_row, comp_schema)
    df_comp.write.mode("append").format("delta").saveAsTable(f"{LAKEHOUSE_NAME}.ai_comparative")
    print("✓ Wrote comparative analysis to Delta")

# %%
# Cell 13 — Pipeline Run Log
# ===========================
import time as time_mod

run_id = str(uuid.uuid4())
run_log = spark.createDataFrame([(
    run_id,
    "mining_intelligence",
    "completed",
    len(TARGET_COMPANIES),
    pdf_companies.count() + pdf_reserves.count() + pdf_production.count() + pdf_prices.count(),
    json.dumps([]),
    0.0,  # duration filled below
    None,
)]).toDF("run_id", "run_type", "status", "companies_processed",
         "records_ingested", "errors_json", "duration_seconds", "started_at")

run_log.write.mode("append").format("delta").saveAsTable(f"{LAKEHOUSE_NAME}.pipeline_runs")
print(f"✓ Pipeline run logged: {run_id[:8]}...")

# %%
# Cell 14 — Final Summary Dashboard
# ==================================
print("\n" + "=" * 70)
print("  MINESCOPE.SIGNAL — PIPELINE COMPLETE")
print("=" * 70)

print(f"\n  Companies analyzed:  {len(TARGET_COMPANIES)}")
print(f"  Reserve records:     {pdf_reserves.count()}")
print(f"  Production records:  {pdf_production.count()}")
print(f"  AISC metrics:        {pdf_aisc.count()}")
print(f"  AI analyses:         {len(analysis_results)}")
print(f"  Comparative:         ✓")

print(f"\n  SIGNAL SCORE RANKINGS:")
print(f"  {'─' * 50}")
ranked = sorted(signal_rows, key=lambda x: x[4], reverse=True)
for r in ranked:
    bar = "▓" * int(r[4] / 5) + "░" * (20 - int(r[4] / 5))
    print(f"  {r[1]:<25} {r[4]:>5.1f}/100  {r[10]:<14} |{bar}|")

print(f"\n  ✓ All results persisted to Lakehouse: {LAKEHOUSE_NAME}")
print(f"  ✓ Pipeline run ID: {run_id[:8]}...")
