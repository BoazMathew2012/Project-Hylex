import { useHylex } from '../store/hooks';
import Droplets from 'lucide-react/dist/esm/icons/droplets.mjs';
import ThermometerSun from 'lucide-react/dist/esm/icons/thermometer-sun.mjs';
import Route from 'lucide-react/dist/esm/icons/route.mjs';
import Power from 'lucide-react/dist/esm/icons/power.mjs';
import { SYNOPSIS } from '../store/synopsis';

function Metric({ icon: Icon, label, value, unit, note, tone = 'cyan' }) {
  const tones = {
    cyan: 'text-cyan-200 bg-cyan-300/10 border-cyan-200/10',
    green: 'text-emerald-200 bg-emerald-300/10 border-emerald-200/10',
    amber: 'text-amber-200 bg-amber-300/10 border-amber-200/10',
    slate: 'text-slate-300 bg-slate-300/8 border-white/5',
  };
  return (
    <div className="hylex-panel hylex-metric group relative min-w-0 overflow-hidden rounded-[20px] px-4 py-4 sm:px-5 sm:py-[18px] flex flex-col justify-between gap-3 animate-rise-in">
      <div className="relative z-10 flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-[.13em] text-slate-400 font-semibold">{label}</div>
        <span className={`grid place-items-center w-9 h-9 rounded-xl border ${tones[tone]} transition-transform duration-300 group-hover:scale-105`}><Icon size={16} strokeWidth={1.8} /></span>
      </div>
      <div className="relative z-10 flex items-end justify-between gap-2">
        <div className="flex items-baseline gap-1.5 min-w-0">
          <span className="text-[27px] sm:text-[30px] font-semibold tracking-[-0.045em] text-white tabular-nums truncate leading-none">{value}</span>
          {unit && <span className="text-[13px] text-slate-400 font-medium">{unit}</span>}
        </div>
        <span className="hidden sm:flex items-center gap-1.5 shrink-0 text-[10px] text-slate-400 leading-tight">
          <span className={`h-1.5 w-1.5 rounded-full ${tone === 'green' ? 'bg-emerald-300' : tone === 'amber' ? 'bg-amber-300' : tone === 'slate' ? 'bg-slate-500' : 'bg-cyan-300'}`} />
          {note}
        </span>
      </div>
    </div>
  );
}

export default function KpiRibbon() {
  const { state } = useHylex();
  const offline = state.mode === 'live' && state.wsStatus !== 'connected';
  const live = !offline;
  const route = offline ? 'Offline' : !state.relay1 ? 'Pump off' : state.routeClean ? 'Reuse' : 'Recirculate';
  const pump = offline ? '—' : state.relay1 ? 'Running' : 'Stopped';
  const target = tds => tds <= SYNOPSIS.tds_threshold_ppm ? 'At target' : 'Above target';
  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-2.5 flex-shrink-0">
      <Metric icon={Droplets} label="Water quality" value={live && state.tdsValid ? state.tds.toFixed(0) : '—'} unit="ppm" note={state.tdsValid && live ? target(state.tds) : 'Waiting for sensor'} tone={state.tdsValid && live && state.tds <= SYNOPSIS.tds_threshold_ppm ? 'green' : 'cyan'} />
      <Metric icon={ThermometerSun} label="Temperature" value={live && state.tempValid ? state.tempC.toFixed(1) : '—'} unit="°C" note={state.tempValid && live ? 'Sensor ready' : 'Waiting for sensor'} tone="amber" />
      <Metric icon={Route} label="Water route" value={route} note={offline ? 'ESP32 disconnected' : state.controlMode === 'auto' ? 'Automatic' : 'Manual'} tone={offline ? 'slate' : state.routeClean ? 'green' : 'cyan'} />
      <Metric icon={Power} label="Pump" value={pump} note={offline ? 'ESP32 disconnected' : 'Command status'} tone={state.relay1 && live ? 'green' : 'slate'} />
    </div>
  );
}
