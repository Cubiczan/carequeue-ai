/**
 * Swarm Agents — 9 Specialized Market Analysis Agents
 *
 * Each agent analyzes a different aspect of market data and returns
 * an AgentVote with signal, confidence, and reasoning.
 */

import type { AgentVote, MarketDataBundle, Signal } from "./types";

// ── Utility helpers ─────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/** Simple standard deviation over an array of numbers */
function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const squaredDiffs = arr.map((v) => (v - mean) ** 2);
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / (arr.length - 1));
}

/** Simple moving average */
function sma(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// ── Agent Implementations ───────────────────────────────────────

/**
 * 1. FundingAgent
 * Analyzes historical funding rates to determine long/short bias.
 * Very positive funding → longs paying shorts → overleveraged long → SHORT
 * Negative funding → shorts paying longs → overleveraged short → LONG
 */
export function fundingAgent(data: MarketDataBundle): AgentVote {
  const { funding, stats } = data;

  let signal: Signal = "NEUTRAL";
  let confidence = 40;
  const reasons: string[] = [];

  if (funding.length === 0) {
    return {
      agentType: "FundingAgent",
      signal: "NEUTRAL",
      confidence: 20,
      reasoning: "No funding data available",
    };
  }

  // Annualized 1h funding rate (most recent)
  const currentFunding = stats.fundingRate1h;
  reasons.push(`Current 1h funding: ${currentFunding.toFixed(4)}% APR`);

  // Average funding over history
  const rates = funding.map((f) => parseFloat(f.rate));
  const avgFunding = sma(rates) * 100 * 24 * 365; // annualized
  reasons.push(`Avg funding (annualized): ${avgFunding.toFixed(4)}%`);

  // Count consecutive same-direction funding
  let consecutivePositive = 0;
  let consecutiveNegative = 0;
  for (const r of rates) {
    if (parseFloat(r.rate) > 0) {
      consecutiveNegative = 0;
      consecutivePositive++;
    } else if (parseFloat(r.rate) < 0) {
      consecutivePositive = 0;
      consecutiveNegative++;
    } else {
      break;
    }
  }

  if (currentFunding > 0.05) {
    // Very high positive funding → overleveraged long
    signal = "SHORT";
    confidence = clamp(40 + consecutivePositive * 5, 45, 85);
    reasons.push(`High positive funding suggests overleveraged longs (${consecutivePositive} consecutive positive periods)`);
  } else if (currentFunding < -0.05) {
    signal = "LONG";
    confidence = clamp(40 + consecutiveNegative * 5, 45, 85);
    reasons.push(`High negative funding suggests overleveraged shorts (${consecutiveNegative} consecutive negative periods)`);
  } else if (currentFunding > 0.01) {
    signal = "SHORT";
    confidence = clamp(35 + consecutivePositive * 3, 35, 60);
    reasons.push(`Mild positive funding — slight long overleverage`);
  } else if (currentFunding < -0.01) {
    signal = "LONG";
    confidence = clamp(35 + consecutiveNegative * 3, 35, 60);
    reasons.push(`Mild negative funding — slight short overleverage`);
  } else {
    signal = "NEUTRAL";
    confidence = 30;
    reasons.push("Funding near zero — no strong directional bias");
  }

  return {
    agentType: "FundingAgent",
    signal,
    confidence,
    reasoning: reasons.join(". "),
  };
}

/**
 * 2. MomentumAgent
 * Analyzes recent candle data. Compares current price to SMA,
 * looks for consecutive green/red candles.
 */
export function momentumAgent(data: MarketDataBundle): AgentVote {
  const { candles, stats } = data;

  if (candles.length < 5) {
    return {
      agentType: "MomentumAgent",
      signal: "NEUTRAL",
      confidence: 20,
      reasoning: "Insufficient candle data",
    };
  }

  const closes = candles.map((c) => c.close);
  const currentPrice = closes[closes.length - 1];
  const sma10 = sma(closes.slice(-10));
  const sma5 = sma(closes.slice(-5));

  // Count consecutive green/red candles from the end
  let consecutiveGreen = 0;
  let consecutiveRed = 0;
  for (let i = candles.length - 1; i >= 0; i--) {
    const change = candles[i].close - candles[i].open;
    if (change > 0) {
      consecutiveGreen++;
      if (consecutiveRed > 0) break;
    } else if (change < 0) {
      consecutiveRed++;
      if (consecutiveGreen > 0) break;
    } else {
      break;
    }
  }

  // Price momentum
  const priceChange = currentPrice - closes[closes.length - Math.min(5, closes.length)];
  const priceChangePct = (priceChange / currentPrice) * 100;

  let signal: Signal = "NEUTRAL";
  let confidence = 40;
  const reasons: string[] = [];

  reasons.push(`Price vs SMA5: ${((currentPrice / sma5 - 1) * 100).toFixed(3)}%`);
  reasons.push(`Price vs SMA10: ${((currentPrice / sma10 - 1) * 100).toFixed(3)}%`);
  reasons.push(`${Math.max(consecutiveGreen, consecutiveRed)} consecutive ${consecutiveGreen > consecutiveRed ? "green" : "red"} candles`);

  // Strong momentum signals
  if (currentPrice > sma5 && currentPrice > sma10 && consecutiveGreen >= 3) {
    signal = "LONG";
    confidence = clamp(50 + consecutiveGreen * 5 + Math.abs(priceChangePct) * 2, 50, 85);
    reasons.push("Bullish momentum: price above both SMAs with consecutive green candles");
  } else if (currentPrice < sma5 && currentPrice < sma10 && consecutiveRed >= 3) {
    signal = "SHORT";
    confidence = clamp(50 + consecutiveRed * 5 + Math.abs(priceChangePct) * 2, 50, 85);
    reasons.push("Bearish momentum: price below both SMAs with consecutive red candles");
  } else if (currentPrice > sma10) {
    signal = "LONG";
    confidence = clamp(40 + consecutiveGreen * 3, 40, 65);
    reasons.push("Moderate bullish: price above SMA10");
  } else if (currentPrice < sma10) {
    signal = "SHORT";
    confidence = clamp(40 + consecutiveRed * 3, 40, 65);
    reasons.push("Moderate bearish: price below SMA10");
  } else {
    confidence = 30;
    reasons.push("No clear momentum signal");
  }

  return {
    agentType: "MomentumAgent",
    signal,
    confidence,
    reasoning: reasons.join(". "),
  };
}

/**
 * 3. VolatilityAgent
 * Measures price volatility from candles.
 * High volatility → NEUTRAL (uncertain).
 * Low volatility → looks at direction for breakout signal.
 */
export function volatilityAgent(data: MarketDataBundle): AgentVote {
  const { candles } = data;

  if (candles.length < 5) {
    return {
      agentType: "VolatilityAgent",
      signal: "NEUTRAL",
      confidence: 20,
      reasoning: "Insufficient candle data for volatility analysis",
    };
  }

  // Calculate hourly returns
  const returns: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    returns.push((candles[i].close - candles[i - 1].close) / candles[i - 1].close);
  }

  const vol = stdDev(returns);
  const avgVol = vol * 100; // as percentage

  // Range compression: current range vs recent range
  const recentHigh = Math.max(...candles.slice(-5).map((c) => c.high));
  const recentLow = Math.min(...candles.slice(-5).map((c) => c.low));
  const currentPrice = candles[candles.length - 1].close;
  const rangePct = ((recentHigh - recentLow) / currentPrice) * 100;

  const reasons: string[] = [];
  reasons.push(`Hourly volatility: ${avgVol.toFixed(4)}%`);
  reasons.push(`5-candle range: ${rangePct.toFixed(3)}%`);

  let signal: Signal = "NEUTRAL";
  let confidence = 40;

  if (avgVol > 0.03 || rangePct > 2.0) {
    // High volatility — uncertain
    signal = "NEUTRAL";
    confidence = clamp(55 + avgVol * 200, 55, 75);
    reasons.push("High volatility detected — directional uncertainty is high");
  } else if (avgVol < 0.005 && rangePct < 0.3) {
    // Very low volatility — potential breakout incoming
    // Direction based on recent candle close trend
    const lastThree = candles.slice(-3);
    const trendUp = lastThree.every((c) => c.close > c.open);
    const trendDown = lastThree.every((c) => c.close < c.open);

    if (trendUp) {
      signal = "LONG";
      confidence = 55;
      reasons.push("Compressed volatility with upward micro-trend — potential upside breakout");
    } else if (trendDown) {
      signal = "SHORT";
      confidence = 55;
      reasons.push("Compressed volatility with downward micro-trend — potential downside breakout");
    } else {
      signal = "NEUTRAL";
      confidence = 50;
      reasons.push("Low volatility compression — breakout direction unclear");
    }
  } else {
    // Normal volatility — lean towards recent direction
    const closes = candles.map((c) => c.close);
    const smaVal = sma(closes.slice(-10));
    if (currentPrice > smaVal) {
      signal = "LONG";
      confidence = 45;
      reasons.push("Normal volatility with slight upward bias");
    } else {
      signal = "SHORT";
      confidence = 45;
      reasons.push("Normal volatility with slight downward bias");
    }
  }

  return {
    agentType: "VolatilityAgent",
    signal,
    confidence,
    reasoning: reasons.join(". "),
  };
}

