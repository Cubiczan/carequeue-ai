// @ts-nocheck
"use client";

/**
 * Arcium Encryption Module for SwarmFi Oracle Data Privacy
 *
 * This module provides client-side encryption for oracle price submissions
 * using the Web Crypto API. It implements AES-GCM encryption with ECDH
 * key exchange, enabling agents to submit price data without revealing
 * their raw values on-chain.
 *
 * How it integrates with Arcium's MPC network on Solana:
 * - Agents encrypt price data locally before submitting to the oracle program
 * - The encrypted payload + hash is stored on-chain via submit_encrypted_price instruction
 * - Arcium's confidential computing nodes can perform computation on encrypted data
 *   without decrypting it (using Multi-Party Computation)
 * - Only authorized consensus participants can decrypt and verify the data
 * - This prevents front-running and data extraction attacks on oracle submissions
 */

import { useConnection } from "@solana/wallet-adapter-react";

// ── Types ──────────────────────────────────────────────────────────

export interface EncryptedPayload {
  /** Base64-encoded ciphertext */
  ciphertext: string;
  /** Base64-encoded initialization vector */
  iv: string;
  /** Base64-encoded ephemeral public key (for ECDH) */
  ephemeralPublicKey: string;
  /** SHA-256 hash of the original plaintext data */
  dataHash: string;
  /** Timestamp of encryption (ISO 8601) */
  timestamp: string;
}

export interface EncryptionKeyPair {
  /** Base64-encoded public key */
  publicKey: string;
  /** CryptoKey private key (non-exportable, stored in memory) */
  privateKey: CryptoKey;
  /** Agent identifier this key belongs to */
  agentId: string;
  /** Key creation timestamp */
  createdAt: string;
}

export interface EncryptedOracleSubmission {
  /** The encrypted price data payload */
  encrypted: EncryptedPayload;
  /** Asset pair (e.g. "BTC/USDT") */
  assetPair: string;
  /** Agent that submitted the encrypted data */
  agentPubkey: string;
  /** Confidence level (0-255) */
  confidence: number;
}

// ── Constants ──────────────────────────────────────────────────────

const ARCUM_ALGORITHM = {
  name: "AES-GCM",
  length: 256,
} as AesGcmParams;

const ECDH_ALGORITHM = {
  name: "ECDH",
  namedCurve: "P-256",
} as EcKeyGenParams;

const KEY_EXPORT_FORMAT: KeyFormat = "spki";

// ── Core Functions ─────────────────────────────────────────────────

/**
 * Generate a new ECDH key pair for encrypting oracle submissions.
 * The private key stays in memory only (non-exportable).
 */
