/**
 * MineScope Risk Scoring Utilities
 * 
 * Provides multi-dimensional risk scoring algorithms for critical mineral
 * supply chains. Calculates composite risk scores, individual risk levels,
 * and supply chain concentration metrics (HHI).
 * 
 * MineScope Risk Scoring Utilities
 */

// ─── Types ─────────────────────────────────────────────────────────────────

export interface RiskAssessment {
  geopolitical: number;
  environmental: number;
  regulatory: number;
  infrastructure: number;
  labor: number;
  marketConcentration: number;
}

export type RiskLevel = 'Minimal' | 'Low' | 'Medium' | 'High' | 'Critical';

export interface RiskResult {
  composite: number;
  level: RiskLevel;
  color: string;
  description: string;
  breakdown: RiskAssessment;
}

export interface HHIResult {
  hhi: number;
  level: string;
  color: string;
  concentration: string;
}

export interface RiskAlert {
  type: 'spike' | 'increase' | 'new_critical';
  message: string;
  severity: 'warning' | 'high' | 'critical';
}

// ─── Risk Level Definitions ────────────────────────────────────────────────

const RISK_LEVELS: Array<{ min: number; max: number; level: RiskLevel; color: string; description: string }> = [
  {
    min: 0,
    max: 20,
    level: 'Minimal',
    color: '#14b8a6',
    description: 'Supply chain is highly diversified with minimal disruption risk.',
  },
  {
    min: 21,
    max: 40,
    level: 'Low',
    color: '#22c55e',
    description: 'Some concentration exists but multiple supply sources are available.',
  },
  {
    min: 41,
    max: 60,
    level: 'Medium',
    color: '#eab308',
    description: 'Moderate concentration risk. Monitor political and environmental developments.',
  },
  {
    min: 61,
    max: 80,
    level: 'High',
    color: '#f97316',
    description: 'Significant concentration risk. Diversification strategies recommended.',
  },
  {
    min: 81,
    max: 100,
    level: 'Critical',
    color: '#ef4444',
    description: 'Extreme supply chain vulnerability. Active risk mitigation required.',
  },
];

// ─── Default Weights ───────────────────────────────────────────────────────

const DEFAULT_WEIGHTS: Record<keyof RiskAssessment, number> = {
  geopolitical: 0.25,
  environmental: 0.20,
  regulatory: 0.20,
  infrastructure: 0.15,
  labor: 0.10,
  marketConcentration: 0.10,
};

// ─── Composite Risk Calculation ────────────────────────────────────────────

/**
 * Calculate the composite risk score from individual risk factor scores.
 * Uses weighted average with configurable weights.
 * 
 * @param scores - Individual risk factor scores (0-100 each)
 * @param customWeights - Optional custom weights (must sum to 1.0)
 * @returns Composite risk score (0-100)
 */
export function calculateCompositeRisk(
  scores: RiskAssessment,
  customWeights?: Partial<Record<keyof RiskAssessment, number>>
): RiskResult {
  const weights = { ...DEFAULT_WEIGHTS, ...customWeights };
  
  let composite = 0;
  const keys = Object.keys(scores) as (keyof RiskAssessment)[];
  
  for (const key of keys) {
    composite += (scores[key] || 0) * (weights[key] || 0);
  }

  composite = Math.round(composite * 10) / 10;
  const riskLevelInfo = getRiskLevel(composite);

  return {
    composite,
    level: riskLevelInfo.level,
    color: riskLevelInfo.color,
    description: riskLevelInfo.description,
    breakdown: scores,
  };
}

/**
 * Get the risk level information for a given composite score.
 */
export function getRiskLevel(score: number): { level: RiskLevel; color: string; description: string } {
  for (const level of RISK_LEVELS) {
    if (score >= level.min && score <= level.max) {
      return {
        level: level.level,
        color: level.color,
        description: level.description,
      };
    }
  }
  return {
    level: 'Critical',
    color: '#ef4444',
    description: 'Extreme supply chain vulnerability. Active risk mitigation required.',
  };
}

/**
 * Determine if a risk score has increased compared to a previous value.
 */
export function compareRiskTrend(
  current: number,
  previous: number
): 'increased' | 'decreased' | 'stable' {
  const diff = current - previous;
  if (Math.abs(diff) <= 3) return 'stable';
  return diff > 0 ? 'increased' : 'decreased';
}

// ─── HHI (Herfindahl-Hirschman Index) ─────────────────────────────────────

/**
 * Calculate the Herfindahl-Hirschman Index for market concentration.
 * HHI = sum of squared market share percentages.
 * 
 * - HHI < 1,500: Unconcentrated (competitive)
 * - HHI 1,500-2,500: Moderately concentrated
 * - HHI > 2,500: Highly concentrated
 * 
 * @param shares - Array of market share percentages (e.g., [70, 15, 10, 5])
 */
