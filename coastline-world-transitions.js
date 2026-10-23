import { createTransitionManager } from './transition-manager.js';

export function createWorldRootRegistry({ THREE, scene }) {
  const originalAdd = scene.add.bind(scene);
  const originalRemove = scene.remove.bind(scene);
  const cityRoot = new THREE.Group();
  cityRoot.name = 'coastline-city-root';
  originalAdd(cityRoot);
  scene.add = function (...objects) {
    for (const object of objects) {
      if (!object) continue;
      if (object === cityRoot || object.isCamera || object.userData?.coastlineGlobal || object.isAmbientLight || object.isHemisphereLight || object.isDirectionalLight) originalAdd(object);
      else cityRoot.add(object);
    }
    return this;
  };
  scene.remove = function (...objects) {
    for (const object of objects) {
      if (!object) continue;
      if (object.parent === cityRoot) cityRoot.remove(object);
      else originalRemove(object);
    }
    return this;
  };
  return { world1Root: cityRoot, cityRoot, addWorldRoot: root => (originalAdd(root), root), removeWorldRoot: root => originalRemove(root) };
}

const finiteOr = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;
const disposeRoot = root => root?.traverse(object => {
  object.geometry?.dispose?.();
  const materials = Array.isArray(object.material) ? object.material : object.material ? [object.material] : [];
  for (const material of materials) material.dispose?.();
});

function addBridge(THREE, root, { x, startZ, y, length = 100 }) {
  const group = new THREE.Group();
  group.name = 'coastline-bridge';
  const centerZ = startZ - length * 0.5;
  const deckMaterial = new THREE.MeshStandardMaterial({ color: 0x343c3d, roughness: 0.88 });
  const railMaterial = new THREE.MeshStandardMaterial({ color: 0x9cc9bd, roughness: 0.72, metalness: 0.04 });
  const towerMaterial = new THREE.MeshStandardMaterial({ color: 0x66777a, roughness: 0.66, metalness: 0.25 });
  const deck = new THREE.Mesh(new THREE.BoxGeometry(16, 0.28, length), deckMaterial);
  deck.position.set(x, y + 0.08, centerZ); deck.receiveShadow = true; deck.castShadow = true; group.add(deck);
  for (const side of [-1, 1]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.15, length), railMaterial); rail.position.set(x + side * 8, y + 0.66, centerZ); rail.castShadow = true; group.add(rail); }
  for (const dz of [-length * 0.38, length * 0.38]) for (const side of [-1, 1]) { const tower = new THREE.Mesh(new THREE.BoxGeometry(0.7, 6.2, 0.7), towerMaterial); tower.position.set(x + side * 7.2, y + 3.05, centerZ + dz); tower.castShadow = true; group.add(tower); }
  const cableMaterial = new THREE.LineBasicMaterial({ color: 0xb9d5d5 });
  for (const side of [-1, 1]) { const points = []; for (let i = 0; i <= 16; i++) { const t = i / 16, z = startZ - length * t, sag = Math.sin(Math.PI * t) * 3.8; points.push(new THREE.Vector3(x + side * 7.2, y + 6 - sag, z)); } group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), cableMaterial)); }
  root.add(group);
  return group;
}

function createRoundedSquareShape(THREE, halfExtent = 110, cornerRadius = 20) {
  const edge = halfExtent, inner = edge - cornerRadius, shape = new THREE.Shape();
  shape.moveTo(-inner, -edge); shape.lineTo(inner, -edge); shape.quadraticCurveTo(edge, -edge, edge, -inner); shape.lineTo(edge, inner); shape.quadraticCurveTo(edge, edge, inner, edge); shape.lineTo(-inner, edge); shape.quadraticCurveTo(-edge, edge, -edge, inner); shape.lineTo(-edge, -inner); shape.quadraticCurveTo(-edge, -edge, -inner, -edge);
  return shape;
}

