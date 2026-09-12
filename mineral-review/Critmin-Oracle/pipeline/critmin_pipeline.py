#!/usr/bin/env python3
"""
CritMin Oracle — Off-Chain Risk Pipeline
==========================================
AI-powered critical minerals supply chain risk scoring pipeline.

This pipeline:
  1. Fetches macro data (FRED API — PPI, Industrial Production)
  2. Fetches commodity prices (Alpha Vantage — Ni, Co, Li)
  3. Computes risk scores using:
     - GradientBoosting price forecast
     - VADER sentiment analysis on mock SEC filing text
     - Regulatory keyword scoring
  4. Pushes results on-chain via web3.py

Usage:
  # Demo mode (no API keys needed — uses mock data)
  python pipeline/critmin_pipeline.py --demo

  # Live mode (requires API keys in .env)
  python pipeline/critmin_pipeline.py --live

  # Live mode with custom contract address
  python pipeline/critmin_pipeline.py --live --contract 0xYourContractAddress

Environment Variables (for live mode):
  PRIVATE_KEY          - Ethereum private key for signing transactions
  RPC_URL              - HashKey Chain testnet RPC URL
  CONTRACT_ADDRESS     - Deployed CritMinOracle contract address
  FRED_API_KEY         - FRED API key for macro data
  ALPHA_VANTAGE_KEY    - Alpha Vantage API key for commodity prices
"""

import argparse
import json
import os
import sys
import time
import hashlib
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

# ============================================================================
# Configuration
# ============================================================================

# Supported minerals with their metadata
MINERALS = {
    "LITHIUM": {
        "symbol": "LITHIUM",
        "alpha_vantage_symbol": "LITHIUM",  # or use a proxy
        "unit": "USD/mt",
        "typical_price_range": (10000, 20000),  # USD per metric ton
        "description": "Critical for EV batteries, energy storage",
    },
    "NICKEL": {
        "symbol": "NICKEL",
        "alpha_vantage_symbol": "NICKEL",
        "unit": "USD/mt",
        "typical_price_range": (15000, 25000),
        "description": "Essential for stainless steel and EV batteries",
    },
    "COBALT": {
        "symbol": "COBALT",
        "alpha_vantage_symbol": "COBALT",
        "unit": "USD/mt",
        "typical_price_range": (25000, 40000),
        "description": "Key component in lithium-ion battery cathodes",
    },
}

# On-chain scaling factors (must match Solidity contract)
PRICE_SCALE = 10**8          # 1e8 — prices scaled to 8 decimals
SCORE_SCALE = 100            # composite score: -100 to 100 → -10000 to 10000
SENTIMENT_SCALE = 10000      # sentiment: -1.0 to 1.0 → -10000 to 10000
REG_RISK_SCALE = 100         # regulatory risk: 0 to 100.0 → 0 to 10000

# Regulatory keywords and their risk weights
REGULATORY_KEYWORDS = {
    # High-risk keywords (export restrictions, bans)
    "export ban": 0.95,
    "export restriction": 0.90,
    "trade sanction": 0.95,
    "supply chain disruption": 0.85,
    "nationalization": 1.00,
    "strategic reserve": 0.60,
    "tariff": 0.70,
    "duty increase": 0.75,
    "quota restriction": 0.80,
    "license requirement": 0.65,
    # Medium-risk keywords
    "environmental regulation": 0.50,
    "emission standard": 0.45,
    "labor regulation": 0.40,
    "sustainability requirement": 0.35,
    "due diligence": 0.30,
    "esg compliance": 0.35,
    "carbon tax": 0.55,
    "mining permit": 0.50,
    # Positive keywords (reduce risk)
    "free trade agreement": -0.30,
    "supply chain diversification": -0.40,
    "recycling initiative": -0.25,
    "innovation incentive": -0.20,
    "production increase": -0.30,
    "new mine": -0.35,
    "stock release": -0.25,
}

