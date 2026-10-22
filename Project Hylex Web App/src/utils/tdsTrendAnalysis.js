/**
 * tdsTrendAnalysis.js
 * 
 * Numerically stable linear regression and outlier filtering for TDS telemetry.
 * Operates on timestamped rolling history windows.
 */

/**
 * Validates and filters raw telemetry readings.
 * Rejects non-finite values, out-of-range sensor spikes, and duplicate timestamps.
 */
export function filterValidTelemetry(history, maxAgeMs = 90000) {
  if (!Array.isArray(history) || history.length === 0) return [];
  
  const now = Date.now();
  const valid = [];
  let lastTimestamp = -1;

  for (let i = 0; i < history.length; i++) {
    const pt = history[i];
    if (!pt || typeof pt !== 'object') continue;
    
    const t = Number(pt.t);
    const tds = Number(pt.tds);

    // Validate timestamp and TDS range (10 - 5000 ppm physical sensor bounds)
    if (!Number.isFinite(t) || !Number.isFinite(tds)) continue;
    if (tds < 10 || tds > 5000) continue;
    if (t <= lastTimestamp) continue; // Skip duplicate or out-of-order timestamps
    if (now - t > maxAgeMs) continue;  // Discard points older than maxAge

    valid.push({
      t,
      tds,
      tempC: Number.isFinite(Number(pt.tempC)) ? Number(pt.tempC) : 25.0,
      industrial: Number.isFinite(Number(pt.industrial)) ? Number(pt.industrial) : Math.round(tds * 82.35),
    });
    lastTimestamp = t;
  }

  return valid;
}

/**
 * Calculates Ordinary Least Squares (OLS) linear regression over a rolling window.
 * Expresses slope in ppm/second and ppm/minute.
 * Normalized relative to t0 (window start) to prevent float precision degradation.
 * 
 * @param {Array} points - Array of { t: timestamp_ms, tds: number }
 * @param {number} windowSec - Window duration in seconds (default 30s)
 */
export function calculateLinearRegression(points, windowSec = 30) {
  if (!Array.isArray(points) || points.length < 5) {
    return {
      hasEnoughData: false,
      sampleCount: points ? points.length : 0,
      slopePpmPerSec: 0,
      slopePpmPerMin: 0,
      intercept: 0,
      rSquared: 0,
      residualStdError: 0,
      windowDurationSec: 0,
      t0: 0,
      tLast: 0,
    };
  }

  const tLast = points[points.length - 1].t;
  const windowStartMs = tLast - (windowSec * 1000);
  
  // Slice points within the window
  const windowPoints = points.filter(p => p.t >= windowStartMs);
  const n = windowPoints.length;

  if (n < 5) {
    return {
      hasEnoughData: false,
      sampleCount: n,
      slopePpmPerSec: 0,
      slopePpmPerMin: 0,
      intercept: 0,
      rSquared: 0,
      residualStdError: 0,
      windowDurationSec: (tLast - windowPoints[0]?.t || 0) / 1000,
      t0: windowPoints[0]?.t || 0,
      tLast,
    };
  }

  const t0 = windowPoints[0].t;
  let sumX = 0;
  let sumY = 0;

  for (let i = 0; i < n; i++) {
    const x = (windowPoints[i].t - t0) / 1000; // time in seconds
    const y = windowPoints[i].tds;
    sumX += x;
    sumY += y;
  }

  const meanX = sumX / n;
  const meanY = sumY / n;

  let sxx = 0;
  let sxy = 0;
  let syy = 0;

  for (let i = 0; i < n; i++) {
    const x = (windowPoints[i].t - t0) / 1000;
    const y = windowPoints[i].tds;
    const dx = x - meanX;
    const dy = y - meanY;
    sxx += dx * dx;
    sxy += dx * dy;
    syy += dy * dy;
  }

  // Handle zero variance in x
  if (sxx === 0) {
    return {
      hasEnoughData: false,
      sampleCount: n,
      slopePpmPerSec: 0,
      slopePpmPerMin: 0,
      intercept: meanY,
      rSquared: 0,
      residualStdError: 0,
      windowDurationSec: (tLast - t0) / 1000,
      t0,
      tLast,
    };
  }

  const slope = sxy / sxx; // ppm per second
  const intercept = meanY - slope * meanX;

  // R-squared calculation
  let rSquared = 0;
  if (syy > 0) {
    rSquared = (sxy * sxy) / (sxx * syy);
    rSquared = Math.max(0, Math.min(1, rSquared));
  }

  // Residual Standard Error
  let residualSumSq = 0;
  for (let i = 0; i < n; i++) {
    const x = (windowPoints[i].t - t0) / 1000;
    const y = windowPoints[i].tds;
    const yPred = slope * x + intercept;
    residualSumSq += (y - yPred) * (y - yPred);
  }
  const residualStdError = n > 2 ? Math.sqrt(residualSumSq / (n - 2)) : 0;

  return {
    hasEnoughData: n >= 8,
    sampleCount: n,
    slopePpmPerSec: slope,
    slopePpmPerMin: slope * 60,
    intercept,
    rSquared,
    residualStdError,
    windowDurationSec: (tLast - t0) / 1000,
    t0,
    tLast,
    meanTds: meanY,
  };
}
