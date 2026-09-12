// Pure clinical-scoring logic for vitals readings.
//
// This module is the "critical math" path for HealthGuard: it maps raw vital
// signs to alerts with a clinical severity score. It is intentionally free of
// any I/O (no DB, no network) so it can be unit-tested in isolation and reused
// by the POST /api/patients/[id]/vitals route handler.

export interface VitalsInput {
  heartRate: number;
  systolic: number;
  diastolic: number;
  temperature: number; // degrees Fahrenheit
  spo2: number; // percent
}

export type AlertType = 'critical' | 'warning';
export type AlertCategory = 'vitals';

export interface VitalsAlert {
  type: AlertType;
  category: AlertCategory;
  message: string;
  severity: number; // 1..5, higher is more severe
}

/**
 * Classify a single vitals reading into zero or more alerts.
 *
 * Threshold semantics (inclusive/exclusive matters for regressions):
 *   Blood pressure (evaluated as a single condition, critical takes precedence):
 *     - critical (sev 5): systolic >= 160 OR diastolic >= 100
 *     - warning  (sev 3): systolic >= 140 OR diastolic >= 90  (and not critical)
 *   Heart rate (mutually exclusive tachy/brady):
 *     - warning (sev 3): heartRate > 110 (tachycardia)
 *     - warning (sev 3): heartRate < 55  (bradycardia)
 *   SpO2 (critical takes precedence over warning):
 *     - critical (sev 5): spo2 < 90
 *     - warning  (sev 3): spo2 < 93 (and not critical)
 *   Temperature:
 *     - warning (sev 3): temperature >= 101.0 (fever)
 *
 * The order of alerts in the returned array is: BP, HR, SpO2, temperature.
 */
export function scoreVitals(v: VitalsInput): VitalsAlert[] {
  const alerts: VitalsAlert[] = [];

  // Blood pressure
  if (v.systolic >= 160 || v.diastolic >= 100) {
    alerts.push({
      type: 'critical',
      category: 'vitals',
      message: `Severely elevated BP detected: ${v.systolic}/${v.diastolic} mmHg. Hypertensive crisis possible. Immediate physician review required.`,
      severity: 5,
    });
  } else if (v.systolic >= 140 || v.diastolic >= 90) {
    alerts.push({
      type: 'warning',
      category: 'vitals',
      message: `Elevated BP reading: ${v.systolic}/${v.diastolic} mmHg. Consider medication review.`,
      severity: 3,
    });
  }

  // Heart rate
  if (v.heartRate > 110) {
    alerts.push({
      type: 'warning',
      category: 'vitals',
      message: `Tachycardia detected: ${v.heartRate} bpm. Evaluate for underlying cause.`,
      severity: 3,
    });
  } else if (v.heartRate < 55) {
    alerts.push({
      type: 'warning',
      category: 'vitals',
      message: `Bradycardia detected: ${v.heartRate} bpm. Assess for symptoms.`,
      severity: 3,
    });
  }

  // SpO2
  if (v.spo2 < 90) {
    alerts.push({
      type: 'critical',
      category: 'vitals',
      message: `Critically low SpO2: ${v.spo2}%. Immediate intervention needed.`,
      severity: 5,
    });
  } else if (v.spo2 < 93) {
    alerts.push({
      type: 'warning',
      category: 'vitals',
      message: `Low SpO2 reading: ${v.spo2}%. Monitor closely.`,
      severity: 3,
    });
  }

  // Temperature
  if (v.temperature >= 101.0) {
    alerts.push({
      type: 'warning',
      category: 'vitals',
      message: `Fever detected: ${v.temperature}°F. Evaluate for infection.`,
      severity: 3,
    });
  }

  return alerts;
}

/**
 * Highest severity across all generated alerts (0 if none). Useful for
 * triage / ranking. Pure aggregation over scoreVitals.
 */
export function maxSeverity(v: VitalsInput): number {
  return scoreVitals(v).reduce((max, a) => Math.max(max, a.severity), 0);
}
