export const COASTLINE_THREE_CAVE_ENTRANCES = Object.freeze([
  Object.freeze({ id: 'left', world: 'waterfront', x: 510, z: 542.5, radius: 2.0, interior: 'cavern-left', entry: 'waterfront-to-electric-dungeon-left', returnTransition: 'electric-dungeon-left-to-waterfront' }),
  Object.freeze({ id: 'center', world: 'waterfront', x: 520, z: 542.5, radius: 2.0, interior: 'rocket-boots', entry: 'waterfront-to-electric-dungeon', returnTransition: 'electric-dungeon-to-waterfront' }),
  Object.freeze({ id: 'right', world: 'waterfront', x: 530, z: 542.5, radius: 2.0, interior: 'cavern-right', entry: 'waterfront-to-electric-dungeon-right', returnTransition: 'electric-dungeon-right-to-waterfront' }),
]);

const CAVE_INTERIOR_SPAWNS = Object.freeze({
  left: Object.freeze({ x: 510, y: 0, z: 552, rotationY: Math.PI }),
  center: Object.freeze({ x: 520, y: 0, z: 552, rotationY: Math.PI }),
  right: Object.freeze({ x: 530, y: 0, z: 552, rotationY: Math.PI }),
});

const CAVE_EXIT_POINTS = Object.freeze({
  left: Object.freeze({ x: 510, z: 577, radius: 2.25 }),
  center: Object.freeze({ x: 520, z: 577, radius: 2.25 }),
  right: Object.freeze({ x: 530, z: 577, radius: 2.25 }),
});

export const COASTLINE_THREE_CAVE_TRANSITIONS = Object.freeze(
  COASTLINE_THREE_CAVE_ENTRANCES.map(cave => Object.freeze({
    cave: cave.id,
    entry: cave.entry,
    returnTransition: cave.returnTransition,
    toWorld: 'electric-lemonade-dungeon',
  }))
);

export function getCoastlineThreeCaveAt(x, z) {
  if (![x, z].every(Number.isFinite)) return null;
  return COASTLINE_THREE_CAVE_ENTRANCES.find(cave => Math.hypot(x - cave.x, z - cave.z) <= cave.radius) ?? null;
}

function getCaveAtPoint(points, x, z) {
  return Object.entries(points).find(([, point]) => Math.hypot(x - point.x, z - point.z) <= point.radius)?.[0] ?? null;
}

function removeLegacyCaveNodes(root) {
  if (!root?.traverse) return 0;
  const doomed = [];
  root.traverse(object => {
    const name = String(object.name || '');
    // Remove only the old single-cave asset and old procedural rock dressing.
    // The cave-mouth group is a shared anchor: the approved three-cave GLB is
    // parented beneath it, so the anchor must remain in the scene.
    if (
      name === 'coastline-waterfront-cave-entrance-glb' ||
      name === 'coastline-waterfront-cave-mountain' ||
      name === 'coastline-waterfront-cave-approach-path' ||
      name === 'coastline-waterfront-cave-rubble' ||
      name === 'coastline-waterfront-cave-coastal-plants' ||
      name === 'coastline-electric-lemonade-cave-dark-opening'
    ) doomed.push(object);
  });
  for (const object of doomed) {
    if (object.parent) object.parent.remove(object);
  }
  return doomed.length;
}

function removeLegacyCaveColliders(root) {
  const colliders = root?.userData?.coastlineColliders;
  if (!Array.isArray(colliders)) return 0;
  const legacyNames = new Set([
    'coastline-waterfront-cave-rear-wall',
    'coastline-waterfront-cave-left-portal-jamb',
    'coastline-waterfront-cave-right-portal-jamb',
    'coastline-electric-lemonade-cave-left-rock',
    'coastline-electric-lemonade-cave-right-rock',
  ]);
  const before = colliders.length;
  root.userData.coastlineColliders = colliders.filter(collider => {
    const name = String(collider?.name || '');
    return !legacyNames.has(name) && !name.startsWith('coastline-waterfront-cave-mountain-');
  });
  return before - root.userData.coastlineColliders.length;
}

