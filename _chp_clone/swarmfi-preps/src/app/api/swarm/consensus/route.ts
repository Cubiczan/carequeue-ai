import { NextRequest, NextResponse } from "next/server";
import {
  runSwarmAnalysis,
  getLatestConsensus,
} from "@/lib/swarm";

/**
 * GET /api/swarm/consensus?market=BTC-USD
 * Fetches the latest cached consensus signal from DB.
 *
 * POST /api/swarm/consensus?market=BTC-USD
 * Triggers a fresh swarm analysis run.
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

    const result = await getLatestConsensus(market);

    if (!result) {
      return NextResponse.json(
        { error: `No consensus signal found for ${market}. Run a POST request to generate one.` },
        { status: 404 }
      );
    }

    // Transform to frontend ConsensusSignal shape
    return NextResponse.json({
      market: result.market,
      signal: result.signal,
      confidence: Math.round(result.confidence),
      agentVotes: (result.agentVotes ?? []).map((v) => ({
        agentType: v.agentType,
        signal: v.signal,
      })),
      timestamp: new Date(result.timestamp).toISOString(),
    });
  } catch (error) {
    console.error("Error fetching consensus:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch consensus signal",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const market = searchParams.get("market");

    if (!market) {
      return NextResponse.json(
        { error: "Missing required query parameter: market" },
        { status: 400 }
      );
    }

    // Run the full swarm analysis (fetches data, runs agents, computes consensus, saves to DB)
    const result = await runSwarmAnalysis(market);

    return NextResponse.json({
      success: true,
      market: result.market,
      signal: result.signal,
      confidence: Math.round(result.confidence),
      agentVotes: (result.agentVotes ?? []).map((v) => ({
        agentType: v.agentType,
        signal: v.signal,
      })),
      timestamp: new Date(result.timestamp).toISOString(),
    });
  } catch (error) {
    console.error("Error running swarm analysis:", error);
    return NextResponse.json(
      {
        error: "Failed to run swarm analysis",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 502 }
    );
  }
}
