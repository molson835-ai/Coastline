export const config = { runtime: 'nodejs' };

const MODEL = process.env.COASTLINE_AI_MODEL || 'reflection/beam-free';
const MAX_BODY = 64 * 1024;
const CONTROL_TOKEN = process.env.COASTLINE_AI_CONTROL_TOKEN || '';

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 12;
const rateBuckets = new Map();

function checkRateLimit(req) {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : '') || req.headers['x-real-ip'] || 'unknown';
  const now = Date.now();
  let bucket = rateBuckets.get(ip);
  if (!bucket || now - bucket.start >= RATE_LIMIT_WINDOW_MS) {
    bucket = { start: now, count: 0 };
    rateBuckets.set(ip, bucket);
  }
  bucket.count += 1;
  if (rateBuckets.size > 2000) {
    for (const [key, value] of rateBuckets) if (now - value.start >= RATE_LIMIT_WINDOW_MS) rateBuckets.delete(key);
  }
  return { ok: bucket.count <= RATE_LIMIT_MAX, retryAfter: Math.max(1, Math.ceil((bucket.start + RATE_LIMIT_WINDOW_MS - now) / 1000)) };
}

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(body));
}

function safeText(value, max = 6000) {
  return typeof value === 'string' ? value.slice(0, max) : '';
}

function summarizeTelemetry(t = {}) {
  return {
    fps: Number(t.fps) || 0,
    frameMs: Number(t.frameMs) || 0,
    slowFrames: Number(t.slowFrames) || 0,
    farViewScale: Number(t.farViewScale) || 1,
    traffic: Number(t.traffic) || 0,
    npcs: Number(t.npcs) || 0,
    sceneChildren: Number(t.sceneChildren) || 0,
    mode: safeText(t.mode, 80),
    highSpeed: !!t.highSpeed,
    notes: safeText(t.notes, 1200)
  };
}

function deterministicDiagnosis(t) {
  const findings = [];
  if (t.frameMs >= 28 || (t.fps > 0 && t.fps < 36)) findings.push({ area: 'performance', severity: 'high', finding: 'Frame budget is above the 60 FPS target; prioritize CPU/GPU work before adding visual density.' });
  if (t.highSpeed && (t.frameMs >= 24 || (t.fps > 0 && t.fps < 42))) findings.push({ area: 'high-speed', severity: 'high', finding: 'High-speed frame pacing remains constrained; inspect collision, traffic/NPC simulation, and distant rendering workload.' });
  if (t.traffic > 40) findings.push({ area: 'traffic', severity: 'medium', finding: 'Traffic population is large enough to justify distance-based simulation throttling.' });
  if (t.npcs > 60) findings.push({ area: 'npc', severity: 'medium', finding: 'NPC population is large enough to justify near/mid/far simulation tiers.' });
  if (t.sceneChildren > 2500) findings.push({ area: 'rendering', severity: 'medium', finding: 'Scene graph is large; investigate visibility, instancing, batching, and LOD before increasing geometry.' });
  if (!findings.length) findings.push({ area: 'health', severity: 'low', finding: 'No immediate threshold violation; continue collecting telemetry before changing the visual budget.' });
  return findings;
}

async function askModel(t, context = '') {
  const credentials = [process.env.AI_GATEWAY_API_KEY, process.env.VERCEL_OIDC_TOKEN].filter(Boolean);
  if (!credentials.length) return null;
  const prompt = `You are the Coastline Development Director. You improve an original family-friendly open-world driving game.\n\nRules: never suggest copying proprietary game code; prefer architecture patterns and original implementations. Protect the stable beta. Prioritize frame time, regression safety, and small reversible changes. Do not claim a fix is validated unless a build/test/benchmark actually ran.\n\nTelemetry:\n${JSON.stringify(t)}\n\nRepository context:\n${safeText(context, 5000)}\n\nReturn concise JSON with keys: priority, diagnosis, actions, validation. actions must be an array of 1-4 concrete engineering actions. validation must be an array of tests/benchmarks required before promotion.`;
  for (let index = 0; index < credentials.length; index += 1) {
    const response = await fetch('https://ai-gateway.vercel.sh/v1/chat/completions', {
      method: 'POST',
      headers: { authorization: 'Bearer ' + credentials[index], 'content-type': 'application/json' },
      body: JSON.stringify({ model: MODEL, messages: [{ role: 'user', content: prompt }], temperature: 0.1, max_tokens: 900 })
    });
    if (!response.ok) {
      if ((response.status === 401 || response.status === 403) && index < credentials.length - 1) continue;
      throw new Error('AI Gateway ' + response.status);
    }
    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content === 'string' && content.trim()) return content.trim();
    throw new Error('AI Gateway returned no chat completion content');
  }
  throw new Error('AI Gateway authentication failed');
}

