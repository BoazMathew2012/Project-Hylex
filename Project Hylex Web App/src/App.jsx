import { HylexProvider } from './store/HylexContext';
import ConnectionBar from './components/ConnectionBar';
import KpiRibbon from './components/KpiRibbon';
import DigitalTwin from './components/DigitalTwin';
import TelemetryChart from './components/TelemetryChart';
import ControlPanel from './components/ControlPanel';

export default function App() {
  return (
    <HylexProvider>
      <div className="flex flex-col h-screen bg-slate-950 overflow-hidden">
        {/* Top connection bar */}
        <ConnectionBar />

        {/* Main content area */}
        <main className="flex-1 flex flex-col gap-2.5 p-2.5 overflow-hidden min-h-0">
          {/* KPI Ribbon */}
          <KpiRibbon />

          {/* 3-column Bento grid — col layout: 4 | 5 | 3 */}
          <div className="flex-1 grid gap-2.5 min-h-0" style={{ gridTemplateColumns: '1fr 1.25fr 0.8fr' }}>
            {/* Left: Digital Twin */}
            <div className="min-h-0 overflow-hidden">
              <DigitalTwin />
            </div>

            {/* Center: Chart */}
            <div className="min-h-0 overflow-hidden">
              <TelemetryChart />
            </div>

            {/* Right: Controls + ROI */}
            <div className="min-h-0 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
              <ControlPanel />
            </div>
          </div>
        </main>
      </div>
    </HylexProvider>
  );
}
