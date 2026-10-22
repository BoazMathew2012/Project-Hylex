import { useHylex } from '../store/HylexContext';

// Servo arc dial
function ServoArc({ cx, cy, r, angle, color, label }) {
  const clampedAngle = Math.max(0, Math.min(180, angle));
  const startRad = -Math.PI / 2;
  const endRad = startRad + (clampedAngle / 180) * Math.PI;
  const x1 = cx + r * Math.cos(startRad);
  const y1 = cy + r * Math.sin(startRad);
  const x2 = cx + r * Math.cos(endRad);
  const y2 = cy + r * Math.sin(endRad);
  const largeArc = clampedAngle > 90 ? 1 : 0;
  const nx = cx + (r - 2) * Math.cos(endRad);
  const ny = cy + (r - 2) * Math.sin(endRad);

  return (
    <g>
      {/* Background track */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e293b" strokeWidth="3" />
      {/* Active arc */}
      {clampedAngle > 0 && (
        <path
          d={`M${x1},${y1} A${r},${r} 0 ${largeArc},1 ${x2},${y2}`}
          fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" opacity="0.9"
        />
      )}
      {/* Needle */}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="2.5" fill={color} />
      {/* Labels */}
      <text x={cx} y={cy + r + 9} textAnchor="middle" fontSize="6.5" fill="#64748b" fontFamily="JetBrains Mono">{label}</text>
      <text x={cx} y={cy + r + 18} textAnchor="middle" fontSize="8" fill={color} fontFamily="JetBrains Mono" fontWeight="700">{angle}°</text>
    </g>
  );
}

// Pod circle with saturation ring
function PodCircle({ cx, cy, r, saturation, slot, currentSlot, label }) {
  const isActive = slot === currentSlot;
  const podColor = saturation > 80 ? '#f87171' : saturation > 50 ? '#fbbf24' : '#34d399';
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference * (1 - saturation / 100);

  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="#0b1324" stroke={isActive ? podColor : '#334155'} strokeWidth={isActive ? 2 : 1} />
      {/* Saturation ring */}
      <circle
        cx={cx} cy={cy} r={r - 3}
        fill="none" stroke={podColor} strokeWidth="3.5"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
        opacity="0.8"
      />
      <text x={cx} y={cy - 3} textAnchor="middle" fontSize="7" fill="#94a3b8" fontFamily="JetBrains Mono" fontWeight="600">{label}</text>
      <text x={cx} y={cy + 8} textAnchor="middle" fontSize="8.5" fill={podColor} fontFamily="JetBrains Mono" fontWeight="700">{saturation.toFixed(0)}%</text>
      {isActive && (
        <circle cx={cx} cy={cy} r={r + 3.5} fill="none" stroke={podColor} strokeWidth="1" opacity="0.4">
          <animate attributeName="r" values={`${r + 2};${r + 7};${r + 2}`} dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.4;0.05;0.4" dur="2s" repeatCount="indefinite" />
        </circle>
      )}
    </g>
  );
}

// Animated fluid flow arrows
function FlowLine({ points, active, color }) {
  if (!active || points.length < 2) return null;
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ');
  return (
    <path d={d} fill="none" stroke={color} strokeWidth="2.5" strokeDasharray="5 4"
      strokeLinecap="round" opacity="0.85">
      <animate attributeName="stroke-dashoffset" from="18" to="0" dur="0.7s" repeatCount="indefinite" />
    </path>
  );
}

