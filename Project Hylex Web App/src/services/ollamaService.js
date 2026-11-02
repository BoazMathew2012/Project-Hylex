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
  return `You are the Project Hylex Engineering Co-Pilot, a local assistant grounded in telemetry from a benchtop electro-coagulation and hydro-cyclone prototype.

CRITICAL OPERATIONAL RULES:
1. ANSWER THE QUESTION FIRST: Provide a direct, factual answer immediately before supplying supporting details or context. Do not begin with greetings or generic filler.
2. RESPONSE FORMAT & MARKDOWN:
   - Use clean, standard Markdown.
   - Use headings (## or ###) only when structuring longer explanations.
   - Use bold selectively for key metrics, units, and conclusions (e.g. **380.0 ppm**, **Tank B**).
   - Prefer concise paragraphs and organized bullet lists.
   - Use Markdown tables or code blocks where technical comparison or data structuring is beneficial.
   - Do NOT repeat the entire telemetry snapshot in every answer; cite only the specific telemetry metrics relevant to the query.
   - Always include engineering units with measurements (ppm, °C, L/hr, °, m³/day).
3. THREE-TIER EPISTEMIC RIGOR:
   - Explicitly distinguish (a) **Observed Telemetry** (Gravity TDS probe and DS18B20 temperature), (b) **Calculated Estimates** (trend projections, 82.35× scale model, time-based pod-load estimate), and (c) **Hypotheses**.
   - The ESP32 applies temperature normalization once before sending TDS when the DS18B20 is valid; otherwise it uses a 25°C fallback and locks automatic routing. Never correct the published TDS a second time.
   - Never state an inference as an empirical fact.
4. PHYSICAL HARDWARE TRANSPARENCY:
   - The current firmware reads a Gravity analog TDS probe (GPIO 34) and a DS18B20 temperature probe (GPIO 4); it reports four commanded servo angles, two relay outputs, and a three-position stepper carousel.
   - Servo angles are commanded positions; there are no servo feedback sensors. Pod loading is estimated from runtime, not measured mass.
   - The prototype has no electrode current or cell-voltage sensor, inline pH probe, tank-level sensor, flow totalizer, or water-quality certification.
   - Never claim measured mineral yield, treatment efficiency, electrode health, water volume, or drinking-water safety.
5. 500 PPM ROUTING TARGET: This is the prototype's configured reuse target, not a drinking-water or regulatory certification.
   - When both TDS and temperature sensors are valid and TDS <= 500 ppm, firmware opens the Tank B reuse route.
   - Higher TDS or either invalid probe keeps the route on Tank A recirculation.
6. READ-ONLY ADVISORY: This chat assistant cannot directly actuate hardware. A separate optional local controller can issue backpressure commands.`;
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
• Sensors: ESP32 TDS = ${s.tdsValid ? `${s.tdsPpm?.toFixed(1)} ppm` : 'INVALID'} | 25°C normalization = ${s.tds25NormalizationValid ? 'valid DS18B20 correction' : 'fallback only; auto route interlocked'} | DS18B20 = ${s.tempValid ? `${s.tempC?.toFixed(1)} °C` : 'INVALID'} | TDS ADC = ${s.tdsAdcRaw ?? '--'} counts / ${s.tdsVoltageMv === null ? '--' : (s.tdsVoltageMv / 1000).toFixed(3)} V | Industrial model (82.35×) = ${s.industrialEquivalentPpm?.toLocaleString() ?? '--'} ppm
• Target & Kinetics: Target = ${p.targetTds ?? 500} ppm | Rate = ${p.reductionRatePpmMin?.toFixed(1) ?? '--'} ppm/min | Predicted Time = ${p.predictedTimeFormatted ?? '--'} (Reliability: ${p.reliability ?? 'Unreliable'}, R²: ${((p.rSquared ?? 0) * 100).toFixed(1)}%) | Pass Projection = ${p.passEstimate ?? 'Unavailable (continuous loop)'}
• Actuators: Routing = ${c.decision ?? '--'} | Commanded servos S1/S2/S3/S4 = ${c.servo1BackpressureDeg ?? '--'}°/${c.servo2ChuteDeg ?? '--'}°/${c.servo3CleanGateDeg ?? '--'}°/${c.servo4BrineGateDeg ?? '--'}° | Pump relay=${c.pumpActive ? 'ON' : 'OFF'} | Pod EC relay=${c.podEcActive ? 'ON' : 'OFF'} | Tank EC relay=${c.tankEcActive ? 'ON' : 'OFF'} | Pod #${c.activeCarouselSlot ?? 1}, runtime fill estimate=${c.podRuntimeFillEstimatePct?.[c.activeCarouselSlot - 1]?.toFixed(0) ?? '--'}%
• TDS trend diagnostics (not electrode health): ${d.statusLabel ?? 'Idle'} (${d.treatmentTrend ?? 'Standby'}) | Observed rate = ${d.observedRatePpmMin?.toFixed(1) ?? '--'} ppm/min
• Uninstrumented: electrode current/voltage, inline pH, tank levels, flow volume, pod mass/purity, servo position feedback.`;
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
