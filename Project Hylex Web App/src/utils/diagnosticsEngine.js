/**
 * Diagnostics from instrumented Hylex telemetry only.
 * TDS trend can describe water quality movement; it cannot prove electrode
 * health, fouling, mineral mass, or treatment efficiency without more sensors.
 */
import { filterValidTelemetry, calculateLinearRegression } from './tdsTrendAnalysis.js';

export const DIAGNOSTIC_STATUS = {
  IDLE: 'IDLE',
  PRETREATMENT: 'PRETREATMENT',
  SENSOR_CHECK: 'SENSOR_CHECK',
  INSUFFICIENT_DATA: 'INSUFFICIENT_DATA',
  TDS_DECREASING: 'TDS_DECREASING',
  TDS_STABLE: 'TDS_STABLE',
  TDS_INCREASING: 'TDS_INCREASING',
};

export const DIAGNOSTIC_SEVERITY = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ALERT: 'alert',
};

const NO_UNINSTRUMENTED_DIAGNOSIS = [
  { name: 'Electrode current', note: 'No current shunt is installed' },
  { name: 'Electrode voltage', note: 'Cell voltage is not measured' },
  { name: 'Water pH', note: 'No inline pH probe is installed' },
  { name: 'Mineral mass', note: 'Pod fill is a runtime estimate; no load cell is installed' },
  { name: 'Water volume', note: 'No flow totalizer is installed' },
];

function result(status, statusLabel, treatmentTrend, severity, message, evidence, recommendations, rate = 0, rSquared = null) {
  return {
    status,
    statusLabel,
    treatmentTrend,
    severity,
    message,
    isTreatmentActive: status === DIAGNOSTIC_STATUS.TDS_DECREASING ||
      status === DIAGNOSTIC_STATUS.TDS_STABLE || status === DIAGNOSTIC_STATUS.TDS_INCREASING,
    observedReductionRatePpmMin: rate,
    baselineRatePpmMin: null,
    performanceRatio: null,
    confidence: rSquared === null ? 'Unavailable' : `Trend fit R² ${(rSquared * 100).toFixed(0)}%`,
    rSquared,
    availableEvidence: evidence,
    missingSensors: NO_UNINSTRUMENTED_DIAGNOSIS,
    recommendations,
  };
}

