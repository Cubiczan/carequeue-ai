import { NextRequest, NextResponse } from "next/server";
import { getCandles } from "@/lib/dydx";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const market = searchParams.get("market");
    const resolution = searchParams.get("resolution") || "1HOURS";
    const limitParam = searchParams.get("limit");

    if (!market) {
      return NextResponse.json(
        { error: "Missing required query parameter: market" },
        { status: 400 }
      );
    }

    const limit = limitParam ? parseInt(limitParam, 10) : 100;

    if (isNaN(limit) || limit < 1 || limit > 500) {
      return NextResponse.json(
        { error: "Invalid limit parameter. Must be between 1 and 500." },
        { status: 400 }
      );
    }

    const data = await getCandles(market, resolution, limit);

    // Transform to frontend CandleData shape
    const candles = (data.candles ?? []).map((c) => ({
      startedAt: c.startedAt,
      open: typeof c.open === "number" ? c.open : parseFloat(String(c.open)),
      close: typeof c.close === "number" ? c.close : parseFloat(String(c.close)),
      high: typeof c.high === "number" ? c.high : parseFloat(String(c.high)),
      low: typeof c.low === "number" ? c.low : parseFloat(String(c.low)),
      volume: typeof c.baseTokenVolume === "number" ? c.baseTokenVolume : parseFloat(String(c.baseTokenVolume ?? 0)),
    }));

    return NextResponse.json({ candles });
  } catch (error) {
    console.error("Error fetching candles:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch candles",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 502 }
    );
  }
}