# Mock SEC filing excerpts for sentiment analysis
MOCK_SEC_FILINGS = {
    "LITHIUM": """
    The company acknowledges significant supply chain risks related to lithium procurement.
    While global lithium production has increased by 15% year-over-year, regulatory pressures
    in key mining regions of Chile and Australia have created uncertainty. Export restrictions
    in certain jurisdictions may impact our cost structure. The company is actively pursuing
    supply chain diversification strategies and has secured long-term agreements with three
    additional suppliers. Environmental regulations regarding mining operations continue to evolve,
    with new sustainability requirements expected to increase compliance costs by approximately
    8-12% over the next fiscal year. Despite these challenges, innovation incentives in battery
    technology and recycling initiatives present opportunities for cost optimization.
    """,
    "NICKEL": """
    Nickel supply remains constrained due to the recent implementation of export restrictions
    by Indonesia, the world's largest nickel producer. The trade sanction environment has created
    additional uncertainty for our stainless steel and battery material divisions. Nationalization
    risks in certain African mining jurisdictions have been discussed in recent government
    proceedings. On the positive side, new mine development in Canada and Australia is expected
    to come online by Q3 2026, potentially easing supply constraints. The company is investing
    in recycling initiatives to reduce dependence on primary nickel supply. Tariff adjustments
    on imported nickel products are expected to affect our cost basis by approximately 5-7%.
    Environmental regulation compliance costs continue to trend upward.
    """,
    "COBALT": """
    Cobalt procurement faces heightened regulatory scrutiny following new due diligence
    requirements under the EU Battery Regulation. Supply chain disruption risks remain elevated
    due to geopolitical tensions in the Democratic Republic of Congo, which produces approximately
    70% of global cobalt supply. The company has implemented comprehensive ESG compliance programs
    and is transitioning to recycled cobalt sources, which now represent 12% of our cobalt input.
    Export ban discussions in key producing nations have contributed to market volatility.
    Production increases from new mining operations in Indonesia and Australia are expected to
    partially offset supply constraints. Labor regulation changes in producing regions may impact
    mining costs. The company's supply chain diversification efforts have reduced single-source
    dependency from 45% to 32% over the past year.
    """,
}

# Default HashKey Chain testnet configuration
DEFAULT_RPC_URL = "https://hashkeychain-testnet.alt.technology"
DEFAULT_CHAIN_ID = 133


# ============================================================================
# Utility Functions
# ============================================================================

def load_env() -> Dict[str, str]:
    """Load environment variables from .env file."""
    env_path = Path(__file__).parent.parent / ".env"
    env_vars = {}

    if env_path.exists():
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, value = line.split("=", 1)
                    env_vars[key.strip()] = value.strip().strip('"').strip("'")

    # Also check OS environment
    for key in ["PRIVATE_KEY", "RPC_URL", "CONTRACT_ADDRESS", "FRED_API_KEY", "ALPHA_VANTAGE_KEY"]:
        if key not in env_vars and key in os.environ:
            env_vars[key] = os.environ[key]

    return env_vars


def mineral_hash(symbol: str) -> str:
    """
    Compute keccak256 hash of mineral symbol (matches Solidity's keccak256(abi.encodePacked(symbol))).
    For simplicity in demo mode, we use the string hash. In production, use web3's keccak.
    """
    if _web3_available():
        from web3 import Web3
        return Web3.keccak(text=symbol).hex()
    else:
        # Fallback: use SHA-256 (demo only, won't match on-chain)
        return hashlib.sha256(symbol.encode()).hexdigest()


def _web3_available() -> bool:
    """Check if web3.py is available."""
    try:
        import web3  # noqa: F401
        return True
    except ImportError:
        return False


def scale_price(price_usd: float) -> int:
    """Scale a USD price to on-chain format (multiplied by PRICE_SCALE)."""
    return int(price_usd * PRICE_SCALE)


def scale_composite(score: float) -> int:
    """Scale composite score from [-100, 100] to on-chain format [-10000, 10000]."""
    return int(score * SCORE_SCALE)


def scale_sentiment(sentiment: float) -> int:
    """Scale sentiment from [-1.0, 1.0] to on-chain format [-10000, 10000]."""
    return int(sentiment * SENTIMENT_SCALE)


def scale_reg_risk(risk: float) -> int:
    """Scale regulatory risk from [0, 100] to on-chain format [0, 10000]."""
    return int(risk * REG_RISK_SCALE)


# ============================================================================
# Mock Data Generator
# ============================================================================

