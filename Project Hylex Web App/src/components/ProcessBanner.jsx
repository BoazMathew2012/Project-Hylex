import { useHylex } from '../store/HylexContext';
import Play from 'lucide-react/dist/esm/icons/play.mjs';
import Square from 'lucide-react/dist/esm/icons/square.mjs';
import Clock from 'lucide-react/dist/esm/icons/clock.mjs';
import Zap from 'lucide-react/dist/esm/icons/zap.mjs';
import Activity from 'lucide-react/dist/esm/icons/activity.mjs';

export default function ProcessBanner() {
  const { state, sendWsRaw } = useHylex();
  const { wsStatus, processState, coagRemaining, mode } = state;

  const isLive = mode === 'live';
  const isConnected = wsStatus === 'connected';

  const handleStart = () => {
    sendWsRaw('START_PROCESS');
  };

  const handleStop = () => {
    sendWsRaw('STOP_PROCESS');
  };

  // Only show banner in Live mode when connected
  if (!isLive || !isConnected) return null;

  // Coagulation progress (30s total)
  const coagTotal = 30;
  const coagProgress = coagTotal > 0 ? Math.max(0, Math.min(100, ((coagTotal - coagRemaining) / coagTotal) * 100)) : 0;

  return (
    <div className="flex-shrink-0">
      {/* ── State 1: Standby ── */}
      {processState === 1 && (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30">
              <Clock size={15} className="text-emerald-400" />
            </div>
            <div>
              <div className="text-xs font-sans font-semibold text-emerald-300">
                Connected to Hylex Tower (Standby Mode)
              </div>
              <div className="text-[10px] text-slate-400 font-sans">
                Standby — Waiting for Operator Start · Pump OFF · Electrodes OFF
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleStart}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-sans font-bold transition-colors shadow-lg shadow-emerald-500/20"
            >
              <Play size={14} />
              START TREATMENT PROCESS
            </button>
            <button
              type="button"
              onClick={handleStop}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/40 text-red-300 text-xs font-sans font-medium transition-colors"
            >
              <Square size={12} />
              STOP
            </button>
          </div>
        </div>
      )}

      {/* ── State 2: Pre-Vortex Electro-Coagulation ── */}
      {processState === 2 && (
        <div className="flex flex-col gap-2 px-4 py-2.5 rounded-xl border border-amber-500/30 bg-amber-500/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30">
                <Zap size={15} className="text-amber-400" />
              </div>
              <div>
                <div className="text-xs font-sans font-semibold text-amber-300">
                  Stage 1: Pre-Vortex Electro-Coagulation in Tank A
                </div>
                <div className="text-[10px] text-slate-300 font-sans">
                  12V Graphite/Mesh Active — Nucleating Mg(OH)₂ & CaCO₃ Flocs | Pump Held OFF:
                  <span className="text-amber-300 font-mono font-bold ml-1">{coagRemaining}s remaining</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-amber-400 font-bold tabular-nums bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/25">
                {coagRemaining}s
              </span>
              <button
                type="button"
                onClick={handleStop}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/40 text-red-300 text-xs font-sans font-medium transition-colors"
              >
                <Square size={11} />
                E-STOP
              </button>
            </div>
          </div>
          {/* Countdown progress bar */}
          <div className="relative h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-1000"
              style={{ width: `${coagProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* ── State 3: Active Separation ── */}
      {processState === 3 && (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border border-cyan-500/30 bg-cyan-500/5">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-cyan-500/15 border border-cyan-500/30">
              <Activity size={15} className="text-cyan-400" />
            </div>
            <div>
              <div className="text-xs font-sans font-semibold text-cyan-300">
                Stage 2: Active Triple-Helix Vortex Separation & AI Routing
              </div>
              <div className="text-[10px] text-slate-400 font-sans">
                Pump ON · Gravity TDS sensing · Ollama 1.5B edge controller active · Real-time servo gating
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded-md border border-cyan-500/25">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse inline-block" />
              LIVE
            </span>
            <button
              type="button"
              onClick={handleStop}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/40 text-red-300 text-xs font-sans font-medium transition-colors"
            >
              <Square size={11} />
              STOP
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
