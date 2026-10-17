const endpoint = process.env.COASTLINE_AI_ENDPOINT || 'https://coastline-babylon-beta.vercel.app/api/coastline-ai';
const origin = 'https://molson835-ai.github.io';
const response = await fetch(endpoint, {
  method: 'POST',
  headers: { origin, 'content-type': 'application/json' },
  body: JSON.stringify({ telemetry: { fps: 60, frameMs: 16.6, slowFrames: 0, farViewScale: 1, traffic: 10, npcs: 20, sceneChildren: 1200, mode: 'vehicle', highSpeed: false, notes: 'automated CI smoke test; synthetic data only' } })
});
const data = await response.json();
console.log(JSON.stringify({ status: response.status, modelStatus: data.modelStatus, modelError: data.modelError, model: data.model, automationStatus: data.automation?.status, cors: response.headers.get('access-control-allow-origin') }));
if (!response.ok || data.ok !== true) throw new Error('AI endpoint returned HTTP ' + response.status + ': ' + JSON.stringify(data));
if (response.headers.get('access-control-allow-origin') !== origin) throw new Error('AI endpoint CORS allowlist did not authorize the game origin.');
if (!data.model || typeof data.modelResponse !== 'string' || !data.modelResponse.length) throw new Error('AI Gateway did not return an actual model response; modelStatus=' + data.modelStatus + '; modelError=' + data.modelError + '; automation=' + data.automation?.status);
console.log(JSON.stringify({ ok: true, status: response.status, model: data.model, findingCount: (data.findings || []).length, automationStatus: data.automation?.status, cors: 'passed' }));