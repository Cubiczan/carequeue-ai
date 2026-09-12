import { NextRequest, NextResponse } from "next/server";
import { safeFetch, isResilienceError } from "@/lib/resilience";

const METACOMP_BASE = "https://www.metacomp.ai";
const METACOMP_HOST = "www.metacomp.ai";

export async function POST(request: NextRequest) {
  try {
    const METACOMP_API_KEY = process.env.METACOMP_API_KEY;
    if (!METACOMP_API_KEY) {
      console.error("METACOMP_API_KEY is not configured");
      return NextResponse.json(
        { error: "MetaComp integration is not configured" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { network, transactionDetails } = body;

    if (!network || !transactionDetails || !Array.isArray(transactionDetails)) {
      return NextResponse.json(
        { error: "Missing required fields: network and transactionDetails" },
        { status: 400 }
      );
    }

    // Resilient outbound call: 5s per-attempt timeout, up to 2 retries
    // (3 attempts) with exponential backoff + jitter on 429/5xx/network,
    // and an SSRF allowlist pinned to the MetaComp host.
    const response = await safeFetch(`${METACOMP_BASE}/api/v1/transactionCheck`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${METACOMP_API_KEY}`,
      },
      body: JSON.stringify({ network, transactionDetails }),
      timeoutMs: 5_000,
      maxAttempts: 3,
      allowlist: [METACOMP_HOST],
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `MetaComp API error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Transaction check error:", error);
    // Timeout / exhausted-retry / network failures surface as 504 (upstream
    // unavailable) rather than a generic 500.
    if (isResilienceError(error)) {
      return NextResponse.json(
        { error: "MetaComp upstream unavailable", kind: error.kind },
        { status: 504 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error while checking transaction" },
      { status: 500 }
    );
  }
}
