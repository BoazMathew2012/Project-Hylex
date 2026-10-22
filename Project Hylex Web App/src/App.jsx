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
    <div className="flex flex-col h-screen bg-slate-950 overflow-hidden select-none">
      {/* Top Connection & Navigation Bar */}
      <ConnectionBar
        activeView={activeView}
        setActiveView={setActiveView}
        isCopilotOpen={isCopilotOpen}
        setIsCopilotOpen={setIsCopilotOpen}
      />

      {/* Main Workspace Layout */}
      <main className="flex-1 flex flex-col gap-2.5 p-2.5 overflow-hidden min-h-0 relative">
        {/* KPI Ribbon (Universal across views) */}
        <KpiRibbon />

        {/* View 1: Digital Twin & Actuator Hardware Controls */}
        {activeView === 'dashboard' ? (
          <div className="flex-1 grid gap-2.5 min-h-0" style={{ gridTemplateColumns: '1fr 1.25fr 0.8fr' }}>
            {/* Left: 4-Tier Digital Twin Schematic */}
            <div className="min-h-0 overflow-hidden">
              <DigitalTwin />
            </div>

            {/* Center: Realtime Telemetry & Salinity Chart */}
            <div className="min-h-0 overflow-hidden">
              <TelemetryChart />
            </div>

            {/* Right: Actuator Controls & Circular Economy ROI */}
            <div className="min-h-0 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
              <ControlPanel />
            </div>
          </div>
        ) : (
          /* View 2: AI Intelligence Suite (Predictor | Diagnostics | Co-Pilot) */
          <div className="flex-1 grid gap-2.5 min-h-0" style={{ gridTemplateColumns: '1.2fr 0.95fr 1fr' }}>
            {/* Feature 1: Time-to-Target & Pass Predictor */}
            <div className="min-h-0 overflow-hidden">
              <PredictiveAnalytics />
            </div>

            {/* Feature 2: Electrode Health & Fouling Diagnostics */}
            <div className="min-h-0 overflow-hidden">
              <ElectrodeDiagnostics />
            </div>

            {/* Feature 3: Interactive Hylex AI Co-Pilot */}
            <div className="min-h-0 overflow-hidden">
              <HylexCopilot />
            </div>
          </div>
        )}

        {/* Slide-over Co-Pilot Drawer (Accessible when browsing Digital Twin) */}
        {isCopilotOpen && activeView === 'dashboard' && (
          <div className="absolute top-2.5 right-2.5 bottom-2.5 w-[460px] z-40 shadow-2xl animate-in fade-in slide-in-from-right duration-200">
            <HylexCopilot onClose={() => setIsCopilotOpen(false)} />
          </div>
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
