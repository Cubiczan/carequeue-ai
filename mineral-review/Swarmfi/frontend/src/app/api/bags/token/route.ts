/**
 * API Route: POST /api/bags/token
 *
 * Triggers the $SWARM token launch flow on the Bags platform.
 * In production: executes the full 5-step launch via Bags SDK.
 * In demo mode: returns mock launch response for presentation.
 */

import { NextResponse } from "next/server";
import { launchSwarmToken, getDemoBondingCurveState, getBondingCurveHistory } from "@/lib/bags/token";
import { isDemoMode } from "@/lib/bags/client";

export async function POST() {
  try {
    const result = await launchSwarmToken();

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
      { success: false, error: err.message || "Token launch failed" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/bags/token — Returns token state + bonding curve data
 */
export async function GET() {
  try {
    const bondingCurve = getDemoBondingCurveState();
    const history = getBondingCurveHistory();

    return NextResponse.json({
      success: true,
      token: {
        name: "SwarmFi",
        symbol: "SWARM",
        mint: bondingCurve.tokenMint,
        description: "AI Swarm Intelligence Oracle & Prediction Market Protocol",
      },
      bondingCurve,
      history,
      demo: isDemoMode(),
      tokenPageUrl: "https://bags.fm/SWARM_DEMO_MINT",
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
