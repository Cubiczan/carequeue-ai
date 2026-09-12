//! # Submit Encrypted Price
//!
//! Agent submits AES-GCM encrypted price data for an asset pair.
//! The raw price is NOT stored on-chain — only the ciphertext hash
//! for verification and the encryption public key for decryption
//! by authorized consensus participants.
//!
//! This enables privacy-preserving oracle submissions via Arcium's
//! confidential computing (MPC) network on Solana. Agents can submit
//! prices without revealing their data to front-runners or competitors.
//!
//! Flow:
//! 1. Agent encrypts price locally using ECDH + AES-GCM (Web Crypto API)
//! 2. Agent submits encrypted bytes + data hash to this instruction
//! 3. On-chain: stores hash, marks submission as encrypted
//! 4. Consensus participants decrypt off-chain using their private key
//! 5. Consensus round uses decrypted values for weighted median calculation

use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::OracleError;

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct EncryptedPriceParams {
    /// AES-GCM encrypted ciphertext (max 512 bytes)
    pub ciphertext: Vec<u8>,
    /// AES-GCM initialization vector (12 bytes)
    pub iv: Vec<u8>,
    /// ECDH ephemeral public key (65 bytes for P-256)
    pub encryption_key: Vec<u8>,
    /// SHA-256 hash of the original plaintext data
    pub data_hash: [u8; 32],
    /// Asset pair identifier (e.g. "BTC/USDT")
    pub asset_pair: String,
    /// Agent's confidence level (0–255)
    pub confidence: u8,
}

const MAX_CIPHERTEXT_LEN: usize = 512;
const EXPECTED_IV_LEN: usize = 12;
const EXPECTED_PUBKEY_LEN: usize = 65; // Uncompressed P-256

#[derive(Accounts)]
#[instruction(params: EncryptedPriceParams)]
pub struct SubmitEncryptedPrice<'info> {
    #[account(
        seeds = [b"oracle_config"],
        bump = config.bump,
    )]
    pub config: Account<'info, OracleConfig>,

    #[account(
        mut,
        seeds = [b"agent_node", agent_authority.key().as_ref()],
        bump = agent_node.bump,
        constraint = agent_node.is_active @ OracleError::AgentInactive,
    )]
    pub agent_node: Account<'info, AgentNode>,

    #[account(
        init,
        payer = agent_authority,
        space = 8 + EncryptedPriceFeed::INIT_SPACE,
        seeds = [b"encrypted_price", params.asset_pair.as_bytes(), agent_authority.key().as_ref()],
        bump
    )]
    pub encrypted_feed: Account<'info, EncryptedPriceFeed>,

    #[account(mut)]
    pub agent_authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<SubmitEncryptedPrice>,
    params: EncryptedPriceParams,
) -> Result<()> {
    // Validate ciphertext length
    require!(
        params.ciphertext.len() <= MAX_CIPHERTEXT_LEN,
        OracleError::CiphertextTooLong
    );
    require!(
        params.ciphertext.len() > 0,
        OracleError::EmptyCiphertext
    );

    // Validate IV
    require!(
        params.iv.len() == EXPECTED_IV_LEN,
        OracleError::InvalidIvLength
    );

    // Validate encryption public key
    require!(
        params.encryption_key.len() == EXPECTED_PUBKEY_LEN,
        OracleError::InvalidEncryptionKey
    );

    // Validate confidence
    require!(params.confidence > 0, OracleError::InvalidConfidence);

    // Validate asset pair length
    require!(
        params.asset_pair.len() <= MAX_ASSET_PAIR_LEN,
        OracleError::AssetPairTooLong
    );

    let agent_node = &mut ctx.accounts.agent_node;
    let encrypted_feed = &mut ctx.accounts.encrypted_feed;
    let clock = Clock::get()?;

    // Compute consensus weight from reputation + stake
    let stake_sol = agent_node.stake_amount / 1_000_000_000;
    let consensus_weight = agent_node.reputation_score.saturating_mul(stake_sol.max(1));

    // Store the encrypted price feed (no raw price exposed on-chain)
    encrypted_feed.asset_pair = params.asset_pair;
    encrypted_feed.ciphertext = params.ciphertext;
    encrypted_feed.iv = params.iv;
    encrypted_feed.data_hash = params.data_hash;
    encrypted_feed.encryption_key = params.encryption_key;
    encrypted_feed.confidence = params.confidence;
    encrypted_feed.agent = ctx.accounts.agent_authority.key();
    encrypted_feed.consensus_weight = consensus_weight;
    encrypted_feed.submitted_at = clock.unix_timestamp;
    encrypted_feed.included_in_consensus = false;
    encrypted_feed.bump = ctx.bumps.encrypted_feed;

    // Update agent stats
    agent_node.total_submissions += 1;
    agent_node.last_submission_at = clock.unix_timestamp;

    msg!(
        "Encrypted price submitted for {} by agent {} (consensus weight: {})",
        params.asset_pair,
        ctx.accounts.agent_authority.key(),
        consensus_weight
    );

    Ok(())
}
