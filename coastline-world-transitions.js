import { createTransitionManager } from './transition-manager.js';
import { createCoastlineIslandRoot, getCoastlineIslandRegion } from './coastline-island-regions.js';

export function createWorldRootRegistry({ THREE, scene }) {
  const originalAdd = scene.add.bind(scene), originalRemove = scene.remove.bind(scene), cityRoot = new THREE.Group();
  cityRoot.name = 'coastline-city-root'; originalAdd(cityRoot);
  scene.add = function (...objects) { for (const object of objects) { if (!object) continue; if (object === cityRoot || object.isCamera || object.userData?.coastlineGlobal || object.isAmbientLight || object.isHemisphereLight || object.isDirectionalLight) originalAdd(object); else cityRoot.add(object); } return this; };
  scene.remove = function (...objects) { for (const object of objects) { if (!object) continue; if (object.parent === cityRoot) cityRoot.remove(object); else originalRemove(object); } return this; };
  return { world1Root: cityRoot, cityRoot, addWorldRoot: root => (originalAdd(root), root), removeWorldRoot: root => originalRemove(root) };
}

const finiteOr = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;
const disposeRoot = root => root?.traverse(object => { object.geometry?.dispose?.(); const materials = Array.isArray(object.material) ? object.material : object.material ? [object.material] : []; for (const material of materials) material.dispose?.(); });

function addBridge(THREE, root, { x, startZ, y, length = 100 }) {
  const group = new THREE.Group(); group.name = 'coastline-bridge'; const centerZ = startZ - length * .5;
  const deckMaterial = new THREE.MeshStandardMaterial({ color: 0x343c3d, roughness: .88 }), railMaterial = new THREE.MeshStandardMaterial({ color: 0x9cc9bd, roughness: .72, metalness: .04 }), towerMaterial = new THREE.MeshStandardMaterial({ color: 0x66777a, roughness: .66, metalness: .25 });
  const deck = new THREE.Mesh(new THREE.BoxGeometry(16,.28,length), deckMaterial); deck.position.set(x,y+.08,centerZ); deck.receiveShadow=true; deck.castShadow=true; group.add(deck);
  for (const side of [-1,1]) { const rail=new THREE.Mesh(new THREE.BoxGeometry(.28,1.15,length),railMaterial); rail.position.set(x+side*8,y+.66,centerZ); rail.castShadow=true; group.add(rail); }
  for (const dz of [-length*.38,length*.38]) for (const side of [-1,1]) { const tower=new THREE.Mesh(new THREE.BoxGeometry(.7,6.2,.7),towerMaterial); tower.position.set(x+side*7.2,y+3.05,centerZ+dz); tower.castShadow=true; group.add(tower); }
  const cableMaterial=new THREE.LineBasicMaterial({color:0xb9d5d5});
  for (const side of [-1,1]) { const points=[]; for(let i=0;i<=16;i++){const t=i/16,z=startZ-length*t,sag=Math.sin(Math.PI*t)*3.8;points.push(new THREE.Vector3(x+side*7.2,y+6-sag,z));} group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),cableMaterial)); }
  root.add(group); return group;
}

function addSideBridge(THREE, root, { edgeX, z, y, length = 100, direction = 1, name = 'coastal-link' }) {
  const group = new THREE.Group();
  group.name = `coastline-bridge-${name}`;
  const centerX = edgeX + direction * length * 0.5;
  const deckMaterial = new THREE.MeshStandardMaterial({ color: 0x343c3d, roughness: 0.88 });
  const railMaterial = new THREE.MeshStandardMaterial({ color: 0x9cc9bd, roughness: 0.72, metalness: 0.04 });
  const towerMaterial = new THREE.MeshStandardMaterial({ color: 0x66777a, roughness: 0.66, metalness: 0.25 });
  const deck = new THREE.Mesh(new THREE.BoxGeometry(length, 0.28, 16), deckMaterial);
  deck.position.set(centerX, y + 0.08, z);
  deck.receiveShadow = true; deck.castShadow = true; group.add(deck);
  for (const side of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(length, 1.15, 0.28), railMaterial);
    rail.position.set(centerX, y + 0.66, z + side * 8);
    rail.castShadow = true; group.add(rail);
  }
  for (const end of [-0.38, 0.38]) for (const side of [-1, 1]) {
    const tower = new THREE.Mesh(new THREE.BoxGeometry(0.7, 6.2, 0.7), towerMaterial);
    tower.position.set(edgeX + direction * length * (0.5 + end), y + 3.05, z + side * 7.2);
    tower.castShadow = true; group.add(tower);
  }
  const cableMaterial = new THREE.LineBasicMaterial({ color: 0xb9d5d5 });
  for (const side of [-1, 1]) {
    const points = [];
    for (let i = 0; i <= 16; i++) {
      const t = i / 16;
      points.push(new THREE.Vector3(edgeX + direction * length * t, y + 6 - Math.sin(Math.PI * t) * 3.8, z + side * 7.2));
    }
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), cableMaterial));
  }
  root.add(group);
  return group;
}

