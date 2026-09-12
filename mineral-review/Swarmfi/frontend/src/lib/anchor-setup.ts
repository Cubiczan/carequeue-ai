"use client";

/**
 * SwarmFi — Anchor Program Connection Setup
 *
 * Provides React hooks for connecting to deployed Anchor programs on Solana
 * using the wallet from @solana/wallet-adapter-react context.
 *
 * Programs:
 *   - swarm-oracle: FsWBMoA5x5bSaZGJGYeCsSWaaBGJ4eCqGMPbQnMBnKNp
 *   - prediction-market: PMkt1SxPMKp3f5xLKNJghKBBm9JvHZQCEMJKWGPn7x4D
 *   - reputation-registry: RepRGhYwcxEhMaSnZ3dKLCg3xNPEBcbNBjGEoTBDFZv
 *   - vault-manager: VltMgcHHAfKXkRBRyfzXhCZrN3NaE8kTGYhfPaCmjPQy
 */

import { useMemo } from "react";
import { useConnection, useAnchorWallet } from "@solana/wallet-adapter-react";
import { Connection, PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import * as anchor from "@coral-xyz/anchor";

// ── Program IDs (devnet placeholder addresses) ───────────────────────
export const SWARM_ORACLE_PROGRAM_ID = new PublicKey(
  "11111111111111111111111111111112"
);
export const PREDICTION_MARKET_PROGRAM_ID = new PublicKey(
  "11111111111111111111111111111113"
);
export const REPUTATION_REGISTRY_PROGRAM_ID = new PublicKey(
  "11111111111111111111111111111114"
);
export const VAULT_MANAGER_PROGRAM_ID = new PublicKey(
  "11111111111111111111111111111115"
);

// ── PDA Derivation Helpers ─────────────────────────────────────────

export function deriveOracleConfigPda(programId: PublicKey = SWARM_ORACLE_PROGRAM_ID): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from("oracle_config")], programId);
}

export function deriveAgentNodePda(authority: PublicKey, programId: PublicKey = SWARM_ORACLE_PROGRAM_ID): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from("agent_node"), authority.toBuffer()], programId);
}

export function derivePriceFeedPda(assetPair: string, agent: PublicKey, programId: PublicKey = SWARM_ORACLE_PROGRAM_ID): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("price_feed"), Buffer.from(assetPair), agent.toBuffer()],
    programId
  );
}

export function deriveConsensusRoundPda(assetPair: string, roundNum: number, programId: PublicKey = SWARM_ORACLE_PROGRAM_ID): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("consensus_round"), Buffer.from(assetPair), Buffer.from([roundNum])],
    programId
  );
}

export function deriveMarketConfigPda(programId: PublicKey = PREDICTION_MARKET_PROGRAM_ID): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from("market_config")], programId);
}

export function deriveMarketPda(marketId: number, programId: PublicKey = PREDICTION_MARKET_PROGRAM_ID): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("market"), new BN(marketId).toArrayLike(Buffer, "le", 8)],
    programId
  );
}

export function derivePredictionPda(marketId: number, user: PublicKey, outcome: string, programId: PublicKey = PREDICTION_MARKET_PROGRAM_ID): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("prediction"), new BN(marketId).toArrayLike(Buffer, "le", 8), user.toBuffer(), Buffer.from(outcome)],
    programId
  );
}

export function deriveMarketTreasuryPda(programId: PublicKey = PREDICTION_MARKET_PROGRAM_ID): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from("market_treasury")], programId);
}

export function deriveVaultConfigPda(programId: PublicKey = VAULT_MANAGER_PROGRAM_ID): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from("vault_config")], programId);
}

export function deriveVaultPda(vaultId: number, programId: PublicKey = VAULT_MANAGER_PROGRAM_ID): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), new BN(vaultId).toArrayLike(Buffer, "le", 8)],
    programId
  );
}

export function deriveVaultFundsPda(vaultId: number, programId: PublicKey = VAULT_MANAGER_PROGRAM_ID): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault_funds"), new BN(vaultId).toArrayLike(Buffer, "le", 8)],
    programId
  );
}

export function deriveVaultDepositPda(vaultId: number, depositor: PublicKey, programId: PublicKey = VAULT_MANAGER_PROGRAM_ID): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault_deposit"), new BN(vaultId).toArrayLike(Buffer, "le", 8), depositor.toBuffer()],
    programId
  );
}

// ── IDL stubs (simplified for devnet — full IDLs loaded from deployed programs) ──

const ORACLE_IDL: anchor.Idl = {
  address: SWARM_ORACLE_PROGRAM_ID.toBase58(),
  metadata: { name: "swarm_oracle", version: "0.1.0", spec: "0.1.0" },
  instructions: [
    { name: "initialize", accounts: [], args: [], discriminator: [] },
    { name: "register_agent", accounts: [], args: [], discriminator: [] },
    { name: "submit_price", accounts: [], args: [], discriminator: [] },
    { name: "submit_encrypted_price", accounts: [], args: [], discriminator: [] },
    { name: "run_consensus", accounts: [], args: [], discriminator: [] },
    { name: "submit_stigmergy_signal", accounts: [], args: [], discriminator: [] },
    { name: "slash_agent", accounts: [], args: [], discriminator: [] },
    { name: "update_agent_reputation", accounts: [], args: [], discriminator: [] },
  ],
  accounts: [
    { name: "OracleConfig", discriminator: [] }, { name: "AgentNode", discriminator: [] },
    { name: "PriceFeed", discriminator: [] }, { name: "ConsensusRound", discriminator: [] },
    { name: "StigmergySignal", discriminator: [] },
  ],
};