/**
 * 4. VolumeAgent
 * Compares recent trade volume to average.
 * High volume + price move = strong conviction. Low volume = NEUTRAL.
 */
export function volumeAgent(data: MarketDataBundle): AgentVote {
  const { trades, candles, stats } = data;

  const reasons: string[] = [];

  if (candles.length >= 2) {
    // Volume analysis from candles
    const volumes = candles.map((c) => c.usdVolume).filter((v) => v > 0);
    const recentVol = candles.slice(-3).map((c) => c.usdVolume).filter((v) => v > 0);

    if (volumes.length >= 5 && recentVol.length > 0) {
      const avgVol = sma(volumes.slice(-10));
      const recentAvgVol = sma(recentVol);
      const volumeRatio = recentAvgVol / avgVol;

      reasons.push(`Volume ratio (recent/avg): ${volumeRatio.toFixed(2)}x`);

      // Price direction during high volume
      const lastCandle = candles[candles.length - 1];
      const priceChange = lastCandle.close - lastCandle.open;

      if (volumeRatio > 1.5) {
        // High volume
        if (priceChange > 0) {
          return {
            agentType: "VolumeAgent",
            signal: "LONG",
            confidence: clamp(50 + volumeRatio * 10, 50, 80),
            reasoning: reasons.concat([
              `High volume (${volumeRatio.toFixed(2)}x average) with upward price action — strong buying conviction`,
            ]).join(". "),
          };
        } else if (priceChange < 0) {
          return {
            agentType: "VolumeAgent",
            signal: "SHORT",
            confidence: clamp(50 + volumeRatio * 10, 50, 80),
            reasoning: reasons.concat([
              `High volume (${volumeRatio.toFixed(2)}x average) with downward price action — strong selling conviction`,
            ]).join(". "),
          };
        }
      } else if (volumeRatio < 0.5) {
        return {
          agentType: "VolumeAgent",
          signal: "NEUTRAL",
          confidence: 50,
          reasoning: reasons.concat([
            `Low volume (${volumeRatio.toFixed(2)}x average) — low conviction, waiting for volume pickup`,
          ]).join(". "),
        };
      }
    }
  }

  // Fallback: analyze trade flow imbalance
  if (trades.length > 0) {
    const recentTrades = trades.slice(0, Math.min(50, trades.length));
    let buyVolume = 0;
    let sellVolume = 0;

    for (const t of recentTrades) {
      if (t.side === "BUY") buyVolume += t.size * t.price;
      else sellVolume += t.size * t.price;
    }

    const totalVolume = buyVolume + sellVolume;
    const buyRatio = totalVolume > 0 ? buyVolume / totalVolume : 0.5;

    reasons.push(`Buy/sell ratio from trades: ${(buyRatio * 100).toFixed(1)}%`);

    if (buyRatio > 0.6) {
      return {
        agentType: "VolumeAgent",
        signal: "LONG",
        confidence: clamp(40 + (buyRatio - 0.5) * 200, 40, 70),
        reasoning: reasons.join(". "),
      };
    } else if (buyRatio < 0.4) {
      return {
        agentType: "VolumeAgent",
        signal: "SHORT",
        confidence: clamp(40 + (0.5 - buyRatio) * 200, 40, 70),
        reasoning: reasons.join(". "),
      };
    }
  }

  return {
    agentType: "VolumeAgent",
    signal: "NEUTRAL",
    confidence: 35,
    reasoning: reasons.length > 0 ? reasons.join(". ") : "Insufficient volume data",
  };
}

