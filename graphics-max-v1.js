import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
import { SSAOPass } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/postprocessing/SSAOPass.js';

const TAG='coastline-max-visual-v1';
const installedScenes=new WeakSet();
const sourceMaterialCache=new WeakMap();

function detailTexture(kind='surface'){
  const c=document.createElement('canvas'); c.width=512; c.height=512;
  const x=c.getContext('2d'); x.fillStyle='#808080'; x.fillRect(0,0,512,512);
  const seed=kind.length*917;
  for(let i=0;i<9000;i++){
    const px=(i*73+seed)%512, py=(i*131+seed*3)%512, v=90+((i*37)%100);
    x.fillStyle=`rgb(${v},${v},${v})`; const s=kind==='asphalt'?1+(i%4):1+(i%2); x.fillRect(px,py,s,s);
  }
  if(kind==='asphalt'){
    x.strokeStyle='rgba(35,35,35,.45)'; x.lineWidth=1;
    for(let i=0;i<180;i++){const px=(i*47)%512,py=(i*83)%512;x.beginPath();x.moveTo(px,py);x.lineTo(px+8+(i%17),py+(i%11)-5);x.stroke();}
  }
  const t=new THREE.CanvasTexture(c); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(3,3); t.colorSpace=THREE.NoColorSpace; return t;
}
const normalTex=detailTexture('surface'); const asphaltTex=detailTexture('asphalt');

function physicalMaterial(src,opts={}){
  if(!src||!src.isMaterial)return src;
  if(src.isShaderMaterial||src.isRawShaderMaterial||src.userData?.coastlinePreserveMaterial||src.uniforms)return src;
  if(sourceMaterialCache.has(src))return sourceMaterialCache.get(src);
  const color=src.color?.clone?.()||new THREE.Color(0xffffff);
  const asphalt=!!opts.asphalt;
  const mat=new THREE.MeshPhysicalMaterial({color,map:src.map||null,normalMap:asphalt?asphaltTex:normalTex,normalScale:new THREE.Vector2(asphalt?.38:.12,asphalt?.38:.12),roughness:opts.roughness??THREE.MathUtils.clamp(src.roughness??.7,.28,.98),metalness:src.metalness??0,emissive:src.emissive?.clone?.()||new THREE.Color(0),emissiveIntensity:src.emissiveIntensity??0,transparent:src.transparent,opacity:src.opacity,side:src.side,depthWrite:src.depthWrite,envMapIntensity:opts.envMapIntensity??(src.metalness>.45?1.4:.72),clearcoat:opts.clearcoat??(src.metalness>.3?.35:.06),clearcoatRoughness:.2});
  if(src.name)mat.name=src.name; sourceMaterialCache.set(src,mat); return mat;
}

function enhanceMaterials(scene){
  scene.traverse(o=>{
    if(!o.isMesh||!o.material)return;
    const materials=Array.isArray(o.material)?o.material:[o.material];
    const isTerrain=!!o.userData?.coastlineTerrainLayer;
    const asphaltLike=/road|asphalt|sidewalk|curb|dirt/i.test(`${o.name} ${materials.map(m=>m.name).join(' ')}`);
    if(isTerrain){
      materials.forEach(m=>{if(m?.color)m.color.set(0x718b4a);m.roughness=.94;m.metalness=0;m.emissive?.set(0x172313);m.emissiveIntensity=.025;});
      o.material=Array.isArray(o.material)?materials:materials[0];
    }else{
      const out=materials.map(m=>physicalMaterial(m,{asphalt:asphaltLike,envMapIntensity:asphaltLike?.58:undefined}));
      o.material=Array.isArray(o.material)?out:out[0];
    }
    o.castShadow=true;o.receiveShadow=true;
  });
}

function addHumanDetail(scene){
  const groups=[]; scene.traverse(o=>{if(o.isGroup){let n=0,box=0;o.traverse(q=>{if(q.isMesh){n++;if(q.geometry?.type==='BoxGeometry')box++;}});if(n>=4&&n<=30&&box>=2)groups.push(o);}});
  for(const g of groups.slice(0,32)){
    if(g.userData[TAG])continue; const b=new THREE.Box3().setFromObject(g),size=b.getSize(new THREE.Vector3());
    if(size.y<1.1||size.y>3.2||size.x>1.8||size.z>1.8)continue; g.userData[TAG]=true;
    const skin=new THREE.MeshPhysicalMaterial({color:0xb87c59,roughness:.66,clearcoat:.06,clearcoatRoughness:.35,envMapIntensity:.55});
    const dark=new THREE.MeshPhysicalMaterial({color:0x171b20,roughness:.58,metalness:.05,envMapIntensity:.4});
    const neck=new THREE.Mesh(new THREE.CylinderGeometry(.065,.075,.16,12),skin);neck.position.y=size.y*.56;g.add(neck);
    const handL=new THREE.Mesh(new THREE.SphereGeometry(.075,10,8),skin);handL.position.set(-size.x*.39,size.y*.39,0);g.add(handL);const handR=handL.clone();handR.position.x=size.x*.39;g.add(handR);
    const shoeL=new THREE.Mesh(new THREE.BoxGeometry(.16,.10,.29),dark);shoeL.position.set(-size.x*.15,.06,.055);g.add(shoeL);const shoeR=shoeL.clone();shoeR.position.x=size.x*.15;g.add(shoeR);
    const hair=new THREE.Mesh(new THREE.SphereGeometry(Math.max(.13,size.x*.22),14,10,0,Math.PI*2,0,Math.PI*.48),dark);hair.position.y=size.y*.69;g.add(hair);
  }
}

function removeReservedAircraft(scene){let removed=0;scene.traverse(o=>{if(!o.isGroup||o.userData.__coastlineAircraftRemoved)return;const p=o.position;if(Math.abs(p.x-600)<3&&Math.abs(p.z-650)<3){o.userData.__coastlineAircraftRemoved=true;o.visible=false;if(o.parent)o.parent.remove(o);removed++;}});window.__coastlineFlightState={version:1,prototypeAircraftRemoved:true,removedCount:removed,status:'flight-reserved'};}

function install(scene,camera,renderer,composer){
  if(!scene||installedScenes.has(scene))return; installedScenes.add(scene); scene.userData[TAG]={max:true};
  enhanceMaterials(scene); addHumanDetail(scene); removeReservedAircraft(scene);
  if(composer){try{const ssao=new SSAOPass(scene,camera,Math.min(innerWidth,1280),Math.min(innerHeight,720));ssao.kernelRadius=12;ssao.minDistance=.001;ssao.maxDistance=.11;ssao.output='Default';composer.passes.splice(1,0,ssao);}catch(e){console.warn('Coastline MAX SSAO skipped',e);}}
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.18;
  scene.traverse(o=>{if(o.isMesh&&o.material?.isMeshPhysicalMaterial)o.material.envMapIntensity=Math.max(o.material.envMapIntensity||0,.82);});
  window.__coastlineMaxVisuals={version:3,scene,camera,renderer,composer};
}
function wait(){const h=window.__coastlineHooks;if(h?.scene&&h?.camera&&h?.renderer){install(h.scene,h.camera,h.renderer,h.composer);return;}setTimeout(wait,80);}wait();