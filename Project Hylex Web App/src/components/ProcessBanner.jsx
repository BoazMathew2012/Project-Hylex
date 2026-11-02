import { useHylex } from '../store/hooks';
import Play from 'lucide-react/dist/esm/icons/play.mjs';
import Square from 'lucide-react/dist/esm/icons/square.mjs';
import Clock from 'lucide-react/dist/esm/icons/clock.mjs';
import Zap from 'lucide-react/dist/esm/icons/zap.mjs';
import Activity from 'lucide-react/dist/esm/icons/activity.mjs';
import RotateCcw from 'lucide-react/dist/esm/icons/rotate-ccw.mjs';

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
    <div className="flex-shrink-0 animate-rise-in">
      {/* ── State 1: Standby ── */}
      {processState === 1 && (
        <div className="hylex-process-banner hylex-panel flex flex-wrap items-center justify-between gap-4 px-4 py-3 rounded-2xl border-emerald-300/10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 grid place-items-center rounded-xl bg-emerald-300/[.08] border border-emerald-200/10">
              <Clock size={17} className="text-emerald-200" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">
                Ready to treat
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Pump and electrodes are off
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleStart}
              className="hylex-start-button flex items-center gap-2 px-4 py-2.5 rounded-xl text-slate-950 text-xs font-semibold transition-all"
            >
              <Play size={14} />
              Start treatment
            </button>
            <button
              type="button"
              onClick={handleStop}
              className="hylex-stop-button flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all"
            >
              <Square size={12} />
              Stop
            </button>
          </div>
        </div>
      )}

      {/* ── State 2: Pre-Vortex Electro-Coagulation ── */}
      {processState === 2 && (
        <div className="hylex-process-banner hylex-panel flex flex-col gap-3 px-4 py-3.5 rounded-2xl border-amber-300/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 grid place-items-center rounded-xl bg-amber-300/[.08] border border-amber-200/10">
                <Zap size={17} className="text-amber-200" />
              </div>
              <div>
                <div className="text-sm font-semibold text-white">
                  Electro-coagulation
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Stage 1 of 2 · Pump paused
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-amber-100 font-semibold tabular-nums bg-amber-300/[.07] px-3 py-2 rounded-xl border border-amber-200/10">
                {coagRemaining}s left
              </span>
              <button
                type="button"
                onClick={handleStop}
                className="hylex-stop-button flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all"
              >
                <Square size={11} />
                Stop
              </button>
            </div>
          </div>
          {/* Countdown progress bar */}
          <div className="relative h-1.5 rounded-full bg-slate-800/90 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-300 to-orange-300 transition-all duration-1000"
              style={{ width: `${coagProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* ── State 3: Active Separation ── */}
      {processState === 3 && (
        <div className="hylex-process-banner hylex-panel flex flex-wrap items-center justify-between gap-4 px-4 py-3 rounded-2xl border-cyan-300/10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 grid place-items-center rounded-xl bg-cyan-300/[.08] border border-cyan-200/10">
              <Activity size={17} className="text-cyan-200" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">
                  Vortex separation
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                  Stage 2 of 2 · Automatic routing active
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
              <span className="flex items-center gap-2 text-[10px] font-medium text-cyan-100 bg-cyan-300/[.07] px-3 py-2 rounded-full border border-cyan-200/10">
                <span className="hylex-live-mark" />
                Running
            </span>
            <button
              type="button"
              onClick={handleStop}
              className="hylex-stop-button flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all"
            >
              <Square size={11} />
              Stop treatment
            </button>
          </div>
        </div>
      )}

      {processState === 4 && (
        <div className="hylex-process-banner hylex-panel flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border-amber-200/10 animate-rise-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 grid place-items-center rounded-xl bg-amber-300/[.08] border border-amber-200/10">
              <RotateCcw size={15} className="text-amber-300 animate-spin" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">Carousel indexing</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Advancing to the next pod</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs font-mono text-amber-100 tabular-nums">{Math.round(state.podLoad)}%</div>
            <button
              type="button"
              onClick={handleStop}
              className="hylex-stop-button flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all"
            >
              <Square size={11} /> STOP
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
