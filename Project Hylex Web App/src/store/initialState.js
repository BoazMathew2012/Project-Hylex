// Central simulation state store
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
};
