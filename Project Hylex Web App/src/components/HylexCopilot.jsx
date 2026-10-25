import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useHylex } from '../store/HylexContext';
import {
  buildTelemetrySnapshot,
  SUGGESTED_QUERIES
} from '../utils/copilotEngine.js';
import { evaluateTdsPrediction } from '../utils/predictionEngine.js';
import { evaluateElectrodeDiagnostics } from '../utils/diagnosticsEngine.js';
import {
  getOllamaConfig,
  setOllamaConfig,
  checkOllamaHealth,
  streamOllamaChat,
  DEFAULT_MODEL,
  DEFAULT_OLLAMA_URL
} from '../services/ollamaService.js';
import MarkdownRenderer from './MarkdownRenderer';
import Bot from 'lucide-react/dist/esm/icons/bot.mjs';
import Send from 'lucide-react/dist/esm/icons/send.mjs';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles.mjs';
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle.mjs';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2.mjs';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down.mjs';
import ChevronUp from 'lucide-react/dist/esm/icons/chevron-up.mjs';
import Terminal from 'lucide-react/dist/esm/icons/terminal.mjs';
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check.mjs';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2.mjs';
import Settings from 'lucide-react/dist/esm/icons/settings.mjs';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw.mjs';
import Square from 'lucide-react/dist/esm/icons/square.mjs';
import Cpu from 'lucide-react/dist/esm/icons/cpu.mjs';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle.mjs';
import X from 'lucide-react/dist/esm/icons/x.mjs';

const INITIAL_WELCOME_MESSAGE = {
  id: 'welcome-init',
  sender: 'assistant',
  timestamp: 0,
  text: `### Project Hylex Local AI Co-Pilot Ready

I am grounded in live telemetry from our **4-tier hybrid desalination tower**:

- **Stage 1 & 3 Dual-Tank Loop:** Monitoring base reservoir recirculation vs clean potable store routing.
- **Stage 2 Membraneless Vortex:** Tracking centrifugal separation through the Archimedean triple-helix.
- **Stage 3 Inline Sensor Suite:** Evaluating Gravity TDS conductivity and DS18B20 thermal compensation.
- **Stage 4 Stepper Turret & Electro-Crystallization:** Observing 3-pod carousel indexing and mineral compaction.
- **Autonomous Routing Gate:** Operating the **500 ppm Dubai potable tap water** threshold.

Ask any question regarding system thermodynamics, salinity kinetics, electrode diagnostics, or B2B circular economics.`,
  tags: ['LOCAL LLM', 'LIVE TELEMETRY'],
};

const CHAT_STORAGE_KEY = 'hylex_copilot_chat_history';
const getCurrentTimestamp = () => Date.now();

function loadSavedMessages() {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const saved = sessionStorage.getItem(CHAT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    }
  } catch (err) {
    console.warn('Failed to load chat history from sessionStorage:', err);
  }
  return [INITIAL_WELCOME_MESSAGE];
}

