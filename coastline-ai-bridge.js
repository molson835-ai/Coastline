/* Coastline AI Bridge
 * Browser-side telemetry bridge for the external AI control plane.
 * It never executes model-generated code. Responses are stored as advisory data only.
 */
const DEFAULT_ENDPOINT = '/api/coastline-ai';
const INTERVAL_MS = 12000;
let timer = null;
let inFlight = false;

function collect() {
  const perf = window.__coastlinePerf || {};
  const root = document.documentElement;
  const highSpeed = root.dataset.coastlineHighSpeed === 'active' || perf.highSpeed === true;
  const scene = window.__coastlineScene;
  const traffic = Array.isArray(window.__coastlineTraffic) ? window.__coastlineTraffic.length : Number(perf.traffic) || 0;
  const npcs = Array.isArray(window.__coastlineNPCs) ? window.__coastlineNPCs.length : Number(perf.npcs) || 0;
  return {
    fps: Number(perf.fps) || 0,
    frameMs: Number(perf.frameMs) || 0,
    slowFrames: Number(perf.slowFrames) || 0,
    farViewScale: Number(perf.farViewScale) || 1,
    traffic,
    npcs,
    sceneChildren: Number(scene?.children?.length) || Number(perf.sceneChildren) || 0,
    mode: typeof window.__coastlineMode === 'string' ? window.__coastlineMode : '',
    highSpeed,
    notes: perf.notes || ''
  };
}

async function tick() {
  if (inFlight || document.visibilityState === 'hidden') return;
  inFlight = true;
  try {
    const endpoint = window.__coastlineAIEndpoint || DEFAULT_ENDPOINT;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ telemetry: collect(), source: 'browser-runtime' }),
      keepalive: true
    });
    if (!response.ok) return;
    const result = await response.json();
    window.__coastlineRemoteAdvice = result;
    window.dispatchEvent(new CustomEvent('coastline-ai-advice', { detail: result }));
  } catch (_) {
    // AI connectivity is optional. The local runtime must remain fully functional offline.
  } finally {
    inFlight = false;
  }
}

export function startCoastlineAIBridge() {
  if (timer) return;
  timer = setInterval(tick, INTERVAL_MS);
  setTimeout(tick, 2500);
}

export function stopCoastlineAIBridge() {
  if (timer) clearInterval(timer);
  timer = null;
}

if (typeof window !== 'undefined') {
  window.CoastlineAIBridge = { start: startCoastlineAIBridge, stop: stopCoastlineAIBridge, collect };
}
