// Deterministic world queries shared by terrain, roads, actors, collision, and missions.
// This first increment preserves the existing 200 m city-road grid while giving future
// streamed regions one stable source of truth.
const smooth = t => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const hash = (x, z, seed = 0) => {
  const n = Math.sin((x + seed * 13.17) * 127.1 + (z - seed * 7.31) * 311.7) * 43758.5453;
  return n - Math.floor(n);
};
const noise = (x, z, seed) => {
  const x0 = Math.floor(x), z0 = Math.floor(z);
  const fx = smooth(x - x0), fz = smooth(z - z0);
  const a = hash(x0, z0, seed), b = hash(x0 + 1, z0, seed);
  const c = hash(x0, z0 + 1, seed), d = hash(x0 + 1, z0 + 1, seed);
  return lerp(lerp(a, b, fx), lerp(c, d, fx), fz) * 2 - 1;
};

export function createWorldModel({ citySize = 1500, roadSpacing = 200, roadWidth = 15, roadSurfaceY = 3, seed = 0 } = {}) {
  const halfSize = citySize / 2;
  const roadHalfWidth = roadWidth / 2;
  const roadOffset = (x, z) => ({
    x: Math.abs(x - Math.round(x / roadSpacing) * roadSpacing),
    z: Math.abs(z - Math.round(z / roadSpacing) * roadSpacing)
  });
  const isRoadCorridor = (x, z, extraWidth = 0) => {
    const offset = roadOffset(x, z);
    const half = roadHalfWidth + extraWidth;
    return offset.x <= half || offset.z <= half;
  };
  const groundY = (x, z) => {
    const raw = roadSurfaceY + noise(x * 0.0022, z * 0.0022, seed + 11) * 9
      + noise(x * 0.008, z * 0.008, seed) * 6.5
      + noise(x * 0.025, z * 0.025, seed + 23) * 1.8
      + noise(x * 0.067, z * 0.067, seed + 37) * 0.65;
    const offset = roadOffset(x, z);
    return lerp(roadSurfaceY, raw, smoothstep(11, 40, Math.min(offset.x, offset.z)));
  };
  const regionAt = (x, z) => {
    const distance = Math.hypot(x, z);
    if (Math.abs(x) > halfSize * 0.88 || Math.abs(z) > halfSize * 0.88) return 'highway-edge';
    if (distance < 260) return 'city';
    if (distance < 470) return 'suburbs';
    return 'countryside';
  };
  const regionKey = (x, z, chunkSize = 200) => `${Math.floor((x + halfSize) / chunkSize)}:${Math.floor((z + halfSize) / chunkSize)}`;
  const inBounds = (x, z, margin = 0) => Math.abs(x) <= halfSize - margin && Math.abs(z) <= halfSize - margin;
  return Object.freeze({
    citySize, halfSize, roadSpacing, roadWidth, roadSurfaceY, seed,
    groundY, isRoadCorridor, roadOffset, regionAt, regionKey, inBounds, hash,
    nearestRoad: (x, z) => {
      const offset = roadOffset(x, z);
      return offset.x <= offset.z
        ? { x: Math.round(x / roadSpacing) * roadSpacing, z, axis: 'vertical' }
        : { x, z: Math.round(z / roadSpacing) * roadSpacing, axis: 'horizontal' };
    }
  });
}
