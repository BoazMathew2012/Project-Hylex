import { useHylex } from '../store/HylexContext';
import { useMemo, useState } from 'react';
import { BarChart2 } from 'lucide-react';
import { SYNOPSIS } from '../store/synopsis';

const THRESHOLD      = SYNOPSIS.tds_threshold_ppm;   // 500
const INDUSTRIAL_RAW = SYNOPSIS.industrial_raw_ppm;   // 70,000
const IND_TARGET     = 38500;                          // post-Hylex target

function RealtimeChart({ history, showIndustrial }) {
  const W = 620;
  const H = 220;
  const PAD = { left: 46, right: 16, top: 18, bottom: 32 };
  const cW  = W - PAD.left - PAD.right;
  const cH  = H - PAD.top  - PAD.bottom;

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
    const n = history.length;
    const lp = history.map((pt, i) => {
      const x = PAD.left + (i / (n - 1)) * cW;
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
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <defs>
        <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={accent} stopOpacity="0.22" />
          <stop offset="100%" stopColor={accent} stopOpacity="0.01" />
        </linearGradient>
      </defs>

      {/* Grid */}
      {yTicks.map(tick => {
        const y = PAD.top + cH * (1 - tick / maxY);
        return (
          <g key={tick}>
            <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="#1e293b" strokeWidth="1" />
            <text x={PAD.left - 4} y={y + 3.5} textAnchor="end" fontSize="7.5" fill="#475569" fontFamily="JetBrains Mono">{fmt(tick)}</text>
          </g>
        );
      })}

      {/* Threshold line */}
      <line x1={PAD.left} y1={thresholdY} x2={W - PAD.right} y2={thresholdY}
        stroke={isSafe ? '#34d399' : '#f87171'} strokeWidth="1.2" strokeDasharray="5 3" opacity="0.75" />
      <text x={W - PAD.right - 4} y={thresholdY - 4} textAnchor="end" fontSize="7" fill={isSafe ? '#34d399' : '#f87171'} fontFamily="JetBrains Mono">
        {showIndustrial ? '38,500 ppm (Hylex target)' : '500 ppm — Dubai benchmark'}
      </text>

      {/* Area + line */}
      {areaPath && <path d={areaPath} fill="url(#area-grad)" />}
      {points && (
        <polyline points={points} fill="none" stroke={accent} strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" />
      )}

      {/* Live dot */}
      {lastPt && (() => {
        const n  = history.length;
        const x  = PAD.left + cW;
        const v  = showIndustrial ? lastPt.industrial : lastPt.tds;
        const y  = PAD.top + cH * (1 - v / maxY);
        return (
          <g>
            <circle cx={x} cy={y} r="3.5" fill={accent} />
            <circle cx={x} cy={y} r="7" fill={accent} opacity="0.25">
              <animate attributeName="r"       values="3;10;3"   dur="1.6s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.3;0;0.3" dur="1.6s" repeatCount="indefinite" />
            </circle>
          </g>
        );
      })()}

      {/* X labels */}
      {xLabels.map((lbl, i) => (
        <text key={i} x={PAD.left + (i / (xLabels.length - 1)) * cW}
          y={H - 5} textAnchor="middle" fontSize="7" fill="#475569" fontFamily="JetBrains Mono">{lbl}</text>
      ))}

      {/* Y unit */}
      <text x={8} y={PAD.top + cH / 2} textAnchor="middle" fontSize="7" fill="#475569" fontFamily="JetBrains Mono"
        transform={`rotate(-90 8 ${PAD.top + cH / 2})`}>ppm</text>
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
    <div className="grid grid-cols-4 gap-1.5 mt-2">
      {stages.map((s, i) => (
        <div key={i} className="bg-slate-800/40 rounded p-2">
          <div className="text-[7.5px] text-slate-500 font-mono">{s.label}</div>
          <div className="text-[7px] text-slate-600 font-mono mb-1">{s.note}</div>
          <div className="h-1.5 rounded bg-slate-800 overflow-hidden">
            <div className="h-full rounded transition-all duration-1000"
              style={{ width: `${(s.ppm / max) * 100}%`, background: s.color }} />
          </div>
          <div className="text-[9px] font-mono mt-1" style={{ color: s.color }}>
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
  const { chartHistory, tds, tempC } = state;

  const minTds = chartHistory.length ? Math.min(...chartHistory.map(p => p.tds)).toFixed(0) : '--';
  const maxTds = chartHistory.length ? Math.max(...chartHistory.map(p => p.tds)).toFixed(0) : '--';
  const avgTds = chartHistory.length
    ? (chartHistory.reduce((a, p) => a + p.tds, 0) / chartHistory.length).toFixed(0) : '--';

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/80 backdrop-blur-sm p-3 flex flex-col gap-2 border-glow-cyan h-full">

      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <BarChart2 size={12} className="text-cyan-400" />
          <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">
            Live Salinity &amp; Thermal Telemetry
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] text-slate-600 font-mono">VIEW:</span>
          <button onClick={() => setShowIndustrial(false)}
            className={`px-2 py-0.5 rounded text-[9px] font-mono transition-all ${
              !showIndustrial ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-500 hover:text-slate-400'
            }`}>BENCHTOP</button>
          <button onClick={() => setShowIndustrial(true)}
            className={`px-2 py-0.5 rounded text-[9px] font-mono transition-all ${
              showIndustrial ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'text-slate-500 hover:text-slate-400'
            }`}>INDUSTRIAL</button>
        </div>
      </div>

      {/* Sub-header */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-[9px] font-mono text-slate-500">
          {showIndustrial
            ? `4-Stage trajectory: 70,000 → 38,500 ppm (${SYNOPSIS.cost_reduction_pct_min}–${SYNOPSIS.cost_reduction_pct_max}% cost reduction)`
            : `Gravity TDS Sensor — last 60s — Dubai 500 ppm benchmark`}
        </span>
        <span className="flex items-center gap-1 text-[9px] font-mono text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
          LIVE
        </span>
        <span className="ml-auto text-[11px] font-mono font-bold text-cyan-300">{tds.toFixed(1)} ppm</span>
      </div>

      {/* Chart */}
      <RealtimeChart history={chartHistory} showIndustrial={showIndustrial} />

      {/* Industrial stages or stats */}
      {showIndustrial
        ? <IndustrialTrajectory currentTds={tds} />
        : (
          <div className="grid grid-cols-5 gap-1.5 flex-shrink-0">
            {[
              { label: 'MIN TDS', val: `${minTds} ppm`, color: 'text-emerald-400' },
              { label: 'MAX TDS', val: `${maxTds} ppm`, color: 'text-red-400' },
              { label: 'AVG TDS', val: `${avgTds} ppm`, color: 'text-cyan-400' },
              { label: 'TEMP', val: `${tempC.toFixed(1)}°C`, color: 'text-amber-400' },
              { label: 'EC25 COMP', val: `${(tds / (1 + 0.02 * (tempC - 25))).toFixed(0)} ppm`, color: 'text-purple-400' },
            ].map(s => (
              <div key={s.label} className="bg-slate-800/50 border border-slate-700/40 rounded p-1.5 text-center min-w-0">
                <div className="text-[7.5px] text-slate-400 font-mono font-bold truncate">{s.label}</div>
                <div className={`text-[10px] font-bold font-mono ${s.color} truncate mt-0.5`}>{s.val}</div>
              </div>
            ))}
          </div>
        )
      }
    </div>
  );
}
