/**
 * Bags Integration — TypeScript Types
 *
 * Type definitions for the Bags SDK integration layer,
 * covering token launch, fee-sharing, partner keys, and oracle signal provider models.
 */

// ─── Token Launch Types ───────────────────────────────────────────────

export interface TokenInfo {
  name: string;
  symbol: string;
  description: string;
  imageUrl: string;
  decimals?: number;
  initialBuyLamports?: number;
}

export interface TokenLaunchResponse {
  success: boolean;
  tokenMint?: string;
  txSignature?: string;
  tokenPageUrl?: string;
  error?: string;
}

export interface BondingCurveState {
  tokenMint: string;
  priceUsd: number;
  priceSol: number;
  marketCap: number;
  poolTokens: number;
  quoteTokens: number;
  migrationThreshold: number;
  migrationProgress: number; // 0-100%
  isMigrated: boolean;
  volume24h: number;
  holders: number;
  createdAt: string;
}

// ─── Fee-Sharing Types ────────────────────────────────────────────────

export interface FeeClaimer {
  wallet: string;
  bps: number; // basis points (10000 = 100%)
  label?: string;
  socialHandle?: string;
  socialPlatform?: "twitter" | "github" | "kick";
}

export interface FeeShareConfig {
  bagsConfigType: string;
  creatorBps: number;
  protocolBps: number;
  compoundingBps: number;
  feeRatePercent: number;
  claimers: FeeClaimer[];
}

export interface FeeClaimTransaction {
  txSignature: string;
  amount: number;
  token: string;
  claimer: string;
  timestamp: string;
}

export interface FeeStats {
  totalFeesEarned: number;
  totalFeesClaimed: number;
  totalFeesUnclaimed: number;
  lifetimeFees: number;
  claimEvents: number;
  feeRate: string;
  compoundingRate: string;
  recentClaims: FeeClaimTransaction[];
  claimerBreakdown: {
    wallet: string;
    label?: string;
    earned: number;
    claimed: number;
    unclaimed: number;
  }[];
}

// ─── Partner Key Types ────────────────────────────────────────────────

export interface PartnerKey {
  partnerKeyPda: string;
  wallet: string;
  partnerBps: number;
  totalFeesEarned: number;
  totalFeesClaimed: number;
  tokensLaunchedWithPartner: number;
  createdAt: string;
}

export interface PartnerStats {
  partner: PartnerKey;
  tokensLaunched: number;
  totalVolume: number;
  feesEarned: number;
  feesClaimed: number;
  feesUnclaimed: number;
}

// ─── Oracle Signal Provider Types ─────────────────────────────────────

export interface OracleSignalProvider {
  wallet: string;
  agentId: string;
  reputationScore: number;
  signalsSubmitted: number;
  accuracyRate: number;
  feesEarned: number;
  feesClaimed: number;
  lastSignalAt: string;
  isActive: boolean;
}

export interface OracleFeeDistribution {
  provider: OracleSignalProvider;
  shareBps: number;
  currentEarnings: number;
  pendingPayout: number;
  tier: "bronze" | "silver" | "gold" | "diamond";
}

// ─── Agent Auth (Bags Agent V2) Types ─────────────────────────────────

export interface AgentAuthInitResponse {
  message: string;
  nonce: string;
}

export interface AgentAuthCallbackResponse {
  apiKey: string;
  expiresAt?: string;
}

// ─── Trading Types ────────────────────────────────────────────────────

export interface TradeQuote {
  inputMint: string;
  outputMint: string;
  inputAmount: number;
  outputAmount: number;
  priceImpact: number;
  fee: number;
  route: string[];
}

export interface SwapTransaction {
  transaction: string; // base64 serialized tx
  inputMint: string;
  outputMint: string;
  inAmount: number;
  outAmount: number;
  fee: number;
}

// ─── Configuration ────────────────────────────────────────────────────

export const BAGS_CONFIG = {
  baseUrl: "https://public-api-v2.bags.fm/api/v1",
  devPortalUrl: "https://dev.bags.fm",
  docsUrl: "https://docs.bags.fm",
  tokenPageUrl: (mint: string) => `https://bags.fm/${mint}`,
  defaultFeeConfig: "fa29606e-7df8-4e2a-b640-2e9e40e7cbb7", // Default 2% fee
  defaultPartnerBps: 2500, // 25% default partner share
  maxFeeClaimers: 100,
  claimerTiers: {
    bronze: { minReputation: 0, bps: 500 },
    silver: { minReputation: 50, bps: 1500 },
    gold: { minReputation: 80, bps: 3000 },
    diamond: { minReputation: 95, bps: 5000 },
  },
} as const;