export function calculateHHI(shares: number[]): HHIResult {
  const hhi = shares.reduce((sum, share) => sum + share * share, 0);
  const roundedHHI = Math.round(hhi);

  let level: string;
  let color: string;
  let concentration: string;

  if (hhi < 1500) {
    level = 'Unconcentrated';
    color = '#22c55e';
    concentration = 'Low';
  } else if (hhi < 2500) {
    level = 'Moderately Concentrated';
    color = '#eab308';
    concentration = 'Moderate';
  } else {
    level = 'Highly Concentrated';
    color = '#ef4444';
    concentration = 'High';
  }

  return { hhi: roundedHHI, level, color, concentration };
}

/**
 * Calculate the effective number of competitors from HHI.
 * EN = 10,000 / HHI
 */
export function effectiveNumberOfCompetitors(hhi: number): number {
  if (hhi === 0) return Infinity;
  return Math.round((10000 / hhi) * 10) / 10;
}

// ─── Supply Chain Risk Matrix ──────────────────────────────────────────────

/**
 * Generate a risk matrix for mineral × country pairs.
 * Returns a 2D array suitable for heatmap visualization.
 * 
 * @param minerals - Array of mineral risk assessments
 * @param countries - Array of country risk assessments
 */
export function generateRiskMatrix(
  mineralRisks: Array<{ id: string; riskScore: number }>,
  countryRisks: Array<{ code: string; riskFactors: RiskAssessment }>
): Array<{
  mineral: string;
  country: string;
  riskScore: number;
  level: RiskLevel;
  color: string;
}> {
  const matrix: Array<{
    mineral: string;
    country: string;
    riskScore: number;
    level: RiskLevel;
    color: string;
  }> = [];

  for (const mineral of mineralRisks) {
    for (const country of countryRisks) {
      const countryComposite = calculateCompositeRisk(country.riskFactors);
      // Weighted combination: 60% mineral-specific risk, 40% country risk
      const combinedRisk = Math.round(
        mineral.riskScore * 0.6 + countryComposite.composite * 0.4
      );
      const riskInfo = getRiskLevel(combinedRisk);

      matrix.push({
        mineral: mineral.id,
        country: country.code,
        riskScore: combinedRisk,
        level: riskInfo.level,
        color: riskInfo.color,
      });
    }
  }

  return matrix;
}

// ─── Risk Radar Data Formatting ────────────────────────────────────────────

/**
 * Format risk assessment data for radar chart visualization.
 * Returns an array of objects with 'subject' and 'value' keys.
 */
export function formatRadarData(
  scores: RiskAssessment,
  label: string
): Array<{ subject: string; value: number; fullMark: number }> {
  const labels: Record<keyof RiskAssessment, string> = {
    geopolitical: 'Geopolitical',
    environmental: 'Environmental',
    regulatory: 'Regulatory',
    infrastructure: 'Infrastructure',
    labor: 'Labor',
    marketConcentration: 'Concentration',
  };

  return Object.entries(scores).map(([key, value]) => ({
    subject: labels[key as keyof RiskAssessment],
    value,
    fullMark: 100,
  }));
}

// ─── Risk Alerts ───────────────────────────────────────────────────────────

/**
 * Check if a mineral's risk score exceeds any threshold and generate alerts.
 */
export function generateRiskAlerts(
  currentScore: number,
  previousScore: number,
  mineralName: string
): RiskAlert[] {
  const alerts: RiskAlert[] = [];
  const diff = currentScore - previousScore;

  // New critical-level risk
  if (currentScore >= 80 && previousScore < 80) {
    alerts.push({
      type: 'new_critical',
      message: `${mineralName} supply chain risk has reached CRITICAL level (${currentScore}/100)`,
      severity: 'critical',
    });
  }

  // Significant risk increase (> 10 points)
  if (diff > 10) {
    alerts.push({
      type: 'increase',
      message: `${mineralName} risk score increased by ${Math.round(diff)} points to ${currentScore}/100`,
      severity: diff > 20 ? 'critical' : 'high',
    });
  }

  // Risk spike (> 5 points in single period)
  if (diff > 5) {
    alerts.push({
      type: 'spike',
      message: `${mineralName} risk score spiked ${Math.round(diff)} points this period`,
      severity: 'warning',
    });
  }

  return alerts;
}

// ─── Export Helpers ────────────────────────────────────────────────────────

/**
 * Get color for a risk score value (for inline styling).
 */
export function getRiskColor(score: number): string {
  return getRiskLevel(score).color;
}

/**
 * Get background color with alpha for heatmap cells.
 */
export function getRiskColorAlpha(score: number, alpha: number = 0.7): string {
  const color = getRiskLevel(score).color;
  // Convert hex to rgba
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
