import { useMemo } from 'react';
import { useHylex } from '../store/HylexContext';
import { evaluateElectrodeDiagnostics, DIAGNOSTIC_SEVERITY } from '../utils/diagnosticsEngine';
import {
  Activity, Zap, AlertTriangle, CheckCircle2, ShieldAlert,
  Wrench
} from 'lucide-react';

export default function ElectrodeDiagnostics() {
  const { state } = useHylex();

  // Compute live diagnostics from treatment kinetics
  const diagnostics = useMemo(() => {
    return evaluateElectrodeDiagnostics(state);
  }, [state]);

  const severityBadge = {
    [DIAGNOSTIC_SEVERITY.SUCCESS]: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    [DIAGNOSTIC_SEVERITY.INFO]: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    [DIAGNOSTIC_SEVERITY.WARNING]: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    [DIAGNOSTIC_SEVERITY.ALERT]: 'bg-red-500/15 text-red-300 border-red-500/30',
  }[diagnostics.severity] || 'bg-slate-800 text-slate-400 border-slate-700';

  const severityIcon = {
    [DIAGNOSTIC_SEVERITY.SUCCESS]: <CheckCircle2 size={14} className="text-emerald-400" />,
    [DIAGNOSTIC_SEVERITY.INFO]: <Activity size={14} className="text-cyan-400" />,
    [DIAGNOSTIC_SEVERITY.WARNING]: <AlertTriangle size={14} className="text-amber-400" />,
    [DIAGNOSTIC_SEVERITY.ALERT]: <ShieldAlert size={14} className="text-red-400" />,
  }[diagnostics.severity];

  const perfPct = Math.min(100, Math.round(diagnostics.performanceRatio * 100));

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/80 backdrop-blur-sm p-3 flex flex-col gap-3 border-glow-amber h-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Zap size={14} />
          </div>
          <div>
            <div className="text-xs font-mono font-bold text-white flex items-center gap-2">
              <span>ELECTRODE HEALTH &amp; FOULING DIAGNOSTICS</span>
              <span className={`text-[8.5px] px-2 py-0.5 rounded border font-mono ${severityBadge}`}>
                {diagnostics.statusLabel}
              </span>
            </div>
            <div className="text-[9px] text-slate-400 font-mono">
              Treatment kinetics &amp; empirical performance tracking
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-[8px] font-mono text-slate-500">CONFIDENCE</div>
          <div className="text-[10px] font-mono font-bold text-amber-300">{diagnostics.confidence}</div>
        </div>
      </div>

      {/* Main Status Callout */}
      <div className={`p-3 rounded-lg border flex items-start gap-2.5 ${
        diagnostics.severity === DIAGNOSTIC_SEVERITY.SUCCESS ? 'bg-emerald-950/20 border-emerald-500/30' :
        diagnostics.severity === DIAGNOSTIC_SEVERITY.ALERT ? 'bg-red-950/20 border-red-500/30' :
        diagnostics.severity === DIAGNOSTIC_SEVERITY.WARNING ? 'bg-amber-950/20 border-amber-500/30' :
        'bg-slate-950/40 border-slate-800'
      }`}>
        <div className="mt-0.5 flex-shrink-0">{severityIcon}</div>
        <div className="space-y-1">
          <div className="text-xs font-mono font-bold text-slate-200">
            {diagnostics.treatmentTrend}
          </div>
          <p className="text-[10px] font-mono text-slate-300 leading-relaxed">
            {diagnostics.message}
          </p>
        </div>
      </div>

      {/* Performance vs Baseline Gauge */}
      <div className="p-2.5 rounded-lg bg-slate-950/50 border border-slate-800 space-y-1.5 flex-shrink-0">
        <div className="flex justify-between items-center text-[9px] font-mono">
          <span className="text-slate-400">OBSERVED TREATMENT REDUCTION RATE</span>
          <span className="font-bold text-cyan-300">{diagnostics.observedReductionRatePpmMin.toFixed(1)} ppm/min</span>
        </div>
        <div className="relative h-2 rounded-full bg-slate-800 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              perfPct >= 70 ? 'bg-gradient-to-r from-emerald-600 to-emerald-400' :
              perfPct >= 30 ? 'bg-gradient-to-r from-amber-600 to-amber-400' :
              'bg-gradient-to-r from-red-600 to-red-400'
            }`}
            style={{ width: `${perfPct}%` }}
          />
          {/* 100% nominal baseline marker */}
          <div className="absolute top-0 bottom-0 w-0.5 bg-slate-400" style={{ left: '100%' }} />
        </div>
        <div className="flex justify-between text-[7.5px] font-mono text-slate-500">
          <span>0 ppm/min</span>
          <span>Baseline: {diagnostics.baselineRatePpmMin} ppm/min (Nominal Flow)</span>
          <span className="text-emerald-400 font-bold">{perfPct}% of baseline</span>
        </div>
      </div>

      {/* Available Evidence Grid */}
      <div className="space-y-1.5 flex-1 min-h-0 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
        <div className="text-[8px] font-mono text-slate-500 uppercase tracking-widest font-bold">
          Verified Telemetry Evidence
        </div>
        <div className="grid grid-cols-2 gap-1.5 text-[8px] font-mono">
          {diagnostics.availableEvidence.map((ev, i) => (
            <div key={i} className="p-1.5 rounded bg-slate-950/60 border border-slate-800 flex justify-between items-center">
              <span className="text-slate-400 truncate mr-1">{ev.name}</span>
              <span className={`font-bold ${
                ev.state === 'ok' ? 'text-emerald-400' :
                ev.state === 'warn' ? 'text-amber-400' :
                ev.state === 'alert' ? 'text-red-400' : 'text-slate-500'
              }`}>
                {ev.value}
              </span>
            </div>
          ))}
        </div>

        {/* Missing Sensor Boundaries */}
        <div className="mt-2 text-[8px] font-mono text-slate-500 uppercase tracking-widest font-bold">
          Uninstrumented Hardware (Diagnostic Boundaries)
        </div>
        <div className="space-y-1 text-[7.5px] font-mono">
          {diagnostics.missingSensors.map((s, i) => (
            <div key={i} className="p-1 rounded bg-slate-950/40 border border-slate-800/80 flex justify-between text-slate-400">
              <span className="text-slate-400">✕ {s.name}</span>
              <span className="text-slate-500">{s.note}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations Banner */}
      {diagnostics.recommendations?.length > 0 && (
        <div className="p-2 rounded-lg bg-amber-500/5 border border-amber-500/20 text-[8px] font-mono text-slate-300 flex-shrink-0">
          <div className="flex items-center gap-1 text-amber-400 font-bold mb-1">
            <Wrench size={10} />
            <span>Operational Advisory</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-slate-400">
            {diagnostics.recommendations.map((rec, i) => (
              <li key={i}>{rec}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
