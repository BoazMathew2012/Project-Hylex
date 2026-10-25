// Central simulation state store

export const ZERO_TELEMETRY = {
  tds: 0,
  tempC: 0,
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
  coagRemaining: 0,
  podLoad: 0,
  aiReason: '',
};

export const SIMULATION_TELEMETRY = {
  tds: 380,
  tempC: 23.4,
  servo1: 20,  // Backpressure
  servo2: 0,   // Chute Cutoff
  servo3: 0,   // Clean Gate (Tank B)
  servo4: 90,  // Recirculate Gate (Tank A)
  relay1: true,   // 12V Pump
  relay2: true,   // Pod Electrolysis
  relay3: false,  // Tank A Coagulation
  carouselSlot: 0,
  carouselAngle: 0,
  podSaturation: [45, 72, 18],
  routeClean: true,
};

export const INITIAL_STATE = {
  mode: 'simulation', // 'simulation' | 'live'
  wsUrl: 'ws://192.168.4.1:81',
  wsStatus: 'disconnected', // 'connected' | 'disconnected' | 'connecting'
  latencyMs: null,

  // Sensor data
  tds: 380,
  tempC: 23.4,
  industrialScale: 82.35,

  // Servo angles (degrees)
  servo1: 20,  // Backpressure
  servo2: 0,   // Chute Cutoff
  servo3: 0,   // Clean Gate (Tank B)
  servo4: 90,  // Recirculate Gate (Tank A)

  // Relay states
  relay1: true,   // 12V Pump
  relay2: true,   // Pod Electrolysis
  relay3: false,  // Tank A Coagulation

  // Carousel
  carouselSlot: 0,         // 0-indexed: 0=Pod1, 1=Pod2, 2=Pod3
  carouselAngle: 0,        // visual rotation 0-360
  podSaturation: [45, 72, 18], // % per pod

  // Route decision
  routeClean: true, // true = Tank B, false = Tank A (recirculate)

  // Control mode
  controlMode: 'auto', // 'auto' | 'manual'

  // ROI
  plantCapacity: 500, // m3/day

  // Chart history (last 60 points)
  chartHistory: [],

  // ── Process State (ESP32 2-stage handshake) ──
  processState: 1,     // 1=Standby, 2=Coagulation, 3=Active Separation
  coagRemaining: 0,    // seconds left in coagulation phase
  podLoad: 0,          // active pod saturation % from ESP32
  aiReason: '',        // last ESP32-reported AI routing reason

  // ── Ollama 1.5B Edge Controller Log ──
  ollamaControllerLog: [],  // [{ts, model, latencyMs, angle, rotatePod, decisionLog}]
};
