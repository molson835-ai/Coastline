import { unzipSync } from 'https://cdn.jsdelivr.net/npm/fflate@0.8.2/esm/browser.js';
import { FBXLoader } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/loaders/FBXLoader.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/utils/SkeletonUtils.js';

const VEHICLE_PACK_URL = './assets/Free%20Low%20Poly%20Vehicles%20Pack%20by%20Rgsdev.zip';
const COZY_CHARACTER_URL = './assets/grab3d-cozy-character.glb';
const COASTLINE_STARTING_PAINT = 0xff7a1a;
let vehiclePackPromise;
let cozyCharacterPromise;

const MODEL_PATHS = [
  ['Hatchback', /\/Hatchback\/Hatchback\.fbx$/i], ['Limousine', /\/Limousine\/Limousine\.fbx$/i],
  ['Muscle', /\/Muscle\/Muscle\.fbx$/i], ['Muscle 2', /\/Muscle 2\/Muscle 2\.fbx$/i],
  ['Pickup', /\/Pickup\/Pickup\.fbx$/i], ['Roadster', /\/Roadster\/Roadster\.fbx$/i],
  ['Sedan', /\/Sedan\/Sedan\.fbx$/i], ['Sports', /\/Sports\/Sports\.fbx$/i],
  ['SUV', /\/SUV\/SUV\.fbx$/i], ['Taxi', /\/Taxi\/Taxi\.fbx$/i], ['Van', /\/Van\/Van\.fbx$/i]
];

