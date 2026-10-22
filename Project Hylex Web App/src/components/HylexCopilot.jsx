import { useState, useRef, useEffect, useMemo } from 'react';
import { useHylex } from '../store/HylexContext';
import {
  buildTelemetrySnapshot,
  SUGGESTED_QUERIES,
  answerTelemetryQuery
} from '../utils/copilotEngine';
import { evaluateTdsPrediction } from '../utils/predictionEngine';
import { evaluateElectrodeDiagnostics } from '../utils/diagnosticsEngine';
import {
  Bot, Send, Sparkles, AlertCircle,
  ChevronDown, ChevronUp, Terminal,
  ShieldCheck, Info, Trash2
} from 'lucide-react';

export default function HylexCopilot({ targetTds = 500, onClose }) {
  const { state } = useHylex();

  // Evaluate current prediction and diagnostics to build the fresh snapshot
  const prediction = useMemo(() => {
    return evaluateTdsPrediction(state.chartHistory || [], targetTds, state.tds);
  }, [state.chartHistory, targetTds, state.tds]);

  const diagnostics = useMemo(() => {
    return evaluateElectrodeDiagnostics(state);
  }, [state]);

  const snapshot = useMemo(() => {
    return buildTelemetrySnapshot(state, prediction, diagnostics);
  }, [state, prediction, diagnostics]);

  // Initial welcome message
  const [messages, setMessages] = useState([
    {
      id: 'welcome-1',
      sender: 'assistant',
      timestamp: Date.now(),
      text: `**Project Hylex Engineering Co-Pilot initialized.**

I continuously monitor real-time telemetry from our 4-tier hybrid desalination tower, evaluate OLS salinity kinetics, track electrode treatment performance against baseline, and explain the autonomous 500 ppm Dubai potable routing gate.

All observations are computed locally from verified sensor readings and clearly disclose uninstrumented hardware boundaries.`,
      tags: ['MEASURED', 'CALCULATED', 'ADVISORY'],
    }
  ]);

  const [inputQuery, setInputQuery] = useState('');
  const [isSnapshotExpanded, setIsSnapshotExpanded] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll chat to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendQuery = (queryText) => {
    const q = (queryText || inputQuery).trim();
    if (!q) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      timestamp: Date.now(),
      text: q,
    };

    // Deterministically answer with telemetry snapshot
    const answerText = answerTelemetryQuery(q, snapshot);

    const assistantMsg = {
      id: `asst-${Date.now() + 1}`,
      sender: 'assistant',
      timestamp: Date.now(),
      text: answerText,
      tags: q.toLowerCase().includes('fouling') || q.toLowerCase().includes('electrode')
        ? ['CALCULATED', 'HYPOTHESIS']
        : ['MEASURED', 'CALCULATED'],
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInputQuery('');
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'assistant',
        timestamp: Date.now(),
        text: `**Chat history cleared.** Ready for new queries against live telemetry.`,
        tags: ['ADVISORY'],
      }
    ]);
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/90 backdrop-blur-md flex flex-col h-full overflow-hidden border-glow-cyan shadow-xl">
      {/* Header */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between flex-shrink-0 bg-slate-950/60">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
            <Bot size={16} />
          </div>
          <div>
            <div className="text-xs font-mono font-bold text-white flex items-center gap-2">
              <span>HYLEX AI CO-PILOT</span>
              <span className="text-[8px] px-1.5 py-0.5 rounded border border-cyan-500/40 bg-cyan-500/10 text-cyan-300 font-mono">
                LOCAL ANALYTIC ENGINE
              </span>
            </div>
            <div className="text-[9px] text-slate-400 font-mono flex items-center gap-2">
              <span>Telemetry-grounded engineering assistant</span>
              {snapshot.isStale && (
                <span className="text-amber-400 font-bold text-[8px] flex items-center gap-0.5">
                  <AlertCircle size={8} /> STALE ({snapshot.freshnessSec}s)
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsSnapshotExpanded(!isSnapshotExpanded)}
            className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-[9px] font-mono text-slate-300 transition-all"
            title="Inspect Telemetry Snapshot"
          >
            <Terminal size={10} className="text-cyan-400" />
            <span>Context</span>
            {isSnapshotExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
          </button>

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

      {/* Collapsible Telemetry Context Inspector */}
      {isSnapshotExpanded && (
        <div className="p-2.5 bg-slate-950 border-b border-slate-800 text-[9.5px] font-mono text-slate-300 space-y-2 flex-shrink-0 max-h-48 overflow-y-auto">
          <div className="flex justify-between items-center text-[8.5px] text-slate-400 border-b border-slate-800/60 pb-1">
            <span className="font-bold text-cyan-300 flex items-center gap-1">
              <Terminal size={10} /> LIVE TELEMETRY SNAPSHOT CONTEXT
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
                  <span className="text-cyan-400 font-bold">HYLEX AI CO-PILOT</span>
                  <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                </>
              )}
            </div>

            {/* Bubble */}
            <div
              className={`max-w-[90%] rounded-xl p-3 text-[11px] leading-relaxed font-mono whitespace-pre-wrap ${
                msg.sender === 'user'
                  ? 'bg-cyan-950/40 border border-cyan-500/40 text-cyan-100 rounded-tr-none'
                  : 'bg-slate-950/70 border border-slate-800 text-slate-200 rounded-tl-none shadow-md'
              }`}
            >
              {/* Markdown-style formatting */}
              {msg.text.split('\n').map((line, idx) => {
                if (line.startsWith('• ')) {
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
              })}

              {/* Badges for evidence categories */}
              {msg.tags && msg.tags.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex flex-wrap gap-1">
                  {msg.tags.map((tag) => (
                    <span
                      key={tag}
                      className={`text-[7.5px] font-mono px-1.5 py-0.5 rounded border uppercase ${
                        tag === 'MEASURED'
                          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                          : tag === 'CALCULATED'
                          ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                          : tag === 'HYPOTHESIS'
                          ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
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
          <span>Suggested Inquiries (One-Click Analysis)</span>
        </div>
        <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
          {SUGGESTED_QUERIES.map((sq, idx) => (
            <button
              key={idx}
              onClick={() => handleSendQuery(sq)}
              className="text-[9px] font-mono px-2 py-1 rounded-md bg-slate-800/70 hover:bg-cyan-950/50 hover:text-cyan-300 hover:border-cyan-500/40 border border-slate-700/60 text-slate-300 transition-all text-left"
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
            placeholder="Ask about TDS kinetics, fouling status, Dubai 500 ppm standard..."
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-3 pr-8 py-2 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/60"
          />
        </div>
        <button
          type="submit"
          disabled={!inputQuery.trim()}
          className="p-2 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          title="Submit Inquiry"
        >
          <Send size={14} />
        </button>
      </form>

      {/* Advisory read-only footer */}
      <div className="px-3 py-1 bg-slate-950 text-[7.5px] font-mono text-slate-500 border-t border-slate-800/80 flex items-center justify-between">
        <span className="flex items-center gap-1">
          <ShieldCheck size={9} className="text-emerald-400" />
          Read-Only Advisory AI: Will not autonomously alter physical actuators
        </span>
        <span className="text-slate-600">Zero Cloud Dependency</span>
      </div>
    </div>
  );
}
