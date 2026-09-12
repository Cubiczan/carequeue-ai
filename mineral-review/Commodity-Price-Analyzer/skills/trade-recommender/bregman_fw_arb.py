#!/usr/bin/env python3
"""
Bregman-Frank-Wolfe Arbitrage Detector for Polymarket
Detects and executes arbitrage opportunities using KL divergence projection.
"""

import numpy as np
import requests
import json
import logging
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from datetime import datetime
import os

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Constants
MIN_PROFIT_PCT = 0.005  # 0.5%
MIN_PROFIT_USDC = 0.50
MAX_SLIPPAGE = 0.05  # 5%
MAX_POSITION_SIZE = 0.10  # 10% of portfolio
MAX_ITERATIONS = 100
EPSILON = 1e-10

@dataclass
class Market:
    """Represents a Polymarket prediction market"""
    market_id: str
    name: str
    outcome_count: int
    prices: np.ndarray  # Normalized prices on simplex
    bids: np.ndarray
    asks: np.ndarray
    orderbook_depth: Dict
    
@dataclass
class ArbitrageOpportunity:
    """Represents a detected arbitrage opportunity"""
    market_id: str
    market_name: str
    arb_type: str  # 'simple', 'multi', 'cross'
    expected_profit_pct: float
    expected_profit_usdc: float
    size: float
    legs: List[Dict]
    divergence: float  # KL divergence D(mu* || theta)
    confidence: float
    timestamp: datetime

