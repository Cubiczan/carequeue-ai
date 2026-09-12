/**
 * Swarm Engine — Type Definitions
 *
 * Defines all types used by the agent swarm, consensus mechanism,
 * and the overall analysis pipeline.
 */

export type Signal = "LONG" | "SHORT" | "NEUTRAL";

export interface AgentVote {
  agentType: string;
  signal: Signal;
  confidence: number; // 0-100
  reasoning: string;
}

export interface ConsensusResult {
  market: string;
  signal: Signal;
  confidence: number; // 0-100
  agentVotes: AgentVote[];
  timestamp: number;
  stigmergyBoard: Record<string, unknown>;
}

/** Market data blob passed to every agent */
export interface MarketDataBundle {
  orderbook: {
    bids: { price: number; size: number }[];
    asks: { price: number; size: number }[];
  } | null;
  trades: {
    side: "BUY" | "SELL";
    size: number;
    price: number;
    createdAt: number;
  }[];
  candles: {
    startedAt: string;
    open: number;
    high: number;
    low: number;
    close: number;
    baseTokenVolume: number;
    usdVolume: number;
    trades: number;
  }[];
  funding: {
    rate: string;
    effectiveAt: string;
    price: string;
  }[];
  market: {
    ticker: string;
    oraclePrice: string;
    openInterest: string;
    volume24h: string;
    nextFundingTime: string;
  } | null;
  /** Pre-computed helpers */
  stats: {
    midPrice: number;
    spread: number;
    volume24h: number;
    openInterest: number;
    fundingRate1h: number; // annualized percentage
  };
}

/** Configuration for an agent's weight in consensus */
export interface AgentWeight {
  agentType: string;
  weight: number;
  description: string;
}

/** Shared stigmergy board — agents leave traces here */
export interface StigmergyBoard {
  lastSignals: Record<string, Signal>;
  signalCounts: { LONG: number; SHORT: number; NEUTRAL: number };
  averageConfidence: number;
  lastUpdated: number;
  liquidationRiskLevel: "LOW" | "MEDIUM" | "HIGH";
  volatilityRegime: "LOW" | "NORMAL" | "HIGH";
}
