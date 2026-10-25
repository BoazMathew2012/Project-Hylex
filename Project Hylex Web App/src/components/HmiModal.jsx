import { useState, useEffect } from 'react';
import X from 'lucide-react/dist/esm/icons/x.mjs';
import Tv from 'lucide-react/dist/esm/icons/tv.mjs';
import { useHylex, useDispatch } from '../store/HylexContext';

export default function HmiModal({ isOpen, onClose }) {
  const { state } = useHylex();
  const dispatch = useDispatch();
  const [currentTime, setCurrentTime] = useState(() =>
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );

  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  const { tds, tempC, carouselSlot, podSaturation, relay2, mode, wsStatus } = state;
  const isOffline = mode === 'live' && wsStatus !== 'connected';
  const divisor = 1 + 0.02 * (tempC - 25);
  const EC25 = tds > 0 && divisor > 0 ? (tds / divisor).toFixed(1) : '0.0';
  const isSafe = !isOffline && tds <= 500 && tds > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-900/95 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Tv size={16} />
            </div>
            <div>
              <span className="text-xs font-sans font-bold text-white tracking-wide">
                Arduino Uno R3 + 3.5" TFT LCD Touchscreen
              </span>
              <div className="text-[10px] text-slate-400 font-sans">
                Physical hardware HMI screen replica (480×320 resolution)
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body: Physical LCD Frame */}
        <div className="p-6 flex flex-col items-center justify-center bg-slate-950">
          
          {/* LCD Bezel / PCB Shield */}
          <div className="relative p-3.5 bg-slate-900 border-2 border-slate-700/80 rounded-xl shadow-[0_0_40px_rgba(0,0,0,0.8)] w-[480px] max-w-full">
            
            {/* PCB silk screen markings */}
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1.5 px-1">
              <span>HYLEX HMI v1.2 · ARDUINO SHIELD</span>
              <span className={`flex items-center gap-1.5 ${isOffline ? 'text-red-400' : 'text-emerald-400'}`}>
                <span className={`w-1.5 h-1.5 rounded-full inline-block ${isOffline ? 'bg-red-400' : 'bg-emerald-400'}`} />
                {isOffline ? 'UART BRIDGE: DISCONNECTED' : 'UART BRIDGE: 9600 BAUD (A5)'}
              </span>
            </div>

            {/* 480×320 Simulated TFT Glass Display */}
            <div className="w-full h-[320px] bg-black rounded-lg border border-slate-800 p-4 flex flex-col justify-between font-mono relative overflow-hidden select-none">
              
              {/* Scanline CRT overlay effect */}
              <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-950/10 via-transparent to-black/40" />

              {/* Top Banner on Screen */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-cyan-400 font-bold text-xs">HYLEX TOWER HMI</span>
                  <span className={`text-[10px] ${isOffline ? 'text-red-400' : 'text-slate-500'}`}>
                    | {isOffline ? 'ESP32 OFFLINE' : 'ESP32 LINK OK'}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400">
                  {currentTime}
                </div>
              </div>

              {/* Main Telemetry Gauges */}
              <div className="grid grid-cols-2 gap-2.5 my-2">
                {/* Salinity Gauge */}
                <div className="p-2.5 rounded bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
                  <div className="flex justify-between items-center text-[10px] text-slate-400">
                    <span>GRAVITY TDS</span>
                    <span className={isOffline ? 'text-slate-500 font-bold' : isSafe ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                      {isOffline ? 'OFFLINE' : isSafe ? 'PASS' : 'RECIRC'}
                    </span>
                  </div>
                  <div className="my-1">
                    <span className="text-2xl font-bold font-mono text-cyan-300">{tds.toFixed(0)}</span>
                    <span className="text-xs text-slate-500 ml-1">PPM</span>
                  </div>
                  {/* Progress bar with 500ppm tick */}
                  <div className="relative h-2 bg-slate-950 rounded overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${isOffline ? 'bg-slate-700' : isSafe ? 'bg-emerald-400' : 'bg-amber-400'}`}
                      style={{ width: `${isOffline ? 0 : Math.min(100, (tds / 1000) * 100)}%` }}
                    />
                    <div className="absolute top-0 bottom-0 w-0.5 bg-yellow-400" style={{ left: '50%' }} />
                  </div>
                  <div className="flex justify-between text-[8px] text-slate-500 mt-1">
                    <span>0</span>
                    <span>500 SAFE</span>
                    <span>1000</span>
                  </div>
                </div>

                {/* Thermal & Compensation */}
                <div className="p-2.5 rounded bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
                  <div className="flex justify-between items-center text-[10px] text-slate-400">
                    <span>DS18B20 TEMP</span>
                    <span className="text-cyan-400">EC₂₅ COMP</span>
                  </div>
                  <div className="my-1">
                    <span className="text-2xl font-bold font-mono text-amber-300">{tempC.toFixed(1)}</span>
                    <span className="text-xs text-slate-500 ml-1">°C</span>
                  </div>
                  <div className="text-[11px] text-slate-300">
                    Compensated: <span className="text-emerald-400 font-bold">{EC25} PPM</span>
                  </div>
                  <div className="text-[9px] text-slate-500 mt-0.5">
                    EC₂₅ = EC / (1 + 0.02 × ΔT)
                  </div>
                </div>
              </div>

              {/* Status Banner */}
              <div className={`p-2.5 rounded border flex items-center justify-between text-xs font-bold transition-colors ${
                isOffline
                  ? 'bg-slate-900 border-slate-800 text-slate-400'
                  : isSafe
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                  : 'bg-amber-500/15 border-amber-500/40 text-amber-300'
              }`}>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${isOffline ? 'bg-slate-600' : isSafe ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                  <span>
                    {isOffline
                      ? 'ROUTING: STANDBY (ESP32 OFFLINE)'
                      : isSafe
                      ? 'ROUTING: TANK B (CLEAN STORE)'
                      : 'ROUTING: TANK A (RECIRCULATE)'}
                  </span>
                </div>
                <span className="text-[10px] font-normal text-slate-300">
                  {isOffline ? 'S3: 0° STANDBY' : isSafe ? 'S3: 0° OPEN' : 'S1: 55° PINCH'}
                </span>
              </div>

              {/* Active Carousel Pod & Servos */}
              <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-800 text-[10px]">
                <div className="flex items-center justify-between p-1.5 rounded bg-slate-950/70 border border-slate-800">
                  <span className="text-slate-400">CAROUSEL:</span>
                  <span className="text-purple-300 font-bold">POD #{carouselSlot + 1} ({podSaturation[carouselSlot].toFixed(0)}%)</span>
                </div>
                <div className="flex items-center justify-between p-1.5 rounded bg-slate-950/70 border border-slate-800">
                  <span className="text-slate-400">12V EC POD:</span>
                  <span className={relay2 ? 'text-amber-400 font-bold' : 'text-slate-600'}>
                    {relay2 ? 'ACTIVE (+12V)' : 'OFF'}
                  </span>
                </div>
              </div>

              {/* Bottom Touch Control Strip (Simulated Touch Buttons on TFT) */}
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'SIM_INJECT_RAW' })}
                  className="flex-1 py-1.5 px-2 rounded bg-red-950/50 hover:bg-red-900/60 border border-red-500/40 text-[10px] text-red-300 text-center transition-colors"
                >
                  [TOUCH] RAW 780
                </button>
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'SIM_VORTEX_CLEAN' })}
                  className="flex-1 py-1.5 px-2 rounded bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-500/40 text-[10px] text-emerald-300 text-center transition-colors"
                >
                  [TOUCH] CLEAN 380
                </button>
                <button
                  type="button"
                  onClick={() => {
                    dispatch({ type: 'SIM_TURRET_INDEX' });
                    setTimeout(() => dispatch({ type: 'SERVO2_RESET' }), 3000);
                  }}
                  className="flex-1 py-1.5 px-2 rounded bg-purple-950/50 hover:bg-purple-900/60 border border-purple-500/40 text-[10px] text-purple-300 text-center transition-colors"
                >
                  [TOUCH] +120° STEP
                </button>
              </div>

            </div>

            {/* Arduino Mounting Holes Visuals */}
            <div className="absolute top-2 left-2 w-2.5 h-2.5 rounded-full border border-slate-700 bg-slate-950" />
            <div className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full border border-slate-700 bg-slate-950" />
            <div className="absolute bottom-2 left-2 w-2.5 h-2.5 rounded-full border border-slate-700 bg-slate-950" />
            <div className="absolute bottom-2 right-2 w-2.5 h-2.5 rounded-full border border-slate-700 bg-slate-950" />
          </div>

        </div>

        {/* Footer info */}
        <div className="px-5 py-2.5 border-t border-slate-800 bg-slate-900 text-[10px] font-mono text-slate-400 flex justify-between items-center">
          <span>UART SERIAL BRIDGE: ESP32 (GPIO 16/17) ↔ ARDUINO UNO R3 (RX/TX)</span>
          <span className="text-cyan-400">480×320 TFT TOUCH HMI</span>
        </div>

      </div>
    </div>
  );
}
