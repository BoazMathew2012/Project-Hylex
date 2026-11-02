import { useEffect, useRef, useState, useCallback } from 'react';
import { useHylex, useDispatch } from '../store/hooks';
import BrainCircuit from 'lucide-react/dist/esm/icons/brain-circuit.mjs';
import Cpu from 'lucide-react/dist/esm/icons/cpu.mjs';
import Gauge from 'lucide-react/dist/esm/icons/gauge.mjs';

// ── Configuration ──
const PRIMARY_MODEL = 'qwen2.5:1.5b';
const FALLBACK_MODEL = 'llama3.2:1b';
const OLLAMA_ENDPOINTS = ['/ollama/api/generate', 'http://127.0.0.1:11434/api/generate'];
const INFERENCE_INTERVAL_MS = 8000;

const SYSTEM_PROMPT = `You are an optional advisory controller for a benchtop prototype. Input JSON contains temperature-normalized TDS in ppm, a valid temperature or null, measured ESP32 trend in ppm/min, commanded Servo 1 angle, and a time-based pod-load estimate. Output ONLY valid JSON: {"backpressureAngle": <int 20..70>, "decisionLog": "<short reason>"}. Choose Servo 1 from the TDS bands: above 900 => 55..65; 500..900 => 40..50; at or below 500 => 20..30. Adjust by at most 5 degrees using the trend. Do not request carousel rotation; the ESP32 runtime estimate owns that trigger. Never describe the estimate as measured saturation.`;

export default function OllamaController() {
  const { state, sendWsRaw } = useHylex();
  const dispatch = useDispatch();
  const [activeModel, setActiveModel] = useState(PRIMARY_MODEL);
  const [controllerStatus, setControllerStatus] = useState('idle'); // 'idle' | 'inferring' | 'error' | 'active'
  const [errorMsg, setErrorMsg] = useState('');
  const intervalRef = useRef(null);
  const abortRef = useRef(null);
  const prevTdsRef = useRef(state.tds);
  const runInferenceRef = useRef(null);
  const controlAllowedRef = useRef(false);

  const isLive = state.mode === 'live';
  const isConnected = state.wsStatus === 'connected';
  const isActiveSeparation = state.processState === 3;
  const shouldRun = isLive && isConnected && isActiveSeparation && state.tdsValid && state.tempValid && state.controlMode === 'auto';

  // ── Single inference call ──
  const runInference = useCallback(async () => {
    if (abortRef.current) return;
    const controller = new AbortController();
    abortRef.current = controller;

    const deltaTds = state.tds - prevTdsRef.current;
    prevTdsRef.current = state.tds;

    const input = JSON.stringify({
      tds: Math.round(state.tds),
      temp: state.tempValid ? Math.round(state.tempC * 10) / 10 : null,
      tempValid: state.tempValid,
      deltaTds: Math.round(deltaTds * 10) / 10,
      tdsTrendPpmMin: Math.round(state.tdsTrendPpmMin * 10) / 10,
      servo1: state.servo1,
      podRuntimeFillEstimate: state.podLoad,
    });

    const prompt = `Live sensor reading: ${input}`;
    const startMs = performance.now();

    // Try primary model, then fallbacks across configured endpoints
    const candidateModels = [
      activeModel,
      PRIMARY_MODEL,
      'deepseek-r1:1.5b',
      'qwen3:4b',
      FALLBACK_MODEL
    ];
    const modelsToTry = [...new Set(candidateModels)];
    
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
          const decisionLog = typeof parsed.decisionLog === 'string'
            ? parsed.decisionLog.slice(0, 120)
            : 'No reasoning provided';

          // ── Send commands to ESP32 via WebSocket ──
          if (angle !== null && controlAllowedRef.current && !controller.signal.aborted) {
            sendWsRaw(`OLLAMA_BACKPRESSURE:${angle}`);
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
              decisionLog,
              input: { tds: Math.round(state.tds), tempC: state.tempC, tdsTrendPpmMin: state.tdsTrendPpmMin },
            },
          });

          setControllerStatus('active');
          setErrorMsg('');
          if (abortRef.current === controller) abortRef.current = null;
          return; // success — exit loop

        } catch (err) {
          if (err.name === 'AbortError') {
            if (abortRef.current === controller) abortRef.current = null;
            return;
          }
          // continue to next endpoint or model
        }
      }
    }

    if (abortRef.current === controller) abortRef.current = null;
    setControllerStatus('error');
    setErrorMsg('Ollama unreachable on port 11434');
  }, [state.tds, state.tempC, state.tempValid, state.tdsTrendPpmMin, state.servo1, state.podLoad, activeModel, sendWsRaw, dispatch]);

  // ── Polling loop ──
  useEffect(() => { runInferenceRef.current = runInference; }, [runInference]);

  useEffect(() => {
    controlAllowedRef.current = shouldRun;
    if (shouldRun) {
      const initTimer = setTimeout(() => runInferenceRef.current?.(), 50);
      intervalRef.current = setInterval(() => runInferenceRef.current?.(), INFERENCE_INTERVAL_MS);
      return () => {
        clearTimeout(initTimer);
        clearInterval(intervalRef.current);
        abortRef.current?.abort();
        abortRef.current = null;
        controlAllowedRef.current = false;
      };
    } else {
      setTimeout(() => setControllerStatus('idle'), 0);
    }
    return () => {
      clearInterval(intervalRef.current);
      abortRef.current?.abort();
      abortRef.current = null;
      controlAllowedRef.current = false;
    };
  }, [shouldRun]);

  // ── Latest log entry ──
  const logs = state.ollamaControllerLog || [];
  const latest = logs[logs.length - 1];

  return (
    <div className="hylex-panel rounded-[20px] p-4 flex flex-col gap-3 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-purple-500/10 border border-purple-500/25 text-purple-400">
            <BrainCircuit size={13} />
          </div>
          <span className="text-xs font-sans font-semibold text-white tracking-wide">
            Local Ollama Advisor
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
          ? `Laptop-local inference every 4s · angle suggestion sent to the ESP32`
          : isLive && isConnected
          ? `Waiting for State 3 (Active Separation) to begin autonomous control loop`
          : `ESP32 control remains on-board; this optional advisor runs while treatment is active`}
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

          {/* Servo command */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Gauge size={10} className="text-cyan-400" />
              <span className="text-cyan-300">S1 Backpressure:</span>
              <span className="text-white font-bold">{latest.angle ?? '--'}°</span>
            </div>
          </div>

          {/* Decision log */}
          <div className="text-slate-300 leading-relaxed border-t border-slate-800 pt-1.5">
            <span className="text-slate-500">AI: </span>
            {latest.decisionLog}
          </div>

          {/* Input context */}
          <div className="text-slate-500 text-[9px]">
            Input: TDS={latest.input?.tds ?? '--'} ppm · trend={latest.input?.tdsTrendPpmMin?.toFixed(1) ?? '--'} ppm/min
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
              <span>S1={log.angle}°</span>
              <span>{log.latencyMs}ms</span>
              <span className="text-slate-500 truncate max-w-[140px]">{log.decisionLog}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
