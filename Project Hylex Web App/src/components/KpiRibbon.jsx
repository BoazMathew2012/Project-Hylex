import { useHylex } from '../store/HylexContext';
import { Droplets, ThermometerSun, TrendingDown, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';
import { SYNOPSIS } from '../store/synopsis';

function KpiCard({ title, accent, icon: Icon, children }) {
  const accentMap = {
    cyan:    'border-cyan-500/25 border-glow-cyan',
    emerald: 'border-emerald-500/25 border-glow-emerald',
    amber:   'border-amber-500/25 border-glow-amber',
    red:     'border-red-500/25 border-glow-red',
  };
  const textMap = { cyan: 'text-cyan-400', emerald: 'text-emerald-400', amber: 'text-amber-400', red: 'text-red-400' };
  return (
    <div className={`rounded-xl border bg-slate-900/80 backdrop-blur-sm p-3 flex flex-col gap-2 ${accentMap[accent]}`}>
      <div className="flex items-center gap-1.5">
        <Icon size={12} className={textMap[accent]} />
        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">{title}</span>
      </div>
      {children}
    </div>
  );
}

export default function KpiRibbon() {
  const { state } = useHylex();
  const { tds, tempC } = state;

  const THRESHOLD = SYNOPSIS.tds_threshold_ppm; // 500 ppm — Dubai potable benchmark
  const SCALE     = SYNOPSIS.industrial_scale;   // 82.35×
  const IND_RAW   = SYNOPSIS.industrial_raw_ppm; // 70,000 ppm raw brine

  const isSafe     = tds <= THRESHOLD;
  const industrial = Math.round(tds * SCALE);
  const industrialPct = Math.min(100, (industrial / IND_RAW) * 100);

  // DS18B20 temperature compensation: EC₂₅ = EC / (1 + 0.02 × (T − 25))
  const EC25      = (tds / (1 + 0.02 * (tempC - 25))).toFixed(1);
  const driftPct  = Math.abs(((tds - parseFloat(EC25)) / tds) * 100).toFixed(1);

  const ppmPct    = Math.min(100, (tds / 1000) * 100);

  return (
    <div className="grid grid-cols-4 gap-2.5 flex-shrink-0">

      {/* ── Card 1: Benchtop Gravity TDS Sensor ── */}
      <KpiCard title="Gravity Analog TDS Sensor" accent="cyan" icon={Droplets}>
        <div className="flex items-baseline gap-1">
          <span className="font-mono text-3xl font-bold text-cyan-300 glow-cyan">{tds.toFixed(1)}</span>
          <span className="text-slate-500 text-xs font-mono">ppm</span>
        </div>
        <div className="relative h-2 rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${ppmPct}%`,
              background: isSafe
                ? 'linear-gradient(90deg,#06b6d4,#22d3ee)'
                : 'linear-gradient(90deg,#f59e0b,#f87171)',
            }}
          />
          {/* 500 ppm threshold tick */}
          <div className="absolute top-0 bottom-0 w-0.5 bg-slate-300/50" style={{ left: '50%' }} />
        </div>
        <div className="flex justify-between">
          <span className="text-[8px] text-slate-600 font-mono">0</span>
          <span className="text-[8px] text-slate-400 font-mono">↑ {THRESHOLD} ppm DUBAI BENCHMARK</span>
          <span className="text-[8px] text-slate-600 font-mono">1000</span>
        </div>
        <span className={`self-start text-[9px] font-mono px-2 py-0.5 rounded border ${
          isSafe
            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
            : 'bg-red-500/15 text-red-400 border-red-500/25'
        }`}>
          {isSafe ? '✓ POTABLE GRADE' : '✗ EXCEEDS THRESHOLD'}
        </span>
      </KpiCard>

      {/* ── Card 2: Industrial Equivalent TDS (82.35× scale) ── */}
      <KpiCard title="Industrial Equivalent TDS (82.35×)" accent="amber" icon={TrendingDown}>
        <div className="flex items-baseline gap-1">
          <span className="font-mono text-2xl font-bold text-amber-300 glow-amber">{industrial.toLocaleString()}</span>
          <span className="text-slate-500 text-xs font-mono">ppm</span>
        </div>
        <div className="text-[8px] text-slate-500 font-mono">industrial outfall equivalent</div>
        <div className="relative h-2 rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-amber-600 to-amber-400"
            style={{ width: `${industrialPct}%` }}
          />
          {/* 38,500 ppm target = 55% */}
          <div className="absolute top-0 bottom-0 w-0.5 bg-emerald-500/70" style={{ left: '55%' }} />
        </div>
        <div className="grid grid-cols-2 gap-1">
          <div className="bg-slate-800/60 rounded p-1.5">
            <div className="text-[7px] text-slate-600 font-mono">BENCHTOP × 82.35</div>
            <div className="text-[10px] font-mono text-cyan-400">{tds.toFixed(0)} × 82.35</div>
          </div>
          <div className="bg-slate-800/60 rounded p-1.5">
            <div className="text-[7px] text-slate-600 font-mono">RAW BRINE INTAKE</div>
            <div className="text-[10px] font-mono text-red-400">70,000 ppm</div>
          </div>
        </div>
        <div className="text-[8px] font-mono text-emerald-400">
          ↓ Target outfall: 38,500 ppm ({SYNOPSIS.cost_reduction_pct_min}–{SYNOPSIS.cost_reduction_pct_max}% net cost reduction)
        </div>
      </KpiCard>

      {/* ── Card 3: DS18B20 Thermal Compensation ── */}
      <KpiCard title="DS18B20 Thermal Compensation" accent="cyan" icon={ThermometerSun}>
        <div className="flex items-baseline gap-1">
          <span className="font-mono text-3xl font-bold text-cyan-300 glow-cyan">{tempC.toFixed(1)}</span>
          <span className="text-slate-500 text-xs font-mono">°C</span>
        </div>
        <div className="bg-slate-800/40 rounded p-2 text-[9px] font-mono space-y-0.5">
          <div className="text-slate-500">EC₂₅ = EC ÷ (1 + 0.02 × (T − 25))</div>
          <div className="text-slate-400">{tds.toFixed(1)} ÷ (1 + 0.02 × ({tempC.toFixed(1)} − 25))</div>
          <div className="text-emerald-400 font-bold">= {EC25} ppm (compensated)</div>
        </div>
        <div className="flex items-center gap-1 text-[9px] font-mono text-slate-400">
          <TrendingDown size={8} className="text-emerald-400" />
          Thermal drift corrected:
          <span className="text-emerald-400 font-bold ml-1">{driftPct}%</span>
        </div>
        <div className="text-[8px] text-slate-600 font-mono">Sensor: {SYNOPSIS.temp_sensor}</div>
      </KpiCard>

      {/* ── Card 4: ESP32 AI Routing Decision Gate ── */}
      <KpiCard title="ESP32 AI Routing Decision Gate" accent={isSafe ? 'emerald' : 'red'} icon={isSafe ? CheckCircle2 : AlertTriangle}>
        <div className={`flex flex-col items-center justify-center flex-1 rounded-lg p-3 transition-all duration-700 ${
          isSafe ? 'bg-emerald-500/10 border border-emerald-500/25' : 'bg-red-500/10 border border-red-500/25'
        }`}>
          <div className={`text-xl font-bold font-mono tracking-wider ${isSafe ? 'text-emerald-400 glow-emerald' : 'text-red-400 glow-red'}`}>
            {isSafe ? '✓ CLEAN' : '✗ HIGH TDS'}
          </div>
          <div className="flex items-center gap-1 mt-1">
            <ArrowRight size={10} className={isSafe ? 'text-emerald-400' : 'text-red-400'} />
            <span className={`text-[10px] font-mono ${isSafe ? 'text-emerald-300' : 'text-red-300'}`}>
              {isSafe ? 'ROUTING → TANK B (CLEAN STORE)' : 'RECIRCULATING → TANK A (EC LOOP)'}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-1 text-[9px] font-mono">
          <div className="bg-slate-800/60 rounded px-2 py-1">
            <div className="text-slate-500">CAM-PINCH S1</div>
            <div className={isSafe ? 'text-cyan-400' : 'text-amber-400'}>{isSafe ? '20° relaxed' : '55° pinched'}</div>
          </div>
          <div className="bg-slate-800/60 rounded px-2 py-1">
            <div className="text-slate-500">GATE S3 CLEAN</div>
            <div className={isSafe ? 'text-emerald-400' : 'text-red-400'}>{isSafe ? '0° OPEN' : '90° CLOSED'}</div>
          </div>
        </div>
        <div className="text-[8px] text-slate-600 font-mono text-center">MG995 cam-pinch silicone valves — zero internal leaks</div>
      </KpiCard>

    </div>
  );
}
