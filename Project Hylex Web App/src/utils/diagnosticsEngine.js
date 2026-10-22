/**
 * diagnosticsEngine.js
 * 
 * Evidence-based performance and electrode diagnostics for Project Hylex.
 * Evaluates TDS reduction kinetics during active treatment periods.
 * Strictly adheres to empirical boundaries (no fabricated current/efficiency percentages).
 */

import { filterValidTelemetry, calculateLinearRegression } from './tdsTrendAnalysis.js';

export const DIAGNOSTIC_STATUS = {
  IDLE: 'IDLE',
  INSUFFICIENT_DATA: 'INSUFFICIENT_DATA',
  NORMAL: 'NORMAL',
  REDUCED_PERFORMANCE: 'REDUCED_PERFORMANCE',
  POSSIBLE_FOULING: 'POSSIBLE_FOULING',
};

export const DIAGNOSTIC_SEVERITY = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ALERT: 'alert',
};

// Calibrated empirical baseline for active Hylex treatment (ppm/min reduction)
// Under normal 12V pump circulation + active electro-coagulation
const NOMINAL_BASELINE_RATE_PPM_MIN = 18.0;

/**
 * Evaluates treatment kinetics and electrode health indicators from state.
 * 
 * @param {Object} state - Telemetry state containing chartHistory, relays, etc.
 * @param {Object} previousDiagnostics - Previous diagnostic evaluation for hysteresis
 */