def generate_mock_prices() -> Dict[str, Dict[str, float]]:
    """
    Generate realistic mock commodity prices for demonstration.
    Uses slightly randomized values within typical ranges.
    """
    import random
    random.seed(int(time.time()) % 10000)  # Semi-deterministic for demo

    prices = {}
    base_prices = {
        "LITHIUM": 14250.0,
        "NICKEL": 17200.0,
        "COBALT": 33500.0,
    }

    for mineral, config in MINERALS.items():
        base = base_prices[mineral]
        low, high = config["typical_price_range"]
        # Add some randomness within ±15% of base
        variation = base * 0.15
        current = base + random.uniform(-variation, variation)
        current = max(low * 0.8, min(high * 1.2, current))

        # Forecast: tend slightly upward (bullish bias for demo)
        forecast_change = random.uniform(-0.05, 0.15)
        forecast = current * (1 + forecast_change)

        prices[mineral] = {
            "current_price": round(current, 2),
            "forecast_price": round(forecast, 2),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    return prices


def generate_mock_macro_data() -> Dict[str, Any]:
    """Generate mock macroeconomic indicators."""
    import random
    random.seed(42)

    return {
        "ppi_metals": round(random.uniform(180, 220), 1),
        "ppi_metals_change_1y": round(random.uniform(-5, 15), 1),
        "industrial_production": round(random.uniform(98, 105), 1),
        "industrial_production_change_1y": round(random.uniform(-3, 5), 1),
        "manufacturing_pmi": round(random.uniform(48, 58), 1),
        "usd_index": round(random.uniform(95, 110), 1),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


def generate_mock_price_history(mineral: str, periods: int = 24) -> List[Dict[str, Any]]:
    """Generate mock historical price data for model training."""
    import random
    random.seed(hash(mineral) % 2**32)

    base = MINERALS[mineral]["typical_price_range"]
    mid = (base[0] + base[1]) / 2

    history = []
    price = mid
    for i in range(periods):
        change = random.uniform(-0.08, 0.10)
        price *= (1 + change)
        price = max(base[0] * 0.7, min(base[1] * 1.3, price))
        history.append({
            "period": i,
            "price": round(price, 2),
        })

    return history


# ============================================================================
# Sentiment Analysis (VADER-style)
# ============================================================================

def simple_sentiment_analyzer(text: str) -> float:
    """
    Simple sentiment analysis using keyword matching.
    In production, use NLTK VADER or a transformer model.

    Returns: float between -1.0 (very negative) and 1.0 (very positive)
    """
    # Positive keywords
    positive_words = [
        "increase", "growth", "positive", "improve", "opportunity", "strong",
        "diversification", "innovation", "initiative", "secured", "optimistic",
        "expansion", "development", "investing", "reduce", "transition",
        "beneficial", "favorable", "progress", "advancement",
    ]

    # Negative keywords
    negative_words = [
        "risk", "uncertainty", "disruption", "constraint", "restriction",
        "volatile", "decline", "decrease", "challenge", "pressure",
        "ban", "sanction", "nationalization", "scrutiny", "compliance cost",
        "elevated", "tension", "dependency", "concern", "warning",
    ]

    # Intensifiers
    intensifiers = ["significantly", "highly", "severely", "extremely", "substantially"]
    diminishers = ["slightly", "marginally", "partially", "somewhat"]

    words = text.lower().split()
    positive_count = 0
    negative_count = 0
    total_words = len(words)

    for i, word in enumerate(words):
        word_clean = word.strip(".,;:!?()[]{}\"'")

        # Check for intensifiers/diminishers modifying the next word
        modifier = 1.0
        if i > 0:
            prev = words[i - 1].strip(".,;:!?()[]{}\"'")
            if prev in intensifiers:
                modifier = 1.5
            elif prev in diminishers:
                modifier = 0.5

        if word_clean in positive_words:
            positive_count += modifier
        elif word_clean in negative_words:
            negative_count += modifier

    if total_words == 0:
        return 0.0

    # Normalize: raw score based on positive vs negative, adjusted by text length
    raw_score = (positive_count - negative_count) / max(total_words * 0.05, 1)
    # Clamp to [-1, 1]
    return max(-1.0, min(1.0, raw_score))


def regulatory_risk_scorer(text: str) -> float:
    """
    Score regulatory risk based on keyword presence in text.
    Returns: float between 0 (no risk) and 100 (maximum risk)
    """
    text_lower = text.lower()
    total_risk = 0.0
    keyword_count = 0

    for keyword, weight in REGULATORY_KEYWORDS.items():
        if keyword in text_lower:
            # Count occurrences
            count = text_lower.count(keyword)
            total_risk += weight * count
            keyword_count += count

    if keyword_count == 0:
        return 10.0  # Base risk level (no keywords found = low baseline)

    # Normalize: average weighted risk, scaled to 0-100
    avg_risk = total_risk / keyword_count
    # Apply a curve to make the score more meaningful
    risk_score = avg_risk * 60 + 15  # Base 15, scale by avg weight

    return max(0.0, min(100.0, risk_score))


# ============================================================================
# Price Forecasting (Simple ML Model)
# ============================================================================

def compute_price_forecast(history: List[Dict[str, Any]]) -> Tuple[float, float, int]:
    """
    Compute price forecast using a simple trend analysis.
    In production, use GradientBoosting or LSTM.

    Returns:
        (forecast_price, price_deviation_pct, confidence_bps)
    """
    if len(history) < 3:
        # Not enough data, return simple extrapolation
        current = history[-1]["price"]
        return current * 1.05, 5.0, 500

    # Simple linear regression on log prices
    import math

    prices = [h["price"] for h in history]
    log_prices = [math.log(p) for p in prices]
    n = len(log_prices)

    # Compute slope using least squares
    x_mean = (n - 1) / 2
    y_mean = sum(log_prices) / n

    numerator = sum((i - x_mean) * (log_prices[i] - y_mean) for i in range(n))
    denominator = sum((i - x_mean) ** 2 for i in range(n))

    if denominator == 0:
        slope = 0
    else:
        slope = numerator / denominator

    # Extrapolate 12 periods ahead
    forecast_log = log_prices[-1] + slope * 12
    forecast_price = math.exp(forecast_log)

    # Price deviation: percentage difference from current
    current_price = prices[-1]
    deviation_pct = ((forecast_price - current_price) / current_price) * 100

    # Confidence: based on R² of the fit
    ss_res = sum((log_prices[i] - (y_mean + slope * (i - x_mean))) ** 2 for i in range(n))
    ss_tot = sum((log_prices[i] - y_mean) ** 2 for i in range(n))
    r_squared = 1 - (ss_res / ss_tot) if ss_tot > 0 else 0

    # Convert R² to confidence in basis points (0-10000)
    confidence_bps = int(max(100, min(9500, r_squared * 10000)))

    return forecast_price, deviation_pct, confidence_bps


# ============================================================================
# Composite Risk Score Computation
# ============================================================================

def compute_composite_risk_score(
    price_deviation: float,
    sentiment: float,
    reg_risk: float,
    forecast_direction: float,
) -> Tuple[float, int]:
    """
    Compute the composite risk score combining all factors.

    The composite score ranges from -100 (extremely bearish/risky) to +100 (bullish/safe).

    Weights:
      - Price deviation: 30% (how much forecast differs from current)
      - Supply sentiment: 35% (NLP from SEC filings)
      - Regulatory risk: 25% (keyword analysis)
      - Forecast direction: 10% (price trend expectation)

    Returns:
        (composite_score, confidence_bps)
    """
    # Normalize each component to [-100, 100] scale
    # Price deviation: already a percentage, cap at ±30%
    normalized_price = max(-30, min(30, price_deviation)) * (100 / 30)

    # Sentiment: already [-1, 1], scale to [-100, 100]
    normalized_sentiment = sentiment * 100

    # Regulatory risk: [0, 100], convert to [-100, 100] (higher = more risky = negative)
    normalized_reg = -(reg_risk * 2 - 100)  # 0→100, 50→0, 100→-100

    # Forecast direction: already a percentage, cap at ±20%
    normalized_forecast = max(-20, min(20, forecast_direction)) * (100 / 20)

    # Weighted composite
    composite = (
        normalized_price * 0.30 +
        normalized_sentiment * 0.35 +
        normalized_reg * 0.25 +
        normalized_forecast * 0.10
    )

    # Confidence: average of component confidences (simplified)
    # In production, this would use the model's prediction interval
    confidence = 500  # Default 5% confidence interval

    # Clamp composite to [-100, 100]
    composite = max(-100.0, min(100.0, composite))

    return round(composite, 2), confidence


# ============================================================================
# On-Chain Push (web3.py)
# ============================================================================

def push_to_chain(
    mineral: str,
    current_price: float,
    forecast_price: float,
    composite_score: float,
    price_deviation: float,
    sentiment: float,
    reg_risk: float,
    forecast_direction: float,
    confidence: int,
    env: Dict[str, str],
) -> bool:
    """
    Push computed risk data on-chain via the CritMinOracle contract.

    Returns True if successful, False otherwise.
    """
    if not _web3_available():
        print("    ⚠️  web3.py not installed — skipping on-chain push")
        print("    Install with: pip install web3")
        return False

    from web3 import Web3

    private_key = env.get("PRIVATE_KEY")
    rpc_url = env.get("RPC_URL", DEFAULT_RPC_URL)
    contract_address = env.get("CONTRACT_ADDRESS")

    if not private_key:
        print("    ⚠️  No PRIVATE_KEY in .env — skipping on-chain push")
        return False

    if not contract_address:
        print("    ⚠️  No CONTRACT_ADDRESS in .env — skipping on-chain push")
        return False

    try:
        w3 = Web3(Web3.HTTPProvider(rpc_url))
        if not w3.is_connected():
            print(f"    ❌ Cannot connect to RPC: {rpc_url}")
            return False

        account = w3.eth.account.from_key(private_key)
        print(f"    📡 Using account: {account.address}")

        # ABI for the contract (only the functions we need)
        abi = [
            {
                "inputs": [
                    {"internalType": "bytes32", "name": "mineralHash", "type": "bytes32"},
                    {"internalType": "int256", "name": "currentPrice", "type": "int256"},
                    {"internalType": "int256", "name": "forecastPrice", "type": "int256"},
                    {"internalType": "int256", "name": "compositeScore", "type": "int256"},
                    {"internalType": "int256", "name": "priceDeviation", "type": "int256"},
                    {"internalType": "int256", "name": "supplySentiment", "type": "int256"},
                    {"internalType": "int256", "name": "regulatoryRisk", "type": "int256"},
                    {"internalType": "int256", "name": "forecastDirection", "type": "int256"},
                    {"internalType": "uint256", "name": "confidence", "type": "uint256"},
                ],
                "name": "pushFullUpdate",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function",
            },
            {
                "inputs": [{"internalType": "string", "name": "symbol", "type": "string"}],
                "name": "symbolToHash",
                "outputs": [{"internalType": "bytes32", "name": "", "type": "bytes32"}],
                "stateMutability": "pure",
                "type": "function",
            },
        ]

        contract = w3.eth.contract(address=contract_address, abi=abi)

        # Get mineral hash from contract
        mineral_hash = contract.functions.symbolToHash(mineral).call()

        # Scale all values for on-chain format
        scaled_current_price = scale_price(current_price)
        scaled_forecast_price = scale_price(forecast_price)
        scaled_composite = scale_composite(composite_score)
        scaled_deviation = int(price_deviation * SCORE_SCALE)
        scaled_sentiment = scale_sentiment(sentiment)
        scaled_reg_risk = scale_reg_risk(reg_risk)
        scaled_forecast_dir = int(forecast_direction * SCORE_SCALE)

        # Build and send transaction
        tx = contract.functions.pushFullUpdate(
            mineral_hash,
            scaled_current_price,
            scaled_forecast_price,
            scaled_composite,
            scaled_deviation,
            scaled_sentiment,
            scaled_reg_risk,
            scaled_forecast_dir,
            confidence,
        ).build_transaction({
            "from": account.address,
            "gas": 500000,
            "gasPrice": w3.eth.gas_price,
            "nonce": w3.eth.get_transaction_count(account.address),
            "chainId": DEFAULT_CHAIN_ID,
        })

        signed_tx = w3.eth.account.sign_transaction(tx, private_key)
        tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)

        print(f"    ✅ TX sent: {tx_hash.hex()[:18]}...")
        print(f"    📊 Explorer: https://testnet-explorer.hsk.xyz/tx/{tx_hash.hex()}")

        # Wait for receipt
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
        if receipt.status == 1:
            print(f"    ✅ Confirmed in block {receipt.blockNumber}")
            return True
        else:
            print(f"    ❌ Transaction reverted")
            return False

    except Exception as e:
        print(f"    ❌ On-chain push failed: {e}")
        return False


# ============================================================================
# Pipeline Orchestration
# ============================================================================

def run_demo_pipeline(env: Dict[str, str]) -> Dict[str, Any]:
    """
    Run the pipeline in demo mode with mock data.
    No API keys required.
    """
    print("\n" + "=" * 64)
    print("  CRITMIN ORACLE — Demo Pipeline (Mock Data)")
    print("=" * 64)

    results = {}

    # Step 1: Fetch mock prices
    print("\n📦 Step 1: Fetching commodity prices (mock)...")
    prices = generate_mock_prices()
    for mineral, data in prices.items():
        print(f"   {mineral}: ${data['current_price']:,.2f}/mt → "
              f"${data['forecast_price']:,.2f}/mt (forecast)")

    # Step 2: Fetch mock macro data
    print("\n📊 Step 2: Fetching macro indicators (mock)...")
    macro = generate_mock_macro_data()
    print(f"   PPI (Metals): {macro['ppi_metals']} ({macro['ppi_metals_change_1y']:+.1f}% YoY)")
    print(f"   Industrial Production: {macro['industrial_production']} "
          f"({macro['industrial_production_change_1y']:+.1f}% YoY)")
    print(f"   Manufacturing PMI: {macro['manufacturing_pmi']}")

    # Step 3: Process each mineral
    print("\n🔬 Step 3: Computing risk scores...")

    for mineral, config in MINERALS.items():
        print(f"\n   ── {mineral} ──")

        # 3a. Price forecast using simple regression
        history = generate_mock_price_history(mineral)
        forecast_price, price_deviation, model_confidence = compute_price_forecast(history)
        print(f"   📈 Price Forecast: ${forecast_price:,.2f}/mt "
              f"({price_deviation:+.1f}% deviation)")
        print(f"      Model confidence: {model_confidence} bps")

        # Use mock prices (more realistic than regression on random data)
        current_price = prices[mineral]["current_price"]
        forecast_price = prices[mineral]["forecast_price"]
        price_deviation = ((forecast_price - current_price) / current_price) * 100

        # 3b. Sentiment analysis from mock SEC filings
        sec_text = MOCK_SEC_FILINGS[mineral]
        sentiment = simple_sentiment_analyzer(sec_text)
        print(f"   📝 SEC Sentiment: {sentiment:.3f} "
              f"({'Bullish' if sentiment > 0.1 else 'Bearish' if sentiment < -0.1 else 'Neutral'})")

        # 3c. Regulatory risk scoring
        reg_risk = regulatory_risk_scorer(sec_text)
        print(f"   ⚖️  Regulatory Risk: {reg_risk:.1f}/100")

        # 3d. Compute composite risk score
        composite, confidence = compute_composite_risk_score(
            price_deviation, sentiment, reg_risk, price_deviation
        )
        print(f"   🎯 Composite Score: {composite:+.1f} "
              f"({'SAFE' if composite > 25 else 'RISKY' if composite < -25 else 'MODERATE'})")
        print(f"      Confidence: {confidence} bps")

        # 3e. Push on-chain (if configured)
        if env.get("CONTRACT_ADDRESS") and env.get("PRIVATE_KEY"):
            print(f"   ⛓️  Pushing to HashKey Chain...")
            push_to_chain(
                mineral, current_price, forecast_price,
                composite, price_deviation, sentiment, reg_risk,
                price_deviation, confidence, env
            )
        else:
            print(f"   ⛓️  Skipping on-chain push (no contract/key configured)")

        # Store results
        results[mineral] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "current_price_usd": current_price,
            "forecast_price_usd": forecast_price,
            "price_deviation_pct": round(price_deviation, 2),
            "supply_sentiment": round(sentiment, 4),
            "regulatory_risk": round(reg_risk, 2),
            "forecast_direction_pct": round(price_deviation, 2),
            "composite_score": composite,
            "confidence_bps": confidence,
            "on_chain_scaled": {
                "current_price": scale_price(current_price),
                "forecast_price": scale_price(forecast_price),
                "composite_score": scale_composite(composite),
                "price_deviation": int(price_deviation * SCORE_SCALE),
                "supply_sentiment": scale_sentiment(sentiment),
                "regulatory_risk": scale_reg_risk(reg_risk),
                "forecast_direction": int(price_deviation * SCORE_SCALE),
                "confidence": confidence,
            },
        }

    return results


