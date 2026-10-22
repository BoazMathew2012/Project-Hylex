import { X, Tv, RefreshCw, Zap, Activity, Cpu } from 'lucide-react';
import { useHylex, useDispatch } from '../store/HylexContext';

export default function HmiModal({ isOpen, onClose }) {
  const { state } = useHylex();
  const dispatch = useDispatch();

  if (!isOpen) return null;

  const { tds, tempC, routeClean, carouselSlot, podSaturation, servo1, servo2, servo3, servo4, relay1, relay2, relay3 } = state;

  const EC25 = (tds / (1 + 0.02 * (tempC - 25))).toFixed(1);
  const isSafe = tds <= 500;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2">
            <Tv size={18} className="text-cyan-400" />
            <span className="text-xs font-mono font-bold tracking-wider text-white">
              ARDUINO UNO R3 + 3.5" TFT LCD (480×320 HMI)
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body: Physical LCD Frame */}
        <div className="p-6 flex flex-col items-center justify-center bg-slate-950">
          
          {/* LCD Bezel / PCB Shield */}
          <div className="relative p-3.5 bg-slate-900 border-2 border-slate-700 rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.8)] w-[480px] max-w-full">
            
            {/* PCB silk screen markings */}
            <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 mb-1 px-1">
              <span>HYLEX HMI v1.2 · ARDUINO UNO R3 SHIELD</span>
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-ring" />
                UART BRIDGE: 9600 BAUD (A5)
              </span>
            </div>

            {/* 480×320 Simulated TFT Glass Display */}
            <div className="w-full h-[320px] bg-black rounded-lg border border-slate-800 p-3.5 flex flex-col justify-between font-mono relative overflow-hidden select-none">
              
              {/* Scanline CRT overlay effect */}
              <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-950/10 via-transparent to-black/40" />

              {/* Top Banner on Screen */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-cyan-400 font-bold text-xs">HYLEX TOWER HMI</span>
                  <span className="text-[10px] text-slate-500">| ESP32 LINK OK</span>
                </div>
                <div className="text-[10px] text-slate-400">
                  {new Date().toLocaleTimeString()}
                </div>
              </div>

              {/* Main Telemetry Gauges */}
              <div className="grid grid-cols-2 gap-2.5 my-2">
                {/* Salinity Gauge */}
                <div className="p-2 rounded bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
                  <div className="flex justify-between items-center text-[9px] text-slate-400">
                    <span>GRAVITY TDS</span>
                    <span className={isSafe ? 'text-emerald-400' : 'text-red-400'}>
                      {isSafe ? 'PASS' : 'RECIRC'}
                    </span>
                  </div>
                  <div className="my-1">
                    <span className="text-2xl font-bold font-mono text-cyan-300">{tds.toFixed(0)}</span>
                    <span className="text-xs text-slate-500 ml-1">PPM</span>
                  </div>
                  {/* Progress bar with 500ppm tick */}
                  <div className="relative h-2 bg-slate-950 rounded overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${isSafe ? 'bg-emerald-400' : 'bg-red-500'}`}
                      style={{ width: `${Math.min(100, (tds / 1000) * 100)}%` }}
                    />
                    <div className="absolute top-0 bottom-0 w-0.5 bg-yellow-400" style={{ left: '50%' }} />
                  </div>
                  <div className="flex justify-between text-[7px] text-slate-500 mt-0.5">
                    <span>0</span>
                    <span>500 SAFE</span>
                    <span>1000</span>
                  </div>
                </div>

                {/* Thermal & Compensation */}
                <div className="p-2 rounded bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
                  <div className="flex justify-between items-center text-[9px] text-slate-400">
                    <span>DS18B20 TEMP</span>
                    <span className="text-cyan-400">EC₂₅ COMP</span>
                  </div>
                  <div className="my-1">
                    <span className="text-2xl font-bold font-mono text-amber-300">{tempC.toFixed(1)}</span>
                    <span className="text-xs text-slate-500 ml-1">°C</span>
                  </div>
                  <div className="text-[10px] text-slate-300">
                    Comp: <span className="text-emerald-400 font-bold">{EC25} PPM</span>
                  </div>
                  <div className="text-[8px] text-slate-500">
                    EC / (1 + 0.02 × (T - 25))
                  </div>
                </div>
              </div>

              {/* Status Banner */}
              <div className={`p-2 rounded border flex items-center justify-between text-xs font-bold transition-all ${
                isSafe
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                  : 'bg-red-500/15 border-red-500/40 text-red-300'
              }`}>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${isSafe ? 'bg-emerald-400' : 'bg-red-400'} pulse-ring`} />
                  <span>{isSafe ? 'ROUTING: TANK B (CLEAN STORE)' : 'ROUTING: TANK A (RECIRCULATE)'}</span>
                </div>
                <span className="text-[10px] font-normal text-slate-400">
                  {isSafe ? 'S3: 0° OPEN' : 'S1: 55° PINCH'}
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
              <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-800/80">
                <button
                  onClick={() => dispatch({ type: 'SIM_INJECT_RAW' })}
                  className="flex-1 py-1 px-1.5 rounded bg-red-950/50 hover:bg-red-900/60 border border-red-500/40 text-[9px] text-red-300 text-center transition-colors"
                >
                  [TOUCH] RAW 780
                </button>
                <button
                  onClick={() => dispatch({ type: 'SIM_VORTEX_CLEAN' })}
                  className="flex-1 py-1 px-1.5 rounded bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-500/40 text-[9px] text-emerald-300 text-center transition-colors"
                >
                  [TOUCH] CLEAN 380
                </button>
                <button
                  onClick={() => {
                    dispatch({ type: 'SIM_TURRET_INDEX' });
                    setTimeout(() => dispatch({ type: 'SERVO2_RESET' }), 3000);
                  }}
                  className="flex-1 py-1 px-1.5 rounded bg-purple-950/50 hover:bg-purple-900/60 border border-purple-500/40 text-[9px] text-purple-300 text-center transition-colors"
                >
                  [TOUCH] +120° STEP
                </button>
              </div>

            </div>

            {/* Arduino Mounting Holes Visuals */}
            <div className="absolute top-2 left-2 w-2 h-2 rounded-full border border-slate-700 bg-slate-950" />
            <div className="absolute top-2 right-2 w-2 h-2 rounded-full border border-slate-700 bg-slate-950" />
            <div className="absolute bottom-2 left-2 w-2 h-2 rounded-full border border-slate-700 bg-slate-950" />
            <div className="absolute bottom-2 right-2 w-2 h-2 rounded-full border border-slate-700 bg-slate-950" />
          </div>

        </div>

        {/* Footer info */}
        <div className="px-5 py-2.5 border-t border-slate-800 bg-slate-900 text-[10px] font-mono text-slate-500 flex justify-between items-center">
          <span>UART SERIAL BRIDGE: ESP32 (GPIO 16/17) ↔ ARDUINO UNO R3 (RX/TX)</span>
          <span className="text-cyan-400">480×320 TFT TOUCH HMI</span>
        </div>

      </div>
    </div>
  );
}