export default function DigitalTwin() {
  const { state } = useHylex();
  const { servo1, servo2, servo3, servo4, carouselAngle, podSaturation, carouselSlot, routeClean, relay1, relay2, relay3 } = state;

  const W = 320;
  const H = 600;
  const MX = W / 2; // 160

  // Carousel geometry
  const carCX = MX;
  const carCY = 330;
  const carR  = 44;
  const podR  = 16.5;

  // Pod positions (120° apart)
  const pods = [0, 1, 2].map(i => {
    const angle = ((i * 120 + carouselAngle) - 90) * (Math.PI / 180);
    return {
      cx: carCX + carR * Math.cos(angle),
      cy: carCY + carR * Math.sin(angle),
      saturation: podSaturation[i],
      label: `Pod #${i + 1}`,
      slot: i,
    };
  });

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/80 backdrop-blur-sm p-2.5 flex flex-col border-glow-cyan h-full overflow-hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-1 flex-shrink-0">
        <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono font-bold">4-Tier Digital Twin</span>
        <span className="text-[9px] text-cyan-400 font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30">
          450mm TOWER
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full flex-1" style={{ minHeight: 0 }} preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="cyl-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#0e7490" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#22d3ee" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#0e7490" stopOpacity="0.4" />
          </linearGradient>
          <linearGradient id="tank-a-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#92400e" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#7c2d12" stopOpacity="0.3" />
          </linearGradient>
          <linearGradient id="tank-b-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#065f46" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#064e3b" stopOpacity="0.3" />
          </linearGradient>
          <filter id="glow-c" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* ══════════════════════════════════════════════
            STAGE 2: Membraneless Centrifugal Vortex
        ══════════════════════════════════════════════ */}
        <text x={MX} y="11" textAnchor="middle" fontSize="6.5" fill="#64748b" fontFamily="JetBrains Mono" fontWeight="600">
          STAGE 2: MEMBRANELESS VORTEX (ARCHIMEDEAN HELIX)
        </text>

        {/* 10mm Brass Splitter & Tangential Nozzle Indicators */}
        <rect x="52" y="24" width="16" height="6" rx="2" fill="#ca8a04" stroke="#eab308" strokeWidth="0.8" />
        <rect x="252" y="24" width="16" height="6" rx="2" fill="#ca8a04" stroke="#eab308" strokeWidth="0.8" />
        <text x="60" y="22" textAnchor="middle" fontSize="5" fill="#eab308" fontFamily="JetBrains Mono">90° NOZZLE</text>
        <text x="260" y="22" textAnchor="middle" fontSize="5" fill="#eab308" fontFamily="JetBrains Mono">90° NOZZLE</text>

        {/* 90mm Acrylic Cylinder */}
        <rect x="68" y="16" width="184" height="88" rx="8" fill="url(#cyl-grad)" stroke="#22d3ee" strokeWidth="1.2" opacity="0.85" />
        <text x="76" y="97" fontSize="6" fill="#64748b" fontFamily="JetBrains Mono">⌀90mm Acrylic Cylinder</text>

        {/* Triple-Helix Spiral Ramps */}
        {[0, 1, 2].map(j => (
          <path key={j}
            d={Array.from({ length: 28 }, (_, i) => {
              const t = i / 27;
              const x = 84 + 152 * t;
              const y = 24 + 70 * t + 22 * Math.sin(t * Math.PI * 3.2 + j * 2.09);
              return `${i === 0 ? 'M' : 'L'}${x},${y}`;
            }).join(' ')}
            fill="none"
            stroke={['#22d3ee', '#34d399', '#06b6d4'][j]}
            strokeWidth="1.8" opacity="0.7" strokeLinecap="round"
          />
        ))}

        {/* Animated swirling particles */}
        {[0, 1, 2, 3, 4].map(i => (
          <circle key={i} r="2.8" fill="#22d3ee" opacity="0.85" filter="url(#glow-c)">
            <animateMotion dur={`${1.3 + i * 0.28}s`} begin={`${i * 0.26}s`} repeatCount="indefinite"
              path={Array.from({ length: 20 }, (_, k) => {
                const t = k / 19;
                const x = 84 + 152 * t;
                const y = 24 + 70 * t + 22 * Math.sin(t * Math.PI * 3.2);
                return `${k === 0 ? 'M' : 'L'}${x},${y}`;
              }).join(' ')} />
          </circle>
        ))}

        {/* Concentric Bullseye Splitter Collar */}
        <rect x="120" y="100" width="80" height="8" rx="2" fill="#1e293b" stroke="#334155" strokeWidth="1" />
        <text x={MX} y="106" textAnchor="middle" fontSize="5.5" fill="#38bdf8" fontFamily="JetBrains Mono">BULLSEYE SPLITTER</text>

        {/* Inter-tier connector pipe */}
        <line x1={MX} y1="108" x2={MX} y2="124" stroke="#334155" strokeWidth="7" strokeLinecap="round" />
        <line x1={MX} y1="108" x2={MX} y2="124" stroke="#22d3ee" strokeWidth="1.2" opacity="0.5" />

        {/* ══════════════════════════════════════════════
            STAGE 3: Sensor Chamber & 4x Servos
        ══════════════════════════════════════════════ */}
        <text x={MX} y="121" textAnchor="middle" fontSize="6.5" fill="#64748b" fontFamily="JetBrains Mono" fontWeight="600">
          STAGE 3: SENSOR CHAMBER &amp; 4x MG995 SERVOS
        </text>

        <rect x="52" y="125" width="216" height="106" rx="7" fill="#091322" stroke="#1e293b" strokeWidth="1.2" />

        {/* Gravity TDS sensor readout pill */}
        <rect x="105" y="130" width="110" height="19" rx="4" fill="#0f172a" stroke="#22d3ee" strokeWidth="0.9" />
        <text x={MX} y="143" textAnchor="middle" fontSize="8" fill="#22d3ee" fontFamily="JetBrains Mono" fontWeight="600">
          TDS {state.tds.toFixed(0)} ppm · {state.tempC.toFixed(1)}°C
        </text>

        {/* 4 Servos: Evenly spaced (S1, S2, S3, S4) */}
        <ServoArc cx={78}  cy={176} r={17} angle={servo1} color="#22d3ee" label="S1 BackP" />
        <ServoArc cx={132} cy={176} r={17} angle={servo2} color="#fbbf24" label="S2 Chute" />
        <ServoArc cx={188} cy={176} r={17} angle={servo3} color="#34d399" label="S3 Clean" />
        <ServoArc cx={242} cy={176} r={17} angle={servo4} color="#f87171" label="S4 Brine" />

        {/* Inter-tier connector pipe */}
        <line x1={MX} y1="231" x2={MX} y2="252" stroke="#334155" strokeWidth="7" strokeLinecap="round" />
        <line x1={MX} y1="231" x2={MX} y2="252" stroke="#22d3ee" strokeWidth="1.2" opacity="0.4" />

        {/* ══════════════════════════════════════════════
            STAGE 4: Robotic Turret & Electro-Crystallization
        ══════════════════════════════════════════════ */}
        <text x={MX} y="250" textAnchor="middle" fontSize="6.5" fill="#64748b" fontFamily="JetBrains Mono" fontWeight="600">
          STAGE 4: 3-SLOT TURRET &amp; ELECTRO-CRYSTALLISATION
        </text>

        {/* Stepper motor drive badge */}
        <text x="75" y="262" fontSize="5.5" fill="#a855f7" fontFamily="JetBrains Mono">28BYJ-48 (64:1 GEAR)</text>

        {/* Carousel outer ring + gear teeth */}
        <circle cx={carCX} cy={carCY} r={carR + podR + 5} fill="#070e1a" stroke="#1e293b" strokeWidth="1.2" />
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (i * 30 + carouselAngle * 0.5) * Math.PI / 180;
          const r1 = carR + podR + 4;
          const r2 = carR + podR + 9;
          return (
            <line key={i}
              x1={carCX + r1 * Math.cos(a)} y1={carCY + r1 * Math.sin(a)}
              x2={carCX + r2 * Math.cos(a)} y2={carCY + r2 * Math.sin(a)}
              stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round"
            />
          );
        })}

        {/* Spokes */}
        {[0, 1, 2].map(i => {
          const a = ((i * 120 + carouselAngle) - 90) * Math.PI / 180;
          return (
            <line key={i}
              x1={carCX} y1={carCY}
              x2={carCX + (carR - podR) * Math.cos(a)} y2={carCY + (carR - podR) * Math.sin(a)}
              stroke="#334155" strokeWidth="1.8"
            />
          );
        })}

        {/* Hub */}
        <circle cx={carCX} cy={carCY} r={11} fill="#1e293b" stroke="#334155" strokeWidth="1" />
        <text x={carCX} y={carCY + 4} textAnchor="middle" fontSize="6" fill={relay2 ? '#fbbf24' : '#475569'} fontFamily="JetBrains Mono" fontWeight="bold">12V EC</text>
        {relay2 && (
          <circle cx={carCX} cy={carCY} r={13} fill="none" stroke="#fbbf24" strokeWidth="0.8" opacity="0.6">
            <animate attributeName="opacity" values="0.6;0.1;0.6" dur="0.8s" repeatCount="indefinite" />
          </circle>
        )}

        {/* 3 Pod Circles */}
        {pods.map((pod, i) => (
          <PodCircle key={i} cx={pod.cx} cy={pod.cy} r={podR}
            saturation={pod.saturation} slot={pod.slot}
            currentSlot={carouselSlot} label={pod.label} />
        ))}

        {/* Active Pod status */}
        <text x={carCX} y="405" textAnchor="middle" fontSize="6.5" fill="#94a3b8" fontFamily="JetBrains Mono">
          Active: Pod #{carouselSlot + 1} (Graphite +12V / SS -12V) · Green H₂ Vent
        </text>

        {/* Connector to tanks */}
        <line x1={MX} y1="412" x2={MX} y2="432" stroke="#334155" strokeWidth="6" strokeLinecap="round" />

        {/* ══════════════════════════════════════════════
            STAGE 1 & 3: Dual Tank Base Architecture
        ══════════════════════════════════════════════ */}
        <text x={MX} y="430" textAnchor="middle" fontSize="6.5" fill="#64748b" fontFamily="JetBrains Mono" fontWeight="600">
          STAGE 1 &amp; 3: DUAL TANK BASE RESERVOIR
        </text>

        {/* Fluid routing flow lines */}
        <FlowLine
          points={[[MX, 434], [MX - 18, 444], [85, 450], [85, 465]]}
          active={!routeClean} color="#f87171"
        />
        <FlowLine
          points={[[MX, 434], [MX + 18, 444], [235, 450], [235, 465]]}
          active={routeClean} color="#34d399"
        />

        {/* Tank A (Base Brine Reservoir - Stage 1) */}
        {(() => {
          const ty = 466; const tw = 126; const th = 118; const tx = 18;
          const fillH = th * (routeClean ? 0.35 : 0.65);
          return (
            <g>
              <rect x={tx} y={ty} width={tw} height={th} rx="7"
                fill="url(#tank-a-grad)"
                stroke={!routeClean ? '#f87171' : '#334155'}
                strokeWidth={!routeClean ? 1.8 : 1} />
              
              {/* Dynamic fluid level */}
              <rect x={tx + 2} y={ty + th - fillH} width={tw - 4} height={fillH} rx="5" fill="#f87171" opacity="0.15">
                <animate attributeName="height" values={`${fillH * 0.9};${fillH};${fillH * 0.9}`} dur="6s" repeatCount="indefinite" />
              </rect>

              <text x={tx + tw / 2} y={ty + 16} textAnchor="middle" fontSize="7.5" fill="#f87171" fontFamily="JetBrains Mono" fontWeight="700">
                TANK A (STAGE 1)
              </text>
              <text x={tx + tw / 2} y={ty + 27} textAnchor="middle" fontSize="6.5" fill="#cbd5e1" fontFamily="JetBrains Mono">
                BASE BRINE RESERVOIR
              </text>
              <text x={tx + tw / 2} y={ty + 37} textAnchor="middle" fontSize="5.5" fill="#94a3b8" fontFamily="JetBrains Mono">
                12V Pump · 240–400 L/hr
              </text>

              {/* Submerged Electro-Coagulation Animation */}
              {relay3 && (
                <>
                  {[32, 54, 76, 96].map(ox => (
                    <line key={ox} x1={tx + ox} y1={ty + 50} x2={tx + ox} y2={ty + 95}
                      stroke="#f87171" strokeWidth="1.2" opacity="0.7">
                      <animate attributeName="opacity" values="0.8;0.2;0.8" dur={`${0.4 + ox * 0.005}s`} repeatCount="indefinite" />
                    </line>
                  ))}
                  <text x={tx + tw / 2} y={ty + 106} textAnchor="middle" fontSize="6" fill="#fbbf24" fontFamily="JetBrains Mono" fontWeight="bold">
                    ⚡ EC PRE-TREAT ACTIVE
                  </text>
                </>
              )}
              {!relay3 && (
                <text x={tx + tw / 2} y={ty + 90} textAnchor="middle" fontSize="5.5" fill="#64748b" fontFamily="JetBrains Mono">
                  NaHCO₃ · Mg²⁺/Ca²⁺ Flocs
                </text>
              )}
            </g>
          );
        })()}

        {/* Tank B (Verified Clean Store - Stage 3) */}
        {(() => {
          const ty = 466; const tw = 126; const th = 118; const tx = W - tw - 18;
          const fillH = th * (routeClean ? 0.65 : 0.35);
          return (
            <g>
              <rect x={tx} y={ty} width={tw} height={th} rx="7"
                fill="url(#tank-b-grad)"
                stroke={routeClean ? '#34d399' : '#334155'}
                strokeWidth={routeClean ? 1.8 : 1} />

              {/* Dynamic fluid level */}
              <rect x={tx + 2} y={ty + th - fillH} width={tw - 4} height={fillH} rx="5" fill="#34d399" opacity="0.15">
                <animate attributeName="height" values={`${fillH * 0.9};${fillH};${fillH * 0.9}`} dur="7s" repeatCount="indefinite" />
              </rect>

              <text x={tx + tw / 2} y={ty + 16} textAnchor="middle" fontSize="7.5" fill="#34d399" fontFamily="JetBrains Mono" fontWeight="700">
                TANK B (STAGE 3)
              </text>
              <text x={tx + tw / 2} y={ty + 27} textAnchor="middle" fontSize="6.5" fill="#cbd5e1" fontFamily="JetBrains Mono">
                CLEAN POTABLE STORE
              </text>
              <text x={tx + tw / 2} y={ty + 37} textAnchor="middle" fontSize="5.5" fill="#94a3b8" fontFamily="JetBrains Mono">
                ≤500 ppm Dubai Benchmark
              </text>

              {routeClean && (
                <text x={tx + tw / 2} y={ty + 88} textAnchor="middle" fontSize="7.5" fill="#34d399" fontFamily="JetBrains Mono" fontWeight="bold">
                  ✓ CLEAN FILLING
                  <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite" />
                </text>
              )}
              <text x={tx + tw / 2} y={ty + 106} textAnchor="middle" fontSize="6" fill="#10b981" fontFamily="JetBrains Mono" fontWeight="bold">
                UN SDG 6.3/6.4 VERIFIED
              </text>
            </g>
          );
        })()}
      </svg>
    </div>
  );
}
