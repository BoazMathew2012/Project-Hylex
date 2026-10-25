import { useHylex } from '../store/HylexContext';
import Droplets from 'lucide-react/dist/esm/icons/droplets.mjs';
import ThermometerSun from 'lucide-react/dist/esm/icons/thermometer-sun.mjs';
import TrendingDown from 'lucide-react/dist/esm/icons/trending-down.mjs';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2.mjs';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle.mjs';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right.mjs';
import WifiOff from 'lucide-react/dist/esm/icons/wifi-off.mjs';
import { SYNOPSIS } from '../store/synopsis';

export default function KpiRibbon() {
  const { state } = useHylex();
  const { tds, tempC, mode, wsStatus } = state;

  const isLiveOffline = mode === 'live' && wsStatus !== 'connected';
  const THRESHOLD = SYNOPSIS.tds_threshold_ppm; // 500 ppm — Dubai potable benchmark
  const SCALE     = SYNOPSIS.industrial_scale;   // 82.35×
  const IND_RAW   = SYNOPSIS.industrial_raw_ppm; // 70,000 ppm raw brine

  const isSafe     = !isLiveOffline && tds <= THRESHOLD && tds > 0;
  const industrial = Math.round(tds * SCALE);
  const industrialPct = Math.min(100, (industrial / IND_RAW) * 100);

  // DS18B20 temperature compensation: EC₂₅ = EC / (1 + 0.02 × (T − 25))
  const divisor   = 1 + 0.02 * (tempC - 25);
  const EC25      = tds > 0 && divisor > 0 ? (tds / divisor).toFixed(1) : '0.0';
  const driftPct  = tds > 0 ? Math.abs(((tds - parseFloat(EC25)) / tds) * 100).toFixed(1) : '0.0';
  const ppmPct    = Math.min(100, (tds / 1000) * 100);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2.5 flex-shrink-0">

      {/* ── Card 1: Primary Benchtop Salinity (Gravity TDS) ── */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/85 backdrop-blur-sm p-3.5 flex flex-col justify-between shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-slate-300">
            <Droplets size={14} className={isLiveOffline ? 'text-slate-500' : 'text-cyan-400'} />
            <span className="text-xs font-sans font-semibold tracking-wide">Benchtop Gravity TDS</span>
          </div>
          <span
            className={`text-[10px] font-sans font-medium px-2 py-0.5 rounded-full border ${
              isLiveOffline
                ? 'bg-red-500/10 text-red-300 border-red-500/30'
                : isSafe
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
            }`}
          >
            {isLiveOffline ? 'ESP32 Offline' : isSafe ? 'Potable Grade' : 'Recirculating'}
          </span>
        </div>

        <div className="my-1.5 flex items-baseline gap-2">
          <span className="font-mono text-3xl font-bold text-white tracking-tight">
            {tds.toFixed(1)}
          </span>
          <span className="text-slate-400 text-xs font-mono font-medium">ppm</span>
          <span className="text-slate-400 text-xs font-sans ml-auto">
            Target: <strong className="text-slate-200 font-mono">≤{THRESHOLD} ppm</strong>
          </span>
        </div>

        {/* Minimalist Salinity Gauge */}
        <div className="space-y-1">
          <div className="relative h-1.5 rounded-full bg-slate-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isLiveOffline ? 'bg-slate-700' : isSafe ? 'bg-cyan-400' : 'bg-amber-400'
              }`}
              style={{ width: `${isLiveOffline ? 0 : ppmPct}%` }}
            />
            {/* 500 ppm benchmark tick */}
            <div className="absolute top-0 bottom-0 w-0.5 bg-slate-400" style={{ left: '50%' }} />
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 font-sans">
            <span>0 ppm</span>
            <span className="text-slate-300 font-mono">500 ppm Dubai Threshold</span>
            <span>1,000 ppm</span>
          </div>
        </div>
      </div>

      {/* ── Card 2: Industrial Scale Extrapolation (Visually Subordinate) ── */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/85 backdrop-blur-sm p-3.5 flex flex-col justify-between shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-slate-300">
            <TrendingDown size={14} className={isLiveOffline ? 'text-slate-500' : 'text-amber-400'} />
            <span className="text-xs font-sans font-semibold tracking-wide">Industrial Outfall Scale</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-slate-700 bg-slate-800 text-slate-300">
            82.35× Model
          </span>
        </div>

        <div className="my-1.5 flex items-baseline gap-2">
          <span className="font-mono text-2xl font-bold text-slate-200 tracking-tight">
            {industrial.toLocaleString()}
          </span>
          <span className="text-slate-400 text-xs font-mono font-medium">ppm</span>
          <span className="text-slate-400 text-xs font-sans ml-auto">
            Raw: <span className="text-slate-300 font-mono">70,000 ppm</span>
          </span>
        </div>

        {/* Industrial gauge */}
        <div className="space-y-1">
          <div className="relative h-1.5 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-amber-500 to-amber-400"
              style={{ width: `${isLiveOffline ? 0 : industrialPct}%` }}
            />
            <div className="absolute top-0 bottom-0 w-0.5 bg-emerald-400" style={{ left: '55%' }} />
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 font-sans">
            <span>Outfall Target: 38,500 ppm</span>
            <span className="text-emerald-400 font-medium">60–80% Net Cost Cut</span>
          </div>
        </div>
      </div>

      {/* ── Card 3: Thermal Compensation (DS18B20) ── */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/85 backdrop-blur-sm p-3.5 flex flex-col justify-between shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-slate-300">
            <ThermometerSun size={14} className={isLiveOffline ? 'text-slate-500' : 'text-cyan-400'} />
            <span className="text-xs font-sans font-semibold tracking-wide">Thermal Compensation</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-slate-700 bg-slate-800 text-slate-300">
            DS18B20 Sensor
          </span>
        </div>

        <div className="my-1.5 flex items-baseline gap-2">
          <span className="font-mono text-3xl font-bold text-white tracking-tight">
            {tempC.toFixed(1)}
          </span>
          <span className="text-slate-400 text-xs font-mono font-medium">°C</span>
          <span className="text-slate-400 text-xs font-sans ml-auto">
            EC₂₅: <strong className="text-cyan-300 font-mono">{EC25} ppm</strong>
          </span>
        </div>

        <div className="flex items-center justify-between text-[10px] text-slate-400 font-sans pt-1 border-t border-slate-800">
          <span>Formula: EC₂₅ = EC ÷ (1 + 0.02 × ΔT)</span>
          <span className="text-slate-300 font-mono">Drift: {driftPct}%</span>
        </div>
      </div>

      {/* ── Card 4: ESP32 AI Routing Decision Gate ── */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/85 backdrop-blur-sm p-3.5 flex flex-col justify-between shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-slate-300">
            {isLiveOffline ? (
              <WifiOff size={14} className="text-red-400" />
            ) : isSafe ? (
              <CheckCircle2 size={14} className="text-emerald-400" />
            ) : (
              <AlertTriangle size={14} className="text-amber-400" />
            )}
            <span className="text-xs font-sans font-semibold tracking-wide">Routing Decision Gate</span>
          </div>
          <span
            className={`text-[10px] font-sans font-medium px-2 py-0.5 rounded-full border ${
              isLiveOffline
                ? 'bg-slate-800 text-slate-400 border-slate-700'
                : isSafe
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
            }`}
          >
            {isLiveOffline ? 'Hardware Standby' : isSafe ? 'Discharge Open' : 'Recirculation Active'}
          </span>
        </div>

        <div className="my-1.5 flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <ArrowRight size={14} className={isLiveOffline ? 'text-slate-500' : isSafe ? 'text-emerald-400' : 'text-amber-400'} />
            <span
              className={`font-mono text-base font-bold ${
                isLiveOffline ? 'text-slate-400' : isSafe ? 'text-emerald-300' : 'text-amber-300'
              }`}
            >
              {isLiveOffline ? 'Valves Closed (0° Standby)' : isSafe ? 'Tank B (Clean Store)' : 'Tank A (Recirculate)'}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between text-[10px] text-slate-400 font-sans pt-1 border-t border-slate-800">
          <span>Cam-Pinch S3: <strong className="text-slate-200 font-mono">{isLiveOffline ? '0° (Standby)' : isSafe ? '0° (Open)' : '90° (Closed)'}</strong></span>
          <span>Backpressure S1: <strong className="text-slate-200 font-mono">{isLiveOffline ? '0° (Standby)' : isSafe ? '20° (Normal)' : '55° (Pinched)'}</strong></span>
        </div>
      </div>

    </div>
  );
}
