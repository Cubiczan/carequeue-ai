import { NextRequest, NextResponse } from "next/server";
import { getConsensusHistory } from "@/lib/swarm";

/**
 * GET /api/swarm/history?market=BTC-USD&limit=50
 * Returns historical consensus signals for a market from DB.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const market = searchParams.get("market");
    const limitParam = searchParams.get("limit");

    if (!market) {
      return NextResponse.json(
        { error: "Missing required query parameter: market" },
        { status: 400 }
      );
    }

    const limit = limitParam ? parseInt(limitParam, 10) : 50;

    if (isNaN(limit) || limit < 1 || limit > 200) {
      return NextResponse.json(
        { error: "Invalid limit parameter. Must be between 1 and 200." },
        { status: 400 }
      );
    }

    const history = await getConsensusHistory(market, limit);

    // Transform to frontend SignalHistoryEntry shape
    const entries = history.map((h, i) => {
      const agentVotes = h.agentVotes ?? [];
      const longCount = agentVotes.filter((v) => v.signal === "LONG").length;
      const shortCount = agentVotes.filter((v) => v.signal === "SHORT").length;
      const neutralCount = agentVotes.filter((v) => v.signal === "NEUTRAL").length;
      const dominantCount = Math.max(longCount, shortCount, neutralCount);
      const agreement = agentVotes.length > 0
        ? Math.round((dominantCount / agentVotes.length) * 100)
        : 0;

      return {
        id: `sig-${Date.now()}-${i}`,
        timestamp: new Date(h.timestamp).toISOString(),
        market: h.market,
        signal: h.signal,
        confidence: Math.round(h.confidence),
        agentAgreement: agreement,
      };
    });

    return NextResponse.json(entries);
  } catch (error) {
    console.error("Error fetching consensus history:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch consensus history",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
