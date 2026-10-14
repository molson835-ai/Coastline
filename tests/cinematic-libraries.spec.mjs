import test from 'node:test';
import assert from 'node:assert/strict';
import { cinematicLOD, cinematicQuality, getCinematicProfile } from '../cinematic-visual-library.js';
import { canTransition, blendAnimationState } from '../cinematic-animation-library.js';
import { environmentDetail, environmentLayerBudget } from '../cinematic-environment-library.js';

test('cinematic vehicle profiles use metric dimensions and layered detail', () => {
  const suv = getCinematicProfile('vehicle', 'suv');
  assert.equal(suv.dimensions.length > suv.dimensions.width, true);
  assert.ok(suv.details.includes('lamp-lenses'));
  assert.ok(suv.materials.includes('glass'));
});

test('cinematic LOD is monotonic and bounded', () => {
  assert.equal(cinematicLOD(10), 0);
  assert.equal(cinematicLOD(1000), 4);
  assert.equal(cinematicQuality(20), 1);
  assert.equal(cinematicQuality(1000), 0);
  assert.equal(cinematicQuality(100, 0.5) <= 0.5, true);
});

test('animation transitions are explicit and blendable', () => {
  assert.equal(canTransition('idle', 'walk'), true);
  assert.equal(canTransition('idle', 'exitVehicle'), false);
  const pose = blendAnimationState('idle', 'crouch', 0.5);
  assert.ok(pose.pelvisDrop > 0 && pose.pelvisDrop < 0.42);
});

test('environment detail remains modular and budgeted', () => {
  assert.ok(environmentDetail('road').residential.includes('mailbox'));
  assert.ok(environmentDetail('weathering').asphalt.includes('patch'));
  assert.ok(environmentLayerBudget(40) > environmentLayerBudget(500));
});
