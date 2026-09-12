// ============================================================
// MetaComp Vision X — Types & Helpers
// ============================================================

// ---------- Network ----------
export type Network = "Ethereum" | "Bitcoin" | "Tron";

export const NETWORK_OPTIONS: { value: Network; label: string; icon: string }[] = [
  { value: "Ethereum", label: "Ethereum", icon: "hexagon" },
  { value: "Bitcoin", label: "Bitcoin", icon: "bitcoin" },
  { value: "Tron", label: "Tron", icon: "triangle" },
];

// ---------- Risk Level ----------
export type RiskLevel = "Low" | "Medium" | "High" | "Severe";

export const RISK_CONFIG: Record<
  RiskLevel,
  { color: string; bg: string; border: string; text: string; glow: string; percent: number }
> = {
  Low: {
    color: "#10B981",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    text: "text-emerald-400",
    glow: "shadow-emerald-500/20",
    percent: 25,
  },
  Medium: {
    color: "#F59E0B",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    text: "text-amber-400",
    glow: "shadow-amber-500/20",
    percent: 50,
  },
  High: {
    color: "#F97316",
    bg: "bg-orange-500/10",
    border: "border-orange-500/30",
    text: "text-orange-400",
    glow: "shadow-orange-500/20",
    percent: 75,
  },
  Severe: {
    color: "#EF4444",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    text: "text-red-400",
    glow: "shadow-red-500/20",
    percent: 100,
  },
};

// ---------- Direct Flow Item ----------
export interface DirectFlowItem {
  isHighRisk: boolean;
  totalValueUsd: number;
  tagTypeVerbose: string;
  totalValueUsdRatio: number;
}

// ---------- Risk Exposure Breakdown ----------
export interface RiskExposureBreakdown {
  totalAmount: number;
  lowRiskAmount: number;
  highRiskAmount: number;
}

// ---------- Vendor Platform ----------
export interface VendorPlatform {
  platform: string;
  totalIncoming: number;
  totalOutgoing: number;
  walletBalance: number;
  directIncoming: DirectFlowItem[];
  directOutgoing: DirectFlowItem[];
  platformWalletAlert: {
    hasAlert: boolean;
    hasDirectAlert?: boolean;
    hasSevereDirectAlert?: boolean;
  };
}

// ---------- Transaction ----------
export interface Transaction {
  hash: string;
  asset: string;
  direction: string;
  from: string;
  to: string;
  value?: number;
  timestamp?: string;
  isHighRisk?: boolean;
}

// ---------- Wallet Extra ----------
export interface WalletExtra {
  totalIncoming: number;
  totalOutgoing: number;
  walletBalance: number;
  earliestTransactionTime: string;
  latestTransactionTime: string;
  directIncoming: DirectFlowItem[];
  directOutgoing: DirectFlowItem[];
  incomingDirectExposure: DirectFlowItem[];
  outgoingDirectExposure: DirectFlowItem[];
  incomingRiskExposureBreakdown: RiskExposureBreakdown;
  outgoingRiskExposureBreakdown: RiskExposureBreakdown;
  highRiskCategories: string[];
  chainalysis: VendorPlatform;
  vendor1: VendorPlatform;
  vendor2: VendorPlatform;
  vendor3: VendorPlatform;
  tx: Transaction[];
}

// ---------- Wallet Check Response ----------
export interface WalletCheckResponse {
  data: {
    level: RiskLevel;
    network: string;
    address: string;
    extra: WalletExtra;
  };
}

// ---------- Transaction Check Input ----------
export interface TransactionCheckInput {
  hash: string;
  asset: string;
  direction: "received" | "sent";
  from: string;
  to: string;
}

// ---------- Transaction Check Response ----------
export interface TransactionCheckResponse {
  data: {
    transactions: Array<{
      hash: string;
      riskLevel: RiskLevel;
      alerts: string[];
      details: Record<string, unknown>;
    }>;
  };
}

// ---------- Helpers ----------
export function formatUSD(value: number): string {
  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(2)}B`;
  }
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(2)}K`;
  }
  return `$${value.toFixed(2)}`;
}

export function formatUSDFull(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function truncateAddress(address: string, chars = 6): string {
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function validateAddress(network: Network, address: string): string | null {
  if (!address.trim()) return "Wallet address is required";
  switch (network) {
    case "Ethereum":
      if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        return "Invalid Ethereum address (must start with 0x and be 42 characters)";
      }
      break;
    case "Bitcoin":
      if (!/^(bc1[a-zA-HJ-NP-Z0-9]{25,62}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/.test(address)) {
        return "Invalid Bitcoin address (must start with bc1, 1, or 3)";
      }
      break;
    case "Tron":
      if (!/^T[a-zA-HJ-NP-Z1-9]{33}$/.test(address)) {
        return "Invalid Tron address (must start with T and be 34 characters)";
      }
      break;
  }
  return null;
}

export function getVerdict(level: RiskLevel): {
  title: string;
  description: string;
  recommendation: string;
} {
  switch (level) {
    case "Low":
      return {
        title: "Minimal Risk Detected",
        description:
          "The wallet shows no significant exposure to illicit activity. Transaction patterns are consistent with legitimate use.",
        recommendation:
          "No further action required. The wallet passes standard compliance screening.",
      };
    case "Medium":
      return {
        title: "Moderate Risk Flags",
        description:
          "The wallet has some indirect exposure to high-risk categories. While no direct illicit activity was found, enhanced monitoring is recommended.",
        recommendation:
          "Proceed with caution. Implement enhanced due diligence (EDD) and periodic re-screening.",
      };
    case "High":
      return {
        title: "Significant Risk Indicators",
        description:
          "The wallet shows direct exposure to high-risk entities and categories. Transaction patterns warrant further investigation.",
        recommendation:
          "Escalate to compliance officer. Require additional documentation and source-of-funds verification before proceeding.",
      };
    case "Severe":
      return {
        title: "Critical Risk Alert",
        description:
          "The wallet is strongly associated with illicit activity including sanctions, darknet markets, theft, or fraud. Immediate action required.",
        recommendation:
          "BLOCK TRANSACTION. File Suspicious Activity Report (SAR). Notify MLRO and legal counsel immediately.",
      };
  }
}

export const VENDOR_NAMES: Record<string, string> = {
  chainalysis: "Chainalysis",
  beosin: "Beosin",
  elliptic: "Elliptic",
  merklescience: "Merkle Science",
};

export function getVendorHighRiskCount(vendor: VendorPlatform): number {
  const incoming = vendor.directIncoming.filter((d) => d.isHighRisk).length;
  const outgoing = vendor.directOutgoing.filter((d) => d.isHighRisk).length;
  return incoming + outgoing;
}
