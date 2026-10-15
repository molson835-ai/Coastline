import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorldModel } from '../world-model.js';

test('terrain remains deterministic and road surfaces stay level', () => {
  const world = createWorldModel({ seed: 23 });
  const samples = [[-431,-217],[-125,87],[74,312],[333,-401],[512,512]];
  for (const [x,z] of samples) assert.equal(world.groundY(x,z), world.groundY(x,z));
  for (const v of [-400,-200,0,200,400]) {
    assert.ok(Math.abs(world.groundY(v,0)-world.roadSurfaceY) < 1e-9);
    assert.ok(Math.abs(world.groundY(0,v)-world.roadSurfaceY) < 1e-9);
  }
});

test('terrain profiles expose stable regional identity and slope data', () => {
  const world = createWorldModel({ seed: 23 });
  for (const [x,z] of [[0,0],[300,0],[600,0],[-740,0]]) {
    const profile = world.terrainProfile(x,z);
    assert.ok(['city','suburbs','countryside','highway-edge'].includes(profile.region));
    assert.ok(profile.moisture >= .08 && profile.moisture <= .92);
    assert.ok(profile.roughness > 0 && profile.roughness <= 1);
    assert.ok(Number.isFinite(profile.slope.x) && Number.isFinite(profile.slope.y) && Number.isFinite(profile.slope.z));
  }
});

test('building-site terrain stays coherent inside each block', () => {
  const world = createWorldModel({ seed: 23 });
  const a = world.groundY(100,100), b = world.groundY(135,135), c = world.groundY(160,160);
  assert.ok(Math.abs(a-b) < 0.25);
  assert.ok(Math.abs(b-c) < 0.8);
});