function arrayBufferOf(bytes) { return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength); }
function mimeFor(name) { const ext = name.split('.').pop().toLowerCase(); return ({ png:'image/png', jpg:'image/jpeg', jpeg:'image/jpeg', webp:'image/webp', bmp:'image/bmp', tga:'image/x-tga', fbx:'application/octet-stream', txt:'text/plain' })[ext] || 'application/octet-stream'; }
function removeVisualChildren(root) {
  for (const child of [...root.children]) {
    root.remove(child);
    child.traverse?.(node => { if (node.geometry && !node.userData?.coastlineSharedGeometry) node.geometry.dispose?.(); if (node.userData?.coastlineOwnedMaterial) for (const material of (Array.isArray(node.material) ? node.material : [node.material])) material?.dispose?.(); });
  }
}
function getBounds(THREE, root) { root.updateMatrixWorld(true); return new THREE.Box3().setFromObject(root); }
function fitVehicle(THREE, source, target = null) {
  const model = source.clone(true);
  const isLimousine = String(source.name || '').toLowerCase().includes('limousine');
  const fitTarget = target || { width:2.05, length:isLimousine ? 5.15 : String(source.name || '').toLowerCase().includes('suv') ? 4.55 : 4.25, height:2.05 };
  model.traverse(node => { if (node.isMesh) { node.userData.coastlineSharedGeometry = true; node.userData.coastlineOwnedMaterial = true; node.material = Array.isArray(node.material) ? node.material.map(material => material.clone()) : node.material?.clone?.() || node.material; } });
  let bounds = getBounds(THREE, model), size = new THREE.Vector3(); bounds.getSize(size);
  if (![size.x,size.y,size.z].every(Number.isFinite) || Math.max(size.x,size.y,size.z) <= 0) throw new Error('Vehicle model has invalid bounds');
  // Normalize every model to a shared passenger-car width/height envelope.
  // The limousine keeps that envelope but gets a deliberately longer wheelbase/body;
  // using a single uniform scale for its unusually long source mesh made it look
  // either too tiny or too tall beside ordinary cars.
  const scale = isLimousine
    ? Math.min(fitTarget.width / Math.max(size.x,.001), fitTarget.height / Math.max(size.y,.001))
    : Math.min(fitTarget.width / Math.max(size.x,.001), fitTarget.length / Math.max(size.z,.001), fitTarget.height / Math.max(size.y,.001));
  model.scale.multiplyScalar(scale); bounds = getBounds(THREE, model); size = new THREE.Vector3(); bounds.getSize(size);
  if (isLimousine) {
    const lengthScale = fitTarget.length / Math.max(size.z,.001);
    model.scale.z *= lengthScale;
    bounds = getBounds(THREE, model); size = new THREE.Vector3(); bounds.getSize(size);
  }
  model.position.x -= (bounds.min.x + bounds.max.x) / 2; model.position.z -= (bounds.min.z + bounds.max.z) / 2; model.position.y -= bounds.min.y;
  return model;
}
function makeNeutralVehiclePlaceholder(THREE) {
  const root = new THREE.Group();
  const bodyMaterial = new THREE.MeshStandardMaterial({ color:0x777f86, roughness:.82, metalness:.08 });
  const tireMaterial = new THREE.MeshStandardMaterial({ color:0x24282b, roughness:.95 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.95,.62,4.05), bodyMaterial); body.position.y=.72; root.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.45,.62,1.8), new THREE.MeshStandardMaterial({color:0x9da6ab,roughness:.72})); cabin.position.set(0,1.31,-.2); root.add(cabin);
  for (const x of [-.98,.98]) for (const z of [-1.32,1.32]) { const wheel = new THREE.Mesh(new THREE.CylinderGeometry(.34,.34,.18,12),tireMaterial); wheel.rotation.z=Math.PI/2; wheel.position.set(x,.38,z); wheel.userData.coastlineOwnedMaterial=true; root.add(wheel); }
  body.userData.coastlineOwnedMaterial=true; cabin.userData.coastlineOwnedMaterial=true; root.userData.coastlineNeutralFallback = true; return root;
}
function setMaterialColor(material, color) { if (material?.color?.isColor) material.color.set(color); }
function forMaterials(mesh, callback) { for (const material of (Array.isArray(mesh.material) ? mesh.material : [mesh.material])) if (material) callback(material); }
function applyVehicleMaterialRoles(THREE, vehicle, visual) {
  const meshes = [];
  visual.updateMatrixWorld(true);
  visual.traverse(node => { if (node.isMesh) meshes.push(node); });
  const label = mesh => [
    mesh.name,
    ...(Array.isArray(mesh.material) ? mesh.material : [mesh.material]).map(material => material?.name || '')
  ].join(' ').toLowerCase();
  const matches = pattern => meshes.filter(mesh => pattern.test(label(mesh)));
  const boundsOf = mesh => new THREE.Box3().setFromObject(mesh);
  const overall = getBounds(THREE, visual);
  const overallSize = new THREE.Vector3();
  overall.getSize(overallSize);
  const overallCenter = new THREE.Vector3();
  overall.getCenter(overallCenter);
  const descriptors = meshes.map(mesh => {
    const bounds = boundsOf(mesh);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    bounds.getSize(size);
    bounds.getCenter(center);
    return { mesh, size, center, volume: size.x * size.y * size.z };
  });

  let bodyMeshes = matches(/body|chassis|shell|exterior|paint|hood|bonnet|roof|door|fender|bumper/i);
  let glassMeshes = matches(/glass|window|windshield|windscreen|mirror/i);
  let wheelMeshes = matches(/wheel|tire|tyre|rim/i);
  const lightMeshes = matches(/head.?light|tail.?light|brake.?light|lamp|light/i)
    .filter(mesh => !glassMeshes.includes(mesh));

  // Some FBX exports discard useful part names. Infer the main shell and
  // remaining material groups from transformed mesh bounds instead of silently
  // leaving the entire replacement vehicle in its source materials.
  if (!bodyMeshes.length && descriptors.length) {
    const shell = [...descriptors].sort((a, b) => b.volume - a.volume)[0];
    bodyMeshes = [shell.mesh];
  }
  if (!wheelMeshes.length && descriptors.length) {
    const lowY = overall.min.y + overallSize.y * 0.36;
    const candidates = descriptors.filter(item =>
      !bodyMeshes.includes(item.mesh) &&
      item.center.y <= lowY &&
      Math.abs(item.center.x - overallCenter.x) >= overallSize.x * 0.2 &&
      item.size.y <= overallSize.y * 0.42
    );
    wheelMeshes = candidates
      .sort((a, b) => Math.abs(a.center.y - lowY) - Math.abs(b.center.y - lowY))
      .slice(0, 4)
      .map(item => item.mesh);
  }
  if (!glassMeshes.length && descriptors.length) {
    const candidates = descriptors.filter(item =>
      !bodyMeshes.includes(item.mesh) &&
      !wheelMeshes.includes(item.mesh) &&
      item.center.y >= overall.min.y + overallSize.y * 0.42 &&
      item.center.y <= overall.min.y + overallSize.y * 0.94 &&
      item.size.x >= overallSize.x * 0.22
    );
    if (candidates.length) {
      glassMeshes = candidates
        .sort((a, b) => b.volume - a.volume)
        .slice(0, 4)
        .map(item => item.mesh);
    }
  }
  if (!glassMeshes.length) {
    const upperPart = descriptors
      .filter(item => !bodyMeshes.includes(item.mesh) && !wheelMeshes.includes(item.mesh))
      .sort((a, b) => b.center.y - a.center.y)[0];
    if (upperPart) glassMeshes = [upperPart.mesh];
  }

  // FBX part/material labels can overlap (for example, a shared "body"
  // material name on window meshes). Give glass/wheels/lights priority so later
  // role passes cannot repaint the orange shell or erase its paint assertion.
  const protectedMeshes = new Set([...glassMeshes, ...wheelMeshes, ...lightMeshes]);
  bodyMeshes = bodyMeshes.filter(mesh => !protectedMeshes.has(mesh));
  if (!bodyMeshes.length && descriptors.length) {
    // A few FBX exports apply one generic material name to nearly every part,
    // causing the semantic matches above to classify the entire model as glass
    // or trim. Always reserve the largest non-wheel candidate as the body shell.
    const shell = [...descriptors]
      .filter(item => !wheelMeshes.includes(item.mesh) && !lightMeshes.includes(item.mesh))
      .sort((a, b) => b.volume - a.volume)[0]
      || [...descriptors].sort((a, b) => b.volume - a.volume)[0];
    if (shell) {
      bodyMeshes = [shell.mesh];
      glassMeshes = glassMeshes.filter(mesh => mesh !== shell.mesh);
      wheelMeshes = wheelMeshes.filter(mesh => mesh !== shell.mesh);
      lightMeshes.splice(0, lightMeshes.length, ...lightMeshes.filter(mesh => mesh !== shell.mesh));
    }
  }

  // If source labels are misleading, recover missing roles from geometry.
  // Do not let generic material names consume every mesh into another role.
  if (!glassMeshes.some(mesh => !bodyMeshes.includes(mesh)) && descriptors.length > 1) {
    const candidates = descriptors.filter(item => !bodyMeshes.includes(item.mesh) && !wheelMeshes.includes(item.mesh));
    const glassCandidate = [...candidates].sort((a, b) => b.center.y - a.center.y)[0]
      || descriptors.filter(item => !bodyMeshes.includes(item.mesh)).sort((a, b) => b.center.y - a.center.y)[0];
    if (glassCandidate) {
      wheelMeshes = wheelMeshes.filter(mesh => mesh !== glassCandidate.mesh);
      lightMeshes.splice(0, lightMeshes.length, ...lightMeshes.filter(mesh => mesh !== glassCandidate.mesh));
      glassMeshes = [glassCandidate.mesh];
    }
  }
  if (!wheelMeshes.some(mesh => !bodyMeshes.includes(mesh)) && descriptors.length > 1) {
    const candidates = descriptors.filter(item => !bodyMeshes.includes(item.mesh) && !glassMeshes.includes(item.mesh));
    const wheelCandidate = [...candidates].sort((a, b) => a.center.y - b.center.y || a.volume - b.volume)[0]
      || descriptors.filter(item => !bodyMeshes.includes(item.mesh)).sort((a, b) => a.center.y - b.center.y)[0];
    if (wheelCandidate) {
      glassMeshes = glassMeshes.filter(mesh => mesh !== wheelCandidate.mesh);
      lightMeshes.splice(0, lightMeshes.length, ...lightMeshes.filter(mesh => mesh !== wheelCandidate.mesh));
      wheelMeshes = [wheelCandidate.mesh];
    }
  }

  // Preserve the supplied RGSDev materials exactly. These roles are metadata
  // for diagnostics/future opt-in customization only; fleet replacement must
  // never recolor body, glass, wheels, lights, trim, or non-hero vehicles.
  vehicle.materialRoles = { body: bodyMeshes, glass: glassMeshes, wheels: wheelMeshes, lights: lightMeshes };
  const bodyMaterial = bodyMeshes[0]?.material;
  const sourceMaterial = Array.isArray(bodyMaterial) ? bodyMaterial.find(Boolean) : bodyMaterial;
  vehicle.basePaint = sourceMaterial?.color?.clone?.() || null;
}
function bindDamageParts(THREE, vehicle, visual) {
  const meshes=[]; visual.traverse(node=>{ if(node.isMesh) meshes.push(node); });
  const named=(pattern)=>meshes.find(mesh=>pattern.test(String(mesh.name||'')));
  const body=named(/body|chassis|shell|exterior|paint/i)||meshes[0]||null;
  const glass=named(/glass|window|windshield|windscreen|cabin/i)||null;
  const wheels=meshes.filter(mesh=>/wheel|tire|tyre|rim/i.test(String(mesh.name||''))).slice(0,4);
  // Missing named parts remain null. Never alias a full body mesh as a bumper,
  // hood, trunk, or cab: impact handling could otherwise detach/deform the
  // entire replacement model instead of a small cosmetic part.
  vehicle.damageParts={body,cab:glass,hood:named(/hood|bonnet/i)||null,trunk:named(/trunk|boot|tailgate/i)||null,roof:named(/roof/i)||null,frontBumper:named(/front.*bumper|bumper.*front/i)||null,rearBumper:named(/rear.*bumper|bumper.*rear/i)||null,wheels,visualRoot:visual};
  applyVehicleMaterialRoles(THREE, vehicle, visual);
  const heroInfo=vehicle.g.userData?.coastlineHeroVehicle;
  if(heroInfo?.singleShell) heroInfo.parts=vehicle.damageParts;
}
function makeBlobMap(files) {
  const byName = new Map(), urls = [];
  for (const [name, bytes] of Object.entries(files)) {
    if (name.endsWith('/')) continue;
    const url = URL.createObjectURL(new Blob([bytes], { type:mimeFor(name) })); urls.push(url);
    const normalized = name.replace(/\\/g,'/').toLowerCase(), base = normalized.split('/').pop();
    byName.set(normalized,url); if (!byName.has(base)) byName.set(base,url);
  }
  return { byName, urls };
}

