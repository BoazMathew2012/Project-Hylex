import { useState, useEffect } from 'react';
import { useHylex, useDispatch } from '../store/HylexContext';
import {
  Wifi, WifiOff, Activity, Radio, Zap, RotateCcw, FlaskConical,
  ChevronRight, Settings, Shield, FileText, Tv
} from 'lucide-react';
import SynopsisModal from './SynopsisModal';
import HmiModal from './HmiModal';

export default function ConnectionBar() {
  const { state, connect, disconnect } = useHylex();
  const dispatch = useDispatch();
  const [localUrl, setLocalUrl] = useState(state.wsUrl);
  const [turretCooldown, setTurretCooldown] = useState(false);
  const [isSynopsisOpen, setIsSynopsisOpen] = useState(false);
  const [isHmiOpen, setIsHmiOpen] = useState(false);

  const isLive = state.mode === 'live';
  const isSim = state.mode === 'simulation';

  const handleTurretIndex = () => {
    if (turretCooldown) return;
    setTurretCooldown(true);
    dispatch({ type: 'SIM_TURRET_INDEX' });
    setTimeout(() => {
      dispatch({ type: 'SERVO2_RESET' });
      setTurretCooldown(false);
    }, 3000);
  };

  const statusBadge = () => {
    if (isLive) {
      if (state.wsStatus === 'connected') {
        return (
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-ring inline-block" />
            ONLINE {state.latencyMs}ms
          </span>
        );
      }
      if (state.wsStatus === 'connecting') {
        return (
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-mono blink">
            <Activity size={10} /> CONNECTING…
          </span>
        );
      }
      return (
        <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-mono">
          <WifiOff size={10} /> OFFLINE
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 text-xs font-mono">
        <Radio size={10} /> SIMULATED
      </span>
    );
  };

  return (
    <>
      <header className="flex items-center gap-2.5 px-3 py-1.5 bg-slate-900/90 border-b border-slate-800 backdrop-blur-sm flex-shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-2 mr-1">
          <div className="relative">
            <Shield size={20} className="text-cyan-400" />
            <Zap size={8} className="text-amber-400 absolute bottom-0 right-0" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-100 leading-none tracking-widest">HYLEX</div>
            <div className="text-[9px] text-slate-500 leading-none tracking-wider">SDG-6 COMMAND</div>
          </div>
        </div>

        <div className="w-px h-7 bg-slate-800" />

        {/* Mode Toggle */}
        <div className="flex items-center bg-slate-800/60 rounded p-0.5 gap-0.5">
          <button
            onClick={() => dispatch({ type: 'SET_MODE', payload: 'simulation' })}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
              isSim
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            ◉ SIM MODE
          </button>
          <button
            onClick={() => dispatch({ type: 'SET_MODE', payload: 'live' })}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
              isLive
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            ⚡ LIVE ESP32
          </button>
        </div>

        {/* ESP32 URL input (live mode) */}
        {isLive && (
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1 bg-slate-800 rounded border border-slate-700 px-2 py-1">
              <Wifi size={10} className="text-slate-500" />
              <input
                value={localUrl}
                onChange={e => { setLocalUrl(e.target.value); dispatch({ type: 'SET_WS_URL', payload: e.target.value }); }}
                className="bg-transparent text-xs font-mono text-slate-300 w-44 outline-none"
                placeholder="ws://192.168.4.1:81"
              />
            </div>
            {state.wsStatus === 'connected' ? (
              <button
                onClick={disconnect}
                className="px-2.5 py-1 rounded text-xs bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 transition-all"
              >
                DISCONNECT
              </button>
            ) : (
              <button
                onClick={connect}
                className="px-2.5 py-1 rounded text-xs bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 transition-all"
              >
                CONNECT
              </button>
            )}
          </div>
        )}

        {statusBadge()}

        <div className="w-px h-7 bg-slate-800" />

        {/* Judge Demo Bar — Simulation only */}
        {isSim && (
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] text-slate-600 uppercase tracking-widest font-mono">Demo:</span>

            <button
              onClick={() => dispatch({ type: 'SIM_INJECT_RAW' })}
              className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 hover:border-red-500/50 transition-all"
              title="Inject Raw Brine (>500 ppm triggers Recirculation to Tank A)"
            >
              <FlaskConical size={11} />
              Raw Brine (780 ppm)
            </button>

            <button
              onClick={() => dispatch({ type: 'SIM_VORTEX_CLEAN' })}
              className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/50 transition-all"
              title="Vortex Clarified (<=500 ppm routes Clean to Tank B)"
            >
              <Zap size={11} />
              Vortex Clarified (380 ppm)
            </button>

            <button
              onClick={handleTurretIndex}
              disabled={turretCooldown}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-all ${
                turretCooldown
                  ? 'bg-slate-800/50 border border-slate-700 text-slate-600 cursor-not-allowed'
                  : 'bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 hover:border-amber-500/50'
              }`}
              title="Pinch cutoff chute for 3s and rotate 28BYJ-48 stepper 120°"
            >
              <RotateCcw size={11} className={turretCooldown ? 'animate-spin' : ''} />
              Index Turret (120°)
            </button>
          </div>
        )}

        {/* Right side modals & project brand */}
        <div className="ml-auto flex items-center gap-2">
          {/* Arduino TFT HMI Modal Trigger */}
          <button
            onClick={() => setIsHmiOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-mono text-cyan-300 transition-all shadow-sm"
          >
            <Tv size={12} className="text-cyan-400" />
            <span>3.5" TFT HMI</span>
          </button>

          {/* Project Dossier / Synopsis Modal Trigger */}
          <button
            onClick={() => setIsSynopsisOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-xs font-mono text-emerald-300 transition-all shadow-sm"
          >
            <FileText size={12} className="text-emerald-400" />
            <span>DOSSIER</span>
          </button>

          <div className="w-px h-7 bg-slate-800" />

          <div className="text-right">
            <div className="text-[9px] text-slate-400 font-mono font-bold leading-tight">PROJECT HYLEX</div>
            <div className="text-[8px] text-slate-500 font-mono leading-tight">GEMS 2026 · UN SDG 6</div>
          </div>
        </div>
      </header>

      {/* Modals */}
      <SynopsisModal isOpen={isSynopsisOpen} onClose={() => setIsSynopsisOpen(false)} />
      <HmiModal isOpen={isHmiOpen} onClose={() => setIsHmiOpen(false)} />
    </>
  );
}
