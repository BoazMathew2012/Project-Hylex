/**
 * copilotEngine.js
 * 
 * Interactive engineering assistant and telemetry analyst for Project Hylex.
 * Produces deterministic, telemetry-grounded operational explanations,
 * diagnostic interpretations, and cautious advisory observations.
 * Works 100% locally with zero external API dependencies or costs.
 */

import { PREDICTION_STATUS } from './predictionEngine.js';
import { DIAGNOSTIC_STATUS } from './diagnosticsEngine.js';

/**
 * Builds a compact, structured snapshot of current application telemetry and analysis.
 */
export function buildTelemetrySnapshot(state, prediction, diagnostics) {
  const now = Date.now();
  const lastPoint = state.chartHistory?.[state.chartHistory.length - 1];
  const lastTimestamp = lastPoint ? lastPoint.t : null;
  const freshnessSec = lastTimestamp ? Math.max(0, (now - lastTimestamp) / 1000) : null;
  const isStale = freshnessSec !== null && freshnessSec > 7;

  return {
    timestamp: now,
    freshnessSec: freshnessSec !== null ? Number(freshnessSec.toFixed(1)) : null,
    isStale,
    connection: {
      mode: state.mode, // 'live' | 'simulation'
      status: state.wsStatus,
      latencyMs: state.latencyMs,
      url: state.wsUrl,
    },
    sensors: {
      tdsPpm: state.tds,
      tempC: state.tempC,
      ec25CompensatedPpm: state.tds > 0 && (1 + 0.02 * (state.tempC - 25)) > 0 ? Number((state.tds / (1 + 0.02 * (state.tempC - 25))).toFixed(1)) : 0,
      industrialEquivalentPpm: Math.round(state.tds * 82.35),
    },
    controls: {
      controlMode: state.controlMode, // 'auto' | 'manual'
      decision: state.routeClean ? 'CLEAN -> TANK B' : 'RECIRCULATE -> TANK A',
      routeClean: state.routeClean,
      servo1BackpressureDeg: state.servo1,
      servo2ChuteDeg: state.servo2,
      servo3CleanGateDeg: state.servo3,
      servo4BrineGateDeg: state.servo4,
      pumpActive: Boolean(state.relay1),
      podEcActive: Boolean(state.relay2),
      tankEcActive: Boolean(state.relay3),
      activeCarouselSlot: state.carouselSlot + 1,
      podSaturationPct: state.podSaturation,
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
      observedRatePpmMin: diagnostics?.observedReductionRatePpmMin || 0,
      baselineRatePpmMin: diagnostics?.baselineRatePpmMin || 18,
    },
    uninstrumentedSensors: [
      'Electrode Shunt Current (Amps)',
      'Direct Voltage Drop (V)',
      'Inline pH Sensor',
      'Batch Volume Flow Totalizer',
    ],
  };
}

/**
 * Suggested questions operators and judges can ask the Co-Pilot.
 */
export const SUGGESTED_QUERIES = [
  'Summarize current system status',
  'Explain recent TDS trend and reduction rate',
  'Why is the time-to-target reliable or unreliable?',
  'What is the electrode fouling diagnostic status?',
  'What are the limitations of the current sensor suite?',
  'Explain the 500 ppm Dubai benchmark routing rule',
];

/**
 * Deterministically analyzes user query against the live telemetry snapshot.
 * Generates an authoritative, factual engineering response.
 * 
 * @param {string} query - Operator's question
 * @param {Object} snapshot - Telemetry snapshot from buildTelemetrySnapshot()
 */
