import { describe, it, expect } from 'vitest';
import { scoreVitals, maxSeverity, type VitalsInput } from './vitals-scoring';

// A vitals reading that is fully within normal limits and should never alert.
const NORMAL: VitalsInput = {
  heartRate: 72,
  systolic: 120,
  diastolic: 80,
  temperature: 98.6,
  spo2: 98,
};

const v = (over: Partial<VitalsInput>): VitalsInput => ({ ...NORMAL, ...over });

describe('scoreVitals — normal reading', () => {
  it('produces no alerts for a fully normal reading', () => {
    expect(scoreVitals(NORMAL)).toEqual([]);
    expect(maxSeverity(NORMAL)).toBe(0);
  });
});

describe('scoreVitals — blood pressure thresholds', () => {
  it('systolic 139 / diastolic 89 stays just below the warning cutoff', () => {
    expect(scoreVitals(v({ systolic: 139, diastolic: 89 }))).toEqual([]);
  });

  it('systolic exactly 140 is an inclusive warning boundary (sev 3)', () => {
    const alerts = scoreVitals(v({ systolic: 140 }));
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({ type: 'warning', category: 'vitals', severity: 3 });
    expect(alerts[0].message).toContain('140/80');
  });

  it('diastolic exactly 90 is an inclusive warning boundary (sev 3)', () => {
    const alerts = scoreVitals(v({ diastolic: 90 }));
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({ type: 'warning', severity: 3 });
  });

  it('systolic 159 / diastolic 99 is still only a warning, not critical', () => {
    const alerts = scoreVitals(v({ systolic: 159, diastolic: 99 }));
    expect(alerts).toHaveLength(1);
    expect(alerts[0].type).toBe('warning');
    expect(alerts[0].severity).toBe(3);
  });

  it('systolic exactly 160 escalates to critical (sev 5) — inclusive boundary', () => {
    const alerts = scoreVitals(v({ systolic: 160 }));
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({ type: 'critical', severity: 5 });
    expect(alerts[0].message).toContain('Hypertensive crisis');
  });

  it('diastolic exactly 100 escalates to critical (sev 5)', () => {
    const alerts = scoreVitals(v({ diastolic: 100 }));
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({ type: 'critical', severity: 5 });
  });

  it('critical takes precedence: a critical systolic does NOT also emit a warning', () => {
    // Regression guard: the else-if must not double-fire. High systolic (>=160)
    // is also >=140, so a buggy refactor to two independent ifs would yield 2 alerts.
    const alerts = scoreVitals(v({ systolic: 180, diastolic: 110 }));
    expect(alerts).toHaveLength(1);
    expect(alerts[0].severity).toBe(5);
  });
});

describe('scoreVitals — heart rate thresholds', () => {
  it('HR exactly 110 does not trigger tachycardia (strictly greater than)', () => {
    expect(scoreVitals(v({ heartRate: 110 }))).toEqual([]);
  });

  it('HR 111 triggers tachycardia warning (sev 3)', () => {
    const alerts = scoreVitals(v({ heartRate: 111 }));
    expect(alerts).toHaveLength(1);
    expect(alerts[0].message).toContain('Tachycardia');
    expect(alerts[0].severity).toBe(3);
  });

  it('HR exactly 55 does not trigger bradycardia (strictly less than)', () => {
    expect(scoreVitals(v({ heartRate: 55 }))).toEqual([]);
  });

  it('HR 54 triggers bradycardia warning (sev 3)', () => {
    const alerts = scoreVitals(v({ heartRate: 54 }));
    expect(alerts).toHaveLength(1);
    expect(alerts[0].message).toContain('Bradycardia');
    expect(alerts[0].severity).toBe(3);
  });
});

describe('scoreVitals — SpO2 thresholds', () => {
  it('SpO2 exactly 93 is normal (warning is strictly < 93)', () => {
    expect(scoreVitals(v({ spo2: 93 }))).toEqual([]);
  });

  it('SpO2 92 triggers a warning (sev 3), not critical', () => {
    const alerts = scoreVitals(v({ spo2: 92 }));
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({ type: 'warning', severity: 3 });
  });

  it('SpO2 exactly 90 is a warning, not yet critical (critical is strictly < 90)', () => {
    const alerts = scoreVitals(v({ spo2: 90 }));
    expect(alerts).toHaveLength(1);
    expect(alerts[0].type).toBe('warning');
  });

  it('SpO2 89 escalates to critical (sev 5) and does not also emit a warning', () => {
    const alerts = scoreVitals(v({ spo2: 89 }));
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({ type: 'critical', severity: 5 });
  });
});

describe('scoreVitals — temperature threshold', () => {
  it('temperature 100.9 does not trigger fever', () => {
    expect(scoreVitals(v({ temperature: 100.9 }))).toEqual([]);
  });

  it('temperature exactly 101.0 triggers fever warning (inclusive)', () => {
    const alerts = scoreVitals(v({ temperature: 101.0 }));
    expect(alerts).toHaveLength(1);
    expect(alerts[0].message).toContain('Fever');
    expect(alerts[0].severity).toBe(3);
  });
});

describe('scoreVitals — multiple simultaneous abnormalities', () => {
  it('emits one alert per abnormal system in BP/HR/SpO2/temp order', () => {
    const alerts = scoreVitals({
      systolic: 165, // critical BP
      diastolic: 105,
      heartRate: 120, // tachycardia
      spo2: 88, // critical SpO2
      temperature: 102, // fever
    });
    expect(alerts).toHaveLength(4);
    expect(alerts.map(a => a.severity)).toEqual([5, 3, 5, 3]);
    // verify ordering
    expect(alerts[0].message).toContain('BP');
    expect(alerts[1].message).toContain('Tachycardia');
    expect(alerts[2].message).toContain('SpO2');
    expect(alerts[3].message).toContain('Fever');
  });
});

describe('maxSeverity', () => {
  it('reports the highest severity among multiple alerts', () => {
    // tachycardia (3) + critical SpO2 (5) => 5
    expect(maxSeverity(v({ heartRate: 130, spo2: 80 }))).toBe(5);
  });

  it('reports 3 when only warnings are present', () => {
    expect(maxSeverity(v({ heartRate: 130 }))).toBe(3);
  });
});

describe('scoreVitals — edge / overflow-prone inputs', () => {
  it('handles zero across the board (zero is a critically low SpO2 and bradycardia)', () => {
    const alerts = scoreVitals({ heartRate: 0, systolic: 0, diastolic: 0, temperature: 0, spo2: 0 });
    // HR 0 -> bradycardia (3); spo2 0 -> critical (5); BP 0 -> no alert; temp 0 -> no fever
    expect(alerts.map(a => a.severity)).toEqual([3, 5]);
  });

  it('handles negative noise values without throwing', () => {
    const alerts = scoreVitals({ heartRate: -5, systolic: -10, diastolic: -10, temperature: -10, spo2: -1 });
    // HR < 55 -> brady (3); spo2 < 90 -> critical (5)
    expect(alerts.map(a => a.severity)).toEqual([3, 5]);
  });

  it('handles very large values (sustained hypertensive crisis)', () => {
    const alerts = scoreVitals(v({ systolic: 1e6, diastolic: 1e6 }));
    expect(alerts).toHaveLength(1);
    expect(alerts[0].severity).toBe(5);
  });
});
