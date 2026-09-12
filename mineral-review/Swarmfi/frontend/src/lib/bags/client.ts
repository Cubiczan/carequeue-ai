/**
 * Bags SDK Client — Initialization and shared utilities
 *
 * Wraps the @bagsfm/bags-sdk with environment-aware configuration.
 * Falls back to demo mode when no API key is configured.
 */

import { Connection, clusterApiUrl } from "@solana/web3.js";
import type {
  TradeQuote,
  SwapTransaction,
  AgentAuthInitResponse,
  AgentAuthCallbackResponse,
} from "./types";
import { BAGS_CONFIG } from "./types";

// ─── SDK Import ───────────────────────────────────────────────────────
// The @bagsfm/bags-sdk provides BagsSDK class with full token launch,
// fee sharing, trading, and partner management capabilities.

let bagsSdk: any = null;
let connection: Connection;

/**
 * Initialize the Bags SDK client
 * Requires BAGS_API_KEY environment variable for production use.
 * Falls back to demo mode when not available.
 */
export function initBagsClient(options?: {
  apiKey?: string;
  rpcUrl?: string;
  commitment?: string;
}) {
  const apiKey = options?.apiKey || process.env.NEXT_PUBLIC_BAGS_API_KEY || "";
  const rpcUrl = options?.rpcUrl || clusterApiUrl("devnet");
  const commitment = options?.commitment || "processed";

  connection = new Connection(rpcUrl, commitment as any);

  if (apiKey) {
    try {
      // Dynamic import to avoid build-time errors if SDK structure changes
      const { BagsSDK } = require("@bagsfm/bags-sdk");
      bagsSdk = new BagsSDK(apiKey, connection, commitment);
      console.log("[Bags] SDK initialized successfully");
    } catch (err) {
      console.warn("[Bags] SDK import failed, using REST client fallback:", err);
      bagsSdk = null;
    }
  } else {
    console.log("[Bags] No API key — running in demo mode");
    bagsSdk = null;
  }

  return { sdk: bagsSdk, connection };
}

/**
 * Check if the Bags client is operating in demo mode
 */
export function isDemoMode(): boolean {
  return !bagsSdk && !process.env.NEXT_PUBLIC_BAGS_API_KEY;
}

/**
 * Get the Solana connection used by the Bags client
 */
export function getConnection(): Connection {
  if (!connection) {
    connection = new Connection(clusterApiUrl("devnet"));
  }
  return connection;
}

// ─── REST API Fallback ────────────────────────────────────────────────
// When SDK is not available, we use direct REST calls to the Bags API.

export async function bagsApiRequest(
  endpoint: string,
  options?: RequestInit
): Promise<any> {
  const apiKey = process.env.NEXT_PUBLIC_BAGS_API_KEY;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string>),
  };
  if (apiKey) {
    headers["x-api-key"] = apiKey;
  }

  const res = await fetch(`${BAGS_CONFIG.baseUrl}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || `Bags API error: ${res.status}`);
  }

  return res.json();
}

// ─── Trading Functions ────────────────────────────────────────────────

/**
 * Get a trade quote for a token swap
 */
export async function getTradeQuote(params: {
  inputMint: string;
  outputMint: string;
  amount: number;
  slippageBps?: number;
}): Promise<TradeQuote> {
  if (bagsSdk) {
    try {
      const quote = await bagsSdk.trade.getQuote({
        inputMint: params.inputMint,
        outputMint: params.outputMint,
        amount: params.amount,
        slippageBps: params.slippageBps || 100,
      });
      return quote;
    } catch (err) {
      console.warn("[Bags] SDK quote failed, falling back to REST:", err);
    }
  }

  return bagsApiRequest(
    `/trade/quote?inputMint=${params.inputMint}&outputMint=${params.outputMint}&amount=${params.amount}&slippageBps=${params.slippageBps || 100}`
  );
}

/**
 * Create a swap transaction
 */
export async function createSwap(params: {
  inputMint: string;
  outputMint: string;
  amount: number;
  slippageBps?: number;
  wallet: string;
}): Promise<SwapTransaction> {
  if (bagsSdk) {
    try {
      const tx = await bagsSdk.trade.createSwapTransaction({
        inputMint: params.inputMint,
        outputMint: params.outputMint,
        amount: params.amount,
        slippageBps: params.slippageBps || 100,
        wallet: params.wallet,
      });
      return tx;
    } catch (err) {
      console.warn("[Bags] SDK swap failed, falling back to REST:", err);
    }
  }

  return bagsApiRequest("/trade/swap", {
    method: "POST",
    body: JSON.stringify({
      inputMint: params.inputMint,
      outputMint: params.outputMint,
      amount: params.amount,
      slippageBps: params.slippageBps || 100,
      wallet: params.wallet,
    }),
  });
}

// ─── Agent Auth Functions ─────────────────────────────────────────────

/**
 * Initialize agent authentication (Step 1)
 */
export async function agentAuthInit(address: string): Promise<AgentAuthInitResponse> {
  return bagsApiRequest("/agent/v2/auth/init", {
    method: "POST",
    body: JSON.stringify({ address }),
  });
}

/**
 * Complete agent authentication (Step 2) — returns API key
 */
export async function agentAuthCallback(params: {
  address: string;
  signature: string;
  nonce: string;
}): Promise<AgentAuthCallbackResponse> {
  return bagsApiRequest("/agent/v2/auth/callback", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

// ─── Analytics Functions ──────────────────────────────────────────────

/**
 * Get lifetime fees for a token
 */
export async function getLifetimeFees(tokenMint: string) {
  return bagsApiRequest(`/analytics/lifetime-fees?tokenMint=${tokenMint}`);
}

/**
 * Get fee claim events
 */
export async function getClaimEvents(tokenMint: string) {
  return bagsApiRequest(`/analytics/claim-events?tokenMint=${tokenMint}`);
}

/**
 * Get token launch feed
 */
export async function getTokenLaunchFeed() {
  return bagsApiRequest("/token-launch/feed");
}

export { bagsSdk };
