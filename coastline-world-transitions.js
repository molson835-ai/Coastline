import { createTransitionManager } from './transition-manager.js';
import { COASTLINE_ISLAND_ELEVATION, COASTLINE_ISLAND_WATER_DROP, createCoastlineIslandRoot, getCoastlineIslandRegion } from './coastline-island-regions.js';
import { buildHomeyGarageInterior, openGarageVehicleChooser, didCrossGarageThreshold, didCrossHouseDoorThreshold, canUseGarageKeyBoard } from './coastline-homey-garage.js';
import { buildHomeyHouseInterior } from './coastline-homey-house-interior.js';

export function createWorldRootRegistry({ THREE, scene }) {
  const originalAdd = scene.add.bind(scene), originalRemove = scene.remove.bind(scene), cityRoot = new THREE.Group();
  cityRoot.name = 'coastline-city-root'; originalAdd(cityRoot);
  scene.add = function (...objects) { for (const object of objects) { if (!object) continue; if (object === cityRoot || object.isCamera || object.userData?.coastlineGlobal || object.isAmbientLight || object.isHemisphereLight || object.isDirectionalLight) originalAdd(object); else cityRoot.add(object); } return this; };
  scene.remove = function (...objects) { for (const object of objects) { if (!object) continue; if (object.parent === cityRoot) cityRoot.remove(object); else originalRemove(object); } return this; };
  return { world1Root: cityRoot, cityRoot, addWorldRoot: root => (originalAdd(root), root), removeWorldRoot: root => originalRemove(root) };
}

const finiteOr = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;
const disposeRoot = root => root?.traverse(object => { object.geometry?.dispose?.(); const materials = Array.isArray(object.material) ? object.material : object.material ? [object.material] : []; for (const material of materials) material.dispose?.(); });

export const COASTLINE_ROPE_BRIDGE_CONFIG = Object.freeze({
  deckWidth: 5.2,
  plankCountPer100Units: 40,
  plankGap: 0.16,
  postSpacing: 4.5,
  ropeRadius: 0.055,
  deckSag: 2.1,
  railHeight: 1.55,
});

function buildRopeBridge(THREE, root, { axis, origin, direction, y, length = 100, name = 'coastal-link' }) {
  const width = COASTLINE_ROPE_BRIDGE_CONFIG.deckWidth;
  const group = new THREE.Group();
  group.name = `coastline-bridge-rope-single-lane-${name}`;
  const alongZ = axis === 'z';
  const plankMaterial = new THREE.MeshStandardMaterial({ color: 0x6e5139, roughness: 0.96 });
  const ropeMaterial = new THREE.MeshStandardMaterial({ color: 0x4b3829, roughness: 0.98 });
  const postMaterial = new THREE.MeshStandardMaterial({ color: 0x684a32, roughness: 0.94 });
  const waterMaterial = new THREE.MeshStandardMaterial({ color: 0x176b80, roughness: 0.34, metalness: 0.08 });

  // A small ocean patch also covers the outer end of the City approach bridge.
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(alongZ ? width + 38 : length + 38, alongZ ? length + 38 : width + 38),
    waterMaterial
  );
  water.name = `coastline-bridge-water-${name}`;
  water.rotation.x = -Math.PI / 2;
  water.position.set(
    alongZ ? origin.x : origin.x + direction * length * 0.5,
    y - COASTLINE_ISLAND_WATER_DROP,
    alongZ ? origin.z + direction * length * 0.5 : origin.z
  );
  water.receiveShadow = false;
  group.add(water);

  const plankCount = Math.max(12, Math.ceil(length / 100 * COASTLINE_ROPE_BRIDGE_CONFIG.plankCountPer100Units));
  const plankLength = Math.max(0.45, length / plankCount - COASTLINE_ROPE_BRIDGE_CONFIG.plankGap);
  const plankGeometry = alongZ
    ? new THREE.BoxGeometry(width, 0.17, plankLength)
    : new THREE.BoxGeometry(plankLength, 0.17, width);
  const planks = new THREE.InstancedMesh(plankGeometry, plankMaterial, plankCount);
  planks.name = `coastline-bridge-planks-${name}`;
  planks.castShadow = true;
  planks.receiveShadow = true;
  const dummy = new THREE.Object3D();
  const sagAt = t => Math.sin(Math.PI * t) * COASTLINE_ROPE_BRIDGE_CONFIG.deckSag;
  for (let i = 0; i < plankCount; i++) {
    const t = (i + 0.5) / plankCount;
    const along = direction * length * t;
    const x = alongZ ? origin.x : origin.x + along;
    const z = alongZ ? origin.z + along : origin.z;
    dummy.position.set(x, y + 0.02 - sagAt(t), z);
    dummy.rotation.set(0, i % 2 ? 0.006 : -0.006, 0);
    dummy.updateMatrix();
    planks.setMatrixAt(i, dummy.matrix);
  }
  planks.instanceMatrix.needsUpdate = true;
  planks.computeBoundingSphere();
  group.add(planks);

  const postCount = Math.ceil(length / COASTLINE_ROPE_BRIDGE_CONFIG.postSpacing) + 1;
  const postGeometry = new THREE.BoxGeometry(0.2, 1.55, 0.2);
  const posts = new THREE.InstancedMesh(postGeometry, postMaterial, postCount * 2);
  posts.name = `coastline-bridge-rope-posts-${name}`;
  posts.castShadow = true;
  let postIndex = 0;
  for (let i = 0; i < postCount; i++) {
    const t = Math.min(1, i / (postCount - 1));
    const along = direction * length * t;
    const x = alongZ ? origin.x : origin.x + along;
    const z = alongZ ? origin.z + along : origin.z;
    const deckY = y + 0.02 - sagAt(t);
    for (const side of [-1, 1]) {
      dummy.position.set(
        x + (alongZ ? side * (width / 2 - 0.12) : 0),
        deckY + 0.78,
        z + (alongZ ? 0 : side * (width / 2 - 0.12))
      );
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      posts.setMatrixAt(postIndex++, dummy.matrix);
    }
  }
  posts.instanceMatrix.needsUpdate = true;
  posts.computeBoundingSphere();
  group.add(posts);

  // Two sagging hand ropes and two lower safety ropes: exposed sides, no solid guardrails.
  for (const side of [-1, 1]) {
    for (const rail of [{ height: COASTLINE_ROPE_BRIDGE_CONFIG.railHeight, sag: 1 }, { height: 0.72, sag: 1 }]) {
      const points = [];
      for (let i = 0; i <= 32; i++) {
        const t = i / 32;
        const along = direction * length * t;
        const x = alongZ ? origin.x + side * (width / 2) : origin.x + along;
        const z = alongZ ? origin.z + along : origin.z + side * (width / 2);
        points.push(new THREE.Vector3(x, y + rail.height - sagAt(t) * rail.sag, z));
      }
      const curve = new THREE.CatmullRomCurve3(points);
      const rope = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 64, COASTLINE_ROPE_BRIDGE_CONFIG.ropeRadius, 5, false),
        ropeMaterial
      );
      rope.name = `coastline-bridge-rope-${name}-${side}-${rail.height}`;
      rope.castShadow = true;
      group.add(rope);
    }
  }

  // Short vertical lashings make the rope structure readable without hundreds of draw calls.
  const lashingPositions = [];
  const lashingCount = Math.ceil(length / 4.5);
  for (let i = 0; i <= lashingCount; i++) {
    const t = Math.min(1, i / lashingCount);
    const along = direction * length * t;
    const x = alongZ ? origin.x : origin.x + along;
    const z = alongZ ? origin.z + along : origin.z;
    const deckY = y + 0.1 - sagAt(t);
    for (const side of [-1, 1]) {
      const sx = x + (alongZ ? side * (width / 2) : 0);
      const sz = z + (alongZ ? 0 : side * (width / 2));
      lashingPositions.push(new THREE.Vector3(sx, deckY + 0.25, sz));
      lashingPositions.push(new THREE.Vector3(sx, y + COASTLINE_ROPE_BRIDGE_CONFIG.railHeight - sagAt(t), sz));
    }
  }
  const lashGeometry = new THREE.BufferGeometry().setFromPoints(lashingPositions);
  const lashings = new THREE.LineSegments(lashGeometry, new THREE.LineBasicMaterial({ color: 0x8c6b48 }));
  lashings.name = `coastline-bridge-rope-lashings-${name}`;
  group.add(lashings);

  root.add(group);
  return group;
}