class BregmanFrankWolfeArb:
    """
    Bregman-Frank-Wolfe arbitrage detector for prediction markets.
    
    Uses KL divergence projection onto the feasible set of coherent
    probability distributions to detect and quantify arbitrage.
    """
    
    def __init__(self, api_key: str = None, rpc_node: str = None):
        self.api_key = api_key or os.getenv("POLYCLAW_API_KEY")
        self.rpc_node = rpc_node or os.getenv("CHAINSTACK_NODE")
        self.markets_cache = {}
        self.positions = {}
        
    def fetch_markets(self) -> List[Market]:
        """Fetch active Polymarket markets with orderbook data"""
        markets = []
        try:
            # Call Polymarket CLOB API
            # TODO: Implement actual API call
            response = requests.get(
                "https://clob.polymarket.com/markets",
                headers={"Authorization": f"Bearer {self.api_key}"}
            )
            data = response.json()
            
            for m in data.get("markets", []):
                if self._is_valid_market(m):
                    market = self._parse_market(m)
                    markets.append(market)
                    
            logger.info(f"Fetched {len(markets)} valid markets")
            return markets
            
        except Exception as e:
            logger.error(f"Failed to fetch markets: {e}")
            return []
    
    def _is_valid_market(self, market_data: Dict) -> bool:
        """Filter: whitelist valid markets"""
        # Skip obscure/illiquid markets
        min_volume = market_data.get("volume", 0)
        min_liquidity = market_data.get("liquidity", 0)
        
        if min_volume < 10000:  # $10k min volume
            return False
        if min_liquidity < 5000:  # $5k min liquidity
            return False
            
        # Check if market in whitelist
        category = market_data.get("category", "").lower()
        whitelisted = ["politics", "sports", "crypto", "finance", "technology"]
        
        return category in whitelisted
    
    def _parse_market(self, data: Dict) -> Market:
        """Parse market data into Market object"""
        outcomes = data.get("outcomes", [])
        n = len(outcomes)
        
        # Extract prices
        bids = np.array([o.get("bid", 0) for o in outcomes])
        asks = np.array([o.get("ask", 0) for o in outcomes])
        mids = (bids + asks) / 2
        
        # Normalize to simplex
        prices = mids / (mids.sum() + EPSILON)
        
        return Market(
            market_id=data.get("market_id"),
            name=data.get("question", "Unknown"),
            outcome_count=n,
            prices=prices,
            bids=bids,
            asks=asks,
            orderbook_depth=data.get("orderbook", {})
        )
    
    def kl_divergence(self, p: np.ndarray, q: np.ndarray) -> float:
        """Compute KL divergence D(p || q) with numerical stability"""
        p = np.clip(p, EPSILON, 1 - EPSILON)
        q = np.clip(q, EPSILON, 1 - EPSILON)
        return np.sum(p * np.log(p / q))
    
    def frank_wolfe_projection(self, theta: np.ndarray, 
                               max_iter: int = MAX_ITERATIONS,
                               tol: float = 1e-6) -> Tuple[np.ndarray, float]:
        """
        Frank-Wolfe algorithm for Bregman projection onto simplex.
        
        Returns:
            mu_star: Projected coherent distribution
            divergence: KL divergence D(mu_star || theta)
        """
        n = len(theta)
        mu = np.ones(n) / n  # Initialize at simplex center
        
        for iteration in range(max_iter):
            # Compute gradient: ∇D(μ||θ) = log(μ/θ) + 1
            gradient = np.log(mu / (theta + EPSILON)) + 1
            
            # Find vertex (coordinate with minimum gradient)
            k = np.argmin(gradient)
            vertex = np.zeros(n)
            vertex[k] = 1.0
            
            # Standard FW step size
            step_size = 2.0 / (iteration + 2)
            
            # Update: convex combination
            mu_new = (1 - step_size) * mu + step_size * vertex
            
            # Check convergence
            if np.linalg.norm(mu_new - mu) < tol:
                mu = mu_new
                break
                
            mu = mu_new
        
        divergence = self.kl_divergence(mu, theta)
        return mu, divergence
    
    def detect_simple_arbitrage(self, market: Market) -> Optional[ArbitrageOpportunity]:
        """
        Detect simple binary arbitrage:
        If YES_price + NO_price < 1 - fees - MIN_PROFIT_PCT
        """
        if market.outcome_count != 2:
            return None
            
        yes_price = market.asks[0]  # Cost to buy YES
        no_price = market.asks[1]   # Cost to buy NO
        
        total_cost = yes_price + no_price
        fees = 0.02  # 2% Polymarket fee estimate
        
        if total_cost < 1 - fees - MIN_PROFIT_PCT:
            profit_pct = (1 - total_cost - fees) / total_cost
            
            # Calculate optimal size based on orderbook depth
            max_size = self._calculate_position_size(market, profit_pct)
            
            if max_size > 0:
                return ArbitrageOpportunity(
                    market_id=market.market_id,
                    market_name=market.name,
                    arb_type="simple",
                    expected_profit_pct=profit_pct,
                    expected_profit_usdc=profit_pct * max_size,
                    size=max_size,
                    legs=[
                        {"side": "buy", "outcome": 0, "price": yes_price},
                        {"side": "buy", "outcome": 1, "price": no_price}
                    ],
                    divergence=profit_pct,  # Proxy for simple arb
                    confidence=0.9,
                    timestamp=datetime.now()
                )
        
        return None
    
    def detect_multi_outcome_arbitrage(self, market: Market) -> Optional[ArbitrageOpportunity]:
        """
        Detect multi-outcome arbitrage using Bregman projection.
        
        If sum of normalized prices != 1, there's potential arbitrage.
        Use KL divergence as unified arb metric.
        """
        if market.outcome_count < 2:
            return None
            
        # Run Frank-Wolfe projection
        mu_star, divergence = self.frank_wolfe_projection(market.prices)
        
        # Check if divergence exceeds threshold
        fees = 0.02 * market.outcome_count  # Estimated fees
        slippage = self._estimate_slippage(market)
        
        min_divergence = MIN_PROFIT_PCT + fees + slippage
        
        if divergence >= min_divergence:
            # Calculate legs: move from theta towards mu_star
            legs = self._build_arbitrage_legs(market, mu_star)
            
            if legs:
                max_size = self._calculate_position_size(market, divergence)
                
                return ArbitrageOpportunity(
                    market_id=market.market_id,
                    market_name=market.name,
                    arb_type="multi",
                    expected_profit_pct=divergence,
                    expected_profit_usdc=divergence * max_size,
                    size=max_size,
                    legs=legs,
                    divergence=divergence,
                    confidence=min(0.95, divergence / min_divergence),
                    timestamp=datetime.now()
                )
        
        return None
    
    def _build_arbitrage_legs(self, market: Market, 
                               target: np.ndarray) -> List[Dict]:
        """Build arbitrage legs to move market towards target distribution"""
        legs = []
        
        for i, (current, target_i) in enumerate(zip(market.prices, target)):
            if target_i > current + EPSILON:
                # Buy outcome i
                size = target_i - current
                legs.append({
                    "side": "buy",
                    "outcome": i,
                    "target_price": market.asks[i],
                    "size": size
                })
            elif current > target_i + EPSILON:
                # Sell outcome i (short)
                size = current - target_i
                legs.append({
                    "side": "sell",
                    "outcome": i,
                    "target_price": market.bids[i],
                    "size": size
                })
        
        return legs
    
    def _estimate_slippage(self, market: Market) -> float:
        """Estimate slippage based on orderbook depth"""
        # TODO: Implement proper orderbook walking
        # For now, use conservative estimate
        return 0.01  # 1% estimated slippage
    
    def _calculate_position_size(self, market: Market, 
                                  profit_pct: float) -> float:
        """
        Calculate max position size based on:
        - MAX_POSITION_SIZE limit
        - Orderbook depth
        - Profit threshold
        """
        # Base size on profit attractiveness
        base_size = 100  # $100 base
        
        # Scale with profit
        size = base_size * (profit_pct / MIN_PROFIT_PCT)
        
        # Cap at max position
        max_size = 1000 * MAX_POSITION_SIZE  # Assuming $1000 portfolio
        size = min(size, max_size)
        
        return size
    
    def risk_check(self, opportunity: ArbitrageOpportunity) -> bool:
        """
        Risk management checks before execution.
        Returns True if trade passes all checks.
        """
        # Check minimum profit
        if opportunity.expected_profit_usdc < MIN_PROFIT_USDC:
            logger.info(f"Skipping: profit ${opportunity.expected_profit_usdc:.2f} < min")
            return False
        
        # Check position limits
        current_exposure = self.positions.get(opportunity.market_id, 0)
        new_exposure = current_exposure + opportunity.size
        
        if new_exposure > 1000 * MAX_POSITION_SIZE:  # $100 max per market
            logger.info(f"Skipping: would exceed position limit")
            return False
        
        # Check confidence
        if opportunity.confidence < 0.7:
            logger.info(f"Skipping: confidence {opportunity.confidence:.2f} < 0.7")
            return False
        
        return True
    
    def scan_all_markets(self) -> List[ArbitrageOpportunity]:
        """Main scanning loop - run every 30 seconds"""
        opportunities = []
        
        markets = self.fetch_markets()
        logger.info(f"Scanning {len(markets)} markets for arbitrage...")
        
        for market in markets:
            try:
                # Try simple arb first (faster)
                arb = self.detect_simple_arbitrage(market)
                
                # If no simple arb, try multi-outcome
                if not arb:
                    arb = self.detect_multi_outcome_arbitrage(market)
                
                if arb and self.risk_check(arb):
                    opportunities.append(arb)
                    logger.info(f"Found arb: {arb.market_name[:50]}... "
                               f"Profit: {arb.expected_profit_pct:.2%}")
                    
            except Exception as e:
                logger.error(f"Error scanning {market.market_id}: {e}")
                continue
        
        # Sort by expected profit
        opportunities.sort(key=lambda x: x.expected_profit_pct, reverse=True)
        
        return opportunities
    
    def execute_arbitrage(self, opportunity: ArbitrageOpportunity) -> bool:
        """
        Execute the arbitrage trade.
        TODO: Integrate with PolyClaw execution layer
        """
        logger.info(f"Executing arb on {opportunity.market_name}")
        
        # Simulate execution for paper trading
        for leg in opportunity.legs:
            logger.info(f"  {leg['side'].upper()} outcome {leg['outcome']} "
                       f"@ {leg.get('target_price', 'market')} "
                       f"size: {leg['size']:.4f}")
        
        # Update positions
        self.positions[opportunity.market_id] = \
            self.positions.get(opportunity.market_id, 0) + opportunity.size
        
        return True
    
    def run_paper_mode(self, cycles: int = 100):
        """Run in paper trading mode to validate strategy"""
        logger.info("Starting paper trading mode...")
        
        results = []
        for i in range(cycles):
            logger.info(f"\n=== Cycle {i+1}/{cycles} ===")
            
            opps = self.scan_all_markets()
            
            for opp in opps[:5]:  # Top 5 opportunities
                logger.info(f"\nPaper trade: {opp.market_name}")
                logger.info(f"  Expected profit: {opp.expected_profit_pct:.2%}")
                logger.info(f"  Divergence: {opp.divergence:.4f}")
                logger.info(f"  Legs: {len(opp.legs)}")
                
                results.append({
                    "timestamp": opp.timestamp,
                    "market": opp.market_name,
                    "profit_pct": opp.expected_profit_pct,
                    "divergence": opp.divergence,
                    "type": opp.arb_type
                })
            
            # Sleep 30 seconds between scans
            import time
            time.sleep(30)
        
        # Save results
        with open("paper_trading_results.json", "w") as f:
            json.dump(results, f, indent=2, default=str)
        
        logger.info(f"Paper trading complete. Results saved.")
        return results

def main():
    """Entry point for OpenClaw skill integration"""
    detector = BregmanFrankWolfeArb()
    
    # Run paper mode for testing
    detector.run_paper_mode(cycles=10)

if __name__ == "__main__":
    main()
