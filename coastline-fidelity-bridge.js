import { detectCoastlineDeviceProfile, createCoastlineRenderConfig, applyCoastlineRendererConfig } from './coastline-render-config.js';
import { createFidelityBudget } from './coastline-fidelity-budget.js';

const profile = detectCoastlineDeviceProfile();
const config = createCoastlineRenderConfig(profile);
const budget = createFidelityBudget(config);
window.__coastlineFidelity = { version: 2, profile, config, budget };

let applied = false;
const apply = () => {
  if (applied) return true;
  const hooks = window.__coastlineHooks;
  if (!hooks?.renderer) return false;

  applyCoastlineRendererConfig({ renderer: hooks.renderer, config });
  const runtime = window.__coastlineRuntime;
  if (runtime) {
    runtime.fidelityConfig = config;
    runtime.fidelityBudget = budget;
  }
  applied = true;
  window.__coastlineFidelity.applied = true;
  return true;
};

if (!apply()) {
  const startedAt = performance.now();
  const timer = setInterval(() => {
    if (apply() || performance.now() - startedAt >= 10000) clearInterval(timer);
  }, 250);
}
