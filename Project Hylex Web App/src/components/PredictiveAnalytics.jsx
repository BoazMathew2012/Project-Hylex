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
  const tMin = validPoints.length > 0 ? validPoints[0].t : Date.now() - 30000;
  const tMaxObserved = validPoints.length > 0 ? validPoints[validPoints.length - 1].t : Date.now();
  const tMaxProjected = projectionPoints.length > 0 ? projectionPoints[projectionPoints.length - 1].t : tMaxObserved;
  const totalTimeSpan = Math.max(10000, tMaxProjected - tMin);

  // Map coordinate functions
  const getX = (t) => PAD.left + ((t - tMin) / totalTimeSpan) * cW;
  const getY = (v) => PAD.top + cH * (1 - (v - minY) / rangeY);

  // Observed Polyline Path
  const observedPath = useMemo(() => {
    if (validPoints.length < 2) return '';
    return validPoints.map(p => `${getX(p.t)},${getY(p.tds)}`).join(' ');
  }, [validPoints, tMin, totalTimeSpan, minY, rangeY]);

  // Projected Polyline Path
  const projectedPath = useMemo(() => {
    if (projectionPoints.length < 2) return '';
    const lastObs = validPoints[validPoints.length - 1];
    const pts = [lastObs, ...projectionPoints].filter(Boolean);
    return pts.map(p => `${getX(p.t)},${getY(p.tds)}`).join(' ');
  }, [validPoints, projectionPoints, tMin, totalTimeSpan, minY, rangeY]);

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
    <div className="relative w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <defs>
          <linearGradient id="obs-area-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id="proj-area-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.20" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {yTicks.map(tick => (
          <g key={tick}>
            <line x1={PAD.left} y1={getY(tick)} x2={W - PAD.right} y2={getY(tick)} stroke="#1e293b" strokeWidth="1" />
            <text x={PAD.left - 6} y={getY(tick) + 3} textAnchor="end" fontSize="7.5" fill="#475569" fontFamily="JetBrains Mono">
              {tick}
            </text>
          </g>
        ))}

        {/* Target Dotted Line */}
        <line
          x1={PAD.left} y1={targetY}
          x2={W - PAD.right} y2={targetY}
          stroke="#10b981" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.85"
        />
        <text x={W - PAD.right} y={targetY - 5} textAnchor="end" fontSize="8" fill="#10b981" fontFamily="JetBrains Mono" fontWeight="bold">
          TARGET: {targetTds} ppm
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
            r="4"
            fill="#22d3ee"
            stroke="#083344"
            strokeWidth="1.5"
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
              r="4.5"
              fill="#c084fc"
              stroke="#581c87"
              strokeWidth="1.5"
            />
            <circle
              cx={getX(projectionPoints[projectionPoints.length - 1].t)}
              cy={getY(projectionPoints[projectionPoints.length - 1].tds)}
              r="8"
              fill="none"
              stroke="#c084fc"
              strokeWidth="1"
              opacity="0.4"
            >
              <animate attributeName="r" values="4;10;4" dur="2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.6;0.1;0.6" dur="2s" repeatCount="indefinite" />
            </circle>
          </g>
        )}

        {/* X-axis time label */}
        <text x={PAD.left} y={H - 8} fontSize="7.5" fill="#64748b" fontFamily="JetBrains Mono">
          Window Start (-30s)
        </text>
        <text x={getX(tMaxObserved)} y={H - 8} textAnchor="middle" fontSize="7.5" fill="#22d3ee" fontFamily="JetBrains Mono" fontWeight="bold">
          NOW
        </text>
        {projectionPoints.length > 0 && (
          <text x={getX(tMaxProjected)} y={H - 8} textAnchor="end" fontSize="7.5" fill="#c084fc" fontFamily="JetBrains Mono" fontWeight="bold">
            Projected Completion
          </text>
        )}

        {/* Y Axis Label */}
        <text x={10} y={PAD.top + cH / 2} textAnchor="middle" fontSize="7.5" fill="#64748b" fontFamily="JetBrains Mono" transform={`rotate(-90 10 ${PAD.top + cH / 2})`}>
          TDS (ppm)
        </text>
      </svg>

      {/* Chart Legend */}
      <div className="flex items-center justify-between text-[8px] font-mono px-2 py-1 bg-slate-950/60 border-t border-slate-800 rounded-b">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-cyan-400">
            <span className="w-2.5 h-0.5 bg-cyan-400 inline-block rounded" />
            Observed Telemetry
          </span>
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-2.5 h-0.5 bg-emerald-400 border-dashed border-b inline-block" />
            Target ({targetTds} ppm)
          </span>
          {projectionPoints.length > 0 && (
            <span className="flex items-center gap-1.5 text-purple-400">
              <span className="w-2.5 h-0.5 bg-purple-400 border-dashed border-b inline-block" />
              Linear Projection (OLS)
            </span>
          )}
        </div>
        <span className="text-slate-500">
          N = {prediction.sampleCount} samples · R² = {(prediction.rSquared * 100).toFixed(1)}%
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
    [RELIABILITY_LEVEL.HIGH]: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    [RELIABILITY_LEVEL.MODERATE]: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    [RELIABILITY_LEVEL.LOW]: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    [RELIABILITY_LEVEL.UNRELIABLE]: 'bg-slate-800 text-slate-400 border-slate-700',
  }[prediction.reliability] || 'bg-slate-800 text-slate-400 border-slate-700';

  const isTargetMet = prediction.status === PREDICTION_STATUS.TARGET_MET;
  const isRising = prediction.status === PREDICTION_STATUS.NOT_PREDICTING_RISING;
  const isFlat = prediction.status === PREDICTION_STATUS.NOT_PREDICTING_FLAT;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/80 backdrop-blur-sm p-3 flex flex-col gap-3 border-glow-cyan h-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Clock size={14} />
          </div>
          <div>
            <div className="text-xs font-mono font-bold text-white flex items-center gap-2">
              <span>TIME-TO-TARGET &amp; PASS PREDICTOR</span>
              <span className={`text-[8.5px] px-2 py-0.5 rounded border font-mono ${reliabilityBadge}`}>
                Reliability: {prediction.reliability}
              </span>
            </div>
            <div className="text-[9px] text-slate-400 font-mono">
              Empirical linear regression kinetics (30-second bounded window)
            </div>
          </div>
        </div>

        {/* Target Configuration Input */}
        <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/60 rounded-lg p-1">
          <Target size={11} className="text-emerald-400 ml-1" />
          <span className="text-[9px] font-mono text-slate-400">TARGET:</span>
          <input
            type="number"
            min="100"
            max="900"
            step="10"
            value={targetTds}
            onChange={(e) => setTargetTds(Number(e.target.value) || 500)}
            className="w-14 bg-slate-900 text-xs font-mono font-bold text-emerald-300 text-center rounded px-1 py-0.5 border border-slate-700 outline-none"
          />
          <span className="text-[9px] font-mono text-slate-500 mr-1">ppm</span>
          {targetTds !== 500 && (
            <button
              onClick={() => setTargetTds(500)}
              title="Reset to 500 ppm Dubai standard"
              className="text-slate-500 hover:text-white p-0.5 transition-colors"
            >
              <RotateCcw size={10} />
            </button>
          )}
        </div>
      </div>

      {/* Main KPI Row */}
      <div className="grid grid-cols-4 gap-2 flex-shrink-0">
        {/* Card 1: Live TDS */}
        <div className="bg-slate-950/50 border border-slate-800 rounded-lg p-2.5 flex flex-col justify-between">
          <div className="text-[8px] font-mono text-slate-500 uppercase">Current Measured TDS</div>
          <div className="flex items-baseline gap-1 my-0.5">
            <span className="text-2xl font-bold font-mono text-cyan-300 glow-cyan">
              {state.tds.toFixed(1)}
            </span>
            <span className="text-xs font-mono text-slate-500">ppm</span>
          </div>
          <div className="text-[7.5px] font-mono text-slate-400">
            Compensated: <span className="text-cyan-400">{(state.tds / (1 + 0.02 * (state.tempC - 25))).toFixed(1)} ppm</span>
          </div>
        </div>

        {/* Card 2: Reduction Rate */}
        <div className="bg-slate-950/50 border border-slate-800 rounded-lg p-2.5 flex flex-col justify-between">
          <div className="text-[8px] font-mono text-slate-500 uppercase">Recent TDS Rate</div>
          <div className="flex items-baseline gap-1 my-0.5">
            <span className={`text-xl font-bold font-mono ${
              prediction.reductionRatePpmMin < -1 ? 'text-emerald-400 glow-emerald' :
              prediction.reductionRatePpmMin > 1 ? 'text-red-400 glow-red' : 'text-slate-300'
            }`}>
              {prediction.reductionRatePpmMin > 0 ? '+' : ''}
              {prediction.reductionRatePpmMin.toFixed(1)}
            </span>
            <span className="text-[9px] font-mono text-slate-500">ppm/min</span>
          </div>
          <div className="text-[7.5px] font-mono text-slate-400">
            {(prediction.reductionRatePpmSec).toFixed(2)} ppm/sec
          </div>
        </div>

        {/* Card 3: Predicted Time */}
        <div className={`rounded-lg p-2.5 border flex flex-col justify-between ${
          isTargetMet ? 'bg-emerald-500/10 border-emerald-500/30' :
          isRising || isFlat ? 'bg-amber-500/10 border-amber-500/30' :
          'bg-slate-950/50 border-slate-800'
        }`}>
          <div className="text-[8px] font-mono text-slate-400 uppercase">Time to Target</div>
          <div className="my-0.5">
            <div className={`text-lg font-bold font-mono leading-tight ${
              isTargetMet ? 'text-emerald-300' :
              isRising ? 'text-amber-400' :
              'text-purple-300'
            }`}>
              {prediction.predictedTimeFormatted}
            </div>
          </div>
          <div className="text-[7.5px] font-mono text-slate-400 truncate">
            {prediction.statusMessage}
          </div>
        </div>

        {/* Card 4: Pass Estimation */}
        <div className="bg-slate-950/50 border border-slate-800 rounded-lg p-2.5 flex flex-col justify-between">
          <div className="text-[8px] font-mono text-slate-500 uppercase">Pass Prediction</div>
          <div className="my-0.5">
            <span className="text-xs font-mono font-bold text-amber-400">
              Unavailable
            </span>
          </div>
          <div className="text-[7px] font-mono text-slate-400 leading-tight">
            Continuous loop; flow totalizer uninstrumented.
          </div>
        </div>
      </div>

      {/* Projection Chart */}
      <div className="flex-1 min-h-0 bg-slate-950/60 border border-slate-800 rounded-lg p-2 flex flex-col justify-between">
        <PredictiveChart
          history={state.chartHistory}
          prediction={prediction}
          targetTds={targetTds}
        />
      </div>

      {/* Transparent Limitation Footer */}
      <div className="flex items-start gap-1.5 p-2 rounded-lg bg-slate-950/40 border border-slate-800 text-[8px] font-mono text-slate-400 flex-shrink-0">
        <Info size={11} className="text-cyan-400 flex-shrink-0 mt-0.5" />
        <span className="leading-relaxed">
          <strong className="text-slate-300">Methodology Note:</strong> Prediction uses ordinary least squares (OLS) linear extrapolation across a rolling 30-second window ($N \ge 8$). Pass estimation is kept honest: because Hylex operates continuous hydro-cyclone recirculation, discrete pass counts require volume totalizers.
        </span>
      </div>
    </div>
  );
}
