// Coastline authored vehicle asset loader v5.
// Loads only explicitly selected authored vehicles; the existing vehicle remains visible until a GLB validates.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/loaders/GLTFLoader.js';

export const COASTLINE_VEHICLE_ASSETS = Object.freeze({
  hero: Object.freeze({
    id: 'coastline-hero',
    url: './assets/vehicles/coastline-hero.glb',
    externalFallback: 'https://cdn.3dassets.dev/assets/32495/v1/model.glb',
    expectedLengthMeters: 4.765
  }),
  sedan: Object.freeze({
    id: 'authored-white-sedan',
    url: './assets/vehicles/white-four-door-sedan.glb',
    expectedLengthMeters: 4.84
  }),
  hatchback: Object.freeze({
    id: 'authored-blue-hatchback',
    url: './assets/vehicles/blue-five-door-compact-hatchback.glb',
    expectedLengthMeters: 4.265
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
    }));
  }
  return modelPromises.get(url);
}
function prepareInstance(source, expectedLengthMeters){
  const root=source.root.clone(true);
  // These two supplied vehicles are authored with their long axis along X.
  // Turn them so their front points down Coastline's +Z vehicle axis.
  if(source.size.x>source.size.z) root.rotation.y=Math.PI/2;
  root.updateMatrixWorld(true);
  const before=new THREE.Box3().setFromObject(root);
  const size=before.getSize(new THREE.Vector3());
  const horizontal=Math.max(size.x,size.z);
  if(horizontal>0)root.scale.setScalar(expectedLengthMeters/horizontal);
  root.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(root);
  const center=box.getCenter(new THREE.Vector3());
  root.position.x-=center.x;root.position.z-=center.z;root.position.y-=box.min.y;
  root.traverse(o=>{
    if(!o.isMesh)return;
    o.castShadow=true;o.receiveShadow=true;o.frustumCulled=true;
    const materials=Array.isArray(o.material)?o.material:[o.material];
    for(const m of materials){
      if(!m)continue;
      if(m.map)m.map.colorSpace=THREE.SRGBColorSpace;
      if('envMapIntensity'in m)m.envMapIntensity=Math.max(m.envMapIntensity||1,1.15);
    }
  });
  root.name='coastline-authored-glb-vehicle';
  root.userData.coastlineAuthoredVehicle=true;
  root.userData.coastlineVehicleAssetUrl=source.url;
  return root;
}
function resolveConfig(assetId, url, externalFallback, expectedLengthMeters){
  const config=COASTLINE_VEHICLE_ASSETS[assetId]||COASTLINE_VEHICLE_ASSETS.hero;
  return {
    url:url||config.url,
    externalFallback:externalFallback===undefined?config.externalFallback:externalFallback,
    expectedLengthMeters:expectedLengthMeters||config.expectedLengthMeters
  };
}
export async function replaceCoastlineVehicleVisual({group,assetId='hero',url,externalFallback,expectedLengthMeters}={}){
  if(!group) return {loaded:false,reason:'invalid-input'};
  const config=resolveConfig(assetId,url,externalFallback,expectedLengthMeters);
  const sources=[config.url,...(config.externalFallback&&config.externalFallback!==config.url?[config.externalFallback]:[])];
  const failures=[];
  for(const sourceUrl of sources){
    try{
      const source=await loadSource(sourceUrl);
      const instance=prepareInstance(source,config.expectedLengthMeters);
      group.traverse(o=>{if(o.isMesh&&!o.userData?.coastlineAuthoredVehicle)o.visible=false;});
      instance.userData.coastlineVehicleAssetUrl=sourceUrl;
      group.add(instance);
      const result={version:5,assetId,loaded:true,source:'authored-glb',url:sourceUrl,meshes:source.meshes,instance:true,fallbackTried:sourceUrl!==sources[0]};
      instanceResults.push(result);
      globalThis.__coastlineVehicleAssetStatus={version:5,loaded:true,assetId,url:sourceUrl,instances:instanceResults.length,lastInstance:result};
      return result;
    }catch(error){failures.push({url:sourceUrl,error:String(error?.message||error)});}
  }
  const result={version:5,assetId,loaded:false,source:'existing-vehicle-visual-preserved',url:config.url,failures};
  globalThis.__coastlineVehicleAssetFailures=(globalThis.__coastlineVehicleAssetFailures||[]).concat([result]);
  globalThis.__coastlineVehicleAssetStatus=result;
  return result;
}
export async function loadCoastlineHeroVehicle({group,url,externalFallback,expectedLengthMeters,replaceProcedural=true}={}){
  if(!group) return {loaded:false,reason:'invalid-input'};
  const config=resolveConfig('hero',url,externalFallback,expectedLengthMeters);
  const result=await replaceCoastlineVehicleVisual({group,assetId:'hero',...config});
  if(result.loaded&&replaceProcedural){
    const old=group.userData.coastlineHeroProceduralRoot;
    if(old?.parent)old.parent.remove(old);
  }
  return result;
}
export function getCoastlineVehicleAssetStatus(){
  return Object.freeze({
    version:5,
    configuredAssets:Object.keys(COASTLINE_VEHICLE_ASSETS),
    cachedSources:[...modelPromises.keys()],
    instances:instanceResults.length,
    status:globalThis.__coastlineVehicleAssetStatus||{loaded:false,source:'not-yet-requested'}
  });
}