function createRoundedSquareShape(THREE, halfExtent=110, cornerRadius=20) { const edge=halfExtent,inner=edge-cornerRadius,shape=new THREE.Shape(); shape.moveTo(-inner,-edge);shape.lineTo(inner,-edge);shape.quadraticCurveTo(edge,-edge,edge,-inner);shape.lineTo(edge,inner);shape.quadraticCurveTo(edge,edge,inner,edge);shape.lineTo(-inner,edge);shape.quadraticCurveTo(-edge,edge,-edge,inner);shape.lineTo(-edge,-inner);shape.quadraticCurveTo(-edge,-edge,-inner,-edge);return shape; }

export function createCoastlineWorldTransitions({ THREE, scene, roots, player, vehicles, avatar, groundY }) {
  const ISLAND_CENTER=Object.freeze({x:500,z:500}), ISLAND_BOUNDS=Object.freeze({minX:390,maxX:610,minZ:390,maxZ:610,width:220,depth:220}), BRIDGE_LENGTH=100;
  const ISLAND_BRIDGE_START_Z=ISLAND_BOUNDS.minZ, ISLAND_BRIDGE_END_Z=ISLAND_BRIDGE_START_Z-BRIDGE_LENGTH;
  const CITY_MAP_EDGE_Z=-750, CITY_BRIDGE_START_Z=CITY_MAP_EDGE_Z, CITY_BRIDGE_END_Z=CITY_BRIDGE_START_Z-BRIDGE_LENGTH;
  const ISLAND_START=Object.freeze({x:500,y:finiteOr(groundY(500,420)),z:420,rotationY:Math.PI}), ISLAND_APPROACH=Object.freeze({x:500,z:ISLAND_BRIDGE_END_Z+5,rotationY:Math.PI}), CITY_APPROACH=Object.freeze({x:0,z:CITY_BRIDGE_END_Z-5,rotationY:Math.PI});
  const ISLAND_BRIDGE_DESTINATION=Object.freeze({x:500,y:finiteOr(groundY(500,ISLAND_BRIDGE_END_Z)),z:ISLAND_BRIDGE_END_Z,rotationY:0}), CITY_BRIDGE_DESTINATION=Object.freeze({x:0,y:finiteOr(groundY(0,CITY_BRIDGE_END_Z)),z:CITY_BRIDGE_END_Z,rotationY:0});
  let pendingIslandRoot=null,failNextIslandLoad=false,updatePromptCallback=()=>{},autoTransitionPromise=null,lastAutoTrigger={eligible:false,reason:'not-checked',world:null,x:null,z:null,heading:null,error:null};
  const setIslandCollisionScope=active=>{window.__coastlineWorld2Active=Boolean(active);};
  const manager=createTransitionManager({onEvent:event=>window.dispatchEvent(new CustomEvent(`coastline:${event.type}`,{detail:event}))});
  const capturePlayer=()=>({mode:player.mode,position:{x:finiteOr(player.x),y:finiteOr(player.y),z:finiteOr(player.z)},rotationY:finiteOr(player.heading),vehicleIndex:player.mode==='vehicle'?vehicles.indexOf(player.vehicle):-1});
  const captureVehicle=()=>{if(player.mode!=='vehicle'||!player.vehicle)return null;const vehicle=player.vehicle;return{id:String(vehicle.worldEntityId??vehicle.kind??'active-vehicle'),position:{x:finiteOr(vehicle.x,player.x),y:finiteOr(vehicle.g?.position?.y),z:finiteOr(vehicle.z,player.z)},rotationY:finiteOr(vehicle.heading,player.heading),heading:finiteOr(vehicle.heading,player.heading),speed:finiteOr(vehicle.speed)};};
  const makeContext=()=>({player:capturePlayer(),vehicle:captureVehicle(),vehicleIndex:player.mode==='vehicle'?vehicles.indexOf(player.vehicle):-1});
  const activeActor=()=>player.mode==='vehicle'&&player.vehicle?.g?player.vehicle.g:avatar;
  const hierarchySignature=root=>{if(!root)return null;let descendants=0,meshes=0,visibleMeshes=0;root.traverse(node=>{descendants++;if(node.isMesh){meshes++;if(node.visible!==false)visibleMeshes++;}});return{name:String(root.name||'unnamed'),descendants,meshes,visibleMeshes};};
  const visualIdentity=()=>({vehicle:player.vehicle?{id:String(player.vehicle.worldEntityId??player.vehicle.kind??'active-vehicle'),kind:String(player.vehicle.kind??''),hierarchy:hierarchySignature(player.vehicle.g)}:null,hero:hierarchySignature(avatar)});
  const makeVehicleRenderable=vehicle=>{if(!vehicle?.g)return;vehicle.g.visible=true;vehicle.g.traverse(node=>{node.visible=true;node.userData.coastlineAlwaysVisible=true;});};
  const moveActiveActor=root=>{const actor=activeActor();if(actor&&actor.parent!==root)root.add(actor);if(player.vehicle)makeVehicleRenderable(player.vehicle);};
  const applySnapshot=(snapshot,root,spawn=null)=>{if(!snapshot)return;const state=snapshot.player?snapshot:{player:snapshot},playerState=state.player||{},position=playerState.position||{};player.mode=playerState.mode||player.mode;player.x=finiteOr(position.x,player.x);player.y=finiteOr(position.y,0);player.z=finiteOr(position.z,player.z);player.heading=finiteOr(playerState.rotationY,player.heading);if(Number.isInteger(state.vehicleIndex)&&state.vehicleIndex>=0&&vehicles[state.vehicleIndex])player.vehicle=vehicles[state.vehicleIndex];const vehicle=player.vehicle;if(vehicle&&state.vehicle&&(player.mode==='vehicle'||state.vehicleIndex>=0)){const vehicleState=state.vehicle;vehicle.x=finiteOr(vehicleState.position?.x,player.x);vehicle.z=finiteOr(vehicleState.position?.z,player.z);vehicle.heading=finiteOr(vehicleState.heading,finiteOr(vehicleState.rotationY,player.heading));vehicle.speed=finiteOr(vehicleState.speed);if(vehicle.g){vehicle.g.position.set(vehicle.x,finiteOr(vehicleState.position?.y,groundY(vehicle.x,vehicle.z)),vehicle.z);vehicle.g.rotation.y=vehicle.heading;if(vehicle.g.parent!==root)root.add(vehicle.g);makeVehicleRenderable(vehicle);}}else if(avatar&&avatar.parent!==root)root.add(avatar);if(spawn){const x=finiteOr(spawn.x,player.x),z=finiteOr(spawn.z,player.z),y=finiteOr(spawn.y,groundY(x,z));player.x=x;player.y=y;player.z=z;player.heading=finiteOr(spawn.rotationY,player.heading);if(player.mode==='vehicle'&&player.vehicle){const currentVehicle=player.vehicle;currentVehicle.x=x;currentVehicle.z=z;currentVehicle.heading=player.heading;currentVehicle.speed=0;if(currentVehicle.g){currentVehicle.g.position.set(x,y,z);currentVehicle.g.rotation.y=player.heading;if(currentVehicle.g.parent!==root)root.add(currentVehicle.g);makeVehicleRenderable(currentVehicle);}}else if(avatar){avatar.position.set(x,y,z);avatar.rotation.y=player.heading;if(avatar.parent!==root)root.add(avatar);}}else if(player.mode!=='vehicle'&&avatar){avatar.position.set(player.x,groundY(player.x,player.z),player.z);avatar.rotation.y=player.heading;if(avatar.parent!==root)root.add(avatar);}};
  const createNakedIslandRoot=()=>createCoastlineIslandRoot({THREE,region:getCoastlineIslandRegion('residential'),groundY,addBridge,addSideBridge});
  const addCityBridgeAffordance=()=>addBridge(THREE,roots.world1Root,{x:0,startZ:CITY_BRIDGE_START_Z,y:finiteOr(groundY(0,CITY_BRIDGE_START_Z)),length:BRIDGE_LENGTH});
  const cityWorld={id:'city',name:'Coastline City',load:async({context,destinationSpawn})=>{setIslandCollisionScope(false);window.__coastlineActiveWorldId='city';window.__coastlineActiveWorldColliders=[];roots.world1Root.visible=true;if(destinationSpawn)applySnapshot({player:context.player,vehicle:context.vehicle,vehicleIndex:context.vehicleIndex},roots.world1Root,destinationSpawn);return{id:'city',root:roots.world1Root};},unload:async handle=>{handle.root.visible=false;},captureState:async({context})=>({player:context.player,vehicle:context.vehicle,vehicleIndex:context.vehicleIndex}),restoreState:async(worldState,{handle,destinationSpawn})=>{setIslandCollisionScope(false);handle.root.visible=true;applySnapshot(worldState,handle.root,destinationSpawn);}};
  const islandWorld={id:'island',name:'Coastline Island Start',load:async({context,destinationSpawn})=>{setIslandCollisionScope(true);window.__coastlineActiveWorldId='island';window.__coastlineActiveWorldColliders=[];pendingIslandRoot=createNakedIslandRoot();roots.addWorldRoot(pendingIslandRoot);pendingIslandRoot.visible=true;moveActiveActor(pendingIslandRoot);applySnapshot({player:context.player,vehicle:context.vehicle,vehicleIndex:context.vehicleIndex},pendingIslandRoot,destinationSpawn||ISLAND_START);if(failNextIslandLoad){failNextIslandLoad=false;throw new Error('injected island load failure');}return{id:'island',root:pendingIslandRoot};},unload:async handle=>{setIslandCollisionScope(false);if(handle.root?.parent)roots.removeWorldRoot(handle.root);disposeRoot(handle.root);if(pendingIslandRoot===handle.root)pendingIslandRoot=null;},cleanupFailedLoad:async({context})=>{setIslandCollisionScope(false);window.__coastlineActiveWorldId='city';window.__coastlineActiveWorldColliders=[];if(!pendingIslandRoot)return;applySnapshot({player:context.player,vehicle:context.vehicle,vehicleIndex:context.vehicleIndex},roots.world1Root);roots.world1Root.visible=true;roots.removeWorldRoot(pendingIslandRoot);disposeRoot(pendingIslandRoot);pendingIslandRoot=null;},captureState:async({context})=>({player:context.player,vehicle:context.vehicle,vehicleIndex:context.vehicleIndex}),restoreState:async(worldState,{handle,destinationSpawn})=>{setIslandCollisionScope(true);handle.root.visible=true;moveActiveActor(handle.root);applySnapshot(worldState,handle.root,destinationSpawn);}};
  const pendingRegionRoots=new Map();
  const createAdditionalIslandWorld=(regionId,worldId)=>({
    id:worldId,
    name:getCoastlineIslandRegion(regionId).title,
    load:async({context,destinationSpawn})=>{
      setIslandCollisionScope(true);window.__coastlineActiveWorldId=worldId;window.__coastlineActiveWorldColliders=[];
      const root=createCoastlineIslandRoot({THREE,region:getCoastlineIslandRegion(regionId),groundY,addBridge,addSideBridge});
      roots.addWorldRoot(root);root.visible=true;pendingRegionRoots.set(worldId,root);
      moveActiveActor(root);
      const fallbackSpawn={x:420,y:finiteOr(groundY(420,500)),z:500,rotationY:Math.PI/2};
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
      if(root){const activeId=manager.getActiveWorldId(),sourceRoot=activeId==='city'?roots.world1Root:activeId==='island'?pendingIslandRoot:pendingRegionRoots.get(activeId);window.__coastlineActiveWorldId=activeId;window.__coastlineActiveWorldColliders=sourceRoot?.userData?.coastlineColliders||[];if(sourceRoot)applySnapshot({player:context.player,vehicle:context.vehicle,vehicleIndex:context.vehicleIndex},sourceRoot);if(root.parent)roots.removeWorldRoot(root);disposeRoot(root);pendingRegionRoots.delete(worldId);}
    },
    captureState:async({context})=>({player:context.player,vehicle:context.vehicle,vehicleIndex:context.vehicleIndex}),
    restoreState:async(worldState,{handle,destinationSpawn})=>{setIslandCollisionScope(true);handle.root.visible=true;moveActiveActor(handle.root);applySnapshot(worldState,handle.root,destinationSpawn);}
  });
  const waterfrontWorld=createAdditionalIslandWorld('waterfront','waterfront');
  const portWorld=createAdditionalIslandWorld('port','port');
  manager.registerWorld(cityWorld);manager.registerWorld(islandWorld);manager.registerWorld(waterfrontWorld);manager.registerWorld(portWorld);manager.registerTransition({id:'city-to-island',fromWorld:'city',toWorld:'island',trigger:'bridge',spawn:'fixed',destinationSpawn:ISLAND_BRIDGE_DESTINATION,vehiclePolicy:'allowed'});manager.registerTransition({id:'island-to-city',fromWorld:'island',toWorld:'city',trigger:'bridge',spawn:'fixed',destinationSpawn:CITY_BRIDGE_DESTINATION,vehiclePolicy:'allowed'});manager.registerTransition({id:'island-to-waterfront',fromWorld:'island',toWorld:'waterfront',trigger:'bridge',spawn:'fixed',destinationSpawn:{x:420,y:finiteOr(groundY(420,500)),z:500,rotationY:Math.PI/2},vehiclePolicy:'allowed'});manager.registerTransition({id:'waterfront-to-island',fromWorld:'waterfront',toWorld:'island',trigger:'bridge',spawn:'fixed',destinationSpawn:{x:580,y:finiteOr(groundY(580,500)),z:500,rotationY:-Math.PI/2},vehiclePolicy:'allowed'});manager.registerTransition({id:'waterfront-to-port',fromWorld:'waterfront',toWorld:'port',trigger:'bridge',spawn:'fixed',destinationSpawn:{x:420,y:finiteOr(groundY(420,500)),z:500,rotationY:Math.PI/2},vehiclePolicy:'allowed'});manager.registerTransition({id:'port-to-waterfront',fromWorld:'port',toWorld:'waterfront',trigger:'bridge',spawn:'fixed',destinationSpawn:{x:580,y:finiteOr(groundY(580,500)),z:500,rotationY:-Math.PI/2},vehiclePolicy:'allowed'});
  const transition=async transitionId=>{if(autoTransitionPromise)return autoTransitionPromise;autoTransitionPromise=manager.transition(transitionId,makeContext()).then(()=>{const activeId=manager.getActiveWorldId(),activeRoot=activeId==='city'?roots.world1Root:activeId==='island'?pendingIslandRoot:pendingRegionRoots.get(activeId);window.__coastlineBridgeBufferActive=activeId==='city';setIslandCollisionScope(activeId!=='city');window.__coastlineActiveWorldId=activeId;window.__coastlineActiveWorldColliders=activeRoot?.userData?.coastlineColliders||[];return manager.getStatus();}).finally(()=>{autoTransitionPromise=null;});return autoTransitionPromise;};
  const initialize=async()=>{addCityBridgeAffordance();setIslandCollisionScope(false);window.__coastlineBridgeBufferActive=true;roots.world1Root.visible=true;await manager.activate('city',makeContext());window.__coastlineActiveWorldId='city';window.__coastlineActiveWorldColliders=[];const button=document.createElement('button');button.id='coastlineWorldTransition';button.type='button';button.setAttribute('aria-label','Cross bridge between Coastline Island and City');button.style.cssText='display:none;position:fixed;left:50%;bottom:170px;transform:translateX(-50%);z-index:1000;pointer-events:auto;border:1px solid #a7f4ff88;border-radius:12px;padding:6px 8px;background:#06202aee;color:#effcff;font:800 12px system-ui,sans-serif;letter-spacing:.08em;box-shadow:0 8px 24px #0008';let promptedTransitionId='city-to-island';
    button.addEventListener('click',()=>transition(promptedTransitionId).catch(error=>{button.textContent=`TRANSITION FAILED: ${error.message}`;}));
    document.body.appendChild(button);
    updatePromptCallback=()=>{
      const activeWorld=manager.getActiveWorldId(),vehicle=player.mode==='vehicle'?player.vehicle:null,status=manager.getStatus();
      if(vehicle)makeVehicleRenderable(vehicle);
      if(!vehicle||!activeWorld){lastAutoTrigger={eligible:false,reason:'no-active-vehicle-or-world',world:activeWorld,x:vehicle?.x??null,z:vehicle?.z??null,heading:vehicle?.heading??null,error:null};button.style.display='none';return;}
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
      const vehicleX=finiteOr(vehicle.x,player.x),vehicleZ=finiteOr(vehicle.z,player.z),vehicleHeading=finiteOr(vehicle.heading,player.heading);
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
    window.__coastlineTransitionTest={worldIds:()=>['city','island','waterfront','port'],regionRoots:()=>({residential:hierarchySignature(pendingIslandRoot),waterfront:hierarchySignature(pendingRegionRoots.get('waterfront')),port:hierarchySignature(pendingRegionRoots.get('port'))}),activeWorldColliderCount:()=>window.__coastlineActiveWorldColliders?.length??0,status:()=>manager.getStatus(),autoTriggerState:()=>({...lastAutoTrigger}),playerState:()=>({position:{x:player.x,y:player.y,z:player.z},heading:player.heading,mode:player.mode,vehicleIndex:vehicles.indexOf(player.vehicle),vehicleSpeed:player.vehicle?.speed??0}),rootVisibility:()=>({cityVisible:roots.world1Root.visible,cityCachedInScene:Boolean(roots.world1Root.parent===scene),cityContent:hierarchySignature(roots.world1Root),islandVisible:Boolean(pendingIslandRoot?.visible),islandRootResident:Boolean(pendingIslandRoot?.parent===scene),islandContent:hierarchySignature(pendingIslandRoot)}),transition,updatePrompt:updatePromptCallback,flushAutoTransition:async()=>{if(autoTransitionPromise)await autoTransitionPromise;},failNextWorld2Load:()=>{failNextIslandLoad=true;},world2Spawn:()=>({...ISLAND_START}),bridgeZones:()=>({cityApproach:{...CITY_APPROACH},islandApproach:{...ISLAND_APPROACH}}),cityBridgeContract:()=>({bridgeLength:BRIDGE_LENGTH,cityMapEdge:CITY_MAP_EDGE_Z,cityEdge:CITY_BRIDGE_START_Z,bridgeEnd:CITY_BRIDGE_END_Z,playableCityMinZ:CITY_MAP_EDGE_Z,outsideBufferLength:BRIDGE_LENGTH,destination:{...CITY_BRIDGE_DESTINATION},spawnPolicy:'fixed'}),world2Layout:()=>({bounds:{...ISLAND_BOUNDS},spawn:{...ISLAND_START},islandBridge:{x:ISLAND_CENTER.x,z:ISLAND_BRIDGE_START_Z},islandBridgeDestination:{...ISLAND_BRIDGE_DESTINATION},spawnToIslandBridge:Math.hypot(ISLAND_START.x-ISLAND_CENTER.x,ISLAND_START.z-ISLAND_BRIDGE_START_Z),bridgeLength:BRIDGE_LENGTH,bridgeIslandEdge:ISLAND_BRIDGE_START_Z,bridgeCityEdge:ISLAND_BRIDGE_END_Z,palm:null}),visualIdentity,activeVehicleVisible:()=>Boolean(player.vehicle?.g&&player.vehicle.g.visible&&(()=>{let hidden=false;player.vehicle.g.traverse(node=>{if(node.visible===false)hidden=true;});return !hidden;})()),collisionScope:()=>Boolean(window.__coastlineWorld2Active)};
    window.addEventListener('keydown',updatePromptCallback);setInterval(()=>updatePromptCallback(),200);return manager;};
  const initializePromise=initialize();return{manager,ready:initializePromise,initialize:()=>initializePromise,updatePrompt:()=>updatePromptCallback(),dispose:async()=>{setIslandCollisionScope(false);if(pendingIslandRoot){roots.removeWorldRoot(pendingIslandRoot);disposeRoot(pendingIslandRoot);pendingIslandRoot=null;}}};
}