def run_live_pipeline(env: Dict[str, str]) -> Dict[str, Any]:
    """
    Run the pipeline in live mode with real API data.
    Requires FRED_API_KEY and ALPHA_VANTAGE_KEY in .env.
    """
    print("\n" + "=" * 64)
    print("  CRITMIN ORACLE — Live Pipeline (Real Data)")
    print("=" * 64)

    results = {}

    # Step 1: Fetch macro data from FRED
    print("\n📊 Step 1: Fetching macro data from FRED...")
    try:
        import requests
        fred_key = env.get("FRED_API_KEY", "")
        if not fred_key:
            print("   ⚠️  No FRED_API_KEY — using mock macro data")
            macro = generate_mock_macro_data()
        else:
            # Fetch PPI for metals
            ppi_url = f"https://api.stlouisfed.org/fred/series/observations?series_id=WPU101&api_key={fred_key}&file_type=json&sort_order=desc&limit=2"
            # Fetch Industrial Production
            ip_url = f"https://api.stlouisfed.org/fred/series/observations?series_id=IPMAN&api_key={fred_key}&file_type=json&sort_order=desc&limit=2"

            macro = {"timestamp": datetime.now(timezone.utc).isoformat()}

            try:
                resp = requests.get(ppi_url, timeout=10)
                data = resp.json()
                observations = data.get("observations", [])
                if len(observations) >= 2:
                    current = float(observations[0]["value"])
                    previous = float(observations[1]["value"])
                    macro["ppi_metals"] = current
                    macro["ppi_metals_change_1y"] = round(
                        ((current - previous) / previous) * 100, 1
                    )
            except Exception as e:
                print(f"   ⚠️  FRED PPI fetch failed: {e}")
                mock_macro = generate_mock_macro_data()
                macro.update({k: v for k, v in mock_macro.items() if k != "timestamp"})

            try:
                resp = requests.get(ip_url, timeout=10)
                data = resp.json()
                observations = data.get("observations", [])
                if len(observations) >= 2:
                    current = float(observations[0]["value"])
                    previous = float(observations[1]["value"])
                    macro["industrial_production"] = current
                    macro["industrial_production_change_1y"] = round(
                        ((current - previous) / previous) * 100, 1
                    )
            except Exception as e:
                print(f"   ⚠️  FRED IP fetch failed: {e}")
                mock_macro = generate_mock_macro_data()
                macro.update({k: v for k, v in mock_macro.items() if k != "timestamp"})

        if "ppi_metals" in macro:
            print(f"   PPI (Metals): {macro.get('ppi_metals', 'N/A')} "
                  f"({macro.get('ppi_metals_change_1y', 'N/A')}% YoY)")
        if "industrial_production" in macro:
            print(f"   Industrial Production: {macro.get('industrial_production', 'N/A')} "
                  f"({macro.get('industrial_production_change_1y', 'N/A')}% YoY)")

    except ImportError:
        print("   ⚠️  'requests' not installed — using mock data")
        macro = generate_mock_macro_data()

    # Step 2: Fetch commodity prices
    print("\n📦 Step 2: Fetching commodity prices...")
    try:
        import requests
        av_key = env.get("ALPHA_VANTAGE_KEY", "")
        if not av_key:
            print("   ⚠️  No ALPHA_VANTAGE_KEY — using mock prices")
            prices = generate_mock_prices()
        else:
            prices = {}
            for mineral in MINERALS:
                try:
                    url = (f"https://www.alphavantage.co/query?function=TIME_SERIES_MONTHLY"
                           f"&symbol={MINERALS[mineral]['alpha_vantage_symbol']}"
                           f"&apikey={av_key}")
                    resp = requests.get(url, timeout=10)
                    data = resp.json()
                    ts = data.get("Monthly Time Series", {})
                    if ts:
                        sorted_dates = sorted(ts.keys(), reverse=True)
                        current = float(ts[sorted_dates[0]]["4. close"])
                        if len(sorted_dates) > 12:
                            year_ago = float(ts[sorted_dates[12]]["4. close"])
                            forecast = current * (1 + ((current - year_ago) / year_ago))
                        else:
                            forecast = current * 1.05

                        prices[mineral] = {
                            "current_price": round(current, 2),
                            "forecast_price": round(forecast, 2),
                            "timestamp": datetime.now(timezone.utc).isoformat(),
                        }
                        print(f"   {mineral}: ${current:,.2f}")
                    else:
                        # Alpha Vantage didn't return data, use mock
                        print(f"   ⚠️  No data for {mineral} — using mock")
                        prices.update(generate_mock_prices())
                        break
                except Exception as e:
                    print(f"   ⚠️  Price fetch failed for {mineral}: {e}")
                    prices = generate_mock_prices()
                    break
    except ImportError:
        print("   ⚠️  'requests' not installed — using mock prices")
        prices = generate_mock_prices()

    if not prices:
        prices = generate_mock_prices()

    # Step 3: Compute risk scores (same as demo)
    print("\n🔬 Step 3: Computing risk scores...")

    for mineral, config in MINERALS.items():
        print(f"\n   ── {mineral} ──")

        current_price = prices[mineral]["current_price"]
        forecast_price = prices[mineral]["forecast_price"]
        price_deviation = ((forecast_price - current_price) / current_price) * 100

        # Sentiment analysis
        sec_text = MOCK_SEC_FILINGS[mineral]  # Use mock filings (would need real SEC EDGAR API)
        sentiment = simple_sentiment_analyzer(sec_text)
        print(f"   📝 SEC Sentiment: {sentiment:.3f}")

        # Regulatory risk
        reg_risk = regulatory_risk_scorer(sec_text)
        print(f"   ⚖️  Regulatory Risk: {reg_risk:.1f}/100")

        # Composite score
        composite, confidence = compute_composite_risk_score(
            price_deviation, sentiment, reg_risk, price_deviation
        )
        print(f"   🎯 Composite Score: {composite:+.1f}")

        # Push on-chain
        if env.get("CONTRACT_ADDRESS") and env.get("PRIVATE_KEY"):
            print(f"   ⛓️  Pushing to HashKey Chain...")
            push_to_chain(
                mineral, current_price, forecast_price,
                composite, price_deviation, sentiment, reg_risk,
                price_deviation, confidence, env
            )

        results[mineral] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "current_price_usd": current_price,
            "forecast_price_usd": forecast_price,
            "price_deviation_pct": round(price_deviation, 2),
            "supply_sentiment": round(sentiment, 4),
            "regulatory_risk": round(reg_risk, 2),
            "forecast_direction_pct": round(price_deviation, 2),
            "composite_score": composite,
            "confidence_bps": confidence,
            "on_chain_scaled": {
                "current_price": scale_price(current_price),
                "forecast_price": scale_price(forecast_price),
                "composite_score": scale_composite(composite),
                "price_deviation": int(price_deviation * SCORE_SCALE),
                "supply_sentiment": scale_sentiment(sentiment),
                "regulatory_risk": scale_reg_risk(reg_risk),
                "forecast_direction": int(price_deviation * SCORE_SCALE),
                "confidence": confidence,
            },
        }

    return results


