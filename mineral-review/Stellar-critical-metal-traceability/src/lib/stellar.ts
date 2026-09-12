import * as StellarSdk from "@stellar/stellar-sdk";
import { rpc } from "@stellar/stellar-sdk";

// Stellar Mainnet configuration
const HORIZON_URL = "https://horizon.stellar.org";
const SOROBAN_RPC_URL = "https://soroban-rpc.mainnet.stellar.gateway.fm";
const NETWORK_PASSPHRASE = StellarSdk.Networks.PUBLIC;

// Horizon server for querying ledger data, transactions, accounts
export const horizon = new StellarSdk.Horizon.Server(HORIZON_URL);

// Soroban RPC client for smart contract interaction
export const sorobanRpc = new rpc.Server(SOROBAN_RPC_URL);

export { NETWORK_PASSPHRASE, HORIZON_URL, SOROBAN_RPC_URL };

/**
 * Fetch the latest ledger sequence from the Stellar mainnet.
 */
export async function getLatestLedger() {
  const result = await sorobanRpc.getLatestLedger();
  return {
    sequence: result.sequence,
    protocolVersion: result.protocolVersion,
  };
}

/**
 * Fetch account details by Stellar public key.
 */
export async function getAccount(publicKey: string) {
  return horizon.loadAccount(publicKey);
}

/**
 * Invoke a Soroban smart contract read-only function.
 */
export async function invokeContractRead(
  contractId: string,
  method: string,
  args: StellarSdk.xdr.ScVal[] = []
): Promise<rpc.Api.SimulateTransactionResponse> {
  const account = new StellarSdk.Account(
    "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
    "0"
  );

  const contract = new StellarSdk.Contract(contractId);
  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: "100",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  return sorobanRpc.simulateTransaction(tx);
}

/**
 * Build a Soroban contract invocation transaction (requires signing).
 */
export async function buildContractTransaction(
  sourcePublicKey: string,
  contractId: string,
  method: string,
  args: StellarSdk.xdr.ScVal[] = []
): Promise<StellarSdk.Transaction> {
  const account = await sorobanRpc.getAccount(sourcePublicKey);
  const contract = new StellarSdk.Contract(contractId);

  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: "100",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(300)
    .build();

  const simulated = await sorobanRpc.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(simulated)) {
    throw new Error(
      `Simulation failed: ${(simulated as rpc.Api.SimulateTransactionErrorResponse).error}`
    );
  }

  return rpc.assembleTransaction(
    tx,
    simulated as rpc.Api.SimulateTransactionSuccessResponse
  ).build();
}

/**
 * Submit a signed transaction and poll for result.
 */
export async function submitTransaction(
  signedTx: StellarSdk.Transaction
): Promise<rpc.Api.GetTransactionResponse> {
  const response = await sorobanRpc.sendTransaction(signedTx);

  if (response.status === "ERROR") {
    throw new Error(`Transaction submission failed: ${response.status}`);
  }

  // Poll for result
  let result = await sorobanRpc.getTransaction(response.hash);
  while (result.status === "NOT_FOUND") {
    await new Promise((r) => setTimeout(r, 1000));
    result = await sorobanRpc.getTransaction(response.hash);
  }

  return result;
}

/**
 * Fetch recent Soroban contract events.
 */
export async function getContractEvents(
  contractId: string,
  startLedger?: number
) {
  const latestLedger = await sorobanRpc.getLatestLedger();
  const start = startLedger || latestLedger.sequence - 1000;

  return sorobanRpc.getEvents({
    startLedger: start,
    filters: [
      {
        type: "contract",
        contractIds: [contractId],
      },
    ],
    limit: 50,
  });
}

/**
 * Query Horizon for recent transactions on a specific account.
 */
export async function getAccountTransactions(
  publicKey: string,
  limit = 20
) {
  return horizon
    .transactions()
    .forAccount(publicKey)
    .limit(limit)
    .order("desc")
    .call();
}

/**
 * Query Horizon for the current network fee stats.
 */
export async function getFeeStats() {
  return horizon.feeStats();
}
