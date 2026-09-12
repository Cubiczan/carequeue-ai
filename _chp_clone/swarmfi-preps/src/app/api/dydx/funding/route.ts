import { NextRequest, NextResponse } from "next/server";
import { getHistoricalFunding } from "@/lib/dydx";

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

    const limit = limitParam ? parseInt(limitParam, 10) : 20;

    if (isNaN(limit) || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: "Invalid limit parameter. Must be between 1 and 100." },
        { status: 400 }
      );
    }

    const data = await getHistoricalFunding(market, limit);

    // Transform to frontend FundingData shape
    const funding = (data.historicalFunding ?? []).map((f) => ({
      effectiveAt: f.effectiveAt,
      rate: parseFloat(f.rate) || 0,
    }));

    return NextResponse.json({ funding });
  } catch (error) {
    console.error("Error fetching historical funding:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch historical funding",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 502 }
    );
  }
}
