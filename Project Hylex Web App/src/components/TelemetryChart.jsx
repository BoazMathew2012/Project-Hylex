import { useHylex } from '../store/hooks';
import { useMemo, useState } from 'react';
import BarChart2 from 'lucide-react/dist/esm/icons/bar-chart-2.mjs';
import { SYNOPSIS } from '../store/synopsis';

const THRESHOLD      = SYNOPSIS.tds_threshold_ppm;   // 500
const INDUSTRIAL_RAW = SYNOPSIS.industrial_raw_ppm;   // 70,000
const IND_TARGET     = 38500;                          // post-Hylex target

const W = 620;
const H = 220;
const PAD = { left: 48, right: 20, top: 20, bottom: 32 };
const cW  = W - PAD.left - PAD.right;
const cH  = H - PAD.top  - PAD.bottom;

function RealtimeChart({ history, showIndustrial, isLiveOffline, tdsValid, tempValid }) {
  const maxY     = showIndustrial ? INDUSTRIAL_RAW * 1.05 : 1000;
  const threshold = showIndustrial ? IND_TARGET : THRESHOLD;
  const windowStart = history?.length ? history[history.length - 1].t - 30000 : 0;

  const points = useMemo(() => {
    if (!history || history.length < 2) return '';
    return history.map((pt) => {
      const x = PAD.left + ((pt.t - windowStart) / 30000) * cW;
      const v = showIndustrial ? pt.industrial : pt.tds;
      const y = PAD.top + cH * (1 - v / maxY);
      return `${x},${y}`;
    }).join(' ');
  }, [history, showIndustrial, maxY, windowStart]);

  const areaPath = useMemo(() => {
    if (!history || history.length < 2) return '';
    const lp = history.map((pt) => {
      const x = PAD.left + ((pt.t - windowStart) / 30000) * cW;
      const v = showIndustrial ? pt.industrial : pt.tds;
      const y = PAD.top + cH * (1 - v / maxY);
      return `${x},${y}`;
    });
    return `M${PAD.left},${PAD.top + cH} L${lp.join(' L')} L${PAD.left + cW},${PAD.top + cH} Z`;
  }, [history, showIndustrial, maxY, windowStart]);

  const thresholdY = PAD.top + cH * (1 - threshold / maxY);
  const lastPt     = history[history.length - 1];
  const currentVal = lastPt ? (showIndustrial ? lastPt.industrial : lastPt.tds) : 0;
  const isSafe     = lastPt ? (showIndustrial ? currentVal <= IND_TARGET : currentVal <= THRESHOLD) : null;
  const accent     = isSafe === null ? '#68819a' : isSafe ? '#65d8ae' : '#f28b83';
  const thresholdColor = isSafe === null ? '#70839a' : isSafe ? '#65d8ae' : '#f28b83';

  const yTicks = showIndustrial
    ? [0, 17500, 35000, 52500, 70000]
    : [0, 250, 500, 750, 1000];
  const fmt = showIndustrial
    ? v => `${(v / 1000).toFixed(0)}k`
    : v => `${v}`;

  const xLabels = ['-30s', '-22.5s', '-15s', '-7.5s', 'NOW'];

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
        stroke={thresholdColor} strokeWidth="1.2" strokeDasharray="5 4" opacity="0.78" />
      <text x={W - PAD.right - 4} y={thresholdY - 6} textAnchor="end" fontSize="8.5" fill={thresholdColor} fontFamily="JetBrains Mono" fontWeight="600">
        {showIndustrial ? '38,500 ppm target' : '500 ppm target'}
      </text>

      {/* Empty / offline status notice */}
      {(!history || history.length < 2) && (
        <g>
          <rect x={PAD.left + cW / 2 - 113} y={PAD.top + cH * 0.36 - 13} width="226" height="26" rx="13" fill="#0b1422" stroke="#253249" strokeWidth="1" />
          <text
            x={PAD.left + cW / 2}
            y={PAD.top + cH * 0.36 + 3}
            textAnchor="middle"
            fontSize="9.5"
            fill="#9aabc1"
            fontFamily="Inter, sans-serif"
            fontWeight="500"
          >
            {isLiveOffline
              ? 'Waiting for ESP32 connection'
              : !tdsValid
                ? 'Check TDS probe'
                : !tempValid
                  ? 'Check temperature sensor'
                  : 'Collecting live samples…'}
          </text>
        </g>
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

// Scenario view: the industrial values are synopsis targets, not prototype data.
function IndustrialTrajectory({ currentTds }) {
  const outputEstimate = Number.isFinite(currentTds) ? Math.round(currentTds * SYNOPSIS.industrial_scale) : null;
  return (
    <div className="grid grid-cols-3 gap-2 mt-2">
      <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-2.5">
        <div className="text-[10px] text-slate-300 font-sans font-medium">Synopsis reference feed</div>
        <div className="text-xs font-mono font-bold mt-1.5 text-red-300">70,000 ppm</div>
      </div>
      <div className="bg-slate-950/60 border border-cyan-500/20 rounded-lg p-2.5">
        <div className="text-[10px] text-slate-300 font-sans font-medium">82.35× scale-model output</div>
        <div className="text-xs font-mono font-bold mt-1.5 text-cyan-300">{outputEstimate === null ? '--' : `${outputEstimate.toLocaleString()} ppm`}</div>
      </div>
      <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-2.5">
        <div className="text-[10px] text-slate-300 font-sans font-medium">Synopsis target</div>
        <div className="text-xs font-mono font-bold mt-1.5 text-emerald-300">38,500 ppm</div>
      </div>
      <div className="col-span-3 text-[9px] text-slate-500 font-sans text-center">
        Illustrative industrial scenario only · intermediate removal and full-scale performance are not measured by this prototype.
      </div>
    </div>
  );
}

export default function TelemetryChart() {
  const { state } = useHylex();
  const [showIndustrial, setShowIndustrial] = useState(false);
  const { chartHistory, tds, tdsValid, tempValid, mode, wsStatus } = state;
  const isLiveOffline = mode === 'live' && wsStatus !== 'connected';

  const avgTds = chartHistory.length
    ? (chartHistory.reduce((a, p) => a + p.tds, 0) / chartHistory.length).toFixed(0) : (tdsValid ? tds.toFixed(0) : '--');

  return (
    <div className="hylex-panel rounded-[22px] p-4 sm:p-5 flex flex-col justify-between h-full shadow-sm overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0 mb-1.5">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 grid place-items-center rounded-xl bg-cyan-300/8 border border-cyan-200/10 text-cyan-200">
            <BarChart2 size={16} strokeWidth={1.8} />
          </div>
          <div>
            <span className="text-sm font-semibold text-white tracking-tight">Water quality</span>
            <div className="mt-0.5 text-[10px] text-slate-500">Live salinity trend</div>
          </div>
        </div>

        <div className={`hidden sm:flex items-center gap-2 mr-auto ml-4 px-2.5 py-1.5 rounded-full border text-[10px] font-medium ${isLiveOffline ? 'border-rose-300/10 bg-rose-300/[.05] text-rose-200/80' : tdsValid && tempValid ? 'border-emerald-300/10 bg-emerald-300/[.05] text-emerald-200/80' : 'border-white/[.07] bg-white/[.025] text-slate-400'}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${isLiveOffline ? 'bg-rose-300' : tdsValid && tempValid ? 'bg-emerald-300' : 'bg-slate-500'}`} />
          {isLiveOffline ? 'Awaiting connection' : tdsValid && tempValid ? 'Sensors active' : 'Waiting for sensor data'}
        </div>

        {/* View Switcher Pill */}
        <div className="flex items-center bg-slate-950 rounded-lg p-0.5 border border-slate-800">
          <button
            type="button"
            onClick={() => setShowIndustrial(false)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-all ${
              !showIndustrial
                ? 'bg-white/[.09] text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Prototype
          </button>
          <button
            type="button"
            onClick={() => setShowIndustrial(true)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-all ${
              showIndustrial
                ? 'bg-white/[.09] text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Scale scenario
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="flex-1 min-h-0 flex flex-col my-1">
        <RealtimeChart history={chartHistory} showIndustrial={showIndustrial} isLiveOffline={isLiveOffline} tdsValid={tdsValid} tempValid={tempValid} />
      </div>

      {/* Bottom Summary Bar or Industrial Stages */}
      {showIndustrial ? (
        <IndustrialTrajectory currentTds={tdsValid && tempValid ? tds : null} />
      ) : (
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 flex-shrink-0">
          {[
            { label: 'Current', val: tdsValid ? `${tds.toFixed(0)} ppm` : '—', color: 'text-cyan-300' },
            { label: 'Average', val: `${avgTds} ppm`, color: 'text-slate-200' },
            { label: 'Reuse goal', val: `≤${THRESHOLD} ppm`, color: 'text-emerald-300' },
          ].map(s => (
          <div key={s.label} className="rounded-xl border border-white/[.055] bg-slate-950/35 px-3 py-2 text-center">
            <div className="text-[9px] text-slate-500 font-medium uppercase tracking-[.12em] truncate">{s.label}</div>
            <div className={`text-[13px] font-mono font-semibold ${s.color} truncate mt-1`}>{s.val}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
