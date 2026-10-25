import { createContext, useContext, useReducer, useEffect, useRef, useCallback } from 'react';
import { INITIAL_STATE, ZERO_TELEMETRY, SIMULATION_TELEMETRY } from './initialState';

const HylexContext = createContext(null);
const HylexDispatch = createContext(null);

function reducer(state, action) {
  switch (action.type) {
    case 'SET_MODE': {
      const mode = action.payload;
      if (mode === 'live') {
        if (state.wsStatus !== 'connected') {
          return { ...state, mode: 'live', ...ZERO_TELEMETRY };
        }
        return { ...state, mode: 'live' };
      } else {
        const shouldRestore = state.tds === 0 && state.tempC === 0;
        return {
          ...state,
          mode: 'simulation',
          ...(shouldRestore ? SIMULATION_TELEMETRY : {}),
          chartHistory: shouldRestore ? [] : state.chartHistory,
        };
      }
    }
    case 'SET_WS_URL':
      return { ...state, wsUrl: action.payload };
    case 'SET_WS_STATUS': {
      const wsStatus = action.payload;
      const isLive = state.mode === 'live';
      if (isLive && wsStatus !== 'connected') {
        return { ...state, wsStatus, ...ZERO_TELEMETRY };
      }
      return { ...state, wsStatus, latencyMs: action.latencyMs ?? state.latencyMs };
    }

    // ── ESP32 Telemetry (extended with process state fields) ──
    case 'SENSOR_UPDATE': {
      const data = action.payload;
      const tds = data.tds ?? state.tds;
      const tempC = data.tempC ?? data.temp ?? state.tempC;
      const isManual = state.controlMode === 'manual';
      const routeClean = tds <= 500;

      const servo1 = isManual ? (data.servo1 ?? state.servo1) : (data.servo1 ?? (routeClean ? 20 : 55));
      const servo2 = data.servo2 ?? state.servo2;
      const servo3 = isManual ? (data.servo3 ?? state.servo3) : (data.servo3 ?? (routeClean ? 0 : 90));
      const servo4 = isManual ? (data.servo4 ?? state.servo4) : (data.servo4 ?? (routeClean ? 90 : 0));

      const relay1 = data.relay1 !== undefined ? data.relay1 : state.relay1;
      const relay2 = data.relay2 !== undefined ? data.relay2 : state.relay2;
      const relay3 = data.relay3 !== undefined ? data.relay3 : state.relay3;
      const carouselSlot = data.carouselSlot !== undefined ? data.carouselSlot : (data.pod !== undefined ? data.pod : state.carouselSlot);
      const podSaturation = Array.isArray(data.pods)
        ? data.pods
        : (data.podLoad !== undefined
          ? state.podSaturation.map((v, i) => i === carouselSlot ? data.podLoad : v)
          : state.podSaturation);

      // Process state fields from ESP32 firmware
      const processState = data.state !== undefined ? data.state : state.processState;
      const coagRemaining = data.coagRemaining !== undefined ? data.coagRemaining : state.coagRemaining;
      const podLoad = data.podLoad !== undefined ? data.podLoad : state.podLoad;
      const aiReason = data.aiReason !== undefined ? data.aiReason : state.aiReason;

      const now = Date.now();
      const newPoint = { t: now, tds, industrial: Math.round(tds * 82.35) };
      const history = [...state.chartHistory, newPoint].slice(-60);
      return {
        ...state,
        tds, tempC,
        routeClean: servo3 === 0,
        servo1, servo2, servo3, servo4,
        relay1, relay2, relay3,
        carouselSlot,
        carouselAngle: carouselSlot * 120,
        podSaturation,
        chartHistory: history,
        processState, coagRemaining, podLoad, aiReason,
      };
    }

    // ── Process State Override (for local/simulation control) ──
    case 'SET_PROCESS_STATE':
      return { ...state, processState: action.payload };
    case 'SET_COAG_REMAINING':
      return { ...state, coagRemaining: action.payload };

    // ── Ollama Controller Log ──
    case 'OLLAMA_CONTROLLER_LOG': {
      const log = [...state.ollamaControllerLog, action.payload].slice(-20);
      return { ...state, ollamaControllerLog: log };
    }

    case 'SIM_INJECT_RAW':
      return reducer(state, { type: 'SENSOR_UPDATE', payload: { tds: 780, tempC: state.tempC || 23.4 } });
    case 'SIM_VORTEX_CLEAN':
      return reducer(state, { type: 'SENSOR_UPDATE', payload: { tds: 380, tempC: state.tempC || 23.4 } });
    case 'SIM_TURRET_INDEX': {
      const next = (state.carouselSlot + 1) % 3;
      const psat = [...state.podSaturation];
      psat[next] = 0;
      return {
        ...state,
        carouselSlot: next,
        carouselAngle: state.carouselAngle + 120,
        podSaturation: psat,
        servo2: 90,
      };
    }
    case 'SERVO2_RESET':
      return { ...state, servo2: 0 };
    case 'SET_SERVO1':
      if (state.mode === 'live' && state.wsStatus !== 'connected') return state;
      return { ...state, servo1: action.payload };
    case 'SET_SERVO2':
      if (state.mode === 'live' && state.wsStatus !== 'connected') return state;
      return { ...state, servo2: action.payload };
    case 'SET_SERVO3':
      if (state.mode === 'live' && state.wsStatus !== 'connected') return state;
      return { ...state, servo3: action.payload, routeClean: action.payload < 45 };
    case 'SET_SERVO4':
      if (state.mode === 'live' && state.wsStatus !== 'connected') return state;
      return { ...state, servo4: action.payload };
    case 'TOGGLE_RELAY':
      if (state.mode === 'live' && state.wsStatus !== 'connected') return state;
      return { ...state, [`relay${action.payload}`]: !state[`relay${action.payload}`] };
    case 'SET_CONTROL_MODE':
      return { ...state, controlMode: action.payload };
    case 'SET_PLANT_CAPACITY':
      return { ...state, plantCapacity: action.payload };
    case 'SET_POD_SAT': {
      const psat = [...state.podSaturation];
      psat[action.index] = action.value;
      return { ...state, podSaturation: psat };
    }
    case 'TICK_SIMULATION': {
      if (state.mode !== 'simulation') return state;
      const drift = (Math.random() - 0.5) * 8;
      const newTds = Math.max(50, Math.min(950, (state.tds || 380) + drift));
      const tempDrift = (Math.random() - 0.5) * 0.3;
      const newTemp = Math.max(18, Math.min(35, (state.tempC || 23.4) + tempDrift));
      return reducer(state, { type: 'SENSOR_UPDATE', payload: { tds: Math.round(newTds * 10) / 10, tempC: Math.round(newTemp * 10) / 10 } });
    }
    default:
      return state;
  }
}