function addStoneTraceColliders(root) {
  if (!root) return;
  const colliders = root.userData.coastlineColliders || (root.userData.coastlineColliders = []);
  for (const cave of COASTLINE_THREE_CAVE_ENTRANCES) {
    const prefix = `coastline-three-cave-${cave.id}`;
    if (colliders.some(collider => collider?.name === `${prefix}-left`)) continue;
    // Tight stone-following collision: side/rear segments hug each cave footprint,
    // while the front remains open for the authored doorway/CTM trigger.
    colliders.push(
      { name: `${prefix}-left`, x: cave.x - 4.1, z: cave.z + 3.1, w: 1.2, d: 8.0 },
      { name: `${prefix}-right`, x: cave.x + 4.1, z: cave.z + 3.1, w: 1.2, d: 8.0 },
      { name: `${prefix}-rear`, x: cave.x, z: cave.z + 7.0, w: 8.4, d: 1.4 },
      { name: `${prefix}-front-left`, x: cave.x - 2.8, z: cave.z - 0.3, w: 1.2, d: 2.2 },
      { name: `${prefix}-front-right`, x: cave.x + 2.8, z: cave.z - 0.3, w: 1.2, d: 2.2 },
    );
  }
  root.userData.coastlineThreeCaveBoundaryContract = COASTLINE_THREE_CAVE_ENTRANCES.map(cave => ({ id: cave.id, x: cave.x, z: cave.z, radius: cave.radius }));
}

function buildSideCaverns(root, THREE) {
  if (!root || !THREE) return;
  if (root.getObjectByName('coastline-three-cave-interiors')) return;
  const group = new THREE.Group();
  group.name = 'coastline-three-cave-interiors';
  group.userData.coastlineThreeCaveInterior = true;

  const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x17191b, roughness: 1 });
  const rockMaterial = new THREE.MeshStandardMaterial({ color: 0x25282a, roughness: 1 });
  const accentMaterial = new THREE.MeshStandardMaterial({ color: 0x394047, roughness: 0.98 });

  for (const cave of COASTLINE_THREE_CAVE_ENTRANCES.filter(entry => entry.id !== 'center')) {
    const chamber = new THREE.Group();
    chamber.name = `coastline-three-cave-interior-${cave.id}`;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(8, 38), floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(cave.x, 0, 558);
    floor.receiveShadow = true;
    chamber.add(floor);

    for (const side of [-1, 1]) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(1.2, 5.0, 32), rockMaterial);
      wall.position.set(cave.x + side * 4.3, 2.5, 558);
      wall.castShadow = true;
      wall.receiveShadow = true;
      chamber.add(wall);
    }
    const rear = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 4.9, 3.5, 12, 1, true), accentMaterial);
    rear.rotation.x = Math.PI / 2;
    rear.position.set(cave.x, 2.0, 574);
    rear.castShadow = true;
    chamber.add(rear);
    group.add(chamber);
  }
  root.add(group);
}

function setPlayerSpawn(caveId) {
  const player = window.__coastlinePlayer;
  const spawn = CAVE_INTERIOR_SPAWNS[caveId];
  if (!player || !spawn) return;
  player.mode = 'walk';
  player.sitting = false;
  player.x = spawn.x;
  player.z = spawn.z;
  player.heading = spawn.rotationY;
  if (Number.isFinite(window.__coastlineElectricDungeonFloorY)) player.y = window.__coastlineElectricDungeonFloorY;
}

function setWaterfrontSpawn(caveId) {
  const player = window.__coastlinePlayer;
  const cave = COASTLINE_THREE_CAVE_ENTRANCES.find(entry => entry.id === caveId);
  if (!player || !cave) return;
  player.mode = 'walk';
  player.sitting = false;
  player.x = cave.x;
  player.z = cave.z;
  player.heading = Math.PI;
}

function registerCaveTransitions(manager) {
  if (!manager?.getWorldDefinition?.('electric-lemonade-dungeon') || !manager.getWorldDefinition?.('waterfront')) return false;
  const register = definition => {
    try { manager.registerTransition(definition); } catch (error) {
      if (!/already registered/i.test(String(error?.message || error))) throw error;
    }
  };

  register({
    id: 'waterfront-to-electric-dungeon-left',
    fromWorld: 'waterfront',
    toWorld: 'electric-lemonade-dungeon',
    trigger: 'cave',
    destinationSpawn: CAVE_INTERIOR_SPAWNS.left,
    returnPoint: { x: 510, y: 0, z: 542.5, rotationY: Math.PI },
    vehiclePolicy: 'forbidden',
  });
  register({
    id: 'waterfront-to-electric-dungeon-right',
    fromWorld: 'waterfront',
    toWorld: 'electric-lemonade-dungeon',
    trigger: 'cave',
    destinationSpawn: CAVE_INTERIOR_SPAWNS.right,
    returnPoint: { x: 530, y: 0, z: 542.5, rotationY: Math.PI },
    vehiclePolicy: 'forbidden',
  });
  register({
    id: 'electric-dungeon-left-to-waterfront',
    fromWorld: 'electric-lemonade-dungeon',
    toWorld: 'waterfront',
    trigger: 'cave',
    destinationSpawn: { x: 510, y: 0, z: 542.5, rotationY: Math.PI },
    vehiclePolicy: 'forbidden',
  });
  register({
    id: 'electric-dungeon-right-to-waterfront',
    fromWorld: 'electric-lemonade-dungeon',
    toWorld: 'waterfront',
    trigger: 'cave',
    destinationSpawn: { x: 530, y: 0, z: 542.5, rotationY: Math.PI },
    vehiclePolicy: 'forbidden',
  });
  return true;
}

