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
    [DIAGNOSTIC_SEVERITY.SUCCESS]: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
    [DIAGNOSTIC_SEVERITY.INFO]: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
    [DIAGNOSTIC_SEVERITY.WARNING]: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
    [DIAGNOSTIC_SEVERITY.ALERT]: 'bg-red-500/10 text-red-300 border-red-500/30',
  }[diagnostics.severity] || 'bg-slate-800 text-slate-400 border-slate-700';

  const severityIcon = {
    [DIAGNOSTIC_SEVERITY.SUCCESS]: <CheckCircle2 size={16} className="text-emerald-400" />,
    [DIAGNOSTIC_SEVERITY.INFO]: <Activity size={16} className="text-cyan-400" />,
    [DIAGNOSTIC_SEVERITY.WARNING]: <AlertTriangle size={16} className="text-amber-400" />,
    [DIAGNOSTIC_SEVERITY.ALERT]: <ShieldAlert size={16} className="text-red-400" />,
  }[diagnostics.severity];

  const perfPct = Math.min(100, Math.round(diagnostics.performanceRatio * 100));

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/85 backdrop-blur-sm p-3.5 flex flex-col gap-3 h-full shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-400">
            <Zap size={15} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-sans font-semibold text-white tracking-wide">
                Electrode Health &amp; Fouling Diagnostics
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-mono ${severityBadge}`}>
                {diagnostics.statusLabel}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-sans">
              Kinetic treatment rates &amp; empirical performance tracking
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-[10px] font-sans text-slate-400">Confidence</div>
          <div className="text-xs font-mono font-bold text-amber-300">{diagnostics.confidence}</div>
        </div>
      </div>

      {/* Main Status Callout */}
      <div
        className={`p-3 rounded-lg border flex items-start gap-3 ${
          diagnostics.severity === DIAGNOSTIC_SEVERITY.SUCCESS
            ? 'bg-emerald-950/25 border-emerald-500/30'
            : diagnostics.severity === DIAGNOSTIC_SEVERITY.ALERT
            ? 'bg-red-950/25 border-red-500/30'
            : diagnostics.severity === DIAGNOSTIC_SEVERITY.WARNING
            ? 'bg-amber-950/25 border-amber-500/30'
            : 'bg-slate-950/60 border-slate-800'
        }`}
      >
        <div className="mt-0.5 flex-shrink-0">{severityIcon}</div>
        <div className="space-y-1">
          <div className="text-xs font-sans font-semibold text-white">
            {diagnostics.treatmentTrend}
          </div>
          <p className="text-[11px] font-sans text-slate-300 leading-relaxed">
            {diagnostics.message}
          </p>
        </div>
      </div>

      {/* Performance vs Baseline Gauge */}
      <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2 flex-shrink-0">
        <div className="flex justify-between items-center text-xs font-sans">
          <span className="text-slate-300 font-medium">Observed TDS Reduction Velocity</span>
          <span className="font-bold font-mono text-cyan-300">{diagnostics.observedReductionRatePpmMin.toFixed(1)} ppm/min</span>
        </div>
        <div className="relative h-2 rounded-full bg-slate-800 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              perfPct >= 70 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' :
              perfPct >= 30 ? 'bg-gradient-to-r from-amber-500 to-amber-400' :
              'bg-gradient-to-r from-red-500 to-red-400'
            }`}
            style={{ width: `${perfPct}%` }}
          />
          {/* 100% nominal baseline marker */}
          <div className="absolute top-0 bottom-0 w-0.5 bg-slate-400" style={{ left: '100%' }} />
        </div>
        <div className="flex justify-between text-[10px] font-sans text-slate-400">
          <span>0 ppm/min</span>
          <span>Baseline: {diagnostics.baselineRatePpmMin} ppm/min (Nominal Flow)</span>
          <span className="text-emerald-400 font-medium">{perfPct}% of baseline</span>
        </div>
      </div>

      {/* Available Evidence Grid */}
      <div className="space-y-2 flex-1 min-h-0 overflow-y-auto pr-0.5" style={{ scrollbarWidth: 'thin' }}>
        <div className="text-[10px] font-sans text-slate-400 uppercase tracking-wider font-semibold">
          Instrumented Telemetry Evidence
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs font-sans">
          {diagnostics.availableEvidence.map((ev, i) => (
            <div key={i} className="p-2 rounded-lg bg-slate-950/60 border border-slate-800 flex justify-between items-center">
              <span className="text-slate-300 truncate mr-1.5">{ev.name}</span>
              <span className={`font-mono font-semibold ${
                ev.state === 'ok' ? 'text-emerald-400' :
                ev.state === 'warn' ? 'text-amber-400' :
                ev.state === 'alert' ? 'text-red-400' : 'text-slate-400'
              }`}>
                {ev.value}
              </span>
            </div>
          ))}
        </div>

        {/* Missing Sensor Boundaries */}
        <div className="mt-3 text-[10px] font-sans text-slate-400 uppercase tracking-wider font-semibold">
          Uninstrumented Hardware Boundaries (Diagnostic Disclosures)
        </div>
        <div className="space-y-1.5 text-[11px] font-sans">
          {diagnostics.missingSensors.map((s, i) => (
            <div key={i} className="p-2 rounded-lg bg-slate-950/40 border border-slate-800/80 flex justify-between text-slate-300">
              <span className="text-slate-400">✕ {s.name}</span>
              <span className="text-slate-500 text-[10px]">{s.note}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations Banner */}
      {diagnostics.recommendations?.length > 0 && (
        <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 text-[11px] font-sans text-slate-300 flex-shrink-0">
          <div className="flex items-center gap-1.5 text-amber-400 font-medium mb-1">
            <Wrench size={12} />
            <span>Operational Advisory</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-slate-400 text-[10px] leading-relaxed">
            {diagnostics.recommendations.map((rec, i) => (
              <li key={i}>{rec}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
