/**
 * Local, telemetry-grounded explanations for the Hylex dashboard.
 * Sensor and actuator fields describe the current prototype, not the proposed
 * full-scale design. No electrode-health or water-safety diagnosis is inferred.
 */

import { PREDICTION_STATUS } from './predictionEngine.js';
import { DIAGNOSTIC_STATUS } from './diagnosticsEngine.js';

export function buildTelemetrySnapshot(state, prediction, diagnostics) {
  const now = Date.now();
  const timestamp = state.telemetryAt ?? state.chartHistory?.at(-1)?.t ?? null;
  const freshnessSec = timestamp === null ? null : Math.max(0, (now - timestamp) / 1000);
  const sensorsReady = Boolean(state.tdsValid && state.tempValid);
  const selectedTank = state.routeClean ? 'TANK B' : 'TANK A';
  const decision = state.controlMode === 'manual'
    ? state.relay1 ? `MANUAL ROUTE → ${selectedTank}` : `PUMP OFF · ${selectedTank} GATE SELECTED`
    : !sensorsReady ? 'RECIRCULATE → TANK A (sensor check)'
      : state.routeClean ? 'TANK B reuse route' : 'RECIRCULATE → TANK A';

  return {
    timestamp: now,
    freshnessSec: freshnessSec === null ? null : Number(freshnessSec.toFixed(1)),
    isStale: freshnessSec !== null && freshnessSec > 7,
    connection: {
      mode: 'live',
      status: state.wsStatus,
      latencyMs: state.latencyMs,
      url: state.wsUrl,
    },
    sensors: {
      tdsValid: Boolean(state.tdsValid),
      tempValid: Boolean(state.tempValid),
      sensorsReady,
      // Firmware applies EC25 normalization before publishing this TDS value.
      tdsPpm: state.tdsValid ? state.tds : null,
      tds25NormalizationValid: sensorsReady,
      tempC: state.tempValid ? state.tempC : null,
      tdsAdcRaw: state.tdsAdcRaw,
      tdsVoltageMv: state.tdsVoltageMv,
      industrialEquivalentPpm: sensorsReady ? Math.round(state.tds * 82.35) : null,
    },
    controls: {
      controlMode: state.controlMode,
      routeClean: Boolean(state.routeClean),
      decision,
      servoAnglesAreCommands: true,
      servo1BackpressureDeg: state.servo1,
      servo2ChuteDeg: state.servo2,
      servo3CleanGateDeg: state.servo3,
      servo4BrineGateDeg: state.servo4,
      pumpActive: Boolean(state.relay1),
      podEcActive: Boolean(state.relay2),
      tankEcActive: Boolean(state.relay3),
      activeCarouselSlot: state.carouselSlot + 1,
      podRuntimeFillEstimatePct: state.podSaturation,
      processState: state.processState,
    },
    prediction: {
      status: prediction?.status || PREDICTION_STATUS.INSUFFICIENT_DATA,
      targetTds: prediction?.targetTds || 500,
      reductionRatePpmMin: prediction?.reductionRatePpmMin || 0,
      predictedTimeFormatted: prediction?.predictedTimeFormatted || '--',
      reliability: prediction?.reliability || 'Unreliable',
      rSquared: prediction?.rSquared || 0,
      passEstimate: prediction?.passEstimate?.reason || 'Unavailable',
    },
    diagnostics: {
      status: diagnostics?.status || DIAGNOSTIC_STATUS.IDLE,
      statusLabel: diagnostics?.statusLabel || 'Idle',
      treatmentTrend: diagnostics?.treatmentTrend || 'Standby',
      severity: diagnostics?.severity || 'info',
      message: diagnostics?.message || '',
      confidence: diagnostics?.confidence || 'Low',
      observedRatePpmMin: diagnostics?.observedReductionRatePpmMin ?? null,
    },
    uninstrumentedSensors: [
      'electrode current and cell voltage',
      'inline pH',
      'tank levels and flow volume',
      'pod mass or mineral purity',
      'servo position feedback',
    ],
  };
}

export const SUGGESTED_QUERIES = [
  'Summarize current system status',
  'Explain the recent TDS trend',
  'How does the prototype route at 500 ppm?',
  'Can this diagnose electrode fouling?',
  'Which sensors does the prototype not have?',
];

