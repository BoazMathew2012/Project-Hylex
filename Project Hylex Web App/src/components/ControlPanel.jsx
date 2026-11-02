import { useHylex, useDispatch } from '../store/hooks';
import { useState } from 'react';
import Cpu from 'lucide-react/dist/esm/icons/cpu.mjs';
import RotateCcw from 'lucide-react/dist/esm/icons/rotate-ccw.mjs';
import Activity from 'lucide-react/dist/esm/icons/activity.mjs';
import TrendingUp from 'lucide-react/dist/esm/icons/trending-up.mjs';
import Coins from 'lucide-react/dist/esm/icons/coins.mjs';
import { SYNOPSIS } from '../store/synopsis';

function RelayStatus({ value, label, sublabel }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[.045] bg-white/[.022] px-3 py-2.5">
      <div className="flex items-center gap-2 min-w-0">
        <span className={`h-2 w-2 rounded-full flex-shrink-0 ${value ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,.45)]' : 'bg-slate-600'}`} />
        <div className="min-w-0">
          <div className="text-[12px] font-medium text-slate-200 leading-tight">{label}</div>
          {sublabel && <div className="text-[10px] font-sans text-slate-400 truncate leading-tight mt-0.5">{sublabel}</div>}
        </div>
      </div>
      <span className={`text-[10px] font-mono font-bold ${value ? 'text-emerald-300' : 'text-slate-500'}`}>{value ? 'ON' : 'OFF'}</span>
    </div>
  );
}

