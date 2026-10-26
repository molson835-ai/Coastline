import { unzipSync } from 'https://cdn.jsdelivr.net/npm/fflate@0.8.2/esm/browser.js';
import { FBXLoader } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/loaders/FBXLoader.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/utils/SkeletonUtils.js';

const VEHICLE_PACK_URL = './assets/Free%20Low%20Poly%20Vehicles%20Pack%20by%20Rgsdev.zip';
const COZY_CHARACTER_URL = './assets/grab3d-cozy-character.glb';
let vehiclePackPromise;
let cozyCharacterPromise;

const MODEL_PATHS = [
  ['Ambulance', /\/Ambulance\/Ambulance\.fbx$/i],
  ['Bus', /\/Bus\/Bus\.fbx$/i],
  ['Firetruck', /\/Firetruck\/Firetruck\.fbx$/i],
  ['Hatchback', /\/Hatchback\/Hatchback\.fbx$/i],
  ['Limousine', /\/Limousine\/Limousine\.fbx$/i],
  ['Monster Truck', /\/Monster Truck\/Monster Truck\.fbx$/i],
  ['Muscle', /\/Muscle\/Muscle\.fbx$/i],
  ['Muscle 2', /\/Muscle 2\/Muscle 2\.fbx$/i],
  ['Pickup', /\/Pickup\/Pickup\.fbx$/i],
  ['Police Muscle', /\/Police Muscle\/Police Muscle\.fbx$/i],
  ['Police Sedan', /\/Police Sedan\/Police Sedan\.fbx$/i],
  ['Police Sports', /\/Police Sports\/Police Sports\.fbx$/i],
  ['Police SUV', /\/Police SUV\/Police SUV\.fbx$/i],
  ['Roadster', /\/Roadster\/Roadster\.fbx$/i],
  ['Sedan', /\/Sedan\/Sedan\.fbx$/i],
  ['Sports', /\/Sports\/Sports\.fbx$/i],
  ['SUV', /\/SUV\/SUV\.fbx$/i],
  ['Taxi', /\/Taxi\/Taxi\.fbx$/i],
  ['Truck', /\/Truck\/Truck\.fbx$/i],
  ['Truck with trailer', /\/Truck with trailer\/Truck with trailer\.fbx$/i],
  ['Van', /\/Van\/Van\.fbx$/i]
];

