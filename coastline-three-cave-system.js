export const COASTLINE_THREE_CAVE_ENTRANCES = Object.freeze([
  Object.freeze({ id: 'left', world: 'waterfront', x: 510, z: 542.5, radius: 2.0, interior: 'cavern-left', entry: 'waterfront-to-electric-dungeon-left', returnTransition: 'electric-dungeon-left-to-waterfront' }),
  Object.freeze({ id: 'center', world: 'waterfront', x: 520, z: 542.5, radius: 2.0, interior: 'rocket-boots', entry: 'waterfront-to-electric-dungeon', returnTransition: 'electric-dungeon-to-waterfront' }),
  Object.freeze({ id: 'right', world: 'waterfront', x: 530, z: 542.5, radius: 2.0, interior: 'cavern-right', entry: 'waterfront-to-electric-dungeon-right', returnTransition: 'electric-dungeon-right-to-waterfront' }),
]);
export const COASTLINE_CAVE_EXPLORATION_LENGTH = 120;
export const CAVE_INTERIOR_SPAWNS = Object.freeze({
  left: Object.freeze({ x: 510, y: 0, z: 546.5, rotationY: 0 }),
  center: Object.freeze({ x: 520, y: 0, z: 546.5, rotationY: 0 }),
  right: Object.freeze({ x: 530, y: 0, z: 546.5, rotationY: 0 }),
});
const CAVE_EXIT_POINTS = Object.freeze({
  left: Object.freeze({ x: 510, z: 542.5, radius: 2.0 }),
  center: Object.freeze({ x: 520, z: 542.5, radius: 2.0 }),
  right: Object.freeze({ x: 530, z: 542.5, radius: 2.0 }),
});
export const COASTLINE_THREE_CAVE_TRANSITIONS = Object.freeze(COASTLINE_THREE_CAVE_ENTRANCES.map(cave => Object.freeze({ cave: cave.id, entry: cave.entry, returnTransition: cave.returnTransition, toWorld: 'electric-lemonade-dungeon' })));
export function getCoastlineThreeCaveAt(x, z) {
  if (![x, z].every(Number.isFinite)) return null;
  return COASTLINE_THREE_CAVE_ENTRANCES.find(cave => Math.hypot(x - cave.x, z - cave.z) <= cave.radius) ?? null;
}
function getCaveAtPoint(points, x, z) { return Object.entries(points).find(([, point]) => Math.hypot(x - point.x, z - point.z) <= point.radius)?.[0] ?? null; }
function removeLegacyCaveNodes(root) {
  if (!root?.traverse) return 0;
  const doomed = [];
  root.traverse(object => {
    const name = String(object.name || '');
    if (name === 'coastline-waterfront-cave-entrance-glb' || name === 'coastline-waterfront-cave-mountain' || name.startsWith('coastline-waterfront-cave-mountain-') || name === 'coastline-waterfront-cave-approach-path' || name === 'coastline-waterfront-cave-rubble' || name === 'coastline-waterfront-cave-coastal-plants' || name === 'coastline-electric-lemonade-cave-dark-opening') doomed.push(object);
  });
  for (const object of doomed) object.parent?.remove(object);
  return doomed.length;
}
function removeLegacyCaveColliders(root) {
  const colliders = root?.userData?.coastlineColliders;
  if (!Array.isArray(colliders)) return 0;
  const filtered = colliders.filter(collider => {
    const name = String(collider?.name || '');
    return !name.startsWith('coastline-waterfront-cave-') &&
      !name.startsWith('coastline-electric-lemonade-cave-') &&
      !name.startsWith('coastline-three-cave-divider-');
  });
  const removed = colliders.length - filtered.length;
  colliders.splice(0, colliders.length, ...filtered);
  if (window.__coastlineActiveWorldRoot === root || window.__coastlineRegionRoot === root) {
    window.__coastlineActiveWorldColliders = colliders;
  }
  return removed;
}
function addStoneTraceColliders(root) {
  if (!root) return;
  const colliders = root.userData.coastlineColliders || (root.userData.coastlineColliders = []);
  for (const cave of COASTLINE_THREE_CAVE_ENTRANCES) {
    const prefix = `coastline-three-cave-${cave.id}`;
    if (colliders.some(c => c?.name === `${prefix}-left-stone`)) continue;
    colliders.push(
      { name: `${prefix}-left-stone`, x: cave.x - 3.15, z: cave.z + 2.65, w: .72, d: 7.1 },
      { name: `${prefix}-right-stone`, x: cave.x + 3.15, z: cave.z + 2.65, w: .72, d: 7.1 },
      { name: `${prefix}-rear-left-stone`, x: cave.x - 1.85, z: cave.z + 6.15, w: 3, d: .72 },
      { name: `${prefix}-rear-right-stone`, x: cave.x + 1.85, z: cave.z + 6.15, w: 3, d: .72 },
      { name: `${prefix}-front-left-jamb`, x: cave.x - 3.55, z: cave.z - .55, w: 1, d: 1.15 },
      { name: `${prefix}-front-right-jamb`, x: cave.x + 3.55, z: cave.z - .55, w: 1, d: 1.15 },
    );
  }
  root.userData.coastlineThreeCaveBoundaryContract = COASTLINE_THREE_CAVE_ENTRANCES.map(cave => ({ id: cave.id, x: cave.x, z: cave.z, radius: cave.radius }));
  window.__coastlineActiveWorldColliders = colliders;
}
function removeDungeonObstructions(root) {
  if (!root?.traverse) return;
  const remove = [];
  root.traverse(node => {
    if (node.name === 'electric-dungeon-obscuring-rock' || node.name.startsWith('electric-dungeon-landmark-')) remove.push(node);
  });
  for (const node of remove) node.parent?.remove(node);
  const colliders = root.userData?.coastlineColliders;
  if (Array.isArray(colliders)) {
    for (let i = colliders.length - 1; i >= 0; i--) {
      if (String(colliders[i]?.name || '') === 'electric-dungeon-rock-collider') colliders.splice(i, 1);
    }
    window.__coastlineActiveWorldColliders = colliders;
  }
}

