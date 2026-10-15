// Coastline 2.0 world truth: deterministic queries shared by rendering, navigation,
// traffic, parking, pedestrians, wildlife, collision and missions.
const smooth = t => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const hash = (x, z, seed = 0) => { const n = Math.sin((x + seed * 13.17) * 127.1 + (z - seed * 7.31) * 311.7) * 43758.5453; return n - Math.floor(n); };
const noise = (x, z, seed) => {
  const x0 = Math.floor(x), z0 = Math.floor(z), fx = smooth(x - x0), fz = smooth(z - z0);
  const a = hash(x0, z0, seed), b = hash(x0 + 1, z0, seed), c = hash(x0, z0 + 1, seed), d = hash(x0 + 1, z0 + 1, seed);
  return lerp(lerp(a, b, fx), lerp(c, d, fx), fz) * 2 - 1;
};

export function createWorldModel({ citySize = 1500, roadSpacing = 200, roadWidth = 15, roadSurfaceY = 3, seed = 0 } = {}) {
  const halfSize = citySize / 2, roadHalfWidth = roadWidth / 2;
  const roadOffset = (x, z) => ({ x: Math.abs(x - Math.round(x / roadSpacing) * roadSpacing), z: Math.abs(z - Math.round(z / roadSpacing) * roadSpacing) });
  const nearestRoad = (x, z) => {
    const offset = roadOffset(x, z);
    return offset.x <= offset.z
      ? { x: Math.round(x / roadSpacing) * roadSpacing, z, axis: 'vertical', distance: offset.x }
      : { x, z: Math.round(z / roadSpacing) * roadSpacing, axis: 'horizontal', distance: offset.z };
  };
  const isRoadCorridor = (x, z, extraWidth = 0) => { const o = roadOffset(x, z), half = roadHalfWidth + extraWidth; return o.x <= half || o.z <= half; };
  const groundY = (x, z) => {
    const raw = roadSurfaceY + noise(x * .0022, z * .0022, seed + 11) * 9 + noise(x * .008, z * .008, seed) * 6.5 + noise(x * .025, z * .025, seed + 23) * 1.8 + noise(x * .067, z * .067, seed + 37) * .65;
    const offset = roadOffset(x, z);
    return lerp(roadSurfaceY, raw, smoothstep(11, 40, Math.min(offset.x, offset.z)));
  };
  const regionAt = (x, z) => {
    const distance = Math.hypot(x, z);
    if (Math.abs(x) > halfSize * .88 || Math.abs(z) > halfSize * .88) return 'highway-edge';
    if (distance < 260) return 'city';
    if (distance < 470) return 'suburbs';
    return 'countryside';
  };
  const regionKey = (x, z, chunkSize = 200) => `${Math.floor((x + halfSize) / chunkSize)}:${Math.floor((z + halfSize) / chunkSize)}`;
  const inBounds = (x, z, margin = 0) => Math.abs(x) <= halfSize - margin && Math.abs(z) <= halfSize - margin;
  const roadId = (x, z) => { const r = nearestRoad(x, z); return `${r.axis}:${Math.round((r.axis === 'vertical' ? r.x : r.z) / roadSpacing)}:${Math.round((r.axis === 'vertical' ? r.z : r.x) / roadSpacing)}`; };
  const roadLane = (x, z, laneOffset = 4.2) => {
    const r = nearestRoad(x, z);
    return r.axis === 'vertical' ? { x: r.x + laneOffset, z, axis: r.axis } : { x, z: r.z + laneOffset, axis: r.axis };
  };
  const sidewalk = (x, z, side = 1, inset = 11.5) => {
    const r = nearestRoad(x, z);
    return r.axis === 'vertical' ? { x: r.x + side * inset, z, axis: r.axis } : { x, z: r.z + side * inset, axis: r.axis };
  };
  const parking = (x, z, side = 1, slot = 0, spacing = 7) => {
    const r = nearestRoad(x, z), along = (Math.round((r.axis === 'vertical' ? z : x) / spacing) * spacing) + slot * spacing;
    return r.axis === 'vertical' ? { x: r.x + side * (roadHalfWidth + 7), z: along, axis: r.axis, side } : { x: along, z: r.z + side * (roadHalfWidth + 7), axis: r.axis, side };
  };
  const cellBounds = (x, z, cellSize = 200) => { const cx = Math.floor((x + halfSize) / cellSize), cz = Math.floor((z + halfSize) / cellSize); return { cx, cz, key: `${cx}:${cz}`, minX: cx * cellSize - halfSize, maxX: (cx + 1) * cellSize - halfSize, minZ: cz * cellSize - halfSize, maxZ: (cz + 1) * cellSize - halfSize }; };
  const roadNodes = () => {
    const nodes = [];
    for (let x = -halfSize; x <= halfSize; x += roadSpacing) for (let z = -halfSize; z <= halfSize; z += roadSpacing) {
      nodes.push({ id: `n:${Math.round(x)}:${Math.round(z)}`, x, z, type: 'intersection', region: regionAt(x, z) });
    }
    return nodes;
  };
  return Object.freeze({
    citySize, halfSize, roadSpacing, roadWidth, roadSurfaceY, seed, groundY, isRoadCorridor, roadOffset,
    regionAt, regionKey, inBounds, nearestRoad, roadId, roadLane, sidewalk, parking, cellBounds, roadNodes, hash
  });
}
