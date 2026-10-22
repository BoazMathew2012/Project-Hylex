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
import {
  Bot, Send, Sparkles, AlertCircle, CheckCircle2,
  ChevronDown, ChevronUp, Terminal, ShieldCheck,
  Info, Trash2, Settings, RefreshCw, Square, Cpu, AlertTriangle
} from 'lucide-react';

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
  const [ollamaConfig, setConfigState] = useState(getOllamaConfig());
  const [ollamaStatus, setOllamaStatus] = useState({
    checked: false,
    online: false,
    latencyMs: null,
    models: [],
    error: null,
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSnapshotExpanded, setIsSnapshotExpanded] = useState(false);

  // Chat State
  const [messages, setMessages] = useState([
    {
      id: 'welcome-1',
      sender: 'assistant',
      timestamp: Date.now(),
      text: `**Project Hylex Real Local LLM Co-Pilot active.**

Powered by local **${ollamaConfig.model}** via Ollama on your MacBook. I analyze real-time telemetry from our 4-tier hybrid desalination tower, explain OLS salinity kinetics, evaluate electrode health indicators, and discuss the autonomous 500 ppm Dubai potable routing gate.

Ask any question about system operation, chemistry, mechanics, or economics.`,
      tags: ['LOCAL LLM', 'LIVE TELEMETRY'],
    }
  ]);

  const [inputQuery, setInputQuery] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef(null);
  const abortControllerRef = useRef(null);

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

  // Run initial health check on mount
  useEffect(() => {
    runHealthCheck(ollamaConfig.baseUrl);
    return () => {
      // Abort ongoing generation on unmount
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [runHealthCheck, ollamaConfig.baseUrl]);

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

    // Check if model exists in Ollama
    const modelMissing = ollamaStatus.online &&
      ollamaStatus.models.length > 0 &&
      !ollamaStatus.models.some((m) => m === ollamaConfig.model || m.startsWith(`${ollamaConfig.model}:`));

    const userMsgId = `user-${Date.now()}`;
    const asstMsgId = `asst-${Date.now() + 1}`;

    const userMsg = {
      id: userMsgId,
      sender: 'user',
      timestamp: Date.now(),
      text: q,
    };

    const asstMsg = {
      id: asstMsgId,
      sender: 'assistant',
      timestamp: Date.now(),
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
                text: `⚠️ **Ollama is not reachable at \`${ollamaConfig.baseUrl}\`.**\n\nTo start your local LLM engine on macOS:\n1. Open your Terminal and run:\n\`\`\`bash\nollama serve\n\`\`\`\n2. Verify the server is running, then click the **Re-check** button in the header.\n\n*(Model configured: \`${ollamaConfig.model}\`)*`,
                tags: ['OFFLINE ERROR'],
              }
            : m
        )
      );
      setIsStreaming(false);
      return;
    }

    if (modelMissing) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === asstMsgId
            ? {
                ...m,
                isStreaming: false,
                text: `⚠️ **Model \`${ollamaConfig.model}\` is not installed in your local Ollama library.**\n\nRun the following command in Terminal to download it:\n\`\`\`bash\nollama pull ${ollamaConfig.model}\n\`\`\`\nOnce downloaded, ask your question again!`,
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
                  text: content || 'Response generated.',
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
                  text: `⚠️ **Ollama Error:**\n\n${errMsg}`,
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
          ? { ...m, isStreaming: false, text: m.text ? `${m.text}\n\n*(Generation stopped by operator)*` : '*(Generation cancelled)*' }
          : m
      )
    );
  };

  const handleClearHistory = () => {
    if (isStreaming) handleAbortGeneration();
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'assistant',
        timestamp: Date.now(),
        text: `**Chat history cleared.** Ready for new inquiries with local **${ollamaConfig.model}**.`,
        tags: ['LOCAL LLM'],
      }
    ]);
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/90 backdrop-blur-md flex flex-col h-full overflow-hidden border-glow-cyan shadow-xl">
      {/* Header */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between flex-shrink-0 bg-slate-950/70">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
            <Bot size={16} />
          </div>
          <div>
            <div className="text-xs font-mono font-bold text-white flex items-center gap-2">
              <span>HYLEX AI CO-PILOT</span>
              {/* Ollama Connection Indicator */}
              {ollamaStatus.online ? (
                <span className="flex items-center gap-1 text-[8px] px-1.5 py-0.5 rounded border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-ring inline-block" />
                  {ollamaConfig.model} · {ollamaStatus.latencyMs}ms
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[8px] px-1.5 py-0.5 rounded border border-red-500/40 bg-red-500/10 text-red-300 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
                  OLLAMA OFFLINE
                </span>
              )}
            </div>
            <div className="text-[9px] text-slate-400 font-mono flex items-center gap-2">
              <span>Local Ollama LLM · M1 Unified Memory</span>
              {snapshot.isStale && (
                <span className="text-amber-400 font-bold text-[8px] flex items-center gap-0.5">
                  <AlertCircle size={8} /> STALE ({snapshot.freshnessSec}s)
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Telemetry Snapshot Context Toggle */}
          <button
            onClick={() => setIsSnapshotExpanded(!isSnapshotExpanded)}
            className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-[9px] font-mono text-slate-300 transition-all"
            title="Inspect Live Telemetry Snapshot"
          >
            <Terminal size={10} className="text-cyan-400" />
            <span>Context</span>
            {isSnapshotExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
          </button>

          {/* Model / Ollama Settings Button */}
          <button
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className={`p-1.5 rounded border transition-all ${
              isSettingsOpen
                ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                : 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            title="Configure Ollama Model & Endpoint"
          >
            <Settings size={12} />
          </button>

          {/* Clear Chat */}
          <button
            onClick={handleClearHistory}
            className="p-1.5 rounded bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-red-400 transition-all"
            title="Clear Chat History"
          >
            <Trash2 size={12} />
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="px-2 py-0.5 text-xs font-mono text-slate-400 hover:text-white rounded hover:bg-slate-800 ml-1"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Ollama Configuration Popover / Drawer */}
      {isSettingsOpen && (
        <div className="p-3 bg-slate-950 border-b border-slate-800 text-[9.5px] font-mono space-y-2 flex-shrink-0 animate-in fade-in duration-150">
          <div className="flex justify-between items-center text-[9px] text-slate-300 font-bold border-b border-slate-800/80 pb-1">
            <span className="flex items-center gap-1 text-cyan-300">
              <Cpu size={12} /> LOCAL OLLAMA CONFIGURATION
            </span>
            <button
              onClick={() => runHealthCheck(ollamaConfig.baseUrl)}
              className="flex items-center gap-1 text-[8.5px] text-cyan-400 hover:text-cyan-200"
              title="Test Ollama Connection"
            >
              <RefreshCw size={9} />
              <span>Test Connection</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* Model Name Input & Dropdown */}
            <div>
              <label className="text-[8px] text-slate-400 uppercase font-bold block mb-1">
                Model Name
              </label>
              <div className="flex gap-1">
                <input
                  type="text"
                  value={ollamaConfig.model}
                  onChange={(e) => handleUpdateConfig({ model: e.target.value.trim() })}
                  placeholder={DEFAULT_MODEL}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white outline-none focus:border-cyan-500"
                />
              </div>
              {/* Detected models list */}
              {ollamaStatus.models.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  <span className="text-[7.5px] text-slate-500">Installed:</span>
                  {ollamaStatus.models.map((m) => (
                    <button
                      key={m}
                      onClick={() => handleUpdateConfig({ model: m })}
                      className={`text-[7.5px] px-1 py-0.2 rounded border ${
                        ollamaConfig.model === m
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold'
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
              <label className="text-[8px] text-slate-400 uppercase font-bold block mb-1">
                Ollama Endpoint
              </label>
              <input
                type="text"
                value={ollamaConfig.baseUrl}
                onChange={(e) => handleUpdateConfig({ baseUrl: e.target.value.trim() })}
                placeholder={DEFAULT_OLLAMA_URL}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white outline-none focus:border-cyan-500"
              />
              <div className="text-[7.5px] text-slate-500 mt-1">
                Default: http://127.0.0.1:11434 (or /ollama proxy)
              </div>
            </div>
          </div>

          {/* Connection status notification */}
          <div className={`p-1.5 rounded border text-[8.5px] flex items-center justify-between ${
            ollamaStatus.online
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}>
            <span className="flex items-center gap-1.5">
              {ollamaStatus.online ? <CheckCircle2 size={11} className="text-emerald-400" /> : <AlertTriangle size={11} className="text-red-400" />}
              {ollamaStatus.online
                ? `Connected: ${ollamaStatus.models.length} model(s) detected (${ollamaStatus.latencyMs}ms)`
                : `Offline: ${ollamaStatus.error || 'Connection refused. Is Ollama running?'}`}
            </span>
            <span className="text-slate-400">
              Terminal: <code className="text-cyan-300">ollama run {ollamaConfig.model}</code>
            </span>
          </div>
        </div>
      )}

      {/* Collapsible Telemetry Context Inspector */}
      {isSnapshotExpanded && (
        <div className="p-2.5 bg-slate-950 border-b border-slate-800 text-[9.5px] font-mono text-slate-300 space-y-2 flex-shrink-0 max-h-48 overflow-y-auto">
          <div className="flex justify-between items-center text-[8.5px] text-slate-400 border-b border-slate-800/60 pb-1">
            <span className="font-bold text-cyan-300 flex items-center gap-1">
              <Terminal size={10} /> LIVE TELEMETRY SNAPSHOT CONTEXT (INJECTED INTO LLM PROMPT)
            </span>
            <span>Freshness: {snapshot.freshnessSec !== null ? `${snapshot.freshnessSec}s` : 'N/A'}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[9px]">
            <div className="bg-slate-900/60 p-2 rounded border border-slate-800/60 space-y-0.5">
              <div className="text-[8px] text-slate-500 font-bold uppercase">Sensors (Measured)</div>
              <div>TDS: <span className="text-cyan-300 font-bold">{snapshot.sensors.tdsPpm.toFixed(1)} ppm</span></div>
              <div>Temp: <span className="text-slate-200">{snapshot.sensors.tempC.toFixed(1)} °C</span></div>
              <div>EC₂₅ Compensated: <span className="text-slate-200">{snapshot.sensors.ec25CompensatedPpm} ppm</span></div>
              <div>Industrial Equiv: <span className="text-slate-200">{snapshot.sensors.industrialEquivalentPpm.toLocaleString()} ppm</span></div>
            </div>

            <div className="bg-slate-900/60 p-2 rounded border border-slate-800/60 space-y-0.5">
              <div className="text-[8px] text-slate-500 font-bold uppercase">Actuators &amp; Routing</div>
              <div>Decision: <span className={snapshot.controls.routeClean ? 'text-emerald-400' : 'text-amber-400'}>{snapshot.controls.decision}</span></div>
              <div>Pump (Ch1): <span className="text-slate-200">{snapshot.controls.pumpActive ? 'ON' : 'OFF'}</span></div>
              <div>EC Relays: <span className="text-slate-200">Pod:{snapshot.controls.podEcActive ? 'ON' : 'OFF'} | Tank:{snapshot.controls.tankEcActive ? 'ON' : 'OFF'}</span></div>
              <div>Carousel: <span className="text-slate-200">Pod #{snapshot.controls.activeCarouselSlot} ({snapshot.controls.podSaturationPct[snapshot.controls.activeCarouselSlot - 1]?.toFixed(0)}%)</span></div>
            </div>
          </div>

          {/* Uninstrumented Sensors Disclosure */}
          <div className="p-2 rounded bg-amber-500/5 border border-amber-500/20 text-[8.5px] space-y-0.5">
            <div className="text-amber-400 font-bold flex items-center gap-1">
              <Info size={10} /> Physical Boundary Disclosures (Uninstrumented)
            </div>
            <div className="text-slate-400">
              {snapshot.uninstrumentedSensors.join(' • ')}
            </div>
          </div>
        </div>
      )}

      {/* Chat Messages Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0" style={{ scrollbarWidth: 'thin' }}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            {/* Sender indicator */}
            <div className="text-[8.5px] font-mono text-slate-500 mb-1 flex items-center gap-1.5">
              {msg.sender === 'user' ? (
                <>
                  <span>OPERATOR</span>
                  <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                </>
              ) : (
                <>
                  <Bot size={10} className="text-cyan-400" />
                  <span className="text-cyan-400 font-bold">
                    {msg.model ? `${msg.model.toUpperCase()}` : `HYLEX CO-PILOT (${ollamaConfig.model})`}
                  </span>
                  <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                  {msg.isStreaming && (
                    <span className="text-[8px] text-amber-300 animate-pulse font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block animate-ping" />
                      GENERATING...
                    </span>
                  )}
                </>
              )}
            </div>

            {/* Bubble */}
            <div
              className={`max-w-[92%] rounded-xl p-3 text-[11px] leading-relaxed font-mono whitespace-pre-wrap ${
                msg.sender === 'user'
                  ? 'bg-cyan-950/40 border border-cyan-500/40 text-cyan-100 rounded-tr-none'
                  : 'bg-slate-950/70 border border-slate-800 text-slate-200 rounded-tl-none shadow-md'
              }`}
            >
              {/* Optional Reasoning / Thinking foldout if generated by model */}
              {msg.thinking && (
                <details className="mb-2 text-[8.5px] font-mono bg-slate-900/80 rounded border border-slate-800 p-1.5">
                  <summary className="cursor-pointer text-cyan-400 font-bold hover:text-cyan-300 select-none">
                    {msg.isStreaming && !msg.text
                      ? '🧠 Reasoning through telemetry data...'
                      : '🧠 View Model Reasoning'}
                  </summary>
                  <div className="mt-1 text-slate-400 whitespace-pre-wrap pl-2 border-l border-slate-700 max-h-36 overflow-y-auto">
                    {msg.thinking}
                  </div>
                </details>
              )}

              {/* Text Body */}
              {msg.text ? (
                msg.text.split('\n').map((line, idx) => {
                  if (line.startsWith('• ') || line.startsWith('- ')) {
                    return (
                      <div key={idx} className="ml-2 my-0.5 text-slate-300">
                        {line}
                      </div>
                    );
                  }
                  if (line.startsWith('**') && line.endsWith('**')) {
                    return (
                      <div key={idx} className="font-bold text-white mt-1.5 mb-1">
                        {line.replace(/\*\*/g, '')}
                      </div>
                    );
                  }
                  return (
                    <div key={idx} className={line.trim() === '' ? 'h-2' : ''}>
                      {line}
                    </div>
                  );
                })
              ) : msg.isStreaming ? (
                <span className="text-slate-500 italic">Formulating response...</span>
              ) : null}

              {/* Streaming Cursor */}
              {msg.isStreaming && (
                <span className="inline-block w-1.5 h-3 bg-cyan-400 animate-pulse ml-0.5 align-middle" />
              )}

              {/* Badges for evidence categories */}
              {msg.tags && msg.tags.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex flex-wrap gap-1">
                  {msg.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[7.5px] font-mono px-1.5 py-0.5 rounded border uppercase bg-cyan-500/10 text-cyan-300 border-cyan-500/30"
                    >
                      [{tag}]
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
      <div className="p-2 border-t border-slate-800 bg-slate-950/40 flex-shrink-0">
        <div className="text-[8px] font-mono text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">
          <Sparkles size={9} className="text-cyan-400" />
          <span>Quick Inquiry Chips (Live Ollama Prompt)</span>
        </div>
        <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
          {SUGGESTED_QUERIES.map((sq, idx) => (
            <button
              key={idx}
              onClick={() => handleSendQuery(sq)}
              disabled={isStreaming}
              className="text-[9px] font-mono px-2 py-1 rounded-md bg-slate-800/70 hover:bg-cyan-950/50 hover:text-cyan-300 hover:border-cyan-500/40 border border-slate-700/60 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-left"
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
            placeholder={isStreaming ? 'Model is generating response...' : 'Ask about TDS kinetics, fouling status, Dubai 500 ppm standard...'}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-3 pr-8 py-2 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 disabled:opacity-50"
          />
        </div>

        {isStreaming ? (
          <button
            type="button"
            onClick={handleAbortGeneration}
            className="flex items-center gap-1 px-3 py-2 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30 transition-all text-xs font-mono"
            title="Stop Generation"
          >
            <Square size={12} className="fill-current" />
            <span>Stop</span>
          </button>
        ) : (
          <button
            type="submit"
            disabled={!inputQuery.trim() || isStreaming}
            className="p-2 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            title="Submit Inquiry to Ollama"
          >
            <Send size={14} />
          </button>
        )}
      </form>

      {/* Advisory read-only footer */}
      <div className="px-3 py-1 bg-slate-950 text-[7.5px] font-mono text-slate-500 border-t border-slate-800/80 flex items-center justify-between">
        <span className="flex items-center gap-1">
          <ShieldCheck size={9} className="text-emerald-400" />
          Strictly Read-Only Advisory: Cannot actuate physical hardware
        </span>
        <span className="text-slate-600">Local Ollama · 100% Private</span>
      </div>
    </div>
  );
}