function arrayBufferOf(bytes) {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}
function mimeFor(name) {
  const ext = name.split('.').pop().toLowerCase();
  return ({ png:'image/png', jpg:'image/jpeg', jpeg:'image/jpeg', webp:'image/webp', bmp:'image/bmp', tga:'image/x-tga', fbx:'application/octet-stream', txt:'text/plain' })[ext] || 'application/octet-stream';
}
function removeVisualChildren(root) {
  for (const child of [...root.children]) {
    root.remove(child);
    // Cloned FBX geometry/materials are shared with the cached source; do not dispose shared resources here.
  }
}
function getBounds(THREE, root) {
  root.updateMatrixWorld(true);
  return new THREE.Box3().setFromObject(root);
}
function fitVehicle(THREE, source, target = { width:2.05, length:4.25, height:2.05 }) {
  const model = source.clone(true);
  let bounds = getBounds(THREE, model);
  let size = new THREE.Vector3();
  bounds.getSize(size);
  if (![size.x,size.y,size.z].every(Number.isFinite) || Math.max(size.x,size.y,size.z) <= 0) {
    throw new Error('Vehicle model has invalid bounds');
  }
  const scale = Math.min(target.width / Math.max(size.x,.001), target.length / Math.max(size.z,.001), target.height / Math.max(size.y,.001));
  model.scale.multiplyScalar(scale);
  bounds = getBounds(THREE, model);
  size = new THREE.Vector3();
  bounds.getSize(size);
  model.position.x -= (bounds.min.x + bounds.max.x) / 2;
  model.position.z -= (bounds.min.z + bounds.max.z) / 2;
  model.position.y -= bounds.min.y;
  return model;
}
function makeNeutralVehiclePlaceholder(THREE) {
  const root = new THREE.Group();
  const bodyMaterial = new THREE.MeshStandardMaterial({ color:0x777f86, roughness:.82, metalness:.08 });
  const tireMaterial = new THREE.MeshStandardMaterial({ color:0x24282b, roughness:.95 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.95,.62,4.05), bodyMaterial);
  body.position.y=.72; root.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.45,.62,1.8), new THREE.MeshStandardMaterial({color:0x9da6ab,roughness:.72}));
  cabin.position.set(0,1.31,-.2); root.add(cabin);
  for (const x of [-.98,.98]) for (const z of [-1.32,1.32]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(.34,.34,.18,12),tireMaterial);
    wheel.rotation.z=Math.PI/2; wheel.position.set(x,.38,z); root.add(wheel);
  }
  root.userData.coastlineNeutralFallback = true;
  return root;
}
function bindDamageParts(THREE, vehicle, visual) {
  const meshes=[];
  visual.traverse(node=>{ if(node.isMesh) meshes.push(node); });
  const named=(pattern)=>meshes.find(mesh=>pattern.test(String(mesh.name||'')));
  const body=named(/body|chassis|shell|exterior|paint/i)||meshes[0];
  const glass=named(/glass|window|windshield|windscreen|cabin/i)||body;
  const wheels=meshes.filter(mesh=>/wheel|tire|tyre|rim/i.test(String(mesh.name||''))).slice(0,4);
  vehicle.damageParts={body,cab:glass,hood:named(/hood|bonnet/i)||body,trunk:named(/trunk|boot|tailgate/i)||body,roof:named(/roof/i)||glass,frontBumper:named(/front.*bumper|bumper.*front/i)||body,rearBumper:named(/rear.*bumper|bumper.*rear/i)||body,wheels,visualRoot:visual};
  const heroInfo=vehicle.g.userData?.coastlineHeroVehicle;
  if(heroInfo?.singleShell) { heroInfo.parts=vehicle.damageParts; heroInfo.paintColor='white'; }
  if(body?.material?.color) vehicle.basePaint=body.material.color.clone();
}
function makeBlobMap(files) {
  const byName = new Map(), urls = [];
  for (const [name, bytes] of Object.entries(files)) {
    if (name.endsWith('/')) continue;
    const url = URL.createObjectURL(new Blob([bytes], { type:mimeFor(name) }));
    urls.push(url);
    const normalized = name.replace(/\\/g,'/').toLowerCase();
    const base = normalized.split('/').pop();
    byName.set(normalized,url);
    // FBX texture references are commonly stored as just a basename.
    if (!byName.has(base)) byName.set(base,url);
  }
  return { byName, urls };
}

