import { useState } from 'react';
import { useHylex, useDispatch } from '../store/HylexContext';
import {
  Wifi, WifiOff, Activity, Radio, Zap, RotateCcw, FlaskConical,
  Shield, FileText, Tv, Sliders, BrainCircuit, Bot
} from 'lucide-react';
import SynopsisModal from './SynopsisModal';
import HmiModal from './HmiModal';

export default function ConnectionBar({
  activeView = 'dashboard',
  setActiveView = () => {},
  isCopilotOpen = false,
  setIsCopilotOpen = () => {}
}) {
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
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
            ESP32 LIVE · {state.latencyMs ?? 12}ms
          </span>
        );
      }
      if (state.wsStatus === 'connecting') {
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono">
            <Activity size={12} className="animate-spin text-amber-400" /> Connecting…
          </span>
        );
      }
      return (
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-mono">
          <WifiOff size={12} className="text-red-400" /> ESP32 Offline
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono" title="Telemetry is synthesized for judging demonstration">
        <Radio size={12} className="text-cyan-400" /> SIMULATED TELEMETRY
      </span>
    );
  };

  return (
    <>
      <header className="flex items-center justify-between px-4 py-2 bg-slate-900/95 border-b border-slate-800 backdrop-blur-md flex-shrink-0 z-30">
        {/* Left: Brand Identity & View Switcher */}
        <div className="flex items-center gap-3">
          {/* Brand Logo */}
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Shield size={16} />
            </div>
            <div>
              <div className="text-sm font-bold font-mono text-white tracking-wider leading-none">
                HYLEX
              </div>
              <div className="text-[10px] text-slate-400 font-sans leading-none mt-0.5">
                Desalination Valorization · UN SDG 6
              </div>
            </div>
          </div>

          <div className="w-px h-5 bg-slate-800 hidden sm:block" />

          {/* Navigation View Switcher (Segmented Control) */}
          <div className="flex items-center bg-slate-950 rounded-lg p-0.5 border border-slate-800">
            <button
              type="button"
              onClick={() => setActiveView('dashboard')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-sans font-medium transition-colors ${
                activeView === 'dashboard'
                  ? 'bg-slate-800 text-cyan-300 shadow-sm border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders size={13} className={activeView === 'dashboard' ? 'text-cyan-400' : 'text-slate-500'} />
              <span>Digital Twin</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView('ai')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-sans font-medium transition-colors ${
                activeView === 'ai'
                  ? 'bg-slate-800 text-purple-300 shadow-sm border border-purple-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BrainCircuit size={13} className={activeView === 'ai' ? 'text-purple-400' : 'text-slate-500'} />
              <span>AI Intelligence Suite</span>
            </button>
          </div>
        </div>

        {/* Center: Hardware Mode & Live Status / Sim Presets */}
        <div className="hidden lg:flex items-center gap-2.5">
          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-950 rounded-lg p-0.5 border border-slate-800">
            <button
              type="button"
              onClick={() => dispatch({ type: 'SET_MODE', payload: 'simulation' })}
              className={`px-2.5 py-1 rounded text-xs font-sans font-medium transition-colors ${
                isSim
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Simulation
            </button>
            <button
              type="button"
              onClick={() => dispatch({ type: 'SET_MODE', payload: 'live' })}
              className={`px-2.5 py-1 rounded text-xs font-sans font-medium transition-colors ${
                isLive
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              ESP32 Live
            </button>
          </div>

          {/* Status Badge */}
          {statusBadge()}

          {/* ESP32 URL input when in live mode */}
          {isLive && (
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1 bg-slate-950 rounded-lg border border-slate-800 px-2.5 py-1">
                <Wifi size={11} className="text-slate-500" />
                <input
                  type="text"
                  value={localUrl}
                  onChange={(e) => {
                    setLocalUrl(e.target.value);
                    dispatch({ type: 'SET_WS_URL', payload: e.target.value });
                  }}
                  className="bg-transparent text-xs font-mono text-slate-300 w-36 outline-none"
                  placeholder="ws://192.168.4.1:81"
                />
              </div>
              {state.wsStatus === 'connected' ? (
                <button
                  type="button"
                  onClick={disconnect}
                  className="px-2.5 py-1 rounded-lg text-xs font-sans bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20 transition-colors"
                >
                  Disconnect
                </button>
              ) : (
                <button
                  type="button"
                  onClick={connect}
                  className="px-2.5 py-1 rounded-lg text-xs font-sans bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 transition-colors"
                >
                  Connect
                </button>
              )}
            </div>
          )}

          {/* Judge Demo Presets — Simulation mode */}
          {isSim && (
            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-800">
              <button
                type="button"
                onClick={() => dispatch({ type: 'SIM_INJECT_RAW' })}
                className="flex items-center gap-1 px-2 py-1 rounded text-xs font-sans bg-red-500/10 border border-red-500/25 text-red-300 hover:bg-red-500/20 transition-colors"
                title="Inject Raw Brine (780 ppm triggers Recirculation to Tank A)"
              >
                <FlaskConical size={12} className="text-red-400" />
                <span>Raw (780 ppm)</span>
              </button>

              <button
                type="button"
                onClick={() => dispatch({ type: 'SIM_VORTEX_CLEAN' })}
                className="flex items-center gap-1 px-2 py-1 rounded text-xs font-sans bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 hover:bg-emerald-500/20 transition-colors"
                title="Vortex Clarified (380 ppm routes Clean to Tank B)"
              >
                <Zap size={12} className="text-emerald-400" />
                <span>Clarified (380 ppm)</span>
              </button>

              <button
                type="button"
                onClick={handleTurretIndex}
                disabled={turretCooldown}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-sans transition-colors ${
                  turretCooldown
                    ? 'bg-slate-800/40 border border-slate-800 text-slate-600 cursor-not-allowed'
                    : 'bg-amber-500/10 border border-amber-500/25 text-amber-300 hover:bg-amber-500/20'
                }`}
                title="Pinch cutoff chute for 3s and rotate 28BYJ-48 stepper 120°"
              >
                <RotateCcw size={12} className={turretCooldown ? 'animate-spin text-amber-400' : 'text-amber-400'} />
                <span>Turret (120°)</span>
              </button>
            </div>
          )}
        </div>

        {/* Right side: Co-Pilot toggle & Modals */}
        <div className="flex items-center gap-2">
          {/* Quick AI Co-Pilot Slide-over Trigger */}
          <button
            type="button"
            onClick={() => setIsCopilotOpen(!isCopilotOpen)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-sans font-medium transition-colors shadow-sm ${
              isCopilotOpen
                ? 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-200'
                : 'bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-300'
            }`}
            title="Toggle AI Co-Pilot Panel"
          >
            <Bot size={14} className="text-cyan-400" />
            <span>Co-Pilot</span>
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block" />
          </button>

          {/* Arduino TFT HMI Modal Trigger */}
          <button
            type="button"
            onClick={() => setIsHmiOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-sans text-slate-200 transition-colors shadow-sm"
            title="Open Arduino 3.5-inch TFT LCD Touchscreen HMI"
          >
            <Tv size={13} className="text-cyan-400" />
            <span>HMI Screen</span>
          </button>

          {/* Project Dossier Modal Trigger */}
          <button
            type="button"
            onClick={() => setIsSynopsisOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-xs font-sans text-emerald-300 transition-colors shadow-sm"
            title="View Engineering Dossier & System Specs"
          >
            <FileText size={13} className="text-emerald-400" />
            <span>Dossier</span>
          </button>
        </div>
      </header>

      {/* Modals */}
      <SynopsisModal isOpen={isSynopsisOpen} onClose={() => setIsSynopsisOpen(false)} />
      <HmiModal isOpen={isHmiOpen} onClose={() => setIsHmiOpen(false)} />
    </>
  );
}