// Angle slider
function AngleSlider({ value, onChange, label, sublabel, color = 'cyan', min = 0, max = 90, disabled = false }) {
  const pct = ((value - min) / (max - min)) * 100;
  const colorMap = { cyan: '#22d3ee', amber: '#fbbf24', emerald: '#34d399', red: '#f87171' };
  const c = colorMap[color];
  return (
    <div className="group/slider py-1.5">
      <div className="flex justify-between items-baseline mb-2">
        <div>
          <span className="text-[12px] text-slate-200 font-medium">{label}</span>
          {sublabel && <div className="text-[10px] text-slate-500 mt-0.5">{sublabel}</div>}
        </div>
        <span className="text-xs font-mono font-bold" style={{ color: c }}>{value}°</span>
      </div>
      <div className="relative h-2 rounded-full bg-slate-800">
        <div className="absolute h-full rounded-full transition-all" style={{ width: `${pct}%`, background: c }} />
        <input type="range" min={min} max={max} value={value} disabled={disabled}
          onChange={e => onChange(Number(e.target.value))}
          className={`absolute inset-0 w-full opacity-0 h-full ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`} />
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
  const isCarouselRotating = state.processState === 4;
  const canStepCarousel = state.processState === 1 || state.processState === 3;
  const carouselDisabled = isLiveOffline || isCarouselRotating || !canStepCarousel;
  const autoSensorsReady = state.tdsValid && state.tempValid;
  const autoControlActive = autoSensorsReady && state.processState === 3;

  const handleServo = (n, val) => {
    if (isLiveOffline || isCarouselRotating) return;
    dispatch({ type: `SET_SERVO${n}`, payload: val });
    sendWsCommand?.({ cmd: 'servo', id: n, angle: val });
  };

  const handleCarouselStep = () => {
    if (carouselDisabled) return;
    sendWsCommand?.({ cmd: 'carousel', action: 'step' });
  };

  return (
    <div className="hylex-panel rounded-[22px] p-4 sm:p-5 flex flex-col gap-4 shadow-sm">
      {/* Header + mode toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 grid place-items-center rounded-xl bg-amber-300/[.08] border border-amber-200/10 text-amber-200">
            <Cpu size={16} strokeWidth={1.8} />
          </div>
            <span className="text-sm font-semibold text-white tracking-tight">Actuator controls</span>
        </div>
        <div className="flex items-center rounded-full p-1 border border-white/[.06] bg-slate-950/50">
          <button
            type="button"
            onClick={() => { dispatch({ type: 'SET_CONTROL_MODE', payload: 'auto' }); sendWsCommand?.({ cmd: 'mode', mode: 'auto' }); }}
            className={`px-3 py-1.5 rounded-full text-[10px] font-medium transition-all ${
              isAuto ? 'bg-white/[.09] text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}>
            Auto valves
          </button>
          <button
            type="button"
            onClick={() => { dispatch({ type: 'SET_CONTROL_MODE', payload: 'manual' }); sendWsCommand?.({ cmd: 'mode', mode: 'manual' }); }}
            className={`px-3 py-1.5 rounded-full text-[10px] font-medium transition-all ${
              !isAuto ? 'bg-white/[.09] text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}>
            Manual valves
          </button>
        </div>
      </div>

      {/* Offline Standby Notice or Manual Sliders or AI Loop banner */}
      {isLiveOffline ? (
        <div className="rounded-2xl border border-rose-200/10 bg-rose-300/[.035] p-4">
          <div className="flex items-center gap-2.5 text-rose-100/90">
            <span className="w-8 h-8 rounded-xl grid place-items-center bg-rose-200/[.07] text-rose-200"><Cpu size={14} /></span>
            <span className="text-xs font-semibold">Controller offline</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-2 leading-relaxed">
            Reconnect the ESP32 to see readings and use controls.
          </div>
        </div>
      ) : !isAuto ? (
        <div className="space-y-3 rounded-2xl bg-slate-950/35 p-4 border border-white/[.055]">
          <AngleSlider
            label="Backpressure valve"
            sublabel="Servo 1"
            value={state.servo1} color="cyan"
            min={20} max={70}
            disabled={isCarouselRotating}
            onChange={v => handleServo(1, v)}
          />
          <AngleSlider
            label="Chute valve"
            sublabel="Servo 2"
            value={state.servo2} color="amber"
            min={15} max={85}
            disabled={isCarouselRotating}
            onChange={v => handleServo(2, v)}
          />
          <AngleSlider
            label="Reuse gate"
            sublabel="Servo 3"
            value={state.servo3} color="emerald"
            min={15} max={85}
            disabled={isCarouselRotating}
            onChange={v => handleServo(3, v)}
          />
          <AngleSlider
            label="Brine gate"
            sublabel="Servo 4"
            value={state.servo4} color="red"
            min={15} max={85}
            disabled={isCarouselRotating}
            onChange={v => handleServo(4, v)}
          />
        </div>
      ) : (
        <div className={`${autoControlActive ? 'bg-emerald-300/[.045] border-emerald-200/10' : autoSensorsReady ? 'bg-cyan-300/[.045] border-cyan-200/10' : 'bg-amber-300/[.045] border-amber-200/10'} border rounded-2xl p-4`}>
          <div className={`flex items-center gap-1.5 ${autoControlActive ? 'text-emerald-400' : autoSensorsReady ? 'text-cyan-300' : 'text-amber-300'}`}>
            <Activity size={12} className={autoControlActive ? 'animate-pulse' : ''} />
            <span className="text-xs font-sans font-semibold">
              {autoControlActive ? 'ESP32 Auto Control Active' : autoSensorsReady ? 'ESP32 Auto Ready · Waiting' : 'Auto Routing Interlocked'}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-2 leading-relaxed">
            {autoSensorsReady
              ? autoControlActive
                ? `ESP32 routes at the ${SYNOPSIS.tds_threshold_ppm} ppm prototype reuse target and adjusts backpressure from the rolling TDS trend.`
                : 'Both probes are valid. Automatic routing and trend control run during vortex separation.'
              : !state.tdsValid
                ? 'TDS probe is invalid. ESP32 keeps flow on the recirculation path until both probes are valid.'
                : 'Temperature probe is invalid. ESP32 keeps flow on the recirculation path until both probes are valid.'}
          </div>
        </div>
      )}

      {/* The process state machine owns these relays; the UI reports output commands, not contact feedback. */}
      <div className="space-y-2 rounded-2xl bg-slate-950/35 p-3 border border-white/[.055]">
        <div className="flex items-center justify-between px-1 pb-1">
          <div className="text-[10px] text-slate-400 uppercase tracking-[.14em] font-semibold">
            Power
          </div>
          <div className="text-[9px] text-slate-600">Controller output</div>
        </div>
        <RelayStatus
          value={state.relay1}
          label="Pump"
        />
        <RelayStatus
          value={state.relay2}
          label="Pod EC"
        />
        <RelayStatus
          value={state.relay3}
          label="Tank EC"
        />
      </div>

      {/* Carousel step button */}
      <button
        type="button"
        onClick={handleCarouselStep}
        disabled={carouselDisabled}
        className={`hylex-carousel-button flex items-center justify-center gap-2.5 py-3 px-4 rounded-2xl border text-xs font-semibold transition-all shadow-sm ${
          carouselDisabled
            ? 'bg-white/[.025] border-white/[.045] text-slate-600 cursor-not-allowed'
            : 'border-amber-200/15 text-amber-100'
        }`}
      >
        <RotateCcw size={13} className={`text-amber-400 ${isCarouselRotating ? 'animate-spin' : ''}`} />
        <span>{isCarouselRotating ? 'Moving…' : canStepCarousel ? 'Advance carousel' : 'Carousel unavailable'}</span>
      </button>

      {/* Last commanded servo angles; there is no physical position sensor. */}
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

// ── Scenario economics and instrumentation-aware yield ──────────────────────
function ROICalculator() {
  const { state }  = useHylex();
  const dispatch   = useDispatch();
  const { plantCapacity } = state;

  // Industrial scale figures
  const mgTonDay         = (plantCapacity * SYNOPSIS.minerals_per_m3_kg / 1000).toFixed(2);
  const cleanM3Day       = (plantCapacity * 0.72).toFixed(0);
  const costReductionPct = Math.min(SYNOPSIS.cost_reduction_pct_max,
    SYNOPSIS.cost_reduction_pct_min + (plantCapacity / 5000) * 20).toFixed(0);

  // CAPEX comparison
  const hylexSell        = SYNOPSIS.capex_sell_usd;
  const zldMin           = SYNOPSIS.conventional_zld_min_usd;
  const savedVsZld       = ((zldMin - hylexSell) / 1000).toFixed(0);

  const hylexPer1000M3   = ((hylexSell / (plantCapacity * 365)) * 1000).toFixed(0);
  const zldPer1000M3     = ((zldMin    / (plantCapacity * 365)) * 1000).toFixed(0);

  return (
    <div className="hylex-panel rounded-[22px] p-4 sm:p-5 flex flex-col gap-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-emerald-500/10 border border-emerald-500/25 text-emerald-400">
            <Coins size={13} />
          </div>
          <span className="text-xs font-sans font-semibold text-white tracking-wide">B2B ROI &amp; Minerals</span>
        </div>
      <span className="text-[10px] font-sans text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/25">
          SCENARIO MODEL
        </span>
      </div>

      {/* Show uninstrumented prototype yield honestly; show projections separately. */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-2">
          <div className="text-[10px] text-slate-400 font-sans font-medium">Mineral mass measured</div>
          <div className="text-base font-bold font-mono text-emerald-400 leading-tight my-0.5">
            --<span className="text-[10px] text-slate-400 ml-0.5 font-normal">g</span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono">Model target: {mgTonDay} t/d at scale</div>
        </div>
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-2">
          <div className="text-[10px] text-slate-400 font-sans font-medium">Water volume measured</div>
          <div className="text-base font-bold font-mono text-cyan-400 leading-tight my-0.5">
            --<span className="text-[10px] text-slate-400 ml-0.5 font-normal">L</span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono">Model target: {cleanM3Day} m³/day</div>
        </div>
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-2">
          <div className="text-[10px] text-slate-400 font-sans font-medium">Scenario cost reduction</div>
          <div className="text-base font-bold font-mono text-amber-400 leading-tight my-0.5">{costReductionPct}%</div>
          <div className="text-[10px] text-slate-500 font-sans">vs. thermal evaporators</div>
        </div>
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-2">
          <div className="text-[10px] text-slate-400 font-sans font-medium">CAPEX saving vs. ZLD floor</div>
          <div className="text-base font-bold font-mono text-purple-300 leading-tight my-0.5">${savedVsZld}k</div>
          <div className="text-[10px] text-slate-500 font-sans">Scenario comparison only</div>
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
          CAPEX per 1,000 m³ annual throughput · scenario estimate
        </div>
        <div>
          <div className="flex justify-between text-[10px] font-sans mb-1">
            <span className="text-emerald-300 font-medium">Hylex System ($75k)</span>
            <span className="text-emerald-300 font-mono font-bold">${hylexPer1000M3}</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
            <div className="h-full rounded-full bg-emerald-500 transition-all duration-700"
              style={{ width: `${Math.min(100, (parseFloat(hylexPer1000M3) / parseFloat(zldPer1000M3)) * 100)}%` }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-[10px] font-sans mb-1">
            <span className="text-red-300 font-medium">Conventional ZLD ($250k)</span>
            <span className="text-red-300 font-mono font-bold">${zldPer1000M3}</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
            <div className="h-full rounded-full bg-red-500/70 w-full" />
          </div>
        </div>
      </div>

      {/* Prototype measurement limitation */}
      <div className="flex items-center gap-2 bg-slate-950/60 rounded-lg p-2 border border-slate-800 text-[11px] font-sans text-slate-300">
        <TrendingUp size={13} className="text-emerald-400 flex-shrink-0" />
        <span>
          Prototype has no mass, flow, or energy meter. Pod fill is an estimate; weigh dried solids and meter Tank B volume for measured yield.
        </span>
      </div>
    </div>
  );
}

export default function ControlPanel() {
  const { sendWsCommand } = useHylex();
  const [activeTab, setActiveTab] = useState('hardware'); // 'hardware' | 'roi'

  return (
      <div className="flex flex-col gap-3 h-full min-h-0 overflow-hidden">
      {/* Tab Switcher */}
      <div className="hylex-controls-tabs flex items-center rounded-full p-1 gap-1 flex-shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab('hardware')}
          className={`flex-1 py-2 text-[11px] font-medium rounded-full transition-all ${
            activeTab === 'hardware'
              ? 'bg-white/[.09] text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Controls
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('roi')}
          className={`flex-1 py-2 text-[11px] font-medium rounded-full transition-all ${
            activeTab === 'roi'
              ? 'bg-white/[.09] text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Project impact
        </button>
      </div>

      {/* Panels View */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-0.5" style={{ scrollbarWidth: 'thin' }}>
        {activeTab === 'hardware' && (
          <HardwarePanel sendWsCommand={sendWsCommand} />
        )}
        {activeTab === 'roi' && (
          <ROICalculator />
        )}
      </div>
    </div>
  );
}