export function evaluateElectrodeDiagnostics(state, previousDiagnostics = null) {
  const { chartHistory, relay1, relay2, relay3, tempC } = state;
  const isPumpActive = Boolean(relay1);
  const isPodActive = Boolean(relay2);
  const isTankActive = Boolean(relay3);
  const isElectrodeEnergized = isPodActive || isTankActive;
  const isTreatmentActive = isPumpActive && isElectrodeEnergized;

  // 1. Idle state check
  if (!isTreatmentActive) {
    let idleReason = 'Treatment circuits inactive';
    if (!isPumpActive && !isElectrodeEnergized) {
      idleReason = 'Pump (Ch1) and Electrodes (Ch2/Ch3) are powered off';
    } else if (!isPumpActive) {
      idleReason = 'Circulation pump (Ch1) is off; fluid is static';
    } else {
      idleReason = 'Electrode relays (Ch2 Pod EC / Ch3 Tank EC) are powered off';
    }

    return {
      status: DIAGNOSTIC_STATUS.IDLE,
      statusLabel: 'Circuits Idle',
      treatmentTrend: 'Idle / Standby',
      severity: DIAGNOSTIC_SEVERITY.INFO,
      message: idleReason,
      isTreatmentActive: false,
      observedReductionRatePpmMin: 0,
      baselineRatePpmMin: NOMINAL_BASELINE_RATE_PPM_MIN,
      performanceRatio: 0,
      confidence: 'Low (Circuits De-energized)',
      availableEvidence: [
        { name: 'Pump Relay (Ch1)', value: isPumpActive ? 'ACTIVE' : 'OFF', state: isPumpActive ? 'ok' : 'idle' },
        { name: 'Pod EC Relay (Ch2)', value: isPodActive ? '+12V ACTIVE' : 'OFF', state: isPodActive ? 'ok' : 'idle' },
        { name: 'Tank EC Relay (Ch3)', value: isTankActive ? '+12V ACTIVE' : 'OFF', state: isTankActive ? 'ok' : 'idle' },
        { name: 'Thermal Compensated', value: `${(tempC || 25).toFixed(1)}°C (DS18B20)`, state: 'ok' },
      ],
      missingSensors: [
        { name: 'Electrode Shunt Current (Amps)', note: 'Not instrumented in hardware' },
        { name: 'Cell Voltage Drop (V)', note: 'Not instrumented in hardware' },
        { name: 'Inline pH Electrode', note: 'Not instrumented in hardware' },
      ],
      recommendations: [
        'Energize Ch1 (Pump) and Ch2 (Pod EC) to commence treatment monitoring.',
      ],
      evaluationCount: 0,
    };
  }

  // 2. Filter valid points during treatment
  const validPoints = filterValidTelemetry(chartHistory, 90000);

  if (validPoints.length < 8) {
    return {
      status: DIAGNOSTIC_STATUS.INSUFFICIENT_DATA,
      statusLabel: 'Accumulating Baseline',
      treatmentTrend: 'Baseline Sampling',
      severity: DIAGNOSTIC_SEVERITY.INFO,
      message: `Sampling active treatment telemetry (${validPoints.length}/8 required readings)...`,
      isTreatmentActive: true,
      observedReductionRatePpmMin: 0,
      baselineRatePpmMin: NOMINAL_BASELINE_RATE_PPM_MIN,
      performanceRatio: 0,
      confidence: 'Low (Insufficient Samples)',
      availableEvidence: [
        { name: 'Pump Circulation', value: '240–400 L/hr', state: 'ok' },
        { name: 'Active Electrodes', value: isPodActive && isTankActive ? 'Ch2 + Ch3' : (isPodActive ? 'Ch2 Pod EC' : 'Ch3 Tank EC'), state: 'ok' },
        { name: 'Sample Window', value: `${validPoints.length} points`, state: 'warn' },
      ],
      missingSensors: [
        { name: 'Direct Current Ammeter', note: 'Uninstrumented in ESP32 circuit' },
        { name: 'Electrochemical Impedance', note: 'Uninstrumented' },
      ],
      recommendations: [
        'Allow 15–30 seconds of continuous flow to establish regression baseline.',
      ],
      evaluationCount: (previousDiagnostics?.evaluationCount || 0) + 1,
    };
  }

  // 3. Compute empirical reduction slope
  const regression = calculateLinearRegression(validPoints, 35);
  // Negative slope = reduction. Rate = -slope * 60 (positive number means active reduction)
  const reductionRatePpmMin = -regression.slopePpmPerMin;
  const performanceRatio = reductionRatePpmMin / NOMINAL_BASELINE_RATE_PPM_MIN;

  let candidateStatus = DIAGNOSTIC_STATUS.NORMAL;
  let severity = DIAGNOSTIC_SEVERITY.SUCCESS;
  let treatmentTrend = 'Stable';
  let message = '';
  let confidence = 'Moderate';
  let recommendations = [];

  if (reductionRatePpmMin >= NOMINAL_BASELINE_RATE_PPM_MIN * 0.70) {
    candidateStatus = DIAGNOSTIC_STATUS.NORMAL;
    severity = DIAGNOSTIC_SEVERITY.SUCCESS;
    treatmentTrend = 'Stable';
    message = `Observed reduction rate (${reductionRatePpmMin.toFixed(1)} ppm/min) is within expected nominal range (${(performanceRatio * 100).toFixed(0)}% of baseline).`;
    confidence = regression.rSquared >= 0.70 ? 'High' : 'Moderate';
    recommendations = [
      'Operating nominally. Continue automated AI recirculation cycle.',
    ];
  } else if (reductionRatePpmMin >= NOMINAL_BASELINE_RATE_PPM_MIN * 0.25) {
    candidateStatus = DIAGNOSTIC_STATUS.REDUCED_PERFORMANCE;
    severity = DIAGNOSTIC_SEVERITY.WARNING;
    treatmentTrend = 'Reduced Performance';
    message = `Observed treatment rate (${reductionRatePpmMin.toFixed(1)} ppm/min) is ${((1 - performanceRatio) * 100).toFixed(0)}% below expected baseline.`;
    confidence = 'Moderate';
    recommendations = [
      'Inspect physical backpressure servo setting to verify vortex fluid retention.',
      'Check if initial raw brine salinity has already plateaued.',
      'Direct ammeter measurement recommended to verify cathode wire mesh conductivity.',
    ];
  } else {
    // Negligible or negative reduction despite active pump & electrodes
    candidateStatus = DIAGNOSTIC_STATUS.POSSIBLE_FOULING;
    severity = DIAGNOSTIC_SEVERITY.ALERT;
    treatmentTrend = 'Possible Degradation / Scaling';
    message = `Net salinity reduction has stalled (${reductionRatePpmMin.toFixed(1)} ppm/min) during active electro-crystallisation. Surface scaling or passivation on graphite/stainless mesh is possible.`;
    confidence = 'Moderate (TDS Kinetics only)';
    recommendations = [
      'Perform visual inspection of Pod #' + ((state.carouselSlot || 0) + 1) + ' graphite anode and woven cathode mesh.',
      'Consider indexing carousel turret (+120°) to introduce a fresh honeycomb pod.',
      'Note: Current sensors are unavailable; inspect physical electrodes before cleaning.',
    ];
  }

  // 4. Apply hysteresis to prevent diagnostic alert flickering
  let finalStatus = candidateStatus;
  let evalCount = (previousDiagnostics?.evaluationCount || 0) + 1;

  if (previousDiagnostics && previousDiagnostics.status !== candidateStatus) {
    // Require 3 consecutive confirming cycles (~3-5s) before transitioning to ALERT or from ALERT
    if ((previousDiagnostics._pendingStatus === candidateStatus) && (previousDiagnostics._pendingCount >= 3)) {
      finalStatus = candidateStatus;
    } else {
      finalStatus = previousDiagnostics.status;
    }
  }

  return {
    status: finalStatus,
    statusLabel: finalStatus === DIAGNOSTIC_STATUS.NORMAL ? 'Electrodes Healthy' :
                 finalStatus === DIAGNOSTIC_STATUS.REDUCED_PERFORMANCE ? 'Performance Reduced' :
                 'Passivation / Scaling Possible',
    treatmentTrend,
    severity,
    message,
    isTreatmentActive: true,
    observedReductionRatePpmMin: reductionRatePpmMin,
    baselineRatePpmMin: NOMINAL_BASELINE_RATE_PPM_MIN,
    performanceRatio: Math.max(0, performanceRatio),
    confidence,
    rSquared: regression.rSquared,
    availableEvidence: [
      { name: 'Observed Rate', value: `${reductionRatePpmMin.toFixed(1)} ppm/min`, state: reductionRatePpmMin > 10 ? 'ok' : 'warn' },
      { name: 'Nominal Baseline', value: `${NOMINAL_BASELINE_RATE_PPM_MIN} ppm/min`, state: 'ok' },
      { name: '12V Pump Status', value: isPumpActive ? 'RUNNING' : 'STOPPED', state: isPumpActive ? 'ok' : 'alert' },
      { name: 'Pod EC (+12V Anode)', value: isPodActive ? 'ENERGIZED' : 'OFF', state: isPodActive ? 'ok' : 'idle' },
      { name: 'Tank EC Catalyst', value: isTankActive ? 'ENERGIZED' : 'OFF', state: isTankActive ? 'ok' : 'idle' },
      { name: 'Thermal Drift Corrected', value: `${(tempC || 25).toFixed(1)}°C (DS18B20)`, state: 'ok' },
    ],
    missingSensors: [
      { name: 'Electrode Shunt Current (Amps)', note: 'Not instrumented in hardware (cannot measure direct mA/cm²)' },
      { name: 'Cell Voltage Drop (V)', note: 'Not instrumented in hardware' },
      { name: 'Inline pH Probe', note: 'Not instrumented in hardware' },
    ],
    recommendations,
    evaluationCount: evalCount,
    _pendingStatus: candidateStatus,
    _pendingCount: (previousDiagnostics?._pendingStatus === candidateStatus)
      ? (previousDiagnostics?._pendingCount || 0) + 1
      : 1,
  };
}
