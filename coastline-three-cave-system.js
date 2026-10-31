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
    if (
      name === 'coastline-waterfront-cave-entrance-glb' ||
      name === 'coastline-waterfront-cave-mountain' ||
      name.startsWith('coastline-waterfront-cave-mountain-') ||
      name === 'coastline-waterfront-cave-approach-path' ||
      name === 'coastline-waterfront-cave-rubble' ||
      name === 'coastline-waterfront-cave-coastal-plants' ||
      name === 'coastline-electric-lemonade-cave-dark-opening'
    ) doomed.push(object);
  });
  for (const object of doomed) if (object.parent) object.parent.remove(object);
  return doomed.length;
}

function removeLegacyCaveColliders(root) {
  const colliders = root?.userData?.coastlineColliders;
  if (!Array.isArray(colliders)) return 0;
  const filtered = colliders.filter(collider => {
    const name = String(collider?.name || '');
    return !name.startsWith('coastline-waterfront-cave-') &&
      !name.startsWith('coastline-electric-lemonade-cave-');
  });
  const removed = colliders.length - filtered.length;
  if (removed) root.userData.coastlineColliders = filtered;
  return removed;
}

// These short segments trace the stone shoulders and rear edge of each arch.
// The front-center opening is deliberately left clear for the threshold.
function addStoneTraceColliders(root) {
  if (!root) return;
  const colliders = root.userData.coastlineColliders || (root.userData.coastlineColliders = []);
  for (const cave of COASTLINE_THREE_CAVE_ENTRANCES) {
    const prefix = `coastline-three-cave-${cave.id}`;
    if (colliders.some(collider => collider?.name === `${prefix}-left-wall`)) continue;
    colliders.push(
      { name: `${prefix}-left-wall`, x: cave.x - 3.15, z: cave.z + 2.65, w: 0.72, d: 7.1 },
      { name: `${prefix}-right-wall`, x: cave.x + 3.15, z: cave.z + 2.65, w: 0.72, d: 7.1 },
      { name: `${prefix}-rear-left`, x: cave.x - 1.85, z: cave.z + 6.15, w: 3.0, d: 0.72 },
      { name: `${prefix}-rear-right`, x: cave.x + 1.85, z: cave.z + 6.15, w: 3.0, d: 0.72 },
      { name: `${prefix}-front-left-jamb`, x: cave.x - 2.65, z: cave.z - 0.55, w: 0.9, d: 1.15 },
      { name: `${prefix}-front-right-jamb`, x: cave.x + 2.65, z: cave.z - 0.55, w: 0.9, d: 1.15 },
    );
  }
  root.userData.coastlineThreeCaveBoundaryContract = COASTLINE_THREE_CAVE_ENTRANCES.map(cave => ({
    id: cave.id, x: cave.x, z: cave.z, radius: cave.radius,
  }));
}