export function createCoastlineWorldTransitions({ THREE, scene, roots, player, vehicles, avatar, groundY }) {
  const ISLAND_CENTER = Object.freeze({ x: 500, z: 500 });
  const ISLAND_BOUNDS = Object.freeze({ minX: 390, maxX: 610, minZ: 390, maxZ: 610, width: 220, depth: 220 });
  const BRIDGE_LENGTH = 100;
  const ISLAND_BRIDGE_START_Z = ISLAND_BOUNDS.minZ;
  const ISLAND_BRIDGE_END_Z = ISLAND_BRIDGE_START_Z - BRIDGE_LENGTH;
  const CITY_MAP_EDGE_Z = -550;
  const CITY_BRIDGE_START_Z = CITY_MAP_EDGE_Z;
  const CITY_BRIDGE_END_Z = CITY_BRIDGE_START_Z - BRIDGE_LENGTH;
  const ISLAND_START = Object.freeze({ x: 500, y: finiteOr(groundY(500, 420)), z: 420, rotationY: Math.PI });
  const ISLAND_APPROACH = Object.freeze({ x: 500, z: ISLAND_BRIDGE_END_Z + 5, rotationY: Math.PI });
  const CITY_APPROACH = Object.freeze({ x: 0, z: CITY_BRIDGE_END_Z - 5, rotationY: Math.PI });
  let pendingIslandRoot = null, failNextIslandLoad = false, updatePromptCallback = () => {}, autoTransitionPromise = null;
  const setIslandCollisionScope = active => { window.__coastlineWorld2Active = Boolean(active); };
  const manager = createTransitionManager({ onEvent: event => window.dispatchEvent(new CustomEvent(`coastline:${event.type}`, { detail: event })) });
  const capturePlayer = () => ({ mode: player.mode, position: { x: finiteOr(player.x), y: finiteOr(player.y), z: finiteOr(player.z) }, rotationY: finiteOr(player.heading), vehicleIndex: player.mode === 'vehicle' ? vehicles.indexOf(player.vehicle) : -1 });
  const captureVehicle = () => { if (player.mode !== 'vehicle' || !player.vehicle) return null; const vehicle = player.vehicle; return { id: String(vehicle.worldEntityId ?? vehicle.kind ?? 'active-vehicle'), position: { x: finiteOr(vehicle.x, player.x), y: finiteOr(vehicle.g?.position?.y), z: finiteOr(vehicle.z, player.z) }, rotationY: finiteOr(vehicle.heading, player.heading), heading: finiteOr(vehicle.heading, player.heading), speed: finiteOr(vehicle.speed) }; };
  const makeContext = () => ({ player: capturePlayer(), vehicle: captureVehicle(), vehicleIndex: player.mode === 'vehicle' ? vehicles.indexOf(player.vehicle) : -1 });
  const activeActor = () => player.mode === 'vehicle' && player.vehicle?.g ? player.vehicle.g : avatar;
  const hierarchySignature = root => { if (!root) return null; let descendants = 0, meshes = 0, visibleMeshes = 0; root.traverse(node => { descendants += 1; if (node.isMesh) { meshes += 1; if (node.visible !== false) visibleMeshes += 1; } }); return { name: String(root.name || 'unnamed'), descendants, meshes, visibleMeshes }; };
  const visualIdentity = () => ({ vehicle: player.vehicle ? { id: String(player.vehicle.worldEntityId ?? player.vehicle.kind ?? 'active-vehicle'), kind: String(player.vehicle.kind ?? ''), hierarchy: hierarchySignature(player.vehicle.g) } : null, hero: hierarchySignature(avatar) });
  const makeVehicleRenderable = vehicle => { if (!vehicle?.g) return; vehicle.g.visible = true; vehicle.g.traverse(node => { node.visible = true; node.userData.coastlineAlwaysVisible = true; }); };
  const moveActiveActor = root => { const actor = activeActor(); if (actor && actor.parent !== root) root.add(actor); if (player.vehicle) makeVehicleRenderable(player.vehicle); };
  const applySnapshot = (snapshot, root, spawn = null) => {
    if (!snapshot) return; const state = snapshot.player ? snapshot : { player: snapshot }, playerState = state.player || {}, position = playerState.position || {};
    player.mode = playerState.mode || player.mode; player.x = finiteOr(position.x, player.x); player.y = finiteOr(position.y, 0); player.z = finiteOr(position.z, player.z); player.heading = finiteOr(playerState.rotationY, player.heading);
    if (Number.isInteger(state.vehicleIndex) && state.vehicleIndex >= 0 && vehicles[state.vehicleIndex]) player.vehicle = vehicles[state.vehicleIndex];
    const vehicle = player.vehicle;
    if (vehicle && state.vehicle && (player.mode === 'vehicle' || state.vehicleIndex >= 0)) { const vehicleState = state.vehicle; vehicle.x = finiteOr(vehicleState.position?.x, player.x); vehicle.z = finiteOr(vehicleState.position?.z, player.z); vehicle.heading = finiteOr(vehicleState.heading, finiteOr(vehicleState.rotationY, player.heading)); vehicle.speed = finiteOr(vehicleState.speed); if (vehicle.g) { vehicle.g.position.set(vehicle.x, finiteOr(vehicleState.position?.y, groundY(vehicle.x, vehicle.z)), vehicle.z); vehicle.g.rotation.y = vehicle.heading; if (vehicle.g.parent !== root) root.add(vehicle.g); makeVehicleRenderable(vehicle); } } else if (avatar && avatar.parent !== root) root.add(avatar);
    if (spawn) { const x = finiteOr(spawn.x, player.x), z = finiteOr(spawn.z, player.z), y = finiteOr(spawn.y, groundY(x, z)); player.x = x; player.y = y; player.z = z; player.heading = finiteOr(spawn.rotationY, player.heading); if (player.mode === 'vehicle' && player.vehicle) { const currentVehicle = player.vehicle; currentVehicle.x = x; currentVehicle.z = z; currentVehicle.heading = player.heading; currentVehicle.speed = 0; if (currentVehicle.g) { currentVehicle.g.position.set(x, y, z); currentVehicle.g.rotation.y = player.heading; if (currentVehicle.g.parent !== root) root.add(currentVehicle.g); makeVehicleRenderable(currentVehicle); } } else if (avatar) { avatar.position.set(x, y, z); avatar.rotation.y = player.heading; if (avatar.parent !== root) root.add(avatar); } } else if (player.mode !== 'vehicle' && avatar) { avatar.position.set(player.x, groundY(player.x, player.z), player.z); avatar.rotation.y = player.heading; if (avatar.parent !== root) root.add(avatar); }
  };
  const createNakedIslandRoot = () => {
    const root = new THREE.Group(); root.name = 'coastline-island-start-root'; const x = ISLAND_CENTER.x, z = ISLAND_CENTER.z, y = finiteOr(groundY(x, z));
    const landMaterial = new THREE.MeshStandardMaterial({ color: 0x55785b, roughness: 0.96 }), shoreMaterial = new THREE.MeshStandardMaterial({ color: 0x9cc9bd, roughness: 0.72, metalness: 0.04 }), roadMaterial = new THREE.MeshStandardMaterial({ color: 0x343c3d, roughness: 0.9 });
    const shape = createRoundedSquareShape(THREE, 110, 20); const land = new THREE.Mesh(new THREE.ShapeGeometry(shape, 4), landMaterial); land.rotation.x = -Math.PI / 2; land.position.set(x, y - 0.18, z); land.receiveShadow = true; root.add(land);
    const shoreline = new THREE.Mesh(new THREE.ShapeGeometry(shape, 4), shoreMaterial); shoreline.rotation.x = -Math.PI / 2; shoreline.scale.setScalar(1.025); shoreline.position.set(x, y - 0.04, z); root.add(shoreline);
    const road = new THREE.Mesh(new THREE.BoxGeometry(16, 0.16, 55), roadMaterial); road.position.set(x, y + 0.02, z - 82.5); road.receiveShadow = true; root.add(road);
    addBridge(THREE, root, { x, startZ: ISLAND_BRIDGE_START_Z, y, length: BRIDGE_LENGTH });
    return root;
  };
  const addCityBridgeAffordance = () => addBridge(THREE, roots.world1Root, { x: 0, startZ: CITY_BRIDGE_START_Z, y: finiteOr(groundY(0, CITY_BRIDGE_START_Z)), length: BRIDGE_LENGTH });
  const cityWorld = {
    id: 'city', name: 'Coastline City',
    load: async ({ reason }) => { setIslandCollisionScope(false); roots.world1Root.visible = reason === 'initial-activation' || roots.world1Root.visible; return { id: 'city', root: roots.world1Root }; },
    unload: async handle => { handle.root.visible = false; },
    captureState: async ({ context }) => ({ player: context.player, vehicle: context.vehicle, vehicleIndex: context.vehicleIndex }),
    restoreState: async (worldState, { handle, destinationSpawn }) => { setIslandCollisionScope(false); handle.root.visible = true; applySnapshot(worldState, handle.root, destinationSpawn); },
  };
  const islandWorld = {
    id: 'island', name: 'Coastline Island Start',
    load: async ({ context, destinationSpawn }) => { setIslandCollisionScope(true); pendingIslandRoot = createNakedIslandRoot(); roots.addWorldRoot(pendingIslandRoot); pendingIslandRoot.visible = true; moveActiveActor(pendingIslandRoot); applySnapshot({ player: context.player, vehicle: context.vehicle, vehicleIndex: context.vehicleIndex }, pendingIslandRoot, destinationSpawn || ISLAND_START); if (failNextIslandLoad) { failNextIslandLoad = false; throw new Error('injected island load failure'); } return { id: 'island', root: pendingIslandRoot }; },
    unload: async handle => { setIslandCollisionScope(false); if (handle.root?.parent) roots.removeWorldRoot(handle.root); disposeRoot(handle.root); if (pendingIslandRoot === handle.root) pendingIslandRoot = null; },
    cleanupFailedLoad: async ({ context }) => { setIslandCollisionScope(false); if (!pendingIslandRoot) return; applySnapshot({ player: context.player, vehicle: context.vehicle, vehicleIndex: context.vehicleIndex }, roots.world1Root); roots.world1Root.visible = true; roots.removeWorldRoot(pendingIslandRoot); disposeRoot(pendingIslandRoot); pendingIslandRoot = null; },
    captureState: async ({ context }) => ({ player: context.player, vehicle: context.vehicle, vehicleIndex: context.vehicleIndex }),
    restoreState: async (worldState, { handle }) => { setIslandCollisionScope(true); handle.root.visible = true; moveActiveActor(handle.root); applySnapshot(worldState, handle.root); },
  };
  manager.registerWorld(cityWorld); manager.registerWorld(islandWorld);
  manager.registerTransition({ id: 'city-to-island', fromWorld: 'city', toWorld: 'island', trigger: 'bridge', destinationSpawn: ISLAND_START, vehiclePolicy: 'allowed' });
  manager.registerTransition({ id: 'island-to-city', fromWorld: 'island', toWorld: 'city', trigger: 'bridge', destinationSpawn: { x: 0, y: finiteOr(groundY(0, CITY_BRIDGE_END_Z)), z: CITY_BRIDGE_END_Z, rotationY: 0 }, vehiclePolicy: 'allowed' });
  const transition = async transitionId => { if (autoTransitionPromise) return autoTransitionPromise; autoTransitionPromise = manager.transition(transitionId, makeContext()).finally(() => { autoTransitionPromise = null; }); return autoTransitionPromise; };
  const nearAndFacing = (target, range, heading) => { const dx = target.x - player.x, dz = target.z - player.z, distance = Math.hypot(dx, dz); if (distance > range) return false; const forwardX = Math.sin(heading), forwardZ = Math.cos(heading); return distance < 0.001 || ((dx * forwardX + dz * forwardZ) / distance) > 0.45; };
  const initialize = async () => {
    addCityBridgeAffordance(); roots.world1Root.visible = false; await manager.activate('island', makeContext());
    const button = document.createElement('button'); button.id = 'coastlineWorldTransition'; button.type = 'button'; button.setAttribute('aria-label', 'Cross bridge between Coastline Island and City'); button.style.cssText = 'display:none;position:fixed;left:50%;bottom:170px;transform:translateX(-50%);z-index:1000;pointer-events:auto;border:1px solid #a7f4ff88;border-radius:12px;padding:6px 8px;background:#06202aee;color:#effcff;font:800 12px system-ui,sans-serif;letter-spacing:.08em;box-shadow:0 8px 24px #0008';
    button.addEventListener('click', () => transition(manager.getActiveWorldId() === 'city' ? 'city-to-island' : 'island-to-city').catch(error => { button.textContent = `TRANSITION FAILED: ${error.message}`; })); document.body.appendChild(button);
    updatePromptCallback = () => {
      const activeWorld = manager.getActiveWorldId(), vehicle = player.mode === 'vehicle' ? player.vehicle : null; if (vehicle) makeVehicleRenderable(vehicle); if (!vehicle || manager.getStatus().state !== 'active') { button.style.display = 'none'; return; }
      const target = activeWorld === 'city' ? CITY_APPROACH : ISLAND_APPROACH, transitionId = activeWorld === 'city' ? 'city-to-island' : 'island-to-city';
      if (nearAndFacing(target, 10, player.heading) && !autoTransitionPromise) transition(transitionId).catch(error => { button.textContent = `TRANSITION FAILED: ${error.message}`; });
      const promptTarget = activeWorld === 'city' ? { x: 0, z: CITY_BRIDGE_START_Z } : { x: ISLAND_CENTER.x, z: ISLAND_BRIDGE_START_Z }, promptRange = 24, dx = promptTarget.x - player.x, dz = promptTarget.z - player.z, distance = Math.hypot(dx, dz), forwardX = Math.sin(player.heading), forwardZ = Math.cos(player.heading), dot = distance > 0.001 ? (dx * forwardX + dz * forwardZ) / distance : 1;
      if (distance > promptRange || dot < 0.45) { button.style.display = 'none'; return; } button.textContent = activeWorld === 'city' ? 'CROSS TO ISLAND' : 'CROSS TO CITY'; button.style.display = 'block';
    };
    window.__coastlineTransitionTest = {
      status: () => manager.getStatus(), playerState: () => ({ position: { x: player.x, y: player.y, z: player.z }, heading: player.heading, mode: player.mode, vehicleIndex: vehicles.indexOf(player.vehicle), vehicleSpeed: player.vehicle?.speed ?? 0 }), rootVisibility: () => ({ cityVisible: roots.world1Root.visible, cityCachedInScene: Boolean(roots.world1Root.parent === scene), islandVisible: Boolean(pendingIslandRoot?.visible), islandRootResident: Boolean(pendingIslandRoot?.parent === scene) }), transition, updatePrompt: updatePromptCallback, flushAutoTransition: async () => { if (autoTransitionPromise) await autoTransitionPromise; }, failNextWorld2Load: () => { failNextIslandLoad = true; }, world2Spawn: () => ({ ...ISLAND_START }), bridgeZones: () => ({ cityApproach: { ...CITY_APPROACH }, islandApproach: { ...ISLAND_APPROACH } }),
      cityBridgeContract: () => ({ bridgeLength: BRIDGE_LENGTH, cityMapEdge: CITY_MAP_EDGE_Z, cityEdge: CITY_BRIDGE_START_Z, bridgeEnd: CITY_BRIDGE_END_Z }),
      world2Layout: () => ({ bounds: { ...ISLAND_BOUNDS }, spawn: { ...ISLAND_START }, islandBridge: { x: ISLAND_CENTER.x, z: ISLAND_BRIDGE_START_Z }, spawnToIslandBridge: Math.hypot(ISLAND_START.x - ISLAND_BRIDGE_START_Z, ISLAND_START.z - ISLAND_BRIDGE_START_Z), bridgeLength: BRIDGE_LENGTH, bridgeIslandEdge: ISLAND_BRIDGE_START_Z, bridgeCityEdge: ISLAND_BRIDGE_END_Z, palm: null }),
      visualIdentity, activeVehicleVisible: () => Boolean(player.vehicle?.g && player.vehicle.g.visible && (() => { let hidden = false; player.vehicle.g.traverse(node => { if (node.visible === false) hidden = true; }); return !hidden; })()), collisionScope: () => Boolean(window.__coastlineWorld2Active),
    };
    window.addEventListener('keydown', updatePromptCallback); setInterval(() => updatePromptCallback(), 200); return manager;
  };
  const initializePromise = initialize();
  return { manager, ready: initializePromise, initialize: () => initializePromise, updatePrompt: () => updatePromptCallback(), dispose: async () => { setIslandCollisionScope(false); if (pendingIslandRoot) { roots.removeWorldRoot(pendingIslandRoot); disposeRoot(pendingIslandRoot); pendingIslandRoot = null; } } };
}
