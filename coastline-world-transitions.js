import { createTransitionManager } from './transition-manager.js';

export function createWorldRootRegistry({ THREE, scene }) {
  const originalAdd = scene.add.bind(scene);
  const originalRemove = scene.remove.bind(scene);
  const world1Root = new THREE.Group();
  world1Root.name = 'coastline-world-1-root';
  originalAdd(world1Root);
  scene.add = function (...objects) {
    for (const object of objects) {
      if (!object) continue;
      if (object === world1Root || object.isCamera || object.userData?.coastlineGlobal || object.isAmbientLight || object.isHemisphereLight || object.isDirectionalLight) originalAdd(object);
      else world1Root.add(object);
    }
    return this;
  };
  scene.remove = function (...objects) {
    for (const object of objects) {
      if (!object) continue;
      if (object.parent === world1Root) world1Root.remove(object);
      else originalRemove(object);
    }
    return this;
  };
  return { world1Root, addWorldRoot: root => (originalAdd(root), root), removeWorldRoot: root => originalRemove(root) };
}

const finiteOr = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;
const disposeRoot = root => root?.traverse(object => {
  object.geometry?.dispose?.();
  const materials = Array.isArray(object.material) ? object.material : object.material ? [object.material] : [];
  for (const material of materials) material.dispose?.();
});

function addBridge(THREE, root, { x, z, y, length = 100 }) {
  const group = new THREE.Group();
  group.name = 'coastline-bridge';
  const deckMaterial = new THREE.MeshStandardMaterial({ color: 0x343c3d, roughness: 0.88 });
  const railMaterial = new THREE.MeshStandardMaterial({ color: 0x9cc9bd, roughness: 0.72, metalness: 0.04 });
  const towerMaterial = new THREE.MeshStandardMaterial({ color: 0x66777a, roughness: 0.66, metalness: 0.25 });
  const deck = new THREE.Mesh(new THREE.BoxGeometry(16, 0.28, length), deckMaterial);
  deck.position.set(x, y + 0.08, z); deck.receiveShadow = true; deck.castShadow = true; group.add(deck);
  for (const side of [-1, 1]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.15, length), railMaterial); rail.position.set(x + side * 8, y + 0.66, z); rail.castShadow = true; group.add(rail); }
  for (const dz of [-length * 0.38, length * 0.38]) for (const side of [-1, 1]) { const tower = new THREE.Mesh(new THREE.BoxGeometry(0.7, 6.2, 0.7), towerMaterial); tower.position.set(x + side * 7.2, y + 3.05, z + dz); tower.castShadow = true; group.add(tower); }
  const cableMaterial = new THREE.LineBasicMaterial({ color: 0xb9d5d5 });
  for (const side of [-1, 1]) { const points = []; for (let i = 0; i <= 16; i++) { const t = i / 16, dz = -length * 0.5 + length * t, sag = Math.sin(Math.PI * t) * 3.8; points.push(new THREE.Vector3(x + side * 7.2, y + 6 - sag, z + dz)); } group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), cableMaterial)); }
  root.add(group);
  return group;
}

function createRoundedSquareShape(THREE, halfExtent = 110, cornerRadius = 20) {
  const edge = halfExtent, inner = edge - cornerRadius, shape = new THREE.Shape();
  shape.moveTo(-inner, -edge); shape.lineTo(inner, -edge); shape.quadraticCurveTo(edge, -edge, edge, -inner); shape.lineTo(edge, inner); shape.quadraticCurveTo(edge, edge, inner, edge); shape.lineTo(-inner, edge); shape.quadraticCurveTo(-edge, edge, -edge, inner); shape.lineTo(-edge, -inner); shape.quadraticCurveTo(-edge, -edge, -inner, -edge);
  return shape;
}