export default function HylexCopilot({ targetTds = 500, onClose }) {
  const { state } = useHylex();

  // Evaluate live predictions & diagnostics for telemetry grounding
  const prediction = useMemo(() => {
    return evaluateTdsPrediction(state.chartHistory || [], targetTds, state.tds);
  }, [state.chartHistory, targetTds, state.tds]);

  const diagnostics = useMemo(() => {
    return evaluateElectrodeDiagnostics(state);
  }, [state]);

  const snapshot = useMemo(() => {
    return buildTelemetrySnapshot(state, prediction, diagnostics);
  }, [state, prediction, diagnostics]);

  // Ollama Configuration & Status
  const [ollamaConfig, setConfigState] = useState(getOllamaConfig);
  const [ollamaStatus, setOllamaStatus] = useState({
    checked: false,
    online: false,
    latencyMs: null,
    models: [],
    error: null,
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSnapshotExpanded, setIsSnapshotExpanded] = useState(false);

  // Chat State with session persistence
  const [messages, setMessages] = useState(loadSavedMessages);
  const [inputQuery, setInputQuery] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef(null);
  const abortControllerRef = useRef(null);
  const msgCounterRef = useRef(1);

  // Persist messages to sessionStorage when not streaming
  useEffect(() => {
    if (!isStreaming && messages.length > 0) {
      try {
        sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
      } catch (err) {
        console.warn('Failed to save chat history to sessionStorage:', err);
      }
    }
  }, [messages, isStreaming]);

  // Health check callback
  const runHealthCheck = useCallback(async (baseUrl = ollamaConfig.baseUrl) => {
    setOllamaStatus((prev) => ({ ...prev, checked: false }));
    const res = await checkOllamaHealth(baseUrl);
    setOllamaStatus({
      checked: true,
      online: res.online,
      latencyMs: res.latencyMs || null,
      models: res.models || [],
      error: res.error || null,
    });
  }, [ollamaConfig.baseUrl]);

  // Initial health check on mount
  useEffect(() => {
    let isCancelled = false;
    checkOllamaHealth(ollamaConfig.baseUrl).then((res) => {
      if (!isCancelled) {
        setOllamaStatus({
          checked: true,
          online: res.online,
          latencyMs: res.latencyMs || null,
          models: res.models || [],
          error: res.error || null,
        });
      }
    });

    return () => {
      isCancelled = true;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [ollamaConfig.baseUrl]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  // Handle configuration update
  const handleUpdateConfig = (newCfg) => {
    const updated = { ...ollamaConfig, ...newCfg };
    setConfigState(updated);
    setOllamaConfig(updated);
    runHealthCheck(updated.baseUrl);
  };

  // Handle user submit
  const handleSendQuery = async (queryText) => {
    const q = (queryText || inputQuery).trim();
    if (!q || isStreaming) return;

    msgCounterRef.current += 1;
    const currentCount = msgCounterRef.current;
    const userMsgId = `user-${currentCount}`;
    const asstMsgId = `asst-${currentCount}`;
    const nowTime = getCurrentTimestamp();

    const userMsg = {
      id: userMsgId,
      sender: 'user',
      timestamp: nowTime,
      text: q,
    };

    const asstMsg = {
      id: asstMsgId,
      sender: 'assistant',
      timestamp: nowTime,
      text: '',
      thinking: '',
      isStreaming: true,
      tags: ['LLM GENERATION'],
    };

    setMessages((prev) => [...prev, userMsg, asstMsg]);
    setInputQuery('');
    setIsStreaming(true);

    // If Ollama is offline or model is missing, return immediate actionable advice
    if (!ollamaStatus.online) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === asstMsgId
            ? {
                ...m,
                isStreaming: false,
                text: `> ⚠️ **Ollama service is currently unreachable at \`${ollamaConfig.baseUrl}\`**\n\nTo run the local LLM co-pilot engine:\n1. Open Terminal and run: \`ollama serve\`\n2. Verify the server is running, then click **Test Connection** in Settings above.\n\n*(Model configured: \`${ollamaConfig.model}\`)*`,
                tags: ['OFFLINE ERROR'],
              }
            : m
        )
      );
      setIsStreaming(false);
      return;
    }

    const modelMissing =
      ollamaStatus.models.length > 0 &&
      !ollamaStatus.models.some((m) => m === ollamaConfig.model || m.startsWith(`${ollamaConfig.model}:`));

    if (modelMissing) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === asstMsgId
            ? {
                ...m,
                isStreaming: false,
                text: `> ⚠️ **Model \`${ollamaConfig.model}\` is not downloaded in your local Ollama library.**\n\nTo download it, open Terminal and execute:\n\`\`\`bash\nollama pull ${ollamaConfig.model}\n\`\`\`\nOnce downloaded, resubmit your question!`,
                tags: ['MODEL MISSING'],
              }
            : m
        )
      );
      setIsStreaming(false);
      return;
    }

    // Set up abort controller
    abortControllerRef.current = new AbortController();

    // Prepare full history for the LLM
    const historyForLlm = [...messages, userMsg];

    await streamOllamaChat({
      messages: historyForLlm,
      telemetrySnapshot: snapshot,
      config: ollamaConfig,
      signal: abortControllerRef.current.signal,
      onChunk: ({ fullContent, fullThinking }) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === asstMsgId
              ? {
                  ...m,
                  text: fullContent,
                  thinking: fullThinking,
                }
              : m
          )
        );
      },
      onDone: ({ content, thinking, model }) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === asstMsgId
              ? {
                  ...m,
                  text: content || 'Analysis complete.',
                  thinking,
                  isStreaming: false,
                  model,
                }
              : m
          )
        );
        setIsStreaming(false);
        abortControllerRef.current = null;
      },
      onError: (errMsg) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === asstMsgId
              ? {
                  ...m,
                  text: `> ⚠️ **Ollama Error:**\n\n${errMsg}`,
                  isStreaming: false,
                  tags: ['GENERATION ERROR'],
                }
              : m
          )
        );
        setIsStreaming(false);
        abortControllerRef.current = null;
      },
    });
  };

  const handleAbortGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    setMessages((prev) =>
      prev.map((m) =>
        m.isStreaming
          ? {
              ...m,
              isStreaming: false,
              text: m.text ? `${m.text}\n\n*(Generation stopped by operator)*` : '*(Generation cancelled)*',
            }
          : m
      )
    );
  };

  const handleClearHistory = () => {
    if (isStreaming) handleAbortGeneration();
    msgCounterRef.current += 1;
    const resetMsg = [
      {
        id: `welcome-${msgCounterRef.current}`,
        sender: 'assistant',
        timestamp: getCurrentTimestamp(),
        text: `**Chat history reset.** Ready for new inquiries with local **${ollamaConfig.model}**.`,
        tags: ['LOCAL LLM'],
      },
    ];
    setMessages(resetMsg);
    try {
      sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(resetMsg));
    } catch {}
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/90 backdrop-blur-md flex flex-col h-full overflow-hidden shadow-xl">
      {/* Header */}
      <div className="px-3.5 py-2.5 border-b border-slate-800/80 flex items-center justify-between flex-shrink-0 bg-slate-950/80">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/25 text-cyan-400">
            <Bot size={15} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-100 font-mono tracking-tight">HYLEX CO-PILOT</span>
              {/* Connection status badge */}
              {ollamaStatus.online ? (
                <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                  {ollamaConfig.model} · {ollamaStatus.latencyMs}ms
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border border-red-500/30 bg-red-500/10 text-red-300 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
                  Ollama Offline
                </span>
              )}
            </div>
            <div className="text-[10px] text-slate-400 font-sans flex items-center gap-2 mt-0.5">
              <span>Local Ollama · 100% Private</span>
              {snapshot.isStale && (
                <span className="text-amber-400 font-medium text-[10px] flex items-center gap-0.5">
                  <AlertCircle size={9} /> Data Stale ({snapshot.freshnessSec}s)
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Telemetry Snapshot Context Toggle */}
          <button
            type="button"
            onClick={() => setIsSnapshotExpanded(!isSnapshotExpanded)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-sans transition-colors ${
              isSnapshotExpanded
                ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            title="Inspect Live Telemetry Context Injected to LLM"
          >
            <Terminal size={11} className="text-cyan-400" />
            <span>Context</span>
            {isSnapshotExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>

          {/* Model / Ollama Settings Button */}
          <button
            type="button"
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className={`p-1.5 rounded transition-colors ${
              isSettingsOpen
                ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            title="Configure Ollama Model & Endpoint"
          >
            <Settings size={13} />
          </button>

          {/* Clear Chat */}
          <button
            type="button"
            onClick={handleClearHistory}
            className="p-1.5 rounded text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
            title="Reset Chat History"
          >
            <Trash2 size={13} />
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-1"
              title="Close Panel"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Ollama Configuration Popover / Drawer */}
      {isSettingsOpen && (
        <div className="p-3 bg-slate-950 border-b border-slate-800 text-xs font-sans space-y-2.5 flex-shrink-0 animate-in fade-in duration-150">
          <div className="flex justify-between items-center text-xs text-slate-200 font-semibold border-b border-slate-800/80 pb-1.5">
            <span className="flex items-center gap-1.5 text-cyan-300 font-mono">
              <Cpu size={13} /> LOCAL OLLAMA CONFIGURATION
            </span>
            <button
              type="button"
              onClick={() => runHealthCheck(ollamaConfig.baseUrl)}
              className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-200"
              title="Test Ollama Connection"
            >
              <RefreshCw size={10} />
              <span>Test Connection</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Model Name Input & Dropdown */}
            <div>
              <label className="text-[10px] text-slate-400 font-mono uppercase font-semibold block mb-1">
                Model Name
              </label>
              <input
                type="text"
                value={ollamaConfig.model}
                onChange={(e) => handleUpdateConfig({ model: e.target.value.trim() })}
                placeholder={DEFAULT_MODEL}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs font-mono text-white outline-none focus:border-cyan-500"
              />
              {/* Detected models list */}
              {ollamaStatus.models.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  <span className="text-[10px] text-slate-500 font-mono">Available:</span>
                  {ollamaStatus.models.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => handleUpdateConfig({ model: m })}
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded border transition-colors ${
                        ollamaConfig.model === m
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-semibold'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Ollama Base URL */}
            <div>
              <label className="text-[10px] text-slate-400 font-mono uppercase font-semibold block mb-1">
                Ollama Endpoint
              </label>
              <input
                type="text"
                value={ollamaConfig.baseUrl}
                onChange={(e) => handleUpdateConfig({ baseUrl: e.target.value.trim() })}
                placeholder={DEFAULT_OLLAMA_URL}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs font-mono text-white outline-none focus:border-cyan-500"
              />
              <div className="text-[10px] text-slate-500 mt-1 font-mono">
                Default: http://127.0.0.1:11434
              </div>
            </div>
          </div>

          {/* Connection status notification */}
          <div
            className={`p-2 rounded-lg border text-xs flex items-center justify-between ${
              ollamaStatus.online
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-red-500/10 border-red-500/30 text-red-300'
            }`}
          >
            <span className="flex items-center gap-1.5">
              {ollamaStatus.online ? (
                <CheckCircle2 size={13} className="text-emerald-400" />
              ) : (
                <AlertTriangle size={13} className="text-red-400" />
              )}
              {ollamaStatus.online
                ? `Connected: ${ollamaStatus.models.length} model(s) available (${ollamaStatus.latencyMs}ms)`
                : `Offline: ${ollamaStatus.error || 'Connection refused. Is Ollama running?'}`}
            </span>
            <span className="text-slate-400 font-mono text-[11px]">
              <code className="text-cyan-300">ollama run {ollamaConfig.model}</code>
            </span>
          </div>
        </div>
      )}

      {/* Collapsible Telemetry Context Inspector */}
      {isSnapshotExpanded && (
        <div className="p-3 bg-slate-950 border-b border-slate-800 text-xs font-mono text-slate-300 space-y-2 flex-shrink-0 max-h-48 overflow-y-auto">
          <div className="flex justify-between items-center text-[10px] text-slate-400 border-b border-slate-800 pb-1">
            <span className="font-semibold text-cyan-300 flex items-center gap-1.5">
              <Terminal size={11} /> TELEMETRY INJECTED INTO LLM CONTEXT
            </span>
            <span>Freshness: {snapshot.freshnessSec !== null ? `${snapshot.freshnessSec}s` : 'N/A'}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800 space-y-0.5">
              <div className="text-[10px] text-slate-400 font-bold uppercase">Sensor Telemetry</div>
              <div>TDS: <span className="text-cyan-300 font-semibold">{snapshot.sensors.tdsPpm.toFixed(1)} ppm</span></div>
              <div>Temp: <span className="text-slate-200">{snapshot.sensors.tempC.toFixed(1)} °C</span></div>
              <div>Compensated EC₂₅: <span className="text-slate-200">{snapshot.sensors.ec25CompensatedPpm} ppm</span></div>
              <div>Industrial Scale: <span className="text-slate-200">{snapshot.sensors.industrialEquivalentPpm.toLocaleString()} ppm</span></div>
            </div>

            <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800 space-y-0.5">
              <div className="text-[10px] text-slate-400 font-bold uppercase">Actuation &amp; Routing</div>
              <div>Gate Decision: <span className={snapshot.controls.routeClean ? 'text-emerald-400' : 'text-amber-400 font-semibold'}>{snapshot.controls.decision}</span></div>
              <div>12V Pump: <span className="text-slate-200">{snapshot.controls.pumpActive ? 'ON' : 'OFF'}</span></div>
              <div>EC Relays: <span className="text-slate-200">Pod:{snapshot.controls.podEcActive ? 'ON' : 'OFF'} | Tank:{snapshot.controls.tankEcActive ? 'ON' : 'OFF'}</span></div>
              <div>Carousel: <span className="text-slate-200">Pod #{snapshot.controls.activeCarouselSlot} ({snapshot.controls.podSaturationPct[snapshot.controls.activeCarouselSlot - 1]?.toFixed(0)}%)</span></div>
            </div>
          </div>
        </div>
      )}

      {/* Chat Messages Body */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 min-h-0" style={{ scrollbarWidth: 'thin' }}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} min-w-0 w-full`}
          >
            {/* Sender & Timestamp */}
            <div className="text-[10px] font-mono text-slate-400 mb-1 flex items-center gap-1.5">
              {msg.sender === 'user' ? (
                <>
                  <span className="font-semibold text-slate-300">OPERATOR</span>
                  {msg.timestamp > 0 && <span>· {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                </>
              ) : (
                <>
                  <Bot size={11} className="text-cyan-400" />
                  <span className="text-cyan-400 font-semibold">
                    {msg.model ? msg.model.toUpperCase() : `HYLEX CO-PILOT (${ollamaConfig.model})`}
                  </span>
                  {msg.timestamp > 0 && <span>· {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                  {msg.isStreaming && (
                    <span className="text-[10px] text-amber-300 font-semibold flex items-center gap-1 ml-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block animate-ping" />
                      Analyzing...
                    </span>
                  )}
                </>
              )}
            </div>

            {/* Bubble Container */}
            <div
              className={`max-w-[94%] rounded-xl p-3.5 shadow-md min-w-0 ${
                msg.sender === 'user'
                  ? 'bg-slate-800/90 border border-slate-700 text-slate-100 rounded-tr-none'
                  : 'bg-slate-950/80 border border-slate-800 text-slate-200 rounded-tl-none w-full sm:w-auto'
              }`}
            >
              {/* Optional Reasoning / Thinking foldout if generated by model */}
              {msg.thinking && (
                <details className="mb-2 text-[10.5px] font-mono bg-slate-900/90 rounded-lg border border-slate-800 p-2">
                  <summary className="cursor-pointer text-cyan-400 font-semibold hover:text-cyan-300 select-none">
                    {msg.isStreaming && !msg.text
                      ? '🧠 Reasoning through telemetry data...'
                      : '🧠 View Model Reasoning'}
                  </summary>
                  <div className="mt-1.5 text-slate-400 whitespace-pre-wrap pl-2 border-l border-slate-700 max-h-40 overflow-y-auto leading-relaxed">
                    {msg.thinking}
                  </div>
                </details>
              )}

              {/* Text Body - Rich Markdown Rendering */}
              {msg.sender === 'assistant' ? (
                msg.text ? (
                  <>
                    <MarkdownRenderer content={msg.text} />
                    {msg.isStreaming && (
                      <span className="inline-block w-1.5 h-3.5 bg-cyan-400 animate-pulse ml-0.5 align-middle" />
                    )}
                  </>
                ) : msg.isStreaming ? (
                  <span className="text-slate-400 text-xs italic flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping inline-block" />
                    Synthesizing engineering response...
                  </span>
                ) : null
              ) : (
                <div className="text-xs leading-relaxed font-sans text-slate-100 whitespace-pre-wrap">
                  {msg.text}
                </div>
              )}

              {/* Badges for evidence categories */}
              {msg.tags && msg.tags.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex flex-wrap gap-1.5">
                  {msg.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[9px] font-mono px-1.5 py-0.5 rounded border uppercase bg-cyan-500/10 text-cyan-300 border-cyan-500/30"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions Chips */}
      <div className="px-3 py-2 border-t border-slate-800 bg-slate-950/60 flex-shrink-0">
        <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
          <Sparkles size={10} className="text-cyan-400" />
          <span>Quick Inquiry Prompts</span>
        </div>
        <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
          {SUGGESTED_QUERIES.map((sq, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendQuery(sq)}
              disabled={isStreaming}
              className="text-[11px] font-sans px-2.5 py-1 rounded-md bg-slate-800/80 hover:bg-slate-700 hover:text-cyan-200 border border-slate-700/60 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-left"
            >
              {sq}
            </button>
          ))}
        </div>
      </div>

      {/* Query Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendQuery();
        }}
        className="p-2.5 border-t border-slate-800 bg-slate-950/90 flex items-center gap-2 flex-shrink-0"
      >
        <div className="relative flex-1">
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            disabled={isStreaming}
            placeholder={
              isStreaming
                ? 'Model is streaming response...'
                : 'Ask about salinity kinetics, fouling status, Dubai 500 ppm standard...'
            }
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-3 pr-3 py-2 text-xs font-sans text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500/80 disabled:opacity-50"
          />
        </div>

        {isStreaming ? (
          <button
            type="button"
            onClick={handleAbortGeneration}
            className="flex items-center gap-1 px-3 py-2 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30 transition-colors text-xs font-sans font-medium"
            title="Stop Generation"
          >
            <Square size={12} className="fill-current" />
            <span>Stop</span>
          </button>
        ) : (
          <button
            type="submit"
            disabled={!inputQuery.trim() || isStreaming}
            className="p-2 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Submit Inquiry to Local Ollama"
          >
            <Send size={15} />
          </button>
        )}
      </form>

      {/* Advisory read-only footer */}
      <div className="px-3.5 py-1.5 bg-slate-950 text-[10px] font-sans text-slate-400 border-t border-slate-800/80 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <ShieldCheck size={11} className="text-emerald-400" />
          Read-Only Advisory: Cannot directly actuate physical hardware
        </span>
        <span className="text-slate-500 font-mono">UN SDG 6</span>
      </div>
    </div>
  );
}
