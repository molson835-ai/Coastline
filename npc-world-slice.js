// Coastline core sandbox intentionally defers authored NPC interaction/activity slices.
// Ambient pedestrians remain part of the world, but no story NPC, repair event,
// rumor propagation, or activity-specific meshes are constructed here.
export function createNpcWorldSlice() {
  return Object.freeze({
    update() {},
    snapshot: () => ({ version: 3, available: false, deferred: true })
  });
}
