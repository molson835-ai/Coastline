import { readFile, writeFile } from 'node:fs/promises';

const key = process.env.AI_GATEWAY_API_KEY;
if (!key) throw new Error('Missing AI_GATEWAY_API_KEY GitHub Actions secret; no source files were changed.');
const event = JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, 'utf8'));
const payload = event.client_payload || {};
if (event.action !== 'coastline-telemetry' && event.event_type !== 'coastline-telemetry') {
  throw new Error('This correction runner only accepts Coastline telemetry dispatch events.');
}
const telemetry = payload.telemetry || {};
const findings = Array.isArray(payload.findings) ? payload.findings : [];
if (!findings.some((item) => item && item.severity === 'high')) {
  console.log('No high-severity finding; refusing to generate a patch.');
  process.exit(0);
}
const allowed = ['world-engine.js', 'npc-world-slice.js', 'living-world.js', 'tests/world-engine.spec.mjs'];
const source = {};
for (const path of allowed) {
  try { source[path] = (await readFile(path, 'utf8')).slice(0, 22000); }
  catch { source[path] = '(file unavailable)'; }
}
const prompt = [
  'You are the Coastline game performance correction engineer. Return ONLY a valid unified git diff, no Markdown fences or commentary.',
  'Only modify these paths: ' + allowed.join(', ') + '.',
  'Do not modify dependencies, workflows, secrets, API credentials, or the stable production branch.',
  'Use the telemetry and findings to make one small, reversible, evidence-based improvement. If there is not enough evidence for a safe code change, return exactly NO_SAFE_PATCH.',
  'The repository has existing Node tests. Preserve public exports and behavior unless tests justify the change. Do not claim tests passed.',
  'Telemetry: ' + JSON.stringify(telemetry),
  'Deterministic findings: ' + JSON.stringify(findings),
  'Previous AI diagnosis: ' + String(payload.modelResponse || '').slice(0, 2500),
  'Source excerpts (truncated per file):',
  ...Object.entries(source).map(([path, content]) => '\\n--- ' + path + ' ---\\n' + content)
].join('\\n');
const response = await fetch('https://ai-gateway.vercel.sh/v1/chat/completions', {
  method: 'POST',
  headers: { authorization: 'Bearer ' + key, 'content-type': 'application/json' },
  body: JSON.stringify({
    model: process.env.COASTLINE_AI_MODEL || 'reflection/beam-free',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.1,
    max_tokens: 2500
  })
});
if (!response.ok) throw new Error('AI Gateway request failed with HTTP ' + response.status + '; no source files were changed.');
const data = await response.json();
let patch = data?.choices?.[0]?.message?.content || '';
patch = patch.trim().replace(/^```(?:diff|patch)?\\s*/i, '').replace(/\\s*```$/, '').trim();
if (patch === 'NO_SAFE_PATCH') { console.log('AI declined to create a patch because the evidence was insufficient.'); process.exit(0); }
if (!patch.startsWith('diff --git ')) throw new Error('AI response was not a unified diff; refusing to apply it.');
if (patch.length > 24000) throw new Error('AI patch exceeded the 24 KB safety limit.');
await writeFile('coastline-ai.patch', patch + '\\n', 'utf8');
console.log('Prepared a ' + patch.length + '-character patch for allowlist validation and tests.');