export async function loadRgsdevVehiclePack(THREE) {
  if (!vehiclePackPromise) vehiclePackPromise = (async () => {
    const response = await fetch(VEHICLE_PACK_URL, { cache:'force-cache' }); if (!response.ok) throw new Error('Vehicle pack request failed with HTTP ' + response.status);
    const archive = unzipSync(new Uint8Array(await response.arrayBuffer()));
    const { byName, urls } = makeBlobMap(archive), manager = new THREE.LoadingManager();
    manager.setURLModifier(url => { let normalized; try { normalized = decodeURIComponent(url); } catch { normalized = url; } normalized = normalized.replace(/\\/g,'/').toLowerCase(); const base = normalized.split(/[?#]/)[0].split('/').pop(); return byName.get(normalized) || byName.get(base) || url; });
    const loader = new FBXLoader(manager), models = new Map(), files = Object.keys(archive);
    for (const [name, pattern] of MODEL_PATHS) { const path = files.find(file => pattern.test(file)); if (!path) continue; const model = loader.parse(arrayBufferOf(archive[path]), './'); model.name = name; model.userData.coastlineSourcePath = path; models.set(name, model); }
    if (!models.size) { for (const url of urls) URL.revokeObjectURL(url); throw new Error('Vehicle pack contains no supported individual FBX vehicle models'); }
    return { models, urls, licenseText: Object.entries(archive).find(([name]) => /\/License\.txt$/i.test(name))?.[1] };
  })();
  return vehiclePackPromise;
}
export async function createRgsdevVehicleVisual(THREE, name='Sedan', target) { const pack = await loadRgsdevVehiclePack(THREE); const source = pack.models.get(name) || pack.models.get('Sedan') || pack.models.values().next().value; if (!source) throw new Error('No compatible vehicle model is available in the RGSDev pack'); return fitVehicle(THREE, source, target); }

export async function applyRgsdevFleet(THREE, vehicles, onStatus = () => {}) {
  for (const vehicle of vehicles) { if (!vehicle?.g) continue; removeVisualChildren(vehicle.g); if (vehicle.kind === 'car') { vehicle.g.visible = false; vehicle.g.userData.coastlineAssetPending = true; } else { vehicle.g.visible = false; vehicle.drivable = false; vehicle.occupied = false; } }
  try {
    const pack = await loadRgsdevVehiclePack(THREE), variants = [...pack.models.keys()].filter(name => !/ambulance|bus|firetruck|police|truck|van/i.test(name)), available = variants.length ? variants : [...pack.models.keys()];
    let replaced=0, disabled=0, carIndex=0;
    for (const vehicle of vehicles) {
      if (!vehicle?.g) continue;
      if (vehicle.kind !== 'car') { removeVisualChildren(vehicle.g); vehicle.g.visible = false; vehicle.drivable = false; vehicle.occupied = false; disabled++; continue; }
      const hero = !!vehicle.g.userData?.coastlineHeroVehicle?.singleShell;
      const name = hero && pack.models.has('SUV') ? 'SUV' : available[carIndex++ % available.length];
      const visual = await createRgsdevVehicleVisual(THREE,name); removeVisualChildren(vehicle.g); vehicle.g.add(visual); vehicle.g.visible = true; vehicle.g.userData.coastlineAssetPending = false; vehicle.rgsdevModelName = name;
      bindDamageParts(THREE,vehicle,visual); replaced++;
    }
    onStatus({ok:true,replaced,disabled,models:[...pack.models.keys()],ready:true});
    return {ok:true,replaced,disabled,models:[...pack.models.keys()],ready:true};
  } catch (error) {
    console.error('[Coastline] Replacement vehicle pack failed; legacy vehicle models remain disabled.',error);
    let placeholders=0,disabled=0;
    for (const vehicle of vehicles) { if (!vehicle?.g) continue; removeVisualChildren(vehicle.g); if (vehicle.kind==='car') { vehicle.g.add(makeNeutralVehiclePlaceholder(THREE)); vehicle.g.visible=true; vehicle.g.userData.coastlineAssetPending=false; vehicle.rgsdevModelName='neutral-fallback'; placeholders++; } else { vehicle.g.visible=false; vehicle.drivable=false; vehicle.occupied=false; disabled++; } }
    onStatus({ok:false,reason:'replacement-pack-load-failed',error:String(error),placeholders,disabled,ready:false});
    return {ok:false,reason:'replacement-pack-load-failed',placeholders,disabled,error,ready:false};
  }
}

export async function loadCozyCharacterAsset() { if (!cozyCharacterPromise) cozyCharacterPromise = new GLTFLoader().loadAsync(COZY_CHARACTER_URL); return cozyCharacterPromise; }
export function createCozyCharacterInstance(THREE, asset, targetHeight=1.95) { const root = SkeletonUtils.clone(asset.scene); root.name='coastline-cozy-character'; const bounds=getBounds(THREE,root), size=new THREE.Vector3(); bounds.getSize(size); if (!Number.isFinite(size.y) || size.y <= 0) throw new Error('Cozy character has invalid height'); const scale=targetHeight/size.y; root.scale.multiplyScalar(scale); root.position.y-=bounds.min.y*scale; const mixer=new THREE.AnimationMixer(root), actions=new Map(); for (const clip of asset.animations || []) actions.set(String(clip.name||'').toLowerCase(),mixer.clipAction(clip)); const actor={root,mixer,actions,currentAction:null}; setCozyCharacterAnimation(actor,'idle'); return actor; }
export function setCozyCharacterAnimation(actor, name) { if (!actor?.actions) return; const key=String(name||'idle').toLowerCase(), next=actor.actions.get(key)||actor.actions.get('idle')||actor.actions.values().next().value; if (!next || actor.currentAction===next) return; const previous=actor.currentAction; next.reset().fadeIn(.16).play(); previous?.fadeOut(.16); actor.currentAction=next; }
export function neutralCharacterPlaceholder(THREE) { const root=new THREE.Group(), material=new THREE.MeshStandardMaterial({color:0x879096,roughness:.9}), body=new THREE.Mesh(new THREE.CapsuleGeometry(.24,.72,4,8),material), head=new THREE.Mesh(new THREE.SphereGeometry(.2,12,8),material); body.position.y=1.0; body.userData.coastlineOwnedMaterial=true; root.add(body); head.position.y=1.63; head.userData.coastlineOwnedMaterial=true; root.add(head); root.userData.coastlineNeutralFallback=true; return root; }
