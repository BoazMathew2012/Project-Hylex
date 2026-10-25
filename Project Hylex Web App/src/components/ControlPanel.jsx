import { useHylex, useDispatch } from '../store/HylexContext';
import { useState } from 'react';
import Cpu from 'lucide-react/dist/esm/icons/cpu.mjs';
import RotateCcw from 'lucide-react/dist/esm/icons/rotate-ccw.mjs';
import Activity from 'lucide-react/dist/esm/icons/activity.mjs';
import TrendingUp from 'lucide-react/dist/esm/icons/trending-up.mjs';
import Coins from 'lucide-react/dist/esm/icons/coins.mjs';
import { SYNOPSIS } from '../store/synopsis';

// Animated toggle switch
function Toggle({ value, onChange, label, sublabel, color = 'emerald' }) {
  const activeStyles = {
    emerald: 'bg-emerald-500 border-emerald-400',
    red:     'bg-red-500 border-red-400',
    amber:   'bg-amber-500 border-amber-400',
    cyan:    'bg-cyan-500 border-cyan-400',
  };

  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <div className="min-w-0 flex-1">
        <div className="text-xs font-sans text-slate-200 font-medium leading-tight">{label}</div>
        {sublabel && <div className="text-[10px] font-sans text-slate-400 truncate leading-tight mt-0.5">{sublabel}</div>}
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
          className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out ${
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
    <div className="py-1">
      <div className="flex justify-between items-baseline mb-1">
        <div>
          <span className="text-xs font-sans text-slate-200 font-medium">{label}</span>
          {sublabel && <div className="text-[10px] font-sans text-slate-400">{sublabel}</div>}
        </div>
        <span className="text-xs font-mono font-bold" style={{ color: c }}>{value}°</span>
      </div>
      <div className="relative h-2 rounded-full bg-slate-800">
        <div className="absolute h-full rounded-full transition-all" style={{ width: `${pct}%`, background: c }} />
        <input type="range" min={min} max={max} value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-full" />
        <div className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 shadow-sm transition-all"
          style={{ left: `calc(${pct}% - 7px)`, background: c, borderColor: '#0f172a' }} />
      </div>
    </div>
  );
}