function wrapInteraction() {
  const api = window.__coastlineElectricLemonade;
  if (!api || api.__threeCaveWrapped) return false;
  const originalCanUse = api.canUse?.bind(api);
  const originalInteract = api.interact?.bind(api);
  if (typeof originalCanUse !== 'function' || typeof originalInteract !== 'function') return false;

  api.canUse = () => {
    const player = window.__coastlinePlayer;
    const world = window.__coastlineActiveWorldId;
    if (player && world === 'waterfront' && player.mode === 'walk' && getCoastlineThreeCaveAt(player.x, player.z)) return true;
    if (player && world === 'electric-lemonade-dungeon' && player.mode === 'walk' && getCaveAtPoint(CAVE_EXIT_POINTS, player.x, player.z)) return true;
    return originalCanUse();
  };

  api.interact = async () => {
    const player = window.__coastlinePlayer;
    const world = window.__coastlineActiveWorldId;
    if (!player || player.mode !== 'walk') return originalInteract();

    if (world === 'waterfront') {
      const cave = getCoastlineThreeCaveAt(player.x, player.z);
      if (cave?.id === 'left' || cave?.id === 'right') {
        await window.__coastlineTransitionTest.transition(cave.entry);
        setPlayerSpawn(cave.id);
        buildSideCaverns(window.__coastlineActiveWorldRoot || window.__coastlineRegionRoot, window.__coastlineThree);
        return true;
      }
      if (cave?.id === 'center') return originalInteract();
    }

    if (world === 'electric-lemonade-dungeon') {
      const caveId = getCaveAtPoint(CAVE_EXIT_POINTS, player.x, player.z);
      if (caveId === 'left' || caveId === 'right') {
        await window.__coastlineTransitionTest.transition(`electric-dungeon-${caveId}-to-waterfront`);
        setWaterfrontSpawn(caveId);
        return true;
      }
    }
    return originalInteract();
  };
  api.__threeCaveWrapped = true;
  return true;
}

function install() {
  if (window.__coastlineThreeCaveSystemInstalled) return true;
  const manager = window.__coastlineTransitionManager;
  const scene = window.__coastlineHooks?.scene;
  const root = window.__coastlineRegionRoot;
  const THREE = window.__coastlineThree;
  if (!manager || !scene || !THREE) return false;
  if (!manager.getWorldDefinition?.('electric-lemonade-dungeon')) return false;

  if (root && window.__coastlineActiveWorldId === 'waterfront') {
    removeLegacyCaveNodes(root);
    removeLegacyCaveColliders(root);
    addStoneTraceColliders(root);
  }
  registerCaveTransitions(manager);
  wrapInteraction();
  window.__coastlineThreeCaveSystemInstalled = true;
  window.__coastlineThreeCaveContract = {
    entrances: COASTLINE_THREE_CAVE_ENTRANCES,
    transitions: COASTLINE_THREE_CAVE_TRANSITIONS,
    boundaryContract: root?.userData?.coastlineThreeCaveBoundaryContract ?? [],
  };
  return true;
}

function maintain() {
  const root = window.__coastlineRegionRoot;
  if (window.__coastlineActiveWorldId === 'waterfront' && root) {
    removeLegacyCaveNodes(root);
    removeLegacyCaveColliders(root);
    addStoneTraceColliders(root);
  }
  if (window.__coastlineActiveWorldId === 'electric-lemonade-dungeon') {
    const dungeonRoot = window.__coastlineActiveWorldRoot || window.__coastlineRegionRoot;
    buildSideCaverns(dungeonRoot, window.__coastlineThree);
  }
  wrapInteraction();
  install();
}

if (typeof window !== 'undefined') {
  const timer = window.setInterval(maintain, 200);
  window.addEventListener('beforeunload', () => window.clearInterval(timer), { once: true });
}
