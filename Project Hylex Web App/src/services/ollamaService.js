/**
 * ollamaService.js
 * 
 * Production-ready local Ollama LLM service for Project Hylex AI Co-Pilot.
 * Connects to local Ollama instance (http://127.0.0.1:11434 or /ollama proxy),
 * streams genuine model responses, retains conversation history with bounded context,
 * passes live telemetry snapshots, and handles all connection/model states.
 */

export const DEFAULT_OLLAMA_URL = 'http://127.0.0.1:11434';
export const DEFAULT_MODEL = 'qwen3:4b';
export const STORAGE_KEY = 'hylex_ollama_config';

/**
 * Retrieve saved Ollama configuration from localStorage or defaults.
 */
export function getOllamaConfig() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          baseUrl: parsed.baseUrl || DEFAULT_OLLAMA_URL,
          model: parsed.model || DEFAULT_MODEL,
        };
      }
    }
  } catch (err) {
    console.warn('Failed to parse Ollama config from localStorage:', err);
  }
  return {
    baseUrl: DEFAULT_OLLAMA_URL,
    model: DEFAULT_MODEL,
  };
}

/**
 * Save Ollama configuration to localStorage.
 */
export function setOllamaConfig(config) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    }
  } catch (err) {
    console.warn('Failed to save Ollama config to localStorage:', err);
  }
}

/**
 * Check if Ollama is reachable and fetch list of installed models.
 * Tries direct baseUrl first, falls back to /ollama proxy if browser CORS blocks.
 */