function addWorld2Palm(THREE, root, { x, z, y }) {
  const palm = new THREE.Group(); palm.name = 'coastline-world2-bridge-palm'; palm.userData.coastlineAlwaysVisible = true;
  const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x765538, roughness: 0.92 });
  const leafMaterial = new THREE.MeshStandardMaterial({ color: 0x3d7545, roughness: 0.9, side: THREE.DoubleSide });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.8, 12, 8), trunkMaterial); trunk.position.y = 6; trunk.castShadow = true; palm.add(trunk);
  const crown = new THREE.Group(); crown.position.y = 12;
  for (let i = 0; i < 7; i++) { const leaf = new THREE.Mesh(new THREE.ConeGeometry(1.9, 8, 5), leafMaterial); const angle = (i / 7) * Math.PI * 2; leaf.rotation.z = Math.PI / 2; leaf.rotation.y = angle; leaf.position.set(Math.cos(angle) * 2.5, -0.4, Math.sin(angle) * 2.5); leaf.scale.y = 1.5; leaf.castShadow = true; crown.add(leaf); }
  palm.add(crown); palm.position.set(x, y, z); root.add(palm); return palm;
}

export function createCoastlineWorldTransitions({ THREE, scene, roots, player, vehicles, avatar, groundY }) {
  const CITY_BRIDGE = Object.freeze({ x: 0, z: -600 });
  const ISLAND_BRIDGE = Object.freeze({ x: 500, z: 500 });
  const WORLD_2_SPAWN = Object.freeze({ x: 500, y: finiteOr(groundY(500, 400)), z: 400, rotationY: 0 });
  const CITY_APPROACH = Object.freeze({ x: 0, z: -645, rotationY: Math.PI });
  const ISLAND_APPROACH = Object.freeze({ x: 500, z: 445, rotationY: 0 });
  const BRIDGE_TRIGGER_RANGE = 10;
  const WORLD_2_BOUNDS = Object.freeze({ minX: 390, maxX: 610, minZ: 390, maxZ: 610, width: 220, depth: 220 });
  const WORLD_2_PALM = Object.freeze({ x: 520, z: 460 });
  let pendingWorld2Root = null, failNextWorld2Load = false, updatePromptCallback = () => {}, autoTransitionPromise = null;
  const setWorld2CollisionScope = active => { window.__coastlineWorld2Active = Boolean(active); };
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
  const createBlankWorld2Root = () => {
    const root = new THREE.Group(); root.name = 'coastline-world-2-compact-shell'; const x = ISLAND_BRIDGE.x, z = ISLAND_BRIDGE.z, y = finiteOr(groundY(x, z));
    const landMaterial = new THREE.MeshStandardMaterial({ color: 0x55785b, roughness: 0.96 }), shoreMaterial = new THREE.MeshStandardMaterial({ color: 0x9cc9bd, roughness: 0.72, metalness: 0.04 }), roadMaterial = new THREE.MeshStandardMaterial({ color: 0x343c3d, roughness: 0.9 });
    const shape = createRoundedSquareShape(THREE, 110, 20); const land = new THREE.Mesh(new THREE.ShapeGeometry(shape, 4), landMaterial); land.rotation.x = -Math.PI / 2; land.position.set(x, y - 0.18, z); land.receiveShadow = true; root.add(land);
    const shoreline = new THREE.Mesh(new THREE.ShapeGeometry(shape, 4), shoreMaterial); shoreline.rotation.x = -Math.PI / 2; shoreline.scale.setScalar(1.025); shoreline.position.set(x, y - 0.04, z); root.add(shoreline);
    const road = new THREE.Mesh(new THREE.BoxGeometry(16, 0.16, 150), roadMaterial); road.position.set(x, y + 0.02, z - 55); road.receiveShadow = true; root.add(road);
    for (const side of [-1, 1]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.05, 150), shoreMaterial); rail.position.set(x + side * 8, y + 0.5, z - 55); root.add(rail); }
    addBridge(THREE, root, { x, z, y, length: 100 }); addWorld2Palm(THREE, root, { x: WORLD_2_PALM.x, z: WORLD_2_PALM.z, y }); return root;
  };
  const addCityBridgeAffordance = () => addBridge(THREE, roots.world1Root, { x: CITY_BRIDGE.x, z: CITY_BRIDGE.z, y: finiteOr(groundY(CITY_BRIDGE.x, CITY_BRIDGE.z)), length: 100 });
  const cityWorld = { id: 'city', name: 'Coastline City', load: async ({ reason }) => { setWorld2CollisionScope(false); roots.world1Root.visible = reason === 'initial-activation' || roots.world1Root.visible; return { id: 'city', root: roots.world1Root }; }, unload: async handle => { handle.root.visible = false; }, captureState: async ({ context }) => ({ player: context.player, vehicle: context.vehicle, vehicleIndex: context.vehicleIndex }), restoreState: async (worldState, { handle, destinationSpawn }) => { setWorld2CollisionScope(false); handle.root.visible = true; applySnapshot(worldState, handle.root, destinationSpawn); } };
  const islandWorld = {
    id: 'island', name: 'World 2 Compact Shell',
    load: async ({ context, destinationSpawn }) => { setWorld2CollisionScope(true); pendingWorld2Root = createBlankWorld2Root(); roots.addWorldRoot(pendingWorld2Root); pendingWorld2Root.visible = true; moveActiveActor(pendingWorld2Root); applySnapshot({ player: context.player, vehicle: context.vehicle, vehicleIndex: context.vehicleIndex }, pendingWorld2Root, destinationSpawn || WORLD_2_SPAWN); if (failNextWorld2Load) { failNextWorld2Load = false; throw new Error('injected world 2 load failure'); } return { id: 'island', root: pendingWorld2Root }; },
    unload: async handle => { setWorld2CollisionScope(false); if (handle.root?.parent) roots.removeWorldRoot(handle.root); disposeRoot(handle.root); if (pendingWorld2Root === handle.root) pendingWorld2Root = null; },
    cleanupFailedLoad: async ({ context }) => { setWorld2CollisionScope(false); if (!pendingWorld2Root) return; applySnapshot({ player: context.player, vehicle: context.vehicle, vehicleIndex: context.vehicleIndex }, roots.world1Root); roots.world1Root.visible = true; roots.removeWorldRoot(pendingWorld2Root); disposeRoot(pendingWorld2Root); pendingWorld2Root = null; },
    captureState: async ({ context }) => ({ player: context.player, vehicle: context.vehicle, vehicleIndex: context.vehicleIndex }),
    restoreState: async (worldState, { handle }) => { setWorld2CollisionScope(true); handle.root.visible = true; moveActiveActor(handle.root); applySnapshot(worldState, handle.root); },
  };
  manager.registerWorld(cityWorld); manager.registerWorld(islandWorld);
  manager.registerTransition({ id: 'city-to-island', fromWorld: 'city', toWorld: 'island', trigger: 'bridge', destinationSpawn: WORLD_2_SPAWN, vehiclePolicy: 'allowed' });
  manager.registerTransition({ id: 'island-to-city', fromWorld: 'island', toWorld: 'city', trigger: 'bridge', destinationSpawn: { x: 0, y: finiteOr(groundY(0, -540)), z: -540, rotationY: Math.PI }, vehiclePolicy: 'allowed' });
  const transition = async transitionId => { if (autoTransitionPromise) return autoTransitionPromise; autoTransitionPromise = manager.transition(transitionId, makeContext()).finally(() => { autoTransitionPromise = null; }); return autoTransitionPromise; };
  const nearAndFacing = (target, range, heading) => { const dx = target.x - player.x, dz = target.z - player.z, distance = Math.hypot(dx, dz); if (distance > range) return false; const forwardX = Math.sin(heading), forwardZ = Math.cos(heading); return distance < 0.001 || ((dx * forwardX + dz * forwardZ) / distance) > 0.45; };
  const initialize = async () => {
    addCityBridgeAffordance(); await manager.activate('city');
    const button = document.createElement('button'); button.id = 'coastlineWorldTransition'; button.type = 'button'; button.setAttribute('aria-label', 'Cross bridge between Coastline City and World 2'); button.style.cssText = 'display:none;position:fixed;left:50%;bottom:170px;transform:translateX(-50%);z-index:1000;pointer-events:auto;border:1px solid #a7f4ff88;border-radius:12px;padding:6px 8px;background:#06202aee;color:#effcff;font:800 12px system-ui,sans-serif;letter-spacing:.08em;box-shadow:0 8px 24px #0008';
    button.addEventListener('click', () => transition(manager.getActiveWorldId() === 'city' ? 'city-to-island' : 'island-to-city').catch(error => { button.textContent = `TRANSITION FAILED: ${error.message}`; })); document.body.appendChild(button);
    updatePromptCallback = () => {
      const activeWorld = manager.getActiveWorldId(), vehicle = player.mode === 'vehicle' ? player.vehicle : null; if (vehicle) makeVehicleRenderable(vehicle); if (!vehicle || manager.getStatus().state !== 'active') { button.style.display = 'none'; return; }
      const target = activeWorld === 'city' ? CITY_APPROACH : ISLAND_APPROACH, transitionId = activeWorld === 'city' ? 'city-to-island' : 'island-to-city';
      if (nearAndFacing(target, BRIDGE_TRIGGER_RANGE, player.heading) && !autoTransitionPromise) transition(transitionId).catch(error => { button.textContent = `TRANSITION FAILED: ${error.message}`; });
      const promptTarget = activeWorld === 'city' ? CITY_BRIDGE : ISLAND_BRIDGE, promptRange = 24, dx = promptTarget.x - player.x, dz = promptTarget.z - player.z, distance = Math.hypot(dx, dz), forwardX = Math.sin(player.heading), forwardZ = Math.cos(player.heading), dot = distance > 0.001 ? (dx * forwardX + dz * forwardZ) / distance : 1;
      if (distance > promptRange || dot < 0.45) { button.style.display = 'none'; return; } button.textContent = activeWorld === 'city' ? 'CROSS TO WORLD 2' : 'RETURN TO CITY'; button.style.display = 'block';
    };
    window.__coastlineTransitionTest = {
      status: () => manager.getStatus(), playerState: () => ({ position: { x: player.x, y: player.y, z: player.z }, heading: player.heading, mode: player.mode, vehicleIndex: vehicles.indexOf(player.vehicle), vehicleSpeed: player.vehicle?.speed ?? 0 }), rootVisibility: () => ({ cityVisible: roots.world1Root.visible, cityCachedInScene: Boolean(roots.world1Root.parent === scene), islandVisible: Boolean(pendingWorld2Root?.visible), islandRootResident: Boolean(pendingWorld2Root?.parent === scene) }), transition, updatePrompt: updatePromptCallback, failNextWorld2Load: () => { failNextWorld2Load = true; }, world2Spawn: () => ({ ...WORLD_2_SPAWN }), bridgeZones: () => ({ cityApproach: { ...CITY_APPROACH }, islandApproach: { ...ISLAND_APPROACH } }),
      world2Layout: () => { const palm = pendingWorld2Root?.getObjectByName('coastline-world2-bridge-palm'); const distanceToIslandBridge = Math.hypot(WORLD_2_PALM.x - ISLAND_APPROACH.x, WORLD_2_PALM.z - ISLAND_APPROACH.z); return { bounds: { ...WORLD_2_BOUNDS }, spawn: { ...WORLD_2_SPAWN }, islandBridge: { ...ISLAND_BRIDGE }, spawnToIslandBridge: Math.hypot(WORLD_2_SPAWN.x - ISLAND_APPROACH.x, WORLD_2_SPAWN.z - ISLAND_APPROACH.z), palm: { name: String(palm?.name || ''), x: WORLD_2_PALM.x, z: WORLD_2_PALM.z, distanceToIslandBridge, offRoad: Math.abs(WORLD_2_PALM.x - ISLAND_BRIDGE.x) > 10 } }; },
      visualIdentity, activeVehicleVisible: () => Boolean(player.vehicle?.g && player.vehicle.g.visible && (() => { let hidden = false; player.vehicle.g.traverse(node => { if (node.visible === false) hidden = true; }); return !hidden; })()), collisionScope: () => Boolean(window.__coastlineWorld2Active),
    };
    window.addEventListener('keydown', updatePromptCallback); setInterval(() => updatePromptCallback(), 200); return manager;
  };
  const initializePromise = initialize();
  return { manager, ready: initializePromise, initialize: () => initializePromise, updatePrompt: () => updatePromptCallback(), dispose: async () => { setWorld2CollisionScope(false); if (pendingWorld2Root) { roots.removeWorldRoot(pendingWorld2Root); disposeRoot(pendingWorld2Root); pendingWorld2Root = null; } } };
}