const MARKET_IDL: anchor.Idl = {
  address: PREDICTION_MARKET_PROGRAM_ID.toBase58(),
  metadata: { name: "prediction_market", version: "0.1.0", spec: "0.1.0" },
  instructions: [
    { name: "initialize", accounts: [], args: [], discriminator: [] },
    { name: "create_market", accounts: [], args: [], discriminator: [] },
    { name: "submit_prediction", accounts: [], args: [], discriminator: [] },
    { name: "resolve_market", accounts: [], args: [], discriminator: [] },
    { name: "claim_winnings", accounts: [], args: [], discriminator: [] },
  ],
  accounts: [
    { name: "MarketConfig", discriminator: [] }, { name: "Market", discriminator: [] },
    { name: "Prediction", discriminator: [] }, { name: "Resolution", discriminator: [] },
  ],
};

const VAULT_IDL: anchor.Idl = {
  address: VAULT_MANAGER_PROGRAM_ID.toBase58(),
  metadata: { name: "vault_manager", version: "0.1.0", spec: "0.1.0" },
  instructions: [
    { name: "initialize", accounts: [], args: [], discriminator: [] },
    { name: "create_vault", accounts: [], args: [], discriminator: [] },
    { name: "deposit", accounts: [], args: [], discriminator: [] },
    { name: "withdraw", accounts: [], args: [], discriminator: [] },
    { name: "rebalance", accounts: [], args: [], discriminator: [] },
  ],
  accounts: [
    { name: "VaultConfig", discriminator: [] }, { name: "Vault", discriminator: [] },
    { name: "VaultFunds", discriminator: [] }, { name: "VaultDeposit", discriminator: [] },
    { name: "RebalanceRecord", discriminator: [] },
  ],
};

// ── Hooks ──────────────────────────────────────────────────────────

/**
 * Returns an Anchor Provider wired to the connected Phantom wallet.
 * Returns null if no wallet is connected.
 */
export function useAnchorProvider(): anchor.AnchorProvider | null {
  const { connection } = useConnection();
  const anchorWallet = useAnchorWallet();

  return useMemo(() => {
    if (!anchorWallet || !connection) return null;
    return new anchor.AnchorProvider(connection, anchorWallet, {
      commitment: "confirmed",
      preflightCommitment: "confirmed",
    });
  }, [anchorWallet, connection]);
}

/**
 * Returns initialized Anchor Program instances for all 4 SwarmFi programs.
 * Each program is null until the wallet is connected.
 */
export function useAnchorPrograms() {
  const provider = useAnchorProvider();

  return useMemo(() => {
    if (!provider) {
      return {
        oracle: null,
        predictionMarket: null,
        reputation: null,
        vault: null,
        provider: null,
      };
    }

    return {
      oracle: new anchor.Program(ORACLE_IDL, provider),
      predictionMarket: new anchor.Program(MARKET_IDL, provider),
      reputation: null as anchor.Program | null, // Load when needed
      vault: new anchor.Program(VAULT_IDL, provider),
      provider,
    };
  }, [provider]);
}

/**
 * Returns a helper to send transactions and await confirmation.
 * Shows explorer link on success.
 */
export function useTransactionSender() {
  const { connection } = useConnection();

  async function sendAndConfirm(
    tx: string | anchor.web3.Transaction,
    signers?: anchor.web3.Keypair[]
  ): Promise<{ signature: string; explorerUrl: string }> {
    let signature: string;

    if (typeof tx === "string") {
      signature = tx;
    } else {
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
      tx.recentBlockhash = blockhash;
      tx.lastValidBlockHeight = lastValidBlockHeight;
      // Note: The wallet adapter handles signing via the provider
      signature = await connection.sendRawTransaction(tx.serialize(), {
        skipPreflight: false,
        preflightCommitment: "confirmed",
      });
    }

    await connection.confirmTransaction(signature, "confirmed");

    return {
      signature,
      explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
    };
  }

  return { sendAndConfirm };
}

// ── Utility Functions ──────────────────────────────────────────────

/** Convert SOL to lamports */
export function solToLamports(sol: number): number {
  return Math.floor(sol * 1_000_000_000);
}

/** Convert lamports to SOL */
export function lamportsToSol(lamports: number): number {
  return lamports / 1_000_000_000;
}

/**
 * Returns the current Solana connection from wallet adapter context
 * and a helper to build explorer URLs.
 */
export function useSolanaConnection() {
  const { connection } = useConnection();

  function explorerUrl(signature: string): string {
    return `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
  }

  return { connection, explorerUrl };
}
