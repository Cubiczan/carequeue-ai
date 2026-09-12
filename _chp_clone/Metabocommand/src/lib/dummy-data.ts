// Static dummy data for MVP agent dashboards.
// Keep deterministic so charts render identically every load.

export interface CapitalFlowPoint {
  date: string;
  inflow: number;
  outflow: number;
  net: number;
}

export const capitalFlow30d: CapitalFlowPoint[] = Array.from({ length: 30 }, (_, i) => {
  const day = new Date("2026-03-21");
  day.setDate(day.getDate() + i);
  const seed = Math.sin(i * 0.7) * 0.5 + 0.5;
  const inflow = Math.round(120_000 + seed * 60_000 + i * 1200);
  const outflow = Math.round(95_000 + (1 - seed) * 40_000 + i * 900);
  return {
    date: day.toISOString().slice(0, 10),
    inflow,
    outflow,
    net: inflow - outflow,
  };
});

export const vendorMarginHeatmap = {
  vendors: ["Vendor Apex", "Vendor Bravo", "Vendor Delta", "Vendor Echo", "Vendor Meridian", "Vendor Nexus"],
  weeks: ["W1", "W2", "W3", "W4"],
  // values 0-100 (higher = better margin)
  grid: [
    [72, 68, 74, 78],
    [55, 42, 38, 31],
    [28, 22, 19, 15],
    [81, 84, 79, 85],
    [66, 70, 72, 69],
    [58, 60, 63, 61],
  ],
};

export interface AnomalyAlert {
  id: string;
  type: string;
  description: string;
  velocityImpact: number;
  correlatedPatterns: string[];
  proposedScenarios: string[];
}

export const pulseAlerts: AnomalyAlert[] = [
  {
    id: "alert-001",
    type: "Margin Erosion",
    description: "Carrier Delta freight cost up 34% over 14 days; margin compressed on SKU-0091, SKU-0047.",
    velocityImpact: -0.61,
    correlatedPatterns: ["Shipping cost spike", "Vendor renegotiation delay", "Fuel surcharge increase"],
    proposedScenarios: [
      "Renegotiate freight contract with Carrier Delta",
      "Shift 40% of West Coast volume to Carrier Echo",
      "Pass surcharge to customer via shipping threshold adjustment",
    ],
  },
  {
    id: "alert-002",
    type: "Spend Deviation",
    description: "Google Ads spend +18% week-over-week without corresponding LTV lift.",
    velocityImpact: -0.34,
    correlatedPatterns: ["Bid strategy change", "Campaign broad match expansion"],
    proposedScenarios: [
      "Revert to manual CPC on top 5 campaigns",
      "Cap daily spend at prior 14-day average",
      "Reallocate $8,000 to TikTok Ads (velocity 1.87)",
    ],
  },
  {
    id: "alert-003",
    type: "Vendor Concentration",
    description: "Vendor Apex now accounts for 41% of COGS; velocity score declining past 21 days.",
    velocityImpact: -0.22,
    correlatedPatterns: ["Single-source risk", "Lead time variance +12 days"],
    proposedScenarios: [
      "Onboard Vendor Meridian as secondary supplier",
      "Negotiate volume discount on existing Apex contract",
      "Split SKU-0091 and SKU-0112 across two vendors",
    ],
  },
];

export interface DashboardKpis {
  totalCapitalDeployed: number;
  netCapitalVelocityScore: number;
  activeAnomalies: number;
  pendingApprovals: number;
}

export const financeHeaderKpis: DashboardKpis = {
  totalCapitalDeployed: 2_480_000,
  netCapitalVelocityScore: 1.42,
  activeAnomalies: 3,
  pendingApprovals: 4,
};

export const pulseAgentKpis = {
  anomalyCount: 3,
  marginErosionAlerts: 2,
  spendDeviationFlags: 1,
};

// ============================================================
// ORACLE AGENT — Scenario Modeling Engine
// ============================================================