const ALLOWED_ORIGINS = new Set([
  'https://molson835-ai.github.io',
  'https://coastlinecreator.itch.io',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
]);
async function dispatchCorrection({ telemetry, findings, modelResponse }) {
  const token = process.env.COASTLINE_GITHUB_TOKEN;
  if (!token) return { status: 'not-configured', detail: 'COASTLINE_GITHUB_TOKEN is not set' };
  if (!findings.some((finding) => finding.severity === 'high')) {
    return { status: 'not-needed', detail: 'No high-severity finding triggered the correction workflow' };
  }
  try {
    const response = await fetch('https://api.github.com/repos/molson835-ai/Coastline/dispatches', {
      method: 'POST',
      headers: {
        authorization: 'Bearer ' + token,
        accept: 'application/vnd.github+json',
        'content-type': 'application/json',
        'x-github-api-version': '2022-11-28'
      },
      body: JSON.stringify({
        event_type: 'coastline-telemetry',
        client_payload: {
          telemetry,
          findings,
          modelResponse: safeText(modelResponse, 3500),
          submittedAt: new Date().toISOString(),
          source: 'player-requested-game-diagnostics'
        }
      })
    });
    if (!response.ok) return { status: 'dispatch-failed', httpStatus: response.status };
    return { status: 'queued', workflow: 'Coastline AI correction pipeline' };
  } catch (_) {
    return { status: 'dispatch-failed', detail: 'GitHub dispatch request failed' };
  }
}
function applyCors(req, res) {
  const origin = req.headers.origin || '';
  const isCoastlinePreview = /^https:\/\/coastline-babylon-beta-[a-z0-9-]+-molson835-3446\.vercel\.app$/.test(origin);
  if (ALLOWED_ORIGINS.has(origin) || isCoastlinePreview) {
    res.setHeader('access-control-allow-origin', origin);
    res.setHeader('vary', 'Origin');
    res.setHeader('access-control-allow-methods', 'GET, POST, OPTIONS');
    res.setHeader('access-control-allow-headers', 'Content-Type, Authorization');
    res.setHeader('access-control-max-age', '600');
  }
}

export default async function handler(req, res) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }
  if (req.method === 'GET') {
    return send(res, 200, {
      service: 'Coastline AI Control Plane',
      version: '0.3.2',
      mode: (process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN) ? 'model-configured' : 'deterministic-fallback',
      model: MODEL,
      capabilities: ['telemetry-diagnosis', 'engineering-planning', 'validation-gates'],
      mutationPolicy: 'proposal-only until branch/build/test tooling is explicitly enabled'
    });
  }
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
  const rateLimit = checkRateLimit(req);
  if (!rateLimit.ok) { res.setHeader('retry-after', String(rateLimit.retryAfter)); return send(res, 429, { error: 'Rate limit exceeded; retry shortly.' }); }
  if (CONTROL_TOKEN) {
    const auth = req.headers.authorization || '';
    if (auth !== `Bearer ${CONTROL_TOKEN}`) return send(res, 401, { error: 'Unauthorized' });
  }
  const length = Number(req.headers['content-length'] || 0);
  if (length > MAX_BODY) return send(res, 413, { error: 'Payload too large' });
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return send(res, 400, { error: 'Invalid JSON' }); }
  }
  body = body || {};
  const telemetry = summarizeTelemetry(body.telemetry || body);
  const findings = deterministicDiagnosis(telemetry);
  let model = null;
  let modelError = null;
  try { model = await askModel(telemetry, body.context); }
  catch (error) { model = null; modelError = safeText(error?.message || 'AI Gateway request failed', 120); }
  const automation = await dispatchCorrection({ telemetry, findings, modelResponse: model });
  return send(res, 200, {
    ok: true,
    service: 'coastline-ai-control-plane',
    version: '0.3.0',
    model: model ? MODEL : null,
    modelStatus: model ? 'ok' : 'unavailable',
    modelError,
    findings,
    modelResponse: model,
    automation,
    next: findings.some(f => f.severity === 'high') ? 'performance-investigation' : 'continue-observation',
    safeMode: true,
    timestamp: new Date().toISOString()
  });
}
