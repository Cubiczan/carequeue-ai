// Liquify Indexer API Service Layer
// Replaces Stellar SDK calls with fetch calls to Liquify Indexer

const LIQUIFY_INDEXER_BASE_URL = "https://indexer.liquify.io/api/v1";

// --- Types ---
export interface ValidatorData {
  id: string;
  name: string;
  operatorAddress: string;
  consensusAddress: string;
  activeStake: number;
  commission: number;
  apr: number;
  status: 'active' | 'jailed' | 'slashing' | 'inactive';
  uptime: number;
  delegators: number;
  selfBond: number;
  moniker: string;
}

export interface StakingPosition {
  delegatorAddress: string;
  validatorId: string;
  stakedAmount: number;
  pendingRewards: number;
  lstTokenBalance: number;
  lstTokenValue: number;
  entryDate: string;
  status: 'active' | 'unbonding' | 'pending';
}

export interface YieldEvent {
  id: string;
  type: 'stake' | 'unstake' | 'claim_reward' | 'redelegate' | 'validator_jailed' | 'slash_event';
  detail: string;
  delegator: string;
  validator: string;
  amount?: number;
  blockNumber: number;
  txHash: string;
  timestamp: string;
}

export interface RiskAssessment {
  validatorId: string;
  riskScore: number; // 0-100, higher = riskier
  slashingHistory: number;
  downtime24h: number;
  commissionChange30d: boolean;
  missedBlocks24h: number;
  status: 'healthy' | 'warning' | 'critical';
}

export interface NetworkMetrics {
  totalTvl: number;
  totalStakers: number;
  avgApr: number;
  totalValidators: number;
  activeValidators: number;
  networkBondRate: number;
  blockHeight: number;
}

export interface YieldProvenanceNode {
  id: string;
  label: string;
  validator: string;
  stakeAmount: number;
  yieldGenerated: number;
  apr: number;
  status: 'active' | 'unbonding' | 'jailed';
  txHash: string;
}

// --- API Functions ---

export async function getNetworkMetrics(): Promise<NetworkMetrics> {
  const response = await fetch(`${LIQUIFY_INDEXER_BASE_URL}/network/metrics`);
  if (!response.ok) throw new Error("Failed to fetch network metrics");
  return response.json();
}

export async function getValidators(): Promise<ValidatorData[]> {
  const response = await fetch(`${LIQUIFY_INDEXER_BASE_URL}/validators`);
  if (!response.ok) throw new Error("Failed to fetch validators");
  return response.json();
}

export async function getUserPositions(walletAddress: string): Promise<StakingPosition[]> {
  const response = await fetch(`${LIQUIFY_INDEXER_BASE_URL}/positions/${walletAddress}`);
  if (!response.ok) throw new Error("Failed to fetch user positions");
  return response.json();
}

export async function getValidatorRisk(validatorId: string): Promise<RiskAssessment> {
  const response = await fetch(`${LIQUIFY_INDEXER_BASE_URL}/validators/${validatorId}/risk`);
  if (!response.ok) throw new Error("Failed to fetch validator risk");
  return response.json();
}

export async function getStakingEvents(limit = 50): Promise<YieldEvent[]> {
  const response = await fetch(`${LIQUIFY_INDEXER_BASE_URL}/events?limit=${limit}`);
  if (!response.ok) throw new Error("Failed to fetch staking events");
  return response.json();
}

export async function getYieldProvenance(walletAddress: string): Promise<YieldProvenanceNode[]> {
  const response = await fetch(`${LIQUIFY_INDEXER_BASE_URL}/provenance/${walletAddress}`);
  if (!response.ok) throw new Error("Failed to fetch yield provenance");
  return response.json();
}

// --- Fallback mock data for demo (when API is unreachable) ---

