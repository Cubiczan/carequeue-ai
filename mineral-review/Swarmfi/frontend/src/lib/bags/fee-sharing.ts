/**
 * Bags Fee-Sharing Module — Oracle Signal Provider Rewards
 *
 * This module connects SwarmFi's stigmergy-based oracle system
 * with the Bags fee-sharing mechanism. Oracle signal providers
 * earn a share of $SWARM trading fees proportional to their
 * reputation score and signal accuracy.
 *
 * Fee Distribution Tiers (by reputation):
 *   Diamond (95+):  5000 bps (50% of provider pool)
 *   Gold (80-94):   3000 bps (30% of provider pool)
 *   Silver (50-79): 1500 bps (15% of provider pool)
 *   Bronze (0-49):   500 bps ( 5% of provider pool)
 *
 * The provider pool receives 15% (1500 bps) of total trading fees.
 */

import type {
  FeeStats,
  FeeClaimTransaction,
  OracleSignalProvider,
  OracleFeeDistribution,
} from "./types";
import { BAGS_CONFIG } from "./types";
import { isDemoMode, bagsApiRequest } from "./client";

// ─── Fee Distribution Logic ───────────────────────────────────────────

/**
 * Calculate fee distribution for oracle signal providers based on reputation
 *
 * @param providers - List of active signal providers with their stats
 * @param totalFeePool - Total fees available for distribution (in lamports)
 * @returns Distribution breakdown per provider
 */
export function calculateProviderFeeDistribution(
  providers: OracleSignalProvider[],
  totalFeePool: number
): OracleFeeDistribution[] {
  // Assign tiers based on reputation scores
  const tiered = providers.map((provider) => {
    let tier: OracleFeeDistribution["tier"];
    let shareBps: number;

    if (provider.reputationScore >= 95) {
      tier = "diamond";
      shareBps = BAGS_CONFIG.claimerTiers.diamond.bps;
    } else if (provider.reputationScore >= 80) {
      tier = "gold";
      shareBps = BAGS_CONFIG.claimerTiers.gold.bps;
    } else if (provider.reputationScore >= 50) {
      tier = "silver";
      shareBps = BAGS_CONFIG.claimerTiers.silver.bps;
    } else {
      tier = "bronze";
      shareBps = BAGS_CONFIG.claimerTiers.bronze.bps;
    }

    return { provider, tier, shareBps };
  });

  // Calculate total weight for proportional distribution
  const totalWeight = tiered.reduce((sum, t) => sum + t.shareBps, 0);

  return tiered.map(({ provider, tier, shareBps }) => ({
    provider,
    shareBps,
    tier,
    currentEarnings: Math.round(
      (shareBps / totalWeight) * totalFeePool * provider.accuracyRate
    ),
    pendingPayout: Math.round(
      (shareBps / totalWeight) * totalFeePool * provider.accuracyRate -
      provider.feesClaimed
    ),
  }));
}

/**
 * Build the fee claimers list for the on-chain fee share config
 * Translates oracle providers into Bags-compatible claimer entries
 */
export function buildFeeClaimersFromProviders(
  providers: OracleSignalProvider[],
  totalProviderBps: number = 1500 // 15% of total fees
): { wallet: string; userBps: number }[] {
  const totalWeight = providers.reduce((sum, p) => {
    if (p.reputationScore >= 95) return sum + BAGS_CONFIG.claimerTiers.diamond.bps;
    if (p.reputationScore >= 80) return sum + BAGS_CONFIG.claimerTiers.gold.bps;
    if (p.reputationScore >= 50) return sum + BAGS_CONFIG.claimerTiers.silver.bps;
    return sum + BAGS_CONFIG.claimerTiers.bronze.bps;
  }, 0);

  return providers.map((provider) => {
    let weight: number;
    if (provider.reputationScore >= 95) weight = BAGS_CONFIG.claimerTiers.diamond.bps;
    else if (provider.reputationScore >= 80) weight = BAGS_CONFIG.claimerTiers.gold.bps;
    else if (provider.reputationScore >= 50) weight = BAGS_CONFIG.claimerTiers.silver.bps;
    else weight = BAGS_CONFIG.claimerTiers.bronze.bps;

    const bps = Math.round((weight / totalWeight) * totalProviderBps);

    return {
      wallet: provider.wallet,
      userBps: bps,
    };
  });
}

// ─── Fee Statistics ───────────────────────────────────────────────────

/**
 * Get comprehensive fee statistics for the $SWARM token
 */
export async function getFeeStats(tokenMint?: string): Promise<FeeStats> {
  if (isDemoMode()) {
    return getDemoFeeStats();
  }

  try {
    const [lifetimeFees, claimEvents] = await Promise.all([
      bagsApiRequest(
        `/analytics/lifetime-fees${tokenMint ? `?tokenMint=${tokenMint}` : ""}`
      ),
      bagsApiRequest(
        `/analytics/claim-events${tokenMint ? `?tokenMint=${tokenMint}` : ""}`
      ),
    ]);

    return {
      totalFeesEarned: lifetimeFees.totalFees || 0,
      totalFeesClaimed: lifetimeFees.totalClaimed || 0,
      totalFeesUnclaimed: (lifetimeFees.totalFees || 0) - (lifetimeFees.totalClaimed || 0),
      lifetimeFees: lifetimeFees.lifetimeFees || 0,
      claimEvents: claimEvents.length || 0,
      feeRate: "2%",
      compoundingRate: "0%",
      recentClaims: (claimEvents || []).slice(0, 10).map((evt: any) => ({
        txSignature: evt.txSignature || "",
        amount: evt.amount || 0,
        token: "SWARM",
        claimer: evt.claimer || "",
        timestamp: evt.timestamp || "",
      })),
      claimerBreakdown: (lifetimeFees.claimers || []).map((c: any) => ({
        wallet: c.wallet,
        label: c.label,
        earned: c.earned || 0,
        claimed: c.claimed || 0,
        unclaimed: (c.earned || 0) - (c.claimed || 0),
      })),
    };
  } catch (err: any) {
    console.error("[Bags] Failed to get fee stats:", err);
    return getDemoFeeStats();
  }
}

