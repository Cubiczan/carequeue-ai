import { NextRequest, NextResponse } from "next/server";
import { getOrderbook } from "@/lib/dydx";

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

    const data = await getOrderbook(market);

    // Transform to frontend OrderbookData shape
    const bids = (data.bids ?? []).map((b) => ({
      price: typeof b.price === "number" ? b.price : parseFloat(String(b.price)),
      size: typeof b.size === "number" ? b.size : parseFloat(String(b.size)),
    }));

    const asks = (data.asks ?? []).map((a) => ({
      price: typeof a.price === "number" ? a.price : parseFloat(String(a.price)),
      size: typeof a.size === "number" ? a.size : parseFloat(String(a.size)),
    }));

    // Compute spread and mid price
    const midPrice =
      bids.length > 0 && asks.length > 0
        ? (bids[0].price + asks[0].price) / 2
        : 0;
    const spread =
      bids.length > 0 && asks.length > 0
        ? asks[0].price - bids[0].price
        : 0;

    return NextResponse.json({
      bids,
      asks,
      spread,
      midPrice,
    });
  } catch (error) {
    console.error("Error fetching orderbook:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch orderbook",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 502 }
    );
  }
}