/**
 * 5. OrderbookAgent
 * Analyzes orderbook depth. Bid/ask imbalance indicates direction.
 * Heavy bids → LONG, heavy asks → SHORT.
 */
export function orderbookAgent(data: MarketDataBundle): AgentVote {
  const { orderbook } = data;

  if (!orderbook || orderbook.bids.length === 0 || orderbook.asks.length === 0) {
    return {
      agentType: "OrderbookAgent",
      signal: "NEUTRAL",
      confidence: 20,
      reasoning: "No orderbook data available",
    };
  }

  const reasons: string[] = [];

  // Aggregate bid/ask depth at different levels
  const bidDepth = orderbook.bids.reduce((sum, b) => sum + b.size * b.price, 0);
  const askDepth = orderbook.asks.reduce((sum, a) => sum + a.size * a.price, 0);
  const totalDepth = bidDepth + askDepth;

  const bidRatio = totalDepth > 0 ? bidDepth / totalDepth : 0.5;

  reasons.push(`Bid depth: $${bidDepth.toFixed(2)}, Ask depth: $${askDepth.toFixed(2)}`);
  reasons.push(`Bid/Ask ratio: ${(bidRatio * 100).toFixed(1)}%`);

  // Analyze depth at top 5 levels
  const top5BidDepth = orderbook.bids.slice(0, 5).reduce((s, b) => s + b.size * b.price, 0);
  const top5AskDepth = orderbook.asks.slice(0, 5).reduce((s, a) => s + a.size * a.price, 0);
  const top5Total = top5BidDepth + top5AskDepth;
  const top5BidRatio = top5Total > 0 ? top5BidDepth / top5Total : 0.5;

  reasons.push(`Top-5 bid/ask ratio: ${(top5BidRatio * 100).toFixed(1)}%`);

  // Bid-ask spread
  const bestBid = orderbook.bids[0]?.price ?? 0;
  const bestAsk = orderbook.asks[0]?.price ?? 0;
  const spread = bestAsk > 0 ? ((bestAsk - bestBid) / bestAsk) * 100 : 0;
  reasons.push(`Spread: ${spread.toFixed(4)}%`);

  let signal: Signal = "NEUTRAL";
  let confidence = 40;

  // Combined signal from overall and top-5 depth
  const combinedBidRatio = (bidRatio + top5BidRatio) / 2;

  if (combinedBidRatio > 0.6) {
    signal = "LONG";
    confidence = clamp(45 + (combinedBidRatio - 0.5) * 150, 45, 75);
    reasons.push("Significant bid depth advantage — bullish orderbook imbalance");
  } else if (combinedBidRatio < 0.4) {
    signal = "SHORT";
    confidence = clamp(45 + (0.5 - combinedBidRatio) * 150, 45, 75);
    reasons.push("Significant ask depth advantage — bearish orderbook imbalance");
  } else if (spread > 0.1) {
    signal = "NEUTRAL";
    confidence = 55;
    reasons.push("Wide spread — uncertain orderbook conditions");
  } else {
    confidence = 35;
    reasons.push("Balanced orderbook — no clear directional bias");
  }

  return {
    agentType: "OrderbookAgent",
    signal,
    confidence,
    reasoning: reasons.join(". "),
  };
}

