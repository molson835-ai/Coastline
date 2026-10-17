/* Deterministic, renderer-independent world layout primitives for Coastline. */
(function (root) {
  'use strict';

  function create(seed = 1701) {
    let state = Number(seed) >>> 0;
    if (state === 0) state = 0x6d2b79f5;
    const initialSeed = state;
    const rand = () => {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 4294967296;
    };
    const roadCoordinates = [];
    for (let p = -90; p <= 90; p += 30) roadCoordinates.push(p);
    const blockCenters = [];
    for (let p = -105; p <= 105; p += 30) blockCenters.push(p);
    const pickupPositions = [[30, 0, 0], [60, 0, 30], [-30, 0, 60], [-60, 0, 0], [0, 0, -60]]
      .map(([x, y, z]) => ({ x, y, z }));
    return {
      seed: initialSeed,
      rand,
      roadCoordinates,
      blockCenters,
      pickupPositions,
      bounds: { min: -114, max: 114 },
      chunkSize: 30
    };
  }

  const api = { create };
  root.CoastlineWorldFactory = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