function buildSideCaverns(root, THREE) {
  if (!root || !THREE || root.getObjectByName('coastline-three-cave-interiors')) return;
  const group = new THREE.Group();
  group.name = 'coastline-three-cave-interiors';
  group.userData.coastlineThreeCaveInterior = true;

  const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x252522, roughness: 1 });
  const rockMaterials = [
    new THREE.MeshStandardMaterial({ color: 0x343632, roughness: 1 }),
    new THREE.MeshStandardMaterial({ color: 0x45463f, roughness: 1 }),
    new THREE.MeshStandardMaterial({ color: 0x292d2b, roughness: 1 }),
    new THREE.MeshStandardMaterial({ color: 0x555248, roughness: 1 }),
  ];
  const rockGeometry = new THREE.DodecahedronGeometry(1, 1);

  for (const cave of COASTLINE_THREE_CAVE_ENTRANCES.filter(entry => entry.id !== 'center')) {
    const chamber = new THREE.Group();
    chamber.name = `coastline-three-cave-interior-${cave.id}`;

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(8.2, 38), floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(cave.x, 0, 558);
    floor.receiveShadow = true;
    chamber.add(floor);

    // Irregular overlapping stone masses form the side walls rather than box walls.
    for (let i = 0; i < 11; i++) {
      const z = 542.5 + i * 3.05;
      for (const side of [-1, 1]) {
        const rock = new THREE.Mesh(rockGeometry, rockMaterials[(i + (side > 0 ? 1 : 0)) % rockMaterials.length]);
        rock.position.set(cave.x + side * (3.55 + Math.sin(i * 1.7) * 0.28), 1.35 + (i % 3) * 0.22, z);
        rock.scale.set(1.0 + (i % 3) * 0.18, 1.65 + (i % 4) * 0.24, 1.55 + (i % 2) * 0.35);
        rock.rotation.set(i * 0.13, i * 0.31, side * (0.08 + (i % 3) * 0.035));
        rock.castShadow = true;
        rock.receiveShadow = true;
        chamber.add(rock);
      }
    }

    // A broken, uneven ceiling leaves a walkable central tunnel.
    for (let i = 0; i < 9; i++) {
      const roof = new THREE.Mesh(rockGeometry, rockMaterials[(i + 2) % rockMaterials.length]);
      roof.position.set(cave.x + Math.sin(i * 1.3) * 0.8, 4.25 + Math.cos(i * 1.8) * 0.32, 544 + i * 3.55);
      roof.scale.set(1.55 + (i % 3) * 0.24, 0.85 + (i % 2) * 0.22, 2.0 + (i % 4) * 0.28);
      roof.rotation.set(0.12 + i * 0.025, i * 0.27, 0.08 - i * 0.02);
      roof.castShadow = true;
      roof.receiveShadow = true;
      chamber.add(roof);
    }

    // Stalagmites and hanging points make the chamber read as eroded natural rock.
    for (let i = 0; i < 8; i++) {
      const side = i % 2 ? 1 : -1;
      const z = 547 + i * 3.55;
      const stalagmite = new THREE.Mesh(
        new THREE.ConeGeometry(0.32 + (i % 3) * 0.12, 1.1 + (i % 4) * 0.32, 6),
        rockMaterials[(i + 1) % rockMaterials.length],
      );
      stalagmite.position.set(cave.x + side * (2.65 + (i % 2) * 0.25), 0.55 + (i % 3) * 0.12, z);
      stalagmite.rotation.z = side * 0.12;
      stalagmite.castShadow = true;
      chamber.add(stalagmite);

      const stalactite = new THREE.Mesh(
        new THREE.ConeGeometry(0.26 + (i % 2) * 0.1, 0.9 + (i % 3) * 0.28, 6),
        rockMaterials[(i + 2) % rockMaterials.length],
      );
      stalactite.position.set(cave.x - side * (2.5 + (i % 2) * 0.2), 4.05, z + 1.3);
      stalactite.rotation.z = Math.PI + side * 0.1;
      stalactite.castShadow = true;
      chamber.add(stalactite);
    }
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
  player.z = cave.z - 5;
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
    destinationSpawn: { x: 510, y: 0, z: 537.5, rotationY: Math.PI },
    vehiclePolicy: 'forbidden',
  });
  register({
    id: 'electric-dungeon-right-to-waterfront',
    fromWorld: 'electric-lemonade-dungeon',
    toWorld: 'waterfront',
    trigger: 'cave',
    destinationSpawn: { x: 530, y: 0, z: 537.5, rotationY: Math.PI },
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
    if (player && world === 'waterfront' && getCoastlineThreeCaveAt(player.x, player.z)) return false;
    if (player && world === 'electric-lemonade-dungeon' && getCaveAtPoint(CAVE_EXIT_POINTS, player.x, player.z)) return false;
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

let transitionPending = false;
async function updateThresholdTransitions() {
  if (transitionPending) return;
  const player = window.__coastlinePlayer;
  const manager = window.__coastlineTransitionManager;
  const api = window.__coastlineElectricLemonade;
  const world = manager?.getActiveWorldId?.() || window.__coastlineActiveWorldId;
  if (!player || player.mode !== 'walk' || player.sitting || !api?.interact) return;

  const atEntry = world === 'waterfront' && getCoastlineThreeCaveAt(player.x, player.z);
  const atExit = world === 'electric-lemonade-dungeon' && getCaveAtPoint(CAVE_EXIT_POINTS, player.x, player.z);
  if (!atEntry && !atExit) return;

  transitionPending = true;
  try {
    await api.interact();
  } catch (error) {
    console.warn('[Coastline] Cave threshold transition failed:', error);
  } finally {
    window.setTimeout(() => { transitionPending = false; }, 450);
  }
}

function install() {
  if (window.__coastlineThreeCaveSystemInstalled) return true;
  const manager = window.__coastlineTransitionManager;
  const scene = window.__coastlineHooks?.scene;
  const THREE = window.__coastlineThree;
  if (!manager || !scene || !THREE || !manager.getWorldDefinition?.('electric-lemonade-dungeon')) return false;
  registerCaveTransitions(manager);
  wrapInteraction();
  window.__coastlineThreeCaveSystemInstalled = true;
  window.__coastlineThreeCaveContract = {
    entrances: COASTLINE_THREE_CAVE_ENTRANCES,
    transitions: COASTLINE_THREE_CAVE_TRANSITIONS,
  };
  return true;
}

function maintain() {
  const root = window.__coastlineRegionRoot;
  if (window.__coastlineActiveWorldId === 'waterfront' && root) {
    removeLegacyCaveNodes(root);
    removeLegacyCaveColliders(root);
    addStoneTraceColliders(root);
    if (window.__coastlineActiveWorldRoot === root) {
      window.__coastlineActiveWorldColliders = root.userData?.coastlineColliders || [];
    }
    if (!root.userData?.coastlineReplacementCaveLoaded && !root.userData?.coastlineReplacementCaveLoading) {
      window.__coastlineEnsureReplacementCave?.(root);
    }
  }
  if (window.__coastlineActiveWorldId === 'electric-lemonade-dungeon') {
    const dungeonRoot = window.__coastlineActiveWorldRoot || window.__coastlineRegionRoot;
    buildSideCaverns(dungeonRoot, window.__coastlineThree);
  }
  wrapInteraction();
  install();
  updateThresholdTransitions();
}

if (typeof window !== 'undefined') {
  window.__coastlineThreeCaveSystemUpdate = updateThresholdTransitions;
  window.__coastlineThreeCaveBoundaryState = () => {
    const root = window.__coastlineRegionRoot;
    const colliders = root?.userData?.coastlineColliders || [];
    return {
      legacyVisuals: ['coastline-waterfront-cave-entrance-glb','coastline-waterfront-cave-mountain','coastline-waterfront-cave-approach-path']
        .filter(name => Boolean(root?.getObjectByName(name))),
      legacyColliders: colliders.filter(c => /^(coastline-waterfront-cave-|coastline-electric-lemonade-cave-)/.test(String(c?.name || ''))).map(c => c.name),
      stoneTraceColliders: colliders.filter(c => String(c?.name || '').startsWith('coastline-three-cave-')).map(c => ({ name: c.name, x: c.x, z: c.z, w: c.w, d: c.d })),
      replacementLoaded: Boolean(root?.userData?.coastlineReplacementCaveLoaded),
    };
  };
  const timer = window.setInterval(maintain, 100);
  window.addEventListener('beforeunload', () => window.clearInterval(timer), { once: true });
}
