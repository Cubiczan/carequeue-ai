/**
 * Swarm Engine — Main Entry Point
 *
 * Orchestrates the full analysis pipeline:
 *  1. Fetch market data from dYdX Indexer
 *  2. Pass data to all 9 agents
 *  3. Run adversarial consensus
 *  4. Persist results to database
 *  5. Return ConsensusResult
 */

import { db } from "@/lib/db";
import {
  getPerpetualMarkets,
  getOrderbook,
  getTrades,
  getCandles,
  getHistoricalFunding,
} from "@/lib/dydx";
import type {
  ConsensusResult,
  MarketDataBundle,
  StigmergyBoard,
} from "./types";
import { runAllAgents } from "./agents";
import { runConsensus } from "./consensus";

/**
 * Fetch all market data for a given market and build a MarketDataBundle.
 */
async function buildMarketDataBundle(
  market: string
): Promise<MarketDataBundle> {
  // Fetch all data sources in parallel
  const [marketsRes, orderbookRes, tradesRes, candlesRes, fundingRes] =
    await Promise.allSettled([
      getPerpetualMarkets(),
      getOrderbook(market),
      getTrades(market, 100),
      getCandles(market, "1HOURS", 50),
      getHistoricalFunding(market, 20),
    ]);

  // Extract orderbook
  const orderbook =
    orderbookRes.status === "fulfilled" ? orderbookRes.value : null;

  // Extract trades
  const trades =
    tradesRes.status === "fulfilled" ? tradesRes.value.trades : [];

  // Extract candles
  const candles =
    candlesRes.status === "fulfilled" ? candlesRes.value.candles : [];

  // Extract funding
  const funding =
    fundingRes.status === "fulfilled"
      ? fundingRes.value.historicalFunding
      : [];

  // Extract market metadata
  const marketInfo =
    marketsRes.status === "fulfilled"
      ? marketsRes.value.markets[market] ?? null
      : null;

  // Compute stats
  const midPrice =
    orderbook && orderbook.bids.length > 0 && orderbook.asks.length > 0
      ? (orderbook.bids[0].price + orderbook.asks[0].price) / 2
      : marketInfo
        ? parseFloat(marketInfo.oraclePrice)
        : candles.length > 0
          ? candles[candles.length - 1].close
          : 0;

  const spread =
    orderbook && orderbook.bids.length > 0 && orderbook.asks.length > 0
      ? orderbook.asks[0].price - orderbook.bids[0].price
      : 0;

  const volume24h = marketInfo ? parseFloat(marketInfo.volume24h) : 0;
  const openInterest = marketInfo ? parseFloat(marketInfo.openInterest) : 0;

  // Funding rate annualized (1h rate * 24 * 365 * 100)
  let fundingRate1h = 0;
  if (funding.length > 0) {
    fundingRate1h = parseFloat(funding[0].rate) * 24 * 365 * 100;
  }

  return {
    orderbook: orderbook
      ? {
          bids: orderbook.bids.map((b) => ({ price: b.price, size: b.size })),
          asks: orderbook.asks.map((a) => ({ price: a.price, size: a.size })),
        }
      : null,
    trades: trades.map((t) => ({
      side: t.side,
      size: t.size,
      price: t.price,
      createdAt: t.createdAt,
    })),
    candles: candles.map((c) => ({
      startedAt: c.startedAt,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      baseTokenVolume: c.baseTokenVolume,
      usdVolume: c.usdVolume,
      trades: c.trades,
    })),
    funding: funding.map((f) => ({
      rate: f.rate,
      effectiveAt: f.effectiveAt,
      price: f.price,
    })),
    market: marketInfo
      ? {
          ticker: marketInfo.ticker,
          oraclePrice: marketInfo.oraclePrice,
          openInterest: marketInfo.openInterest,
          volume24h: marketInfo.volume24h,
          nextFundingTime: marketInfo.nextFundingTime,
        }
      : null,
    stats: {
      midPrice,
      spread,
      volume24h,
      openInterest,
      fundingRate1h,
    },
  };
}

/**
 * Main entry point: run full swarm analysis on a market.
 */
