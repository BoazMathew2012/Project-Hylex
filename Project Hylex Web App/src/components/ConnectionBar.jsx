import { useState } from 'react';
import { useHylex } from '../store/hooks';
import WifiOff from 'lucide-react/dist/esm/icons/wifi-off.mjs';
import Activity from 'lucide-react/dist/esm/icons/activity.mjs';
import Shield from 'lucide-react/dist/esm/icons/shield.mjs';
import FileText from 'lucide-react/dist/esm/icons/file-text.mjs';
import Tv from 'lucide-react/dist/esm/icons/tv.mjs';
import Sliders from 'lucide-react/dist/esm/icons/sliders.mjs';
import BrainCircuit from 'lucide-react/dist/esm/icons/brain-circuit.mjs';
import Bot from 'lucide-react/dist/esm/icons/bot.mjs';
import Box from 'lucide-react/dist/esm/icons/box.mjs';
import SynopsisModal from './SynopsisModal';
import HmiModal from './HmiModal';

export default function ConnectionBar({
  activeView = 'dashboard',
  setActiveView = () => {},
  isCopilotOpen = false,
  setIsCopilotOpen = () => {}
}) {
  const { state, connect } = useHylex();
  const [isSynopsisOpen, setIsSynopsisOpen] = useState(false);
  const [isHmiOpen, setIsHmiOpen] = useState(false);

  const isLive = state.mode === 'live';
  const statusBadge = () => {
    if (isLive) {
      if (state.wsStatus === 'connected') {
        const isStandby = state.processState === 1;
        return (
          <span className="hylex-status-chip flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-400/[.07] border border-emerald-300/15 text-emerald-200 text-xs font-medium">
            <span className="hylex-status-dot bg-emerald-400" />
            <span>ESP32 online</span>
            {state.latencyMs !== null && <span className="hidden sm:inline text-emerald-200/60">· {state.latencyMs} ms</span>}
            <span className="sr-only">{isStandby ? 'Standby' : 'Live'}</span>
          </span>
        );
      }
      if (state.wsStatus === 'connecting') {
        return (
          <span className="hylex-status-chip flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-400/8 border border-amber-300/15 text-amber-200 text-xs font-medium">
            <Activity size={12} className="animate-spin text-amber-400" /> Connecting…
          </span>
        );
      }
      if (state.wsStatus === 'reconnecting') {
        return (
          <span className="hylex-status-chip flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-400/8 border border-amber-300/15 text-amber-200 text-xs font-medium">
            <Activity size={13} className="animate-spin text-amber-300" /> Reconnecting
          </span>
        );
      }
      return (
        <span className="hylex-status-chip flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-400/8 border border-rose-300/15 text-rose-200 text-xs font-medium">
          <span className="hylex-status-dot bg-rose-300" /> ESP32 offline
        </span>
      );
    }
    return null;
  };

  return (
    <>
      <header className="hylex-header sticky top-0 flex flex-wrap lg:flex-nowrap items-center justify-between gap-x-4 gap-y-3 px-4 sm:px-6 py-3 flex-shrink-0 z-30">
        {/* Left: Brand Identity & View Switcher */}
        <div className="flex items-center gap-3">
          {/* Brand Logo */}
          <div className="flex items-center gap-2">
            <div className="hylex-brand-mark grid place-items-center rounded-[13px] text-cyan-200">
              <Shield size={18} strokeWidth={1.8} />
            </div>
            <div>
              <div className="text-sm font-semibold text-white tracking-[0.16em] leading-none">
                HYLEX
              </div>
              <div className="text-[10px] text-slate-500 font-sans leading-none mt-1 tracking-wide">
                WATER REUSE SYSTEM
              </div>
            </div>
          </div>

          <div className="w-px h-5 bg-slate-800 hidden sm:block" />

          {/* Navigation View Switcher (Segmented Control) */}
          <div className="hylex-nav flex items-center rounded-full p-1">
            <button
              type="button"
              onClick={() => setActiveView('dashboard')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-medium transition-all duration-200 ${
                activeView === 'dashboard'
                  ? 'hylex-nav-active text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sliders size={13} className={activeView === 'dashboard' ? 'text-cyan-400' : 'text-slate-500'} />
              <span>Digital Twin</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView('ai')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-medium transition-all duration-200 ${
                activeView === 'ai'
                  ? 'hylex-nav-active text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BrainCircuit size={13} className={activeView === 'ai' ? 'text-purple-400' : 'text-slate-500'} />
              <span>Insights</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView('model')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-medium transition-all duration-200 ${
                activeView === 'model'
                  ? 'hylex-nav-active text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Box size={13} className={activeView === 'model' ? 'text-cyan-400' : 'text-slate-500'} />
              <span>3D Model</span>
            </button>
          </div>
        </div>

        {/* Live connection: connects on launch and retries automatically. */}
        <div className="flex items-center gap-2">
          {statusBadge()}
          {state.wsStatus !== 'connected' && (
            <button
              type="button"
              onClick={connect}
              className="hylex-secondary-button px-3 py-2 rounded-full text-xs font-medium text-slate-200 transition-all"
            >
              Retry now
            </button>
          )}
        </div>

        {/* Right side: Co-Pilot toggle & Modals */}
        <div className="flex items-center gap-1.5">
          {/* Quick AI Co-Pilot Slide-over Trigger */}
          <button
            type="button"
            onClick={() => setIsCopilotOpen(!isCopilotOpen)}
            className={`hylex-tool-button flex items-center gap-2 px-2.5 py-2 rounded-full text-xs font-medium transition-all duration-200 ${
              isCopilotOpen
                ? 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-200'
                : 'text-slate-300 hover:text-white'
            }`}
            title="Toggle AI Co-Pilot Panel"
          >
            <Bot size={14} className="text-cyan-400" />
            <span className="hidden xl:inline">Co-pilot</span>
            <span className="hylex-status-dot bg-cyan-300" />
          </button>

          {/* Arduino TFT HMI Modal Trigger */}
          <button
            type="button"
            onClick={() => setIsHmiOpen(true)}
            className="hylex-tool-button flex items-center gap-2 px-2.5 py-2 rounded-full text-xs text-slate-300 transition-all"
            title="Open live 3.5-inch TFT telemetry mirror"
          >
            <Tv size={13} className="text-cyan-400" />
            <span className="hidden xl:inline">Display</span>
          </button>

          {/* Project Dossier Modal Trigger */}
          <button
            type="button"
            onClick={() => setIsSynopsisOpen(true)}
            className="hylex-tool-button flex items-center gap-2 px-2.5 py-2 rounded-full text-xs text-slate-300 transition-all"
            title="View Engineering Dossier & System Specs"
          >
            <FileText size={13} className="text-emerald-400" />
            <span className="hidden xl:inline">Project brief</span>
          </button>
        </div>
      </header>

      {/* Modals */}
      <SynopsisModal isOpen={isSynopsisOpen} onClose={() => setIsSynopsisOpen(false)} />
      <HmiModal isOpen={isHmiOpen} onClose={() => setIsHmiOpen(false)} />
    </>
  );
}
