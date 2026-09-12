/**
 * Swarm Consensus Mechanism
 *
 * Implements adversarial weighted voting across all 9 agents.
 * Features:
 *  - Weighted scoring per agent type
 *  - Adversarial confidence reduction when split
 *  - Stigmergy board for shared inter-run state
 */

import type {
  AgentVote,
  AgentWeight,
  ConsensusResult,
  Signal,
  StigmergyBoard,
} from "./types";

// ── Agent Weights ───────────────────────────────────────────────
// Each agent has a base weight reflecting its reliability and
// information quality in the perpetual markets context.

export const AGENT_WEIGHTS: Record<string, AgentWeight> = {
  FundingAgent: {
    agentType: "FundingAgent",
    weight: 1.3,
    description: "Funding rates are the strongest signal for perp market positioning",
  },
  MomentumAgent: {
    agentType: "MomentumAgent",
    weight: 1.1,
    description: "Price momentum provides reliable short-term direction",
  },
  VolatilityAgent: {
    agentType: "VolatilityAgent",
    weight: 0.8,
    description: "Volatility is more of a filter than a directional signal",
  },
  VolumeAgent: {
    agentType: "VolumeAgent",
    weight: 1.2,
    description: "Volume confirms or denies the strength of moves",
  },
  OrderbookAgent: {
    agentType: "OrderbookAgent",
    weight: 1.0,
    description: "Orderbook shows immediate supply/demand but can be spoofed",
  },
  LiquidationAgent: {
    agentType: "LiquidationAgent",
    weight: 1.4,
    description: "Liquidation cascades create some of the strongest perp signals",
  },
  MeanReversionAgent: {
    agentType: "MeanReversionAgent",
    weight: 0.9,
    description: "Mean reversion works well in ranging markets",
  },
  TrendAgent: {
    agentType: "TrendAgent",
    weight: 1.1,
    description: "Multi-timeframe trend alignment is a strong confirmation signal",
  },
  SentimentAgent: {
    agentType: "SentimentAgent",
    weight: 1.0,
    description: "Meta-agent synthesizes other agents' signals",
  },
};

// ── Adversarial Consensus Algorithm ─────────────────────────────

/**
 * Compute weighted consensus from a collection of agent votes.
 *
 * Algorithm:
 *  1. Weight each agent vote by its configured weight
 *  2. Sum LONG, SHORT, NEUTRAL weights
 *  3. Determine signal by weighted majority
 *  4. Calculate confidence = (winning - losing) / total * 100
 *  5. If adversarial split (evenly divided), reduce confidence
 *  6. Update stigmergy board with results
 */
export function computeConsensus(
  votes: AgentVote[],
  previousBoard?: StigmergyBoard
): {
  signal: Signal;
  confidence: number;
  stigmergyBoard: StigmergyBoard;
} {
  let longWeight = 0;
  let shortWeight = 0;
  let neutralWeight = 0;
  let longCount = 0;
  let shortCount = 0;
  let neutralCount = 0;
  let totalConfidence = 0;

  const lastSignals: Record<string, Signal> = {};

  for (const vote of votes) {
    const w = AGENT_WEIGHTS[vote.agentType]?.weight ?? 1.0;
    const confidenceScaledWeight = w * (vote.confidence / 100);

    lastSignals[vote.agentType] = vote.signal;
    totalConfidence += vote.confidence;

    switch (vote.signal) {
      case "LONG":
        longWeight += confidenceScaledWeight;
        longCount++;
        break;
      case "SHORT":
        shortWeight += confidenceScaledWeight;
        shortCount++;
        break;
      case "NEUTRAL":
        neutralWeight += confidenceScaledWeight;
        neutralCount++;
        break;
    }
  }

  const totalWeight = longWeight + shortWeight + neutralWeight;

  // Determine winning signal
  let signal: Signal = "NEUTRAL";
  if (longWeight > shortWeight && longWeight > neutralWeight) {
    signal = "LONG";
  } else if (shortWeight > longWeight && shortWeight > neutralWeight) {
    signal = "SHORT";
  } else {
    signal = "NEUTRAL";
  }

  // Calculate confidence
  let confidence: number;
  if (signal === "NEUTRAL") {
    // If neutral won, confidence is based on how much neutral dominated
    confidence = totalWeight > 0 ? (neutralWeight / totalWeight) * 60 : 20;
  } else {
    const winningWeight = signal === "LONG" ? longWeight : shortWeight;
    const losingWeight = signal === "LONG" ? shortWeight : longWeight;
    confidence =
      totalWeight > 0
        ? ((winningWeight - losingWeight) / totalWeight) * 100
        : 20;
  }

  // ── Adversarial check ──
  // If bullish and bearish agents are evenly split, reduce confidence
  const nonNeutralAgents = longCount + shortCount;
  const balanceRatio =
    nonNeutralAgents > 0
      ? Math.abs(longCount - shortCount) / nonNeutralAgents
      : 0;

  if (balanceRatio < 0.2 && nonNeutralAgents >= 4) {
    // Highly adversarial — signals are fighting each other
    confidence *= 0.5; // Halve the confidence
  } else if (balanceRatio < 0.35 && nonNeutralAgents >= 3) {
    // Somewhat adversarial
    confidence *= 0.7;
  }

  // Confidence bounds
  confidence = Math.max(10, Math.min(90, confidence));

  // ── Volatility & liquidation risk assessment ──
  const volAgent = votes.find((v) => v.agentType === "VolatilityAgent");
  const liqAgent = votes.find((v) => v.agentType === "LiquidationAgent");

  let volatilityRegime: StigmergyBoard["volatilityRegime"] = "NORMAL";
  let liquidationRiskLevel: StigmergyBoard["liquidationRiskLevel"] = "LOW";

  if (volAgent) {
    if (volAgent.confidence > 65 && volAgent.signal === "NEUTRAL") {
      volatilityRegime = "HIGH";
    } else if (volAgent.confidence > 50) {
      volatilityRegime = "NORMAL";
    } else {
      volatilityRegime = "LOW";
    }
  }

  if (liqAgent) {
    if (liqAgent.confidence > 65) {
      liquidationRiskLevel = "HIGH";
    } else if (liqAgent.confidence > 45) {
      liquidationRiskLevel = "MEDIUM";
    }
  }

  // ── Update stigmergy board ──
  const stigmergyBoard: StigmergyBoard = {
    lastSignals,
    signalCounts: {
      LONG: longCount,
      SHORT: shortCount,
      NEUTRAL: neutralCount,
    },
    averageConfidence: votes.length > 0 ? totalConfidence / votes.length : 0,
    lastUpdated: Date.now(),
    liquidationRiskLevel,
    volatilityRegime,
    ...(previousBoard ? { previousSignals: previousBoard.lastSignals } : {}),
  };

  return { signal, confidence, stigmergyBoard };
}

/**
 * Full consensus pipeline — runs agents → computes consensus → returns result.
 */
export function runConsensus(
  votes: AgentVote[],
  market: string,
  previousBoard?: StigmergyBoard
): ConsensusResult {
  const { signal, confidence, stigmergyBoard } = computeConsensus(
    votes,
    previousBoard
  );

  return {
    market,
    signal,
    confidence,
    agentVotes: votes,
    timestamp: Date.now(),
    stigmergyBoard,
  };
}