export const MOCK_VALIDATORS: ValidatorData[] = [
  { id: "val-001", name: "BNB48 Club", operatorAddress: "bnb1x...48cl", consensusAddress: "0xa1b2...c3d4", activeStake: 485200, commission: 5, apr: 4.82, status: "active", uptime: 99.98, delegators: 12450, selfBond: 25000, moniker: "BNB48" },
  { id: "val-002", name: "Peanut Protocol", operatorAddress: "bnb1y...pnut", consensusAddress: "0xe5f6...g7h8", activeStake: 312800, commission: 8, apr: 5.14, status: "active", uptime: 99.95, delegators: 8900, selfBond: 15000, moniker: "Peanut" },
  { id: "val-003", name: "InfStones", operatorAddress: "bnb1z...nfs1", consensusAddress: "0xb9c0...d1e2", activeStake: 278600, commission: 10, apr: 5.67, status: "active", uptime: 99.92, delegators: 6200, selfBond: 30000, moniker: "InfStones" },
  { id: "val-004", name: "Cosmostation", operatorAddress: "bnb1w...csm1", consensusAddress: "0xc3d4...e5f6", activeStake: 198400, commission: 5, apr: 4.76, status: "active", uptime: 99.99, delegators: 15600, selfBond: 20000, moniker: "Cosmos" },
  { id: "val-005", name: "StakeFish", operatorAddress: "bnb1v...sfh1", consensusAddress: "0xf7g8...h9i0", activeStake: 156200, commission: 7, apr: 5.31, status: "active", uptime: 99.88, delegators: 4700, selfBond: 10000, moniker: "StakeFish" },
  { id: "val-006", name: "NodeReal", operatorAddress: "bnb1u...nrl1", consensusAddress: "0xa1b2...c3d4", activeStake: 134500, commission: 5, apr: 4.68, status: "jailed", uptime: 97.50, delegators: 3100, selfBond: 8000, moniker: "NodeReal" },
];

export const MOCK_NETWORK_METRICS: NetworkMetrics = {
  totalTvl: 2156000,
  totalStakers: 84620,
  avgApr: 5.12,
  totalValidators: 42,
  activeValidators: 41,
  networkBondRate: 14.8,
  blockHeight: 38542109,
};

export const MOCK_STAKING_EVENTS: YieldEvent[] = [
  { id: "EVT-001", type: "stake", detail: "Staked 2,500 BNB to BNB48 Club", delegator: "bnb1x...a1b2", validator: "BNB48 Club", amount: 2500, blockNumber: 38542098, txHash: "0xabc1...f42d", timestamp: "2026-04-02 09:14" },
  { id: "EVT-002", type: "claim_reward", detail: "Claimed 12.8 lstBNB rewards", delegator: "bnb1y...c3d4", validator: "Peanut Protocol", amount: 12.8, blockNumber: 38542085, txHash: "0x7e2f...91ba", timestamp: "2026-04-02 08:45" },
  { id: "EVT-003", type: "unstake", detail: "Unbonding 500 BNB from InfStones", delegator: "bnb1z...e5f6", validator: "InfStones", amount: 500, blockNumber: 38542070, txHash: "0xd1f3...c803", timestamp: "2026-04-02 08:22" },
  { id: "EVT-004", type: "redelegate", detail: "Redelegated 1,000 BNB to Cosmostation", delegator: "bnb1w...g7h8", validator: "Cosmostation", amount: 1000, blockNumber: 38542055, txHash: "0x9a4b...d205", timestamp: "2026-04-02 07:58" },
  { id: "EVT-005", type: "validator_jailed", detail: "NodeReal jailed — downtime exceeded threshold", delegator: "System", validator: "NodeReal", blockNumber: 38542030, txHash: "0xc8d2...f118", timestamp: "2026-04-02 07:30" },
  { id: "EVT-006", type: "slash_event", detail: "5% slash applied to NodeReal", delegator: "System", validator: "NodeReal", amount: 6725, blockNumber: 38542010, txHash: "0xb3e1...4a9f", timestamp: "2026-04-02 07:15" },
  { id: "EVT-007", type: "stake", detail: "Staked 10,000 BNB to StakeFish", delegator: "bnb1v...h9i0", validator: "StakeFish", amount: 10000, blockNumber: 38541990, txHash: "0xf5c7...8d2e", timestamp: "2026-04-02 06:50" },
  { id: "EVT-008", type: "claim_reward", detail: "Claimed 45.2 lstBNB rewards", delegator: "bnb1u...i1j2", validator: "BNB48 Club", amount: 45.2, blockNumber: 38541975, txHash: "0xe2d8...3b1c", timestamp: "2026-04-02 06:22" },
];

