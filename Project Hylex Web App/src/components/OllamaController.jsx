import { useEffect, useRef, useState, useCallback } from 'react';
import { useHylex, useDispatch } from '../store/HylexContext';
import BrainCircuit from 'lucide-react/dist/esm/icons/brain-circuit.mjs';
import Cpu from 'lucide-react/dist/esm/icons/cpu.mjs';
import RotateCcw from 'lucide-react/dist/esm/icons/rotate-ccw.mjs';
import Gauge from 'lucide-react/dist/esm/icons/gauge.mjs';

// ── Configuration ──
const PRIMARY_MODEL = 'qwen2.5:1.5b';
const FALLBACK_MODEL = 'llama3.2:1b';
const OLLAMA_ENDPOINTS = ['/ollama/api/generate', 'http://127.0.0.1:11434/api/generate'];
const INFERENCE_INTERVAL_MS = 4000;

const SYSTEM_PROMPT = `You are the Hylex Edge-AI Brine Controller. Input is live JSON: {tds, temp, deltaTds, servo1, podLoad}. Output ONLY valid JSON: {"backpressureAngle": <int 20..70>, "rotatePod": <bool>, "decisionLog": "<12-word technical reason>"}. Rules: If tds > 900, set backpressureAngle between 55 and 70 to increase vortex residence time. If tds is 500..900, set 35..54. If tds <= 500, set 20..30. Set rotatePod true only if podLoad >= 95.`;