function addBridge(THREE, root, { x, startZ, y, length = 100 }) {
  return buildRopeBridge(THREE, root, {
    axis: 'z', origin: { x, z: startZ }, direction: -1, y, length, name: 'city-island',
  });
}

function addSideBridge(THREE, root, { edgeX, z, y, length = 100, direction = 1, name = 'coastal-link' }) {
  return buildRopeBridge(THREE, root, {
    axis: 'x', origin: { x: edgeX, z }, direction, y, length, name,
  });
}

function createRoundedSquareShape(THREE, halfExtent=110, cornerRadius=20) { const edge=halfExtent,inner=edge-cornerRadius,shape=new THREE.Shape(); shape.moveTo(-inner,-edge);shape.lineTo(inner,-edge);shape.quadraticCurveTo(edge,-edge,edge,-inner);shape.lineTo(edge,inner);shape.quadraticCurveTo(edge,edge,inner,edge);shape.lineTo(-inner,edge);shape.quadraticCurveTo(-edge,edge,-edge,inner);shape.lineTo(-edge,-inner);shape.quadraticCurveTo(-edge,-edge,-inner,-edge);return shape; }

export function createCoastlineWorldTransitions({ THREE, scene, roots, player, vehicles, avatar, groundY }) {
  const ISLAND_CENTER=Object.freeze({x:500,z:500}), ISLAND_BOUNDS=Object.freeze({minX:390,maxX:610,minZ:390,maxZ:610,width:220,depth:220}), BRIDGE_LENGTH=100;
  const ISLAND_BRIDGE_START_Z=ISLAND_BOUNDS.minZ, ISLAND_BRIDGE_END_Z=ISLAND_BRIDGE_START_Z-BRIDGE_LENGTH;
  const CITY_MAP_EDGE_Z=-750, CITY_BRIDGE_START_Z=CITY_MAP_EDGE_Z, CITY_BRIDGE_END_Z=CITY_BRIDGE_START_Z-BRIDGE_LENGTH;
  const islandGroundY=(x,z)=>finiteOr(groundY(x,z))+(window.__coastlineWorld2Active?0:COASTLINE_ISLAND_ELEVATION);
  const ISLAND_START=Object.freeze({x:500,y:islandGroundY(500,420),z:420,rotationY:Math.PI}), ISLAND_APPROACH=Object.freeze({x:500,z:ISLAND_BRIDGE_END_Z+5,rotationY:Math.PI}), CITY_APPROACH=Object.freeze({x:0,z:CITY_BRIDGE_END_Z-5,rotationY:Math.PI});
  const ISLAND_BRIDGE_DESTINATION=Object.freeze({x:500,y:islandGroundY(500,ISLAND_BRIDGE_END_Z),z:ISLAND_BRIDGE_END_Z,rotationY:0}), CITY_BRIDGE_DESTINATION=Object.freeze({x:0,y:finiteOr(groundY(0,CITY_BRIDGE_END_Z)),z:CITY_BRIDGE_END_Z,rotationY:0});
  let pendingIslandRoot=null,pendingGarageRoot=null,pendingHouseRoot=null,garageVehicle=null,garageBoardButton=null,previousVehiclePosition=null,previousFootPosition=null,failNextIslandLoad=false,updatePromptCallback=()=>{},autoTransitionPromise=null,lastAutoTrigger={eligible:false,reason:'not-checked',world:null,x:null,z:null,heading:null,error:null};
  const setIslandCollisionScope=active=>{window.__coastlineWorld2Active=Boolean(active);};
  const manager=createTransitionManager({onEvent:event=>window.dispatchEvent(new CustomEvent(`coastline:${event.type}`,{detail:event}))});
  const capturePlayer=()=>({mode:player.mode,position:{x:finiteOr(player.x),y:finiteOr(player.y),z:finiteOr(player.z)},rotationY:finiteOr(player.heading),vehicleIndex:player.mode==='vehicle'?vehicles.indexOf(player.vehicle):-1});
  const captureVehicle=()=>{if(player.mode!=='vehicle'||!player.vehicle)return null;const vehicle=player.vehicle;return{id:String(vehicle.worldEntityId??vehicle.kind??'active-vehicle'),position:{x:finiteOr(vehicle.x,player.x),y:finiteOr(vehicle.g?.position?.y),z:finiteOr(vehicle.z,player.z)},rotationY:finiteOr(vehicle.heading,player.heading),heading:finiteOr(vehicle.heading,player.heading),speed:finiteOr(vehicle.speed)};};
  const makeContext=()=>({player:capturePlayer(),vehicle:captureVehicle(),vehicleIndex:player.mode==='vehicle'?vehicles.indexOf(player.vehicle):-1});
  const activeActor=()=>player.mode==='vehicle'&&player.vehicle?.g?player.vehicle.g:avatar;
  const hierarchySignature=root=>{if(!root)return null;let descendants=0,meshes=0,visibleMeshes=0;root.traverse(node=>{descendants++;if(node.isMesh){meshes++;if(node.visible!==false)visibleMeshes++;}});return{name:String(root.name||'unnamed'),descendants,meshes,visibleMeshes};};
  const visualIdentity=()=>({vehicle:player.vehicle?{id:String(player.vehicle.worldEntityId??player.vehicle.kind??'active-vehicle'),kind:String(player.vehicle.kind??''),hierarchy:hierarchySignature(player.vehicle.g)}:null,hero:hierarchySignature(avatar)});
  const makeVehicleRenderable=vehicle=>{if(!vehicle?.g)return;vehicle.g.visible=true;vehicle.g.traverse(node=>{node.visible=true;node.userData.coastlineAlwaysVisible=true;});};
  const moveActiveActor=root=>{const actor=activeActor();if(avatar&&avatar.parent!==root)root.add(avatar);const vehicleToMove=player.mode==='vehicle'&&player.vehicle?player.vehicle:(root?.name==='coastline-homey-garage-interior'?garageVehicle:null);if(vehicleToMove?.g&&vehicleToMove.g.parent!==root)root.add(vehicleToMove.g);if(actor&&actor.parent!==root)root.add(actor);if(vehicleToMove)makeVehicleRenderable(vehicleToMove);};
  const applySnapshot=(snapshot,root,spawn=null)=>{if(!snapshot)return;const state=snapshot.player?snapshot:{player:snapshot},playerState=state.player||{},position=playerState.position||{};player.mode=playerState.mode||player.mode;player.x=finiteOr(position.x,player.x);player.y=finiteOr(position.y,0);player.z=finiteOr(position.z,player.z);player.heading=finiteOr(playerState.rotationY,player.heading);if(Number.isInteger(state.vehicleIndex)&&state.vehicleIndex>=0&&vehicles[state.vehicleIndex])player.vehicle=vehicles[state.vehicleIndex];const vehicle=player.vehicle;if(vehicle&&state.vehicle&&(player.mode==='vehicle'||state.vehicleIndex>=0)){const vehicleState=state.vehicle;vehicle.x=finiteOr(vehicleState.position?.x,player.x);vehicle.z=finiteOr(vehicleState.position?.z,player.z);vehicle.heading=finiteOr(vehicleState.heading,finiteOr(vehicleState.rotationY,player.heading));vehicle.speed=finiteOr(vehicleState.speed);if(vehicle.g){vehicle.g.position.set(vehicle.x,finiteOr(vehicleState.position?.y,groundY(vehicle.x,vehicle.z)),vehicle.z);vehicle.g.rotation.y=vehicle.heading;if(vehicle.g.parent!==root)root.add(vehicle.g);makeVehicleRenderable(vehicle);}}else if(avatar&&avatar.parent!==root)root.add(avatar);if(spawn){const x=finiteOr(spawn.x,player.x),z=finiteOr(spawn.z,player.z),y=finiteOr(spawn.y,groundY(x,z));player.x=x;player.y=y;player.z=z;player.heading=finiteOr(spawn.rotationY,player.heading);if(player.mode==='vehicle'&&player.vehicle){const currentVehicle=player.vehicle;currentVehicle.x=x;currentVehicle.z=z;currentVehicle.heading=player.heading;currentVehicle.speed=0;if(currentVehicle.g){currentVehicle.g.position.set(x,y,z);currentVehicle.g.rotation.y=player.heading;if(currentVehicle.g.parent!==root)root.add(currentVehicle.g);makeVehicleRenderable(currentVehicle);}}else if(avatar){avatar.position.set(x,y,z);avatar.rotation.y=player.heading;if(avatar.parent!==root)root.add(avatar);}}else if(player.mode!=='vehicle'&&avatar){avatar.position.set(player.x,groundY(player.x,player.z),player.z);avatar.rotation.y=player.heading;if(avatar.parent!==root)root.add(avatar);}};
  const createNakedIslandRoot=()=>createCoastlineIslandRoot({THREE,region:getCoastlineIslandRegion('residential'),groundY,addBridge,addSideBridge});
  const createGarageRoot=()=>{const root=buildHomeyGarageInterior(THREE,{centerX:483,centerZ:500,floorY:islandGroundY(483,500)});root.userData.coastlineGarageFloorY=islandGroundY(483,500);return root;};
  const createHouseRoot=()=>buildHomeyHouseInterior(THREE,{centerX:483,centerZ:500,floorY:islandGroundY(483,500)});
  const addCityBridgeAffordance=()=>addBridge(THREE,roots.world1Root,{x:0,startZ:CITY_BRIDGE_START_Z,y:finiteOr(groundY(0,CITY_BRIDGE_START_Z)),length:BRIDGE_LENGTH});
  const cityWorld={id:'city',name:'Coastline City',load:async({context,destinationSpawn})=>{setIslandCollisionScope(false);window.__coastlineActiveWorldId='city';window.__coastlineActiveWorldColliders=[];roots.world1Root.visible=true;moveActiveActor(roots.world1Root);if(destinationSpawn)applySnapshot({player:context.player,vehicle:context.vehicle,vehicleIndex:context.vehicleIndex},roots.world1Root,destinationSpawn);return{id:'city',root:roots.world1Root};},unload:async handle=>{handle.root.visible=false;},captureState:async({context})=>({player:context.player,vehicle:context.vehicle,vehicleIndex:context.vehicleIndex}),restoreState:async(worldState,{handle,destinationSpawn})=>{setIslandCollisionScope(false);handle.root.visible=true;moveActiveActor(handle.root);applySnapshot(worldState,handle.root,destinationSpawn);}};
  const islandWorld={id:'island',name:'Coastline Island Start',load:async({context,destinationSpawn})=>{setIslandCollisionScope(true);window.__coastlineActiveWorldId='island';window.__coastlineActiveWorldColliders=[];pendingIslandRoot=createNakedIslandRoot();roots.addWorldRoot(pendingIslandRoot);pendingIslandRoot.visible=true;moveActiveActor(pendingIslandRoot);applySnapshot({player:context.player,vehicle:context.vehicle,vehicleIndex:context.vehicleIndex},pendingIslandRoot,destinationSpawn||ISLAND_START);if(failNextIslandLoad){failNextIslandLoad=false;throw new Error('injected island load failure');}return{id:'island',root:pendingIslandRoot};},unload:async handle=>{setIslandCollisionScope(false);if(handle.root?.parent)roots.removeWorldRoot(handle.root);disposeRoot(handle.root);if(pendingIslandRoot===handle.root)pendingIslandRoot=null;},cleanupFailedLoad:async({context})=>{setIslandCollisionScope(false);window.__coastlineActiveWorldId='city';window.__coastlineActiveWorldColliders=[];if(!pendingIslandRoot)return;roots.world1Root.visible=true;moveActiveActor(roots.world1Root);applySnapshot({player:context.player,vehicle:context.vehicle,vehicleIndex:context.vehicleIndex},roots.world1Root);roots.removeWorldRoot(pendingIslandRoot);disposeRoot(pendingIslandRoot);pendingIslandRoot=null;},captureState:async({context})=>({player:context.player,vehicle:context.vehicle,vehicleIndex:context.vehicleIndex}),restoreState:async(worldState,{handle,destinationSpawn})=>{setIslandCollisionScope(true);handle.root.visible=true;moveActiveActor(handle.root);applySnapshot(worldState,handle.root,destinationSpawn);}};
  const pendingRegionRoots=new Map();
  const createAdditionalIslandWorld=(regionId,worldId)=>({
    id:worldId,
    name:getCoastlineIslandRegion(regionId).title,
    content:{density:'developed',actorAssets:'shared',renderReadiness:'required'},
    load:async({context,destinationSpawn})=>{
      setIslandCollisionScope(true);window.__coastlineActiveWorldId=worldId;window.__coastlineActiveWorldColliders=[];
      const root=createCoastlineIslandRoot({THREE,region:getCoastlineIslandRegion(regionId),groundY,addBridge,addSideBridge});
      roots.addWorldRoot(root);root.visible=true;pendingRegionRoots.set(worldId,root);
      moveActiveActor(root);
      const fallbackSpawn={x:420,y:islandGroundY(420,500),z:500,rotationY:Math.PI/2};
      applySnapshot({player:context.player,vehicle:context.vehicle,vehicleIndex:context.vehicleIndex},root,destinationSpawn||fallbackSpawn);
      return{id:worldId,root};
    },
    unload:async handle=>{
      setIslandCollisionScope(false);
      if(handle.root?.parent)roots.removeWorldRoot(handle.root);
      disposeRoot(handle.root);
      if(pendingRegionRoots.get(worldId)===handle.root)pendingRegionRoots.delete(worldId);
    },
    cleanupFailedLoad:async({context})=>{
      setIslandCollisionScope(manager.getActiveWorldId()!=='city');
      const root=pendingRegionRoots.get(worldId);
      if(root){const activeId=manager.getActiveWorldId(),sourceRoot=activeId==='city'?roots.world1Root:activeId==='island'?pendingIslandRoot:pendingRegionRoots.get(activeId);window.__coastlineActiveWorldId=activeId;window.__coastlineActiveWorldColliders=sourceRoot?.userData?.coastlineColliders||[];if(sourceRoot){moveActiveActor(sourceRoot);applySnapshot({player:context.player,vehicle:context.vehicle,vehicleIndex:context.vehicleIndex},sourceRoot);}if(root.parent)roots.removeWorldRoot(root);disposeRoot(root);pendingRegionRoots.delete(worldId);}
    },
    captureState:async({context})=>({player:context.player,vehicle:context.vehicle,vehicleIndex:context.vehicleIndex}),
    restoreState:async(worldState,{handle,destinationSpawn})=>{setIslandCollisionScope(true);handle.root.visible=true;moveActiveActor(handle.root);applySnapshot(worldState,handle.root,destinationSpawn);}
  });
  const waterfrontWorld=createAdditionalIslandWorld('waterfront','waterfront');
  const portWorld=createAdditionalIslandWorld('port','port');
  const garageWorld={id:'homey-garage',name:'Homey Island Motor Club Garage',content:{density:'developed',actorAssets:'shared',renderReadiness:'required'},load:async({context,destinationSpawn})=>{setIslandCollisionScope(true);window.__coastlineActiveWorldId='homey-garage';pendingGarageRoot=createGarageRoot();roots.addWorldRoot(pendingGarageRoot);pendingGarageRoot.visible=true;window.__coastlineGarageRoot=pendingGarageRoot;garageVehicle=Number.isInteger(context.vehicleIndex)&&vehicles[context.vehicleIndex]?vehicles[context.vehicleIndex]:(garageVehicle||player.vehicle);moveActiveActor(pendingGarageRoot);const spawn=destinationSpawn||{x:483,y:islandGroundY(483,500),z:500,rotationY:Math.PI};applySnapshot({player:context.player,vehicle:context.vehicle,vehicleIndex:context.vehicleIndex},pendingGarageRoot,spawn);window.__coastlineActiveWorldColliders=pendingGarageRoot.userData.coastlineColliders||[];previousVehiclePosition=null;return{id:'homey-garage',root:pendingGarageRoot};},unload:async handle=>{if(handle.root?.parent)roots.removeWorldRoot(handle.root);disposeRoot(handle.root);if(pendingGarageRoot===handle.root){pendingGarageRoot=null;window.__coastlineGarageRoot=null;}},cleanupFailedLoad:async({context})=>{window.__coastlineActiveWorldId=manager.getActiveWorldId()||'island';setIslandCollisionScope(true);const sourceRoot=manager.getActiveWorldId()==='city'?roots.world1Root:manager.getActiveWorldId()==='island'?pendingIslandRoot:pendingRegionRoots.get(manager.getActiveWorldId());window.__coastlineActiveWorldColliders=sourceRoot?.userData?.coastlineColliders||[];if(sourceRoot){moveActiveActor(sourceRoot);applySnapshot({player:context.player,vehicle:context.vehicle,vehicleIndex:context.vehicleIndex},sourceRoot);}if(pendingGarageRoot?.parent)roots.removeWorldRoot(pendingGarageRoot);if(pendingGarageRoot)disposeRoot(pendingGarageRoot);pendingGarageRoot=null;window.__coastlineGarageRoot=null;},captureState:async({context})=>({player:context.player,vehicle:context.vehicle,vehicleIndex:context.vehicleIndex}),restoreState:async(worldState,{handle,destinationSpawn})=>{setIslandCollisionScope(true);window.__coastlineActiveWorldId='homey-garage';pendingGarageRoot=handle.root;window.__coastlineGarageRoot=handle.root;handle.root.visible=true;moveActiveActor(handle.root);applySnapshot(worldState,handle.root,destinationSpawn);}};
  const houseWorld={id:'home-interior',name:'Homey Island House Interior',content:{density:'developed',actorAssets:'shared',renderReadiness:'required'},load:async({context,destinationSpawn})=>{setIslandCollisionScope(true);window.__coastlineActiveWorldId='home-interior';pendingHouseRoot=createHouseRoot();roots.addWorldRoot(pendingHouseRoot);pendingHouseRoot.visible=true;const parkedVehicle=garageVehicle||player.vehicle;if(parkedVehicle?.g){parkedVehicle.g.visible=false;if(parkedVehicle.g.parent!==roots.world1Root)roots.world1Root.add(parkedVehicle.g);}if(avatar&&avatar.parent!==pendingHouseRoot)pendingHouseRoot.add(avatar);const spawn=destinationSpawn||{x:483,y:islandGroundY(483,500),z:500,rotationY:0};applySnapshot({player:context.player,vehicle:context.vehicle,vehicleIndex:context.vehicleIndex},pendingHouseRoot,spawn);window.__coastlineActiveWorldColliders=pendingHouseRoot.userData.coastlineColliders||[];return{id:'home-interior',root:pendingHouseRoot};},unload:async handle=>{if(handle.root?.parent)roots.removeWorldRoot(handle.root);disposeRoot(handle.root);if(pendingHouseRoot===handle.root)pendingHouseRoot=null;},cleanupFailedLoad:async({context})=>{const activeId=manager.getActiveWorldId(),sourceRoot=activeId==='city'?roots.world1Root:activeId==='island'?pendingIslandRoot:activeId==='homey-garage'?pendingGarageRoot:pendingRegionRoots.get(activeId);window.__coastlineActiveWorldId=activeId||'homey-garage';window.__coastlineActiveWorldColliders=sourceRoot?.userData?.coastlineColliders||[];if(sourceRoot){moveActiveActor(sourceRoot);applySnapshot({player:context.player,vehicle:context.vehicle,vehicleIndex:context.vehicleIndex},sourceRoot);}if(pendingHouseRoot?.parent)roots.removeWorldRoot(pendingHouseRoot);if(pendingHouseRoot)disposeRoot(pendingHouseRoot);pendingHouseRoot=null;},captureState:async({context})=>({player:context.player,vehicle:context.vehicle,vehicleIndex:context.vehicleIndex}),restoreState:async(worldState,{handle,destinationSpawn})=>{setIslandCollisionScope(true);window.__coastlineActiveWorldId='home-interior';pendingHouseRoot=handle.root;handle.root.visible=true;const parkedVehicle=garageVehicle||player.vehicle;if(parkedVehicle?.g){parkedVehicle.g.visible=false;if(parkedVehicle.g.parent!==roots.world1Root)roots.world1Root.add(parkedVehicle.g);}if(avatar&&avatar.parent!==handle.root)handle.root.add(avatar);applySnapshot(worldState,handle.root,destinationSpawn);}};
  manager.registerWorld(cityWorld);manager.registerWorld(islandWorld);manager.registerWorld(waterfrontWorld);manager.registerWorld(portWorld);manager.registerWorld(garageWorld);manager.registerWorld(houseWorld);manager.registerTransition({id:'city-to-island',fromWorld:'city',toWorld:'island',trigger:'bridge',spawn:'fixed',destinationSpawn:ISLAND_BRIDGE_DESTINATION,vehiclePolicy:'allowed'});manager.registerTransition({id:'island-to-city',fromWorld:'island',toWorld:'city',trigger:'bridge',spawn:'fixed',destinationSpawn:CITY_BRIDGE_DESTINATION,vehiclePolicy:'allowed'});manager.registerTransition({id:'island-to-waterfront',fromWorld:'island',toWorld:'waterfront',trigger:'bridge',spawn:'fixed',destinationSpawn:{x:420,y:islandGroundY(420,500),z:500,rotationY:Math.PI/2},vehiclePolicy:'allowed'});manager.registerTransition({id:'waterfront-to-island',fromWorld:'waterfront',toWorld:'island',trigger:'bridge',spawn:'fixed',destinationSpawn:{x:580,y:islandGroundY(580,500),z:500,rotationY:-Math.PI/2},vehiclePolicy:'allowed'});manager.registerTransition({id:'waterfront-to-port',fromWorld:'waterfront',toWorld:'port',trigger:'bridge',spawn:'fixed',destinationSpawn:{x:420,y:islandGroundY(420,500),z:500,rotationY:Math.PI/2},vehiclePolicy:'allowed'});manager.registerTransition({id:'port-to-waterfront',fromWorld:'port',toWorld:'waterfront',trigger:'bridge',spawn:'fixed',destinationSpawn:{x:580,y:islandGroundY(580,500),z:500,rotationY:-Math.PI/2},vehiclePolicy:'allowed'});manager.registerTransition({id:'island-to-homey-garage',fromWorld:'island',toWorld:'homey-garage',trigger:'garage',spawn:'fixed',destinationSpawn:{x:483,y:islandGroundY(483,500),z:500,rotationY:Math.PI},vehiclePolicy:'required'});manager.registerTransition({id:'homey-garage-to-island',fromWorld:'homey-garage',toWorld:'island',trigger:'garage',spawn:'fixed',destinationSpawn:{x:483,y:islandGroundY(483,484),z:484,rotationY:Math.PI},vehiclePolicy:'required'});manager.registerTransition({id:'homey-garage-to-house',fromWorld:'homey-garage',toWorld:'home-interior',trigger:'door',spawn:'fixed',destinationSpawn:{x:483,y:islandGroundY(483,500),z:500,rotationY:0},vehiclePolicy:'forbidden'});manager.registerTransition({id:'home-to-homey-garage',fromWorld:'home-interior',toWorld:'homey-garage',trigger:'door',spawn:'fixed',destinationSpawn:{x:483,y:islandGroundY(483,500),z:512.5,rotationY:Math.PI},vehiclePolicy:'forbidden'});
  const transition=async transitionId=>{if(autoTransitionPromise)return autoTransitionPromise;autoTransitionPromise=manager.transition(transitionId,makeContext()).then(()=>{const activeId=manager.getActiveWorldId(),activeRoot=activeId==='city'?roots.world1Root:activeId==='island'?pendingIslandRoot:activeId==='homey-garage'?pendingGarageRoot:activeId==='home-interior'?pendingHouseRoot:pendingRegionRoots.get(activeId);window.__coastlineBridgeBufferActive=activeId==='city';setIslandCollisionScope(activeId!=='city');window.__coastlineActiveWorldId=activeId;window.__coastlineActiveWorldColliders=activeRoot?.userData?.coastlineColliders||[];previousVehiclePosition=null;previousFootPosition=null;return manager.getStatus();}).finally(()=>{autoTransitionPromise=null;});return autoTransitionPromise;};
  const initialize=async()=>{addCityBridgeAffordance();setIslandCollisionScope(false);window.__coastlineBridgeBufferActive=true;roots.world1Root.visible=true;await manager.activate('city',makeContext());window.__coastlineActiveWorldId='city';window.__coastlineActiveWorldColliders=[];const garageUseButton=document.createElement('button');garageUseButton.id='coastlineGarageUseBoard';garageUseButton.type='button';garageUseButton.textContent='USE KEY BOARD';garageUseButton.setAttribute('aria-label','Use garage vehicle key board');garageUseButton.style.cssText='display:none;position:fixed;left:50%;bottom:118px;transform:translateX(-50%);z-index:1001;pointer-events:auto;border:1px solid #8be8ff88;border-radius:13px;padding:11px 15px;background:#0b2732f5;color:#effcff;font:900 13px system-ui,sans-serif;letter-spacing:.07em;box-shadow:0 8px 24px #0008';document.body.appendChild(garageUseButton);garageBoardButton=garageUseButton;const swapGarageVehicle=choice=>{const current=garageVehicle||vehicles.find(v=>v?.kind==='car'&&Math.hypot(v.x-483,v.z-500)<5);const donor=vehicles.find(v=>v?.kind==='car'&&v!==current&&v.rgsdevModelName===choice.model&&v.g?.children?.length)||(current?.rgsdevModelName===choice.model&&current.g?.children?.length?current:null);if(!current||!donor){garageUseButton.textContent='VEHICLE NOT READY — TRY AGAIN';return;}const sourceVisual=donor.g.children.find(child=>child.visible!==false)||donor.g.children[0];if(!sourceVisual){garageUseButton.textContent='VEHICLE NOT READY — TRY AGAIN';return;}const sourceMeshes=[];sourceVisual.traverse(node=>{if(node.isMesh)sourceMeshes.push(node)});const clone=sourceVisual.clone(true),cloneMeshes=[];clone.traverse(node=>{if(node.isMesh){cloneMeshes.push(node);node.userData.coastlineSharedGeometry=true;node.userData.coastlineOwnedMaterial=true;node.material=Array.isArray(node.material)?node.material.map(material=>material?.clone?.()||material):node.material?.clone?.()||node.material;}});const roleIndices={body:(donor.materialRoles?.body||[]).map(mesh=>sourceMeshes.indexOf(mesh)).filter(i=>i>=0),glass:(donor.materialRoles?.glass||[]).map(mesh=>sourceMeshes.indexOf(mesh)).filter(i=>i>=0),wheels:(donor.materialRoles?.wheels||[]).map(mesh=>sourceMeshes.indexOf(mesh)).filter(i=>i>=0),lights:(donor.materialRoles?.lights||[]).map(mesh=>sourceMeshes.indexOf(mesh)).filter(i=>i>=0)};for(const index of roleIndices.body){const mesh=cloneMeshes[index];if(!mesh)continue;for(const material of (Array.isArray(mesh.material)?mesh.material:[mesh.material]))if(material?.color)material.color.set(choice.color.hex);}for(const child of [...current.g.children]){current.g.remove(child);child.traverse?.(node=>{if(node.userData?.coastlineOwnedMaterial)for(const material of (Array.isArray(node.material)?node.material:[node.material]))material?.dispose?.();});}current.g.add(clone);const mapRole=key=>roleIndices[key].map(i=>cloneMeshes[i]).filter(Boolean);current.materialRoles={body:mapRole('body'),glass:mapRole('glass'),wheels:mapRole('wheels'),lights:mapRole('lights')};current.damageParts={body:null,cab:null,hood:null,trunk:null,roof:null,frontBumper:null,rearBumper:null,wheels:[],visualRoot:clone};current.basePaint=new THREE.Color(choice.color.hex);current.rgsdevModelName=choice.model;current.g.visible=true;current.g.position.set(483,islandGroundY(483,500),500);current.g.rotation.y=Math.PI;current.x=483;current.z=500;current.heading=Math.PI;current.speed=0;current.parked=true;current.occupied=false;current.drivable=true;current.worldX=483;current.worldZ=500;garageVehicle=current;garageUseButton.textContent='USE KEY BOARD';garageUseButton.title='Selected '+choice.model+' in '+choice.color.name;garageUseButton.setAttribute('aria-label','Vehicle ready: '+choice.model+', '+choice.color.name+'. Use key board to choose again');};garageUseButton.addEventListener('click',()=>{if(player.mode!=='walk'||manager.getActiveWorldId()!=='homey-garage')return;openGarageVehicleChooser({vehicles,currentVehicle:garageVehicle,onConfirm:swapGarageVehicle,onCancel:()=>{}});});const button=document.createElement('button');button.id='coastlineWorldTransition';button.type='button';button.setAttribute('aria-label','Cross bridge between Coastline Island and City');button.style.cssText='display:none;position:fixed;left:50%;bottom:170px;transform:translateX(-50%);z-index:1000;pointer-events:auto;border:1px solid #a7f4ff88;border-radius:12px;padding:6px 8px;background:#06202aee;color:#effcff;font:800 12px system-ui,sans-serif;letter-spacing:.08em;box-shadow:0 8px 24px #0008';let promptedTransitionId='city-to-island';
    button.addEventListener('click',()=>transition(promptedTransitionId).catch(error=>{button.textContent=`TRANSITION FAILED: ${error.message}`;}));
    document.body.appendChild(button);
    updatePromptCallback=()=>{
      const activeWorld=manager.getActiveWorldId(),vehicle=player.mode==='vehicle'?player.vehicle:null,status=manager.getStatus();
      const garageCamera= pendingGarageRoot?.userData?.coastlineGarageCamera;
      if(garageCamera){
        const cameraActive=activeWorld==='homey-garage';
        if(garageCamera.ceiling)garageCamera.ceiling.visible=!cameraActive;
        for(const wall of garageCamera.sideWalls||[]){
          if(!wall.userData.coastlineGarageCameraMaterialState){
            const materials=Array.isArray(wall.material)?wall.material:[wall.material];
            wall.userData.coastlineGarageCameraMaterialState=materials.map(material=>({material,transparent:material.transparent,opacity:material.opacity,depthWrite:material.depthWrite}));
          }
          for(const saved of wall.userData.coastlineGarageCameraMaterialState){
            saved.material.transparent=cameraActive?true:saved.transparent;
            saved.material.opacity=cameraActive?0.16:saved.opacity;
            saved.material.depthWrite=cameraActive?false:saved.depthWrite;
            saved.material.needsUpdate=true;
          }
        }
      }
      const board=pendingGarageRoot?.userData?.coastlineGarageContract?.board;if(garageBoardButton)garageBoardButton.style.display=canUseGarageKeyBoard({worldId:activeWorld,mode:player.mode,player,board})?'block':'none';
      // Door transitions are driven by a real on-foot threshold crossing, never by proximity or a vehicle.
      if(player.mode==='walk'&&activeWorld){
        const currentFoot={x:finiteOr(player.x),z:finiteOr(player.z),heading:finiteOr(player.heading)};
        const previousFoot=previousFootPosition;
        const garageHouseThreshold={x:483,z:515.3,halfWidth:1.7};
        const houseExitThreshold={x:483,z:513,halfWidth:1.8};
        const enteredHouse=activeWorld==='homey-garage'&&didCrossHouseDoorThreshold(previousFoot,currentFoot,garageHouseThreshold);
        const leftHouse=activeWorld==='home-interior'&&didCrossHouseDoorThreshold(previousFoot,currentFoot,houseExitThreshold);
        previousFootPosition=currentFoot;
        if(enteredHouse&&!autoTransitionPromise){transition('homey-garage-to-house').catch(error=>{lastAutoTrigger={...lastAutoTrigger,eligible:false,reason:'house-entry-failed',error:String(error?.message||error)};});return;}
        if(leftHouse&&!autoTransitionPromise){transition('home-to-homey-garage').catch(error=>{lastAutoTrigger={...lastAutoTrigger,eligible:false,reason:'house-exit-failed',error:String(error?.message||error)};});return;}
      }else previousFootPosition=null;
      if(vehicle)makeVehicleRenderable(vehicle);
      if(!vehicle||!activeWorld){previousVehiclePosition=null;lastAutoTrigger={eligible:false,reason:'no-active-vehicle-or-world',world:activeWorld,x:vehicle?.x??null,z:vehicle?.z??null,heading:vehicle?.heading??null,error:null};button.style.display='none';return;}
      const gates={
        city:[{id:'city-to-island',axis:'z',x:0,z:CITY_BRIDGE_END_Z,sign:-1,target:{x:0,z:CITY_BRIDGE_START_Z},label:'CROSS TO RESIDENTIAL'}],
        island:[
          {id:'island-to-city',axis:'z',x:ISLAND_CENTER.x,z:ISLAND_BRIDGE_END_Z,sign:-1,target:{x:ISLAND_CENTER.x,z:ISLAND_BRIDGE_START_Z},label:'CROSS TO CITY'},
          {id:'island-to-waterfront',axis:'x',x:ISLAND_CENTER.x+ISLAND_BOUNDS.width/2+BRIDGE_LENGTH,z:ISLAND_CENTER.z,sign:1,target:{x:ISLAND_CENTER.x+ISLAND_BOUNDS.width/2,z:ISLAND_CENTER.z},label:'CROSS TO WATERFRONT'}
        ],
        waterfront:[
          {id:'waterfront-to-island',axis:'x',x:ISLAND_CENTER.x-ISLAND_BOUNDS.width/2-BRIDGE_LENGTH,z:ISLAND_CENTER.z,sign:-1,target:{x:ISLAND_CENTER.x-ISLAND_BOUNDS.width/2,z:ISLAND_CENTER.z},label:'CROSS TO RESIDENTIAL'},
          {id:'waterfront-to-port',axis:'x',x:ISLAND_CENTER.x+ISLAND_BOUNDS.width/2+BRIDGE_LENGTH,z:ISLAND_CENTER.z,sign:1,target:{x:ISLAND_CENTER.x+ISLAND_BOUNDS.width/2,z:ISLAND_CENTER.z},label:'CROSS TO PORT'}
        ],
        port:[{id:'port-to-waterfront',axis:'x',x:ISLAND_CENTER.x-ISLAND_BOUNDS.width/2-BRIDGE_LENGTH,z:ISLAND_CENTER.z,sign:-1,target:{x:ISLAND_CENTER.x-ISLAND_BOUNDS.width/2,z:ISLAND_CENTER.z},label:'CROSS TO WATERFRONT'}]
      }[activeWorld]||[];
      const vehicleX=finiteOr(vehicle.x,player.x),vehicleZ=finiteOr(vehicle.z,player.z),vehicleHeading=finiteOr(vehicle.heading,player.heading);const previous=previousVehiclePosition;const garageThreshold={x:483,z:488,halfWidth:7.2};const currentVehiclePosition={x:vehicleX,z:vehicleZ,heading:vehicleHeading};const garageCrossing=activeWorld==='island'&&didCrossGarageThreshold(previous,currentVehiclePosition,{...garageThreshold,direction:'in'});const garageExitCrossing=activeWorld==='homey-garage'&&didCrossGarageThreshold(previous,currentVehiclePosition,{...garageThreshold,direction:'out'});previousVehiclePosition={x:vehicleX,z:vehicleZ};if(garageCrossing&&!autoTransitionPromise){transition('island-to-homey-garage').catch(error=>{lastAutoTrigger={...lastAutoTrigger,eligible:false,reason:'garage-entry-failed',error:String(error?.message||error)};});return;}if(garageExitCrossing&&!autoTransitionPromise){transition('homey-garage-to-island').catch(error=>{lastAutoTrigger={...lastAutoTrigger,eligible:false,reason:'garage-exit-failed',error:String(error?.message||error)};});return;}
      const nearGate=gate=>gate.axis==='z'?Math.abs(vehicleX-gate.x)<=12&&Math.abs(vehicleZ-gate.z)<=18:Math.abs(vehicleZ-gate.z)<=12&&Math.abs(vehicleX-gate.x)<=18;
      const headingToGate=gate=>gate.axis==='z'?Math.cos(vehicleHeading)*gate.sign>.45:Math.sin(vehicleHeading)*gate.sign>.45;
      const gate=gates.find(candidate=>nearGate(candidate)&&headingToGate(candidate));
      const eligible=status.state==='active'&&Boolean(gate)&&!autoTransitionPromise;
      lastAutoTrigger={eligible,reason:status.state!=='active'?'manager-not-active':!gate?(gates.some(nearGate)?'wrong-heading':'outside-end-zone'):autoTransitionPromise?'transition-in-flight':'ready',world:activeWorld,x:vehicleX,z:vehicleZ,heading:vehicleHeading,transitionId:gate?.id??null,error:null};
      if(eligible)transition(gate.id).catch(error=>{lastAutoTrigger={...lastAutoTrigger,eligible:false,reason:'transition-error',error:String(error?.message||error)};button.textContent=`TRANSITION FAILED: ${error.message}`;});
      const prompts=gates.map(candidate=>({...candidate,distance:Math.hypot(candidate.target.x-player.x,candidate.target.z-player.z)})).filter(candidate=>candidate.distance<=26);
      prompts.sort((a,b)=>a.distance-b.distance);
      const prompt=prompts.find(candidate=>{
        const dx=candidate.target.x-player.x,dz=candidate.target.z-player.z,distance=Math.hypot(dx,dz);
        const dot=distance>.001?(dx*Math.sin(player.heading)+dz*Math.cos(player.heading))/distance:1;
        return dot>.45;
      });
      if(!prompt){button.style.display='none';return;}
      promptedTransitionId=prompt.id;
      button.textContent=prompt.label;
      button.style.display='block';
    };
    window.__coastlineTransitionTest={worldIds:()=>['city','island','waterfront','port','homey-garage','home-interior'],houseState:()=>({root:hierarchySignature(pendingHouseRoot),threshold:pendingHouseRoot?.userData?.coastlineHouseContract?.threshold??null,parkedVehicleHidden:Boolean((garageVehicle||player.vehicle)?.g&&(garageVehicle||player.vehicle).g.visible===false)}),islandDetailState:()=>Object.fromEntries([['residential',pendingIslandRoot],['waterfront',pendingRegionRoots.get('waterfront')],['port',pendingRegionRoots.get('port')]].map(([id,root])=>{let boundary=false,lamps=false,benches=0;if(root)root.traverse(node=>{if(node.name===`coastline-${id}-landscape-boundary-rocks`)boundary=true;if(node.name===`coastline-${id}-street-lamp-posts`)lamps=true;if(node.name.startsWith(`coastline-${id}-street-bench-seat-`))benches++;});return[id,{meshes:hierarchySignature(root)?.meshes??0,boundary,lamps,benches}]})),worldDefinitions:()=>manager.getWorldDefinitions(),garageState:()=>({root:hierarchySignature(pendingGarageRoot),floorY:pendingGarageRoot?.userData?.coastlineGarageFloorY??null,decorCount:pendingGarageRoot?.userData?.coastlineGarageDecorCount??0,garageDoorSlatCount:pendingGarageRoot?.children?.filter(node=>node.name.startsWith('garage-rollup-door-slat-')).length??0,houseDoorPresent:Boolean(pendingGarageRoot?.children?.find(node=>node.name==='garage-house-door-open-leaf')),cameraMode:manager.getActiveWorldId()==='homey-garage',ceilingVisible:pendingGarageRoot?.userData?.coastlineGarageCamera?.ceiling?.visible??null,sideWallOpacity:pendingGarageRoot?.userData?.coastlineGarageCamera?.sideWalls?.[0]?.material?.opacity??null,boardVisible:garageBoardButton?.style.display==='block',vehicleIndex:garageVehicle?vehicles.indexOf(garageVehicle):-1,threshold:pendingGarageRoot?.userData?.coastlineGarageContract?.threshold??null}),garageVehicleRef:()=>garageVehicle,vehicleMaterialSnapshot:(modelName,excludeIndex=-1)=>{const vehicle=vehicles.find(item=>item?.kind==='car'&&item.rgsdevModelName===modelName&&vehicles.indexOf(item)!==excludeIndex);if(!vehicle)return null;const colors=role=>(vehicle.materialRoles?.[role]||[]).map(mesh=>(Array.isArray(mesh.material)?mesh.material:[mesh.material]).map(material=>material?.color?.getHexString?.()??null));return{index:vehicles.indexOf(vehicle),body:colors('body'),glass:colors('glass'),wheels:colors('wheels'),lights:colors('lights')};},garageVehicleMaterialSnapshot:()=>{if(!garageVehicle)return null;const colors=role=>(garageVehicle.materialRoles?.[role]||[]).map(mesh=>(Array.isArray(mesh.material)?mesh.material:[mesh.material]).map(material=>material?.color?.getHexString?.()??null));return{body:colors('body'),glass:colors('glass'),wheels:colors('wheels'),lights:colors('lights')};},regionRoots:()=>({residential:hierarchySignature(pendingIslandRoot),waterfront:hierarchySignature(pendingRegionRoots.get('waterfront')),port:hierarchySignature(pendingRegionRoots.get('port'))}),activeWorldColliderCount:()=>window.__coastlineActiveWorldColliders?.length??0,status:()=>manager.getStatus(),autoTriggerState:()=>({...lastAutoTrigger}),playerState:()=>({position:{x:player.x,y:player.y,z:player.z},heading:player.heading,mode:player.mode,vehicleIndex:vehicles.indexOf(player.vehicle),vehicleSpeed:player.vehicle?.speed??0}),rootVisibility:()=>({cityVisible:roots.world1Root.visible,cityCachedInScene:Boolean(roots.world1Root.parent===scene),cityContent:hierarchySignature(roots.world1Root),islandVisible:Boolean(pendingIslandRoot?.visible),islandRootResident:Boolean(pendingIslandRoot?.parent===scene),islandContent:hierarchySignature(pendingIslandRoot)}),transition,updatePrompt:updatePromptCallback,flushAutoTransition:async()=>{if(autoTransitionPromise)await autoTransitionPromise;},failNextWorld2Load:()=>{failNextIslandLoad=true;},world2Spawn:()=>({...ISLAND_START}),bridgeZones:()=>({cityApproach:{...CITY_APPROACH},islandApproach:{...ISLAND_APPROACH}}),cityBridgeContract:()=>({bridgeLength:BRIDGE_LENGTH,cityMapEdge:CITY_MAP_EDGE_Z,cityEdge:CITY_BRIDGE_START_Z,bridgeEnd:CITY_BRIDGE_END_Z,playableCityMinZ:CITY_MAP_EDGE_Z,outsideBufferLength:BRIDGE_LENGTH,destination:{...CITY_BRIDGE_DESTINATION},spawnPolicy:'fixed'}),world2Layout:()=>({bounds:{...ISLAND_BOUNDS},spawn:{...ISLAND_START},islandBridge:{x:ISLAND_CENTER.x,z:ISLAND_BRIDGE_START_Z},islandBridgeDestination:{...ISLAND_BRIDGE_DESTINATION},spawnToIslandBridge:Math.hypot(ISLAND_START.x-ISLAND_CENTER.x,ISLAND_START.z-ISLAND_BRIDGE_START_Z),bridgeLength:BRIDGE_LENGTH,bridgeIslandEdge:ISLAND_BRIDGE_START_Z,bridgeCityEdge:ISLAND_BRIDGE_END_Z,palm:null}),visualIdentity,activeVehicleVisible:()=>Boolean(player.vehicle?.g&&player.vehicle.g.visible&&(()=>{let hidden=false;player.vehicle.g.traverse(node=>{if(node.visible===false)hidden=true;});return !hidden;})()),collisionScope:()=>Boolean(window.__coastlineWorld2Active)};
    window.addEventListener('keydown',updatePromptCallback);setInterval(()=>updatePromptCallback(),200);return manager;};
  const initializePromise=initialize();return{manager,ready:initializePromise,initialize:()=>initializePromise,updatePrompt:()=>updatePromptCallback(),dispose:async()=>{setIslandCollisionScope(false);garageBoardButton?.remove();if(pendingHouseRoot){roots.removeWorldRoot(pendingHouseRoot);disposeRoot(pendingHouseRoot);pendingHouseRoot=null;}if(pendingGarageRoot){roots.removeWorldRoot(pendingGarageRoot);disposeRoot(pendingGarageRoot);pendingGarageRoot=null;}if(pendingIslandRoot){roots.removeWorldRoot(pendingIslandRoot);disposeRoot(pendingIslandRoot);pendingIslandRoot=null;}}};
}
