import { readFile, writeFile } from 'node:fs/promises';

const event = JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, 'utf8'));
const payload = event.client_payload || {};
if (event.action !== 'coastline-telemetry' && event.event_type !== 'coastline-telemetry') {
  throw new Error('This correction runner only accepts Coastline telemetry dispatch events.');
}
const findings = Array.isArray(payload.findings) ? payload.findings : [];
if (!findings.some((item) => item && item.severity === 'high')) {
  console.log('No high-severity finding; refusing to apply a patch.');
  process.exit(0);
}
const patch = typeof payload.patch === 'string' ? payload.patch.trim() : '';
if (!patch) {
  console.log('Backend supplied no safe patch; no source files were changed.');
  process.exit(0);
}
if (!patch.startsWith('diff --git ') || patch.length > 24000) {
  throw new Error('Backend patch is invalid or exceeds the 24 KB safety limit.');
}
await writeFile('coastline-ai.patch', patch + '\n', 'utf8');
console.log('Loaded backend-generated patch (' + patch.length + ' characters) for allowlist validation and tests.');