/**
 * 6. LiquidationAgent
 * Estimates liquidation risk based on funding + volatility.
 * High funding + high vol = liquidation cascade risk → contrarian signal.
 */
export function liquidationAgent(data: MarketDataBundle): AgentVote {
  const { candles, funding, stats } = data;

  const reasons: string[] = [];

  // Calculate volatility
  let vol = 0;
  if (candles.length >= 5) {
    const returns: number[] = [];
    for (let i = 1; i < candles.length; i++) {
      returns.push((candles[i].close - candles[i - 1].close) / candles[i - 1].close);
    }
    vol = stdDev(returns) * 100;
  }

  const fundingRate = stats.fundingRate1h;
  const fundingAbs = Math.abs(fundingRate);

  reasons.push(`Volatility: ${vol.toFixed(4)}%`);
  reasons.push(`Funding rate (annualized): ${fundingRate.toFixed(4)}%`);

  // Liquidation risk score: combination of extreme funding + high volatility
  let riskScore = 0;
  if (fundingAbs > 0.05) riskScore += 3;
  else if (fundingAbs > 0.02) riskScore += 2;
  else if (fundingAbs > 0.01) riskScore += 1;

  if (vol > 0.03) riskScore += 3;
  else if (vol > 0.01) riskScore += 2;
  else if (vol > 0.005) riskScore += 1;

  // Check for price rejection (long wicks)
  if (candles.length >= 3) {
    const recentCandles = candles.slice(-3);
    for (const c of recentCandles) {
      const body = Math.abs(c.close - c.open);
      const upperWick = c.high - Math.max(c.close, c.open);
      const lowerWick = Math.min(c.close, c.open) - c.low;
      if (upperWick > body * 2) {
        riskScore += 1;
        reasons.push("Detected upper wick rejection candle — potential selling pressure at highs");
      }
      if (lowerWick > body * 2) {
        riskScore += 1;
        reasons.push("Detected lower wick rejection candle — potential buying support at lows");
      }
    }
  }

  reasons.push(`Liquidation risk score: ${riskScore}/10`);

  let signal: Signal = "NEUTRAL";
  let confidence = 40;

  if (riskScore >= 6) {
    // High liquidation risk — contrarian signal
    if (fundingRate > 0) {
      signal = "SHORT";
      confidence = clamp(55 + riskScore * 3, 55, 80);
      reasons.push("HIGH liquidation risk with positive funding — long squeeze potential");
    } else {
      signal = "LONG";
      confidence = clamp(55 + riskScore * 3, 55, 80);
      reasons.push("HIGH liquidation risk with negative funding — short squeeze potential");
    }
  } else if (riskScore >= 3) {
    if (fundingRate > 0) {
      signal = "SHORT";
      confidence = clamp(42 + riskScore * 2, 42, 60);
      reasons.push("Moderate liquidation risk with positive funding — cautious short bias");
    } else {
      signal = "LONG";
      confidence = clamp(42 + riskScore * 2, 42, 60);
      reasons.push("Moderate liquidation risk with negative funding — cautious long bias");
    }
  } else {
    signal = "NEUTRAL";
    confidence = 30;
    reasons.push("Low liquidation risk — no cascade danger");
  }

  return {
    agentType: "LiquidationAgent",
    signal,
    confidence,
    reasoning: reasons.join(". "),
  };
}

