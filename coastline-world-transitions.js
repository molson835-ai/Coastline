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
const disposeRoot = root => root?.traverse(object => {
  const data = object.userData || {};
  if (object.geometry && (!data.coastlineSharedWildlifeAsset || data.coastlineOwnedGeometry)) object.geometry.dispose?.();
  if (data.coastlineSharedWildlifeAsset) return;
  const materials = Array.isArray(object.material) ? object.material : object.material ? [object.material] : [];
  for (const material of materials) material.dispose?.();
});

export const COASTLINE_ROPE_BRIDGE_CONFIG = Object.freeze({
  deckWidth: 5.2,
  plankCountPer100Units: 40,
  plankGap: 0.16,
  postSpacing: 4.5,
  ropeRadius: 0.055,
  deckSag: 2.1,
  railHeight: 1.55,
});

/** Shared drivable surface profile used by the bridge meshes and vehicle grounding. */
export function coastlineRopeBridgeDeckY(baseY, t) {
  const along = Math.max(0, Math.min(1, t));
  return baseY + 0.02 - Math.sin(Math.PI * along) * COASTLINE_ROPE_BRIDGE_CONFIG.deckSag;
}

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
  const islandGroundY=()=>finiteOr(groundY(ISLAND_CENTER.x,ISLAND_CENTER.z))+(window.__coastlineWorld2Active?0:COASTLINE_ISLAND_ELEVATION);
  const ISLAND_START=Object.freeze({x:500,y:islandGroundY(500,420),z:420,rotationY:Math.PI}), ISLAND_APPROACH=Object.freeze({x:500,z:ISLAND_BRIDGE_END_Z+5,rotationY:Math.PI}), CITY_APPROACH=Object.freeze({x:0,z:CITY_BRIDGE_END_Z-5,rotationY:Math.PI});
  const ISLAND_BRIDGE_DESTINATION=Object.freeze({x:500,y:islandGroundY(500,ISLAND_BRIDGE_END_Z),z:ISLAND_BRIDGE_END_Z,rotationY:0}), CITY_BRIDGE_DESTINATION=Object.freeze({x:0,y:finiteOr(groundY(0,CITY_BRIDGE_END_Z)),z:CITY_BRIDGE_END_Z,rotationY:0});
  const bridgeGroundY=(x,z)=>{
    const activeId=window.__coastlineActiveWorldId,halfWidth=COASTLINE_ROPE_BRIDGE_CONFIG.deckWidth/2+1.7;
    if(activeId==='city'&&Math.abs(x)<=halfWidth&&z>=CITY_BRIDGE_END_Z&&z<=CITY_BRIDGE_START_Z)
      return coastlineRopeBridgeDeckY(finiteOr(groundY(0,CITY_BRIDGE_START_Z)),(CITY_BRIDGE_START_Z-z)/BRIDGE_LENGTH);
    if(activeId==='island'&&Math.abs(x-ISLAND_CENTER.x)<=halfWidth&&z>=ISLAND_BRIDGE_END_Z&&z<=ISLAND_BRIDGE_START_Z)
      return coastlineRopeBridgeDeckY(islandGroundY(),(ISLAND_BRIDGE_START_Z-z)/BRIDGE_LENGTH);
    if((activeId==='island'||activeId==='waterfront')&&x>=611.5&&x<=708.5&&Math.abs(z-500)<=halfWidth)
      return coastlineRopeBridgeDeckY(islandGroundY(),(x-610)/BRIDGE_LENGTH);
    if((activeId==='waterfront'||activeId==='port')&&x>=291.5&&x<=388.5&&Math.abs(z-500)<=halfWidth)
      return coastlineRopeBridgeDeckY(islandGroundY(),(390-x)/BRIDGE_LENGTH);
    return null;
  };
  window.__coastlineBridgeGroundY=bridgeGroundY;
  // Match vehicle collision to the visible rope rails on each active bridge span.
  // The collision radius keeps the full vehicle envelope inside the 5.2-unit deck;
  // landings are intentionally excluded so transitions remain approachable.
  window.__coastlineBridgeSideBlocked=(x,z,radius=0)=>{
    const id=window.__coastlineActiveWorldId;
    const half=COASTLINE_ROPE_BRIDGE_CONFIG.deckWidth/2;
    const inset=Math.max(0,radius)+0.08;
    if(id==='city'&&Math.abs(x)<=12&&z>=CITY_BRIDGE_END_Z+1.5&&z<=CITY_BRIDGE_START_Z-1.5)
      return Math.abs(x)>half-inset;
    if(id==='island'&&Math.abs(x-ISLAND_CENTER.x)<=12&&z>=ISLAND_BRIDGE_END_Z+1.5&&z<=ISLAND_BRIDGE_START_Z-1.5)
      return Math.abs(x-ISLAND_CENTER.x)>half-inset;
    if((id==='island'||id==='waterfront')&&x>=611.5&&x<=708.5)
      return Math.abs(z-500)>half-inset;
    if((id==='waterfront'||id==='port')&&x>=291.5&&x<=388.5)
      return Math.abs(z-500)>half-inset;
    return false;
  };
  // Keep the vehicle envelope on the visible deck instead of treating a rail
  // touch as a hard obstacle. The longitudinal coordinate is never clamped.
  window.__coastlineClampBridgePosition=(x,z,radius=0)=>{
    const id=window.__coastlineActiveWorldId,half=COASTLINE_ROPE_BRIDGE_CONFIG.deckWidth/2;
    const lane=Math.max(.35,half-Math.max(0,radius)-.12);
    if(id==='city'&&Math.abs(x)<=12&&z>=CITY_BRIDGE_END_Z&&z<=CITY_BRIDGE_START_Z)return{x:THREE.MathUtils.clamp(x,-lane,lane),z};
    if(id==='island'&&Math.abs(x-ISLAND_CENTER.x)<=12&&z>=ISLAND_BRIDGE_END_Z&&z<=ISLAND_BRIDGE_START_Z)return{x:THREE.MathUtils.clamp(x,ISLAND_CENTER.x-lane,ISLAND_CENTER.x+lane),z};
    if((id==='island'||id==='waterfront')&&x>=610&&x<=710)return{x,z:THREE.MathUtils.clamp(z,ISLAND_CENTER.z-lane,ISLAND_CENTER.z+lane)};
    if((id==='waterfront'||id==='port')&&x>=290&&x<=390)return{x,z:THREE.MathUtils.clamp(z,ISLAND_CENTER.z-lane,ISLAND_CENTER.z+lane)};
    return{x,z};
  };
  const addCityBoundaryScenery=()=>{
    if(roots.world1Root.getObjectByName('coastline-city-map-edge-boundary'))return;
    const boundary=new THREE.Group();boundary.name='coastline-city-map-edge-boundary';
    const rockMat=new THREE.MeshStandardMaterial({color:0x77766e,roughness:.98});
    const scrubMat=new THREE.MeshStandardMaterial({color:0x405b38,roughness:1});
    const rockGeo=new THREE.DodecahedronGeometry(1,0),scrubGeo=new THREE.ConeGeometry(1,3.6,5);
    const positions=[];
    for(let v=-700;v<=700;v+=22){
      positions.push({x:v,z:-714,edge:'north'},{x:v,z:714,edge:'south'},{x:-714,z:v,edge:'west'},{x:714,z:v,edge:'east'});
    }
    const filtered=positions.filter(p=>!(p.edge==='north'&&Math.abs(p.x)<=13));
    const rocks=new THREE.InstancedMesh(rockGeo,rockMat,filtered.length),scrub=new THREE.InstancedMesh(scrubGeo,scrubMat,filtered.length);
    rocks.name='coastline-city-map-edge-rocks';scrub.name='coastline-city-map-edge-tall-scrub';
    const dummy=new THREE.Object3D();
    filtered.forEach((p,i)=>{
      const y=finiteOr(groundY(p.x,p.z));
      dummy.position.set(p.x,y+.25+(i%3)*.04,p.z);dummy.rotation.set((i%3)*.07,(i%7)*.61,(i%2)*.06);
      dummy.scale.set(1.5+(i%4)*.42,.7+(i%3)*.18,1.3+(i%2)*.35);dummy.updateMatrix();rocks.setMatrixAt(i,dummy.matrix);
      dummy.position.set(p.x+(i%2?4:-4),y+1.75,p.z+(p.edge==='north'?3:p.edge==='south'?-3:p.edge==='west'?3:-3));
      dummy.rotation.set(0,(i%5)*.7,(i%3)*.04);dummy.scale.set(.7+(i%3)*.25,.85+(i%4)*.18,.7+(i%2)*.2);dummy.updateMatrix();scrub.setMatrixAt(i,dummy.matrix);
    });
    rocks.instanceMatrix.needsUpdate=true;scrub.instanceMatrix.needsUpdate=true;
    rocks.castShadow=false;rocks.receiveShadow=true;scrub.castShadow=false;scrub.receiveShadow=true;

    // The City collision limit sits around +/-710 while the decorative edge
    // rocks were spaced 22 units apart. Add a continuous rock course so blocked
    // outer-edge ground has visible landscape coverage. Keep the north bridge
    // portal only as wide as the 5.2-unit deck plus a small clearance.
    const coursePoints=[];
    for(let v=-714;v<=714;v+=2.3){
      coursePoints.push(
        {x:v,z:-714,edge:'north'},
        {x:v,z:714,edge:'south'},
        {x:-714,z:v,edge:'west'},
        {x:714,z:v,edge:'east'}
      );
    }
    const courseFiltered=coursePoints.filter(p=>!(p.edge==='north'&&Math.abs(p.x)<4.5));
    const course=new THREE.InstancedMesh(rockGeo,rockMat,courseFiltered.length);
    course.name='coastline-city-map-edge-continuous-rock-course';
    courseFiltered.forEach((p,i)=>{
      const y=finiteOr(groundY(p.x,p.z));
      dummy.position.set(p.x,y+.72,p.z);
      dummy.rotation.set((i%3-1)*.025,p.edge==='east'||p.edge==='west'?Math.PI/2:0,(i%2?1:-1)*.015);
      dummy.scale.set(1.48,.72,.82);
      dummy.updateMatrix();course.setMatrixAt(i,dummy.matrix);
    });
    course.instanceMatrix.needsUpdate=true;course.castShadow=false;course.receiveShadow=true;
    boundary.add(rocks,scrub,course);roots.world1Root.add(boundary);
  };
  let pendingIslandRoot=null,pendingGarageRoot=null,pendingHouseRoot=null,pendingDungeonRoot=null,garageVehicle=null,garageBoardButton=null,garageEntryButton=null,previousVehiclePosition=null,previousFootPosition=null,failNextIslandLoad=false,updatePromptCallback=()=>{},autoTransitionPromise=null,lastAutoTrigger={eligible:false,reason:'not-checked',world:null,x:null,z:null,heading:null,error:null};
  const setIslandCollisionScope=active=>{window.__coastlineWorld2Active=Boolean(active);};
  const manager=createTransitionManager({onEvent:event=>window.dispatchEvent(new CustomEvent(`coastline:${event.type}`,{detail:event}))});
  const capturePlayer=()=>({mode:player.mode,position:{x:finiteOr(player.x),y:finiteOr(player.y),z:finiteOr(player.z)},rotationY:finiteOr(player.heading),vehicleIndex:player.mode==='vehicle'?vehicles.indexOf(player.vehicle):-1});
  const captureVehicle=()=>{if(player.mode!=='vehicle'||!player.vehicle)return null;const vehicle=player.vehicle;return{id:String(vehicle.worldEntityId??vehicle.kind??'active-vehicle'),position:{x:finiteOr(vehicle.x,player.x),y:finiteOr(vehicle.g?.position?.y),z:finiteOr(vehicle.z,player.z)},rotationY:finiteOr(vehicle.heading,player.heading),heading:finiteOr(vehicle.heading,player.heading),speed:finiteOr(vehicle.speed)};};
  const makeContext=()=>({player:capturePlayer(),vehicle:captureVehicle(),vehicleIndex:player.mode==='vehicle'?vehicles.indexOf(player.vehicle):-1});
  const activeActor=()=>player.mode==='vehicle'&&player.vehicle?.g?player.vehicle.g:avatar;
  const hierarchySignature=root=>{if(!root)return null;let descendants=0,meshes=0,visibleMeshes=0;root.traverse(node=>{descendants++;if(node.isMesh){meshes++;if(node.visible!==false)visibleMeshes++;}});return{name:String(root.name||'unnamed'),descendants,meshes,visibleMeshes};};
  const visualIdentity=()=>({vehicle:player.vehicle?{id:String(player.vehicle.worldEntityId??player.vehicle.kind??'active-vehicle'),kind:String(player.vehicle.kind??''),hierarchy:hierarchySignature(player.vehicle.g)}:null,hero:hierarchySignature(avatar)});
  const makeVehicleRenderable=vehicle=>{if(!vehicle?.g)return;vehicle.g.visible=true;vehicle.g.traverse(node=>{node.visible=true;node.userData.coastlineAlwaysVisible=true;});};

  // Each outdoor island owns a set of enterable parked cars. Geometry/materials
  // are cloned so unloading an island cannot dispose City assets.
  const OUTDOOR_FLEET_WORLDS=new Set(['island','waterfront','port']);
  const OUTDOOR_FLEET_SLOTS=[{x:486,z:440,heading:0},{x:500,z:440,heading:0},{x:514,z:440,heading:0}];
  const activeWorldFleets=new Map();
  const disposeOutdoorFleet=root=>{
    const fleet=activeWorldFleets.get(root)||[];
    for(const vehicle of fleet){
      if(!vehicle?.g)continue;
      if(vehicle.g.parent===root&&vehicle!==player.vehicle){
        root.remove(vehicle.g);
        const index=vehicles.indexOf(vehicle);if(index>=0)vehicles.splice(index,1);
        disposeRoot(vehicle.g);
      }else if(vehicle.g.parent!==root){
        vehicle.homeyAccessibleFleet=false;vehicle.homeyFleetId=null;
      }
    }
    activeWorldFleets.delete(root);
    if(root?.userData)root.userData.coastlineParkedFleet=[];
  };
  const createOutdoorVehicleClone=(source,slot,index,root,worldId)=>{
    const visual=source.g.clone(true),sourceNodes=[],cloneNodes=[],nodeMap=new Map(),materialMap=new Map();
    source.g.traverse(node=>sourceNodes.push(node));visual.traverse(node=>cloneNodes.push(node));
    sourceNodes.forEach((node,i)=>{if(cloneNodes[i])nodeMap.set(node,cloneNodes[i]);});
    const cloneMaterial=material=>{
      if(!material)return material;
      if(!materialMap.has(material))materialMap.set(material,material.clone?.()||material);
      return materialMap.get(material);
    };
    for(const node of cloneNodes){
      if(!node.isMesh)continue;
      if(node.geometry?.clone)node.geometry=node.geometry.clone();
      node.material=Array.isArray(node.material)?node.material.map(cloneMaterial):cloneMaterial(node.material);
    }
    const mapRefs=value=>{
      if(nodeMap.has(value))return nodeMap.get(value);
      if(Array.isArray(value))return value.map(mapRefs);
      if(value&&typeof value==='object'&&Object.getPrototypeOf(value)===Object.prototype){
        return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,mapRefs(item)]));
      }
      return value;
    };
    const vehicle={...source,g:visual,materialRoles:mapRefs(source.materialRoles||{}),damageParts:mapRefs(source.damageParts||{}),
      x:slot.x,z:slot.z,worldX:slot.x,worldZ:slot.z,heading:slot.heading,speed:0,parked:true,occupied:false,ai:false,
      drivable:source.drivable!==false,worldEntityId:null,parkingSpotId:null,homeyAccessibleFleet:true,
      homeyFleetId:'parked-'+worldId+'-car-'+(index+1),homeyFleetWorldId:worldId};
    if(vehicle.damageParts)vehicle.damageParts.visualRoot=visual;
    if(source.basePaint?.clone)vehicle.basePaint=source.basePaint.clone();
    if(source.damage&&typeof source.damage==='object')vehicle.damage={...source.damage};
    visual.name='coastline-'+worldId+'-parked-car-'+(index+1);
    visual.userData.coastlineParkedFleetVehicle=true;
    visual.position.set(slot.x,islandGroundY(slot.x,slot.z),slot.z);
    visual.rotation.y=slot.heading;visual.visible=true;
    makeVehicleRenderable(vehicle);root.add(visual);vehicles.push(vehicle);
    return vehicle;
  };
  const installOutdoorFleet=(root,worldId)=>{
    if(!root||!OUTDOOR_FLEET_WORLDS.has(worldId))return [];
    const current=activeWorldFleets.get(root);
    if(current?.length&&current.every(vehicle=>vehicle.g?.parent===root))return current;
    if(current)disposeOutdoorFleet(root);
    const sources=vehicles.filter(vehicle=>vehicle?.kind==='car'&&vehicle!==player.vehicle&&vehicle!==garageVehicle&&
      vehicle.g?.parent===roots.world1Root&&vehicle.drivable!==false&&vehicle.g.visible!==false&&
      !vehicle.homeyAccessibleFleet&&!vehicle.homeyFleetRetired&&!vehicle.g.userData?.coastlineNeutralFallback&&
      vehicle.rgsdevModelName!=='neutral-fallback');
    if(!sources.length)return [];
    const fleet=[];
    for(let i=0;i<OUTDOOR_FLEET_SLOTS.length;i++)fleet.push(createOutdoorVehicleClone(sources[i%sources.length],OUTDOOR_FLEET_SLOTS[i],i,root,worldId));
    activeWorldFleets.set(root,fleet);root.userData.coastlineParkedFleet=fleet.map(vehicle=>vehicle.homeyFleetId);
    return fleet;
  };
  // The asset pack is asynchronous: if the player enters an island before it
  // finishes, the later load-complete hook can populate the already-active root.
  window.__coastlineEnsureActiveWorldFleet=()=>installOutdoorFleet(
    window.__coastlineActiveWorldRoot,
    window.__coastlineActiveWorldId
  );
  const moveActiveActor=root=>{const actor=activeActor();if(avatar&&avatar.parent!==root)root.add(avatar);const vehicleToMove=player.mode==='vehicle'&&player.vehicle?player.vehicle:(root?.name==='coastline-homey-garage-interior'?garageVehicle:null);if(vehicleToMove?.g&&vehicleToMove.g.parent!==root)root.add(vehicleToMove.g);if(actor&&actor.parent!==root)root.add(actor);if(vehicleToMove)makeVehicleRenderable(vehicleToMove);};
  const applySnapshot=(snapshot,root,spawn=null)=>{if(!snapshot)return;const state=snapshot.player?snapshot:{player:snapshot},playerState=state.player||{},position=playerState.position||{};player.mode=playerState.mode||player.mode;player.x=finiteOr(position.x,player.x);player.y=finiteOr(position.y,0);player.z=finiteOr(position.z,player.z);player.heading=finiteOr(playerState.rotationY,player.heading);if(Number.isInteger(state.vehicleIndex)&&state.vehicleIndex>=0&&vehicles[state.vehicleIndex])player.vehicle=vehicles[state.vehicleIndex];const vehicle=player.vehicle;if(vehicle&&state.vehicle&&(player.mode==='vehicle'||state.vehicleIndex>=0)){const vehicleState=state.vehicle;vehicle.x=finiteOr(vehicleState.position?.x,player.x);vehicle.z=finiteOr(vehicleState.position?.z,player.z);vehicle.heading=finiteOr(vehicleState.heading,finiteOr(vehicleState.rotationY,player.heading));vehicle.speed=finiteOr(vehicleState.speed);if(vehicle.g){vehicle.g.position.set(vehicle.x,finiteOr(vehicleState.position?.y,groundY(vehicle.x,vehicle.z)),vehicle.z);vehicle.g.rotation.y=vehicle.heading;if(vehicle.g.parent!==root)root.add(vehicle.g);makeVehicleRenderable(vehicle);}}else if(avatar&&avatar.parent!==root)root.add(avatar);if(spawn){const x=finiteOr(spawn.x,player.x),z=finiteOr(spawn.z,player.z),y=finiteOr(spawn.y,groundY(x,z));player.x=x;player.y=y;player.z=z;player.heading=finiteOr(spawn.rotationY,player.heading);if(player.mode==='vehicle'&&player.vehicle){const currentVehicle=player.vehicle;currentVehicle.x=x;currentVehicle.z=z;currentVehicle.heading=player.heading;currentVehicle.speed=0;if(currentVehicle.g){currentVehicle.g.position.set(x,y,z);currentVehicle.g.rotation.y=player.heading;if(currentVehicle.g.parent!==root)root.add(currentVehicle.g);makeVehicleRenderable(currentVehicle);}}else if(avatar){avatar.position.set(x,y,z);avatar.rotation.y=player.heading;if(avatar.parent!==root)root.add(avatar);}}else if(player.mode!=='vehicle'&&avatar){avatar.position.set(player.x,groundY(player.x,player.z),player.z);avatar.rotation.y=player.heading;if(avatar.parent!==root)root.add(avatar);}if(typeof window.__coastlineSetFacingHeading==='function')window.__coastlineSetFacingHeading(player.heading);};
  const createNakedIslandRoot=()=>{const root=createCoastlineIslandRoot({THREE,region:getCoastlineIslandRegion('residential'),groundY:islandGroundY,addBridge,addSideBridge});window.__coastlineIslandRoot=root;window.__coastlineHomeyDrivewayLights=root.userData.coastlineHomeyDrivewayLights||[];return root;};
  const createGarageRoot=()=>{const root=buildHomeyGarageInterior(THREE,{centerX:483,centerZ:500,floorY:islandGroundY(483,500)});root.userData.coastlineGarageFloorY=islandGroundY(483,500);window.__coastlineGarageProps=root.userData.coastlineGarageProps||[];return root;};
  const createHouseRoot=()=>buildHomeyHouseInterior(THREE,{centerX:483,centerZ:500,floorY:islandGroundY(483,500)});
  const addCityBridgeAffordance=()=>addBridge(THREE,roots.world1Root,{x:0,startZ:CITY_BRIDGE_START_Z,y:finiteOr(groundY(0,CITY_BRIDGE_START_Z)),length:BRIDGE_LENGTH});
  const cityWorld={id:'city',name:'Coastline City',load:async({context,destinationSpawn})=>{setIslandCollisionScope(false);window.__coastlineActiveWorldId='city';window.__coastlineActiveWorldRoot=roots.world1Root;window.__coastlineActiveWorldColliders=[];roots.world1Root.visible=true;moveActiveActor(roots.world1Root);if(destinationSpawn)applySnapshot({player:context.player,vehicle:context.vehicle,vehicleIndex:context.vehicleIndex},roots.world1Root,destinationSpawn);window.__coastlineWildlifeAssets?.attachWorld(roots.world1Root,'city');return{id:'city',root:roots.world1Root};},unload:async handle=>{handle.root.visible=false;},captureState:async({context})=>({player:context.player,vehicle:context.vehicle,vehicleIndex:context.vehicleIndex}),restoreState:async(worldState,{handle,destinationSpawn})=>{setIslandCollisionScope(false);handle.root.visible=true;moveActiveActor(handle.root);applySnapshot(worldState,handle.root,destinationSpawn);}};
  const islandWorld={id:'island',name:'Coastline Island Start',load:async({context,destinationSpawn})=>{setIslandCollisionScope(true);window.__coastlineActiveWorldId='island';window.__coastlineActiveWorldColliders=[];pendingIslandRoot=createNakedIslandRoot();roots.addWorldRoot(pendingIslandRoot);pendingIslandRoot.visible=true;window.__coastlineWildlifeAssets?.attachWorld(pendingIslandRoot,'island');moveActiveActor(pendingIslandRoot);applySnapshot({player:context.player,vehicle:context.vehicle,vehicleIndex:context.vehicleIndex},pendingIslandRoot,destinationSpawn||ISLAND_START);if(failNextIslandLoad){failNextIslandLoad=false;throw new Error('injected island load failure');}return{id:'island',root:pendingIslandRoot};},unload:async handle=>{setIslandCollisionScope(false);window.__coastlineWildlifeAssets?.detachWorld(handle.root);disposeOutdoorFleet(handle.root);if(handle.root?.parent)roots.removeWorldRoot(handle.root);disposeRoot(handle.root);if(pendingIslandRoot===handle.root)pendingIslandRoot=null;},cleanupFailedLoad:async({context})=>{setIslandCollisionScope(false);window.__coastlineActiveWorldId='city';window.__coastlineActiveWorldRoot=roots.world1Root;window.__coastlineActiveWorldColliders=[];if(!pendingIslandRoot)return;roots.world1Root.visible=true;moveActiveActor(roots.world1Root);applySnapshot({player:context.player,vehicle:context.vehicle,vehicleIndex:context.vehicleIndex},roots.world1Root);window.__coastlineWildlifeAssets?.detachWorld(pendingIslandRoot);disposeOutdoorFleet(pendingIslandRoot);roots.removeWorldRoot(pendingIslandRoot);disposeRoot(pendingIslandRoot);pendingIslandRoot=null;},captureState:async({context})=>({player:context.player,vehicle:context.vehicle,vehicleIndex:context.vehicleIndex}),restoreState:async(worldState,{handle,destinationSpawn})=>{setIslandCollisionScope(true);handle.root.visible=true;moveActiveActor(handle.root);applySnapshot(worldState,handle.root,destinationSpawn);}};
  const pendingRegionRoots=new Map();
  const createAdditionalIslandWorld=(regionId,worldId)=>({
    id:worldId,
    name:getCoastlineIslandRegion(regionId).title,
    content:{density:'developed',actorAssets:'shared',renderReadiness:'required'},
    load:async({context,destinationSpawn})=>{
      setIslandCollisionScope(true);window.__coastlineActiveWorldId=worldId;window.__coastlineActiveWorldColliders=[];
      const root=createCoastlineIslandRoot({THREE,region:getCoastlineIslandRegion(regionId),groundY:islandGroundY,addBridge,addSideBridge});
      window.__coastlineWildlifeAssets?.attachWorld(root,worldId);
      window.__coastlineRegionRoot=root;
      if(regionId==='waterfront'){
        const proceduralVendor=root.getObjectByName('coastline-electric-lemonade-vendor');
        try{
          const {loadCozyCharacterAsset,createCozyCharacterInstance,setCozyCharacterAnimation}=await import('./coastline-asset-swap.js');
          const asset=await loadCozyCharacterAsset();
          const actor=createCozyCharacterInstance(THREE,asset,1.72);
          actor.root.name='coastline-waterfront-lemonade-vendor-glb';
          actor.root.traverse(node=>{
            if(!node.isMesh)return;
            node.geometry=node.geometry?.clone?.()||node.geometry;
            node.material=Array.isArray(node.material)?node.material.map(material=>material?.clone?.()||material):node.material?.clone?.()||node.material;
            node.castShadow=true;node.receiveShadow=true;
          });
          actor.root.position.x=520;actor.root.position.z=528.8;actor.root.position.y+=finiteOr(islandGroundY(520,530));
          actor.root.rotation.y=0;
          root.add(actor.root);
          root.userData.coastlineLemonadeVendorActor=actor;
          window.__coastlineWaterfrontVendorActor=actor;
          if(proceduralVendor)proceduralVendor.visible=false;
          setCozyCharacterAnimation(actor,'idle');
        }catch(error){
          console.warn('[Coastline] GLB lemonade vendor unavailable; procedural fallback remains visible.',error);
        }
      }
      roots.addWorldRoot(root);root.visible=true;pendingRegionRoots.set(worldId,root);
      moveActiveActor(root);
      const fallbackSpawn={x:420,y:islandGroundY(420,500),z:500,rotationY:Math.PI/2};
      applySnapshot({player:context.player,vehicle:context.vehicle,vehicleIndex:context.vehicleIndex},root,destinationSpawn||fallbackSpawn);
      return{id:worldId,root};
    },
    unload:async handle=>{
      setIslandCollisionScope(false);
      window.__coastlineWildlifeAssets?.detachWorld(handle.root);
      disposeOutdoorFleet(handle.root);
      if(handle.root?.parent)roots.removeWorldRoot(handle.root);
      if(window.__coastlineRegionRoot===handle.root)window.__coastlineRegionRoot=null;
      if(window.__coastlineWaterfrontVendorActor===handle.root?.userData?.coastlineLemonadeVendorActor)window.__coastlineWaterfrontVendorActor=null;
      disposeRoot(handle.root);
      if(pendingRegionRoots.get(worldId)===handle.root)pendingRegionRoots.delete(worldId);
    },
    cleanupFailedLoad:async({context})=>{
      setIslandCollisionScope(manager.getActiveWorldId()!=='city');
      const root=pendingRegionRoots.get(worldId);
      if(root){const activeId=manager.getActiveWorldId(),sourceRoot=activeId==='city'?roots.world1Root:activeId==='island'?pendingIslandRoot:pendingRegionRoots.get(activeId);window.__coastlineActiveWorldId=activeId;window.__coastlineActiveWorldColliders=sourceRoot?.userData?.coastlineColliders||[];if(sourceRoot){moveActiveActor(sourceRoot);applySnapshot({player:context.player,vehicle:context.vehicle,vehicleIndex:context.vehicleIndex},sourceRoot);}window.__coastlineWildlifeAssets?.detachWorld(root);if(root.parent)roots.removeWorldRoot(root);disposeRoot(root);pendingRegionRoots.delete(worldId);}
    },
    captureState:async({context})=>({player:context.player,vehicle:context.vehicle,vehicleIndex:context.vehicleIndex}),
    restoreState:async(worldState,{handle,destinationSpawn})=>{setIslandCollisionScope(true);handle.root.visible=true;moveActiveActor(handle.root);applySnapshot(worldState,handle.root,destinationSpawn);}
  });
  const waterfrontWorld=createAdditionalIslandWorld('waterfront','waterfront');
  const portWorld=createAdditionalIslandWorld('port','port');
  const garageWorld={id:'homey-garage',name:'Homey Island Motor Club Garage',content:{density:'developed',actorAssets:'shared',renderReadiness:'required'},load:async({context,destinationSpawn})=>{setIslandCollisionScope(true);window.__coastlineActiveWorldId='homey-garage';pendingGarageRoot=createGarageRoot();roots.addWorldRoot(pendingGarageRoot);pendingGarageRoot.visible=true;window.__coastlineGarageRoot=pendingGarageRoot;garageVehicle=Number.isInteger(context.vehicleIndex)&&vehicles[context.vehicleIndex]?vehicles[context.vehicleIndex]:(garageVehicle||player.vehicle);moveActiveActor(pendingGarageRoot);const spawn=destinationSpawn||{x:483,y:islandGroundY(483,500),z:500,rotationY:Math.PI};applySnapshot({player:context.player,vehicle:context.vehicle,vehicleIndex:context.vehicleIndex},pendingGarageRoot,spawn);window.__coastlineActiveWorldColliders=pendingGarageRoot.userData.coastlineColliders||[];previousVehiclePosition=null;return{id:'homey-garage',root:pendingGarageRoot};},unload:async handle=>{if(handle.root?.parent)roots.removeWorldRoot(handle.root);disposeRoot(handle.root);if(pendingGarageRoot===handle.root){pendingGarageRoot=null;window.__coastlineGarageRoot=null;}},cleanupFailedLoad:async({context})=>{window.__coastlineActiveWorldId=manager.getActiveWorldId()||'island';setIslandCollisionScope(true);const sourceRoot=manager.getActiveWorldId()==='city'?roots.world1Root:manager.getActiveWorldId()==='island'?pendingIslandRoot:pendingRegionRoots.get(manager.getActiveWorldId());window.__coastlineActiveWorldColliders=sourceRoot?.userData?.coastlineColliders||[];if(sourceRoot){moveActiveActor(sourceRoot);applySnapshot({player:context.player,vehicle:context.vehicle,vehicleIndex:context.vehicleIndex},sourceRoot);}if(pendingGarageRoot?.parent)roots.removeWorldRoot(pendingGarageRoot);if(pendingGarageRoot)disposeRoot(pendingGarageRoot);pendingGarageRoot=null;window.__coastlineGarageRoot=null;},captureState:async({context})=>({player:context.player,vehicle:context.vehicle,vehicleIndex:context.vehicleIndex}),restoreState:async(worldState,{handle,destinationSpawn})=>{setIslandCollisionScope(true);window.__coastlineActiveWorldId='homey-garage';pendingGarageRoot=handle.root;window.__coastlineGarageRoot=handle.root;handle.root.visible=true;moveActiveActor(handle.root);applySnapshot(worldState,handle.root,destinationSpawn);}};
  const dungeonWorld={id:'electric-lemonade-dungeon',name:'Electric Lemonade Cave',content:{density:'developed',actorAssets:'shared',renderReadiness:'required'},load:async({context,destinationSpawn})=>{
    setIslandCollisionScope(true);window.__coastlineActiveWorldId='electric-lemonade-dungeon';
    const floorY=finiteOr(islandGroundY());
    pendingDungeonRoot=new THREE.Group();pendingDungeonRoot.name='coastline-electric-lemonade-dungeon-root';
    const root=pendingDungeonRoot,colliders=[];
    const wallMat=new THREE.MeshStandardMaterial({color:0x3c4039,roughness:1,metalness:0});
    const floorMat=new THREE.MeshStandardMaterial({color:0x171a17,roughness:1,metalness:0});
    const rockMat=new THREE.MeshStandardMaterial({color:0x45483f,roughness:1,metalness:0});
    const naturalRockGeometry=new THREE.DodecahedronGeometry(1,1);
    const add=(name,x,y,z,w,h,d,material,collider=false)=>{
      const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
      mesh.name=name;mesh.position.set(x,y,z);mesh.receiveShadow=true;root.add(mesh);
      if(collider)colliders.push({name,x,z,w,d});
      return mesh;
    };
    const addNaturalBarrier=(name,x,z,w,d,collider=true)=>{
      const alongX=w>=d,span=Math.max(w,d),thickness=alongX?d:w;
      const count=Math.max(2,Math.ceil(span/2.1)),rows=2;
      const stones=new THREE.InstancedMesh(naturalRockGeometry,rockMat,count*rows);
      stones.name=name;stones.castShadow=true;stones.receiveShadow=true;
      const dummy=new THREE.Object3D();
      let index=0;
      for(let row=0;row<rows;row++)for(let i=0;i<count;i++){
        const t=count === 1 ? 0.5 : i/(count-1);
        const offset=(t-.5)*span;
        const jitter=Math.sin((i+1)*1.71+row*.8)*.2;
        dummy.position.set(
          alongX?x+offset:x+jitter,
          floorY+1.0+row*2.05+(i%3)*.12,
          alongX?z+jitter:z+offset
        );
        dummy.rotation.set((i%4-1.5)*.11,i*.37+row*.19,(row?-.12:.1)+(i%3)*.035);
        dummy.scale.set(
          alongX?1.0+(i%3)*.18:Math.max(.85,thickness*1.35),
          1.15+row*.42+(i%3)*.16,
          alongX?Math.max(.82,thickness*1.45):1.0+(i%3)*.18
        );
        dummy.updateMatrix();stones.setMatrixAt(index++,dummy.matrix);
      }
      stones.instanceMatrix.needsUpdate=true;
      root.add(stones);
      if(collider)colliders.push({
        name,x,z,
        w:alongX?w+1.0:Math.max(w,1.8),
        d:alongX?Math.max(d,1.8):d+1.0
      });
      return stones;
    };
    const floor=add('electric-dungeon-floor',520,floorY-.2,558,32,.4,44,floorMat);
    floor.receiveShadow=true;
    // The cavern is enclosed by irregular stone masses, not black rectangular room walls.
    addNaturalBarrier('electric-dungeon-left-wall',504.3,558,.7,44,true);
    addNaturalBarrier('electric-dungeon-right-wall',535.7,558,.7,44,true);
    addNaturalBarrier('electric-dungeon-back-wall',520,579.5,32,.8,true);
    // A broken overhead rock canopy leaves uneven gaps and natural silhouettes.
    const ceilingGroup=new THREE.Group();ceilingGroup.name='electric-dungeon-ceiling-rocks';
    const ceilingRocks=new THREE.InstancedMesh(naturalRockGeometry,rockMat,30);
    ceilingRocks.name='electric-dungeon-natural-ceiling';
    const ceilingDummy=new THREE.Object3D();
    for(let i=0;i<30;i++){
      const col=i%6,row=Math.floor(i/6);
      ceilingDummy.position.set(506+col*5.5+Math.sin(i*1.4)*.6,floorY+7.15+(i%3)*.18,541+row*8.4+Math.cos(i*1.2)*.55);
      ceilingDummy.rotation.set(i*.13,i*.27,i*.09);
      ceilingDummy.scale.set(2.6+(i%3)*.45,.85+(i%2)*.25,3.1+(i%4)*.35);
      ceilingDummy.updateMatrix();ceilingRocks.setMatrixAt(i,ceilingDummy.matrix);
    }
    ceilingRocks.instanceMatrix.needsUpdate=true;ceilingGroup.add(ceilingRocks);root.add(ceilingGroup);
    // Natural boulder jambs frame the center passage without closing the three cave routes.
    addNaturalBarrier('electric-dungeon-entry-left',511,538,.9,1.1,true);
    addNaturalBarrier('electric-dungeon-entry-right',529,538,.9,1.1,true);
    // The center labyrinth stays walkable, but each wall is now an irregular stone ridge.
    // The left/right wings are intentionally kept clear for their separate cave chambers.
    const mazeWall=(name,x,z,w,d)=>addNaturalBarrier(name,x,z,w,d,true);
    mazeWall('electric-dungeon-maze-west-first',516.25,548,4.0,.8);
    mazeWall('electric-dungeon-maze-east-first',523.75,548,4.0,.8);
    mazeWall('electric-dungeon-maze-northwest-turn',517.5,553,.8,5.5);
    mazeWall('electric-dungeon-maze-northeast-turn',522.5,557,.8,5.5);
    mazeWall('electric-dungeon-maze-center-crossbar',519,562,6.0,.8);
    mazeWall('electric-dungeon-maze-southwest-branch',517.3,568,4.0,.8);
    mazeWall('electric-dungeon-maze-southeast-branch',522.7,572,4.0,.8);
    mazeWall('electric-dungeon-maze-dead-end-marker',520,575,.8,4.5);
    // Broken stalactites and stalagmites add natural structure without blocking the boot route.
    const caveConeGeometry=new THREE.ConeGeometry(.32,1.55,6);
    const caveCones=new THREE.InstancedMesh(caveConeGeometry,rockMat,24);
    caveCones.name='electric-dungeon-natural-stalactites-stalagmites';
    const coneDummy=new THREE.Object3D();
    for(let i=0;i<24;i++){
      const side=i%2?1:-1,section=Math.floor(i/2);
      const x=520+side*(2.3+(section%3)*.42);
      const z=550+section*2.35;
      const hanging=i%4===1||i%4===2;
      coneDummy.position.set(x,floorY+(hanging?6.15:0.78),z);
      coneDummy.rotation.set(0,section*.31,hanging?Math.PI:side*.08);
      coneDummy.scale.set(.8+(section%3)*.2,hanging?.9+(section%2)*.18:.75+(section%3)*.16,.8+(section%2)*.2);
      coneDummy.updateMatrix();caveCones.setMatrixAt(i,coneDummy.matrix);
    }
    caveCones.instanceMatrix.needsUpdate=true;root.add(caveCones);
    // Distinct stone markers make route choices readable in low light.
    for(const [name,x,z,r] of [
      ['west-route-crystal',508.5,553,.8],['central-route-stalagmite',523,556,1.05],
      ['east-route-crystal',532.5,565,.75],['boot-alcove-stalagmite',519,574,.9]
    ]){
      const landmark=new THREE.Mesh(new THREE.ConeGeometry(r,2.4,6),rockMat);
      landmark.name='electric-dungeon-landmark-'+name;
      landmark.position.set(x,floorY+1.2,z);landmark.castShadow=true;root.add(landmark);
    }
    for(const [x,z,scale] of [[508,549,2.4],[531,551,2.1],[513,563,1.7],[529,574,2.4],[507,572,1.6]]){
      const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(1,1),rockMat);rock.name='electric-dungeon-obscuring-rock';rock.position.set(x,floorY+scale*.42,z);rock.scale.set(scale,scale*.85,scale*1.15);rock.castShadow=true;rock.receiveShadow=true;root.add(rock);colliders.push({name:'electric-dungeon-rock-collider',x,z,w:scale*1.25,d:scale*1.35});
    }
    // A small neon boot pair is partially screened by a dark boulder.
    const bootMat=new THREE.MeshStandardMaterial({color:0x62f5ff,emissive:0x18bcd1,emissiveIntensity:1.8,roughness:.38,metalness:.22});
    const boots=new THREE.Group();boots.name='electric-dungeon-rocket-boots-pickup';boots.position.set(524,floorY+.45,568);
    for(const dx of [-.34,.34]){const boot=new THREE.Mesh(new THREE.BoxGeometry(.38,.38,.78),bootMat);boot.position.set(dx,0,0);boot.rotation.y=dx<0?-.12:.12;boots.add(boot);const sole=new THREE.Mesh(new THREE.BoxGeometry(.4,.09,.8),new THREE.MeshStandardMaterial({color:0xe8fbff,emissive:0x4bd5e6,emissiveIntensity:1.1}));sole.position.set(dx,-.2,0);boots.add(sole);}
    root.add(boots);root.userData.coastlineColliders=colliders;root.userData.coastlineDungeonFloorY=floorY;root.userData.coastlineRocketBootsPickup=boots;
    roots.addWorldRoot(root);root.visible=true;window.__coastlineElectricDungeonFloorY=floorY;window.__coastlineElectricDungeonPickup=boots;
    if(avatar&&avatar.parent!==root)root.add(avatar);moveActiveActor(root);
    applySnapshot({player:context.player,vehicle:context.vehicle,vehicleIndex:context.vehicleIndex},root,destinationSpawn||{x:548,y:floorY,z:542,rotationY:0});
    window.__coastlineActiveWorldColliders=colliders;return{id:'electric-lemonade-dungeon',root};
  },unload:async handle=>{if(handle.root?.parent)roots.removeWorldRoot(handle.root);disposeRoot(handle.root);if(pendingDungeonRoot===handle.root)pendingDungeonRoot=null;if(window.__coastlineElectricDungeonFloorY!==undefined)delete window.__coastlineElectricDungeonFloorY;window.__coastlineElectricDungeonPickup=null;},cleanupFailedLoad:async({context})=>{
    const activeId=manager.getActiveWorldId(),sourceRoot=activeId==='city'?roots.world1Root:activeId==='island'?pendingIslandRoot:activeId==='homey-garage'?pendingGarageRoot:activeId==='home-interior'?pendingHouseRoot:activeId==='electric-lemonade-dungeon'?pendingDungeonRoot:pendingRegionRoots.get(activeId);
    window.__coastlineActiveWorldId=activeId||'waterfront';setIslandCollisionScope(activeId!=='city');window.__coastlineActiveWorldColliders=sourceRoot?.userData?.coastlineColliders||[];
    if(sourceRoot){moveActiveActor(sourceRoot);applySnapshot({player:context.player,vehicle:context.vehicle,vehicleIndex:context.vehicleIndex},sourceRoot);}
    if(pendingDungeonRoot?.parent)roots.removeWorldRoot(pendingDungeonRoot);if(pendingDungeonRoot)disposeRoot(pendingDungeonRoot);pendingDungeonRoot=null;delete window.__coastlineElectricDungeonFloorY;window.__coastlineElectricDungeonPickup=null;
  },captureState:async({context})=>({player:context.player,vehicle:context.vehicle,vehicleIndex:context.vehicleIndex}),restoreState:async(worldState,{handle,destinationSpawn})=>{setIslandCollisionScope(true);window.__coastlineActiveWorldId='electric-lemonade-dungeon';pendingDungeonRoot=handle.root;window.__coastlineElectricDungeonFloorY=handle.root.userData.coastlineDungeonFloorY;window.__coastlineElectricDungeonPickup=handle.root.userData.coastlineRocketBootsPickup;handle.root.visible=true;moveActiveActor(handle.root);applySnapshot(worldState,handle.root,destinationSpawn);window.__coastlineActiveWorldColliders=handle.root.userData.coastlineColliders||[];}};
  const houseWorld={id:'home-interior',name:'Homey Island House Interior',content:{density:'developed',actorAssets:'shared',renderReadiness:'required'},load:async({context,destinationSpawn})=>{setIslandCollisionScope(true);window.__coastlineActiveWorldId='home-interior';pendingHouseRoot=createHouseRoot();roots.addWorldRoot(pendingHouseRoot);pendingHouseRoot.visible=true;const parkedVehicle=garageVehicle||player.vehicle;if(parkedVehicle?.g){parkedVehicle.g.visible=false;if(parkedVehicle.g.parent!==roots.world1Root)roots.world1Root.add(parkedVehicle.g);}if(avatar&&avatar.parent!==pendingHouseRoot)pendingHouseRoot.add(avatar);const spawn=destinationSpawn||{x:483,y:islandGroundY(483,500),z:508.5,rotationY:Math.PI};applySnapshot({player:context.player,vehicle:context.vehicle,vehicleIndex:context.vehicleIndex},pendingHouseRoot,spawn);window.__coastlineActiveWorldColliders=pendingHouseRoot.userData.coastlineColliders||[];return{id:'home-interior',root:pendingHouseRoot};},unload:async handle=>{if(handle.root?.parent)roots.removeWorldRoot(handle.root);disposeRoot(handle.root);if(pendingHouseRoot===handle.root)pendingHouseRoot=null;},cleanupFailedLoad:async({context})=>{const activeId=manager.getActiveWorldId(),sourceRoot=activeId==='city'?roots.world1Root:activeId==='island'?pendingIslandRoot:activeId==='homey-garage'?pendingGarageRoot:pendingRegionRoots.get(activeId);window.__coastlineActiveWorldId=activeId||'homey-garage';window.__coastlineActiveWorldColliders=sourceRoot?.userData?.coastlineColliders||[];if(sourceRoot){moveActiveActor(sourceRoot);applySnapshot({player:context.player,vehicle:context.vehicle,vehicleIndex:context.vehicleIndex},sourceRoot);}if(pendingHouseRoot?.parent)roots.removeWorldRoot(pendingHouseRoot);if(pendingHouseRoot)disposeRoot(pendingHouseRoot);pendingHouseRoot=null;},captureState:async({context})=>({player:context.player,vehicle:context.vehicle,vehicleIndex:context.vehicleIndex}),restoreState:async(worldState,{handle,destinationSpawn})=>{setIslandCollisionScope(true);window.__coastlineActiveWorldId='home-interior';pendingHouseRoot=handle.root;handle.root.visible=true;const parkedVehicle=garageVehicle||player.vehicle;if(parkedVehicle?.g){parkedVehicle.g.visible=false;if(parkedVehicle.g.parent!==roots.world1Root)roots.world1Root.add(parkedVehicle.g);}if(avatar&&avatar.parent!==handle.root)handle.root.add(avatar);applySnapshot(worldState,handle.root,destinationSpawn);}};
  manager.registerWorld(cityWorld);manager.registerWorld(islandWorld);manager.registerWorld(waterfrontWorld);manager.registerWorld(portWorld);manager.registerWorld(garageWorld);manager.registerWorld(houseWorld);manager.registerWorld(dungeonWorld);manager.registerTransition({id:'city-to-island',fromWorld:'city',toWorld:'island',trigger:'bridge',spawn:'fixed',destinationSpawn:ISLAND_BRIDGE_DESTINATION,vehiclePolicy:'allowed'});manager.registerTransition({id:'island-to-city',fromWorld:'island',toWorld:'city',trigger:'bridge',spawn:'fixed',destinationSpawn:CITY_BRIDGE_DESTINATION,vehiclePolicy:'allowed'});manager.registerTransition({id:'island-to-waterfront',fromWorld:'island',toWorld:'waterfront',trigger:'bridge',spawn:'fixed',destinationSpawn:{x:420,y:islandGroundY(420,500),z:500,rotationY:Math.PI/2},vehiclePolicy:'allowed'});manager.registerTransition({id:'waterfront-to-island',fromWorld:'waterfront',toWorld:'island',trigger:'bridge',spawn:'fixed',destinationSpawn:{x:580,y:islandGroundY(580,500),z:500,rotationY:-Math.PI/2},vehiclePolicy:'allowed'});manager.registerTransition({id:'waterfront-to-port',fromWorld:'waterfront',toWorld:'port',trigger:'bridge',spawn:'fixed',destinationSpawn:{x:420,y:islandGroundY(420,500),z:500,rotationY:Math.PI/2},vehiclePolicy:'allowed'});manager.registerTransition({id:'port-to-waterfront',fromWorld:'port',toWorld:'waterfront',trigger:'bridge',spawn:'fixed',destinationSpawn:{x:580,y:islandGroundY(580,500),z:500,rotationY:-Math.PI/2},vehiclePolicy:'allowed'});manager.registerTransition({id:'island-to-homey-garage',fromWorld:'island',toWorld:'homey-garage',trigger:'garage',spawn:'fixed',destinationSpawn:{x:483,y:islandGroundY(483,500),z:500,rotationY:0},vehiclePolicy:'required'});manager.registerTransition({id:'homey-garage-to-island',fromWorld:'homey-garage',toWorld:'island',trigger:'garage',spawn:'fixed',destinationSpawn:{x:483,y:islandGroundY(483,484),z:484,rotationY:Math.PI},vehiclePolicy:'required'});manager.registerTransition({id:'homey-garage-to-house',fromWorld:'homey-garage',toWorld:'home-interior',trigger:'door',spawn:'fixed',destinationSpawn:{x:483,y:islandGroundY(483,500),z:508.5,rotationY:Math.PI},vehiclePolicy:'forbidden'});manager.registerTransition({id:'home-to-homey-garage',fromWorld:'home-interior',toWorld:'homey-garage',trigger:'door',spawn:'fixed',destinationSpawn:{x:483,y:islandGroundY(483,500),z:512.5,rotationY:0},vehiclePolicy:'forbidden'});manager.registerTransition({id:'waterfront-to-electric-dungeon',fromWorld:'waterfront',toWorld:'electric-lemonade-dungeon',trigger:'cave',spawn:'fixed',destinationSpawn:{x:520,y:islandGroundY(),z:546.5,rotationY:0},vehiclePolicy:'forbidden'});manager.registerTransition({id:'electric-dungeon-to-waterfront',fromWorld:'electric-lemonade-dungeon',toWorld:'waterfront',trigger:'cave',spawn:'fixed',destinationSpawn:{x:520,y:islandGroundY(),z:537.5,rotationY:Math.PI},vehiclePolicy:'forbidden'});
  const transition=async transitionId=>{if(autoTransitionPromise)return autoTransitionPromise;autoTransitionPromise=manager.transition(transitionId,makeContext()).then(()=>{const activeId=manager.getActiveWorldId(),activeRoot=activeId==='city'?roots.world1Root:activeId==='island'?pendingIslandRoot:activeId==='homey-garage'?pendingGarageRoot:activeId==='home-interior'?pendingHouseRoot:activeId==='electric-lemonade-dungeon'?pendingDungeonRoot:pendingRegionRoots.get(activeId);if(activeId!=='homey-garage'){for(const prop of window.__coastlineGarageProps||[])prop.reset?.();}if(activeId!=='island'){for(const lamp of window.__coastlineHomeyDrivewayLights||[])lamp.reset?.();}window.__coastlineBridgeBufferActive=activeId==='city';setIslandCollisionScope(activeId!=='city');window.__coastlineActiveWorldId=activeId;window.__coastlineActiveWorldRoot=activeRoot||null;window.__coastlineActiveWorldColliders=activeRoot?.userData?.coastlineColliders||[];installOutdoorFleet(activeRoot,activeId);previousVehiclePosition=null;previousFootPosition=null;return manager.getStatus();}).finally(()=>{autoTransitionPromise=null;});return autoTransitionPromise;};
  const initialize=async()=>{addCityBoundaryScenery();addCityBridgeAffordance();setIslandCollisionScope(false);window.__coastlineBridgeBufferActive=true;roots.world1Root.visible=true;await manager.activate('city',makeContext());window.__coastlineActiveWorldId='city';window.__coastlineActiveWorldRoot=roots.world1Root;window.__coastlineActiveWorldColliders=[];const garageUseButton=document.createElement('button');garageUseButton.id='coastlineGarageUseBoard';garageUseButton.type='button';garageUseButton.textContent='USE KEY BOARD';garageUseButton.setAttribute('aria-label','Use garage vehicle key board');garageUseButton.style.cssText='display:none;position:fixed;left:50%;bottom:118px;transform:translateX(-50%);z-index:1001;pointer-events:auto;border:1px solid #8be8ff88;border-radius:13px;padding:11px 15px;background:#0b2732f5;color:#effcff;font:900 13px system-ui,sans-serif;letter-spacing:.07em;box-shadow:0 8px 24px #0008';document.body.appendChild(garageUseButton);garageBoardButton=garageUseButton;garageEntryButton=document.createElement('button');garageEntryButton.id='coastlineGarageEnter';garageEntryButton.type='button';garageEntryButton.textContent='ENTER HOMEY GARAGE';garageEntryButton.setAttribute('aria-label','Enter Homey garage with selected vehicle');garageEntryButton.style.cssText='display:none;position:fixed;left:50%;bottom:118px;transform:translateX(-50%);z-index:1001;pointer-events:auto;border:1px solid #caff7788;border-radius:13px;padding:12px 17px;background:#12271df5;color:#eaffce;font:900 13px system-ui,sans-serif;letter-spacing:.07em;box-shadow:0 8px 24px #0008';garageEntryButton.addEventListener('click',()=>{if(manager.getActiveWorldId()!=='island'||player.mode!=='vehicle')return;transition('island-to-homey-garage').catch(error=>{lastAutoTrigger={...lastAutoTrigger,eligible:false,reason:'garage-entry-failed',error:String(error?.message||error)};});});document.body.appendChild(garageEntryButton);const swapGarageVehicle=choice=>{const current=garageVehicle||vehicles.find(v=>v?.kind==='car'&&Math.hypot(v.x-483,v.z-500)<5);const donor=vehicles.find(v=>v?.kind==='car'&&v!==current&&v.rgsdevModelName===choice.model&&v.g?.children?.length)||(current?.rgsdevModelName===choice.model&&current.g?.children?.length?current:null);if(!current||!donor){garageUseButton.textContent='VEHICLE NOT READY — TRY AGAIN';return;}const sourceVisual=donor.g.children.find(child=>child.visible!==false)||donor.g.children[0];if(!sourceVisual){garageUseButton.textContent='VEHICLE NOT READY — TRY AGAIN';return;}const sourceMeshes=[];sourceVisual.traverse(node=>{if(node.isMesh)sourceMeshes.push(node)});const clone=sourceVisual.clone(true),cloneMeshes=[];clone.traverse(node=>{if(node.isMesh){cloneMeshes.push(node);node.userData.coastlineSharedGeometry=true;node.userData.coastlineOwnedMaterial=true;node.material=Array.isArray(node.material)?node.material.map(material=>material?.clone?.()||material):node.material?.clone?.()||node.material;}});const roleIndices={body:(donor.materialRoles?.body||[]).map(mesh=>sourceMeshes.indexOf(mesh)).filter(i=>i>=0),glass:(donor.materialRoles?.glass||[]).map(mesh=>sourceMeshes.indexOf(mesh)).filter(i=>i>=0),wheels:(donor.materialRoles?.wheels||[]).map(mesh=>sourceMeshes.indexOf(mesh)).filter(i=>i>=0),lights:(donor.materialRoles?.lights||[]).map(mesh=>sourceMeshes.indexOf(mesh)).filter(i=>i>=0)};const bodyMaterialPattern=/(body|paint|panel|exterior|hood|bonnet|door|fender|shell|chassis)/i;const protectedMaterialPattern=/(glass|window|windshield|windscreen|wheel|tire|tyre|rim|light|lamp|chrome|trim|interior|seat|dash|mirror|grill|grille|bumper|plastic|hardware)/i;let paintedMaterialCount=0;for(const index of roleIndices.body){const mesh=cloneMeshes[index];if(!mesh)continue;const isMultiMaterial=Array.isArray(mesh.material);for(const material of (isMultiMaterial?mesh.material:[mesh.material])){if(!material?.color)continue;const materialName=String(material.name||''),meshName=String(mesh.name||'');if(protectedMaterialPattern.test(materialName))continue;if(bodyMaterialPattern.test(materialName)||(!isMultiMaterial&&bodyMaterialPattern.test(meshName))){material.color.set(choice.color.hex);paintedMaterialCount++;}}}for(const child of [...current.g.children]){current.g.remove(child);child.traverse?.(node=>{if(node.userData?.coastlineOwnedMaterial)for(const material of (Array.isArray(node.material)?node.material:[node.material]))material?.dispose?.();});}current.g.add(clone);const mapRole=key=>roleIndices[key].map(i=>cloneMeshes[i]).filter(Boolean);current.materialRoles={body:mapRole('body'),glass:mapRole('glass'),wheels:mapRole('wheels'),lights:mapRole('lights')};current.damageParts={body:null,cab:null,hood:null,trunk:null,roof:null,frontBumper:null,rearBumper:null,wheels:[],visualRoot:clone};current.basePaint=new THREE.Color(choice.color.hex);current.coastlinePaintDiagnostics={requestedColor:choice.color.hex,paintedMaterialCount,bodyMaterialNames:roleIndices.body.flatMap(i=>{const m=cloneMeshes[i]?.material;return(Array.isArray(m)?m:[m]).map(v=>v?.name||'')})};current.rgsdevModelName=choice.model;current.g.visible=true;current.g.position.set(483,islandGroundY(483,500),500);current.g.rotation.y=Math.PI;current.x=483;current.z=500;current.heading=Math.PI;current.speed=0;current.parked=true;current.occupied=false;current.drivable=true;current.worldX=483;current.worldZ=500;garageVehicle=current;garageUseButton.textContent='USE KEY BOARD';garageUseButton.title=paintedMaterialCount?'Selected '+choice.model+' in '+choice.color.name+'; recolored '+paintedMaterialCount+' body material slot(s)':'Selected '+choice.model+'; source FBX has no safely identifiable body-paint material slot, so non-body parts were left untouched';garageUseButton.setAttribute('aria-label','Vehicle ready: '+choice.model+', '+choice.color.name+'. Use key board to choose again');};garageUseButton.addEventListener('click',()=>{if(player.mode!=='walk'||manager.getActiveWorldId()!=='homey-garage')return;openGarageVehicleChooser({vehicles,currentVehicle:garageVehicle,onConfirm:swapGarageVehicle,onCancel:()=>{}});});const button=document.createElement('button');button.id='coastlineWorldTransition';button.type='button';button.setAttribute('aria-label','Cross bridge between Coastline Island and City');button.style.cssText='display:none;position:fixed;left:50%;bottom:170px;transform:translateX(-50%);z-index:1000;pointer-events:auto;border:1px solid #a7f4ff88;border-radius:12px;padding:6px 8px;background:#06202aee;color:#effcff;font:800 12px system-ui,sans-serif;letter-spacing:.08em;box-shadow:0 8px 24px #0008';let promptedTransitionId='city-to-island';
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
      if(!activeWorld||(!vehicle&&player.mode!=='walk')){previousVehiclePosition=null;lastAutoTrigger={eligible:false,reason:'no-active-actor-or-world',world:activeWorld,x:vehicle?.x??player.x??null,z:vehicle?.z??player.z??null,heading:vehicle?.heading??player.heading??null,error:null};button.style.display='none';if(garageEntryButton)garageEntryButton.style.display='none';return;}
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
      const vehicleX=finiteOr(vehicle?.x,player.x),vehicleZ=finiteOr(vehicle?.z,player.z),vehicleHeading=finiteOr(vehicle?.heading,player.heading),actorX=player.mode==='vehicle'?vehicleX:finiteOr(player.x),actorZ=player.mode==='vehicle'?vehicleZ:finiteOr(player.z),actorHeading=player.mode==='vehicle'?vehicleHeading:finiteOr(player.heading);const previous=previousVehiclePosition;const garageThreshold={x:483,z:488,halfWidth:7.2};const currentVehiclePosition={x:vehicleX,z:vehicleZ,heading:vehicleHeading};const garageEntryEligible=activeWorld==='island'&&Boolean(vehicle)&&player.mode==='vehicle'&&Math.abs(vehicleX-garageThreshold.x)<=garageThreshold.halfWidth&&Math.abs(vehicleZ-garageThreshold.z)<=11&&Math.cos(vehicleHeading)>.3&&Math.abs(vehicle.speed||0)<=8;if(garageEntryButton)garageEntryButton.style.display=garageEntryEligible?'block':'none';const garageExitCrossing=Boolean(vehicle)&&player.mode==='vehicle'&&activeWorld==='homey-garage'&&didCrossGarageThreshold(previous,currentVehiclePosition,{...garageThreshold,direction:'out'});previousVehiclePosition=vehicle?{x:vehicleX,z:vehicleZ}:null;if(garageExitCrossing&&!autoTransitionPromise){transition('homey-garage-to-island').catch(error=>{lastAutoTrigger={...lastAutoTrigger,eligible:false,reason:'garage-exit-failed',error:String(error?.message||error)};});return;}
      const nearGate=gate=>gate.axis==='z'?Math.abs(actorX-gate.x)<=12&&Math.abs(actorZ-gate.z)<=18:Math.abs(actorZ-gate.z)<=12&&Math.abs(actorX-gate.x)<=18;
      const headingToGate=gate=>gate.axis==='z'?Math.cos(actorHeading)*gate.sign>.45:Math.sin(actorHeading)*gate.sign>.45;
      const gate=gates.find(candidate=>nearGate(candidate)&&headingToGate(candidate));
      const eligible=status.state==='active'&&Boolean(gate)&&!autoTransitionPromise;
      lastAutoTrigger={eligible,reason:status.state!=='active'?'manager-not-active':!gate?(gates.some(nearGate)?'wrong-heading':'outside-end-zone'):autoTransitionPromise?'transition-in-flight':'ready',world:activeWorld,x:actorX,z:actorZ,heading:actorHeading,transitionId:gate?.id??null,mode:player.mode,error:null};
      if(eligible)transition(gate.id).catch(error=>{lastAutoTrigger={...lastAutoTrigger,eligible:false,reason:'transition-error',error:String(error?.message||error)};button.textContent=`TRANSITION FAILED: ${error.message}`;});
      // Bridge crossings are continuous CTM handoffs; never expose a manual bridge-transition prompt.
      promptedTransitionId=null;
      button.style.display='none';
    };
    window.__coastlineTransitionTest={activeWorldRoot:()=>window.__coastlineActiveWorldRoot?.name||null,activeWorldFleet:()=>{const root=window.__coastlineActiveWorldRoot;return(activeWorldFleets.get(root)||[]).filter(vehicle=>vehicle.g?.parent===root).map(vehicle=>({id:vehicle.homeyFleetId,kind:vehicle.kind,model:vehicle.rgsdevModelName||null,x:vehicle.x,z:vehicle.z,visible:vehicle.g.visible,drivable:vehicle.drivable!==false,occupied:!!vehicle.occupied}));},worldIds:()=>['city','island','waterfront','port','homey-garage','home-interior'],houseState:()=>({root:hierarchySignature(pendingHouseRoot),threshold:pendingHouseRoot?.userData?.coastlineHouseContract?.threshold??null,parkedVehicleHidden:Boolean((garageVehicle||player.vehicle)?.g&&(garageVehicle||player.vehicle).g.visible===false)}),islandDetailState:()=>Object.fromEntries([['residential',pendingIslandRoot],['waterfront',pendingRegionRoots.get('waterfront')],['port',pendingRegionRoots.get('port')]].map(([id,root])=>{let boundary=false,lamps=false,benches=0;if(root)root.traverse(node=>{if(node.name===`coastline-${id}-landscape-boundary-rocks`)boundary=true;if(node.name===`coastline-${id}-street-lamp-posts`)lamps=true;if(node.name.startsWith(`coastline-${id}-street-bench-seat-`))benches++;});return[id,{meshes:hierarchySignature(root)?.meshes??0,boundary,lamps,benches}]})),worldDefinitions:()=>manager.getWorldDefinitions(),garageState:()=>({root:hierarchySignature(pendingGarageRoot),floorY:pendingGarageRoot?.userData?.coastlineGarageFloorY??null,decorCount:pendingGarageRoot?.userData?.coastlineGarageDecorCount??0,garageDoorSlatCount:pendingGarageRoot?.children?.filter(node=>node.name.startsWith('garage-rollup-door-slat-')).length??0,houseDoorPresent:Boolean(pendingGarageRoot?.children?.find(node=>node.name==='garage-house-door-open-leaf')),cameraMode:manager.getActiveWorldId()==='homey-garage',ceilingVisible:pendingGarageRoot?.userData?.coastlineGarageCamera?.ceiling?.visible??null,sideWallOpacity:pendingGarageRoot?.userData?.coastlineGarageCamera?.sideWalls?.[0]?.material?.opacity??null,boardVisible:garageBoardButton?.style.display==='block',vehicleIndex:garageVehicle?vehicles.indexOf(garageVehicle):-1,threshold:pendingGarageRoot?.userData?.coastlineGarageContract?.threshold??null}),garageVehicleRef:()=>garageVehicle,vehicleMaterialSnapshot:(modelName,excludeIndex=-1)=>{const vehicle=vehicles.find(item=>item?.kind==='car'&&item.rgsdevModelName===modelName&&vehicles.indexOf(item)!==excludeIndex);if(!vehicle)return null;const patterns={body:/(body|paint|panel|exterior|hood|bonnet|door|fender|shell|chassis)/i,glass:/(glass|window|windshield|windscreen)/i,wheels:/(wheel|tire|tyre|rim)/i,lights:/(light|lamp|signal)/i};const colors=role=>(vehicle.materialRoles?.[role]||[]).flatMap(mesh=>(Array.isArray(mesh.material)?mesh.material:[mesh.material]).filter(material=>patterns[role].test(String(material?.name||''))).map(material=>material?.color?.getHexString?.()??null));return{index:vehicles.indexOf(vehicle),body:colors('body'),glass:colors('glass'),wheels:colors('wheels'),lights:colors('lights')};},garageVehicleMaterialSnapshot:()=>{if(!garageVehicle)return null;const patterns={body:/(body|paint|panel|exterior|hood|bonnet|door|fender|shell|chassis)/i,glass:/(glass|window|windshield|windscreen)/i,wheels:/(wheel|tire|tyre|rim)/i,lights:/(light|lamp|signal)/i};const colors=role=>(garageVehicle.materialRoles?.[role]||[]).flatMap(mesh=>(Array.isArray(mesh.material)?mesh.material:[mesh.material]).filter(material=>patterns[role].test(String(material?.name||''))).map(material=>material?.color?.getHexString?.()??null));return{body:colors('body'),glass:colors('glass'),wheels:colors('wheels'),lights:colors('lights')};},regionRoots:()=>({residential:hierarchySignature(pendingIslandRoot),waterfront:hierarchySignature(pendingRegionRoots.get('waterfront')),port:hierarchySignature(pendingRegionRoots.get('port'))}),activeWorldColliderCount:()=>window.__coastlineActiveWorldColliders?.length??0,status:()=>manager.getStatus(),autoTriggerState:()=>({...lastAutoTrigger}),bridgePromptVisible:()=>button.style.display==='block',garageEntryVisible:()=>garageEntryButton?.style.display==='block',playerState:()=>({position:{x:player.x,y:player.y,z:player.z},heading:player.heading,mode:player.mode,vehicleIndex:vehicles.indexOf(player.vehicle),vehicleSpeed:player.vehicle?.speed??0}),rootVisibility:()=>({cityVisible:roots.world1Root.visible,cityCachedInScene:Boolean(roots.world1Root.parent===scene),cityContent:hierarchySignature(roots.world1Root),islandVisible:Boolean(pendingIslandRoot?.visible),islandRootResident:Boolean(pendingIslandRoot?.parent===scene),islandContent:hierarchySignature(pendingIslandRoot)}),transition,updatePrompt:updatePromptCallback,flushAutoTransition:async()=>{if(autoTransitionPromise)await autoTransitionPromise;},failNextWorld2Load:()=>{failNextIslandLoad=true;},world2Spawn:()=>({...ISLAND_START}),bridgeZones:()=>({cityApproach:{...CITY_APPROACH},islandApproach:{...ISLAND_APPROACH}}),cityBoundaryState:()=>{const root=roots.world1Root.getObjectByName('coastline-city-map-edge-boundary');return{present:Boolean(root),rocks:Boolean(root?.getObjectByName('coastline-city-map-edge-rocks')),scrub:Boolean(root?.getObjectByName('coastline-city-map-edge-tall-scrub'))};},drivewayLampState:()=>{const lamps=window.__coastlineHomeyDrivewayLights||[];return{count:lamps.length,names:lamps.map(lamp=>lamp.group?.name||''),fallen:lamps.filter(lamp=>lamp.fallen).length};},bridgeSurfaceY:(x,z)=>window.__coastlineBridgeGroundY?.(x,z)??null,cityBridgeContract:()=>({bridgeLength:BRIDGE_LENGTH,cityMapEdge:CITY_MAP_EDGE_Z,cityEdge:CITY_BRIDGE_START_Z,bridgeEnd:CITY_BRIDGE_END_Z,playableCityMinZ:CITY_MAP_EDGE_Z,outsideBufferLength:BRIDGE_LENGTH,destination:{...CITY_BRIDGE_DESTINATION},spawnPolicy:'fixed'}),world2Layout:()=>({bounds:{...ISLAND_BOUNDS},spawn:{...ISLAND_START},islandBridge:{x:ISLAND_CENTER.x,z:ISLAND_BRIDGE_START_Z},islandBridgeDestination:{...ISLAND_BRIDGE_DESTINATION},spawnToIslandBridge:Math.hypot(ISLAND_START.x-ISLAND_CENTER.x,ISLAND_START.z-ISLAND_BRIDGE_START_Z),bridgeLength:BRIDGE_LENGTH,bridgeIslandEdge:ISLAND_BRIDGE_START_Z,bridgeCityEdge:ISLAND_BRIDGE_END_Z,palm:null}),visualIdentity,activeVehicleVisible:()=>Boolean(player.vehicle?.g&&player.vehicle.g.visible&&(()=>{let hidden=false;player.vehicle.g.traverse(node=>{if(node.visible===false)hidden=true;});return !hidden;})()),collisionScope:()=>Boolean(window.__coastlineWorld2Active)};
    window.addEventListener('keydown',updatePromptCallback);setInterval(()=>updatePromptCallback(),200);return manager;};
  const initializePromise=initialize();return{manager,ready:initializePromise,initialize:()=>initializePromise,transition,updatePrompt:()=>updatePromptCallback(),dispose:async()=>{setIslandCollisionScope(false);garageBoardButton?.remove();garageEntryButton?.remove();if(pendingHouseRoot){roots.removeWorldRoot(pendingHouseRoot);disposeRoot(pendingHouseRoot);pendingHouseRoot=null;}if(pendingGarageRoot){roots.removeWorldRoot(pendingGarageRoot);disposeRoot(pendingGarageRoot);pendingGarageRoot=null;}if(pendingIslandRoot){roots.removeWorldRoot(pendingIslandRoot);disposeRoot(pendingIslandRoot);pendingIslandRoot=null;}}};
}