function buildCaveEntranceArches(root, THREE, floorY, colliders) {
  if (!root?.getObjectByName || !THREE || root.getObjectByName('coastline-three-cave-entrance-arches')) return;
  const arches = new THREE.Group();
  arches.name = 'coastline-three-cave-entrance-arches';
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x515249, roughness: 1 });
  const rockGeo = new THREE.DodecahedronGeometry(1, 1);
  for (const cave of COASTLINE_THREE_CAVE_ENTRANCES) {
    const arch = new THREE.Group();
    arch.name = `coastline-three-cave-${cave.id}-entrance-arch`;
    for (const side of [-1, 1]) {
      for (let level = 0; level < 3; level++) {
        const pillar = new THREE.Mesh(rockGeo, rockMat);
        pillar.name = `cave-arch-${cave.id}-pillar-${side}-${level}`;
        pillar.position.set(cave.x + side * 2.85, floorY + 0.9 + level * 1.15, 544.1);
        pillar.scale.set(0.85, 0.9, 0.9);
        pillar.rotation.set(level * 0.07, side * 0.09, side * 0.035);
        pillar.castShadow = pillar.receiveShadow = true;
        arch.add(pillar);
      }
      colliders.push({
        name: `coastline-three-cave-${cave.id}-entrance-pillar-${side}`,
        x: cave.x + side * 2.85, z: 544.1, w: 1.25, d: 1.25,
      });
    }
    for (let segment = 0; segment <= 6; segment++) {
      const angle = Math.PI * segment / 6;
      const crown = new THREE.Mesh(rockGeo, rockMat);
      crown.name = `cave-arch-${cave.id}-crown-${segment}`;
      crown.position.set(cave.x + Math.cos(angle) * 2.55, floorY + 3.85 + Math.sin(angle) * 1.0, 544.1);
      crown.scale.set(0.78, 0.72, 0.86);
      crown.rotation.set(segment * 0.04, segment * 0.11, (segment - 3) * 0.08);
      crown.castShadow = crown.receiveShadow = true;
      arch.add(crown);
    }
    arches.add(arch);
  }
  root.add(arches);
}