/**
 * 7. MeanReversionAgent
 * Compares current price to historical range from candles.
 * If price is at extremes (>2 std devs), expect reversion.
 */
export function meanReversionAgent(data: MarketDataBundle): AgentVote {
  const { candles, stats } = data;

  if (candles.length < 10) {
    return {
      agentType: "MeanReversionAgent",
      signal: "NEUTRAL",
      confidence: 20,
      reasoning: "Insufficient candle data for mean reversion analysis",
    };
  }

  const closes = candles.map((c) => c.close);
  const currentPrice = closes[closes.length - 1];
  const mean = sma(closes);
  const sd = stdDev(closes);
  const zScore = sd > 0 ? (currentPrice - mean) / sd : 0;

  const reasons: string[] = [];
  reasons.push(`Current price: ${currentPrice.toFixed(2)}`);
  reasons.push(`Mean price: ${mean.toFixed(2)}`);
  reasons.push(`Std deviation: ${sd.toFixed(2)}`);
  reasons.push(`Z-score: ${zScore.toFixed(3)}`);

  let signal: Signal = "NEUTRAL";
  let confidence = 40;

  if (zScore > 2.0) {
    signal = "SHORT";
    confidence = clamp(50 + (zScore - 2) * 10, 50, 80);
    reasons.push(`Price is ${(zScore).toFixed(1)} standard deviations above mean — strong mean reversion SHORT signal`);
  } else if (zScore < -2.0) {
    signal = "LONG";
    confidence = clamp(50 + (Math.abs(zScore) - 2) * 10, 50, 80);
    reasons.push(`Price is ${(Math.abs(zScore)).toFixed(1)} standard deviations below mean — strong mean reversion LONG signal`);
  } else if (zScore > 1.5) {
    signal = "SHORT";
    confidence = clamp(40 + (zScore - 1.5) * 10, 40, 60);
    reasons.push("Price above 1.5 std devs — mild mean reversion SHORT signal");
  } else if (zScore < -1.5) {
    signal = "LONG";
    confidence = clamp(40 + (Math.abs(zScore) - 1.5) * 10, 40, 60);
    reasons.push("Price below 1.5 std devs — mild mean reversion LONG signal");
  } else {
    signal = "NEUTRAL";
    confidence = 30;
    reasons.push("Price within normal range — no mean reversion signal");
  }

  return {
    agentType: "MeanReversionAgent",
    signal,
    confidence,
    reasoning: reasons.join(". "),
  };
}