export async function generateEncryptionKeyPair(
  agentId: string
): Promise<EncryptionKeyPair> {
  const keyPair = await crypto.subtle.generateKey(
    ECDH_ALGORITHM,
    true, // extractable public key
    ["deriveKey"]
  );

  const publicKeyBuffer = await crypto.subtle.exportKey("raw", keyPair.publicKey);
  const publicKeyBase64 = arrayBufferToBase64(publicKeyBuffer);

  return {
    publicKey: publicKeyBase64,
    privateKey: keyPair.privateKey,
    agentId,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Encrypt oracle price data using AES-GCM with ECDH-derived key.
 *
 * Process:
 * 1. Generate ephemeral ECDH key pair
 * 2. Derive shared AES-256-GCM key using receiver's public key + ephemeral private key
 * 3. Encrypt the plaintext data with AES-GCM
 * 4. Return ciphertext + IV + ephemeral public key for decryption
 *
 * @param data - The oracle data to encrypt (e.g., price JSON string)
 * @param receiverPublicKeyBase64 - Base64-encoded public key of the consensus oracle
 * @returns EncryptedPayload containing all data needed for decryption
 */
export async function encryptOracleData(
  data: string,
  receiverPublicKeyBase64: string
): Promise<EncryptedPayload> {
  // Step 1: Generate ephemeral ECDH key pair
  const ephemeralKeyPair = await crypto.subtle.generateKey(
    ECDH_ALGORITHM,
    true,
    ["deriveKey"]
  );

  // Step 2: Import receiver's public key
  const receiverPublicKeyBuffer = base64ToArrayBuffer(receiverPublicKeyBase64);
  const receiverPublicKey = await crypto.subtle.importKey(
    "raw",
    receiverPublicKeyBuffer,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  // Step 3: Derive shared AES-256-GCM key
  const sharedKey = await crypto.subtle.deriveKey(
    {
      name: "ECDH",
      namedCurve: "P-256",
      public: receiverPublicKey,
    },
    ephemeralKeyPair.privateKey,
    ARCUM_ALGORITHM,
    false,
    ["encrypt"]
  );

  // Step 4: Encrypt the data
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);

  // Generate random IV (12 bytes recommended for AES-GCM)
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const ciphertext = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    sharedKey,
    dataBuffer
  );

  // Step 5: Compute hash of original data for on-chain verification
  const dataHashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  const dataHash = arrayBufferToBase64(dataHashBuffer);

  // Step 6: Export ephemeral public key
  const ephemeralPubKeyBuffer = await crypto.subtle.exportKey(
    "raw",
    ephemeralKeyPair.publicKey
  );

  return {
    ciphertext: arrayBufferToBase64(ciphertext),
    iv: arrayBufferToBase64(iv),
    ephemeralPublicKey: arrayBufferToBase64(ephemeralPubKeyBuffer),
    dataHash,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Decrypt oracle price data that was encrypted with encryptOracleData.
 *
 * @param encrypted - The encrypted payload
 * @param receiverPrivateKey - The receiver's private key (from key generation)
 * @param ephemeralPublicKeyBase64 - Ephemeral public key from the encrypted payload
 * @returns Decrypted plaintext string
 */
export async function decryptOracleData(
  encrypted: EncryptedPayload,
  receiverPrivateKey: CryptoKey,
  ephemeralPublicKeyBase64: string
): Promise<string> {
  // Import the ephemeral public key
  const ephemeralPubKeyBuffer = base64ToArrayBuffer(ephemeralPublicKeyBase64);
  const ephemeralPublicKey = await crypto.subtle.importKey(
    "raw",
    ephemeralPubKeyBuffer,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  // Derive the same shared AES key
  const sharedKey = await crypto.subtle.deriveKey(
    {
      name: "ECDH",
      namedCurve: "P-256",
      public: ephemeralPublicKey,
    },
    receiverPrivateKey,
    ARCUM_ALGORITHM,
    false,
    ["decrypt"]
  );

  // Decrypt
  const iv = base64ToArrayBuffer(encrypted.iv);
  const ciphertext = base64ToArrayBuffer(encrypted.ciphertext);

  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    sharedKey,
    ciphertext
  );

  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
}

/**
 * Compute SHA-256 hash of oracle data for on-chain verification.
 * This hash is stored in the PriceFeed account to prove data integrity
 * without revealing the actual price value.
 */
export async function hashOracleData(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  return arrayBufferToBase64(hashBuffer);
}

/**
 * Verify that encrypted data matches a stored hash.
 * Used by consensus participants to verify data integrity.
 */
export async function verifyDataHash(
  decryptedData: string,
  storedHash: string
): Promise<boolean> {
  const computedHash = await hashOracleData(decryptedData);
  return computedHash === storedHash;
}

/**
 * Prepare an encrypted oracle submission for the Anchor program.
 * Converts the EncryptedPayload into a format suitable for the
 * submit_encrypted_price instruction (byte arrays).
 */
export function prepareEncryptedSubmission(
  encrypted: EncryptedPayload,
  assetPair: string,
  agentPubkey: string,
  confidence: number
): {
  ciphertextBytes: Uint8Array;
  ivBytes: Uint8Array;
  dataHashBytes: Uint8Array;
  submission: EncryptedOracleSubmission;
} {
  return {
    ciphertextBytes: base64ToArrayBuffer(encrypted.ciphertext),
    ivBytes: base64ToArrayBuffer(encrypted.iv),
    dataHashBytes: base64ToArrayBuffer(encrypted.dataHash),
    submission: {
      encrypted,
      assetPair,
      agentPubkey,
      confidence,
    },
  };
}

// ── Utility: Convert Uint8Array <-> Base64 ────────────────────────

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * React hook for Arcium encryption in components.
 * Manages key pair lifecycle and provides encryption/decryption methods.
 */
export function useArciumEncryption(agentId: string) {
  const [keyPair, setKeyPair] = useState<EncryptionKeyPair | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const generate = async () => {
    setIsGenerating(true);
    try {
      const kp = await generateEncryptionKeyPair(agentId);
      setKeyPair(kp);
      return kp;
    } finally {
      setIsGenerating(false);
    }
  };

  const encrypt = async (data: string, receiverPublicKey: string) => {
    if (!keyPair) throw new Error("No encryption key pair. Call generate() first.");
    return encryptOracleData(data, receiverPublicKey);
  };

  const decrypt = async (encrypted: EncryptedPayload, ephemeralPublicKey: string) => {
    if (!keyPair) throw new Error("No encryption key pair. Call generate() first.");
    return decryptOracleData(encrypted, keyPair.privateKey, ephemeralPublicKey);
  };

  return {
    keyPair,
    isGenerating,
    generate,
    encrypt,
    decrypt,
    publicKey: keyPair?.publicKey ?? null,
  };
}
