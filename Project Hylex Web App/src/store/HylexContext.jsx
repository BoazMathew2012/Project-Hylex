import { createContext, useContext, useReducer, useEffect, useRef, useCallback } from 'react';
import { INITIAL_STATE, ZERO_TELEMETRY, SIMULATION_TELEMETRY } from './initialState';

const HylexContext = createContext(null);
const HylexDispatch = createContext(null);

function reducer(state, action) {
  switch (action.type) {
    case 'SET_MODE': {
      const mode = action.payload;
      if (mode === 'live') {
        // If ESP32 is not connected, change all values to 0 instead of freezing
        if (state.wsStatus !== 'connected') {
          return {
            ...state,
            mode: 'live',
            ...ZERO_TELEMETRY,
          };
        }
        return { ...state, mode: 'live' };
      } else {
        // Switching back to simulation mode
        // Restore default baseline simulation telemetry if values were at 0
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
      // If the ESP32 is not connected in live mode, change all values to 0
      if (isLive && wsStatus !== 'connected') {
        return {
          ...state,
          wsStatus,
          ...ZERO_TELEMETRY,
        };
      }
      return { ...state, wsStatus, latencyMs: action.latencyMs ?? state.latencyMs };
    }
    case 'SENSOR_UPDATE': {
      const data = action.payload;
      const tds = data.tds ?? state.tds;
      const tempC = data.tempC ?? data.temp ?? state.tempC;
      const isManual = state.controlMode === 'manual';
      const routeClean = tds <= 500;

      // In manual mode, preserve slider positions unless explicitly sent from hardware
      const servo1 = isManual ? (data.servo1 ?? state.servo1) : (data.servo1 ?? (routeClean ? 20 : 55));
      const servo2 = data.servo2 ?? state.servo2;
      const servo3 = isManual ? (data.servo3 ?? state.servo3) : (data.servo3 ?? (routeClean ? 0 : 90));
      const servo4 = isManual ? (data.servo4 ?? state.servo4) : (data.servo4 ?? (routeClean ? 90 : 0));

      const relay1 = data.relay1 !== undefined ? data.relay1 : state.relay1;
      const relay2 = data.relay2 !== undefined ? data.relay2 : state.relay2;
      const relay3 = data.relay3 !== undefined ? data.relay3 : state.relay3;
      const carouselSlot = data.carouselSlot !== undefined ? data.carouselSlot : state.carouselSlot;
      const podSaturation = Array.isArray(data.pods) ? data.pods : state.podSaturation;

      const now = Date.now();
      const newPoint = { t: now, tds, industrial: Math.round(tds * 82.35) };
      const history = [...state.chartHistory, newPoint].slice(-60);
      return {
        ...state,
        tds,
        tempC,
        routeClean: servo3 === 0,
        servo1,
        servo2,
        servo3,
        servo4,
        relay1,
        relay2,
        relay3,
        carouselSlot,
        carouselAngle: carouselSlot * 120,
        podSaturation,
        chartHistory: history,
      };
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
          if (data.tds !== undefined) dispatch({ type: 'SENSOR_UPDATE', payload: data });
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

  const sendWsCommand = useCallback((cmd) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(cmd));
    }
  }, []);

  return (
    <HylexContext.Provider value={{ state, connect, disconnect, sendWsCommand }}>
      <HylexDispatch.Provider value={dispatch}>
        {children}
      </HylexDispatch.Provider>
    </HylexContext.Provider>
  );
}

export const useHylex = () => useContext(HylexContext);
export const useDispatch = () => useContext(HylexDispatch);