/**
 * 8. TrendAgent
 * Multi-timeframe trend analysis using candle data.
 * Looks at short-term and medium-term trend alignment.
 */
export function trendAgent(data: MarketDataBundle): AgentVote {
  const { candles } = data;

  if (candles.length < 10) {
    return {
      agentType: "TrendAgent",
      signal: "NEUTRAL",
      confidence: 20,
      reasoning: "Insufficient candle data for trend analysis",
    };
  }

  const closes = candles.map((c) => c.close);
  const currentPrice = closes[closes.length - 1];

  const reasons: string[] = [];

  // Short-term trend (last 5 candles)
  const shortSma = sma(closes.slice(-5));
  const shortTrend = currentPrice > shortSma ? "UP" : "DOWN";
  const shortDist = ((currentPrice / shortSma - 1) * 100);
  reasons.push(`Short-term trend (5-candle): ${shortTrend} (${shortDist.toFixed(3)}% from SMA)`);

  // Medium-term trend (last 10 candles)
  const medSma = sma(closes.slice(-10));
  const medTrend = currentPrice > medSma ? "UP" : "DOWN";
  const medDist = ((currentPrice / medSma - 1) * 100);
  reasons.push(`Medium-term trend (10-candle): ${medTrend} (${medDist.toFixed(3)}% from SMA)`);

  // If available, longer-term trend
  let longTrend: string | null = null;
  if (closes.length >= 20) {
    const longSma = sma(closes.slice(-20));
    longTrend = currentPrice > longSma ? "UP" : "DOWN";
    const longDist = ((currentPrice / longSma - 1) * 100);
    reasons.push(`Longer-term trend (20-candle): ${longTrend} (${longDist.toFixed(3)}% from SMA)`);

    // SMA alignment
    const alignedUp = shortSma > medSma && medSma > longSma && currentPrice > shortSma;
    const alignedDown = shortSma < medSma && medSma < longSma && currentPrice < shortSma;

    if (alignedUp) {
      return {
        agentType: "TrendAgent",
        signal: "LONG",
        confidence: 75,
        reasoning: reasons.concat([
          "STRONG BULLISH: All SMAs aligned upward with price above all averages — strong uptrend confirmed",
        ]).join(". "),
      };
    } else if (alignedDown) {
      return {
        agentType: "TrendAgent",
        signal: "SHORT",
        confidence: 75,
        reasoning: reasons.concat([
          "STRONG BEARISH: All SMAs aligned downward with price below all averages — strong downtrend confirmed",
        ]).join(". "),
      };
    }
  }

  // Short/medium alignment
  const alignedShortMed = shortTrend === medTrend;

  if (alignedShortMed && shortTrend === "UP") {
    return {
      agentType: "TrendAgent",
      signal: "LONG",
      confidence: 60,
      reasoning: reasons.concat(["Bullish: Short and medium term trends aligned upward"]).join(". "),
    };
  } else if (alignedShortMed && shortTrend === "DOWN") {
    return {
      agentType: "TrendAgent",
      signal: "SHORT",
      confidence: 60,
      reasoning: reasons.concat(["Bearish: Short and medium term trends aligned downward"]).join(". "),
    };
  } else {
    return {
      agentType: "TrendAgent",
      signal: "NEUTRAL",
      confidence: 40,
      reasoning: reasons.concat(["Mixed trend signals — short and medium term trends diverging"]).join(". "),
    };
  }
}

/**
 * 9. SentimentAgent (Meta-Agent)
 * Combines signals from other agents to gauge overall market sentiment.
 * Acts as a meta-agent that evaluates consensus strength.
 */
