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
    // Device profile remains diagnostic/scheduling context; it must not silently
    // lower global rendering quality or cut the authored world/ambient population.
    antialias:true,
    pixelRatioMax:1.75,
    shadows:true,
    shadowMapSize:2048,
    bloom:true,
    reflectionSize:1024,
    maxVisibleWorldCells:36,
    maxActiveNpc:90,
    maxActiveTraffic:36,
    vegetationDensity:1,
    objectLodBias:0,
    postFxScale:1,
    targetFrameMs:16.67
  });
}

export function applyCoastlineRendererConfig({ renderer, config }) {
  if(!renderer||!config) throw new Error('Renderer and config are required');
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio ?? 1,config.pixelRatioMax));
  renderer.shadowMap.enabled=config.shadows;
  return config;
}