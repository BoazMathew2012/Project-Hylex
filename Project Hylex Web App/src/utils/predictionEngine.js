/**
 * predictionEngine.js
 * 
 * Predicts time-to-target for TDS reduction using empirical linear regression.
 * Provides transparent reliability metrics and honest boundary states.
 */

import { filterValidTelemetry, calculateLinearRegression } from './tdsTrendAnalysis.js';

export const PREDICTION_STATUS = {
  TARGET_MET: 'TARGET_MET',
  PREDICTED: 'PREDICTED',
  NOT_PREDICTING_FLAT: 'NOT_PREDICTING_FLAT',
  NOT_PREDICTING_RISING: 'NOT_PREDICTING_RISING',
  INSUFFICIENT_DATA: 'INSUFFICIENT_DATA',
  STALE_TELEMETRY: 'STALE_TELEMETRY',
  EXTENDED_DURATION: 'EXTENDED_DURATION',
};

export const RELIABILITY_LEVEL = {
  HIGH: 'High',
  MODERATE: 'Moderate',
  LOW: 'Low',
  UNRELIABLE: 'Unreliable / Insufficient',
};

/**
 * Evaluates prediction reliability based on sample size, R^2, and residual variance.
 */
function evaluateReliability(regression, currentTds, targetTds) {
  if (!regression.hasEnoughData) return RELIABILITY_LEVEL.UNRELIABLE;

  const { rSquared, sampleCount, residualStdError } = regression;
  const delta = Math.abs(currentTds - targetTds);
  const relativeNoise = delta > 0 ? (residualStdError / delta) : 1;

  if (rSquared >= 0.80 && sampleCount >= 15 && relativeNoise < 0.25) {
    return RELIABILITY_LEVEL.HIGH;
  }
  if (rSquared >= 0.55 && sampleCount >= 8 && relativeNoise < 0.50) {
    return RELIABILITY_LEVEL.MODERATE;
  }
  return RELIABILITY_LEVEL.LOW;
}

/**
 * Predicts time-to-target and pass boundaries from raw telemetry history.
 * 
 * @param {Array} history - Raw chartHistory points [{ t, tds, tempC }]
 * @param {number} targetTds - Configured target TDS (default 500 ppm)
 * @param {number} windowSec - Regression analysis window (default 30s)
 */
