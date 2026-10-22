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

  return {
    world1Root,
    addWorldRoot(root) { originalAdd(root); return root; },
    removeWorldRoot(root) { originalRemove(root); },
  };
}

function finiteOr(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function disposeRoot(root) {
  if (!root) return;
  root.traverse(object => {
    if (object.geometry?.dispose) object.geometry.dispose();
    const materials = Array.isArray(object.material) ? object.material : object.material ? [object.material] : [];
    for (const material of materials) material.dispose?.();
  });
}

function addBridge(THREE, root, { x, z, y, length = 100 }) {
  const group = new THREE.Group();
  group.name = 'coastline-bridge';
  const deckMaterial = new THREE.MeshStandardMaterial({ color: 0x343c3d, roughness: 0.88 });
  const railMaterial = new THREE.MeshStandardMaterial({ color: 0x9cc9bd, roughness: 0.72, metalness: 0.04 });
  const towerMaterial = new THREE.MeshStandardMaterial({ color: 0x66777a, roughness: 0.66, metalness: 0.25 });

  const deck = new THREE.Mesh(new THREE.BoxGeometry(16, 0.28, length), deckMaterial);
  deck.position.set(x, y + 0.08, z);
  deck.receiveShadow = true;
  deck.castShadow = true;
  group.add(deck);

  for (const side of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.15, length), railMaterial);
    rail.position.set(x + side * 8, y + 0.66, z);
    rail.castShadow = true;
    group.add(rail);
  }

  for (const dz of [-length * 0.38, length * 0.38]) {
    for (const side of [-1, 1]) {
      const tower = new THREE.Mesh(new THREE.BoxGeometry(0.7, 6.2, 0.7), towerMaterial);
      tower.position.set(x + side * 7.2, y + 3.05, z + dz);
      tower.castShadow = true;
      group.add(tower);
    }
  }

  const cableMaterial = new THREE.LineBasicMaterial({ color: 0xb9d5d5 });
  for (const side of [-1, 1]) {
    const points = [];
    const half = length * 0.5;
    for (let i = 0; i <= 16; i++) {
      const t = i / 16;
      const dz = -half + length * t;
      const sag = Math.sin(Math.PI * t) * 3.8;
      points.push(new THREE.Vector3(x + side * 7.2, y + 6.0 - sag, z + dz));
    }
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), cableMaterial));
  }
  root.add(group);
  return group;
}

