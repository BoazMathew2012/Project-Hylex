import { useReducer, useEffect, useRef, useCallback } from 'react';
import { INITIAL_STATE, ZERO_TELEMETRY } from './initialState';
import { HylexContext, HylexDispatch } from './context';

function reducer(state, action) {
  switch (action.type) {
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
      const tdsAdcRaw = data.tdsAdc ?? state.tdsAdcRaw;
      const tdsVoltageMv = data.tdsMv ?? state.tdsVoltageMv;
      const tdsValid = data.tdsValid ?? state.tdsValid;
      const tempValid = data.tempValid ?? state.tempValid;
      const isManual = state.controlMode === 'manual';
      const routeClean = tdsValid && tempValid && tds <= 500;

      const servo1 = isManual ? (data.servo1 ?? state.servo1) : (data.servo1 ?? (routeClean ? 20 : 55));
      const servo2 = data.servo2 ?? state.servo2;
      const servo3 = isManual ? (data.servo3 ?? state.servo3) : (data.servo3 ?? (routeClean ? 15 : 85));
      const servo4 = isManual ? (data.servo4 ?? state.servo4) : (data.servo4 ?? (routeClean ? 85 : 15));

      const relay1 = data.relay1 !== undefined ? data.relay1 : state.relay1;
      const relay2 = data.relay2 !== undefined ? data.relay2 : state.relay2;
      const relay3 = data.relay3 !== undefined ? data.relay3 : state.relay3;
      const controlMode = data.controlMode === 'manual' ? 'manual' : data.controlMode === 'auto' ? 'auto' : state.controlMode;
      // Firmware reports pod numbers as 1..3; the dashboard stores slots as 0..2.
      const carouselSlot = data.carouselSlot !== undefined
        ? data.carouselSlot
        : (data.pod !== undefined ? Math.max(0, Math.min(2, data.pod - 1)) : state.carouselSlot);
      const podSaturation = Array.isArray(data.pods)
        ? data.pods
        : (data.podLoad !== undefined && data.state !== 4
          ? state.podSaturation.map((v, i) => i === carouselSlot ? data.podLoad : v)
          : state.podSaturation);

      // Process state fields from ESP32 firmware
      const processState = data.state !== undefined ? data.state : state.processState;
      const coagRemaining = data.coagRemaining !== undefined ? data.coagRemaining : state.coagRemaining;
      const podLoad = data.podLoad !== undefined ? data.podLoad : state.podLoad;
      const tdsTrendPpmMin = data.tdsTrendPpmMin !== undefined ? data.tdsTrendPpmMin : state.tdsTrendPpmMin;
      const aiReason = data.aiReason !== undefined ? data.aiReason : state.aiReason;

      const now = Date.now();
      const processStateChangedAt = processState !== state.processState ? now : state.processStateChangedAt;
      const newPoint = { t: now, tds, industrial: Math.round(tds * 82.35) };
      const history = tdsValid && tempValid
        ? [...state.chartHistory, newPoint].slice(-60)
        : [];
      return {
        ...state,
        tds, tempC, tdsAdcRaw, tdsVoltageMv, tdsValid, tempValid,
        routeClean: servo3 <= 45,
        servo1, servo2, servo3, servo4,
        relay1, relay2, relay3,
        carouselSlot,
        carouselAngle: carouselSlot * 120,
        podSaturation,
        chartHistory: history,
        processState, processStateChangedAt, telemetryAt: now, controlMode,
        coagRemaining, podLoad, tdsTrendPpmMin, aiReason,
      };
    }

    // ── Ollama Controller Log ──
    case 'OLLAMA_CONTROLLER_LOG': {
      const log = [...state.ollamaControllerLog, action.payload].slice(-20);
      return { ...state, ollamaControllerLog: log };
    }

    case 'SET_SERVO1':
      if (state.mode === 'live' && state.wsStatus !== 'connected') return state;
      return { ...state, servo1: action.payload };
    case 'SET_SERVO2':
      if (state.mode === 'live' && state.wsStatus !== 'connected') return state;
      return { ...state, servo2: action.payload };
    case 'SET_SERVO3':
      if (state.mode === 'live' && state.wsStatus !== 'connected') return state;
      return { ...state, servo3: action.payload, routeClean: action.payload <= 45 };
    case 'SET_SERVO4':
      if (state.mode === 'live' && state.wsStatus !== 'connected') return state;
      return { ...state, servo4: action.payload };
    case 'SET_CONTROL_MODE':
      return { ...state, controlMode: action.payload };
    case 'SET_PLANT_CAPACITY':
      return { ...state, plantCapacity: action.payload };
    default:
      return state;
  }
}
export function HylexProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const watchdogRef = useRef(null);
  const intentionalCloseRef = useRef(false);
  const latestConnectRef = useRef(null);

  // One initial connection attempt, then retry every two minutes while offline.
  const connect = useCallback(() => {
    intentionalCloseRef.current = false;
    clearTimeout(reconnectTimerRef.current);
    clearInterval(watchdogRef.current);
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }
    dispatch({ type: 'SET_WS_STATUS', payload: 'connecting' });
    try {
      const connectStart = Date.now();
      const ws = new WebSocket(state.wsUrl);
      wsRef.current = ws;
      let lastPacketAt = Date.now();
      ws.onopen = () => {
        if (wsRef.current !== ws) return;
        clearTimeout(reconnectTimerRef.current);
        dispatch({ type: 'SET_WS_STATUS', payload: 'connected', latencyMs: Date.now() - connectStart });
        lastPacketAt = Date.now();
        watchdogRef.current = setInterval(() => {
          if (wsRef.current === ws && Date.now() - lastPacketAt > 5000) {
            dispatch({ type: 'SET_WS_STATUS', payload: 'reconnecting' });
            ws.close();
          }
        }, 1000);
      };
      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          lastPacketAt = Date.now();
          // Extended telemetry: {state, tds, temp, pod, podLoad, coagRemaining, servo1, aiReason}
          if (data.tds !== undefined || data.state !== undefined) {
            dispatch({ type: 'SENSOR_UPDATE', payload: data });
          }
        } catch {}
      };
      ws.onclose = () => {
        if (wsRef.current !== ws) return;
        wsRef.current = null;
        clearInterval(watchdogRef.current);
        if (intentionalCloseRef.current) {
          dispatch({ type: 'SET_WS_STATUS', payload: 'disconnected' });
          return;
        }
        dispatch({ type: 'SET_WS_STATUS', payload: 'reconnecting' });
        reconnectTimerRef.current = setTimeout(() => latestConnectRef.current?.(), 120000);
      };
      ws.onerror = () => ws.close();
    } catch {
      dispatch({ type: 'SET_WS_STATUS', payload: 'reconnecting' });
      reconnectTimerRef.current = setTimeout(() => latestConnectRef.current?.(), 120000);
    }
  }, [state.wsUrl]);
  useEffect(() => {
    latestConnectRef.current = connect;
    connect();
    return () => {
      intentionalCloseRef.current = true;
      clearTimeout(reconnectTimerRef.current);
      clearInterval(watchdogRef.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connect]);

  const disconnect = useCallback(() => {
    intentionalCloseRef.current = true;
    clearTimeout(reconnectTimerRef.current);
    clearInterval(watchdogRef.current);
    wsRef.current?.close();
    wsRef.current = null;
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