export const oracleKpis = {
  forecastAccuracy: 87, // %
  activeScenarios: 5,
  capitalDeploymentLeadTime: 14, // days
};

export interface DemandForecastPoint {
  week: string;
  forecast: number;
  upper: number;
  lower: number;
}

// 13-week rolling forecast with confidence bands (+/- 15%)
export const oracleDemandForecast: DemandForecastPoint[] = Array.from({ length: 13 }, (_, i) => {
  const base = 420_000 + Math.sin(i * 0.45) * 90_000 + i * 8_000;
  const band = base * 0.15;
  return {
    week: `W${i + 1}`,
    forecast: Math.round(base),
    upper: Math.round(base + band),
    lower: Math.round(base - band),
  };
});

export interface ScenarioStackPoint {
  week: string;
  scenarioA: number;
  scenarioB: number;
  scenarioC: number;
  scenarioD: number;
  scenarioE: number;
}

export const oracleScenarioStack: ScenarioStackPoint[] = Array.from({ length: 12 }, (_, i) => ({
  week: `W${i + 1}`,
  scenarioA: Math.round(40_000 + Math.sin(i * 0.5) * 8_000),
  scenarioB: Math.round(65_000 + Math.cos(i * 0.4) * 12_000),
  scenarioC: Math.round(28_000 + Math.sin(i * 0.7) * 5_000),
  scenarioD: Math.round(18_000 + i * 1_200),
  scenarioE: Math.round(12_000 + Math.cos(i * 0.6) * 3_500),
}));

export interface OracleScenario {
  id: string;
  name: string;
  probability: number; // %
  capitalRequired: number;
  breakEvenDate: string;
  recommendedAction: string;
}

export const oracleScenarios: OracleScenario[] = [
  {
    id: "scn-b",
    name: "Scenario B — Q3 Inventory Pre-Buy",
    probability: 74,
    capitalRequired: 240_000,
    breakEvenDate: "2026-05-22",
    recommendedAction: "Pre-purchase inventory ahead of Q3 demand spike",
  },
  {
    id: "scn-c",
    name: "Scenario C — TikTok Channel Scale",
    probability: 62,
    capitalRequired: 85_000,
    breakEvenDate: "2026-06-04",
    recommendedAction: "Scale TikTok acquisition spend in high-velocity cohorts",
  },
  {
    id: "scn-d",
    name: "Scenario D — Enterprise Tier Launch",
    probability: 48,
    capitalRequired: 180_000,
    breakEvenDate: "2026-07-18",
    recommendedAction: "Build enterprise tier with annual contracts; soft launch Q3",
  },
  {
    id: "scn-a",
    name: "Scenario A — Conservative Q2 Hold",
    probability: 35,
    capitalRequired: 0,
    breakEvenDate: "—",
    recommendedAction: "Hold capital; defer large commitments pending macro signals",
  },
  {
    id: "scn-e",
    name: "Scenario E — International Expansion (UK)",
    probability: 28,
    capitalRequired: 320_000,
    breakEvenDate: "2026-11-02",
    recommendedAction: "UK market entry with localized Shopify + payment rails",
  },
];

// ============================================================
// SNIPER AGENT — Waste Elimination Reflex
// ============================================================

export const sniperKpis = {
  totalWasteIdentified: 48_200,
  projectedQuarterlySavings: 144_600,
  lowVelocityInitiatives: 7,
};

export interface ExpenseScatterPoint {
  name: string;
  capitalDeployed: number;
  ltvContribution: number;
  category: string;
}

