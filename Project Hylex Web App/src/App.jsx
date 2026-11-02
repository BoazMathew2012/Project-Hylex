import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { HylexProvider } from './store/HylexContext';
import ConnectionBar from './components/ConnectionBar';
import KpiRibbon from './components/KpiRibbon';
import DigitalTwin from './components/DigitalTwin';
import TelemetryChart from './components/TelemetryChart';
import ControlPanel from './components/ControlPanel';
import PredictiveAnalytics from './components/PredictiveAnalytics';
import ElectrodeDiagnostics from './components/ElectrodeDiagnostics';
import HylexCopilot from './components/HylexCopilot';
import ProcessBanner from './components/ProcessBanner';
import OllamaController from './components/OllamaController';
const HylexModelViewer = lazy(() => import('./components/HylexModelViewer'));

function MainApp() {
  const [activeView, setActiveView] = useState('dashboard'); // 'dashboard' | 'ai' | 'model'
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const mainRef = useRef(null);

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeView]);

  return (
    <div className="hylex-app flex flex-col h-screen text-slate-100 overflow-hidden select-none">
      {/* Top Connection & Navigation Bar */}
      <ConnectionBar
        activeView={activeView}
        setActiveView={setActiveView}
        isCopilotOpen={isCopilotOpen}
        setIsCopilotOpen={setIsCopilotOpen}
      />

      {/* Main Workspace Layout */}
      <main ref={mainRef} className="hylex-main flex-1 min-h-0 overflow-y-auto relative">
        <div className="hylex-content mx-auto flex flex-col gap-5 px-3 py-5 sm:px-5 sm:py-6 xl:px-8 xl:py-7">
        <div className="flex items-end justify-between gap-4 animate-rise-in">
          <div>
            <div className="hylex-eyebrow flex items-center gap-2"><span className="hylex-eyebrow-dot" /> PROJECT HYLEX <span className="text-slate-700">/</span> {activeView === 'dashboard' ? 'LIVE OPERATIONS' : activeView === 'ai' ? 'INTELLIGENCE' : 'JUDGE PRESENTATION'}</div>
            <h1 className="mt-2 text-2xl sm:text-[30px] font-semibold tracking-[-0.04em] text-white">{activeView === 'dashboard' ? 'System overview' : activeView === 'ai' ? 'Insights & diagnostics' : 'Project model'}</h1>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 pb-1">
            <span className="hylex-live-mark" />
            Edge controller
          </div>
        </div>
        {activeView !== 'model' && <>
          {/* Universal Top KPI Ribbon */}
          <KpiRibbon />

          {/* 2-Stage Process Launcher Banner */}
          <ProcessBanner />
        </>}

        {/* View 1: Digital Twin & Actuator Hardware Controls */}
        {activeView === 'dashboard' ? (
          <div className="hylex-dashboard-grid grid grid-cols-1 md:grid-cols-[minmax(280px,.88fr)_minmax(340px,1.12fr)] 2xl:grid-cols-[minmax(310px,.92fr)_minmax(470px,1.28fr)_minmax(330px,.9fr)] gap-4 min-h-0">
            {/* Left Column: 4-Tier Digital Twin Tower Schematic */}
            <div className="hylex-twin-slot min-h-0 animate-rise-in" style={{ '--stagger': '80ms' }}>
              <DigitalTwin />
            </div>

            {/* Center Column: Salinity Telemetry & Thermal Kinetics Chart */}
            <div className="hylex-chart-slot min-h-0 animate-rise-in" style={{ '--stagger': '140ms' }}>
              <TelemetryChart />
            </div>

            {/* Right Column: Actuator Controls & B2B Circular Economy ROI */}
            <div className="hylex-controls-slot min-h-0 md:col-span-2 2xl:col-span-1 animate-rise-in" style={{ '--stagger': '200ms' }}>
              <ControlPanel />
              <OllamaController />
            </div>
          </div>
        ) : activeView === 'ai' ? (
          /* View 2: AI Intelligence Suite (Predictor | Diagnostics | Co-Pilot) */
          <div className="hylex-ai-grid grid grid-cols-1 xl:grid-cols-3 gap-4 min-h-0">
            {/* Feature 1: Time-to-Target & Pass Predictor (OLS Kinetics) */}
            <div className="min-h-0 overflow-hidden">
              <PredictiveAnalytics />
            </div>

            {/* Feature 2: Live TDS Trend Diagnostics */}
            <div className="min-h-0 overflow-hidden">
              <ElectrodeDiagnostics />
            </div>

            {/* Feature 3: Interactive Hylex AI Co-Pilot with Local Ollama */}
            <div className="min-h-0 overflow-hidden">
              <HylexCopilot />
            </div>
          </div>
        ) : (
          <Suspense fallback={<div className="hylex-model-loading-panel">Loading the interactive model…</div>}>
            <HylexModelViewer />
          </Suspense>
        )}

        {/* Slide-over Co-Pilot Drawer (Accessible when exploring Digital Twin) */}
        {isCopilotOpen && activeView === 'dashboard' && (
          <>
            {/* Subtle backdrop overlay */}
            <div
              className="absolute inset-0 z-40 bg-slate-950/40 backdrop-blur-[2px] transition-opacity animate-in fade-in duration-200"
              onClick={() => setIsCopilotOpen(false)}
            />
            {/* Slide-over drawer */}
            <aside className="absolute top-3 right-3 bottom-3 w-[470px] max-w-[calc(100vw-28px)] z-50 shadow-2xl animate-in fade-in slide-in-from-right duration-250 flex flex-col">
              <HylexCopilot onClose={() => setIsCopilotOpen(false)} />
            </aside>
          </>
        )}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <HylexProvider>
      <MainApp />
    </HylexProvider>
  );
}