export async function loadRgsdevVehiclePack(THREE) {
  if (!vehiclePackPromise) vehiclePackPromise = (async () => {
    const response = await fetch(VEHICLE_PACK_URL, { cache:'force-cache' });
    if (!response.ok) throw new Error('Vehicle pack request failed with HTTP ' + response.status);
    const archive = unzipSync(new Uint8Array(await response.arrayBuffer()));
    const { byName, urls } = makeBlobMap(archive);
    const manager = new THREE.LoadingManager();
    manager.setURLModifier(url => {
      let normalized;
      try { normalized = decodeURIComponent(url); } catch { normalized = url; }
      normalized = normalized.replace(/\\/g,'/').toLowerCase();
      const base = normalized.split(/[?#]/)[0].split('/').pop();
      return byName.get(normalized) || byName.get(base) || url;
    });
    const loader = new FBXLoader(manager);
    const models = new Map();
    const files = Object.keys(archive);
    for (const [name, pattern] of MODEL_PATHS) {
      const path = files.find(file => pattern.test(file));
      if (!path) continue;
      const bytes = archive[path];
      const model = loader.parse(arrayBufferOf(bytes), './');
      model.name = name;
      model.userData.coastlineSourcePath = path;
      models.set(name, model);
    }
    if (!models.size) {
      for (const url of urls) URL.revokeObjectURL(url);
      throw new Error('Vehicle pack contains no supported individual FBX vehicle models');
    }
    return { models, urls, licenseText: Object.entries(archive).find(([name]) => /\/License\.txt$/i.test(name))?.[1] };
  })();
  return vehiclePackPromise;
}

export async function createRgsdevVehicleVisual(THREE, name='Sedan', target) {
  const pack = await loadRgsdevVehiclePack(THREE);
  const source = pack.models.get(name) || pack.models.get('Sedan') || pack.models.values().next().value;
  if (!source) throw new Error('No compatible vehicle model is available in the RGSDev pack');
  return fitVehicle(THREE, source, target);
}

export async function applyRgsdevFleet(THREE, vehicles, onStatus = () => {}) {
  // Remove legacy vehicle art immediately. Show only a neutral temporary body until the pack loads.
  for (const vehicle of vehicles) {
    if (!vehicle?.g) continue;
    removeVisualChildren(vehicle.g);
    if (vehicle.kind === 'car') {
      vehicle.g.add(makeNeutralVehiclePlaceholder(THREE));
      vehicle.g.visible = true;
    } else {
      vehicle.g.visible = false;
      vehicle.drivable = false;
      vehicle.occupied = false;
    }
  }
  try {
    const pack = await loadRgsdevVehiclePack(THREE);
    const variants = [...pack.models.keys()].filter(name => !/ambulance|bus|firetruck|police|truck|van/i.test(name));
    const available = variants.length ? variants : [...pack.models.keys()];
    let replaced=0, disabled=0, carIndex=0;
    for (const vehicle of vehicles) {
      if (!vehicle?.g) continue;
      if (vehicle.kind !== 'car') {
        removeVisualChildren(vehicle.g);
        vehicle.g.visible = false;
        vehicle.drivable = false;
        vehicle.occupied = false;
        disabled++;
        continue;
      }
      const hero = !!vehicle.g.userData?.coastlineHeroVehicle?.singleShell;
      const name = hero && pack.models.has('SUV') ? 'SUV' : available[carIndex++ % available.length];
      const visual = await createRgsdevVehicleVisual(THREE,name);
      removeVisualChildren(vehicle.g);
      vehicle.g.add(visual);
      vehicle.g.visible = true;
      vehicle.rgsdevModelName = name;
      bindDamageParts(THREE,vehicle,visual);
      replaced++;
    }
    onStatus({ok:true,replaced,disabled,models:[...pack.models.keys()]});
    return {ok:true,replaced,disabled,models:[...pack.models.keys()]};
  } catch (error) {
    console.error('[Coastline] Replacement vehicle pack failed; old models remain disabled and neutral placeholders are shown.',error);
    let placeholders=0,disabled=0;
    for (const vehicle of vehicles) {
      if (!vehicle?.g) continue;
      removeVisualChildren(vehicle.g);
      if (vehicle.kind==='car') {
        vehicle.g.add(makeNeutralVehiclePlaceholder(THREE));
        vehicle.g.visible=true;
        vehicle.rgsdevModelName='neutral-fallback';
        placeholders++;
      } else {
        vehicle.g.visible=false;
        vehicle.drivable=false;
        vehicle.occupied=false;
        disabled++;
      }
    }
    onStatus({ok:false,reason:'replacement-pack-load-failed',error:String(error),placeholders,disabled});
    return {ok:false,reason:'replacement-pack-load-failed',placeholders,disabled,error};
  }
}

export async function loadCozyCharacterAsset() {
  if (!cozyCharacterPromise) cozyCharacterPromise = new GLTFLoader().loadAsync(COZY_CHARACTER_URL);
  return cozyCharacterPromise;
}

export function createCozyCharacterInstance(THREE, asset, targetHeight=1.95) {
  const root = SkeletonUtils.clone(asset.scene);
  root.name='coastline-cozy-character';
  const bounds=getBounds(THREE,root);
  const size=new THREE.Vector3(); bounds.getSize(size);
  if (!Number.isFinite(size.y) || size.y <= 0) throw new Error('Cozy character has invalid height');
  const scale=targetHeight/size.y;
  root.scale.multiplyScalar(scale);
  root.position.y-=bounds.min.y*scale;
  const mixer=new THREE.AnimationMixer(root);
  const actions=new Map();
  for (const clip of asset.animations || []) actions.set(String(clip.name||'').toLowerCase(),mixer.clipAction(clip));
  const actor={root,mixer,actions,currentAction:null};
  setCozyCharacterAnimation(actor,'idle');
  return actor;
}

export function setCozyCharacterAnimation(actor, name) {
  if (!actor?.actions) return;
  const key=String(name||'idle').toLowerCase();
  const next=actor.actions.get(key)||actor.actions.get('idle')||actor.actions.values().next().value;
  if (!next || actor.currentAction===next) return;
  const previous=actor.currentAction;
  next.reset().fadeIn(.16).play();
  previous?.fadeOut(.16);
  actor.currentAction=next;
}

export function neutralCharacterPlaceholder(THREE) {
  const root=new THREE.Group();
  const material=new THREE.MeshStandardMaterial({color:0x879096,roughness:.9});
  const body=new THREE.Mesh(new THREE.CapsuleGeometry(.24,.72,4,8),material); body.position.y=1.0; root.add(body);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.2,12,8),material); head.position.y=1.63; root.add(head);
  root.userData.coastlineNeutralFallback=true;
  return root;
}