export async function runSwarmAnalysis(
  market: string
): Promise<ConsensusResult> {
  // 1. Fetch market data
  const marketData = await buildMarketDataBundle(market);

  // 2. Get previous stigmergy board from last consensus (if available)
  const lastSignal = await db.consensusSignal.findFirst({
    where: { market },
    orderBy: { timestamp: "desc" },
  });

  let previousBoard: StigmergyBoard | undefined;
  if (lastSignal) {
    try {
      previousBoard = JSON.parse(lastSignal.marketData)?.stigmergyBoard;
    } catch {
      // Ignore parse errors
    }
  }

  // 3. Run all agents
  const votes = runAllAgents(marketData);

  // 4. Compute consensus
  const result = runConsensus(votes, market, previousBoard);

  // 5. Save to database
  await db.consensusSignal.create({
    data: {
      market,
      signal: result.signal,
      confidence: result.confidence,
      agentVotes: JSON.stringify(result.agentVotes),
      marketData: JSON.stringify({
        midPrice: marketData.stats.midPrice,
        spread: marketData.stats.spread,
        volume24h: marketData.stats.volume24h,
        openInterest: marketData.stats.openInterest,
        funding1h: marketData.stats.fundingRate1h,
        stigmergyBoard: result.stigmergyBoard,
      }),
    },
  });

  // 6. Save individual agent states
  for (const vote of result.agentVotes) {
    await db.agentState.upsert({
      where: {
        id: `${vote.agentType}-${market}`,
      },
      update: {
        lastVote: vote.signal,
        score: vote.confidence,
        timestamp: new Date(),
      },
      create: {
        id: `${vote.agentType}-${market}`,
        agentType: vote.agentType,
        market,
        lastVote: vote.signal,
        score: vote.confidence,
      },
    });
  }

  // 7. Save market snapshot
  await db.marketSnapshot.create({
    data: {
      market,
      midPrice: marketData.stats.midPrice,
      spread: marketData.stats.spread,
      volume24h: marketData.stats.volume24h,
      oi: marketData.stats.openInterest,
      funding1h: marketData.stats.fundingRate1h,
    },
  });

  return result;
}

/**
 * Fetch the latest consensus signal for a market from DB.
 */
export async function getLatestConsensus(
  market: string
): Promise<ConsensusResult | null> {
  const signal = await db.consensusSignal.findFirst({
    where: { market },
    orderBy: { timestamp: "desc" },
  });

  if (!signal) return null;

  let agentVotes: ConsensusResult["agentVotes"] = [];
  let stigmergyBoard: StigmergyBoard | undefined;

  try {
    agentVotes = JSON.parse(signal.agentVotes);
  } catch {
    // ignore
  }

  try {
    stigmergyBoard = JSON.parse(signal.marketData)?.stigmergyBoard;
  } catch {
    // ignore
  }

  return {
    market: signal.market,
    signal: signal.signal as ConsensusResult["signal"],
    confidence: signal.confidence,
    agentVotes,
    timestamp: signal.timestamp.getTime(),
    stigmergyBoard: stigmergyBoard ?? {},
  };
}

/**
 * Get consensus signal history for a market.
 */
export async function getConsensusHistory(
  market: string,
  limit = 50
): Promise<ConsensusResult[]> {
  const signals = await db.consensusSignal.findMany({
    where: { market },
    orderBy: { timestamp: "desc" },
    take: limit,
  });

  return signals.map((s) => {
    let agentVotes: ConsensusResult["agentVotes"] = [];
    let stigmergyBoard: StigmergyBoard | undefined;

    try {
      agentVotes = JSON.parse(s.agentVotes);
    } catch {
      // ignore
    }

    try {
      stigmergyBoard = JSON.parse(s.marketData)?.stigmergyBoard;
    } catch {
      // ignore
    }

    return {
      market: s.market,
      signal: s.signal as ConsensusResult["signal"],
      confidence: s.confidence,
      agentVotes,
      timestamp: s.timestamp.getTime(),
      stigmergyBoard: stigmergyBoard ?? {},
    };
  });
}

/**
 * Get latest agent states for a market.
 */
export async function getAgentStates(market: string) {
  return db.agentState.findMany({
    where: { market },
    orderBy: { timestamp: "desc" },
  });
}