export const sniperExpenseScatter: ExpenseScatterPoint[] = [
  { name: "Google Ads — Brand", capitalDeployed: 18_000, ltvContribution: 42_000, category: "Marketing" },
  { name: "TikTok Ads", capitalDeployed: 22_000, ltvContribution: 64_000, category: "Marketing" },
  { name: "Meta Ads", capitalDeployed: 31_000, ltvContribution: 28_000, category: "Marketing" },
  { name: "Google Ads — Generic", capitalDeployed: 15_000, ltvContribution: 6_300, category: "Marketing" },
  { name: "Klaviyo Pro", capitalDeployed: 1_200, ltvContribution: 200, category: "Tools" },
  { name: "Salesforce CRM", capitalDeployed: 3_800, ltvContribution: 4_100, category: "Tools" },
  { name: "Zapier", capitalDeployed: 49, ltvContribution: 0, category: "Tools" },
  { name: "Loom Business", capitalDeployed: 13, ltvContribution: 0, category: "Tools" },
  { name: "Influencer Alpha", capitalDeployed: 6_000, ltvContribution: 1_700, category: "Marketing" },
  { name: "Email Platform", capitalDeployed: 500, ltvContribution: 2_800, category: "Tools" },
  { name: "Customer Support SaaS", capitalDeployed: 1_450, ltvContribution: 3_200, category: "Tools" },
  { name: "SEO Agency", capitalDeployed: 8_000, ltvContribution: 11_400, category: "Services" },
];

export interface VelocityByCategory {
  category: string;
  velocity: number;
}

export const sniperVelocityByCategory: VelocityByCategory[] = [
  { category: "Brand Ads", velocity: 1.87 },
  { category: "Affiliate", velocity: 1.62 },
  { category: "Email", velocity: 1.45 },
  { category: "SEO/Content", velocity: 1.18 },
  { category: "Generic Search", velocity: 0.58 },
  { category: "Display", velocity: 0.42 },
  { category: "Retargeting", velocity: 0.31 },
  { category: "Influencer", velocity: 0.29 },
];

export interface WasteProposal {
  id: string;
  item: string;
  monthlyCost: number;
  velocityScore: number;
  proposedAction: "Cancel" | "Renegotiate" | "Reallocate";
  projectedSavingsAnnual: number;
}

export const sniperWasteProposals: WasteProposal[] = [
  { id: "w-001", item: "Klaviyo Pro", monthlyCost: 1_200, velocityScore: 0.18, proposedAction: "Cancel", projectedSavingsAnnual: 14_400 },
  { id: "w-002", item: "Salesforce CRM", monthlyCost: 3_800, velocityScore: 0.88, proposedAction: "Renegotiate", projectedSavingsAnnual: 13_680 },
  { id: "w-003", item: "Zapier Starter", monthlyCost: 49, velocityScore: 0.11, proposedAction: "Cancel", projectedSavingsAnnual: 588 },
  { id: "w-004", item: "Loom Business (dup seat)", monthlyCost: 13, velocityScore: 0.0, proposedAction: "Cancel", projectedSavingsAnnual: 150 },
  { id: "w-005", item: "Google Display Campaign", monthlyCost: 380, velocityScore: 0.14, proposedAction: "Cancel", projectedSavingsAnnual: 4_560 },
  { id: "w-006", item: "Influencer Program Alpha", monthlyCost: 6_000, velocityScore: 0.29, proposedAction: "Reallocate", projectedSavingsAnnual: 72_000 },
  { id: "w-007", item: "SEO Retainer — Vendor X", monthlyCost: 2_500, velocityScore: 0.41, proposedAction: "Renegotiate", projectedSavingsAnnual: 9_000 },
];

// ============================================================
// CONDUCTOR AGENT — Capital Orchestration Intelligence
// ============================================================

export const conductorKpis = {
  availableLiquidity: 820_000,
  activeCapitalRequests: 4,
  velocityWeightedROI: 1.62,
};

export const conductorLiquidityThresholds = {
  critical: 400_000,
  healthy: 1_000_000,
  max: 1_500_000,
};

export interface Initiative {
  id: string;
  name: string;
  capitalRequested: number;
  velocityScore: number;
  strategicPriority: "High" | "Medium" | "Low";
  status: "Pending" | "Approved" | "On Hold" | "Rejected";
}