export function answerTelemetryQuery(query, snapshot) {
  const q = query.toLowerCase().trim();
  const { sensors, controls, prediction, diagnostics, connection, freshnessSec, isStale } = snapshot;

  // Stale or disconnected warning header
  let connectivityNote = '';
  if (connection.status !== 'connected' && connection.mode === 'live') {
    connectivityNote = '⚠️ [TELEMETRY OFFLINE: WebSocket is disconnected. Readings reflect last buffered frame.]\n\n';
  } else if (isStale) {
    connectivityNote = `⚠️ [STALE DATA: Last telemetry packet arrived ${freshnessSec}s ago.]\n\n`;
  }

  // 1. Electrode Health & Fouling Diagnostics (High Priority)
  if (q.includes('electrode') || q.includes('fouling') || q.includes('health') || q.includes('scaling') || q.includes('cathode') || q.includes('anode')) {
    return `${connectivityNote}**Electrode Health & Fouling Diagnostics:**

• **Diagnostic Status:** **${diagnostics.statusLabel}** (Severity: ${diagnostics.severity.toUpperCase()})
• **Treatment Trend:** **${diagnostics.treatmentTrend}**
• **Diagnostic Confidence:** **${diagnostics.confidence}**
• **Observed Reduction:** ${diagnostics.observedRatePpmMin.toFixed(1)} ppm/min (Nominal Baseline: ${diagnostics.baselineRatePpmMin} ppm/min)

**Physical Interpretation:**
${diagnostics.message}

**Critical Hardware Transparency:**
The ESP32 firmware monitors relay actuation and TDS rate-of-change, but **does not have electrical current shunt sensors (e.g. INA219/ACS712)** to directly measure electrode cell current (mA/cm²) or voltage drop. Therefore:
1. Declining TDS reduction is treated as an *operational performance indicator*, not definitive proof of cathode scaling.
2. If degradation persists, visually inspect Pod #${controls.activeCarouselSlot} graphite anode and 304 stainless steel woven cathode mesh for white mineral passivation crust before cleaning.`;
  }

  // 2. Time-to-Target & Prediction Reliability
  if (q.includes('predict') || q.includes('time') || q.includes('target') || q.includes('countdown') || q.includes('reliable') || q.includes('pass')) {
    return `${connectivityNote}**Time-to-Target & Pass Predictor Breakdown:**

• **Configured Target:** ${prediction.targetTds} ppm (Dubai potable tap water standard)
• **Current Prediction:** **${prediction.predictedTimeFormatted}**
• **Prediction Reliability:** **${prediction.reliability}** (Regression R²: ${(prediction.rSquared * 100).toFixed(1)}%)
• **Pass Projection Status:** ${prediction.passEstimate}

**Why this prediction is ${prediction.reliability.toLowerCase()}:**
${prediction.reliability === 'High' ? 'The system has accumulated more than 15 valid timestamped readings with a stable linear downward trend (R² > 0.80) and low residual variance.' :
  prediction.reliability === 'Moderate' ? 'A discernible reduction trend exists, but moderate sensor noise or fewer points (8–14 readings) limits extrapolation precision.' :
  'Data points exhibit high variance, stagnant slope, or recent setpoint disturbance, preventing confident linear extrapolation.'}

*Note on Passes: Project Hylex operates on continuous membraneless fluid flow through external cam-pinch valves. Predicting discrete passes requires batch volumetric flow totalizers, which are not currently instrumented in the hardware.*`;
  }

  // 3. Limitations & Missing Instrumentation
  if (q.includes('limit') || q.includes('sensor') || q.includes('missing') || q.includes('hardware') || q.includes('uninstrumented')) {
    return `${connectivityNote}**Sensor Suite & Engineering Limitations:**

**Currently Instrumented Hardware Sensors:**
1. **Gravity Analog TDS Conductivity Sensor** (GPIO 34) with 3rd-order polynomial voltage calibration.
2. **DS18B20 Waterproof Stainless Thermal Probe** (GPIO 4) providing EC₂₅ temperature compensation.
3. **4x MG995 Cam-Pinch Servos** with physical angle feedback (GPIO 13, 12, 14, 27).
4. **4-Channel 5V Optocoupler Relays** for 12V pump, pod EC, and tank EC.

**Uninstrumented Hardware (Honest Diagnostic Boundaries):**
• **Electrode Current Sensing:** No ammeter/current shunt installed; electrochemical efficiency cannot be stated as a direct percentage.
• **Cell Voltage Feedback:** Real-time cell impedance cannot be isolated from fluid resistance.
• **Batch Flow Totalizer:** System recirculates continuously; discrete "pass counts" are estimated by time rather than discrete volume.
• **Inline pH Probe:** Alkaline catalyst shift ($NaHCO_3$) is pre-calibrated, not continuously monitored via ion-selective electrode.`;
  }

  // 4. Dubai 500 ppm Benchmark & Routing Rule
  if (q.includes('dubai') || q.includes('500') || q.includes('benchmark') || q.includes('rule') || q.includes('valve')) {
    return `${connectivityNote}**Autonomous Decision Gate & 500 ppm Dubai Benchmark:**

• **Potable Standard:** Dubai (DEWA) and WHO drinking water guidelines set tap water total dissolved solids (TDS) at **≤ 500 ppm**.
• **Closed-Loop Rule in ESP32 Firmware:**
  - **If EC₂₅ ≤ 500 ppm (Clean Potable):**
    - AI Status switches to **EMERALD (CLEAN)**.
    - Servo #1 (Backpressure) relaxes to **20°**.
    - Servo #3 (Clean Gate) opens to **0° / 15°**, discharging into **Tank B (Clean Store)**.
    - Servo #4 (Brine Return) closes to **85° / 90°**.
  - **If EC₂₅ > 500 ppm (High Salinity):**
    - AI Status switches to **AMBER/RED (RECIRCULATE)**.
    - Servo #1 pinches to **55°–70°** to boost centrifugal vortex residence time.
    - Servo #3 closes to **85° / 90°**.
    - Servo #4 opens to **0° / 15°**, recirculating water back to **Tank A (Base Reservoir)** for further electro-coagulation.`;
  }

  // 5. TDS Trend & Reduction Rate
  if (q.includes('trend') || q.includes('reduction') || q.includes('rate') || q.includes('tds') || q.includes('salinity') || q.includes('kinetics')) {
    const rate = prediction.reductionRatePpmMin;
    let interpretation = '';

    if (prediction.status === PREDICTION_STATUS.TARGET_MET) {
      interpretation = `The fluid currently satisfies the configured target (${sensors.tdsPpm.toFixed(1)} ppm <= ${prediction.targetTds} ppm). The AI decision gate has directed the cam-pinch valve to Clean Storage (Tank B).`;
    } else if (rate < -1) {
      interpretation = `TDS is decreasing at **${Math.abs(rate).toFixed(1)} ppm/min** over the observed window. Hydro-cyclone separation and electro-coagulation flocs are actively removing dissolved solids from the clarified core.`;
    } else if (rate > 1) {
      interpretation = `TDS is currently rising at **+${rate.toFixed(1)} ppm/min**. This typically occurs during raw brine injection, initial fluid displacement, or when recirculation draws from a high-salinity sediment layer.`;
    } else {
      interpretation = `TDS reduction is currently negligible (**${rate.toFixed(1)} ppm/min**). The fluid salinity has stabilized or the circulation rate is insufficient to produce vortex shear.`;
    }

    return `${connectivityNote}**TDS Trend & Kinetics Analysis:**

• **Current Reading:** ${sensors.tdsPpm.toFixed(1)} ppm (Industrial equivalent: ${sensors.industrialEquivalentPpm.toLocaleString()} ppm)
• **Observed Reduction Rate:** ${rate.toFixed(1)} ppm/min (${(rate / 60).toFixed(2)} ppm/sec)
• **Statistical Fit (R²):** ${(prediction.rSquared * 100).toFixed(1)}% variance explained over the rolling regression window.
• **Assessment:** ${interpretation}
• **Physical Evidence:** DS18B20 temperature compensation accounts for ${(Math.abs(sensors.tdsPpm - sensors.ec25CompensatedPpm) / sensors.tdsPpm * 100).toFixed(1)}% thermal drift correction.`;
  }

  // 6. System Summary Query (Fallback for broad overview inquiries)
  if (q.includes('summary') || q.includes('status') || q.includes('overview') || q.includes('state')) {
    return `${connectivityNote}**Project Hylex System Status Summary:**

• **Salinity Telemetry:** Measured TDS is **${sensors.tdsPpm.toFixed(1)} ppm** (Thermal-compensated EC₂₅: **${sensors.ec25CompensatedPpm} ppm** at ${sensors.tempC.toFixed(1)}°C).
• **Routing Decision:** **${controls.decision}** (Servo #3: ${controls.servo3CleanGateDeg}°, Servo #4: ${controls.servo4BrineGateDeg}°). Threshold target is **${prediction.targetTds} ppm** (Dubai potable standard).
• **Active Actuators:** 12V Pump: **${controls.pumpActive ? 'ON' : 'OFF'}**, Pod Electrolysis (+12V): **${controls.podEcActive ? 'ON' : 'OFF'}**, Tank Pre-EC: **${controls.tankEcActive ? 'ON' : 'OFF'}**.
• **Mineral Carousel:** Active at **Pod #${controls.activeCarouselSlot}** (${controls.podSaturationPct[controls.activeCarouselSlot - 1]?.toFixed(0)}% saturation).
• **Prediction & Diagnostics:** Time to target is **${prediction.predictedTimeFormatted}** (Reliability: ${prediction.reliability}). Electrode status: **${diagnostics.treatmentTrend}** (Confidence: ${diagnostics.confidence}).`;
  }

  // 7. General Fallback with Contextual Reasoning
  return `${connectivityNote}**Hylex Engineering Co-Pilot Observation:**

Regarding your query: "${query}"

• **Current Measured Salinity:** ${sensors.tdsPpm.toFixed(1)} ppm (Compensated: ${sensors.ec25CompensatedPpm} ppm)
• **Target Setpoint:** ${prediction.targetTds} ppm (${sensors.tdsPpm <= prediction.targetTds ? 'Currently Achieved' : `${(sensors.tdsPpm - prediction.targetTds).toFixed(1)} ppm remaining`})
• **Observed Rate:** ${prediction.reductionRatePpmMin.toFixed(1)} ppm/min
• **Active Routing:** ${controls.decision}
• **Diagnostic State:** ${diagnostics.statusLabel}

*Advisory Note: All recommendations provided by the Co-Pilot are strictly advisory and read-only. The system does not autonomously override hardware actuators without operator confirmation.*

You can also ask about:
- "Summarize current system status"
- "Explain recent TDS trend"
- "What is the electrode fouling diagnostic status?"
- "What are the limitations of the current sensor suite?"`;
}