export function answerTelemetryQuery(query, snapshot) {
  const q = query.toLowerCase().trim();
  const { sensors, controls, prediction, diagnostics, connection, freshnessSec, isStale } = snapshot;
  const connected = connection.status === 'connected';
  const warning = !connected
    ? '⚠️ Telemetry is offline; values may be cleared or out of date.\n\n'
    : isStale ? `⚠️ Telemetry is stale (${freshnessSec}s since the last frame).\n\n` : '';
  const tds = sensors.tdsValid
    ? `${sensors.tdsPpm.toFixed(1)} ppm${sensors.tempValid ? ' (temperature-normalized)' : ' (using 25°C fallback; temp probe invalid)'}`
    : 'unavailable (check TDS probe)';
  const temp = sensors.tempValid ? `${sensors.tempC.toFixed(1)} °C` : 'unavailable (check DS18B20)';
  const rate = prediction.reductionRatePpmMin;
  const route = controls.decision;

  if (/foul|electrode|cathode|anode|health|scal(e|ing)/.test(q)) {
    return `${warning}**Electrode condition cannot be diagnosed from this prototype’s telemetry.**

The dashboard reports the commanded Pod EC relay (${controls.podEcActive ? 'ON' : 'OFF'}) and Tank EC relay (${controls.tankEcActive ? 'ON' : 'OFF'}), plus the observed TDS trend (${diagnostics.observedRatePpmMin === null ? 'not available' : `${diagnostics.observedRatePpmMin.toFixed(1)} ppm/min`}). A TDS trend does not prove electrode fouling or treatment efficiency. The prototype has no cell-current, cell-voltage, or pH sensor. Inspect the electrodes directly and use suitable instruments to assess them.`;
  }

  if (/predict|time|countdown|pass|reliab/.test(q)) {
    return `${warning}**TDS trend projection:** ${prediction.predictedTimeFormatted} to the configured ${prediction.targetTds} ppm target; reliability ${prediction.reliability} (R² ${(prediction.rSquared * 100).toFixed(1)}%).

This is a short-window trend estimate, not a validated process-performance result. A pass count cannot be measured because the prototype has no flow totalizer.`;
  }

  if (/limit|sensor|missing|hardware|uninstrumented/.test(q)) {
    return `${warning}**Prototype instrumentation:** The ESP32 reads a Gravity analog TDS probe on GPIO 34 and a DS18B20 temperature probe on GPIO 4. It reports the averaged ADC count and millivolts, commanded servo angles, two relay states, and estimated carousel runtime load.

The current prototype does not report electrode current or cell voltage, pH, tank levels, flow volume, pod mass/purity, or servo position feedback. Those measurements are needed to substantiate efficiency, mineral yield, actual tank volume, and electrode condition.`;
  }

  if (/500|target|threshold|route|valve|reuse/.test(q)) {
    return `${warning}**Routing rule:** ${sensors.sensorsReady
      ? `with valid TDS and temperature probes, the ESP32 routes readings at or below 500 ppm to Tank B; higher readings recirculate to Tank A. Current gate state: ${route}.`
      : `the ESP32 keeps the water on the Tank A recirculation path because a required sensor is invalid. TDS: ${tds}; temperature: ${temp}.`}

The 500 ppm value is this prototype’s reuse target. TDS alone does not certify drinking-water safety or regulatory compliance.`;
  }

  if (/trend|reduction|rate|tds|salinity|kinetic/.test(q)) {
    const trend = prediction.status === PREDICTION_STATUS.INSUFFICIENT_DATA
      ? 'There are not enough recent valid samples for a trend estimate.'
      : `The recent fitted TDS slope is ${rate.toFixed(1)} ppm/min (R² ${(prediction.rSquared * 100).toFixed(1)}%). This describes the observed signal; it does not establish which treatment mechanism caused the change.`;
    return `${warning}**Current TDS:** ${tds}. **Water temperature:** ${temp}.

${trend}

The ESP32 applies its 25°C normalization once when the DS18B20 is valid; with an invalid temperature probe it uses a 25°C fallback and locks automatic routing. The dashboard does not apply a second correction.`;
  }

  if (/summary|status|overview|state/.test(q)) {
    return `${warning}**Project Hylex status**

- TDS: ${tds}; temperature: ${temp}.
- Process state: ${controls.processState}; pump relay: ${controls.pumpActive ? 'ON' : 'OFF'}.
- Pod EC relay: ${controls.podEcActive ? 'ON' : 'OFF'}; Tank EC relay: ${controls.tankEcActive ? 'ON' : 'OFF'}.
- Routing: ${route}.
- Servo values are commanded angles, not measured position feedback.
- Carousel: pod #${controls.activeCarouselSlot}; runtime-based fill estimate ${controls.podRuntimeFillEstimatePct[controls.activeCarouselSlot - 1]?.toFixed(0) ?? '--'}%.
- Trend projection: ${prediction.predictedTimeFormatted} (${prediction.reliability} reliability).`;
  }

  return `${warning}**Hylex telemetry summary:** TDS ${tds}; temperature ${temp}; routing ${route}; observed trend ${rate.toFixed(1)} ppm/min.

The web assistant is read-only. The optional local Ollama controller is a separate feature that can send backpressure commands when enabled and active.`;
}
