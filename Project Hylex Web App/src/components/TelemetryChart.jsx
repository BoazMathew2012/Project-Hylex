import { useHylex } from '../store/HylexContext';
import { useMemo, useState } from 'react';
import { BarChart2 } from 'lucide-react';
import { SYNOPSIS } from '../store/synopsis';

const THRESHOLD      = SYNOPSIS.tds_threshold_ppm;   // 500
const INDUSTRIAL_RAW = SYNOPSIS.industrial_raw_ppm;   // 70,000
const IND_TARGET     = 38500;                          // post-Hylex target

const W = 620;
const H = 220;
const PAD = { left: 48, right: 20, top: 20, bottom: 32 };
const cW  = W - PAD.left - PAD.right;
const cH  = H - PAD.top  - PAD.bottom;

function RealtimeChart({ history, showIndustrial, isLiveOffline }) {
  const maxY     = showIndustrial ? INDUSTRIAL_RAW * 1.05 : 1000;
  const threshold = showIndustrial ? IND_TARGET : THRESHOLD;

  const points = useMemo(() => {
    if (!history || history.length < 2) return '';
    const n = history.length;
    return history.map((pt, i) => {
      const x = PAD.left + (i / (n - 1)) * cW;
      const v = showIndustrial ? pt.industrial : pt.tds;
      const y = PAD.top + cH * (1 - v / maxY);
      return `${x},${y}`;
    }).join(' ');
  }, [history, showIndustrial, maxY]);

  const areaPath = useMemo(() => {
    if (!history || history.length < 2) return '';
    const lp = history.map((pt, i) => {
      const x = PAD.left + (i / (history.length - 1)) * cW;
      const v = showIndustrial ? pt.industrial : pt.tds;
      const y = PAD.top + cH * (1 - v / maxY);
      return `${x},${y}`;
    });
    return `M${PAD.left},${PAD.top + cH} L${lp.join(' L')} L${PAD.left + cW},${PAD.top + cH} Z`;
  }, [history, showIndustrial, maxY]);

  const thresholdY = PAD.top + cH * (1 - threshold / maxY);
  const lastPt     = history[history.length - 1];
  const currentVal = lastPt ? (showIndustrial ? lastPt.industrial : lastPt.tds) : 0;
  const isSafe     = showIndustrial ? currentVal <= IND_TARGET : currentVal <= THRESHOLD;
  const accent     = isSafe ? '#34d399' : '#f87171';

  const yTicks = showIndustrial
    ? [0, 17500, 35000, 52500, 70000]
    : [0, 250, 500, 750, 1000];
  const fmt = showIndustrial
    ? v => `${(v / 1000).toFixed(0)}k`
    : v => `${v}`;

  const xLabels = ['-60s', '-45s', '-30s', '-15s', 'NOW'];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full flex-1">
      <defs>
        <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={accent} stopOpacity="0.20" />
          <stop offset="100%" stopColor={accent} stopOpacity="0.01" />
        </linearGradient>
      </defs>

      {/* Grid */}
      {yTicks.map(tick => {
        const y = PAD.top + cH * (1 - tick / maxY);
        return (
          <g key={tick}>
            <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="#1e293b" strokeWidth="1" strokeDasharray="2 4" />
            <text x={PAD.left - 6} y={y + 3.5} textAnchor="end" fontSize="8" fill="#64748b" fontFamily="JetBrains Mono">{fmt(tick)}</text>
          </g>
        );
      })}

      {/* Threshold line */}
      <line x1={PAD.left} y1={thresholdY} x2={W - PAD.right} y2={thresholdY}
        stroke={isSafe ? '#34d399' : '#f87171'} strokeWidth="1.4" strokeDasharray="5 3" opacity="0.8" />
      <text x={W - PAD.right - 4} y={thresholdY - 5} textAnchor="end" fontSize="8.5" fill={isSafe ? '#34d399' : '#f87171'} fontFamily="JetBrains Mono" fontWeight="600">
        {showIndustrial ? '38,500 ppm — Hylex Target' : '500 ppm — Dubai Potable Standard'}
      </text>

      {/* Empty / offline status notice */}
      {(!history || history.length === 0) && (
        <text
          x={PAD.left + cW / 2}
          y={PAD.top + cH / 2}
          textAnchor="middle"
          fontSize="9.5"
          fill="#64748b"
          fontFamily="JetBrains Mono"
        >
          {isLiveOffline ? 'ESP32 Offline · All Numerics 0 · Click Connect to stream' : 'Awaiting telemetry packets…'}
        </text>
      )}

      {/* Area + line */}
      {areaPath && <path d={areaPath} fill="url(#area-grad)" />}
      {points && (
        <polyline points={points} fill="none" stroke={accent} strokeWidth="2.2"
          strokeLinecap="round" strokeLinejoin="round" />
      )}

      {/* Live dot */}
      {lastPt && (() => {
        const x  = PAD.left + cW;
        const v  = showIndustrial ? lastPt.industrial : lastPt.tds;
        const y  = PAD.top + cH * (1 - v / maxY);
        return (
          <g>
            <circle cx={x} cy={y} r="3.5" fill={accent} />
            <circle cx={x} cy={y} r="7" fill={accent} opacity="0.25">
              <animate attributeName="r" values="3.5;9;3.5" dur="1.8s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.3;0;0.3" dur="1.8s" repeatCount="indefinite" />
            </circle>
          </g>
        );
      })()}

      {/* X labels */}
      {xLabels.map((lbl, i) => (
        <text key={i} x={PAD.left + (i / (xLabels.length - 1)) * cW}
          y={H - 8} textAnchor="middle" fontSize="8" fill="#64748b" fontFamily="JetBrains Mono">{lbl}</text>
      ))}

      {/* Y unit */}
      <text x={12} y={PAD.top + cH / 2} textAnchor="middle" fontSize="8" fill="#64748b" fontFamily="JetBrains Mono"
        transform={`rotate(-90 12 ${PAD.top + cH / 2})`}>ppm</text>
    </svg>
  );
}

