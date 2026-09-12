// BNB Chain Wallet Connection via MetaMask

const BNB_CHAIN_ID = '0x38'; // 56 in hex = BNB Mainnet
const BNB_CHAIN_ID_TESTNET = '0x61'; // 97 in hex = BNB Testnet

interface WalletState {
  address: string | null;
  chainId: string | null;
  isConnected: boolean;
}

export type WalletListener = (state: WalletState) => void;

const listeners: WalletListener[] = [];
let currentState: WalletState = {
  address: null,
  chainId: null,
  isConnected: false,
};

function notifyListeners() {
  listeners.forEach(listener => listener({ ...currentState }));
}

export function subscribeToWallet(listener: WalletListener) {
  listeners.push(listener);
  listener({ ...currentState });
  return () => {
    const index = listeners.indexOf(listener);
    if (index > -1) listeners.splice(index, 1);
  };
}

interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
}

function getEthereum(): EthereumProvider | null {
  if (typeof window !== 'undefined') {
    const w = window as Window & { ethereum?: EthereumProvider };
    if (typeof w.ethereum !== 'undefined') {
      return w.ethereum;
    }
  }
  return null;
}

export function isMetaMaskInstalled(): boolean {
  return getEthereum() !== null;
}

export async function connectWallet(): Promise<string> {
  const ethereum = getEthereum();
  if (!ethereum) {
    throw new Error("MetaMask is not installed. Please install MetaMask and switch to BNB Smart Chain.");
  }

  const accounts = await ethereum.request({ method: 'eth_requestAccounts' }) as string[];
  if (accounts.length === 0) throw new Error("No accounts found");

  const chainId = await ethereum.request({ method: 'eth_chainId' }) as string;
  currentState = { address: accounts[0], chainId, isConnected: true };
  notifyListeners();

  // Switch to BNB Mainnet if not already
  if (chainId !== BNB_CHAIN_ID && chainId !== BNB_CHAIN_ID_TESTNET) {
    try {
      await switchToBNBChain();
    } catch (switchError) {
      console.warn("Failed to switch to BNB chain:", switchError);
    }
  }

  return accounts[0];
}

export async function disconnectWallet() {
  currentState = { address: null, chainId: null, isConnected: false };
  notifyListeners();
}

export async function switchToBNBChain() {
  const ethereum = getEthereum();
  if (!ethereum) throw new Error("MetaMask not installed");

  try {
    await ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: BNB_CHAIN_ID }],
    });
  } catch (switchError: unknown) {
    // If chain hasn't been added to MetaMask, add it
    const err = switchError as { code?: number };
    if (err.code === 4902) {
      await ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: BNB_CHAIN_ID,
          chainName: 'BNB Smart Chain Mainnet',
          nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
          rpcUrls: ['https://bsc-dataseed.binance.org/'],
          blockExplorerUrls: ['https://bscscan.com/'],
        }],
      });
    } else {
      throw switchError;
    }
  }

  const chainId = await ethereum.request({ method: 'eth_chainId' }) as string;
  currentState.chainId = chainId;
  notifyListeners();
}

export function setupWalletListeners() {
  const ethereum = getEthereum();
  if (!ethereum) return;

  ethereum.on('accountsChanged', (accounts: string[]) => {
    if (accounts.length === 0) {
      disconnectWallet();
    } else {
      currentState.address = accounts[0];
      notifyListeners();
    }
  });

  ethereum.on('chainChanged', (chainId: string) => {
    currentState.chainId = chainId;
    notifyListeners();
    window.location.reload();
  });
}

export function formatAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function getCurrentWalletState(): WalletState {
  return { ...currentState };
}
