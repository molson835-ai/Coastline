// Coastline authored vehicle asset loader v4.
// Cache the GLB source once, then clone its scene for each vehicle instance.
// The procedural vehicle remains available as a fallback, but diagnostics make that fallback explicit.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/loaders/GLTFLoader.js';

export const COASTLINE_VEHICLE_ASSETS = Object.freeze({
  hero: Object.freeze({
    id: 'coastline-hero',
    url: './assets/vehicles/coastline-hero.glb',
    externalFallback: 'https://cdn.3dassets.dev/assets/32495/v1/model.glb',
    expectedLengthMeters: 4.765
  })
});

let loader;
const modelPromises = new Map();
const instanceResults = [];
function getLoader(){ return loader || (loader = new GLTFLoader()); }
function countMeshes(root){ let n=0; root?.traverse?.(o=>{if(o.isMesh)n++;}); return n; }
function validate(root){
  if(!root?.isObject3D) throw new Error('GLB has no scene root');
  const meshes=countMeshes(root);
  if(meshes<3) throw new Error('GLB contains fewer than three render meshes');
  const box=new THREE.Box3().setFromObject(root);
  const size=box.getSize(new THREE.Vector3());
  if(!Number.isFinite(size.x+size.y+size.z)||Math.max(size.x,size.y,size.z)<=0) throw new Error('GLB has invalid dimensions');
  return {meshes,size};
}
function loadSource(url){
  if(!modelPromises.has(url)){
    modelPromises.set(url,getLoader().loadAsync(url).then(gltf=>{
      const root=gltf?.scene;
      const shape=validate(root);
      return {root,meshes:shape.meshes,size:shape.size,url};
    }).catch(error=>{ throw error; }));
  }
  return modelPromises.get(url);
}
function prepareInstance(source, expectedLengthMeters){
  const root=source.clone(true);
  root.traverse(o=>{
    if(!o.isMesh)return;
    o.castShadow=true;o.receiveShadow=true;o.frustumCulled=true;
    if(o.geometry) o.geometry=o.geometry; // Geometry stays shared between cloned instances.
    const materials=Array.isArray(o.material)?o.material:[o.material];
    for(const m of materials){
      if(!m)continue;
      if(m.map)m.map.colorSpace=THREE.SRGBColorSpace;
      if('envMapIntensity'in m)m.envMapIntensity=Math.max(m.envMapIntensity||1,1.15);
    }
  });
  const before=new THREE.Box3().setFromObject(root);
  const size=before.getSize(new THREE.Vector3());
  const horizontal=Math.max(size.x,size.z);
  if(horizontal>0)root.scale.setScalar(expectedLengthMeters/horizontal);
  root.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(root);
  const center=box.getCenter(new THREE.Vector3());
  root.position.x-=center.x;root.position.z-=center.z;root.position.y-=box.min.y;
  root.name='coastline-authored-glb-vehicle';
  root.userData.coastlineAuthoredVehicle=true;
  root.userData.coastlineVehicleAssetUrl=source.userData?.assetUrl||'';
  return root;
}
async function trySource(url){
  const loaded=await loadSource(url);
  loaded.root.userData.assetUrl=url;
  return loaded;
}
export async function replaceCoastlineVehicleVisual({group,url=COASTLINE_VEHICLE_ASSETS.hero.url,externalFallback=COASTLINE_VEHICLE_ASSETS.hero.externalFallback,expectedLengthMeters=COASTLINE_VEHICLE_ASSETS.hero.expectedLengthMeters}={}){\n  if(!group) return {loaded:false,reason:'invalid-input'};\n  const sources=[url,...(externalFallback&&externalFallback!==url?[externalFallback]:[])];\n  const failures=[];\n  for(const sourceUrl of sources){\n    try{\n      const loaded=await trySource(sourceUrl);\n      const instance=prepareInstance(loaded.root,expectedLengthMeters);\n      const old=group.userData.coastlineHeroProceduralRoot;\n      if(old?.parent)old.parent.remove(old);\n      group.traverse(o=>{if(o.isMesh&&!o.userData?.coastlineAuthoredVehicle)o.visible=false;});\n      instance.userData.coastlineVehicleAssetUrl=sourceUrl;\n      group.add(instance);\n      const result={version:4,loaded:true,source:'authored-glb',url:sourceUrl,meshes:loaded.meshes,instance:true,fallbackTried:sourceUrl!==sources[0]};\n      instanceResults.push(result);globalThis.__coastlineHeroVehicleAsset={version:4,loaded:true,source:'authored-glb',url:sourceUrl,instances:instanceResults.length,lastInstance:result};\n      return result;\n    }catch(error){failures.push({url:sourceUrl,error:String(error?.message||error)});}\n  }\n  const result={version:4,loaded:false,source:'existing-vehicle-visual-preserved',url:sources[0],failures};\n  globalThis.__coastlineVehicleAssetFailures=(globalThis.__coastlineVehicleAssetFailures||[]).concat([result]);\n  return result;\n}\n\nexport async function loadCoastlineHeroVehicle({group,url=COASTLINE_VEHICLE_ASSETS.hero.url,externalFallback=COASTLINE_VEHICLE_ASSETS.hero.externalFallback,expectedLengthMeters=COASTLINE_VEHICLE_ASSETS.hero.expectedLengthMeters,replaceProcedural=true}={}){
  if(!group) return {loaded:false,reason:'invalid-input'};
  const sources=[url,...(externalFallback&&externalFallback!==url?[externalFallback]:[])];
  const failures=[];
  for(const sourceUrl of sources){
    try{
      const loaded=await trySource(sourceUrl);
      const instance=prepareInstance(loaded.root,expectedLengthMeters);
      const old=group.userData.coastlineHeroProceduralRoot;
      if(replaceProcedural&&old?.parent)old.parent.remove(old);
      instance.userData.coastlineVehicleAssetUrl=sourceUrl;
      group.add(instance);
      const result={version:4,loaded:true,source:'authored-glb',url:sourceUrl,meshes:loaded.meshes,instance:true,fallbackTried:sourceUrl!==sources[0]};
      instanceResults.push(result);globalThis.__coastlineHeroVehicleAsset={version:4,loaded:true,source:'authored-glb',url:sourceUrl,instances:instanceResults.length,lastInstance:result};
      return result;
    }catch(error){failures.push({url:sourceUrl,error:String(error?.message||error)});}
  }
  const result={version:4,loaded:false,source:'procedural-fallback',url:sources[0],failures};
  globalThis.__coastlineHeroVehicleAsset=result;
  return result;
}
export function getCoastlineVehicleAssetStatus(){
  return Object.freeze({
    version:4,
    configuredAssets:Object.keys(COASTLINE_VEHICLE_ASSETS),
    loadedSources:[...modelPromises.entries()].filter(([,p])=>p&&typeof p.then==='function'),
    instances:instanceResults.length,
    status:globalThis.__coastlineHeroVehicleAsset||{loaded:false,source:'not-yet-requested'}
  });
}