// 4-stage industrial trajectory — accurate to synopsis process flow
function IndustrialTrajectory({ currentTds }) {
  const stages = [
    { label: 'Stage 1 — EC Pre-treat',  ppm: 70000, color: '#ef4444', note: 'Raw brine + NaHCO₃' },
    { label: 'Stage 2 — Vortex Sep.',    ppm: 55000, color: '#f97316', note: 'Helix centrifuge' },
    { label: 'Stage 3 — EC Crystallise', ppm: 42000, color: '#fbbf24', note: 'Graphite anode pod' },
    { label: 'Stage 4 — Hylex Output',   ppm: Math.round(currentTds * SYNOPSIS.industrial_scale), color: '#34d399', note: 'Tank B verified' },
  ];
  const max = 70000;
  return (
    <div className="grid grid-cols-4 gap-2 mt-2">
      {stages.map((s, i) => (
        <div key={i} className="bg-slate-950/60 border border-slate-800 rounded-lg p-2.5">
          <div className="text-[10px] text-slate-300 font-sans font-medium">{s.label}</div>
          <div className="text-[9px] text-slate-500 font-sans mb-1.5">{s.note}</div>
          <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${(s.ppm / max) * 100}%`, background: s.color }} />
          </div>
          <div className="text-xs font-mono font-bold mt-1.5" style={{ color: s.color }}>
            {s.ppm >= 1000 ? `${(s.ppm / 1000).toFixed(1)}k` : s.ppm} ppm
          </div>
        </div>
      ))}
    </div>
  );
}

export default function TelemetryChart() {
  const { state } = useHylex();
  const [showIndustrial, setShowIndustrial] = useState(false);
  const { chartHistory, tds, tempC, mode, wsStatus } = state;
  const isLiveOffline = mode === 'live' && wsStatus !== 'connected';

  const minTds = chartHistory.length ? Math.min(...chartHistory.map(p => p.tds)).toFixed(0) : (tds === 0 ? '0' : '--');
  const maxTds = chartHistory.length ? Math.max(...chartHistory.map(p => p.tds)).toFixed(0) : (tds === 0 ? '0' : '--');
  const avgTds = chartHistory.length
    ? (chartHistory.reduce((a, p) => a + p.tds, 0) / chartHistory.length).toFixed(0) : (tds === 0 ? '0' : '--');
  const compEC25 = tds > 0 && (1 + 0.02 * (tempC - 25)) > 0 ? (tds / (1 + 0.02 * (tempC - 25))).toFixed(0) : '0';

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/85 backdrop-blur-sm p-3.5 flex flex-col justify-between h-full shadow-sm">

      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0 mb-1.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/25 text-cyan-400">
            <BarChart2 size={14} />
          </div>
          <div>
            <span className="text-xs font-sans font-semibold text-white tracking-wide">
              Live Salinity &amp; Thermal Telemetry
            </span>
            <div className="text-[10px] text-slate-400 font-sans">
              {showIndustrial
                ? `Industrial Trajectory: 70,000 → 38,500 ppm (${SYNOPSIS.cost_reduction_pct_min}–${SYNOPSIS.cost_reduction_pct_max}% OPEX reduction)`
                : 'Continuous 60-second Gravity TDS window vs 500 ppm potable threshold'}
            </div>
          </div>
        </div>

        {/* View Switcher Pill */}
        <div className="flex items-center bg-slate-950 rounded-lg p-0.5 border border-slate-800">
          <button
            type="button"
            onClick={() => setShowIndustrial(false)}
            className={`px-2.5 py-1 rounded text-xs font-sans font-medium transition-colors ${
              !showIndustrial
                ? 'bg-slate-800 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Benchtop (1k)
          </button>
          <button
            type="button"
            onClick={() => setShowIndustrial(true)}
            className={`px-2.5 py-1 rounded text-xs font-sans font-medium transition-colors ${
              showIndustrial
                ? 'bg-slate-800 text-amber-300 border border-amber-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Industrial (70k)
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="flex-1 min-h-0 flex flex-col my-1">
        <RealtimeChart history={chartHistory} showIndustrial={showIndustrial} isLiveOffline={isLiveOffline} />
      </div>

      {/* Bottom Summary Bar or Industrial Stages */}
      {showIndustrial ? (
        <IndustrialTrajectory currentTds={tds} />
      ) : (
        <div className="grid grid-cols-5 gap-2 pt-2 border-t border-slate-800 flex-shrink-0">
          {[
            { label: 'Minimum TDS', val: `${minTds} ppm`, color: 'text-emerald-400' },
            { label: 'Maximum TDS', val: `${maxTds} ppm`, color: 'text-red-400' },
            { label: 'Average TDS', val: `${avgTds} ppm`, color: 'text-cyan-400' },
            { label: 'Fluid Temp', val: `${tempC.toFixed(1)}°C`, color: 'text-amber-400' },
            { label: 'Compensated EC₂₅', val: `${compEC25} ppm`, color: 'text-purple-400' },
          ].map(s => (
            <div key={s.label} className="bg-slate-950/60 border border-slate-800/80 rounded-lg px-2.5 py-1.5 text-center">
              <div className="text-[10px] text-slate-400 font-sans font-medium truncate">{s.label}</div>
              <div className={`text-xs font-mono font-bold ${s.color} truncate mt-0.5`}>{s.val}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
