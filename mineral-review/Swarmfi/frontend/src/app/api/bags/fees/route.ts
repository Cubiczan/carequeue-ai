/**
 * API Route: GET /api/bags/fees
 *
 * Returns comprehensive fee statistics for the $SWARM token,
 * including earnings breakdown by oracle signal provider.
 */

import { NextResponse } from "next/server";
import { getFeeStats, getDemoOracleProviders, calculateProviderFeeDistribution } from "@/lib/bags/fee-sharing";
import { isDemoMode } from "@/lib/bags/client";

export async function GET() {
  try {
    const feeStats = await getFeeStats();
    const providers = getDemoOracleProviders();

    // Calculate fee distribution across providers
    const distribution = calculateProviderFeeDistribution(
      providers,
      feeStats.totalFeesUnclaimed
    );

    return NextResponse.json({
      success: true,
      fees: feeStats,
      providers: distribution,
      demo: isDemoMode(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/bags/fees — Claim accumulated fees
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tokenMint, wallet } = body;

    if (!wallet) {
      return NextResponse.json(
        { success: false, error: "Wallet address required" },
        { status: 400 }
      );
    }

    const { createFeeClaimTxs } = await import("@/lib/bags/fee-sharing");
    const result = await createFeeClaimTxs({
      tokenMint: tokenMint || "SWARM_DEMO_MINT",
      wallet,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result,
      demo: isDemoMode(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Fee claim failed" },
      { status: 500 }
    );
  }
}