export function sentimentAgent(
  data: MarketDataBundle,
  previousVotes: AgentVote[]
): AgentVote {
  const reasons: string[] = [];

  if (previousVotes.length === 0) {
    return {
      agentType: "SentimentAgent",
      signal: "NEUTRAL",
      confidence: 20,
      reasoning: "No other agent votes to aggregate for sentiment analysis",
    };
  }

  // Count signals
  let longs = 0;
  let shorts = 0;
  let neutrals = 0;
  let weightedLong = 0;
  let weightedShort = 0;
  let totalWeight = 0;

  for (const vote of previousVotes) {
    if (vote.signal === "LONG") {
      longs++;
      weightedLong += vote.confidence;
    } else if (vote.signal === "SHORT") {
      shorts++;
      weightedShort += vote.confidence;
    } else {
      neutrals++;
    }
    totalWeight += vote.confidence;
  }

  const longPct = (longs / previousVotes.length) * 100;
  const shortPct = (shorts / previousVotes.length) * 100;
  const neutralPct = (neutrals / previousVotes.length) * 100;

  reasons.push(`Agent sentiment: ${longs} LONG, ${shorts} SHORT, ${neutrals} NEUTRAL`);
  reasons.push(`Sentiment split: ${longPct.toFixed(0)}% bullish, ${shortPct.toFixed(0)}% bearish, ${neutralPct.toFixed(0)}% neutral`);

  // Sentiment divergence — are bullish and bearish agents close?
  const divergence = Math.abs(longs - shorts) / previousVotes.length;
  reasons.push(`Sentiment divergence: ${divergence.toFixed(2)}`);

  // Average conviction of each side
  const avgLongConviction = longs > 0 ? weightedLong / longs : 0;
  const avgShortConviction = shorts > 0 ? weightedShort / shorts : 0;
  reasons.push(`Avg LONG conviction: ${avgLongConviction.toFixed(1)}, Avg SHORT conviction: ${avgShortConviction.toFixed(1)}`);

  let signal: Signal = "NEUTRAL";
  let confidence = 40;

  if (divergence < 0.2) {
    // Closely divided — uncertain
    signal = "NEUTRAL";
    confidence = clamp(50 + neutrals * 5, 50, 70);
    reasons.push("Highly divided agent sentiment — overall market uncertainty is high");
  } else if (longs > shorts && longPct >= 60) {
    signal = "LONG";
    confidence = clamp(45 + longPct * 0.3 + avgLongConviction * 0.1, 45, 75);
    reasons.push(`Bullish sentiment majority (${longPct.toFixed(0)}%) with avg conviction ${avgLongConviction.toFixed(0)}`);
  } else if (shorts > longs && shortPct >= 60) {
    signal = "SHORT";
    confidence = clamp(45 + shortPct * 0.3 + avgShortConviction * 0.1, 45, 75);
    reasons.push(`Bearish sentiment majority (${shortPct.toFixed(0)}%) with avg conviction ${avgShortConviction.toFixed(0)}`);
  } else {
    // Weak majority
    signal = longs > shorts ? "LONG" : shorts > longs ? "SHORT" : "NEUTRAL";
    confidence = 35;
    reasons.push("Weak directional consensus — sentiment leans but lacks conviction");
  }

  return {
    agentType: "SentimentAgent",
    signal,
    confidence,
    reasoning: reasons.join(". "),
  };
}

// ── Agent Registry ──────────────────────────────────────────────

/** All agent types (excluding SentimentAgent which depends on others) */
export const CORE_AGENTS = [
  "FundingAgent",
  "MomentumAgent",
  "VolatilityAgent",
  "VolumeAgent",
  "OrderbookAgent",
  "LiquidationAgent",
  "MeanReversionAgent",
  "TrendAgent",
] as const;

export const ALL_AGENT_TYPES = [...CORE_AGENTS, "SentimentAgent"] as const;

/** Run all agents and return their votes */
export function runAllAgents(
  data: MarketDataBundle,
  previousVotes: AgentVote[] = []
): AgentVote[] {
  const coreVotes: AgentVote[] = [
    fundingAgent(data),
    momentumAgent(data),
    volatilityAgent(data),
    volumeAgent(data),
    orderbookAgent(data),
    liquidationAgent(data),
    meanReversionAgent(data),
    trendAgent(data),
  ];

  // SentimentAgent runs last with access to all other votes
  const sentimentVote = sentimentAgent(data, coreVotes);

  return [...coreVotes, sentimentVote];
}