// ── Hardware Control Panel ──────────────────────────────────────────────────
function HardwarePanel({ sendWsCommand }) {
  const { state } = useHylex();
  const dispatch  = useDispatch();
  const isAuto    = state.controlMode === 'auto';
  const isLiveOffline = state.mode === 'live' && state.wsStatus !== 'connected';

  const handleServo = (n, val) => {
    if (isLiveOffline) return;
    dispatch({ type: `SET_SERVO${n}`, payload: val });
    sendWsCommand?.({ cmd: 'servo', id: n, angle: val });
  };

  const handleRelay = (n) => {
    if (isLiveOffline) return;
    dispatch({ type: 'TOGGLE_RELAY', payload: n });
    sendWsCommand?.({ cmd: 'relay', id: n, state: !state[`relay${n}`] });
  };

  const handleCarouselStep = () => {
    if (isLiveOffline) return;
    dispatch({ type: 'SIM_TURRET_INDEX' });
    sendWsCommand?.({ cmd: 'carousel', action: 'step' });
    setTimeout(() => dispatch({ type: 'SERVO2_RESET' }), 3000);
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/85 backdrop-blur-sm p-3 flex flex-col gap-3 shadow-sm">
      {/* Header + mode toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-amber-500/10 border border-amber-500/25 text-amber-400">
            <Cpu size={13} />
          </div>
          <span className="text-xs font-sans font-semibold text-white tracking-wide">Actuator Control</span>
        </div>
        <div className="flex items-center bg-slate-950 rounded-lg p-0.5 border border-slate-800">
          <button
            type="button"
            onClick={() => { dispatch({ type: 'SET_CONTROL_MODE', payload: 'auto' }); sendWsCommand?.({ cmd: 'mode', mode: 'auto' }); }}
            className={`px-2.5 py-1 rounded text-[11px] font-sans font-medium transition-colors ${
              isAuto ? 'bg-slate-800 text-emerald-300 border border-emerald-500/30' : 'text-slate-500 hover:text-slate-300'
            }`}>
            AI Auto
          </button>
          <button
            type="button"
            onClick={() => { dispatch({ type: 'SET_CONTROL_MODE', payload: 'manual' }); sendWsCommand?.({ cmd: 'mode', mode: 'manual' }); }}
            className={`px-2.5 py-1 rounded text-[11px] font-sans font-medium transition-colors ${
              !isAuto ? 'bg-slate-800 text-amber-300 border border-amber-500/30' : 'text-slate-500 hover:text-slate-300'
            }`}>
            Manual
          </button>
        </div>
      </div>

      {/* Offline Standby Notice or Manual Sliders or AI Loop banner */}
      {isLiveOffline ? (
        <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-2.5">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Cpu size={12} className="text-slate-500" />
            <span className="text-xs font-sans font-semibold">ESP32 Hardware Offline</span>
          </div>
          <div className="text-[11px] text-slate-400 font-sans mt-1 leading-relaxed">
            Actuators de-energized in 0° safe standby. Connect to ESP32 at <span className="font-mono text-cyan-300">ws://192.168.4.1:81</span> to stream live positions.
          </div>
        </div>
      ) : !isAuto ? (
        <div className="space-y-2 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
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
        <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-lg p-2.5">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <Activity size={12} />
            <span className="text-xs font-sans font-semibold">Autonomous AI Gating Active</span>
          </div>
          <div className="text-[11px] text-slate-300 font-sans mt-1 leading-relaxed">
            ESP32 reads Gravity TDS + DS18B20 to auto-gate MG995 silicone cam-pinch valves at the {SYNOPSIS.tds_threshold_ppm} ppm potable threshold.
          </div>
        </div>
      )}

      {/* Relay banks — 4-ch optocoupler relay */}
      <div className="space-y-1 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
        <div className="text-[10px] text-slate-400 font-sans uppercase tracking-wider font-semibold mb-1">
          5V Optocoupler Power Relays
        </div>
        <Toggle
          value={state.relay1} onChange={() => handleRelay(1)} color="cyan"
          label="Ch1: 12V Brushless Centrifugal Pump"
          sublabel="240–400 L/hr magnetic drive"
        />
        <Toggle
          value={state.relay2} onChange={() => handleRelay(2)} color="amber"
          label="Ch2: Pod Electro-Crystallisation"
          sublabel="Graphite anode (+12V) / SS304 mesh (-12V)"
        />
        <Toggle
          value={state.relay3} onChange={() => handleRelay(3)} color="red"
          label="Ch3: Tank A EC Coagulation"
          sublabel="Submerged electrodes + NaHCO₃ catalyst"
        />
      </div>

      {/* Carousel step button */}
      <button
        type="button"
        onClick={handleCarouselStep}
        className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 text-xs font-sans font-medium transition-colors shadow-sm"
      >
        <RotateCcw size={13} className="text-amber-400" />
        <span>Step Stepper Turret (+120°)</span>
        <span className="text-[10px] text-slate-400 font-mono">→ Pod #{((state.carouselSlot + 1) % 3) + 1}</span>
      </button>

      {/* Live servo angle summary */}
      <div className="grid grid-cols-4 gap-1.5 text-center">
        {[
          { l: 'S1 BackP', v: `${state.servo1}°`, c: 'text-cyan-400' },
          { l: 'S2 Chute', v: `${state.servo2}°`, c: 'text-amber-400' },
          { l: 'S3 Clean', v: `${state.servo3}°`, c: 'text-emerald-400' },
          { l: 'S4 Brine', v: `${state.servo4}°`, c: 'text-red-400' },
        ].map(s => (
          <div key={s.l} className="bg-slate-950/60 border border-slate-800/80 rounded-md p-1.5">
            <div className="text-slate-400 text-[10px] font-sans font-medium">{s.l}</div>
            <div className={`${s.c} font-bold font-mono text-xs mt-0.5`}>{s.v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── B2B ROI & Mineral Harvester ─────────────────────────────────────────────
function ROICalculator() {
  const { state }  = useHylex();
  const dispatch   = useDispatch();
  const { plantCapacity, chartHistory } = state;

  const isLiveOffline    = state.mode === 'live' && state.wsStatus !== 'connected';
  // Live counters (demo scale)
  const elapsed          = isLiveOffline ? 0 : chartHistory.length;
  const mgHarvestedG     = (isLiveOffline ? 0 : ((elapsed * 0.18) || 2.8)).toFixed(1);
  const caHarvestedG     = (isLiveOffline ? 0 : ((elapsed * 0.09) || 1.4)).toFixed(1);
  const cleanWaterL      = (isLiveOffline ? 0 : ((elapsed * 0.52) || 8.3)).toFixed(1);

  // Industrial scale figures
  const mgTonDay         = (plantCapacity * SYNOPSIS.minerals_per_m3_kg / 1000).toFixed(2);
  const cleanM3Day       = (plantCapacity * 0.72).toFixed(0);
  const costReductionPct = Math.min(SYNOPSIS.cost_reduction_pct_max,
    SYNOPSIS.cost_reduction_pct_min + (plantCapacity / 5000) * 20).toFixed(0);

  // CAPEX comparison
  const hylexSell        = SYNOPSIS.capex_sell_usd;
  const zldMin           = SYNOPSIS.conventional_zld_min_usd;
  const savedVsZld       = ((zldMin - hylexSell) / 1000).toFixed(0);

  const hylexPerM3       = ((hylexSell / (plantCapacity * 365)) * 1000).toFixed(2);
  const zldPerM3         = ((zldMin    / (plantCapacity * 365)) * 1000).toFixed(2);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/85 backdrop-blur-sm p-3 flex flex-col gap-3 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-emerald-500/10 border border-emerald-500/25 text-emerald-400">
            <Coins size={13} />
          </div>
          <span className="text-xs font-sans font-semibold text-white tracking-wide">B2B ROI &amp; Minerals</span>
        </div>
        <span className="text-[10px] font-sans text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/25">
          ZLD Disruptor
        </span>
      </div>

      {/* Live mineral counters */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-2">
          <div className="text-[10px] text-slate-400 font-sans font-medium">Mg(OH)₂ Harvested</div>
          <div className="text-base font-bold font-mono text-emerald-400 leading-tight my-0.5">
            {mgHarvestedG}<span className="text-[10px] text-slate-400 ml-0.5 font-normal">g</span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono">{mgTonDay} t/d industrial</div>
        </div>
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-2">
          <div className="text-[10px] text-slate-400 font-sans font-medium">Clean Potable Yield</div>
          <div className="text-base font-bold font-mono text-cyan-400 leading-tight my-0.5">
            {cleanWaterL}<span className="text-[10px] text-slate-400 ml-0.5 font-normal">L</span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono">{cleanM3Day} m³/d industrial</div>
        </div>
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-2">
          <div className="text-[10px] text-slate-400 font-sans font-medium">Net Cost Reduction</div>
          <div className="text-base font-bold font-mono text-amber-400 leading-tight my-0.5">{costReductionPct}%</div>
          <div className="text-[10px] text-slate-500 font-sans">vs. thermal evaporators</div>
        </div>
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-2">
          <div className="text-[10px] text-slate-400 font-sans font-medium">CAPEX Savings</div>
          <div className="text-base font-bold font-mono text-purple-300 leading-tight my-0.5">${savedVsZld}k</div>
          <div className="text-[10px] text-slate-500 font-sans">vs. $250k–$2M ZLD</div>
        </div>
      </div>

      {/* Plant capacity slider */}
      <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs font-sans text-slate-300 font-medium">Plant Sizing Capacity</span>
          <span className="text-xs font-mono text-emerald-400 font-bold">{plantCapacity.toLocaleString()} m³/day</span>
        </div>
        <div className="relative h-2 rounded-full bg-slate-800">
          <div className="absolute h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
            style={{ width: `${(plantCapacity / 5000) * 100}%` }} />
          <input type="range" min={100} max={5000} step={50} value={plantCapacity}
            onChange={e => dispatch({ type: 'SET_PLANT_CAPACITY', payload: Number(e.target.value) })}
            className="absolute inset-0 w-full opacity-0 cursor-pointer h-full" />
        </div>
        <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
          <span>100 m³/d</span>
          <span>5,000 m³/d</span>
        </div>
      </div>

      {/* CAPEX comparison bars */}
      <div className="space-y-1.5 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
        <div className="text-[10px] text-slate-400 font-sans uppercase tracking-wider font-semibold">
          CAPEX Normalized / m³ / year
        </div>
        <div>
          <div className="flex justify-between text-[10px] font-sans mb-1">
            <span className="text-emerald-300 font-medium">Hylex System ($75k)</span>
            <span className="text-emerald-300 font-mono font-bold">${hylexPerM3}</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
            <div className="h-full rounded-full bg-emerald-500 transition-all duration-700"
              style={{ width: `${Math.min(100, (parseFloat(hylexPerM3) / parseFloat(zldPerM3)) * 100)}%` }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-[10px] font-sans mb-1">
            <span className="text-red-300 font-medium">Conventional ZLD ($250k)</span>
            <span className="text-red-300 font-mono font-bold">${zldPerM3}</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
            <div className="h-full rounded-full bg-red-500/70 w-full" />
          </div>
        </div>
      </div>

      {/* Mineral Ticker */}
      <div className="flex items-center gap-2 bg-slate-950/60 rounded-lg p-2 border border-slate-800 text-[11px] font-sans text-slate-300">
        <TrendingUp size={13} className="text-emerald-400 flex-shrink-0" />
        <span className="truncate">
          <strong className="text-emerald-300 font-mono">Mg(OH)₂</strong> {mgHarvestedG}g · <strong className="text-cyan-300 font-mono">CaCO₃</strong> {caHarvestedG}g · <strong className="text-purple-300 font-mono">H₂</strong> Vent
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
      <div className="flex items-center bg-slate-900/90 border border-slate-800 rounded-lg p-0.5 gap-1 flex-shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`flex-1 py-1 text-xs font-sans font-medium rounded-md transition-colors ${
            activeTab === 'all'
              ? 'bg-slate-800 text-cyan-300 border border-cyan-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          All Panels
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('hardware')}
          className={`flex-1 py-1 text-xs font-sans font-medium rounded-md transition-colors ${
            activeTab === 'hardware'
              ? 'bg-slate-800 text-amber-300 border border-amber-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Actuators
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('roi')}
          className={`flex-1 py-1 text-xs font-sans font-medium rounded-md transition-colors ${
            activeTab === 'roi'
              ? 'bg-slate-800 text-emerald-300 border border-emerald-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          B2B ROI
        </button>
      </div>

      {/* Panels View */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-0.5" style={{ scrollbarWidth: 'thin' }}>
        {(activeTab === 'all' || activeTab === 'hardware') && (
          <HardwarePanel sendWsCommand={sendWsCommand} />
        )}
        {(activeTab === 'all' || activeTab === 'roi') && (
          <ROICalculator />
        )}
      </div>
    </div>
  );
}
