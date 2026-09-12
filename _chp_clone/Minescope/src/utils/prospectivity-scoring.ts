export interface ProspectivityEvidence {
  geology: number;
  geochemistry: number;
  geophysics: number;
  infrastructure: number;
  policy: number;
}

export interface ProspectivityZone {
  id: string;
  name: string;
  region: string;
  country: string;
  mineralId: string;
  depositModel: string;
  evidenceLayers: ProspectivityEvidence;
  confidence: number;
  rationale: string;
}

export interface ProspectivityResult {
  score: number;
  className: 'Prime' | 'Strong' | 'Watch' | 'Early';
  color: string;
  limitingFactor: keyof ProspectivityEvidence;
}

const DEFAULT_WEIGHTS: Record<keyof ProspectivityEvidence, number> = {
  geology: 0.3,
  geochemistry: 0.25,
  geophysics: 0.2,
  infrastructure: 0.15,
  policy: 0.1,
};

export function calculateProspectivityScore(
  evidence: ProspectivityEvidence,
  confidence: number,
  weights: Record<keyof ProspectivityEvidence, number> = DEFAULT_WEIGHTS
): ProspectivityResult {
  const weightedEvidence = (Object.keys(weights) as Array<keyof ProspectivityEvidence>).reduce(
    (total, key) => total + evidence[key] * weights[key],
    0
  );
  const score = Math.round((weightedEvidence * 0.85 + confidence * 0.15) * 10) / 10;
  const limitingFactor = (Object.keys(evidence) as Array<keyof ProspectivityEvidence>).reduce(
    (lowest, key) => (evidence[key] < evidence[lowest] ? key : lowest),
    'geology'
  );

  return {
    score,
    className: getProspectivityClass(score),
    color: getProspectivityColor(score),
    limitingFactor,
  };
}

export function getProspectivityClass(score: number): ProspectivityResult['className'] {
  if (score >= 85) return 'Prime';
  if (score >= 72) return 'Strong';
  if (score >= 60) return 'Watch';
  return 'Early';
}

export function getProspectivityColor(score: number): string {
  if (score >= 85) return '#14b8a6';
  if (score >= 72) return '#22c55e';
  if (score >= 60) return '#eab308';
  return '#f97316';
}

export function rankProspectivityZones(zones: ProspectivityZone[]): Array<ProspectivityZone & ProspectivityResult> {
  return zones
    .map((zone) => ({
      ...zone,
      ...calculateProspectivityScore(zone.evidenceLayers, zone.confidence),
    }))
    .sort((a, b) => b.score - a.score);
}
