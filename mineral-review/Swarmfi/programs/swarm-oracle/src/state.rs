//! # SwarmFi Oracle — State Definitions
//!
//! All on-chain account structures used by the oracle program.
//! Includes Arcium confidential computing fields for encrypted price submissions.

use anchor_lang::prelude::*;
use anchor_lang::solana_program::pubkey::Pubkey;

/// Maximum length for agent name and asset pair strings.
pub const MAX_NAME_LEN: usize = 32;
pub const MAX_ASSET_PAIR_LEN: usize = 32;
pub const MAX_REASON_LEN: usize = 128;

/// Supported agent types in the SwarmFi ecosystem.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub enum AgentType {
    /// Provides price data feeds
    Price,
    /// Provides risk assessments
    Risk,
    /// Provides market-making signals
    MarketMaker,
    /// Provides resolution/verification
    Resolution,
}

/// Supported stigmergy signal types.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub enum SignalType {
    PriceUpdate,
    RiskAlert,
    ConsensusReached,
    RebalanceRequest,
    MarketEvent,
    Heartbeat,
    AnomalyDetected,
}

/// Global oracle configuration. Single instance, PDA-seeded.
#[account]
#[derive(InitSpace)]
pub struct OracleConfig {
    /// Protocol authority
    pub authority: Pubkey,
    /// Admin allowed to manage agents and config
    pub admin: Pubkey,
    /// SPL Token mint for agent identity tokens
    pub agent_token_mint: Pubkey,
    /// Minimum number of unique agents required for consensus
    pub min_agents_for_consensus: u32,
    /// Max age of a price submission (in seconds) that counts toward consensus
    pub max_age_seconds: u64,
    /// Acceptable deviation in basis points (1 bp = 0.01%)
    pub acceptable_deviation_bps: u64,
    /// Slash fraction in basis points applied per deviation threshold
    pub slash_rate_bps: u64,
    /// Total number of agents registered
    pub agent_count: u32,
    /// Total staked SOL across all agents (in lamports)
    pub total_staked: u64,
    /// Auto-incrementing counter for consensus rounds
    pub consensus_round_count: u64,
    /// Auto-incrementing counter for stigmergy signals
    pub signal_count: u64,
    /// Bump seed for the PDA
    pub bump: u8,
}

/// A registered AI agent node with on-chain identity and stake.
#[account]
#[derive(InitSpace)]
pub struct AgentNode {
    /// The agent's wallet address (authority)
    pub authority: Pubkey,
    /// Human-readable name
    #[max_len(MAX_NAME_LEN)]
    pub name: String,
    /// Type of agent (Price, Risk, MarketMaker, Resolution)
    pub agent_type: AgentType,
    /// Agent identity token mint (on-chain identity)
    pub identity_mint: Pubkey,
    /// Amount of SOL staked (in lamports)
    pub stake_amount: u64,
    /// Reputation score (0–1000 scale)
    pub reputation_score: u64,
    /// Accuracy score (0–1000 scale)
    pub accuracy_score: u64,
    /// Total number of price submissions
    pub total_submissions: u64,
    /// Whether the agent is active and can submit
    pub is_active: bool,
    /// Timestamp of registration (unix)
    pub registered_at: i64,
    /// Timestamp of last submission (unix)
    pub last_submission_at: i64,
    /// Number of times this agent has been slashed
    pub slash_count: u32,
    /// Bump seed for the PDA
    pub bump: u8,
}

/// A price feed submitted by an agent for a specific asset pair.
///
/// Supports both plaintext and Arcium-encrypted submissions:
/// - When `is_encrypted == false`: `price` contains the actual price, `confidence` is 1-254
/// - When `is_encrypted == true`: `price` is 0 (placeholder), `confidence` is 255 (sentinel),
///   actual data is encrypted and verified via `data_hash`
#[account]
#[derive(InitSpace)]
pub struct PriceFeed {
    /// Asset pair (e.g. "BTC/USDT")
    #[max_len(MAX_ASSET_PAIR_LEN)]
    pub asset_pair: String,
    /// Price value (scaled by 1e8 for 8 decimal precision)
    /// Set to 0 for encrypted submissions (actual price is encrypted)
    pub price: u64,
    /// Agent's confidence (0–255)
    /// Special value: 255 = encrypted submission (Arcium confidential computing)
    pub confidence: u8,
    /// Agent that submitted the price
    pub agent: Pubkey,
    /// Weight used in consensus (reputation * stake)
    pub consensus_weight: u64,
    /// Unix timestamp of submission
    pub submitted_at: i64,
    /// Whether this feed was included in the latest consensus
    pub included_in_consensus: bool,
    /// Bump seed for the PDA
    pub bump: u8,

