import { useState } from 'react';
import { HylexProvider } from './store/HylexContext';
import ConnectionBar from './components/ConnectionBar';
import KpiRibbon from './components/KpiRibbon';
import DigitalTwin from './components/DigitalTwin';
import TelemetryChart from './components/TelemetryChart';
import ControlPanel from './components/ControlPanel';
import PredictiveAnalytics from './components/PredictiveAnalytics';
import ElectrodeDiagnostics from './components/ElectrodeDiagnostics';
import HylexCopilot from './components/HylexCopilot';

function MainApp() {
  const [activeView, setActiveView] = useState('dashboard'); // 'dashboard' | 'ai'
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 overflow-hidden select-none">
      {/* Top Connection & Navigation Bar */}
      <ConnectionBar
        activeView={activeView}
        setActiveView={setActiveView}
        isCopilotOpen={isCopilotOpen}
        setIsCopilotOpen={setIsCopilotOpen}
      />

      {/* Main Workspace Layout */}
      <main className="flex-1 flex flex-col gap-3 p-3.5 overflow-hidden min-h-0 relative">
        {/* Universal Top KPI Ribbon */}
        <KpiRibbon />

        {/* View 1: Digital Twin & Actuator Hardware Controls */}
        {activeView === 'dashboard' ? (
          <div
            className="flex-1 grid gap-3 min-h-0"
            style={{ gridTemplateColumns: '1.05fr 1.35fr 0.95fr' }}
          >
            {/* Left Column: 4-Tier Digital Twin Tower Schematic */}
            <div className="min-h-0 overflow-hidden">
              <DigitalTwin />
            </div>

            {/* Center Column: Salinity Telemetry & Thermal Kinetics Chart */}
            <div className="min-h-0 overflow-hidden">
              <TelemetryChart />
            </div>

            {/* Right Column: Actuator Controls & B2B Circular Economy ROI */}
            <div className="min-h-0 overflow-y-auto pr-0.5" style={{ scrollbarWidth: 'thin' }}>
              <ControlPanel />
            </div>
          </div>
        ) : (
          /* View 2: AI Intelligence Suite (Predictor | Diagnostics | Co-Pilot) */
          <div
            className="flex-1 grid gap-3 min-h-0"
            style={{ gridTemplateColumns: '1.1fr 1fr 1.15fr' }}
          >
            {/* Feature 1: Time-to-Target & Pass Predictor (OLS Kinetics) */}
            <div className="min-h-0 overflow-hidden">
              <PredictiveAnalytics />
            </div>

            {/* Feature 2: Electrode Health & Fouling Diagnostics */}
            <div className="min-h-0 overflow-hidden">
              <ElectrodeDiagnostics />
            </div>

            {/* Feature 3: Interactive Hylex AI Co-Pilot with Local Ollama */}
            <div className="min-h-0 overflow-hidden">
              <HylexCopilot />
            </div>
          </div>
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
