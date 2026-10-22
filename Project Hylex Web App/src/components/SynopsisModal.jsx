import { X, Shield, Award, Droplets, Zap, Cpu, CheckCircle2, TrendingUp, DollarSign, Globe, Layers, Users } from 'lucide-react';
import { SYNOPSIS } from '../store/synopsis';

export default function SynopsisModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const team = [
    'William Abraham Ullas',
    'Boaz Mathew',
    'Joshua Solomon',
    'Arya Goswami',
    'Muhammad Ayaan Khan',
  ];

  const stages = [
    {
      num: 'Stage 1',
      title: 'Pre-Vortex Electro-Coagulation (Base Reservoir - Tank A)',
      desc: 'Submerged 12V brushless centrifugal pump (240–400 L/hr). Submerged electrodes with trace alkaline catalyst (NaHCO₃) shift local pH, forcing divalent ions (Mg²⁺, Ca²⁺) to nucleate into suspended high-density micro-flocs before pumping.',
      badge: 'Base Tank A',
      badgeColor: 'border-amber-500/30 text-amber-400 bg-amber-500/10',
    },
    {
      num: 'Stage 2',
      title: 'Membraneless Centrifugal Vortex Separation (Top Tier)',
      desc: '12V pump blasts brine upward through a 10mm brass 3-way splitter and dual 90° tangential brass nozzles into a 90mm clear acrylic cylinder housing a 3D-printed Archimedean Triple-Helix Spiral. Centrifugal & Dean-Vortex forces fling dense mineral clumps outward against the wall while clarified water remains in the central core, separated by a concentric bullseye splitter.',
      badge: '⌀90mm Acrylic Helix',
      badgeColor: 'border-cyan-500/30 text-cyan-400 bg-cyan-500/10',
    },
    {
      num: 'Stage 3',
      title: 'Closed-Loop AI Sensor Verification & 2-Tank Routing (Middle Tier)',
      desc: 'Clarified water flows into an inline Sensor Holding Chamber equipped with Gravity Analog TDS Sensor & DS18B20 waterproof thermal probe. ESP32 evaluates salinity in real time: ≤500 ppm routes to Tank B (Clean Store); >500 ppm pinches backpressure servo to 55° and recirculates back to Tank A.',
      badge: '≤500 ppm Gate',
      badgeColor: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10',
    },
    {
      num: 'Stage 4',
      title: 'Robotic Carousel Indexing & Electro-Crystallization (Lower Tier)',
      desc: 'Outer mineral slurry drops into a 3D-printed 3-slot rotating carousel. Central graphite rod (+12V anode) and 304 stainless steel mesh (-12V cathode) compact solid Magnesium Hydroxide (Mg(OH)₂) while venting green H₂ gas. 28BYJ-48 stepper motor indexes 120° every cycle with 3-second chute pinch cutoff.',
      badge: '3-Slot Stepper Turret',
      badgeColor: 'border-purple-500/30 text-purple-400 bg-purple-500/10',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Shield size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold font-mono tracking-wide text-white">PROJECT HYLEX DOSSIER</h2>
                <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  GEMS GLOBAL 2026
                </span>
                <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                  UN SDG 6
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Autonomous Hybrid Electro-Coagulation & Biomimetic Hydro-Cyclone Brine Valorization System
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm" style={{ scrollbarWidth: 'thin' }}>
          
          {/* Team Roster & UN SDG 6 Banner */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Team Roster */}
            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60">
              <div className="flex items-center gap-2 text-cyan-400 mb-2 font-mono text-xs font-semibold">
                <Users size={14} />
                <span>INVENTORS & ENGINEERING TEAM</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono text-slate-300">
                {team.map((name, i) => (
                  <div key={i} className="flex items-center gap-1.5 p-1.5 rounded bg-slate-900/60 border border-slate-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    <span>{name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* UN SDG 6 Targets */}
            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60">
              <div className="flex items-center gap-2 text-emerald-400 mb-2 font-mono text-xs font-semibold">
                <Globe size={14} />
                <span>UNITED NATIONS SDG 6 ALIGNMENT</span>
              </div>
              <div className="space-y-1.5 text-xs text-slate-300">
                <div className="flex items-start gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold">6.3</span>
                  <span className="text-[11px] text-slate-300">Eliminate hypersaline brine dumping & hazardous chemicals into coastal waters.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold">6.4</span>
                  <span className="text-[11px] text-slate-300">Substantially increase water-use efficiency via potable recovery (≤500 ppm Dubai standard).</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold">6.a</span>
                  <span className="text-[11px] text-slate-300">Expand desalination and membraneless mineral recovery technologies in water-stressed regions.</span>
                </div>
              </div>
            </div>
          </div>

          {/* 4-Stage Architecture Walkthrough */}
          <div>
            <div className="flex items-center gap-2 text-cyan-400 mb-3 font-mono text-xs font-semibold">
              <Layers size={14} />
              <span>4-TIER AUTONOMOUS PROCESS ARCHITECTURE</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {stages.map((st, i) => (
                <div key={i} className="p-3.5 rounded-xl bg-slate-800/30 border border-slate-700/50 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-mono font-bold text-white">{st.num}: {st.title.split('(')[0]}</span>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${st.badgeColor}`}>
                        {st.badge}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{st.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Hardware & Embedded Technologies */}
          <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/50">
            <div className="flex items-center gap-2 text-amber-400 mb-3 font-mono text-xs font-semibold">
              <Cpu size={14} />
              <span>HARDWARE & EMBEDDED ACTUATION SPECIFICATIONS</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                <div className="text-[10px] text-slate-500">EDGE CONTROLLER</div>
                <div className="text-cyan-300 font-bold">ESP32 Dual-Core</div>
                <div className="text-[10px] text-slate-400">Wi-Fi/BLE + GPIO Shield</div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                <div className="text-[10px] text-slate-500">INDUSTRIAL HMI</div>
                <div className="text-emerald-300 font-bold">Arduino Uno R3</div>
                <div className="text-[10px] text-slate-400">3.5" TFT 480×320 (UART)</div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                <div className="text-[10px] text-slate-500">VALVE ACTUATION</div>
                <div className="text-amber-300 font-bold">4x MG995 Metal Servos</div>
                <div className="text-[10px] text-slate-400">Cam-pinch silicone tube</div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                <div className="text-[10px] text-slate-500">TURRET INDEXING</div>
                <div className="text-purple-300 font-bold">28BYJ-48 Stepper</div>
                <div className="text-[10px] text-slate-400">ULN2003 · 64:1 reduction</div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                <div className="text-[10px] text-slate-500">PUMP INJECTION</div>
                <div className="text-cyan-300 font-bold">12V 8W Brushless</div>
                <div className="text-[10px] text-slate-400">240–400 L/hr magnetic</div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                <div className="text-[10px] text-slate-500">SENSOR FUSION</div>
                <div className="text-emerald-300 font-bold">Gravity TDS + DS18B20</div>
                <div className="text-[10px] text-slate-400">EC₂₅ temp compensation</div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                <div className="text-[10px] text-slate-500">ELECTROCHEMISTRY</div>
                <div className="text-amber-300 font-bold">Graphite + SS304 Mesh</div>
                <div className="text-[10px] text-slate-400">4-Ch 5V Opto Relay</div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                <div className="text-[10px] text-slate-500">ADDITIVE MFG</div>
                <div className="text-purple-300 font-bold">11 Custom 3D Bodies</div>
                <div className="text-[10px] text-slate-400">Fusion 360 · PLA+/PETG</div>
              </div>
            </div>
          </div>

          {/* B2B Commercial Economics & ZLD Comparison */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-950/20 to-slate-900 border border-emerald-500/30">
            <div className="flex items-center gap-2 text-emerald-400 mb-2 font-mono text-xs font-semibold">
              <DollarSign size={14} />
              <span>COMMERCIAL B2B VIABILITY VS. CONVENTIONAL ZLD</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center mb-3">
              <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                <div className="text-[10px] text-slate-400 font-mono">HYLEX CAPEX</div>
                <div className="text-lg font-bold font-mono text-emerald-400">$75,000</div>
                <div className="text-[9px] text-slate-500 font-mono">$25k mfr / 65%+ margin</div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                <div className="text-[10px] text-slate-400 font-mono">CONVENTIONAL ZLD</div>
                <div className="text-lg font-bold font-mono text-red-400">$250k–$2M+</div>
                <div className="text-[9px] text-slate-500 font-mono">&lt;1% adoption globally</div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                <div className="text-[10px] text-slate-400 font-mono">WATER COST CUT</div>
                <div className="text-lg font-bold font-mono text-cyan-400">60%–80%</div>
                <div className="text-[9px] text-slate-500 font-mono">Subsidized by mineral sales</div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                <div className="text-[10px] text-slate-400 font-mono">MINERAL HARVEST</div>
                <div className="text-lg font-bold font-mono text-amber-400">2.6 kg/m³</div>
                <div className="text-[9px] text-slate-500 font-mono">Mg(OH)₂ · Green Cement</div>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Global desalination generates over 141.5 billion liters of toxic brine daily. Over 90% is dumped into marine environments, creating dead zones and hiking intake salinity by 15%–25%. Hylex eliminates membrane fouling, recovers potable water, and produces solid commodity-grade minerals with a fraction of the thermal energy needed by traditional evaporators.
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-800 bg-slate-900/90 text-xs font-mono text-slate-500 flex-shrink-0">
          <span>PROJECT HYLEX · GEMS GLOBAL INNOVATION CHALLENGE 2026</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            Close Dossier
          </button>
        </div>

      </div>
    </div>
  );
}
