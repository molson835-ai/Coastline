// Browser-side spawn probes deliberately use known central road corridors and bounded
// local samples. Avoid exhaustive coordinate sweeps: they block Chromium's game/render loop.
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
  const x = 0; // Known central north/south road: traffic lanes are offset from the walking line.
  const vehicles = api.vehicleRoster();
  const pedestrians = api.pedestrianRoster();
  const zs = [40, -40, 80, -80, 120, -120, 160, -160, 240, -240, 280, -280, 320, -320, 360, -360];
  for (const z of zs) {
    // Short samples are enough for the initial walking assertion and bound sync work to one
    // central road segment. The path remains inside the corridor and away from intersections.
    const samples = Array.from({ length: 17 }, (_, i) => z + i * 0.25);
    if (!samples.every(sampleZ => api.worldModel.isRoadCorridor(x, sampleZ, 2))) continue;
    if (samples.some(sampleZ => api.buildingBlocked(x, sampleZ, 0.6))) continue;
    if (vehicles.some(v => samples.some(sampleZ => Math.hypot(v.x - x, v.z - sampleZ) < 2.6))) continue;

    // Clear only nearby pedestrians from this test lane; all game entities and rules remain
    // unchanged in production and the player can exercise the real input/movement loop.
    for (let i = 0; i < pedestrians.length; i++) {
      const p = pedestrians[i];
      const nearestZ = Math.max(z, Math.min(z + 4, p.z));
      if (Math.hypot(p.x - x, p.z - nearestZ) < 4) {
        api.setPedestrianPosition(i, -680, -600 + i * 9);
      }
    }
    return { x, z };
  }
  throw new Error('Could not locate a nearby clear central-road lane for walking controls regression');
}

module.exports = { findNearbyClearRoad, findNearbyClearWalkStart };