export const conductorInitiatives: Initiative[] = [
  { id: "i-001", name: "TikTok Ads Scale Q3",          capitalRequested: 85_000,  velocityScore: 1.87, strategicPriority: "High",   status: "Pending"  },
  { id: "i-002", name: "Vendor Meridian Onboarding",   capitalRequested: 42_000,  velocityScore: 1.51, strategicPriority: "High",   status: "Pending"  },
  { id: "i-003", name: "Q3 Inventory Pre-Buy",         capitalRequested: 240_000, velocityScore: 1.42, strategicPriority: "High",   status: "Approved" },
  { id: "i-004", name: "Carrier Echo Contract",        capitalRequested: 18_000,  velocityScore: 1.22, strategicPriority: "Medium", status: "Pending"  },
  { id: "i-005", name: "Email Automation Tier",        capitalRequested: 6_500,   velocityScore: 1.11, strategicPriority: "Medium", status: "Pending"  },
  { id: "i-006", name: "Influencer Program Alpha",     capitalRequested: 6_000,   velocityScore: 0.29, strategicPriority: "Low",    status: "On Hold"  },
  { id: "i-007", name: "Google Display Expansion",     capitalRequested: 12_000,  velocityScore: 0.42, strategicPriority: "Low",    status: "Rejected" },
];

export interface ReallocationFlow {
  from: string;
  to: string;
  amount: number;
  fromVelocity: number;
  toVelocity: number;
}

export const conductorReallocations: ReallocationFlow[] = [
  { from: "Google Ads — Generic", to: "TikTok Ads",             amount: 18_500, fromVelocity: 0.42, toVelocity: 1.87 },
  { from: "Meta Ads",             to: "Google Shopping",        amount: 7_500,  fromVelocity: 1.20, toVelocity: 3.10 },
  { from: "Influencer Alpha",     to: "Affiliate Partnerships", amount: 6_000,  fromVelocity: 0.29, toVelocity: 1.62 },
  { from: "Display",              to: "Email Automation",       amount: 3_200,  fromVelocity: 0.31, toVelocity: 1.45 },
];

// ============================================================
// OPERATIONS DASHBOARD — HEADER KPIs
// ============================================================

export const operationsHeaderKpis = {
  conversionRate: 3.42, // %
  stockoutRate: 2.1, // %
  customerLtvAvg: 284, // $
  supportResolutionTimeAvg: 4.2, // hours
};

// ============================================================
// ACQUISITION AGENT — Revenue Velocity
// ============================================================

export const acquisitionKpis = {
  cacTopChannel: 48, // Google Shopping
  ltvCacRatio: 2.8,
  currentAdSpend: 84_200, // monthly
};

export interface ChannelCacPoint {
  date: string;
  google: number;
  meta: number;
  tiktok: number;
  email: number;
}

export const acquisitionCacTrend: ChannelCacPoint[] = Array.from({ length: 30 }, (_, i) => {
  const day = new Date("2026-03-21");
  day.setDate(day.getDate() + i);
  return {
    date: day.toISOString().slice(0, 10),
    google: Math.round(52 + Math.sin(i * 0.4) * 8 - i * 0.15),
    meta: Math.round(78 + Math.sin(i * 0.5) * 12 + i * 0.3),
    tiktok: Math.round(38 + Math.sin(i * 0.3) * 6 - i * 0.2),
    email: Math.round(12 + Math.sin(i * 0.6) * 3),
  };
});

// Segments × Channels LTV:CAC ratio heatmap
export const acquisitionLtvCacHeatmap = {
  segments: ["Enterprise", "Mid-Market", "SMB", "Consumer"],
  channels: ["Google Shopping", "Google Ads", "TikTok", "Meta", "Email"],
  // ratios
  grid: [
    [3.2, 2.1, 4.5, 1.4, 5.8],
    [2.8, 1.9, 3.8, 1.2, 4.9],
    [2.4, 1.6, 3.1, 1.0, 4.2],
    [2.0, 1.3, 2.6, 0.9, 3.5],
  ],
};

