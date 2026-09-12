/**
 * API Route: GET /api/bags/partner
 *
 * Returns SwarmFi's partner key stats on the Bags platform.
 * POST: Creates a new partner key (one-time setup).
 */

import { NextResponse } from "next/server";
import { getPartnerStats, createPartnerKey } from "@/lib/bags/partner";
import { isDemoMode } from "@/lib/bags/client";

export async function GET() {
  try {
    const stats = await getPartnerStats();

    return NextResponse.json({
      success: true,
      partner: stats,
      demo: isDemoMode(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { wallet, partnerBps } = body || {};

    const result = await createPartnerKey({ wallet, partnerBps });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      partnerKeyPda: result.partnerKeyPda,
      demo: isDemoMode(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Partner key creation failed" },
      { status: 500 }
    );
  }
}
