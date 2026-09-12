// Dummy data for Customer Lifetime + Operational Health panels.
// Separate file from dummy-data.ts to keep file sizes manageable.

// ============================================================
// SUPPORT REFLEX AGENT — Customer Lifetime
// ============================================================

export const supportReflexKpis = {
  autonomousResolutionRate: 62, // %
  avgResolutionTime: 4.2, // hours
  costPerInteraction: 2.84,
};

export interface InquiryCategoryVolume {
  category: string;
  volume: number;
}

export const supportInquiryVolume: InquiryCategoryVolume[] = [
  { category: "Returns",         volume: 1_240 },
  { category: "Shipping",        volume: 980 },
  { category: "Product Issues",  volume: 720 },
  { category: "Billing",         volume: 420 },
  { category: "Order Changes",   volume: 380 },
  { category: "Other",           volume: 180 },
];

export interface ResolutionTimePoint {
  week: string;
  hours: number;
}

export const supportResolutionTrend: ResolutionTimePoint[] = [
  { week: "W-7", hours: 6.8 },
  { week: "W-6", hours: 6.2 },
  { week: "W-5", hours: 5.4 },
  { week: "W-4", hours: 5.1 },
  { week: "W-3", hours: 4.6 },
  { week: "W-2", hours: 4.3 },
  { week: "W-1", hours: 4.1 },
  { week: "W0",  hours: 4.2 },
];

export interface IssuePattern {
  id: string;
  pattern: string;
  frequency: number; // tickets
  affectedCustomers: number;
  proposedImprovement: string;
}

export const supportIssuePatterns: IssuePattern[] = [
  {
    id: "ip-001",
    pattern: "Returns workflow — orders under $35 take 18+ hours for manual approval",
    frequency: 620,
    affectedCustomers: 580,
    proposedImprovement: "Automated returns pre-approval for orders under $35 (cuts resolution from 18h to 2h for 44% of return inquiries)",
  },
  {
    id: "ip-002",
    pattern: "Shipping delays — Carrier Bravo West Coast routes",
    frequency: 340,
    affectedCustomers: 340,
    proposedImprovement: "Proactive notification + 20% credit issued automatically when Bravo WC shipment is flagged by Logistics Conductor",
  },
  {
    id: "ip-003",
    pattern: "Product defects — SKU-0091 Wireless Earbuds Pro pairing issue",
    frequency: 212,
    affectedCustomers: 212,
    proposedImprovement: "Updated product page troubleshooting video + QR code on packaging (estimated 60% deflection)",
  },
  {
    id: "ip-004",
    pattern: "Billing — subscription renewal confusion",
    frequency: 148,
    affectedCustomers: 148,
    proposedImprovement: "Pre-renewal email 14 days out with one-click cancel option (reduces billing disputes 75%)",
  },
];

// ============================================================
// ADVOCACY AGENT — Customer Lifetime
// ============================================================

export const advocacyKpis = {
  reviewVolume30d: 1_840,
  referralRate: 8.2, // %
  organicAcquisitionFromReferrals: 412,
};

export interface ReviewVolumePoint {
  month: string;
  volume: number;
}

export const advocacyReviewTrend: ReviewVolumePoint[] = [
  { month: "Nov", volume: 1_180 },
  { month: "Dec", volume: 1_420 },
  { month: "Jan", volume: 1_310 },
  { month: "Feb", volume: 1_580 },
  { month: "Mar", volume: 1_720 },
  { month: "Apr", volume: 1_840 },
];

export interface ReferralFunnelStep {
  step: string;
  count: number;
}

export const advocacyReferralFunnel: ReferralFunnelStep[] = [
  { step: "Invited",   count: 12_400 },
  { step: "Clicked",   count: 3_280 },
  { step: "Signed Up", count: 840 },
  { step: "Converted", count: 412 },
];

export interface AdvocacySegment {
  id: string;
  segment: string;
  size: number;
  advocacyScore: number; // 0-100
  recommendedAction: "Review request" | "Referral incentive" | "Loyalty program invite";
}

export const advocacySegments: AdvocacySegment[] = [
  { id: "ad-001", segment: "5-Star Recent Buyers",     size: 4_200, advocacyScore: 92, recommendedAction: "Review request" },
  { id: "ad-002", segment: "Repeat Subscribers (6mo+)", size: 2_180, advocacyScore: 87, recommendedAction: "Referral incentive" },
  { id: "ad-003", segment: "VIP High-LTV",             size: 420,   advocacyScore: 84, recommendedAction: "Loyalty program invite" },
  { id: "ad-004", segment: "Social Media Engaged",     size: 1_680, advocacyScore: 76, recommendedAction: "Referral incentive" },
  { id: "ad-005", segment: "First-Time Buyers (NPS 9+)", size: 920, advocacyScore: 71, recommendedAction: "Review request" },
];

// ============================================================
// HARMONY AGENT — Operational Health
// ============================================================

export const harmonyKpis = {
  activeConflicts: 2,
  systemVelocityScore: 1.42,
};

export type OperatingMode = "growth" | "efficiency";

export interface AgentConflict {
  id: string;
  agents: string[];
  conflictingActions: string;
  resolution: string;
  detectedAt: string;
}

export const harmonyConflicts: AgentConflict[] = [
  {
    id: "cf-001",
    agents: ["Acquisition Agent", "Sniper Agent"],
    conflictingActions:
      "Acquisition proposes +$4,200/mo spend increase on Meta Ads while Sniper flags same channel as low-velocity waste candidate",
    resolution:
      "Pause Acquisition Meta increase for 14 days; run Sniper waste review with 30-day cohort data; reconcile with joint recommendation",
    detectedAt: "2026-04-12 09:00",
  },
  {
    id: "cf-002",
    agents: ["Demand Prophet Agent", "Conductor Agent"],
    conflictingActions:
      "Demand Prophet proposes $58,800 PO (SKU-0091) while Conductor has insufficient liquidity buffer after Q3 pre-buy approval",
    resolution:
      "Stagger PO in two tranches: $30,000 immediate, $28,800 delayed 14 days pending inflow from TikTok scale-up",
    detectedAt: "2026-04-14 11:15",
  },
];

export interface SystemBottleneck {
  id: string;
  area: string;
  description: string;
  impact: string;
  proposedResolution: string;
}

export const harmonyBottlenecks: SystemBottleneck[] = [
  {
    id: "bn-001",
    area: "Fulfillment Capacity",
    description: "West Coast DC running at 94% utilization; Carrier Bravo delays compound the backlog",
    impact: "~8% of orders experiencing 2+ day fulfillment delay",
    proposedResolution: "Temporarily shift 40% West Coast volume to Carrier Echo (coordinated with Logistics Conductor)",
  },
  {
    id: "bn-002",
    area: "Support Headcount",
    description: "Weekend ticket volume exceeds Tier-1 capacity by ~22% during promo weeks",
    impact: "Avg resolution time rises from 4.2h to 11h on weekend peaks",
    proposedResolution: "Enable Support Reflex Agent weekend auto-resolution for orders under $35 (covers 44% of volume)",
  },
];