export interface SpendAllocation {
  channel: string;
  amount: number;
  color: string;
}

export const acquisitionSpendAllocation: SpendAllocation[] = [
  { channel: "Google Shopping", amount: 22_000, color: "#4f46e5" },
  { channel: "Google Ads",      amount: 18_500, color: "#6366f1" },
  { channel: "TikTok",          amount: 19_200, color: "#ec4899" },
  { channel: "Meta",            amount: 14_500, color: "#3b82f6" },
  { channel: "Email",           amount: 6_000,  color: "#10b981" },
  { channel: "Affiliate",       amount: 4_000,  color: "#f59e0b" },
];

export interface SpendReallocationProposal {
  id: string;
  fromChannel: string;
  toChannel: string;
  amount: number;
  currentCac: number;
  projectedCac: number;
  cacImprovement: number; // %
}

export const acquisitionProposals: SpendReallocationProposal[] = [
  { id: "acq-001", fromChannel: "Meta",        toChannel: "Google Shopping", amount: 7_500,  currentCac: 88, projectedCac: 48, cacImprovement: 45 },
  { id: "acq-002", fromChannel: "Google Ads",  toChannel: "TikTok",          amount: 4_200,  currentCac: 62, projectedCac: 38, cacImprovement: 39 },
  { id: "acq-003", fromChannel: "Display",     toChannel: "Email",           amount: 2_800,  currentCac: 95, projectedCac: 12, cacImprovement: 87 },
];

// ============================================================
// CONVERSION AGENT — Revenue Velocity
// ============================================================

export const conversionKpis = {
  conversionRate: 3.42, // %
  averageOrderValue: 92,
  cartAbandonmentRate: 68.3, // %
};

export interface FunnelStep {
  step: string;
  users: number;
}

export const conversionFunnel: FunnelStep[] = [
  { step: "Visit",         users: 124_000 },
  { step: "Product View",  users: 68_200 },
  { step: "Add to Cart",   users: 21_800 },
  { step: "Checkout",      users: 8_900  },
  { step: "Purchase",      users: 4_240  },
];

export const conversionDevice = [
  { device: "Mobile",  rate: 2.8 },
  { device: "Desktop", rate: 4.6 },
  { device: "Tablet",  rate: 3.1 },
];

export interface AbTest {
  id: string;
  name: string;
  variant: string;
  conversionLift: number; // %
  status: "Winning" | "Inconclusive" | "Losing" | "Completed";
  autoRollout: boolean; // true when lift above threshold
}

export const conversionAbTests: AbTest[] = [
  { id: "ab-001", name: "Checkout redesign",           variant: "Variant B", conversionLift: 14.3, status: "Completed",    autoRollout: false },
  { id: "ab-002", name: "PDP video autoplay",          variant: "Variant A", conversionLift: 8.2,  status: "Winning",      autoRollout: true  },
  { id: "ab-003", name: "Cart bundle upsell",          variant: "Variant C", conversionLift: 4.1,  status: "Winning",      autoRollout: true  },
  { id: "ab-004", name: "Free shipping threshold",     variant: "Variant B", conversionLift: 1.2,  status: "Inconclusive", autoRollout: false },
  { id: "ab-005", name: "Promo banner copy",           variant: "Variant A", conversionLift: -2.3, status: "Losing",       autoRollout: false },
];

// ============================================================
// RETENTION AGENT — Revenue Velocity
// ============================================================

export const retentionKpis = {
  churnRate30d: 8.4, // %
  reactivationRate: 11.2, // %
  ltvGrowth: 4.8, // %
};

export interface LtvPoint {
  month: string;
  ltv: number;
}