    // ── Arcium Confidential Computing Fields ────────────────────────
    // These fields support encrypted price submissions via Arcium's
    // Multi-Party Computation (MPC) network on Solana.

    /// Whether this price feed was submitted encrypted via Arcium
    /// When true, the `price` field is a placeholder (0) and the
    /// actual price data is encrypted off-chain
    pub is_encrypted: bool,

    /// SHA-256 hash of the encrypted data for integrity verification
    /// Used to verify that the encrypted payload hasn't been tampered with
    /// before Arcium MPC nodes process it for consensus computation
    pub data_hash: [u8; 32],

    /// The ECDH public key used for encrypting this price submission
    /// Allows authorized parties (e.g., resolution agents) to decrypt
    /// the data using the corresponding private key
    pub encryption_key: Pubkey,
}

/// The result of a consensus round for an asset pair.
#[account]
#[derive(InitSpace)]
pub struct ConsensusRound {
    /// Asset pair this round covers
    #[max_len(MAX_ASSET_PAIR_LEN)]
    pub asset_pair: String,
    /// The consensus (weighted median) price
    pub consensus_price: u64,
    /// Number of agents that participated
    pub agent_count: u32,
    /// Average confidence across participating agents
    pub confidence: u8,
    /// Unix timestamp when the round was computed
    pub computed_at: i64,
    /// Round number (auto-incrementing)
    pub round_number: u64,
    /// Simple median used for outlier detection
    pub median_price: u64,
    /// Total weight across all participating agents
    pub total_weight: u64,
    /// Bump seed for the PDA
    pub bump: u8,
}

/// A stigmergy coordination signal deposited by an agent.
#[account]
#[derive(InitSpace)]
pub struct StigmergySignal {
    /// Type of signal
    pub signal_type: SignalType,
    /// Agent that deposited the signal
    pub from_agent: Pubkey,
    /// Hash of the signal data
    pub data_hash: [u8; 32],
    /// Signal strength (scaled by 1e8)
    pub strength: u64,
    /// Decay rate per second (basis-point style, out of 10000)
    pub decay_rate: u64,
    /// Unix timestamp when deposited
    pub deposited_at: i64,
    /// Signal ID (auto-incrementing)
    pub signal_id: u64,
    /// Bump seed for the PDA
    pub bump: u8,
}

/// An encrypted price feed submitted by an agent.
///
/// Unlike PriceFeed, this stores the ciphertext hash instead of the raw price,
/// enabling privacy-preserving oracle submissions via Arcium's MPC network.
/// Only authorized consensus participants can decrypt the data off-chain.
#[account]
#[derive(InitSpace)]
pub struct EncryptedPriceFeed {
    /// Asset pair (e.g. "BTC/USDT")
    #[max_len(MAX_ASSET_PAIR_LEN)]
    pub asset_pair: String,
    /// AES-GCM encrypted ciphertext (max 512 bytes)
    #[max_len(512)]
    pub ciphertext: Vec<u8>,
    /// AES-GCM initialization vector (12 bytes)
    #[max_len(12)]
    pub iv: Vec<u8>,
    /// SHA-256 hash of the original plaintext data
    pub data_hash: [u8; 32],
    /// ECDH encryption public key (65 bytes for uncompressed P-256)
    #[max_len(65)]
    pub encryption_key: Vec<u8>,
    /// Agent's confidence (0–255)
    pub confidence: u8,
    /// Agent that submitted the encrypted price
    pub agent: Pubkey,
    /// Weight used in consensus (reputation * stake)
    pub consensus_weight: u64,
    /// Unix timestamp of submission
    pub submitted_at: i64,
    /// Whether this feed was included in the latest consensus
    pub included_in_consensus: bool,
    /// Bump seed for the PDA
    pub bump: u8,
}

/// Parameters for initializing the oracle.
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct OracleInitParams {
    pub min_agents_for_consensus: u32,
    pub max_age_seconds: u64,
    pub acceptable_deviation_bps: u64,
    pub slash_rate_bps: u64,
}
