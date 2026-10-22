import { useState, useMemo } from 'react';
import { useHylex } from '../store/HylexContext';
import { predictTimeToTarget, RELIABILITY_LEVEL, PREDICTION_STATUS } from '../utils/predictionEngine';
import {
  Clock, Target, RotateCcw, Info
} from 'lucide-react';

/**
 * SVG Chart displaying Observed TDS History + Configured Target Line + Extrapolated Projection
 */
function PredictiveChart({ history, prediction, targetTds }) {
  const W = 580;
  const H = 220;
  const PAD = { left: 48, right: 24, top: 20, bottom: 32 };
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;

  const validPoints = history || [];
  const projectionPoints = prediction?.projectionPoints || [];

  // Determine X and Y bounds
  const allTdsValues = [
    ...validPoints.map(p => p.tds),
    ...projectionPoints.map(p => p.tds),
    targetTds,
  ].filter(Number.isFinite);

  const minY = Math.max(0, Math.min(...allTdsValues, targetTds - 50));
  const maxY = Math.min(1000, Math.max(...allTdsValues, targetTds + 50, 600));
  const rangeY = maxY - minY || 1;

  // Time bounds
  const tMin = validPoints.length > 0 ? validPoints[0].t : 0;
  const tMaxObserved = validPoints.length > 0 ? validPoints[validPoints.length - 1].t : 30000;
  const tMaxProjected = projectionPoints.length > 0 ? projectionPoints[projectionPoints.length - 1].t : tMaxObserved;
  const totalTimeSpan = Math.max(10000, tMaxProjected - tMin);

  // Map coordinate functions
  const getX = (t) => PAD.left + ((t - tMin) / totalTimeSpan) * cW;
  const getY = (v) => PAD.top + cH * (1 - (v - minY) / rangeY);

  // Observed Polyline Path
  const observedPath = validPoints.length >= 2
    ? validPoints.map(p => `${getX(p.t)},${getY(p.tds)}`).join(' ')
    : '';

  // Projected Polyline Path
  const lastObs = validPoints[validPoints.length - 1];
  const pts = [lastObs, ...projectionPoints].filter(Boolean);
  const projectedPath = projectionPoints.length >= 2
    ? pts.map(p => `${getX(p.t)},${getY(p.tds)}`).join(' ')
    : '';

  // Target Line Y
  const targetY = getY(targetTds);

  // Y-axis ticks
  const yTicks = [
    Math.round(minY),
    Math.round(minY + rangeY * 0.33),
    Math.round(minY + rangeY * 0.66),
    Math.round(maxY),
  ];

  return (
    <div className="relative w-full flex-1 flex flex-col justify-between">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full flex-1">
        <defs>
          <linearGradient id="obs-area-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.20" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {yTicks.map(tick => (
          <g key={tick}>
            <line x1={PAD.left} y1={getY(tick)} x2={W - PAD.right} y2={getY(tick)} stroke="#1e293b" strokeWidth="1" strokeDasharray="2 4" />
            <text x={PAD.left - 6} y={getY(tick) + 3} textAnchor="end" fontSize="8" fill="#64748b" fontFamily="JetBrains Mono">
              {tick}
            </text>
          </g>
        ))}

        {/* Target Dotted Line */}
        <line
          x1={PAD.left} y1={targetY}
          x2={W - PAD.right} y2={targetY}
          stroke="#10b981" strokeWidth="1.4" strokeDasharray="4 3" opacity="0.85"
        />
        <text x={W - PAD.right} y={targetY - 5} textAnchor="end" fontSize="8.5" fill="#10b981" fontFamily="JetBrains Mono" fontWeight="600">
          Target: {targetTds} ppm (Dubai Standard)
        </text>

        {/* Observed Data Polyline */}
        {observedPath && (
          <polyline
            points={observedPath}
            fill="none"
            stroke="#22d3ee"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Observed Last Point Dot */}
        {validPoints.length > 0 && (
          <circle
            cx={getX(validPoints[validPoints.length - 1].t)}
            cy={getY(validPoints[validPoints.length - 1].tds)}
            r="3.5"
            fill="#22d3ee"
          />
        )}

        {/* Extrapolated Projection Line */}
        {projectedPath && (
          <polyline
            points={projectedPath}
            fill="none"
            stroke="#c084fc"
            strokeWidth="2"
            strokeDasharray="4 3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Extrapolated Target Completion Dot */}
        {projectionPoints.length > 0 && (
          <g>
            <circle
              cx={getX(projectionPoints[projectionPoints.length - 1].t)}
              cy={getY(projectionPoints[projectionPoints.length - 1].tds)}
              r="4"
              fill="#c084fc"
            />
            <circle
              cx={getX(projectionPoints[projectionPoints.length - 1].t)}
              cy={getY(projectionPoints[projectionPoints.length - 1].tds)}
              r="8"
              fill="none"
              stroke="#c084fc"
              strokeWidth="1"
              opacity="0.3"
            >
              <animate attributeName="r" values="4;9;4" dur="2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.4;0.05;0.4" dur="2s" repeatCount="indefinite" />
            </circle>
          </g>
        )}

        {/* X-axis time labels */}
        <text x={PAD.left} y={H - 8} fontSize="8" fill="#64748b" fontFamily="JetBrains Mono">
          Window Start (-30s)
        </text>
        <text x={getX(tMaxObserved)} y={H - 8} textAnchor="middle" fontSize="8" fill="#22d3ee" fontFamily="JetBrains Mono" fontWeight="600">
          NOW
        </text>
        {projectionPoints.length > 0 && (
          <text x={getX(tMaxProjected)} y={H - 8} textAnchor="end" fontSize="8" fill="#c084fc" fontFamily="JetBrains Mono" fontWeight="600">
            Projected Completion
          </text>
        )}

        {/* Y Axis Label */}
        <text x={12} y={PAD.top + cH / 2} textAnchor="middle" fontSize="8" fill="#64748b" fontFamily="JetBrains Mono" transform={`rotate(-90 12 ${PAD.top + cH / 2})`}>
          TDS (ppm)
        </text>
      </svg>

      {/* Chart Legend */}
      <div className="flex items-center justify-between text-[10px] font-sans px-3 py-1.5 bg-slate-950/70 border-t border-slate-800 rounded-b-lg">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-cyan-400">
            <span className="w-2.5 h-0.5 bg-cyan-400 inline-block rounded" />
            Observed Telemetry
          </span>
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-2.5 h-0.5 bg-emerald-400 border-dashed border-b inline-block" />
            Target ({targetTds} ppm)
          </span>
          {projectionPoints.length > 0 && (
            <span className="flex items-center gap-1.5 text-purple-300">
              <span className="w-2.5 h-0.5 bg-purple-400 border-dashed border-b inline-block" />
              Linear Projection (OLS)
            </span>
          )}
        </div>
        <span className="text-slate-400 font-mono text-[10px]">
          N = {prediction.sampleCount} · R² = {(prediction.rSquared * 100).toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

export default function PredictiveAnalytics() {
  const { state } = useHylex();
  const [targetTds, setTargetTds] = useState(500);

  // Compute live prediction from rolling history
  const prediction = useMemo(() => {
    return predictTimeToTarget(state.chartHistory, targetTds, 30);
  }, [state.chartHistory, targetTds]);

  // Reliability styling
  const reliabilityBadge = {
    [RELIABILITY_LEVEL.HIGH]: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
    [RELIABILITY_LEVEL.MODERATE]: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
    [RELIABILITY_LEVEL.LOW]: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
    [RELIABILITY_LEVEL.UNRELIABLE]: 'bg-slate-800 text-slate-400 border-slate-700',
  }[prediction.reliability] || 'bg-slate-800 text-slate-400 border-slate-700';

  const isTargetMet = prediction.status === PREDICTION_STATUS.TARGET_MET;
  const isRising = prediction.status === PREDICTION_STATUS.NOT_PREDICTING_RISING;
  const isFlat = prediction.status === PREDICTION_STATUS.NOT_PREDICTING_FLAT;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/85 backdrop-blur-sm p-3.5 flex flex-col gap-3 h-full shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/25 text-cyan-400">
            <Clock size={15} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-sans font-semibold text-white tracking-wide">
                Time-to-Target &amp; Pass Predictor
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-mono ${reliabilityBadge}`}>
                Reliability: {prediction.reliability}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-sans">
              Ordinary least squares (OLS) linear kinetics over rolling 30s window
            </div>
          </div>
        </div>

        {/* Target Configuration Input */}
        <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1">
          <Target size={13} className="text-emerald-400" />
          <span className="text-[11px] font-sans text-slate-400 font-medium">Target:</span>
          <input
            type="number"
            min="100"
            max="900"
            step="10"
            value={targetTds}
            onChange={(e) => setTargetTds(Number(e.target.value) || 500)}
            className="w-14 bg-slate-900 text-xs font-mono font-bold text-emerald-300 text-center rounded px-1 py-0.5 border border-slate-700 outline-none"
          />
          <span className="text-[11px] font-mono text-slate-500">ppm</span>
          {targetTds !== 500 && (
            <button
              type="button"
              onClick={() => setTargetTds(500)}
              title="Reset to 500 ppm Dubai standard"
              className="text-slate-400 hover:text-white transition-colors"
            >
              <RotateCcw size={11} />
            </button>
          )}
        </div>
      </div>

      {/* Main KPI Row */}
      <div className="grid grid-cols-4 gap-2 flex-shrink-0">
        {/* Card 1: Live TDS */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-2.5 flex flex-col justify-between">
          <div className="text-[10px] font-sans text-slate-400 font-medium uppercase tracking-wider">Measured TDS</div>
          <div className="flex items-baseline gap-1.5 my-1">
            <span className="text-2xl font-bold font-mono text-cyan-300">
              {state.tds.toFixed(1)}
            </span>
            <span className="text-xs font-mono text-slate-500">ppm</span>
          </div>
          <div className="text-[10px] font-sans text-slate-400">
            Compensated: <span className="text-slate-200 font-mono">{(state.tds / (1 + 0.02 * (state.tempC - 25))).toFixed(1)} ppm</span>
          </div>
        </div>

        {/* Card 2: Reduction Rate */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-2.5 flex flex-col justify-between">
          <div className="text-[10px] font-sans text-slate-400 font-medium uppercase tracking-wider">TDS Kinetic Rate</div>
          <div className="flex items-baseline gap-1.5 my-1">
            <span className={`text-xl font-bold font-mono ${
              prediction.reductionRatePpmMin < -1 ? 'text-emerald-400' :
              prediction.reductionRatePpmMin > 1 ? 'text-red-400' : 'text-slate-200'
            }`}>
              {prediction.reductionRatePpmMin > 0 ? '+' : ''}
              {prediction.reductionRatePpmMin.toFixed(1)}
            </span>
            <span className="text-[10px] font-mono text-slate-500">ppm/min</span>
          </div>
          <div className="text-[10px] font-sans text-slate-400">
            {(prediction.reductionRatePpmSec).toFixed(2)} ppm/sec
          </div>
        </div>

        {/* Card 3: Predicted Time */}
        <div className={`rounded-lg p-2.5 border flex flex-col justify-between ${
          isTargetMet ? 'bg-emerald-500/10 border-emerald-500/30' :
          isRising || isFlat ? 'bg-amber-500/10 border-amber-500/30' :
          'bg-slate-950/60 border-slate-800'
        }`}>
          <div className="text-[10px] font-sans text-slate-400 font-medium uppercase tracking-wider">Time to Target</div>
          <div className="my-1">
            <div className={`text-lg font-bold font-mono leading-tight ${
              isTargetMet ? 'text-emerald-300' :
              isRising ? 'text-amber-300' :
              'text-purple-300'
            }`}>
              {prediction.predictedTimeFormatted}
            </div>
          </div>
          <div className="text-[10px] font-sans text-slate-400 truncate">
            {prediction.statusMessage}
          </div>
        </div>

        {/* Card 4: Pass Estimation */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-2.5 flex flex-col justify-between">
          <div className="text-[10px] font-sans text-slate-400 font-medium uppercase tracking-wider">Pass Prediction</div>
          <div className="my-1">
            <span className="text-xs font-sans font-semibold text-amber-300">
              Continuous Loop
            </span>
          </div>
          <div className="text-[10px] font-sans text-slate-400 leading-tight">
            Volume totalizer uninstrumented; continuous flow.
          </div>
        </div>
      </div>

      {/* Projection Chart */}
      <div className="flex-1 min-h-0 bg-slate-950/60 border border-slate-800 rounded-lg p-2.5 flex flex-col justify-between">
        <PredictiveChart
          history={state.chartHistory}
          prediction={prediction}
          targetTds={targetTds}
        />
      </div>

      {/* Transparent Limitation Footer */}
      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-950/40 border border-slate-800 text-[10px] font-sans text-slate-400 flex-shrink-0">
        <Info size={13} className="text-cyan-400 flex-shrink-0 mt-0.5" />
        <span className="leading-relaxed">
          <strong className="text-slate-300">Methodology Note:</strong> Prediction utilizes ordinary least squares (OLS) linear extrapolation across a rolling 30-second window (N ≥ 8). Pass count estimation is kept honest: because Project Hylex operates via continuous hydro-cyclone recirculation, discrete pass quantification requires volumetric flow totalizers.
        </span>
      </div>
    </div>
  );
}