export const retentionLtvTrend: LtvPoint[] = [
  { month: "Nov", ltv: 248 },
  { month: "Dec", ltv: 256 },
  { month: "Jan", ltv: 262 },
  { month: "Feb", ltv: 271 },
  { month: "Mar", ltv: 279 },
  { month: "Apr", ltv: 284 },
];

export interface ChurnRiskSegment {
  id: string;
  segment: string;
  size: number;
  churnProbability: number; // %
  intervention: string;
  revenueAtRisk: number;
}

export const retentionChurnSegments: ChurnRiskSegment[] = [
  { id: "ch-001", segment: "High-Value Lapsed",   size: 2_340, churnProbability: 71, intervention: "20% discount win-back", revenueAtRisk: 228_900 },
  { id: "ch-002", segment: "Subscription At Risk", size: 840,  churnProbability: 58, intervention: "Pause + downgrade offer", revenueAtRisk: 84_200 },
  { id: "ch-003", segment: "Single-Order 60d",    size: 5_420, churnProbability: 42, intervention: "Bundle + free shipping", revenueAtRisk: 142_100 },
  { id: "ch-004", segment: "VIP Quiet 90d",       size: 212,   churnProbability: 32, intervention: "Personal CSM outreach",  revenueAtRisk: 58_700 },
];

export interface RetentionCampaign {
  id: string;
  targetSegment: string;
  offerType: string;
  projectedReactivation: number; // %
  projectedRevenue: number;
}

export const retentionCampaigns: RetentionCampaign[] = [
  { id: "ret-001", targetSegment: "High-Value Lapsed",    offerType: "20% discount + free shipping",    projectedReactivation: 18, projectedRevenue: 41_200 },
  { id: "ret-002", targetSegment: "Subscription At Risk", offerType: "Pause option + loyalty bonus",    projectedReactivation: 34, projectedRevenue: 28_600 },
  { id: "ret-003", targetSegment: "VIP Quiet 90d",        offerType: "Early-access product drop",        projectedReactivation: 51, projectedRevenue: 29_900 },
];

// ============================================================
// DEMAND PROPHET AGENT — Inventory Intelligence
// ============================================================

export const demandProphetKpis = {
  forecastAccuracy: 91, // %
  activeStockoutRisks: 4,
  avgHoldingCostPerUnit: 2.14,
};

export interface SkuForecastPoint {
  day: number;
  demand: number;
  upper: number;
  lower: number;
}

// 60-day SKU-level forecast for top SKU
export const demandProphetForecast: SkuForecastPoint[] = Array.from({ length: 60 }, (_, i) => {
  const base = 180 + Math.sin(i * 0.25) * 35 + i * 0.8;
  const band = base * 0.18;
  return {
    day: i + 1,
    demand: Math.round(base),
    upper: Math.round(base + band),
    lower: Math.round(base - band),
  };
});

export const demandProphetStockoutHeatmap = {
  locations: ["West Coast DC", "East Coast DC", "Central DC", "International"],
  weeks: ["W1", "W2", "W3", "W4", "W5", "W6"],
  // 0-100, higher = more risk
  grid: [
    [12, 18, 34, 72, 48, 22],
    [8,  14, 22, 35, 45, 28],
    [5,  8,  12, 18, 25, 22],
    [22, 28, 45, 58, 42, 30],
  ],
};

export interface PurchaseOrderProposal {
  id: string;
  sku: string;
  productName: string;
  vendor: string;
  quantity: number;
  estimatedCost: number;
  triggerReason: string;
  autoExecute: boolean; // true when under $10k threshold
}

