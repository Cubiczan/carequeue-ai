/**
 * Bags Token Launch Module
 *
 * Handles $SWARM token creation on the Bags platform using the Bags SDK.
 * Supports the full 5-step launch flow:
 *   1. Create token info & metadata (upload to Arweave)
 *   2. Configure fee-sharing for oracle signal providers
 *   3. Create on-chain fee share config
 *   4. Generate launch transaction
 *   5. Sign & broadcast via Jito bundle
 *
 * When no API key is configured, returns demo/mock data for presentation.
 */

import type {
  TokenInfo,
  TokenLaunchResponse,
  FeeClaimer,
  BondingCurveState,
  FeeShareConfig,
} from "./types";
import { BAGS_CONFIG } from "./types";
import { isDemoMode, bagsApiRequest } from "./client";

// ─── $SWARM Token Configuration ───────────────────────────────────────

export const SWARM_TOKEN_CONFIG: TokenInfo = {
  name: "SwarmFi",
  symbol: "SWARM",
  description:
    "SwarmFi — AI Swarm Intelligence Oracle & Prediction Market Protocol on Solana. Stake SWARM to participate in decentralized oracle feeds, prediction markets, and earn fee-sharing rewards from agent signal providers.",
  imageUrl: "https://raw.githubusercontent.com/zan-maker/swarmfi-solana/main/assets/swarmfi-logo.png",
  decimals: 9,
  initialBuyLamports: 10_000_000, // 0.01 SOL initial buy
};

/**
 * Default fee-sharing configuration for $SWARM token
 *
 * Fee distribution:
 *   - Protocol (Bags):     50% (5000 bps)
 *   - Creator (SwarmFi):   30% (3000 bps)
 *   - Signal Providers:    15% (1500 bps) — distributed by reputation tier
 *   - Treasury Reserve:     5% (500 bps)
 */
export const SWARM_FEE_SHARE_CONFIG: FeeShareConfig = {
  bagsConfigType: BAGS_CONFIG.defaultFeeConfig,
  creatorBps: 3000,
  protocolBps: 5000,
  compoundingBps: 0,
  feeRatePercent: 2,
  claimers: [
    {
      wallet: "SwarmFiTreasury1111111111111111111111111",
      bps: 3000,
      label: "SwarmFi Treasury",
    },
    {
      wallet: "SignalProviderPool11111111111111111111111",
      bps: 1500,
      label: "Oracle Signal Provider Pool",
    },
    {
      wallet: "EcosystemGrowth111111111111111111111111111",
      bps: 500,
      label: "Ecosystem Growth Fund",
    },
  ],
};

// ─── Token Launch Functions ───────────────────────────────────────────

/**
 * Step 1: Create token metadata on-chain (Arweave upload)
 */
export async function createTokenInfo(token: TokenInfo): Promise<{
  tokenInfoId?: string;
  metadataUri?: string;
  error?: string;
}> {
  if (isDemoMode()) {
    return {
      tokenInfoId: "demo_token_info_" + Date.now(),
      metadataUri: "arweave://demo-metadata-uri",
    };
  }

  try {
    const result = await bagsApiRequest("/token-launch/create-token-info", {
      method: "POST",
      body: JSON.stringify({
        name: token.name,
        symbol: token.symbol,
        description: token.description,
        imageUrl: token.imageUrl,
        decimals: token.decimals || 9,
      }),
    });
    return result;
  } catch (err: any) {
    return { error: err.message };
  }
}

/**
 * Step 2: Look up fee claimer wallets by social handle
 */
export async function lookupFeeClaimers(
  claimers: { handle: string; platform: string }[]
): Promise<FeeClaimer[]> {
  if (isDemoMode()) {
    return claimers.map((c, i) => ({
      wallet: `Claimer${i + 1}Wallet11111111111111111111111111`,
      bps: 1000,
      socialHandle: c.handle,
      socialPlatform: c.platform as any,
    }));
  }

  const results: FeeClaimer[] = [];
  for (const claimer of claimers) {
    try {
      const result = await bagsApiRequest("/token-launch/fee-share/wallet/v2", {
        method: "POST",
        body: JSON.stringify({
          platform: claimer.platform,
          handle: claimer.handle,
        }),
      });
      if (result.wallet) {
        results.push({
          wallet: result.wallet,
          bps: 1000,
          socialHandle: claimer.handle,
          socialPlatform: claimer.platform as any,
        });
      }
    } catch (err) {
      console.warn(`[Bags] Failed to look up ${claimer.handle}:`, err);
    }
  }
  return results;
}

/**
 * Step 3: Create on-chain fee share configuration
 */
