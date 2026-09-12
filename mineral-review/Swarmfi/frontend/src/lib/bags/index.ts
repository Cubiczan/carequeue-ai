/**
 * Bags Integration — Barrel Export
 *
 * Unified access point for all Bags SDK integration modules.
 *
 * Modules:
 *   client.ts      — SDK initialization, trading, agent auth, analytics
 *   types.ts       — TypeScript type definitions
 *   token.ts       — $SWARM token launch on Bags platform
 *   partner.ts     — SwarmFi partner key management
 *   fee-sharing.ts — Oracle signal provider fee distribution
 */

// Types
export type {
  TokenInfo,
  TokenLaunchResponse,
  BondingCurveState,
  FeeClaimer,
  FeeShareConfig,
  FeeClaimTransaction,
  FeeStats,
  PartnerKey,
  PartnerStats,
  OracleSignalProvider,
  OracleFeeDistribution,
  AgentAuthInitResponse,
  AgentAuthCallbackResponse,
  TradeQuote,
  SwapTransaction,
} from "./types";

export { BAGS_CONFIG } from "./types";

// Client
export {
  initBagsClient,
  isDemoMode,
  getConnection,
  getTradeQuote,
  createSwap,
  agentAuthInit,
  agentAuthCallback,
  getLifetimeFees,
  getClaimEvents,
  getTokenLaunchFeed,
} from "./client";

// Token
export {
  SWARM_TOKEN_CONFIG,
  SWARM_FEE_SHARE_CONFIG,
  createTokenInfo,
  lookupFeeClaimers,
  createFeeShareConfig,
  createLaunchTransaction,
  launchSwarmToken,
  getDemoBondingCurveState,
  getBondingCurveHistory,
} from "./token";

// Partner
export {
  createPartnerKey,
  getPartnerStats,
  createPartnerClaimTxs,
  getDemoPartnerKey,
  getDemoPartnerStats,
} from "./partner";

// Fee Sharing
export {
  calculateProviderFeeDistribution,
  buildFeeClaimersFromProviders,
  getFeeStats,
  getClaimablePositions,
  createFeeClaimTxs,
  getDemoOracleProviders,
  getDemoFeeStats,
} from "./fee-sharing";