export const demandProphetPoProposals: PurchaseOrderProposal[] = [
  { id: "po-001", sku: "SKU-0091", productName: "Wireless Earbuds Pro",     vendor: "Vendor Apex",     quantity: 4_200, estimatedCost: 58_800, triggerReason: "Stockout risk in 11 days",              autoExecute: false },
  { id: "po-002", sku: "SKU-0047", productName: "Portable Charger 20K",     vendor: "Vendor Meridian", quantity: 1_800, estimatedCost: 21_600, triggerReason: "Seasonal demand uplift +62%",          autoExecute: false },
  { id: "po-003", sku: "SKU-0112", productName: "USB-C Hub",                vendor: "Vendor Nexus",    quantity: 320,   estimatedCost: 4_480,  triggerReason: "Reorder point breached",                autoExecute: true  },
  { id: "po-004", sku: "SKU-0203", productName: "Wireless Charging Pad",    vendor: "Vendor Apex",     quantity: 540,   estimatedCost: 6_480,  triggerReason: "Weekly sell-through above forecast",    autoExecute: true  },
  { id: "po-005", sku: "SKU-0158", productName: "Bluetooth Speaker Mini",   vendor: "Vendor Echo",     quantity: 1_200, estimatedCost: 14_400, triggerReason: "Above auto-execute threshold",          autoExecute: false },
];

// ============================================================
// LOGISTICS CONDUCTOR AGENT — Inventory Intelligence
// ============================================================

export const logisticsKpis = {
  onTimeDeliveryRate: 93.4, // %
  deliveryCostPerOrder: 8.42,
  activeDelayAlerts: 3,
};

export interface CarrierCost {
  carrier: string;
  costPerOrder: number;
  onTimeRate: number;
}

export const logisticsCarrierCosts: CarrierCost[] = [
  { carrier: "Carrier Echo",   costPerOrder: 6.88,  onTimeRate: 96.2 },
  { carrier: "Carrier Alpha",  costPerOrder: 7.42,  onTimeRate: 94.1 },
  { carrier: "Carrier Bravo",  costPerOrder: 8.70,  onTimeRate: 87.4 },
  { carrier: "Carrier Delta",  costPerOrder: 11.20, onTimeRate: 82.1 },
];

export interface OnTimeTrendPoint {
  week: string;
  rate: number;
}

export const logisticsOnTimeTrend: OnTimeTrendPoint[] = [
  { week: "W-5", rate: 91.2 },
  { week: "W-4", rate: 92.0 },
  { week: "W-3", rate: 91.8 },
  { week: "W-2", rate: 93.1 },
  { week: "W-1", rate: 92.8 },
  { week: "W0",  rate: 93.4 },
];

export interface DelayAlert {
  id: string;
  carrier: string;
  route: string;
  affectedOrders: number;
  cause: string;
  proposedAction: string;
}

export const logisticsDelayAlerts: DelayAlert[] = [
  { id: "dl-001", carrier: "Carrier Bravo", route: "West Coast → Pacific NW", affectedOrders: 340, cause: "Port congestion at Long Beach",       proposedAction: "Proactive email to affected customers with 20% credit" },
  { id: "dl-002", carrier: "Carrier Delta", route: "Midwest distribution",    affectedOrders: 128, cause: "Weather event — severe storm system", proposedAction: "Suspend promises; extend delivery ETA by 48h" },
  { id: "dl-003", carrier: "Carrier Bravo", route: "Northeast urban",         affectedOrders: 96,  cause: "Carrier labor disruption",            proposedAction: "Reroute to Carrier Echo for in-flight orders" },
];

export interface RouteOptimization {
  id: string;
  description: string;
  projectedSavings: number;
  onTimeImprovement: number; // % points
}

export const logisticsRouteOptimizations: RouteOptimization[] = [
  { id: "ro-001", description: "Shift 40% West Coast shipments from Carrier Bravo to Carrier Echo", projectedSavings: 18_400, onTimeImprovement: 8.8 },
  { id: "ro-002", description: "Consolidate Midwest SKUs through Central DC (cuts 1 hop)",           projectedSavings: 7_200,  onTimeImprovement: 2.4 },
  { id: "ro-003", description: "Negotiate volume tier with Carrier Alpha at 12% discount",          projectedSavings: 14_800, onTimeImprovement: 0   },
];

