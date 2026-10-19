// Coastline Fidelity Core: one source of truth for renderer quality decisions.
// This module is intentionally independent of caching/service-worker behavior.
export function detectCoastlineDeviceProfile({ width=globalThis.innerWidth ?? 1024, dpr=globalThis.devicePixelRatio ?? 1, cores=globalThis.navigator?.hardwareConcurrency ?? 8, memory=globalThis.navigator?.deviceMemory ?? 8 }={}) {
  const mobile=width<=760;
  const constrained=mobile || cores<=4 || memory<=4;
  return { mobile, constrained, cores, memory, dpr };
}

export function createCoastlineRenderConfig(profile=detectCoastlineDeviceProfile()) {
  const constrained=Boolean(profile.constrained);
  return Object.freeze({
    version:1,
    profile: constrained?'constrained':'full',
    antialias:!constrained,
    pixelRatioMax: constrained?1.25:1.75,
    shadows:!constrained,
    shadowMapSize: constrained?1024:2048,
    bloom:!constrained,
    reflectionSize: constrained?512:1024,
    maxVisibleWorldCells: constrained?16:36,
    maxActiveNpc: constrained?42:90,
    maxActiveTraffic: constrained?18:36,
    vegetationDensity: constrained?.58:1,
    objectLodBias: constrained?1:0,
    postFxScale: constrained?.7:1,
    targetFrameMs: constrained?20:16.67
  });
}

export function applyCoastlineRendererConfig({ renderer, config }) {
  if(!renderer||!config) throw new Error('Renderer and config are required');
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio ?? 1,config.pixelRatioMax));
  renderer.shadowMap.enabled=config.shadows;
  return config;
}