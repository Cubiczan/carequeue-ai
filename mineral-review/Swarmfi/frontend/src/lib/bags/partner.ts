/**
 * Bags Partner Key Module
 *
 * Manages the SwarmFi partner key on the Bags platform.
 * As a partner, SwarmFi earns 25% of trading fees from any token
 * launched using the SwarmFi partner key — creating a sustainable
 * revenue stream for the protocol.
 */

import type { PartnerKey, PartnerStats } from "./types";
import { BAGS_CONFIG } from "./types";
import { isDemoMode, bagsApiRequest } from "./client";

// ─── Partner Key Management ───────────────────────────────────────────

/**
 * Create a SwarmFi partner key on the Bags platform
 *
 * Once created, any token launch that references this partner key
 * will automatically route 25% (default) of trading fees to SwarmFi.
 */
export async function createPartnerKey(params?: {
  wallet?: string;
  partnerBps?: number;
}): Promise<{ success: boolean; partnerKeyPda?: string; error?: string }> {
  if (isDemoMode()) {
    return {
      success: true,
      partnerKeyPda: "SWARMFI_PARTNER_PDA_11111111111111111111111111111111",
    };
  }

  try {
    const result = await bagsApiRequest("/partner/config", {
      method: "POST",
      body: JSON.stringify({
        wallet: params?.wallet,
        partnerBps: params?.partnerBps || BAGS_CONFIG.defaultPartnerBps,
      }),
    });
    return { success: true, partnerKeyPda: result.partnerKeyPda };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Get partner statistics
 */
export async function getPartnerStats(partnerKeyPda?: string): Promise<PartnerStats> {
  if (isDemoMode()) {
    return getDemoPartnerStats();
  }

  try {
    const result = await bagsApiRequest(
      `/partner/stats${partnerKeyPda ? `?partnerKey=${partnerKeyPda}` : ""}`
    );
    return result;
  } catch (err: any) {
    console.error("[Bags] Failed to get partner stats:", err);
    return getDemoPartnerStats();
  }
}

/**
 * Create fee claim transactions for partner earnings
 */
export async function createPartnerClaimTxs(params: {
  partnerKeyPda: string;
  wallet: string;
}): Promise<{ success: boolean; transactions?: string[]; error?: string }> {
  if (isDemoMode()) {
    return {
      success: true,
      transactions: ["demo_partner_claim_tx_1", "demo_partner_claim_tx_2"],
    };
  }

  try {
    const result = await bagsApiRequest("/partner/claim-txs", {
      method: "POST",
      body: JSON.stringify({
        partnerKey: params.partnerKeyPda,
        wallet: params.wallet,
      }),
    });
    return { success: true, transactions: result.transactions };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Demo Data ────────────────────────────────────────────────────────

export function getDemoPartnerKey(): PartnerKey {
  return {
    partnerKeyPda: "SWARMFI_PARTNER_PDA_11111111111111111111111111111111",
    wallet: "SwarmFiTreasury1111111111111111111111111",
    partnerBps: 2500,
    totalFeesEarned: 12_450,
    totalFeesClaimed: 8_200,
    tokensLaunchedWithPartner: 7,
    createdAt: "2026-04-02T00:00:00Z",
  };
}

export function getDemoPartnerStats(): PartnerStats {
  return {
    partner: getDemoPartnerKey(),
    tokensLaunched: 7,
    totalVolume: 2_450_000,
    feesEarned: 12_450,
    feesClaimed: 8_200,
    feesUnclaimed: 4_250,
  };
}
