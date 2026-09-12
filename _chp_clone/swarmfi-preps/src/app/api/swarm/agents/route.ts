import { NextRequest, NextResponse } from "next/server";
import { getAgentStates } from "@/lib/swarm";

/** Agent display metadata — maps agent types to human-friendly names and icons */
const AGENT_META: Record<string, { displayName: string; icon: string; reasoning: string }> = {
  FundingAgent: { displayName: "Funding Rate Agent", icon: "Percent", reasoning: "Analyzes funding rate bias and overleveraged positions" },
  MomentumAgent: { displayName: "Momentum Agent", icon: "TrendingUp", reasoning: "Tracks price momentum using SMAs and candle patterns" },
  VolatilityAgent: { displayName: "Volatility Agent", icon: "Activity", reasoning: "Monitors volatility regime and breakout potential" },
  VolumeAgent: { displayName: "Volume Agent", icon: "BarChart3", reasoning: "Analyzes volume profile and buy/sell flow imbalance" },
  OrderbookAgent: { displayName: "Orderbook Agent", icon: "LineChart", reasoning: "Evaluates bid/ask depth and orderbook imbalance" },
  LiquidationAgent: { displayName: "Liquidation Agent", icon: "Zap", reasoning: "Assesses liquidation cascade risk from funding + volatility" },
  MeanReversionAgent: { displayName: "Mean Reversion Agent", icon: "ArrowLeftRight", reasoning: "Detects price extremes using z-score analysis" },
  TrendAgent: { displayName: "Trend Agent", icon: "Activity", reasoning: "Multi-timeframe trend alignment analysis" },
  SentimentAgent: { displayName: "Sentiment Agent", icon: "MessageCircle", reasoning: "Meta-agent synthesizing other agents' signals" },
};

/**
 * GET /api/swarm/agents?market=BTC-USD
 * Returns latest agent states for a market from DB, enriched with display metadata.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const market = searchParams.get("market");

    if (!market) {
      return NextResponse.json(
        { error: "Missing required query parameter: market" },
        { status: 400 }
      );
    }

    const states = await getAgentStates(market);

    // Transform to frontend AgentData shape
    const agents = states.map((s) => {
      const meta = AGENT_META[s.agentType] ?? {
        displayName: s.agentType,
        icon: "Activity",
        reasoning: "Market analysis agent",
      };

      return {
        agentType: s.agentType,
        displayName: meta.displayName,
        icon: meta.icon,
        lastVote: s.lastVote,
        score: s.score,
        confidence: s.score, // score doubles as confidence
        timestamp: s.timestamp.toISOString(),
        signal: s.lastVote,
        reasoning: meta.reasoning,
      };
    });

    // If DB is empty, return empty array (hooks will fall back to mock)
    return NextResponse.json(agents);
  } catch (error) {
    console.error("Error fetching agent states:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch agent states",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
