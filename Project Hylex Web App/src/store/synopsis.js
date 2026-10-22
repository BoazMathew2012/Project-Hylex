// Hylex Synopsis-Accurate Constants & Descriptions
// Source: Project Hylex official synopsis document

export const SYNOPSIS = {
  // ── Hardware ────────────────────────────────────────
  pump: 'DC 12V 8W Brushless Magnetic-Drive Centrifugal Pump (240–400 L/hr)',
  servo: 'MG995 / MG996R High-Torque Metal-Gear Cam-Pinch Servo',
  stepper: '28BYJ-48 12V Geared Stepper + ULN2003 Driver (64:1 gear reduction)',
  mcu: 'ESP32 + Arduino Uno R3 HMI (3.5" TFT LCD 480×320)',
  tds_sensor: 'Gravity Analog TDS Conductivity Sensor',
  temp_sensor: 'DS18B20 Waterproof Stainless Steel Thermal Probe',
  anode: 'High-Purity Graphite Carbon Anode (+12V)',
  cathode: '304 Stainless Steel Woven Wire Mesh Cathode (-12V)',
  relay: '4-Channel 5V Optocoupler Relay Module',
  buck: 'LM2596 DC-DC Buck Converter → 6.0V for servos',

  // ── Physical dimensions ─────────────────────────────
  cylinder_diameter_mm: 90,         // acrylic cylinder
  system_height_mm: 450,            // full 4-tier tower
  carousel_slots: 3,                 // 3-slot rotating carousel
  carousel_index_deg: 120,          // degrees per step
  carousel_dwell_sec: 3,            // chute pinch hold time

  // ── Valve / servo assignments ───────────────────────
  // Servo #1 (Backpressure) — cam-pinch on vortex inlet line
  // Servo #2 (Chute Cutoff) — pinches drop chute during carousel index
  // Servo #3 (Clean Tank B Gate) — opens to route <500ppm water to Tank B
  // Servo #4 (Brine Tank A Return) — opens to recirculate >500ppm back to Tank A

  // ── Process threshold ───────────────────────────────
  tds_threshold_ppm: 500,           // Dubai potable/tap water benchmark

  // ── Industrial scaling factor ───────────────────────
  // Benchtop TDS × 82.35 ≈ industrial brine concentration equivalent
  industrial_scale: 82.35,
  industrial_raw_ppm: 70000,        // raw brine intake
  industrial_target_ppm: 38500,     // post-Hylex outfall target

  // ── Market / ROI ────────────────────────────────────
  capex_manufacture_usd: 25000,     // projected manufacturing cost
  capex_sell_usd: 75000,            // projected sale price (was 70k-80k, use 75k mid)
  gross_margin_pct: 65,             // hardware gross margin %
  brine_global_daily_billion_L: 141.5, // liters/day global brine
  minerals_per_m3_kg: 2.6,          // kg Mg per m³ brine
  cost_reduction_pct_min: 60,
  cost_reduction_pct_max: 80,
  disposal_savings_pct_min: 5,
  disposal_savings_pct_max: 33,
  permitting_speedup_pct: 50,
  conventional_zld_min_usd: 250000,
  conventional_zld_max_usd: 2000000,

  // ── Mineral products ────────────────────────────────
  minerals: [
    { formula: 'Mg(OH)₂', name: 'Magnesium Hydroxide', use: 'green cement / fire retardant' },
    { formula: 'CaCO₃',   name: 'Calcium Carbonate',   use: 'construction filler' },
    { formula: 'KCl',     name: 'Potassium Chloride',  use: 'fertilizer' },
    { formula: 'Li⁺',     name: 'Lithium Concentrate', use: 'battery materials' },
  ],
  byproduct: 'H₂ (green hydrogen)',

  // ── Tier labels (accurate to synopsis) ─────────────
  tier1: 'Stage 2 — Membraneless Centrifugal Vortex (Archimedean Triple-Helix)',
  tier2: 'Stage 3 — AI Sensor Chamber + Cam-Pinch Servo Gates',
  tier3: 'Stage 4 — Robotic Carousel + Electro-Crystallization Pods',
  tier4: 'Stage 1 — Pre-Vortex Electro-Coagulation (Tank A) + Clean Store (Tank B)',
};