export function predictTimeToTarget(history, targetTds = 500, windowSec = 30) {
  const validPoints = filterValidTelemetry(history, 120000);
  const target = Number.isFinite(targetTds) ? Math.max(50, Math.min(1000, targetTds)) : 500;

  if (validPoints.length === 0) {
    return {
      status: PREDICTION_STATUS.INSUFFICIENT_DATA,
      statusMessage: 'No valid telemetry available',
      currentTds: 0,
      targetTds: target,
      reductionRatePpmMin: 0,
      reductionRatePpmSec: 0,
      predictedSeconds: null,
      predictedTimeFormatted: '--',
      predictedCompletionTimestamp: null,
      reliability: RELIABILITY_LEVEL.UNRELIABLE,
      rSquared: 0,
      sampleCount: 0,
      passEstimate: {
        available: false,
        value: null,
        reason: 'Pass estimate unavailable: System operates on continuous closed-loop recirculation; discrete per-pass flow volumes are uninstrumented.',
      },
      projectionPoints: [],
    };
  }

  const lastPoint = validPoints[validPoints.length - 1];
  const currentTds = lastPoint.tds;
  const now = Date.now();
  const isStale = (now - lastPoint.t) > 7000;

  if (isStale) {
    return {
      status: PREDICTION_STATUS.STALE_TELEMETRY,
      statusMessage: 'Telemetry is stale (> 7s without live packet)',
      currentTds,
      targetTds: target,
      reductionRatePpmMin: 0,
      reductionRatePpmSec: 0,
      predictedSeconds: null,
      predictedTimeFormatted: 'Stale Telemetry',
      predictedCompletionTimestamp: null,
      reliability: RELIABILITY_LEVEL.UNRELIABLE,
      rSquared: 0,
      sampleCount: validPoints.length,
      passEstimate: {
        available: false,
        value: null,
        reason: 'Telemetry is stale',
      },
      projectionPoints: [],
    };
  }

  // Check if target is already achieved
  if (currentTds <= target) {
    return {
      status: PREDICTION_STATUS.TARGET_MET,
      statusMessage: `Target achieved (${currentTds.toFixed(1)} ppm <= ${target} ppm)`,
      currentTds,
      targetTds: target,
      reductionRatePpmMin: 0,
      reductionRatePpmSec: 0,
      predictedSeconds: 0,
      predictedTimeFormatted: 'Target Achieved',
      predictedCompletionTimestamp: lastPoint.t,
      reliability: RELIABILITY_LEVEL.HIGH,
      rSquared: 1,
      sampleCount: validPoints.length,
      passEstimate: {
        available: false,
        value: 0,
        reason: 'Current water already meets or exceeds target threshold.',
      },
      projectionPoints: [],
    };
  }

  // Calculate linear regression over window
  const regression = calculateLinearRegression(validPoints, windowSec);

  if (!regression.hasEnoughData) {
    return {
      status: PREDICTION_STATUS.INSUFFICIENT_DATA,
      statusMessage: `Insufficient trend history (${regression.sampleCount}/8 required points in ${windowSec}s window)`,
      currentTds,
      targetTds: target,
      reductionRatePpmMin: 0,
      reductionRatePpmSec: 0,
      predictedSeconds: null,
      predictedTimeFormatted: 'Accumulating data...',
      predictedCompletionTimestamp: null,
      reliability: RELIABILITY_LEVEL.UNRELIABLE,
      rSquared: regression.rSquared,
      sampleCount: regression.sampleCount,
      passEstimate: {
        available: false,
        value: null,
        reason: 'Pass estimate unavailable: Insufficient operational trend data.',
      },
      projectionPoints: [],
    };
  }

  const slopeSec = regression.slopePpmPerSec;
  const slopeMin = regression.slopePpmPerMin;
  const reliability = evaluateReliability(regression, currentTds, target);

  // Check trend direction: slope must be meaningfully negative (< -0.05 ppm/sec or -3 ppm/min)
  if (slopeSec >= 0.05) {
    return {
      status: PREDICTION_STATUS.NOT_PREDICTING_RISING,
      statusMessage: 'TDS trend is currently increasing (+ ' + slopeMin.toFixed(1) + ' ppm/min)',
      currentTds,
      targetTds: target,
      reductionRatePpmMin: slopeMin,
      reductionRatePpmSec: slopeSec,
      predictedSeconds: null,
      predictedTimeFormatted: 'Trend Increasing',
      predictedCompletionTimestamp: null,
      reliability,
      rSquared: regression.rSquared,
      sampleCount: regression.sampleCount,
      passEstimate: {
        available: false,
        value: null,
        reason: 'Salinity is currently trending upward; target cannot be reached without treatment reversal.',
      },
      projectionPoints: [],
    };
  }

  if (slopeSec > -0.05 && slopeSec < 0.05) {
    return {
      status: PREDICTION_STATUS.NOT_PREDICTING_FLAT,
      statusMessage: 'TDS trend is flat (' + (slopeMin >= 0 ? '+' : '') + slopeMin.toFixed(1) + ' ppm/min)',
      currentTds,
      targetTds: target,
      reductionRatePpmMin: slopeMin,
      reductionRatePpmSec: slopeSec,
      predictedSeconds: null,
      predictedTimeFormatted: 'Trend Flat / Stable',
      predictedCompletionTimestamp: null,
      reliability,
      rSquared: regression.rSquared,
      sampleCount: regression.sampleCount,
      passEstimate: {
        available: false,
        value: null,
        reason: 'Net reduction is negligible; pass count cannot be estimated from static telemetry.',
      },
      projectionPoints: [],
    };
  }

  // Active negative slope: calculate remaining seconds
  const deltaTds = currentTds - target;
  const predictedSec = Math.round(deltaTds / (-slopeSec));

  if (predictedSec > 7200) {
    return {
      status: PREDICTION_STATUS.EXTENDED_DURATION,
      statusMessage: 'Projected duration exceeds 2 hours at current reduction rate',
      currentTds,
      targetTds: target,
      reductionRatePpmMin: slopeMin,
      reductionRatePpmSec: slopeSec,
      predictedSeconds: predictedSec,
      predictedTimeFormatted: '> 2 hours',
      predictedCompletionTimestamp: lastPoint.t + predictedSec * 1000,
      reliability,
      rSquared: regression.rSquared,
      sampleCount: regression.sampleCount,
      passEstimate: {
        available: false,
        value: null,
        reason: 'Pass estimate unavailable: Extended duration exceeds calibrated single-batch limits.',
      },
      projectionPoints: [],
    };
  }

  // Format predicted time human-readably
  let formattedTime = '';
  if (predictedSec < 60) {
    formattedTime = `approx. ${predictedSec}s`;
  } else {
    const mins = Math.floor(predictedSec / 60);
    const secs = predictedSec % 60;
    formattedTime = secs > 0 ? `approx. ${mins}m ${secs}s` : `approx. ${mins}m`;
  }

  // Generate projection line points for chart extrapolation (from current point to target)
  const projectionPoints = [];
  if (reliability === RELIABILITY_LEVEL.HIGH || reliability === RELIABILITY_LEVEL.MODERATE) {
    const startT = lastPoint.t;
    const endT = startT + predictedSec * 1000;
    const steps = 6;
    for (let i = 0; i <= steps; i++) {
      const frac = i / steps;
      const t = startT + frac * (endT - startT);
      const projTds = currentTds - frac * deltaTds;
      projectionPoints.push({
        t,
        tds: Math.round(projTds * 10) / 10,
        isExtrapolated: true,
      });
    }
  }

  return {
    status: PREDICTION_STATUS.PREDICTED,
    statusMessage: `Estimated time to ${target} ppm: ${formattedTime} (${Math.abs(slopeMin).toFixed(1)} ppm/min reduction)`,
    currentTds,
    targetTds: target,
    reductionRatePpmMin: slopeMin,
    reductionRatePpmSec: slopeSec,
    predictedSeconds: predictedSec,
    predictedTimeFormatted: formattedTime,
    predictedCompletionTimestamp: lastPoint.t + predictedSec * 1000,
    reliability,
    rSquared: regression.rSquared,
    sampleCount: regression.sampleCount,
    passEstimate: {
      available: false,
      value: null,
      reason: 'Pass estimate unavailable: Hylex operates as a continuous recirculation loop. Discrete per-pass modeling requires dedicated flow totalizers or calibrated batch retention vessels (currently uninstrumented in hardware).',
    },
    projectionPoints,
  };
}

export const evaluateTdsPrediction = predictTimeToTarget;