export function evaluateTdsTrendDiagnostics(state) {
  const { relay1, relay2, relay3, tempC, tempValid, tdsValid, chartHistory, processState } = state;
  const isPumpActive = Boolean(relay1);
  const isPodElectrodesActive = Boolean(relay2);
  const isTankElectrodesActive = Boolean(relay3);
  const evidence = [
    { name: 'Pump relay (Ch1)', value: isPumpActive ? 'ON' : 'OFF', state: isPumpActive ? 'ok' : 'idle' },
    { name: 'Pod EC relay (Ch2)', value: isPodElectrodesActive ? 'ON' : 'OFF', state: isPodElectrodesActive ? 'ok' : 'idle' },
    { name: 'Tank EC relay (Ch3)', value: isTankElectrodesActive ? 'ON' : 'OFF', state: isTankElectrodesActive ? 'ok' : 'idle' },
    { name: 'TDS probe', value: tdsValid ? 'VALID' : 'CHECK', state: tdsValid ? 'ok' : 'alert' },
    { name: 'DS18B20', value: tempValid ? `${tempC.toFixed(1)}°C` : 'CHECK', state: tempValid ? 'ok' : 'warn' },
  ];

  if (!tdsValid || !tempValid) {
    return result(
      DIAGNOSTIC_STATUS.SENSOR_CHECK,
      'Sensor Check',
      'Trend unavailable',
      DIAGNOSTIC_SEVERITY.ALERT,
      !tdsValid
        ? 'The ESP32 has marked the TDS input invalid. Trend and routing conclusions are withheld until the probe signal is valid.'
        : 'The temperature probe is invalid. Temperature-normalized TDS, trend, and clean-water routing are withheld until it is valid.',
      evidence,
      !tdsValid
        ? ['Check the TDS module supply, shared ground, and analog output on ESP32 GPIO 34.']
        : ['Check the DS18B20 wiring and the required 4.7 kΩ pull-up between data and 3.3 V.'],
    );
  }

  if (processState === 2) {
    return result(
      DIAGNOSTIC_STATUS.PRETREATMENT,
      'Pre-treatment',
      'Electro-coagulation active',
      DIAGNOSTIC_SEVERITY.INFO,
      'Tank A electrode relay is active during the 30-second pre-treatment stage. Water is not circulating yet, so this is not a TDS reduction test.',
      evidence,
      ['Allow the pre-treatment timer to finish before interpreting the TDS trend.'],
    );
  }

  if (processState !== 3 || !isPumpActive) {
    return result(
      DIAGNOSTIC_STATUS.IDLE,
      'Trend Monitoring Idle',
      processState === 4 ? 'Carousel indexing' : 'Waiting for active separation',
      DIAGNOSTIC_SEVERITY.INFO,
      'TDS trend diagnostics run during active separation while the circulation pump is on.',
      evidence,
      ['Start the treatment process to collect an active-separation trend.'],
    );
  }

  const startedAt = state.processStateChangedAt || 0;
  const treatmentHistory = (chartHistory || []).filter(point => point.t >= startedAt);
  const validPoints = filterValidTelemetry(treatmentHistory, 90000);
  const regression = calculateLinearRegression(validPoints, 35);
  if (!regression.hasEnoughData) {
    return result(
      DIAGNOSTIC_STATUS.INSUFFICIENT_DATA,
      'Collecting TDS Trend',
      'Baseline sampling',
      DIAGNOSTIC_SEVERITY.INFO,
      `Collecting valid active-treatment readings (${regression.sampleCount}/8 needed for a trend estimate).`,
      [...evidence, { name: 'Active samples', value: `${regression.sampleCount}/8`, state: 'warn' }],
      ['Keep the process running and wait for a usable telemetry window.'],
    );
  }

  // Positive rate means TDS is falling; negative means it is rising.
  const reductionRate = -regression.slopePpmPerMin;
  if (reductionRate > 3) {
    return result(
      DIAGNOSTIC_STATUS.TDS_DECREASING,
      'TDS Decreasing',
      'Observed decrease',
      DIAGNOSTIC_SEVERITY.SUCCESS,
      `Measured TDS is decreasing at ${reductionRate.toFixed(1)} ppm/min over the current regression window. This trend alone does not identify which treatment mechanism caused the change.`,
      [...evidence, { name: 'TDS reduction rate', value: `${reductionRate.toFixed(1)} ppm/min`, state: 'ok' }],
      ['Continue monitoring outlet TDS and confirm Tank B quality with an independent meter.'],
      reductionRate,
      regression.rSquared,
    );
  }
  if (reductionRate < -3) {
    return result(
      DIAGNOSTIC_STATUS.TDS_INCREASING,
      'TDS Increasing',
      'Observed increase',
      DIAGNOSTIC_SEVERITY.WARNING,
      `Measured TDS is increasing at ${Math.abs(reductionRate).toFixed(1)} ppm/min. Check sampling location, mixing, and probe calibration before attributing the change to treatment performance.`,
      [...evidence, { name: 'TDS change rate', value: `${reductionRate.toFixed(1)} ppm/min`, state: 'warn' }],
      ['Verify the probe in a calibration solution and confirm that the sample cup is well mixed.'],
      reductionRate,
      regression.rSquared,
    );
  }
  return result(
    DIAGNOSTIC_STATUS.TDS_STABLE,
    'TDS Stable',
    'No clear change',
    DIAGNOSTIC_SEVERITY.INFO,
    `No clear TDS movement is visible in the current window (${reductionRate.toFixed(1)} ppm/min). This is not an electrode-health diagnosis.`,
    [...evidence, { name: 'TDS change rate', value: `${reductionRate.toFixed(1)} ppm/min`, state: 'idle' }],
    ['Check circulation and probe calibration; use current and pH instrumentation to assess electrode performance.'],
    reductionRate,
    regression.rSquared,
  );
}