export function createCoastlineWorldTransitions({ THREE, scene, roots, player, vehicles, avatar, groundY }) {
  const WORLD_2_SPAWN = Object.freeze({ x: 500, y: finiteOr(groundY(500, 500)), z: 500, rotationY: 0 });
  const CITY_BRIDGE = Object.freeze({ x: 0, z: -680 });
  const CITY_PROMPT_RANGE = 24;
  const WORLD_2_PROMPT_RANGE = 36;
  let pendingWorld2Root = null;
  let failNextWorld2Load = false;
  let disposed = false;
  let updatePromptCallback = () => {};

  const setWorld2CollisionScope = active => {
    window.__coastlineWorld2Active = Boolean(active);
  };

  const manager = createTransitionManager({
    onEvent(event) {
      window.dispatchEvent(new CustomEvent(`coastline:${event.type}`, { detail: event }));
    },
  });

  const capturePlayer = () => ({
    mode: player.mode,
    position: { x: finiteOr(player.x), y: finiteOr(player.y), z: finiteOr(player.z) },
    rotationY: finiteOr(player.heading),
    vehicleIndex: player.mode === 'vehicle' ? vehicles.indexOf(player.vehicle) : -1,
  });

  const captureVehicle = () => {
    if (player.mode !== 'vehicle' || !player.vehicle) return null;
    const vehicle = player.vehicle;
    return {
      id: String(vehicle.worldEntityId ?? vehicle.kind ?? 'active-vehicle'),
      position: { x: finiteOr(vehicle.x, player.x), y: finiteOr(vehicle.g?.position?.y), z: finiteOr(vehicle.z, player.z) },
      rotationY: finiteOr(vehicle.heading, player.heading),
      heading: finiteOr(vehicle.heading, player.heading),
      speed: finiteOr(vehicle.speed),
    };
  };

  const makeContext = () => ({
    player: capturePlayer(),
    vehicle: captureVehicle(),
    vehicleIndex: player.mode === 'vehicle' ? vehicles.indexOf(player.vehicle) : -1,
  });

  const activeActor = () => player.mode === 'vehicle' && player.vehicle?.g ? player.vehicle.g : avatar;
  const moveActiveActor = root => {
    const actor = activeActor();
    if (actor && actor.parent !== root) root.add(actor);
  };

  const applySnapshot = (snapshot, root, spawn = null) => {
    if (!snapshot) return;
    const state = snapshot.player ? snapshot : { player: snapshot };
    const playerState = state.player || {};
    const position = playerState.position || {};
    player.mode = playerState.mode || player.mode;
    player.x = finiteOr(position.x, player.x);
    player.y = finiteOr(position.y, 0);
    player.z = finiteOr(position.z, player.z);
    player.heading = finiteOr(playerState.rotationY, player.heading);
    if (Number.isInteger(state.vehicleIndex) && state.vehicleIndex >= 0 && vehicles[state.vehicleIndex]) player.vehicle = vehicles[state.vehicleIndex];

    const vehicle = player.vehicle;
    if (vehicle && state.vehicle && (player.mode === 'vehicle' || state.vehicleIndex >= 0)) {
      const vehicleState = state.vehicle;
      vehicle.x = finiteOr(vehicleState.position?.x, player.x);
      vehicle.z = finiteOr(vehicleState.position?.z, player.z);
      vehicle.heading = finiteOr(vehicleState.heading, finiteOr(vehicleState.rotationY, player.heading));
      vehicle.speed = finiteOr(vehicleState.speed);
      if (vehicle.g) {
        vehicle.g.position.set(vehicle.x, finiteOr(vehicleState.position?.y, groundY(vehicle.x, vehicle.z)), vehicle.z);
        vehicle.g.rotation.y = vehicle.heading;
        if (vehicle.g.parent !== root) root.add(vehicle.g);
      }
    } else if (avatar && avatar.parent !== root) {
      root.add(avatar);
    }

    if (spawn) {
      const x = finiteOr(spawn.x, player.x);
      const z = finiteOr(spawn.z, player.z);
      const y = finiteOr(spawn.y, finiteOr(groundY(x, z)));
      player.x = x;
      player.y = y;
      player.z = z;
      player.heading = finiteOr(spawn.rotationY, player.heading);
      if (player.mode === 'vehicle' && player.vehicle) {
        const currentVehicle = player.vehicle;
        currentVehicle.x = x;
        currentVehicle.z = z;
        currentVehicle.heading = player.heading;
        currentVehicle.speed = 0;
        if (currentVehicle.g) {
          currentVehicle.g.position.set(x, y, z);
          currentVehicle.g.rotation.y = player.heading;
          if (currentVehicle.g.parent !== root) root.add(currentVehicle.g);
        }
      } else if (avatar) {
        avatar.position.set(x, y, z);
        avatar.rotation.y = player.heading;
        if (avatar.parent !== root) root.add(avatar);
      }
    } else if (player.mode !== 'vehicle' && avatar) {
      avatar.position.set(player.x, finiteOr(groundY(player.x, player.z)), player.z);
      avatar.rotation.y = player.heading;
      if (avatar.parent !== root) root.add(avatar);
    }
  };

  const createBlankWorld2Root = () => {
    const root = new THREE.Group();
    root.name = 'coastline-world-2-blank-shell';
    const x = WORLD_2_SPAWN.x, z = WORLD_2_SPAWN.z, y = finiteOr(groundY(x, z));
    const landMaterial = new THREE.MeshStandardMaterial({ color: 0x55785b, roughness: 0.96 });
    const roadMaterial = new THREE.MeshStandardMaterial({ color: 0x343c3d, roughness: 0.9 });
    const shoreMaterial = new THREE.MeshStandardMaterial({ color: 0x9cc9bd, roughness: 0.72, metalness: 0.04 });
    const land = new THREE.Mesh(new THREE.PlaneGeometry(480, 480, 48, 48), landMaterial);
    land.rotation.x = -Math.PI / 2;
    land.position.set(x, y - 0.18, z);
    land.receiveShadow = true;
    root.add(land);
    const shoreline = new THREE.Mesh(new THREE.TorusGeometry(202, 7, 10, 96), shoreMaterial);
    shoreline.rotation.x = Math.PI / 2;
    shoreline.position.set(x, y + 0.04, z);
    root.add(shoreline);
    const road = new THREE.Mesh(new THREE.BoxGeometry(16, 0.16, 190), roadMaterial);
    road.position.set(x, y + 0.02, z - 84);
    road.receiveShadow = true;
    root.add(road);
    for (const side of [-1, 1]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.05, 190), shoreMaterial);
      rail.position.set(x + side * 8, y + 0.5, z - 84);
      root.add(rail);
    }
    addBridge(THREE, root, { x, z, y, length: 100 });
    return root;
  };

  const addCityBridgeAffordance = () => {
    const y = finiteOr(groundY(CITY_BRIDGE.x, CITY_BRIDGE.z));
    addBridge(THREE, roots.world1Root, { x: CITY_BRIDGE.x, z: CITY_BRIDGE.z, y, length: 100 });
  };

  const cityWorld = {
    id: 'city',
    name: 'Coastline City',
    load: async ({ reason }) => {
      setWorld2CollisionScope(false);
      roots.world1Root.visible = reason === 'initial-activation';
      return { id: 'city', root: roots.world1Root };
    },
    unload: async handle => { handle.root.visible = false; },
    captureState: async ({ context }) => ({ player: context.player, vehicle: context.vehicle, vehicleIndex: context.vehicleIndex }),
    restoreState: async (worldState, { handle }) => {
      setWorld2CollisionScope(false);
      handle.root.visible = true;
      applySnapshot(worldState, handle.root);
    },
  };

  const islandWorld = {
    id: 'island',
    name: 'World 2 Blank Shell',
    load: async ({ context, destinationSpawn }) => {
      setWorld2CollisionScope(true);
      pendingWorld2Root = createBlankWorld2Root();
      roots.addWorldRoot(pendingWorld2Root);
      pendingWorld2Root.visible = true;
      moveActiveActor(pendingWorld2Root);
      applySnapshot({ player: context.player, vehicle: context.vehicle, vehicleIndex: context.vehicleIndex }, pendingWorld2Root, destinationSpawn || WORLD_2_SPAWN);
      if (failNextWorld2Load) {
        failNextWorld2Load = false;
        throw new Error('injected world 2 load failure');
      }
      return { id: 'island', root: pendingWorld2Root };
    },
    unload: async handle => {
      setWorld2CollisionScope(false);
      if (handle.root?.parent) roots.removeWorldRoot(handle.root);
      disposeRoot(handle.root);
      if (pendingWorld2Root === handle.root) pendingWorld2Root = null;
    },
    cleanupFailedLoad: async ({ context }) => {
      setWorld2CollisionScope(false);
      if (!pendingWorld2Root) return;
      applySnapshot({ player: context.player, vehicle: context.vehicle, vehicleIndex: context.vehicleIndex }, roots.world1Root);
      roots.world1Root.visible = true;
      roots.removeWorldRoot(pendingWorld2Root);
      disposeRoot(pendingWorld2Root);
      pendingWorld2Root = null;
    },
    captureState: async ({ context }) => ({ player: context.player, vehicle: context.vehicle, vehicleIndex: context.vehicleIndex }),
    restoreState: async (worldState, { handle }) => {
      setWorld2CollisionScope(true);
      handle.root.visible = true;
      moveActiveActor(handle.root);
      applySnapshot(worldState, handle.root);
    },
  };

  manager.registerWorld(cityWorld);
  manager.registerWorld(islandWorld);
  manager.registerTransition({ id: 'city-to-island', fromWorld: 'city', toWorld: 'island', trigger: 'bridge', destinationSpawn: WORLD_2_SPAWN, vehiclePolicy: 'allowed' });
  manager.registerTransition({ id: 'island-to-city', fromWorld: 'island', toWorld: 'city', trigger: 'bridge', destinationSpawn: { x: CITY_BRIDGE.x, y: 0, z: CITY_BRIDGE.z - 70, rotationY: Math.PI }, vehiclePolicy: 'allowed' });

  const transition = async transitionId => manager.transition(transitionId, makeContext());

  const initialize = async () => {
    addCityBridgeAffordance();
    await manager.activate('city');
    const button = document.createElement('button');
    button.id = 'coastlineWorldTransition';
    button.type = 'button';
    button.setAttribute('aria-label', 'Cross bridge between Coastline City and World 2');
    button.style.cssText = 'display:none;position:fixed;left:50%;bottom:170px;transform:translateX(-50%);z-index:1000;pointer-events:auto;border:1px solid #a7f4ff88;border-radius:12px;padding:6px 8px;background:#06202aee;color:#effcff;font:800 12px system-ui,sans-serif;letter-spacing:.08em;box-shadow:0 8px 24px #0008';
    button.addEventListener('click', () => {
      const id = manager.getActiveWorldId() === 'city' ? 'city-to-island' : 'island-to-city';
      transition(id).catch(error => {
        button.textContent = `TRANSITION FAILED: ${error.message}`;
      });
    });
    document.body.appendChild(button);

    updatePromptCallback = () => {
      const activeWorld = manager.getActiveWorldId();
      const vehicle = player.mode === 'vehicle' ? player.vehicle : null;
      if (!vehicle) {
        button.style.display = 'none';
        return;
      }
      const target = activeWorld === 'city' ? CITY_BRIDGE : WORLD_2_SPAWN;
      const range = activeWorld === 'city' ? CITY_PROMPT_RANGE : WORLD_2_PROMPT_RANGE;
      const dx = target.x - player.x;
      const dz = target.z - player.z;
      const distance = Math.hypot(dx, dz);
      const forwardX = Math.sin(player.heading);
      const forwardZ = Math.cos(player.heading);
      const dot = distance > 0.001 ? (dx * forwardX + dz * forwardZ) / distance : 1;
      if (distance > range || dot < 0.72) {
        button.style.display = 'none';
        return;
      }
      button.textContent = activeWorld === 'city' ? 'CROSS TO WORLD 2' : 'RETURN TO CITY';
      button.style.display = 'block';
    };

    window.__coastlineTransitionTest = {
      status: () => manager.getStatus(),
      playerState: () => ({ position: { x: player.x, y: player.y, z: player.z }, heading: player.heading, mode: player.mode, vehicleIndex: vehicles.indexOf(player.vehicle), vehicleSpeed: player.vehicle?.speed ?? 0 }),
      rootVisibility: () => ({ cityVisible: roots.world1Root.visible, cityCachedInScene: Boolean(roots.world1Root.parent === scene), islandVisible: Boolean(pendingWorld2Root?.visible), islandRootResident: Boolean(pendingWorld2Root?.parent === scene) }),
      transition,
      updatePrompt: updatePromptCallback,
      failNextWorld2Load: () => { failNextWorld2Load = true; },
      world2Spawn: () => ({ ...WORLD_2_SPAWN }),
      collisionScope: () => Boolean(window.__coastlineWorld2Active),
    };

    window.addEventListener('keydown', updatePromptCallback);
    setInterval(() => updatePromptCallback(), 200);
    return manager;
  };

  const initializePromise = initialize();
  return {
    manager,
    ready: initializePromise,
    initialize: () => initializePromise,
    updatePrompt: () => updatePromptCallback(),
    dispose: async () => {
      disposed = true;
      setWorld2CollisionScope(false);
      if (pendingWorld2Root) {
        roots.removeWorldRoot(pendingWorld2Root);
        disposeRoot(pendingWorld2Root);
        pendingWorld2Root = null;
      }
    },
  };
}
