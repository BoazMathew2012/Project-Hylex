import { useHylex, useDispatch } from '../store/HylexContext';
import { useState } from 'react';
import {
  Cpu, RotateCcw, Activity, TrendingUp, Coins, Zap, Layers, Sliders
} from 'lucide-react';
import { SYNOPSIS } from '../store/synopsis';

// Pixel-perfect animated toggle switch
function Toggle({ value, onChange, label, sublabel, color = 'emerald' }) {
  const activeStyles = {
    emerald: 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] border-emerald-400',
    red:     'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)] border-red-400',
    amber:   'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)] border-amber-400',
    cyan:    'bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)] border-cyan-400',
  };

  return (
    <div className="flex items-center justify-between gap-2 py-0.5">
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-mono text-slate-300 leading-tight">{label}</div>
        {sublabel && <div className="text-[7.5px] font-mono text-slate-500 truncate leading-tight mt-0.5">{sublabel}</div>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full p-0.5 border transition-colors duration-200 ease-in-out focus:outline-none ${
          value ? activeStyles[color] : 'bg-slate-800 border-slate-700'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-md transition-transform duration-200 ease-in-out ${
            value ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

// Angle slider
function AngleSlider({ value, onChange, label, sublabel, color = 'cyan', min = 0, max = 90 }) {
  const pct = ((value - min) / (max - min)) * 100;
  const colorMap = { cyan: '#22d3ee', amber: '#fbbf24', emerald: '#34d399', red: '#f87171' };
  const c = colorMap[color];
  return (
    <div>
      <div className="flex justify-between mb-0.5">
        <div>
          <span className="text-[9px] font-mono text-slate-300">{label}</span>
          {sublabel && <div className="text-[7.5px] font-mono text-slate-500">{sublabel}</div>}
        </div>
        <span className="text-[9px] font-mono font-bold" style={{ color: c }}>{value}°</span>
      </div>
      <div className="relative h-2 rounded-full bg-slate-800">
        <div className="absolute h-full rounded-full transition-all" style={{ width: `${pct}%`, background: c }} />
        <input type="range" min={min} max={max} value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-full" />
        <div className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 shadow-lg transition-all"
          style={{ left: `calc(${pct}% - 7px)`, background: c, borderColor: c, boxShadow: `0 0 6px ${c}55` }} />
      </div>
    </div>
  );
}

// ── Hardware Control Panel ──────────────────────────────────────────────────
function HardwarePanel({ sendWsCommand, compact = false }) {
  const { state } = useHylex();
  const dispatch  = useDispatch();
  const isAuto    = state.controlMode === 'auto';

  const handleServo = (n, val) => {
    dispatch({ type: `SET_SERVO${n}`, payload: val });
    sendWsCommand?.({ cmd: 'servo', id: n, angle: val });
  };

  const handleRelay = (n) => {
    dispatch({ type: 'TOGGLE_RELAY', payload: n });
    sendWsCommand?.({ cmd: 'relay', id: n, state: !state[`relay${n}`] });
  };

  const handleCarouselStep = () => {
    dispatch({ type: 'SIM_TURRET_INDEX' });
    sendWsCommand?.({ cmd: 'carousel', action: 'step' });
    setTimeout(() => dispatch({ type: 'SERVO2_RESET' }), 3000);
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/80 backdrop-blur-sm p-2.5 flex flex-col gap-2.5 border-glow-amber">
      {/* Header + mode toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Cpu size={12} className="text-amber-400" />
          <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono font-bold">Hardware Control</span>
        </div>
        <div className="flex items-center bg-slate-800/80 rounded p-0.5 gap-0.5 border border-slate-700/60">
          <button onClick={() => { dispatch({ type: 'SET_CONTROL_MODE', payload: 'auto' }); sendWsCommand?.({ cmd: 'mode', mode: 'auto' }); }}
            className={`px-2 py-0.5 rounded text-[8.5px] font-mono font-semibold transition-all ${
              isAuto ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 shadow-sm' : 'text-slate-500 hover:text-slate-300'
            }`}>
            AI AUTO
          </button>
          <button onClick={() => { dispatch({ type: 'SET_CONTROL_MODE', payload: 'manual' }); sendWsCommand?.({ cmd: 'mode', mode: 'manual' }); }}
            className={`px-2 py-0.5 rounded text-[8.5px] font-mono font-semibold transition-all ${
              !isAuto ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40 shadow-sm' : 'text-slate-500 hover:text-slate-300'
            }`}>
            MANUAL
          </button>
        </div>
      </div>

      {/* Manual Sliders or AI Loop banner */}
      {!isAuto ? (
        <div className="space-y-2 bg-slate-950/40 p-2 rounded-lg border border-slate-800">
          <AngleSlider
            label="Servo #1 — Cam-Pinch Backpressure"
            sublabel="MG995 · vortex inlet line"
            value={state.servo1} color="cyan"
            onChange={v => handleServo(1, v)}
          />
          <AngleSlider
            label="Servo #2 — Drop Chute Cutoff"
            sublabel="MG995 · carousel index pinch"
            value={state.servo2} color="amber"
            onChange={v => handleServo(2, v)}
          />
          <AngleSlider
            label="Servo #3 — Clean Gate (Tank B)"
            sublabel="MG995 · silicone cam-pinch"
            value={state.servo3} color="emerald"
            onChange={v => handleServo(3, v)}
          />
          <AngleSlider
            label="Servo #4 — Brine Gate (Tank A)"
            sublabel="MG995 · recirculation loop"
            value={state.servo4} color="red"
            onChange={v => handleServo(4, v)}
          />
        </div>
      ) : (
        <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-lg p-2">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <Activity size={10} className="pulse-ring" />
            <span className="text-[9px] font-mono font-bold">AUTONOMOUS AI LOOP ACTIVE</span>
          </div>
          <div className="text-[7.5px] text-slate-400 font-mono mt-0.5 leading-tight">
            ESP32 reads Gravity TDS + DS18B20 → auto-gates MG995 cam-pinch valves (Threshold: {SYNOPSIS.tds_threshold_ppm} ppm).
          </div>
        </div>
      )}

      {/* Relay banks — 4-ch optocoupler relay */}
      <div className="space-y-1.5 bg-slate-950/40 p-2 rounded-lg border border-slate-800">
        <div className="text-[7.5px] text-slate-500 font-mono uppercase tracking-widest font-bold">
          4-Ch 5V Optocoupler Relays
        </div>
        <Toggle
          value={state.relay1} onChange={() => handleRelay(1)} color="cyan"
          label="Ch1: 12V Brushless Pump"
          sublabel="240–400 L/hr magnetic centrifugal"
        />
        <Toggle
          value={state.relay2} onChange={() => handleRelay(2)} color="amber"
          label="Ch2: Pod Electro-Crystallisation"
          sublabel="Graphite anode (+12V) / SS mesh (-12V)"
        />
        <Toggle
          value={state.relay3} onChange={() => handleRelay(3)} color="red"
          label="Ch3: Tank A EC Coagulation"
          sublabel="Submerged electrodes + NaHCO₃ catalyst"
        />
      </div>

      {/* Carousel step button */}
      <button onClick={handleCarouselStep}
        className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono hover:bg-amber-500/20 hover:border-amber-500/50 transition-all shadow-sm">
        <RotateCcw size={11} />
        <span>Step Turret +120°</span>
        <span className="text-[8px] text-slate-400 font-normal">→ Pod #{((state.carouselSlot + 1) % 3) + 1}</span>
      </button>

      {/* Live servo angle summary */}
      <div className="grid grid-cols-4 gap-1 text-[7.5px] font-mono text-center">
        {[
          { l: 'S1 BackP', v: `${state.servo1}°`, c: 'text-cyan-400' },
          { l: 'S2 Chute', v: `${state.servo2}°`, c: 'text-amber-400' },
          { l: 'S3 Clean', v: `${state.servo3}°`, c: 'text-emerald-400' },
          { l: 'S4 Brine', v: `${state.servo4}°`, c: 'text-red-400' },
        ].map(s => (
          <div key={s.l} className="bg-slate-950/60 border border-slate-800 rounded px-1 py-1">
            <div className="text-slate-500 text-[7px]">{s.l}</div>
            <div className={`${s.c} font-bold text-[8.5px]`}>{s.v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── B2B ROI & Mineral Harvester ─────────────────────────────────────────────
function ROICalculator({ compact = false }) {
  const { state }  = useHylex();
  const dispatch   = useDispatch();
  const { plantCapacity, chartHistory } = state;

  // Live counters (demo scale)
  const elapsed          = chartHistory.length;
  const mgHarvestedG     = ((elapsed * 0.18) || 2.8).toFixed(1);
  const caHarvestedG     = ((elapsed * 0.09) || 1.4).toFixed(1);
  const cleanWaterL      = ((elapsed * 0.52) || 8.3).toFixed(1);

  // Industrial scale figures
  const mgTonDay         = (plantCapacity * SYNOPSIS.minerals_per_m3_kg / 1000).toFixed(2);
  const cleanM3Day       = (plantCapacity * 0.72).toFixed(0);
  const costReductionPct = Math.min(SYNOPSIS.cost_reduction_pct_max,
    SYNOPSIS.cost_reduction_pct_min + (plantCapacity / 5000) * 20).toFixed(0);

  // CAPEX comparison
  const hylexSell        = SYNOPSIS.capex_sell_usd;
  const hylexMfr         = SYNOPSIS.capex_manufacture_usd;
  const zldMin           = SYNOPSIS.conventional_zld_min_usd;
  const zldMax           = SYNOPSIS.conventional_zld_max_usd;
  const savedVsZld       = ((zldMin - hylexSell) / 1000).toFixed(0);
  const grossMargin      = SYNOPSIS.gross_margin_pct;

  const hylexPerM3       = ((hylexSell / (plantCapacity * 365)) * 1000).toFixed(2);
  const zldPerM3         = ((zldMin    / (plantCapacity * 365)) * 1000).toFixed(2);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/80 backdrop-blur-sm p-2.5 flex flex-col gap-2.5 border-glow-emerald">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Coins size={12} className="text-emerald-400" />
          <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono font-bold">B2B ROI &amp; Minerals</span>
        </div>
        <span className="text-[8px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/25">
          ZLD DISRUPTOR
        </span>
      </div>

      {/* Live mineral counters */}
      <div className="grid grid-cols-2 gap-1.5">
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded p-1.5">
          <div className="text-[7px] text-slate-400 font-mono">Mg(OH)₂ Harvested</div>
          <div className="text-base font-bold font-mono text-emerald-400 leading-tight">
            {mgHarvestedG}<span className="text-[8px] text-slate-400 ml-0.5 font-normal">g</span>
          </div>
          <div className="text-[7px] text-slate-500 font-mono">{mgTonDay} t/d industrial</div>
        </div>
        <div className="bg-cyan-500/5 border border-cyan-500/20 rounded p-1.5">
          <div className="text-[7px] text-slate-400 font-mono">Clean Water Recovered</div>
          <div className="text-base font-bold font-mono text-cyan-400 leading-tight">
            {cleanWaterL}<span className="text-[8px] text-slate-400 ml-0.5 font-normal">L</span>
          </div>
          <div className="text-[7px] text-slate-500 font-mono">{cleanM3Day} m³/d industrial</div>
        </div>
        <div className="bg-amber-500/5 border border-amber-500/20 rounded p-1.5">
          <div className="text-[7px] text-slate-400 font-mono">Net Cost Reduction</div>
          <div className="text-base font-bold font-mono text-amber-400 leading-tight">{costReductionPct}%</div>
          <div className="text-[7px] text-slate-500 font-mono">vs. thermal ZLD</div>
        </div>
        <div className="bg-purple-500/5 border border-purple-500/20 rounded p-1.5">
          <div className="text-[7px] text-slate-400 font-mono">CAPEX Saved</div>
          <div className="text-base font-bold font-mono text-purple-400 leading-tight">${savedVsZld}k</div>
          <div className="text-[7px] text-slate-500 font-mono">vs. $250k–$2M ZLD</div>
        </div>
      </div>

      {/* Plant capacity slider */}
      <div className="bg-slate-950/40 p-2 rounded-lg border border-slate-800">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[8.5px] font-mono text-slate-300">Plant Capacity</span>
          <span className="text-[9px] font-mono text-emerald-400 font-bold">{plantCapacity.toLocaleString()} m³/day</span>
        </div>
        <div className="relative h-1.5 rounded-full bg-slate-800">
          <div className="absolute h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400"
            style={{ width: `${(plantCapacity / 5000) * 100}%` }} />
          <input type="range" min={100} max={5000} step={50} value={plantCapacity}
            onChange={e => dispatch({ type: 'SET_PLANT_CAPACITY', payload: Number(e.target.value) })}
            className="absolute inset-0 w-full opacity-0 cursor-pointer h-full" />
        </div>
        <div className="flex justify-between text-[7px] text-slate-500 font-mono mt-0.5">
          <span>100 m³/d</span>
          <span>5,000 m³/d</span>
        </div>
      </div>

      {/* CAPEX comparison bars */}
      <div className="space-y-1 bg-slate-950/40 p-2 rounded-lg border border-slate-800">
        <div className="text-[7.5px] text-slate-500 font-mono uppercase tracking-widest font-bold">
          CAPEX / m³ / year Comparison
        </div>
        <div>
          <div className="flex justify-between text-[7.5px] font-mono mb-0.5">
            <span className="text-emerald-400 font-semibold">Hylex System ($75k)</span>
            <span className="text-emerald-400 font-bold">${hylexPerM3}</span>
          </div>
          <div className="h-1.5 rounded bg-slate-800 overflow-hidden">
            <div className="h-full rounded bg-emerald-500 transition-all duration-700"
              style={{ width: `${Math.min(100, (parseFloat(hylexPerM3) / parseFloat(zldPerM3)) * 100)}%` }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-[7.5px] font-mono mb-0.5">
            <span className="text-red-400 font-semibold">Conventional ZLD ($250k)</span>
            <span className="text-red-400 font-bold">${zldPerM3}</span>
          </div>
          <div className="h-1.5 rounded bg-slate-800 overflow-hidden">
            <div className="h-full rounded bg-red-500/70 w-full" />
          </div>
        </div>
      </div>

      {/* Mineral Ticker */}
      <div className="flex items-center gap-1.5 bg-slate-950/60 rounded p-1.5 border border-slate-800/80 text-[7.5px] font-mono text-slate-400">
        <TrendingUp size={10} className="text-emerald-400 flex-shrink-0" />
        <span className="truncate">
          <span className="text-emerald-400 font-bold">Mg(OH)₂</span> {mgHarvestedG}g · <span className="text-cyan-400 font-bold">CaCO₃</span> {caHarvestedG}g · <span className="text-purple-400 font-bold">H₂</span> Gas
        </span>
      </div>
    </div>
  );
}

export default function ControlPanel() {
  const { sendWsCommand } = useHylex();
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'hardware' | 'roi'

  return (
    <div className="flex flex-col gap-2 h-full overflow-hidden">
      {/* Tab Switcher */}
      <div className="flex items-center bg-slate-900/90 border border-slate-800 rounded-lg p-0.5 gap-0.5 flex-shrink-0">
        <button
          onClick={() => setActiveTab('all')}
          className={`flex-1 py-1 text-[9px] font-mono font-medium rounded transition-all ${
            activeTab === 'all'
              ? 'bg-slate-800 text-cyan-300 border border-cyan-500/30 shadow-sm'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          ALL (COMPACT)
        </button>
        <button
          onClick={() => setActiveTab('hardware')}
          className={`flex-1 py-1 text-[9px] font-mono font-medium rounded transition-all ${
            activeTab === 'hardware'
              ? 'bg-slate-800 text-amber-300 border border-amber-500/30 shadow-sm'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          ACTUATORS
        </button>
        <button
          onClick={() => setActiveTab('roi')}
          className={`flex-1 py-1 text-[9px] font-mono font-medium rounded transition-all ${
            activeTab === 'roi'
              ? 'bg-slate-800 text-emerald-300 border border-emerald-500/30 shadow-sm'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          B2B ROI
        </button>
      </div>

      {/* Panels View */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-0.5" style={{ scrollbarWidth: 'thin' }}>
        {(activeTab === 'all' || activeTab === 'hardware') && (
          <HardwarePanel sendWsCommand={sendWsCommand} compact={activeTab === 'all'} />
        )}
        {(activeTab === 'all' || activeTab === 'roi') && (
          <ROICalculator compact={activeTab === 'all'} />
        )}
      </div>
    </div>
  );
}