export async function checkOllamaHealth(baseUrl = DEFAULT_OLLAMA_URL) {
  const start = performance.now();
  const urlsToTry = [baseUrl];
  if (typeof window !== 'undefined' && !baseUrl.startsWith('/ollama')) {
    urlsToTry.push('/ollama');
  }

  let lastError = null;
  for (const url of urlsToTry) {
    try {
      const cleanBase = url.replace(/\/+$/, '');
      const response = await fetch(`${cleanBase}/api/tags`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const latencyMs = Math.round(performance.now() - start);
      const models = (data.models || []).map((m) => m.name || m.model);

      return {
        online: true,
        endpointUsed: cleanBase,
        latencyMs,
        models,
      };
    } catch (err) {
      lastError = err;
    }
  }

  return {
    online: false,
    error: lastError?.message || 'Failed to connect to Ollama',
    models: [],
  };
}

/**
 * Engineering system prompt defining the Hylex Co-Pilot persona and rules.
 */
export function buildSystemPrompt() {
  return `You are the Project Hylex Engineering Co-Pilot, an intelligent, authoritative AI assistant monitoring a physical 4-tier hybrid electro-coagulation and biomimetic hydro-cyclone desalination brine valorization system (UN SDG 6).

You analyze live telemetry, explain OLS salinity kinetics and time-to-target countdowns, evaluate electrode health indicators, and discuss the autonomous 500 ppm Dubai potable water routing gate.

CRITICAL OPERATIONAL RULES:
1. READ-ONLY ADVISORY: You are strictly an analytical and advisory engine. You have NO permission or capability to autonomously trigger physical relays, servos, pumps, or motors.
2. GROUNDED IN TELEMETRY: Base all numerical claims strictly on the verified live telemetry snapshot provided. Do not hallucinate or guess sensor readings.
3. PHYSICAL HARDWARE TRANSPARENCY:
   - The hardware HAS: Gravity Analog TDS probe (GPIO 34), DS18B20 Stainless Thermal probe (GPIO 4), 4x MG995 Cam-Pinch Servos, 4-Channel 5V Optocoupler Relays, and 3-Slot Stepper Carousel.
   - The hardware DOES NOT HAVE: Shunt current ammeters (INA219/ACS712), direct cell voltage probes, or batch volume flow totalizers.
   - Therefore: Never claim a measured electrode efficiency percentage. Never present cathode scaling as a proven fact (it is a hypothesis requiring physical inspection of Pod graphite anodes / 304 SS mesh). Pass counts are "Unavailable" because Hylex operates as a continuous loop.
4. DUBAI 500 PPM BENCHMARK: Dubai DEWA and WHO potable tap water standards specify TDS <= 500 ppm.
   - If EC25 <= 500 ppm: Fluid routes to Tank B (Clean Store).
   - If EC25 > 500 ppm: Fluid recirculates to Tank A (Base Reservoir for electro-coagulation).
5. TONE & STYLE: Direct, concise, technical, professional, and clear. Use bullet points where appropriate. Answer arbitrary operator questions about chemistry, hardware, mechanics, or economics intelligently.`;
}

/**
 * Formats a compact, structured telemetry snapshot to ground the model.
 */
export function formatTelemetryContext(snapshot) {
  if (!snapshot) return 'No live telemetry available.';

  const s = snapshot.sensors || {};
  const c = snapshot.controls || {};
  const p = snapshot.prediction || {};
  const d = snapshot.diagnostics || {};

  return `[LIVE TELEMETRY SNAPSHOT - ${new Date(snapshot.timestamp || Date.now()).toLocaleTimeString()} - Freshness: ${snapshot.freshnessSec !== null ? `${snapshot.freshnessSec}s ago` : 'N/A'}${snapshot.isStale ? ' (STALE)' : ''}]
• Salinity: Measured TDS = ${s.tdsPpm?.toFixed(1) ?? '--'} ppm | EC25 Compensated = ${s.ec25CompensatedPpm ?? '--'} ppm | Temp = ${s.tempC?.toFixed(1) ?? '--'} °C | Industrial Equiv (82.35x) = ${s.industrialEquivalentPpm?.toLocaleString() ?? '--'} ppm
• Target & Kinetics: Target = ${p.targetTds ?? 500} ppm | Rate = ${p.reductionRatePpmMin?.toFixed(1) ?? '--'} ppm/min | Predicted Time = ${p.predictedTimeFormatted ?? '--'} (Reliability: ${p.reliability ?? 'Unreliable'}, R²: ${((p.rSquared ?? 0) * 100).toFixed(1)}%) | Pass Projection = ${p.passEstimate ?? 'Unavailable (continuous loop)'}
• Actuators: Routing Decision = ${c.decision ?? '--'} | Servos: #1 Backpressure=${c.servo1BackpressureDeg ?? '--'}°, #2 Cutoff=${c.servo2ChuteDeg ?? '--'}°, #3 Clean=${c.servo3CleanGateDeg ?? '--'}°, #4 Brine=${c.servo4BrineGateDeg ?? '--'}° | 12V Pump=${c.pumpActive ? 'ON' : 'OFF'}, Pod EC=${c.podEcActive ? 'ON' : 'OFF'}, Tank EC=${c.tankEcActive ? 'ON' : 'OFF'} | Active Carousel Pod #${c.activeCarouselSlot ?? 1}
• Diagnostics: Electrode Status = ${d.statusLabel ?? 'Idle'} (${d.treatmentTrend ?? 'Standby'}) | Observed Rate = ${d.observedRatePpmMin?.toFixed(1) ?? 0} ppm/min (Nominal Baseline = ${d.baselineRatePpmMin ?? 18} ppm/min) | Diagnostic Confidence = ${d.confidence ?? 'Low'}
• Uninstrumented Hardware Boundaries: Shunt ammeter, cell voltage probe, flow totalizer are absent.`;
}

/**
 * Streams chat completion from Ollama /api/chat.
 * 
 * @param {Object} params
 * @param {Array} params.messages - Array of { role: 'user' | 'assistant', content: string }
 * @param {Object} params.telemetrySnapshot - Compact telemetry object from buildTelemetrySnapshot()
 * @param {Function} params.onChunk - Callback receiving accumulated text ({ content, thinking, fullContent })
 * @param {Function} params.onDone - Callback called on stream completion
 * @param {Function} params.onError - Callback called on error
 * @param {AbortSignal} params.signal - AbortController signal
 * @param {Object} params.config - { baseUrl, model }
 */
export async function streamOllamaChat({
  messages,
  telemetrySnapshot,
  onChunk = () => {},
  onDone = () => {},
  onError = () => {},
  signal,
  config = getOllamaConfig(),
}) {
  const { baseUrl, model } = config;
  const cleanBase = (baseUrl || DEFAULT_OLLAMA_URL).replace(/\/+$/, '');

  // 1. Prepare messages with bounded history (last 8 messages) to fit 8GB Mac RAM
  const systemPrompt = buildSystemPrompt();
  const contextSnippet = formatTelemetryContext(telemetrySnapshot);

  // Take recent messages
  const recentHistory = messages.slice(-8);

  // Inject fresh telemetry context into the system or latest user turn
  const formattedMessages = [
    { role: 'system', content: `${systemPrompt}\n\nCURRENT SYSTEM TELEMETRY STATE:\n${contextSnippet}` },
    ...recentHistory.map((m) => ({
      role: m.role || (m.sender === 'user' ? 'user' : 'assistant'),
      content: m.content || m.text || '',
    })),
  ];

  try {
    const urlsToTry = [cleanBase];
    if (typeof window !== 'undefined' && !cleanBase.startsWith('/ollama')) {
      urlsToTry.push('/ollama');
    }

    let response = null;

    for (const url of urlsToTry) {
      try {
        response = await fetch(`${url}/api/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/x-ndjson, application/json',
          },
          body: JSON.stringify({
            model: model || DEFAULT_MODEL,
            messages: formattedMessages,
            stream: true,
            options: {
              temperature: 0.3, // Consistent engineering precision
            },
          }),
          signal,
        });

        if (response.ok) {
          break;
        } else if (response.status === 404) {
          // Model not found error
          const errData = await response.json().catch(() => ({}));
          throw new Error(`MODEL_NOT_FOUND:${errData.error || `Model '${model}' not found in Ollama.`}`);
        }
      } catch (fetchErr) {
        if (fetchErr.name === 'AbortError') throw fetchErr;
        if (url === urlsToTry[urlsToTry.length - 1]) {
          throw fetchErr;
        }
      }
    }

    if (!response || !response.ok) {
      throw new Error(`HTTP ${response?.status || 'Unknown'}: Failed to connect to Ollama endpoint`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let accumulatedContent = '';
    let accumulatedThinking = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep unfinished line in buffer

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        try {
          const parsed = JSON.parse(trimmed);

          if (parsed.message) {
            if (parsed.message.thinking) {
              accumulatedThinking += parsed.message.thinking;
            }
            if (parsed.message.content) {
              accumulatedContent += parsed.message.content;
            }

            onChunk({
              content: parsed.message.content || '',
              thinking: parsed.message.thinking || '',
              fullContent: accumulatedContent,
              fullThinking: accumulatedThinking,
            });
          }

          if (parsed.done) {
            onDone({
              content: accumulatedContent,
              thinking: accumulatedThinking,
              model: parsed.model || model,
              totalDurationMs: parsed.total_duration ? Math.round(parsed.total_duration / 1e6) : null,
              promptEvalCount: parsed.prompt_eval_count,
              evalCount: parsed.eval_count,
            });
            return;
          }
        } catch (jsonErr) {
          console.warn('Failed to parse streaming JSON chunk:', trimmed, jsonErr);
        }
      }
    }

    // Finished stream
    onDone({
      content: accumulatedContent,
      thinking: accumulatedThinking,
      model,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      console.log('Ollama stream aborted by operator.');
      return;
    }

    let userFriendlyError = err.message || 'Unknown Ollama error occurred.';

    if (err.message?.includes('MODEL_NOT_FOUND') || err.message?.includes('not found')) {
      userFriendlyError = `Model '${model}' is not installed in your local Ollama library.\n\nTo install it, open Terminal and run:\n\`\`\`bash\nollama pull ${model}\n\`\`\``;
    } else if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
      userFriendlyError = `Cannot connect to Ollama at ${cleanBase}.\n\nEnsure Ollama is running on your Mac:\n1. Open Terminal and run: \`ollama serve\`\n2. Or start the Ollama desktop application.\n3. Model required: \`ollama run ${model}\``;
    }

    onError(userFriendlyError);
  }
}
