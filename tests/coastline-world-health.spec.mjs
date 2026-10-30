import test from 'node:test';
import assert from 'node:assert/strict';
import { createCoastlineWorldHealth } from '../coastline-world-health.js';

function mesh(name, userData = {}, material = { color: 0xffffff }) {
  return {
    name, isMesh: true, visible: true, userData,
    geometry: { attributes: { position: { count: 12 } } },
    material,
    children: [],
    traverse(fn) { fn(this); },
  };
}
function makeWorld({ includeRoad = true, includeBuilding = true, includeTerrain = true, hiddenRoot = false } = {}) {
  const root = {
    name: 'coastline-city-root', visible: !hiddenRoot, userData: {}, children: [], parent: null,
    traverse(fn) { const visit = node => { fn(node); for (const child of node.children || []) visit(child); }; visit(this); },
  };
  if (includeRoad) root.children.push(mesh('road-asphalt', { coastlineRoadLayer: true }));
  if (includeBuilding) root.children.push({ name: 'coastline-building:Harbor Hotel', visible: true, userData: { coastlineBuilding: true }, children: [mesh('building-body')], parent: root, traverse(fn) { fn(this); for (const child of this.children) child.traverse(fn); } });
  if (includeTerrain) root.children.push(mesh('city-terrain', { coastlineTerrainLayer: true }));
  for (const child of root.children) child.parent = root;
  const scene = { isLight: true, children: [root], traverse(fn) { fn(this); root.traverse(fn); } };
  root.parent = scene;
  const renderer = {
    domElement: { isConnected: true },
    getContext: () => ({}),
    info: { render: { calls: 42, triangles: 12000 }, memory: { geometries: 4, textures: 2 } },
    outputColorSpace: 'srgb', toneMapping: 4, shadowMap: { enabled: true },
  };
  const camera = { near: 0.1, far: 1400, position: { x: 0, y: 10, z: 10 } };
  return { scene, root, renderer, camera };
}

test('reports a populated visible City world as healthy', () => {
  const world = makeWorld();
  const health = createCoastlineWorldHealth(world);
  const report = health.scan();
  assert.equal(report.status, 'healthy', JSON.stringify(report.checks));
  assert.equal(report.world.roads, 1);
  assert.equal(report.world.buildings, 1);
  assert.equal(report.world.terrain, 1);
  assert.equal(report.renderer.contextAvailable, true);
  assert.equal(report.camera.valid, true);
});

test('flags missing roads and buildings instead of treating a loaded canvas as a healthy world', () => {
  const world = makeWorld({ includeRoad: false, includeBuilding: false });
  const report = createCoastlineWorldHealth(world).scan();
  assert.equal(report.status, 'failed');
  assert.ok(report.checks.some(check => check.id === 'roads' && check.status === 'failed'));
  assert.ok(report.checks.some(check => check.id === 'buildings' && check.status === 'failed'));
});

test('flags a hidden City root even when its meshes exist', () => {
  const report = createCoastlineWorldHealth(makeWorld({ hiddenRoot: true })).scan();
  assert.equal(report.checks.find(check => check.id === 'city-root').status, 'failed');
  assert.equal(report.status, 'failed');
});

test('reports a missing WebGL context as a renderer failure', () => {
  const world = makeWorld();
  world.renderer.getContext = () => null;
  const report = createCoastlineWorldHealth(world).scan();
  assert.equal(report.checks.find(check => check.id === 'webgl-context').status, 'failed');
});

test('includes captured asset request failures in the report', () => {
  const world = makeWorld();
  const health = createCoastlineWorldHealth({ ...world, assetFailures: [{ url: './assets/missing.glb', message: '404' }] });
  const report = health.scan();
  assert.equal(report.checks.find(check => check.id === 'asset-requests').status, 'warning');
  assert.equal(report.assets.failures[0].url, './assets/missing.glb');
});
