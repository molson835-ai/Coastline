import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../game-v3.html', import.meta.url), 'utf8');

test('world has deterministic instanced ground cover for weeds, shrubs, and dirt patches', () => {
  assert.match(html, /function buildGroundCover\(\)/);
  assert.match(html, /groundCoverStats=\{weeds:0,bushes:0,dirtPatches:0\}/);
  assert.match(html, /new THREE\.InstancedMesh\(weedGeo,mat,2400\)/);
  assert.match(html, /groundCoverStats\.bushes=bi/);
  assert.match(html, /groundCoverStats\.dirtPatches=di/);
  assert.match(html, /worldModel\.hash\(x,z,41\)/);
});

test('roadside signs and signal poles are solid world obstacles', () => {
  assert.match(html, /signPositions\.some\(p=>Math\.hypot\(x-p\.x,z-p\.z\)<r\+\.48\)/);
  assert.match(html, /trafficSignalHeads\.some\(p=>Math\.hypot\(x-p\.x,z-p\.z\)<r\+\.52\)/);
  assert.match(html, /trafficSignalHeads\.push\(\{x,z,group:g,kind:'traffic-signal'/);
  assert.match(html, /const candidates=\[\.\.\.lampPositions,\.\.\.signPositions,\.\.\.trafficSignalHeads\]/);
});

test('camera smoothing is time-based instead of a per-frame fixed lerp', () => {
  assert.match(html, /function cameraUpdate\(dt\)/);
  assert.match(html, /1-Math\.exp\(-Math\.max\(0,dt\)\*rate\)/);
  assert.match(html, /cameraUpdate\(dt\)/);
});

test('sunset keeps local visibility and distant fog under control', () => {
  assert.match(html, /renderer\.toneMappingExposure=1\.22/);
  assert.match(html, /sun\.intensity=\.42\+daylight\*1\.8\+sunset\*\.42/);
  assert.match(html, /intensity=\.95\+daylight\*1\.05\+sunset\*\.28/);
  assert.match(html, /scene\.fog\.density=fogBase\+\(1-daylight\)\*\.00012/);
});

test('on-foot character has a basic rig, face detail, and gait animation', () => {
  assert.match(html, /const avatarLegMat=.*avatarLegs=\[\],avatarArms=\[\]/);
  assert.match(html, /avatarEyeGeo=new THREE\.SphereGeometry/);
  assert.match(html, /function updateAvatarAnimation\(dt,now\)/);
  assert.match(html, /avatarLegs\.forEach/);
  assert.match(html, /avatarArms\.forEach/);
});

test('map-only smoothing and redraw work are absent in the foundation build', () => {
  assert.doesNotMatch(html, /mapVisualX|mapVisualZ|mapPoint|drawCoastMap|lastMapDraw/);
});