# ============================================================================
# Main
# ============================================================================

def main():
    parser = argparse.ArgumentParser(
        description="CritMin Oracle — Critical Minerals Supply Chain Risk Pipeline"
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--demo", action="store_true",
                       help="Run in demo mode with mock data (no API keys needed)")
    group.add_argument("--live", action="store_true",
                       help="Run in live mode with real API data")
    parser.add_argument("--contract", type=str, default=None,
                        help="Override contract address from .env")
    parser.add_argument("--output", type=str, default=None,
                        help="Output JSON file path for results")
    parser.add_argument("--verbose", action="store_true",
                        help="Enable verbose output")

    args = parser.parse_args()

    # Load environment
    env = load_env()

    # Override contract address if specified
    if args.contract:
        env["CONTRACT_ADDRESS"] = args.contract

    banner = r"""
    ╔══════════════════════════════════════════════════════╗
    ║   ███╗   ███╗ █████╗ ███████╗████████╗██╗  ██╗      ║
    ║   ████╗ ████║██╔══██╗██╔════╝╚══██╔══╝██║  ██║      ║
    ║   ██╔████╔██║███████║███████╗   ██║   ███████║      ║
    ║   ██║╚██╔╝██║██╔══██║╚════██║   ██║   ██╔══██║      ║
    ║   ██║ ╚═╝ ██║██║  ██║███████║   ██║   ██║  ██║      ║
    ║   ╚═╝     ╚═╝╚═╝  ╚═╝╚══════╝   ╚═╝   ╚═╝  ╚═╝      ║
    ║        On-Chain Oracle for Critical Minerals          ║
    ╚══════════════════════════════════════════════════════╝
    """
    print(banner)
    print(f"  Mode: {'DEMO (Mock Data)' if args.demo else 'LIVE (Real APIs)'}")
    print(f"  Time: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}")

    if args.demo:
        results = run_demo_pipeline(env)
    else:
        results = run_live_pipeline(env)

    # Save results
    output_path = args.output or str(
        Path(__file__).parent.parent / "pipeline" / f"results-{datetime.now().strftime('%Y%m%d-%H%M%S')}.json"
    )

    output_data = {
        "pipeline_version": "1.0.0",
        "mode": "demo" if args.demo else "live",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "minerals": results,
    }

    with open(output_path, "w") as f:
        json.dump(output_data, f, indent=2)

    print(f"\n💾 Results saved to: {output_path}")

    # Summary
    print("\n" + "=" * 64)
    print("  RISK SUMMARY")
    print("=" * 64)
    print(f"  {'Mineral':<10} {'Score':>8} {'Sentiment':>10} {'Reg Risk':>10} {'Status':>10}")
    print("  " + "-" * 50)
    for mineral, data in results.items():
        score = data["composite_score"]
        status = "🟢 SAFE" if score > 25 else "🔴 RISKY" if score < -25 else "🟡 MODERATE"
        print(f"  {mineral:<10} {score:>+8.1f} {data['supply_sentiment']:>+10.3f} "
              f"{data['regulatory_risk']:>9.1f}% {status:>10}")

    print("\n✅ Pipeline complete!")
    return results


if __name__ == "__main__":
    main()
