// Initial live telemetry state. Values stay unavailable until the ESP32 reports them.

export const ZERO_TELEMETRY = {
  tds: 0,
  tempC: 0,
  tdsAdcRaw: null,
  tdsVoltageMv: null,
  tdsValid: false,
  tempValid: false,
  servo1: 0,
  servo2: 0,
  servo3: 0,
  servo4: 0,
  relay1: false,
  relay2: false,
  relay3: false,
  carouselSlot: 0,
  carouselAngle: 0,
  podSaturation: [0, 0, 0],
  routeClean: false,
  latencyMs: null,
  chartHistory: [],
  // Process state fields
  processState: 1,     // 1=Standby, 2=Coagulation, 3=Active Separation
  processStateChangedAt: null,
  telemetryAt: null,
  coagRemaining: 0,
  podLoad: 0,
  tdsTrendPpmMin: 0,
  aiReason: '',
};

export const INITIAL_STATE = {
  mode: 'live',
  wsUrl: 'ws://192.168.4.1:81',
  wsStatus: 'disconnected', // 'connected' | 'disconnected' | 'connecting'
  latencyMs: null,

  // Sensor data
  tds: 0,
  tempC: 0,
  tdsAdcRaw: null,
  tdsVoltageMv: null,
  tdsValid: false,
  tempValid: false,
  industrialScale: 82.35,

  // Servo angles (degrees)
  servo1: 0,
  servo2: 0,
  servo3: 0,
  servo4: 0,

  // Relay states
  relay1: false,
  relay2: false,
  relay3: false,

  // Carousel
  carouselSlot: 0,         // 0-indexed: 0=Pod1, 1=Pod2, 2=Pod3
  carouselAngle: 0,        // visual rotation 0-360
  podSaturation: [0, 0, 0],

  // Route decision
  routeClean: false,

  // Control mode
  controlMode: 'auto', // 'auto' | 'manual'

  // ROI
  plantCapacity: 500, // m3/day

  // Chart history (last 60 points)
  chartHistory: [],

  // ── Process State (ESP32 2-stage handshake) ──
  processState: 1,     // 1=Standby, 2=Coagulation, 3=Active Separation
  processStateChangedAt: null,
  telemetryAt: null,
  coagRemaining: 0,    // seconds left in coagulation phase
  podLoad: 0,          // runtime-based fill estimate; no pod mass sensor is installed
  tdsTrendPpmMin: 0,
  aiReason: '',        // last ESP32-reported AI routing reason

  // ── Ollama 1.5B Edge Controller Log ──
  ollamaControllerLog: [],  // [{ts, model, latencyMs, angle, rotatePod, decisionLog}]
};
