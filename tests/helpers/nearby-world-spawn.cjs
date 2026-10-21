// Browser-side spawn probes intentionally start near the map center and test road geometry
// before running collision checks. Never sweep the entire world synchronously: that blocks
// Chromium's main thread and makes the gameplay loop appear broken.
function findNearbyClearRoad() {
  const api = window.__coastlineTest;
  if (!api?.worldModel?.isRoadCorridor) throw new Error('World road model is not ready');
  const vehicles = api.vehicleRoster();
  const xs = [0, 200, -200, 400, -400, 600, -600];
  const zs = [40, -40, 80, -80, 120, -120, 160, -160, 240, -240, 280, -280, 320, -320, 360, -360];
  for (const x of xs) for (const z of zs) {
    const samples = [-12, -8, -4, 0, 4, 8, 12].map(offset => z + offset);
    if (!samples.every(sampleZ => api.worldModel.isRoadCorridor(x, sampleZ))) continue;
    if (samples.some(sampleZ => api.buildingBlocked(x, sampleZ, 2))) continue;
    if (vehicles.some(v => samples.some(sampleZ => Math.hypot(v.x - x, v.z - sampleZ) < 10))) continue;
    return { x, z };
  }
  throw new Error('Could not locate a nearby clear central road lane for controls regression');
}

function findNearbyClearWalkStart() {
  const api = window.__coastlineTest;
  if (!api?.worldModel?.isRoadCorridor) throw new Error('World road model is not ready');
  const vehicles = api.vehicleRoster();
  const xs = [0, 200, -200, 400, -400, 600, -600];
  const zs = [40, -40, 80, -80, 120, -120, 160, -160, 240, -240, 280, -280, 320, -320, 360, -360];
  for (const x of xs) for (const z of zs) {
    const samples = [0, 0.75, 1.5, 2.25].map(offset => z + offset);
    if (!samples.every(sampleZ => api.worldModel.isRoadCorridor(x, sampleZ, 2))) continue;
    if (samples.some(sampleZ => api.buildingBlocked(x, sampleZ, 0.6)
      || api.pedestrianCollisionBlocked(x, sampleZ, 0.6))) continue;
    if (vehicles.some(v => samples.some(sampleZ => Math.hypot(v.x - x, v.z - sampleZ) < 3))) continue;
    return { x, z };
  }
  throw new Error('Could not locate nearby clear ground for walking controls regression');
}

module.exports = { findNearbyClearRoad, findNearbyClearWalkStart };