/**
 * Get claimable fee positions for a wallet
 */
export async function getClaimablePositions(wallet: string) {
  if (isDemoMode()) {
    return {
      positions: [
        { tokenMint: "SWARM_DEMO_MINT", amount: 0.45, token: "SWARM" },
      ],
    };
  }

  try {
    return await bagsApiRequest(
      `/token-launch/claimable-positions?wallet=${wallet}`
    );
  } catch (err) {
    return { positions: [] };
  }
}

/**
 * Create fee claim transactions
 */
export async function createFeeClaimTxs(params: {
  tokenMint: string;
  wallet: string;
}): Promise<{ success: boolean; transactions?: FeeClaimTransaction[]; error?: string }> {
  if (isDemoMode()) {
    return {
      success: true,
      transactions: [
        {
          txSignature: "demo_claim_tx_" + Date.now(),
          amount: 0.45,
          token: "SWARM",
          claimer: params.wallet,
          timestamp: new Date().toISOString(),
        },
      ],
    };
  }

  try {
    const result = await bagsApiRequest("/token-launch/claim-txs/v3", {
      method: "POST",
      body: JSON.stringify({
        tokenMint: params.tokenMint,
        wallet: params.wallet,
      }),
    });
    return { success: true, transactions: result.transactions };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Demo Data ────────────────────────────────────────────────────────

export function getDemoOracleProviders(): OracleSignalProvider[] {
  return [
    {
      wallet: "AgentAlphaOracle111111111111111111111111111111",
      agentId: "alpha-price-agent",
      reputationScore: 97,
      signalsSubmitted: 12_450,
      accuracyRate: 0.96,
      feesEarned: 3_240,
      feesClaimed: 2_100,
      lastSignalAt: "2026-04-15T14:30:00Z",
      isActive: true,
    },
    {
      wallet: "AgentBetaOracle1111111111111111111111111111111",
      agentId: "beta-news-agent",
      reputationScore: 89,
      signalsSubmitted: 9_870,
      accuracyRate: 0.91,
      feesEarned: 2_180,
      feesClaimed: 1_560,
      lastSignalAt: "2026-04-15T14:28:00Z",
      isActive: true,
    },
    {
      wallet: "AgentGammaOracle111111111111111111111111111111",
      agentId: "gamma-dex-agent",
      reputationScore: 82,
      signalsSubmitted: 8_340,
      accuracyRate: 0.87,
      feesEarned: 1_890,
      feesClaimed: 1_200,
      lastSignalAt: "2026-04-15T14:25:00Z",
      isActive: true,
    },
    {
      wallet: "AgentDeltaOracle1111111111111111111111111111111",
      agentId: "delta-sentiment-agent",
      reputationScore: 65,
      signalsSubmitted: 6_720,
      accuracyRate: 0.78,
      feesEarned: 980,
      feesClaimed: 650,
      lastSignalAt: "2026-04-15T14:20:00Z",
      isActive: true,
    },
    {
      wallet: "AgentEpsilonOracle11111111111111111111111111111",
      agentId: "epsilon-volatility-agent",
      reputationScore: 42,
      signalsSubmitted: 4_560,
      accuracyRate: 0.69,
      feesEarned: 420,
      feesClaimed: 280,
      lastSignalAt: "2026-04-15T14:15:00Z",
      isActive: true,
    },
  ];
}

export function getDemoFeeStats(): FeeStats {
  return {
    totalFeesEarned: 18_450,
    totalFeesClaimed: 12_200,
    totalFeesUnclaimed: 6_250,
    lifetimeFees: 18_450,
    claimEvents: 342,
    feeRate: "2%",
    compoundingRate: "0%",
    recentClaims: [
      { txSignature: "claim_001", amount: 1.2, token: "SWARM", claimer: "AgentAlpha", timestamp: "2026-04-15T14:00:00Z" },
      { txSignature: "claim_002", amount: 0.8, token: "SWARM", claimer: "AgentBeta", timestamp: "2026-04-15T12:00:00Z" },
      { txSignature: "claim_003", amount: 0.65, token: "SWARM", claimer: "AgentGamma", timestamp: "2026-04-15T10:00:00Z" },
      { txSignature: "claim_004", amount: 0.42, token: "SWARM", claimer: "AgentDelta", timestamp: "2026-04-14T22:00:00Z" },
      { txSignature: "claim_005", amount: 0.28, token: "SWARM", claimer: "AgentEpsilon", timestamp: "2026-04-14T18:00:00Z" },
    ],
    claimerBreakdown: [
      { wallet: "AgentAlphaOracle...", label: "Alpha Price Agent", earned: 3_240, claimed: 2_100, unclaimed: 1_140 },
      { wallet: "AgentBetaOracle...", label: "Beta News Agent", earned: 2_180, claimed: 1_560, unclaimed: 620 },
      { wallet: "AgentGammaOracle...", label: "Gamma DEX Agent", earned: 1_890, claimed: 1_200, unclaimed: 690 },
      { wallet: "AgentDeltaOracle...", label: "Delta Sentiment Agent", earned: 980, claimed: 650, unclaimed: 330 },
      { wallet: "AgentEpsilonOracle...", label: "Epsilon Volatility Agent", earned: 420, claimed: 280, unclaimed: 140 },
    ],
  };
}