export const MOCK_POSITIONS: StakingPosition[] = [
  { delegatorAddress: "bnb1x...a1b2", validatorId: "val-001", stakedAmount: 2500, pendingRewards: 12.8, lstTokenBalance: 2512.8, lstTokenValue: 1527846, entryDate: "2025-09-15", status: "active" },
  { delegatorAddress: "bnb1x...a1b2", validatorId: "val-002", stakedAmount: 1000, pendingRewards: 5.14, lstTokenBalance: 1005.14, lstTokenValue: 611135, entryDate: "2025-11-02", status: "active" },
  { delegatorAddress: "bnb1x...a1b2", validatorId: "val-003", stakedAmount: 500, pendingRewards: 28.35, lstTokenBalance: 528.35, lstTokenValue: 321292, entryDate: "2026-01-18", status: "unbonding" },
];

export const MOCK_RISK_ASSESSMENTS: RiskAssessment[] = [
  { validatorId: "val-001", riskScore: 5, slashingHistory: 0, downtime24h: 0, commissionChange30d: false, missedBlocks24h: 0, status: "healthy" },
  { validatorId: "val-002", riskScore: 12, slashingHistory: 0, downtime24h: 2, commissionChange30d: false, missedBlocks24h: 1, status: "healthy" },
  { validatorId: "val-003", riskScore: 18, slashingHistory: 0, downtime24h: 5, commissionChange30d: true, missedBlocks24h: 3, status: "warning" },
  { validatorId: "val-004", riskScore: 3, slashingHistory: 0, downtime24h: 0, commissionChange30d: false, missedBlocks24h: 0, status: "healthy" },
  { validatorId: "val-005", riskScore: 22, slashingHistory: 0, downtime24h: 8, commissionChange30d: false, missedBlocks24h: 5, status: "warning" },
  { validatorId: "val-006", riskScore: 89, slashingHistory: 1, downtime24h: 1440, commissionChange30d: true, missedBlocks24h: 288, status: "critical" },
];

export const MOCK_YIELD_PROVENANCE: YieldProvenanceNode[] = [
  { id: "1", label: "User Wallet", validator: "bnb1x...a1b2", stakeAmount: 2500, yieldGenerated: 12.8, apr: 5.12, status: "active", txHash: "0xabc1...f42d" },
  { id: "2", label: "lstBNB Pool", validator: "Liquify Protocol", stakeAmount: 2500, yieldGenerated: 12.8, apr: 5.12, status: "active", txHash: "0xd4e8...89a1" },
  { id: "3", label: "BNB48 Club", validator: "bnb1x...48cl", stakeAmount: 2500, yieldGenerated: 8.4, apr: 4.82, status: "active", txHash: "0xf72a...3cd2" },
  { id: "4", label: "Consensus Layer", validator: "BNB Chain", stakeAmount: 2500, yieldGenerated: 4.4, apr: 3.21, status: "active", txHash: "0x91ba...e073" },
  { id: "5", label: "Yield Distribution", validator: "Liquify Protocol", stakeAmount: 12.8, yieldGenerated: 0, apr: 0, status: "active", txHash: "0xc3d4...41f4" },
  { id: "6", label: "lstBNB Claim", validator: "bnb1x...a1b2", stakeAmount: 0, yieldGenerated: 12.8, apr: 5.12, status: "active", txHash: "0xa8f7...72e5" },
];