export function HylexProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const wsRef = useRef(null);
  const simIntervalRef = useRef(null);

  // Simulation tick
  useEffect(() => {
    if (state.mode === 'simulation') {
      simIntervalRef.current = setInterval(() => {
        dispatch({ type: 'TICK_SIMULATION' });
      }, 1000);
    }
    return () => clearInterval(simIntervalRef.current);
  }, [state.mode]);

  // Pod saturation growth in simulation mode
  useEffect(() => {
    if (state.mode !== 'simulation') return;
    const interval = setInterval(() => {
      dispatch({ type: 'SET_POD_SAT', index: state.carouselSlot, value: Math.min(100, state.podSaturation[state.carouselSlot] + 0.2) });
    }, 2000);
    return () => clearInterval(interval);
  }, [state.mode, state.carouselSlot, state.podSaturation]);

  // WebSocket connection
  const connect = useCallback(() => {
    if (wsRef.current) wsRef.current.close();
    dispatch({ type: 'SET_WS_STATUS', payload: 'connecting' });
    try {
      const ws = new WebSocket(state.wsUrl);
      wsRef.current = ws;
      const pingStart = Date.now();
      ws.onopen = () => {
        dispatch({ type: 'SET_WS_STATUS', payload: 'connected', latencyMs: Date.now() - pingStart });
        ws.send(JSON.stringify({ cmd: 'ping' }));
      };
      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          // Extended telemetry: {state, tds, temp, pod, podLoad, coagRemaining, servo1, aiReason}
          if (data.tds !== undefined || data.state !== undefined) {
            dispatch({ type: 'SENSOR_UPDATE', payload: data });
          }
          if (data.pong) dispatch({ type: 'SET_WS_STATUS', payload: 'connected', latencyMs: Date.now() - pingStart });
        } catch {}
      };
      ws.onclose = () => dispatch({ type: 'SET_WS_STATUS', payload: 'disconnected' });
      ws.onerror = () => dispatch({ type: 'SET_WS_STATUS', payload: 'disconnected' });
    } catch {
      dispatch({ type: 'SET_WS_STATUS', payload: 'disconnected' });
    }
  }, [state.wsUrl]);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    dispatch({ type: 'SET_WS_STATUS', payload: 'disconnected' });
  }, []);

  // Send raw string commands (for OLLAMA_BACKPRESSURE:XX, ROTATE_POD, START_PROCESS, STOP_PROCESS)
  const sendWsRaw = useCallback((rawString) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(rawString);
    }
  }, []);

  // Send JSON commands (existing)
  const sendWsCommand = useCallback((cmd) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(cmd));
    }
  }, []);

  return (
    <HylexContext.Provider value={{ state, connect, disconnect, sendWsCommand, sendWsRaw }}>
      <HylexDispatch.Provider value={dispatch}>
        {children}
      </HylexDispatch.Provider>
    </HylexContext.Provider>
  );
}

export const useHylex = () => useContext(HylexContext);
export const useDispatch = () => useContext(HylexDispatch);
