import { NextRequest, NextResponse } from "next/server";
import { getTrades } from "@/lib/dydx";

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

    const limit = limitParam ? parseInt(limitParam, 10) : 100;

    if (isNaN(limit) || limit < 1 || limit > 500) {
      return NextResponse.json(
        { error: "Invalid limit parameter. Must be between 1 and 500." },
        { status: 400 }
      );
    }

    const data = await getTrades(market, limit);

    // Transform to frontend TradeData shape
    const trades = (data.trades ?? []).map((t) => ({
      price: typeof t.price === "number" ? t.price : parseFloat(String(t.price)),
      size: typeof t.size === "number" ? t.size : parseFloat(String(t.size)),
      side: t.side,
      timestamp:
        typeof t.createdAt === "number"
          ? new Date(t.createdAt * 1000).toISOString()
          : typeof t.createdAt === "string"
            ? t.createdAt
            : new Date().toISOString(),
    }));

    return NextResponse.json({ trades });
  } catch (error) {
    console.error("Error fetching trades:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch trades",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 502 }
    );
  }
}