export default function OllamaController() {
  const { state, sendWsRaw } = useHylex();
  const dispatch = useDispatch();
  const [activeModel, setActiveModel] = useState(PRIMARY_MODEL);
  const [controllerStatus, setControllerStatus] = useState('idle'); // 'idle' | 'inferring' | 'error' | 'active'
  const [errorMsg, setErrorMsg] = useState('');
  const intervalRef = useRef(null);
  const abortRef = useRef(null);
  const prevTdsRef = useRef(state.tds);

  const isLive = state.mode === 'live';
  const isConnected = state.wsStatus === 'connected';
  const isActiveSeparation = state.processState === 3;
  const shouldRun = isLive && isConnected && isActiveSeparation;

  // ── Single inference call ──
  const runInference = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const deltaTds = state.tds - prevTdsRef.current;
    prevTdsRef.current = state.tds;

    const input = JSON.stringify({
      tds: Math.round(state.tds),
      temp: Math.round(state.tempC * 10) / 10,
      deltaTds: Math.round(deltaTds * 10) / 10,
      servo1: state.servo1,
      podLoad: state.podLoad,
    });

    const prompt = `Live sensor reading: ${input}`;
    const startMs = performance.now();

    // Try primary model, then fallback across configured endpoints
    const modelsToTry = [activeModel, activeModel === PRIMARY_MODEL ? FALLBACK_MODEL : PRIMARY_MODEL];
    
    for (const model of modelsToTry) {
      for (const endpoint of OLLAMA_ENDPOINTS) {
        try {
          setControllerStatus('inferring');
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
              model,
              system: SYSTEM_PROMPT,
              prompt,
              stream: false,
              format: 'json',
              options: { temperature: 0.1, num_predict: 60 },
            }),
          });

          if (!res.ok) {
            continue; // try next endpoint or fallback model
          }

          const data = await res.json();
          const latencyMs = Math.round(performance.now() - startMs);
          
          // Parse the response
          let parsed;
          try {
            parsed = JSON.parse(data.response || '{}');
          } catch {
            throw new Error('Invalid JSON from model');
          }

          const angle = typeof parsed.backpressureAngle === 'number'
            ? Math.max(20, Math.min(70, Math.round(parsed.backpressureAngle)))
            : null;
          const rotatePod = parsed.rotatePod === true;
          const decisionLog = typeof parsed.decisionLog === 'string'
            ? parsed.decisionLog.slice(0, 120)
            : 'No reasoning provided';

          // ── Send commands to ESP32 via WebSocket ──
          if (angle !== null) {
            sendWsRaw(`OLLAMA_BACKPRESSURE:${angle}`);
          }
          if (rotatePod) {
            sendWsRaw('ROTATE_POD');
          }

          // Update active model if fallback succeeded
          if (model !== activeModel) setActiveModel(model);

          // Log to state
          dispatch({
            type: 'OLLAMA_CONTROLLER_LOG',
            payload: {
              ts: Date.now(),
              model,
              latencyMs,
              angle,
              rotatePod,
              decisionLog,
              input: { tds: Math.round(state.tds), podLoad: state.podLoad },
            },
          });

          setControllerStatus('active');
          setErrorMsg('');
          return; // success — exit loop

        } catch (err) {
          if (err.name === 'AbortError') return;
          // continue to next endpoint or model
        }
      }
    }

    setControllerStatus('error');
    setErrorMsg('Ollama unreachable on port 11434');
  }, [state.tds, state.tempC, state.servo1, state.podLoad, activeModel, sendWsRaw, dispatch]);

  // ── Polling loop ──
  useEffect(() => {
    if (shouldRun) {
      const initTimer = setTimeout(runInference, 50);
      intervalRef.current = setInterval(runInference, INFERENCE_INTERVAL_MS);
      return () => {
        clearTimeout(initTimer);
        clearInterval(intervalRef.current);
        abortRef.current?.abort();
      };
    } else {
      setTimeout(() => setControllerStatus('idle'), 0);
    }
    return () => {
      clearInterval(intervalRef.current);
      abortRef.current?.abort();
    };
  }, [shouldRun, runInference]);

  // ── Latest log entry ──
  const logs = state.ollamaControllerLog || [];
  const latest = logs[logs.length - 1];

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/85 backdrop-blur-sm p-3 flex flex-col gap-2.5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-purple-500/10 border border-purple-500/25 text-purple-400">
            <BrainCircuit size={13} />
          </div>
          <span className="text-xs font-sans font-semibold text-white tracking-wide">
            Ollama 1.5B Neural Controller
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
            controllerStatus === 'active'
              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
              : controllerStatus === 'inferring'
              ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
              : controllerStatus === 'error'
              ? 'bg-red-500/10 text-red-300 border-red-500/30'
              : 'bg-slate-800 text-slate-400 border-slate-700'
          }`}>
            {controllerStatus === 'active' ? '● ACTIVE' :
             controllerStatus === 'inferring' ? '◌ INFERRING' :
             controllerStatus === 'error' ? '✕ ERROR' : '○ IDLE'}
          </span>
        </div>
      </div>

      {/* Status description */}
      <div className="text-[10px] text-slate-400 font-sans">
        {shouldRun
          ? `Edge inference every 4s → model controls Servo #1 backpressure angle via ESP32 WebSocket`
          : isLive && isConnected
          ? `Waiting for State 3 (Active Separation) to begin autonomous control loop`
          : `Connect to ESP32 and start treatment to activate edge controller`}
      </div>

      {/* Error message */}
      {controllerStatus === 'error' && errorMsg && (
        <div className="text-[10px] text-red-300 font-mono bg-red-500/10 rounded-md px-2.5 py-1.5 border border-red-500/20">
          {errorMsg}
        </div>
      )}

      {/* Latest inference result */}
      {latest && (
        <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-2.5 font-mono text-[10px] space-y-1.5">
          {/* Model + Latency row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Cpu size={10} className="text-purple-400" />
              <span className="text-purple-300 font-semibold">{latest.model}</span>
            </div>
            <span className="text-slate-400">
              {latest.latencyMs}ms inference
            </span>
          </div>

          {/* Servo angle + Pod rotation */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Gauge size={10} className="text-cyan-400" />
              <span className="text-cyan-300">S1 Backpressure:</span>
              <span className="text-white font-bold">{latest.angle ?? '--'}°</span>
            </div>
            {latest.rotatePod && (
              <div className="flex items-center gap-1 text-amber-300">
                <RotateCcw size={10} className="text-amber-400" />
                <span className="font-semibold">ROTATE POD</span>
              </div>
            )}
          </div>

          {/* Decision log */}
          <div className="text-slate-300 leading-relaxed border-t border-slate-800 pt-1.5">
            <span className="text-slate-500">AI: </span>
            {latest.decisionLog}
          </div>

          {/* Input context */}
          <div className="text-slate-500 text-[9px]">
            Input: TDS={latest.input?.tds ?? '--'} ppm · Pod Load={latest.input?.podLoad ?? 0}%
          </div>
        </div>
      )}

      {/* Recent history (last 3) */}
      {logs.length > 1 && (
        <div className="space-y-1">
          <div className="text-[9px] text-slate-500 font-sans uppercase tracking-wider font-semibold">
            Recent Decisions
          </div>
          {logs.slice(-4, -1).reverse().map((log) => (
            <div key={log.ts} className="flex items-center justify-between text-[9px] font-mono text-slate-400 px-2 py-0.5 bg-slate-950/40 rounded">
              <span>S1={log.angle}° {log.rotatePod ? '· ROT' : ''}</span>
              <span>{log.latencyMs}ms</span>
              <span className="text-slate-500 truncate max-w-[140px]">{log.decisionLog}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
