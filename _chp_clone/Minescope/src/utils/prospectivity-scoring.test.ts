import {
  calculateProspectivityScore,
  rankProspectivityZones,
  ProspectivityZone,
} from './prospectivity-scoring';

describe('prospectivity scoring', () => {
  it('classifies a high-evidence zone as prime', () => {
    const result = calculateProspectivityScore(
      {
        geology: 95,
        geochemistry: 88,
        geophysics: 86,
        infrastructure: 82,
        policy: 78,
      },
      90
    );

    expect(result.score).toBeGreaterThanOrEqual(85);
    expect(result.className).toBe('Prime');
    expect(result.limitingFactor).toBe('policy');
  });

  it('ranks zones by weighted prospectivity score', () => {
    const zones: ProspectivityZone[] = [
      {
        id: 'early',
        name: 'Early Zone',
        region: 'A',
        country: 'A',
        mineralId: 'lithium',
        depositModel: 'Pegmatite',
        evidenceLayers: {
          geology: 55,
          geochemistry: 50,
          geophysics: 45,
          infrastructure: 70,
          policy: 80,
        },
        confidence: 55,
        rationale: 'Early signal.',
      },
      {
        id: 'strong',
        name: 'Strong Zone',
        region: 'B',
        country: 'B',
        mineralId: 'cobalt',
        depositModel: 'Sediment-hosted',
        evidenceLayers: {
          geology: 90,
          geochemistry: 84,
          geophysics: 78,
          infrastructure: 64,
          policy: 58,
        },
        confidence: 82,
        rationale: 'Strong signal.',
      },
    ];

    expect(rankProspectivityZones(zones)[0].id).toBe('strong');
  });
});