export async function createFeeShareConfig(params: {
  tokenMint: string;
  claimers: FeeClaimer[];
  configType?: string;
}): Promise<{ success: boolean; configPda?: string; error?: string }> {
  if (isDemoMode()) {
    return {
      success: true,
      configPda: "demo_fee_config_pda_" + Date.now(),
    };
  }

  try {
    const result = await bagsApiRequest("/fee-share/config", {
      method: "POST",
      body: JSON.stringify({
        tokenMint: params.tokenMint,
        bagsConfigType: params.configType || BAGS_CONFIG.defaultFeeConfig,
        feeClaimers: params.claimers,
      }),
    });
    return { success: true, configPda: result.configPda };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Step 4: Generate the launch transaction
 */
export async function createLaunchTransaction(params: {
  tokenInfoId: string;
  feeConfigPda: string;
  initialBuyLamports: number;
}): Promise<{ success: boolean; transaction?: string; error?: string }> {
  if (isDemoMode()) {
    return {
      success: true,
      transaction: "demo_launch_transaction_base64...",
    };
  }

  try {
    const result = await bagsApiRequest("/token-launch/create-launch-transaction", {
      method: "POST",
      body: JSON.stringify({
        tokenInfoId: params.tokenInfoId,
        feeConfigPda: params.feeConfigPda,
        initialBuyLamports: params.initialBuyLamports,
      }),
    });
    return { success: true, transaction: result.transaction };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Full launch flow — executes all 5 steps
 *
 * In production, step 5 requires wallet signing (handled client-side).
 * In demo mode, returns mock response for presentation.
 */
export async function launchSwarmToken(): Promise<TokenLaunchResponse> {
  if (isDemoMode()) {
    // Simulate launch delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    return {
      success: true,
      tokenMint: "SWARM_DEMO_MINT_1111111111111111111111111111111",
      txSignature: "demo_tx_signature_" + Date.now(),
      tokenPageUrl: "https://bags.fm/SWARM_DEMO_MINT",
    };
  }

  try {
    // Step 1: Create token metadata
    const tokenInfo = await createTokenInfo(SWARM_TOKEN_CONFIG);
    if (tokenInfo.error || !tokenInfo.tokenInfoId) {
      return { success: false, error: tokenInfo.error || "Failed to create token info" };
    }

    // Step 2: Fee share config is pre-defined (SWARM_FEE_SHARE_CONFIG)

    // Step 3: Create fee share on-chain
    const feeConfig = await createFeeShareConfig({
      tokenMint: "pending",
      claimers: SWARM_FEE_SHARE_CONFIG.claimers,
      configType: SWARM_FEE_SHARE_CONFIG.bagsConfigType,
    });
    if (!feeConfig.success) {
      return { success: false, error: feeConfig.error };
    }

    // Step 4: Generate launch transaction
    const launchTx = await createLaunchTransaction({
      tokenInfoId: tokenInfo.tokenInfoId,
      feeConfigPda: feeConfig.configPda!,
      initialBuyLamports: SWARM_TOKEN_CONFIG.initialBuyLamports || 10_000_000,
    });
    if (!launchTx.success) {
      return { success: false, error: launchTx.error };
    }

    // Step 5: Transaction needs to be signed by the wallet (client-side)
    return {
      success: true,
      txSignature: launchTx.transaction ? "pending_sign" : undefined,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Get mock bonding curve state for demo/presentation
 */
export function getDemoBondingCurveState(): BondingCurveState {
  return {
    tokenMint: "SWARM_DEMO_MINT_1111111111111111111111111111111",
    priceUsd: 0.00042,
    priceSol: 0.0000024,
    marketCap: 420_000,
    poolTokens: 1_000_000_000,
    quoteTokens: 42_000_000_000,
    migrationThreshold: 85_000_000_000,
    migrationProgress: 49.4,
    isMigrated: false,
    volume24h: 28_500,
    holders: 1_247,
    createdAt: "2026-04-15T00:00:00Z",
  };
}

/**
 * Get historical bonding curve data for chart visualization
 */
export function getBondingCurveHistory(): {
  time: string;
  price: number;
  marketCap: number;
  volume: number;
}[] {
  const now = Date.now();
  const points = 48; // 48 data points (every 30 min for 24h)
  const data = [];

  let price = 0.00012;
  let marketCap = 120_000;

  for (let i = points; i >= 0; i--) {
    const time = new Date(now - i * 30 * 60 * 1000);
    const hour = time.getHours().toString().padStart(2, "0");
    const minute = time.getMinutes().toString().padStart(2, "0");

    // Simulate organic price movement with upward trend
    const trend = (points - i) / points;
    const noise = (Math.random() - 0.45) * 0.00004;
    price = 0.00012 + trend * 0.00035 + noise;
    marketCap = price * 1_000_000_000;
    const volume = 500 + Math.random() * 2_500 + trend * 1_500;

    data.push({
      time: `${hour}:${minute}`,
      price: parseFloat(price.toFixed(6)),
      marketCap: Math.round(marketCap),
      volume: Math.round(volume),
    });
  }

  return data;
}
