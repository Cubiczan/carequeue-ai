import { NextRequest, NextResponse } from "next/server";
import { getPerpetualMarkets } from "@/lib/dydx";

export async function GET() {
  try {
    const data = await getPerpetualMarkets();

    // Transform to MarketData shape expected by the frontend
    const markets = Object.entries(data.markets)
      .filter(([, m]) => m.status === "ACTIVE")
      .map(([pair, m]) => ({
        ticker: m.ticker,
        pair,
        baseAsset: m.baseAsset,
        quoteAsset: m.quoteAsset,
        price: parseFloat(m.oraclePrice) || 0,
        openInterest: parseFloat(m.openInterest) || 0,
        volume24h: parseFloat(m.volume24h) || 0,
        change24h: 0, // not available from static metadata
        fundingRate: 0, // not available from static metadata
        nextFundingTime: m.nextFundingTime,
      }))
      .sort((a, b) => b.volume24h - a.volume24h)
      .slice(0, 20); // top 20 by volume

    return NextResponse.json({
      markets,
      count: markets.length,
    });
  } catch (error) {
    console.error("Error fetching perpetual markets:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch perpetual markets",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 502 }
    );
  }
}
