import { createTransitionManager } from './transition-manager.js';

export function createWorldRootRegistry({ THREE, scene }) {
  const originalAdd = scene.add.bind(scene);
  const originalRemove = scene.remove.bind(scene);
  const world1Root = new THREE.Group();
  world1Root.name = 'coastline-world-1-root';
  originalAdd(world1Root);

  // The existing city runtime is monolithic. Route its current and future scene
  // additions into a single root so the transition adapter can hide that world
  // without rewriting the established gameplay/render loop.
  scene.add = function (...objects) {
    for (const object of objects) {
      if (!object) continue;
      if (object === world1Root || object.isLight || object.isCamera) originalAdd(object);
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
    if (object.geometry && typeof object.geometry.dispose === 'function') object.geometry.dispose();
    const materials = Array.isArray(object.material) ? object.material : object.material ? [object.material] : [];
    for (const material of materials) if (typeof material.dispose === 'function') material.dispose();
  });
}

export function createCoastlineWorldTransitions({ THREE, scene, roots, player, vehicles, avatar, groundY }) {
  const WORLD_2_SPAWN = Object.freeze({ x: 1500, y: 0, z: 1500, rotationY: 0 });
  const CITY_BRIDGE = Object.freeze({ x: 0, z: -680 });
  let pendingWorld2Root = null;
  let failNextWorld2Load = false;
  let disposed = false;

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
      position: {
        x: finiteOr(vehicle.x, finiteOr(player.x)),
        y: finiteOr(vehicle.g?.position?.y),
        z: finiteOr(vehicle.z, finiteOr(player.z)),
      },
      rotationY: finiteOr(vehicle.heading, finiteOr(player.heading)),
      heading: finiteOr(vehicle.heading, finiteOr(player.heading)),
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
    player.x = finiteOr(position.x, finiteOr(player.x));
    player.y = finiteOr(position.y, 0);
    player.z = finiteOr(position.z, finiteOr(player.z));
    player.heading = finiteOr(playerState.rotationY, finiteOr(player.heading));
    if (Number.isInteger(state.vehicleIndex) && state.vehicleIndex >= 0 && vehicles[state.vehicleIndex]) {
      player.vehicle = vehicles[state.vehicleIndex];
    }
    const vehicle = player.vehicle;
    if (vehicle && state.vehicle && (player.mode === 'vehicle' || state.vehicleIndex >= 0)) {
      const vehicleState = state.vehicle;
      vehicle.x = finiteOr(vehicleState.position?.x, player.x);
      vehicle.z = finiteOr(vehicleState.position?.z, player.z);
      vehicle.heading = finiteOr(vehicleState.heading, finiteOr(vehicleState.rotationY, player.heading));
      vehicle.speed = finiteOr(vehicleState.speed);
      if (vehicle.g) {
        vehicle.g.position.set(vehicle.x, finiteOr(vehicleState.position?.y, finiteOr(groundY(vehicle.x, vehicle.z))), vehicle.z);
        vehicle.g.rotation.y = finiteOr(vehicleState.rotationY, vehicle.heading);
        if (vehicle.g.parent !== root) root.add(vehicle.g);
      }
    } else if (avatar && avatar.parent !== root) {
      root.add(avatar);
    }

    if (spawn) {
      const x = finiteOr(spawn.x, player.x);
      const y = finiteOr(spawn.y, finiteOr(groundY(x, finiteOr(spawn.z, player.z))));
      const z = finiteOr(spawn.z, player.z);
      player.x = x;
      player.y = 0;
      player.z = z;
      player.heading = finiteOr(spawn.rotationY, player.heading);
      if (player.mode === 'vehicle' && player.vehicle) {
        const vehicle = player.vehicle;
        vehicle.x = x;
        vehicle.z = z;
        vehicle.heading = player.heading;
        vehicle.speed = 0;
        if (vehicle.g) {
          vehicle.g.position.set(x, y, z);
          vehicle.g.rotation.y = player.heading;
          if (vehicle.g.parent !== root) root.add(vehicle.g);
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

  const createWorld2Root = () => {
    const root = new THREE.Group();
    root.name = 'coastline-world-2-shell';
    const x = WORLD_2_SPAWN.x, z = WORLD_2_SPAWN.z;
    const y = finiteOr(groundY(x, z));
    const landMaterial = new THREE.MeshStandardMaterial({ color: 0x55785b, roughness: 0.96 });
    const coastMaterial = new THREE.MeshStandardMaterial({ color: 0x9cc9bd, roughness: 0.72, metalness: 0.04 });
    const roadMaterial = new THREE.MeshStandardMaterial({ color: 0x343c3d, roughness: 0.9 });
    const lineMaterial = new THREE.MeshStandardMaterial({ color: 0xe5d7a0, roughness: 0.8 });
    const land = new THREE.Mesh(new THREE.PlaneGeometry(480, 480, 48, 48), landMaterial);
    land.rotation.x = -Math.PI / 2;
    land.position.set(x, y - 0.18, z);
    land.receiveShadow = true;
    root.add(land);
    const shoreline = new THREE.Mesh(new THREE.TorusGeometry(202, 7, 10, 96), coastMaterial);
    shoreline.rotation.x = Math.PI / 2;
    shoreline.position.set(x, y + 0.04, z);
    root.add(shoreline);
    const road = new THREE.Mesh(new THREE.BoxGeometry(16, 0.16, 190), roadMaterial);
    road.position.set(x, y + 0.02, z - 84);
    road.receiveShadow = true;
    root.add(road);
    for (const side of [-1, 1]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.05, 150), coastMaterial);
      rail.position.set(x + side * 8, y + 0.5, z - 105);
      root.add(rail);
    }
    for (let dz = -30; dz >= -140; dz -= 22) {
      const line = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.025, 8), lineMaterial);
      line.position.set(x, y + 0.11, z + dz);
      root.add(line);
    }
    return root;
  };

  const addCityBridgeAffordance = () => {
    const group = new THREE.Group();
    group.name = 'coastline-city-bridge-affordance';
    const x = CITY_BRIDGE.x, z = CITY_BRIDGE.z, y = finiteOr(groundY(x, z));
    const road = new THREE.Mesh(new THREE.BoxGeometry(16, 0.16, 100), new THREE.MeshStandardMaterial({ color: 0x343c3d, roughness: 0.9 }));
    road.position.set(x, y + 0.05, z);
    group.add(road);
    for (const side of [-1, 1]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.05, 100), new THREE.MeshStandardMaterial({ color: 0x9cc9bd, roughness: 0.72 }));
      rail.position.set(x + side * 8, y + 0.55, z);
      group.add(rail);
    }
    roots.world1Root.add(group);
  };

  const cityWorld = {
    id: 'city',
    name: 'Coastline City',
    load: async ({ reason }) => {
      roots.world1Root.visible = reason === 'initial-activation';
      return { id: 'city', root: roots.world1Root };
    },
    unload: async handle => { handle.root.visible = false; },
    captureState: async ({ context }) => ({
      player: context.player,
      vehicle: context.vehicle,
      vehicleIndex: context.vehicleIndex,
    }),
    restoreState: async (worldState, { handle }) => {
      handle.root.visible = true;
      applySnapshot(worldState, handle.root);
    },
  };

  const islandWorld = {
    id: 'island',
    name: 'World 2 Island Shell',
    load: async ({ context, destinationSpawn }) => {
      pendingWorld2Root = createWorld2Root();
      roots.addWorldRoot(pendingWorld2Root);
      pendingWorld2Root.visible = true;
      moveActiveActor(pendingWorld2Root);
      applySnapshot({
        player: context.player,
        vehicle: context.vehicle,
        vehicleIndex: context.vehicleIndex,
      }, pendingWorld2Root, destinationSpawn || WORLD_2_SPAWN);
      if (failNextWorld2Load) {
        failNextWorld2Load = false;
        throw new Error('injected world 2 load failure');
      }
      return { id: 'island', root: pendingWorld2Root };
    },
    unload: async handle => {
      if (handle.root?.parent) roots.removeWorldRoot(handle.root);
      disposeRoot(handle.root);
      if (pendingWorld2Root === handle.root) pendingWorld2Root = null;
    },
    cleanupFailedLoad: async ({ context }) => {
      if (pendingWorld2Root) {
        const snapshot = { player: context.player, vehicle: context.vehicle, vehicleIndex: context.vehicleIndex };
        applySnapshot(snapshot, roots.world1Root);
        roots.world1Root.visible = true;
        roots.removeWorldRoot(pendingWorld2Root);
        disposeRoot(pendingWorld2Root);
        pendingWorld2Root = null;
      }
    },
    captureState: async ({ context }) => ({
      player: context.player,
      vehicle: context.vehicle,
      vehicleIndex: context.vehicleIndex,
    }),
    restoreState: async (worldState, { handle }) => {
      handle.root.visible = true;
      moveActiveActor(handle.root);
      applySnapshot(worldState, handle.root);
    },
  };

  manager.registerWorld(cityWorld);
  manager.registerWorld(islandWorld);
  manager.registerTransition({
    id: 'city-to-island',
    fromWorld: 'city',
    toWorld: 'island',
    trigger: 'bridge',
    destinationSpawn: WORLD_2_SPAWN,
    vehiclePolicy: 'allowed',
  });
  manager.registerTransition({
    id: 'island-to-city',
    fromWorld: 'island',
    toWorld: 'city',
    trigger: 'bridge',
    destinationSpawn: { x: 0, y: 0, z: 0, rotationY: 0 },
    vehiclePolicy: 'allowed',
  });

  const transition = async transitionId => manager.transition(transitionId, makeContext());
  const initialize = async () => {
    addCityBridgeAffordance();
    await manager.activate('city');
    const button = document.createElement('button');
    button.id = 'coastlineWorldTransition';
    button.type = 'button';
    button.setAttribute('aria-label', 'Cross bridge between Coastline City and World 2');
    button.style.cssText = 'display:none;position:fixed;left:50%;bottom:170px;transform:translateX(-50%);z-index:1000;pointer-events:auto;border:1px solid #a7f4ff88;border-radius:12px;padding:12px 16px;background:#06202aee;color:#effcff;font:800 12px system-ui,sans-serif;letter-spacing:.08em;box-shadow:0 8px 24px #0008';
    button.addEventListener('click', () => {
      const id = manager.getActiveWorldId() === 'city' ? 'city-to-island' : 'island-to-city';
      transition(id).catch(error => {
        window.dispatchEvent(new CustomEvent('coastline:transition-ui-error', { detail: { message: error.message } }));
      });
    });
    document.body.appendChild(button);
    window.__coastlineTransitionTest = {
      status: () => manager.getStatus(),
      activeWorld: () => manager.getActiveWorldId(),
      playerState: () => ({ position: { x: player.x, y: player.y, z: player.z }, heading: player.heading, mode: player.mode, vehicleIndex: player.mode === 'vehicle' ? vehicles.indexOf(player.vehicle) : -1, vehicleSpeed: player.mode === 'vehicle' ? player.vehicle?.speed ?? null : null }),
      transition,
      failNextWorld2Load: () => { failNextWorld2Load = true; },
      updatePrompt,
    };
    updatePrompt();
    return manager;
  };

  function updatePrompt() {
    if (disposed) return;
    const button = document.getElementById('coastlineWorldTransition');
    if (!button) return;
    const active = manager.getActiveWorldId();
    const nearCityBridge = active === 'city' && Math.hypot(player.x - CITY_BRIDGE.x, player.z - CITY_BRIDGE.z) < 48;
    const nearIslandBridge = active === 'island' && Math.hypot(player.x - WORLD_2_SPAWN.x, player.z - WORLD_2_SPAWN.z) < 72;
    const available = manager.getStatus().state === 'active' && (nearCityBridge || nearIslandBridge);
    button.style.display = available ? 'block' : 'none';
    button.textContent = active === 'city' ? 'CROSS BRIDGE  →  ISLAND' : 'RETURN TO CITY  →';
    button.disabled = !available;
  }

  return {
    manager,
    initialize,
    updatePrompt,
    dispose() { disposed = true; manager.dispose(); },
  };
}