function buildSideCaverns(root, THREE) {
  if (!root?.getObjectByName || !THREE) return;
  const colliders = root.userData.coastlineColliders || (root.userData.coastlineColliders = []);
  if (root.getObjectByName('coastline-three-cave-interiors')) {
    window.__coastlineActiveWorldColliders = colliders;
    return;
  }
  removeDungeonObstructions(root);
  const group = new THREE.Group(); group.name = 'coastline-three-cave-interiors';
  const floorY = Number.isFinite(window.__coastlineElectricDungeonFloorY) ? window.__coastlineElectricDungeonFloorY : 0;
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x20221f, roughness: 1 });
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x4a4b43, roughness: 1 });
  const rockGeo = new THREE.DodecahedronGeometry(1, 1);
  const coneGeo = new THREE.ConeGeometry(.42, 1.7, 6);
  const addRockWall = (name, x, z, w, d, parent = group) => {
    const count = Math.max(8, Math.ceil(Math.max(w, d) / 1.4));
    const rocks = new THREE.InstancedMesh(rockGeo, rockMat, count * 2); rocks.name = name; rocks.castShadow = rocks.receiveShadow = true;
    const dummy = new THREE.Object3D(); const alongX = w >= d;
    for (let i = 0; i < count * 2; i++) {
      const t = (i % count) / Math.max(1, count - 1); const offset = (t - .5) * Math.max(w, d);
      dummy.position.set(alongX ? x + offset : x, floorY + 1.2 + (i % 2) * 1.8 + (i % 3) * .12, alongX ? z : z + offset);
      dummy.scale.set(alongX ? 1.35 : 1.15, 1.2 + (i % 3) * .28, alongX ? 1.15 : 1.35); dummy.rotation.set(i * .17, i * .29, i * .09); dummy.updateMatrix(); rocks.setMatrixAt(i, dummy.matrix);
    }
    rocks.instanceMatrix.needsUpdate = true; parent.add(rocks);
  };
  for (const cave of COASTLINE_THREE_CAVE_ENTRANCES.filter(c => c.id !== 'center')) {
    const cx = CAVE_INTERIOR_SPAWNS[cave.id].x;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, COASTLINE_CAVE_EXPLORATION_LENGTH), floorMat); floor.name = `coastline-three-cave-${cave.id}-floor`; floor.rotation.x = -Math.PI / 2; floor.position.set(cx, floorY, 600); floor.receiveShadow = true; group.add(floor);
    const leftWall = new THREE.Group(); leftWall.name = `coastline-three-cave-${cave.id}-left-wall`; group.add(leftWall);
    const rightWall = new THREE.Group(); rightWall.name = `coastline-three-cave-${cave.id}-right-wall`; group.add(rightWall);
    addRockWall(`coastline-three-cave-${cave.id}-left-rock-wall`, cx < 520 ? 503.5 : 525, 600, .9, 120, leftWall);
    addRockWall(`coastline-three-cave-${cave.id}-right-rock-wall`, cx < 520 ? 515 : 536.5, 600, .9, 120, rightWall);
    addRockWall(`coastline-three-cave-${cave.id}-rear-rock`, cx, 659, 10, 1);

    const labyrinth = new THREE.Group();
    labyrinth.name = `coastline-three-cave-${cave.id}-labyrinth-walls`;
    group.add(labyrinth);
    const addMazeWall = (name, x, z, w, d) => {
      addRockWall(name, x, z, w, d, labyrinth);
      colliders.push({
        name: name + '-collision',
        x, z,
        w: w >= d ? w + 1.1 : Math.max(w + 0.5, 1.7),
        d: w >= d ? Math.max(d + 1.0, 1.8) : d + 1.1,
      });
    };
    // Alternating stone ridges leave a winding, navigable tunnel passage.
    for (let turn = 0; turn < 7; turn++) {
      const z = 558 + turn * 14.0;
      const gapOnLeft = turn % 2 === 0;
      const wallX = gapOnLeft ? cx + 2.1 : cx - 2.1;
      addMazeWall(`coastline-three-cave-${cave.id}-labyrinth-wall-${turn + 1}`,
        wallX, z, 5.8, 1.0);
      if (turn === 2 || turn === 5) {
        const branchX = gapOnLeft ? cx - 2.2 : cx + 2.2;
        addMazeWall(`coastline-three-cave-${cave.id}-labyrinth-branch-${turn + 1}`,
          branchX, z + 6.0, 1.0, 5.2);
      }
    }

    const ceiling = new THREE.InstancedMesh(rockGeo, rockMat, 42); ceiling.name = `coastline-three-cave-${cave.id}-broken-ceiling`; ceiling.castShadow = true; const dummy = new THREE.Object3D();
    for (let i = 0; i < 42; i++) { const t = i / 41; dummy.position.set(cx + Math.sin(i * 1.7) * 3.7, floorY + 6.2 + (i % 4) * .25, 544 + t * 112); dummy.scale.set(1.4 + (i % 3) * .35, .65 + (i % 2) * .3, 1.8 + (i % 4) * .25); dummy.rotation.set(i * .11, i * .23, i * .07); dummy.updateMatrix(); ceiling.setMatrixAt(i, dummy.matrix); }
    ceiling.instanceMatrix.needsUpdate = true; group.add(ceiling);
    const cones = new THREE.InstancedMesh(coneGeo, rockMat, 36); cones.name = `coastline-three-cave-${cave.id}-stalactites-stalagmites`; cones.castShadow = true;
    for (let i = 0; i < 36; i++) { const side = i % 2 ? 1 : -1; const z = 548 + (i % 18) * 6.1; dummy.position.set(cx + side * (3.6 + (i % 3) * .35), floorY + (i % 4 === 0 ? 5.9 : .8), z); dummy.scale.set(.65 + (i % 3) * .12, i % 4 === 0 ? 1.0 : .8, .65 + (i % 2) * .12); dummy.rotation.set(0, i * .2, i % 4 === 0 ? Math.PI : side * .08); dummy.updateMatrix(); cones.setMatrixAt(i, dummy.matrix); }
    cones.instanceMatrix.needsUpdate = true; group.add(cones);
  }
  root.add(group);
  const add = (name, x, z, w, d) => { if (!colliders.some(c => c?.name === name)) colliders.push({ name, x, z, w, d }); };
  add('electric-dungeon-left-cavern-outer-wall', 503.5, 600, 2.3, 122.7); add('electric-dungeon-left-cavern-divider', 515, 600, 2.3, 122.7); add('electric-dungeon-left-cavern-rear', 510, 659, 10.8, 2.1);
  add('electric-dungeon-right-cavern-divider', 525, 600, 2.3, 122.7); add('electric-dungeon-right-cavern-outer-wall', 536.5, 600, 2.3, 122.7); add('electric-dungeon-right-cavern-rear', 530, 659, 10.8, 2.1);
  buildCaveEntranceArches(root, THREE, floorY, colliders);
  window.__coastlineActiveWorldColliders = colliders;
}
function registerCaveTransitions(manager) {
  if (!manager?.getWorldDefinition?.('electric-lemonade-dungeon') || !manager.getWorldDefinition?.('waterfront')) return false;
  const defs = [
    { id: 'waterfront-to-electric-dungeon-left', fromWorld: 'waterfront', toWorld: 'electric-lemonade-dungeon', trigger: 'cave', spawn: 'fixed', destinationSpawn: CAVE_INTERIOR_SPAWNS.left, returnPoint: { x: 510, y: 0, z: 542.5, rotationY: Math.PI }, vehiclePolicy: 'forbidden' },
    { id: 'waterfront-to-electric-dungeon-right', fromWorld: 'waterfront', toWorld: 'electric-lemonade-dungeon', trigger: 'cave', spawn: 'fixed', destinationSpawn: CAVE_INTERIOR_SPAWNS.right, returnPoint: { x: 530, y: 0, z: 542.5, rotationY: Math.PI }, vehiclePolicy: 'forbidden' },
    { id: 'electric-dungeon-left-to-waterfront', fromWorld: 'electric-lemonade-dungeon', toWorld: 'waterfront', trigger: 'cave', spawn: 'fixed', destinationSpawn: { x: 510, y: 0, z: 537.5, rotationY: Math.PI }, vehiclePolicy: 'forbidden' },
    { id: 'electric-dungeon-right-to-waterfront', fromWorld: 'electric-lemonade-dungeon', toWorld: 'waterfront', trigger: 'cave', spawn: 'fixed', destinationSpawn: { x: 530, y: 0, z: 537.5, rotationY: Math.PI }, vehiclePolicy: 'forbidden' },
  ];
  for (const definition of defs) { try { manager.registerTransition(definition); } catch (error) { if (!/already registered/i.test(String(error?.message || error))) throw error; } }
  return true;
}
let transitionPending = false;
async function triggerCaveTransition(cave, exiting = false) {
  if (transitionPending) return;
  const request = window.__coastlineTransitionRequest; if (typeof request !== 'function') return;
  transitionPending = true;
  try {
    await request(exiting ? cave.returnTransition : cave.entry);
    window.__coastlineActiveCaveId = exiting ? null : cave.id;
    const api = window.__coastlineElectricLemonade;
    if (exiting) api?.exitDungeon?.(); else api?.enterDungeon?.();
    if (!exiting) buildSideCaverns(window.__coastlineActiveWorldRoot || window.__coastlineRegionRoot, window.__coastlineThree);
  }
  catch (error) { console.warn('[Coastline] cave CTM failed:', error); }
  finally { window.setTimeout(() => { transitionPending = false; }, 500); }
}
function maintain() {
  const world = window.__coastlineActiveWorldId; const root = window.__coastlineRegionRoot;
  if (world === 'waterfront' && root) {
    removeLegacyCaveNodes(root); removeLegacyCaveColliders(root); addStoneTraceColliders(root);
    if (!root.userData?.coastlineReplacementCaveLoaded && !root.userData?.coastlineReplacementCaveLoading) window.__coastlineEnsureReplacementCave?.(root);
    const player = window.__coastlinePlayer; const cave = player?.mode === 'walk' ? getCoastlineThreeCaveAt(player.x, player.z) : null; if (cave) void triggerCaveTransition(cave, false);
  }
  if (world === 'electric-lemonade-dungeon') {
    const root = window.__coastlineActiveWorldRoot || window.__coastlineRegionRoot; buildSideCaverns(root, window.__coastlineThree);
    const player = window.__coastlinePlayer;
    const activeCave = COASTLINE_THREE_CAVE_ENTRANCES.find(c => c.id === window.__coastlineActiveCaveId);
    if (player?.mode === 'walk' && activeCave && getCaveAtPoint({ [activeCave.id]: CAVE_EXIT_POINTS[activeCave.id] }, player.x, player.z)) {
      void triggerCaveTransition(activeCave, true);
    }
  }
}
if (typeof window !== 'undefined') {
  window.__coastlineThreeCaveSystemUpdate = maintain;
  window.__coastlineThreeCaveBoundaryState = () => {
    const root = window.__coastlineRegionRoot;
    const colliders = root?.userData?.coastlineColliders || [];
    return {
      legacyVisuals: ['coastline-waterfront-cave-entrance-glb','coastline-waterfront-cave-mountain','coastline-waterfront-cave-approach-path'].filter(name => Boolean(root?.getObjectByName(name))),
      legacyColliders: colliders.filter(c => /^(coastline-waterfront-cave-|coastline-electric-lemonade-cave-|coastline-three-cave-divider-)/.test(String(c?.name || ''))).map(c => c.name),
      stoneTraceColliders: colliders.filter(c => /^coastline-three-cave-(left|center|right)-/.test(String(c?.name || ''))).map(c => ({ name: c.name, x: c.x, z: c.z, w: c.w, d: c.d })),
      openingsClear: COASTLINE_THREE_CAVE_ENTRANCES.every(cave => !colliders.some(c => Math.abs(cave.x - c.x) <= (c.w || 0) / 2 + .35 && Math.abs(cave.z - c.z) <= (c.d || 0) / 2 + .35)),
      activeCollisionArrayMatchesRoot: window.__coastlineActiveWorldColliders === colliders,
      replacementLoaded: Boolean(root?.userData?.coastlineReplacementCaveLoaded),
      activeCaveId: window.__coastlineActiveCaveId || null,
    };
  };
  let installed = false;
  const install = () => { const manager = window.__coastlineTransitionManager; if (!manager) return false; if (!installed) installed = registerCaveTransitions(manager); return installed; };
  const timer = window.setInterval(() => { install(); maintain(); }, 100);
  window.addEventListener('beforeunload', () => clearInterval(timer), { once: true });
}
