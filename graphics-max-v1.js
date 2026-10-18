import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
import { RoundedBoxGeometry } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/geometries/RoundedBoxGeometry.js';
import { SSAOPass } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/postprocessing/SSAOPass.js';

const TAG='coastline-max-visual-v1';
const installedScenes=new WeakSet();
const sourceMaterialCache=new WeakMap();

function detailTexture(kind='surface'){
  const c=document.createElement('canvas'); c.width=512; c.height=512;
  const x=c.getContext('2d');
  x.fillStyle='#808080'; x.fillRect(0,0,512,512);
  const seed=kind.length*917;
  for(let i=0;i<9000;i++){
    const px=(i*73+seed)%512, py=(i*131+seed*3)%512;
    const v=90+((i*37)%100);
    x.fillStyle=`rgb(${v},${v},${v})`;
    const s=kind==='asphalt'?1+(i%4):1+(i%2);
    x.fillRect(px,py,s,s);
  }
  if(kind==='asphalt'){
    x.strokeStyle='rgba(35,35,35,.45)'; x.lineWidth=1;
    for(let i=0;i<180;i++){const px=(i*47)%512,py=(i*83)%512;x.beginPath();x.moveTo(px,py);x.lineTo(px+8+(i%17),py+(i%11)-5);x.stroke();}
  }
  const t=new THREE.CanvasTexture(c); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(3,3); t.colorSpace=THREE.NoColorSpace; return t;
}
const normalTex=detailTexture('surface');
const asphaltTex=detailTexture('asphalt');

function physicalMaterial(src, opts={}){
  if(!src || !src.isMaterial) return src;
  // Never replace shader/custom materials: game-v3's sky dome uses shader uniforms
  // (uDaylight/uSunset) that must remain intact for the environment loop.
  if(src.isShaderMaterial || src.isRawShaderMaterial || src.userData?.coastlinePreserveMaterial || src.uniforms) return src;
  if(sourceMaterialCache.has(src)) return sourceMaterialCache.get(src);
  const color=src.color?.clone?.()||new THREE.Color(0xffffff);
  const rough=THREE.MathUtils.clamp(src.roughness ?? .7,.22,.98);
  const mat=new THREE.MeshPhysicalMaterial({
    color,
    map:src.map||null,
    normalMap:opts.asphalt?asphaltTex:normalTex,
    normalScale:new THREE.Vector2(opts.asphalt?.65:.22,opts.asphalt?.65:.22),
    roughness:opts.roughness ?? rough,
    metalness:src.metalness??0,
    emissive:src.emissive?.clone?.()||new THREE.Color(0),
    emissiveIntensity:src.emissiveIntensity??0,
    transparent:src.transparent,
    opacity:src.opacity,
    side:src.side,
    depthWrite:src.depthWrite,
    envMapIntensity:opts.envMapIntensity ?? (src.metalness>.45?1.65:.85),
    clearcoat:opts.clearcoat ?? (src.metalness>.3?.45:.12),
    clearcoatRoughness:.16
  });
  if(src.name) mat.name=src.name;
  sourceMaterialCache.set(src,mat); return mat;
}

function enhanceMaterials(scene){
  scene.traverse(o=>{
    if(!o.isMesh || !o.material) return;
    const materials=Array.isArray(o.material)?o.material:o.material?[o.material]:[];
    const asphaltLike=/road|asphalt|ground|terrain|sidewalk|curb|dirt/i.test(`${o.name} ${materials.map(m=>m.name).join(' ')}`);
    const out=materials.map(m=>physicalMaterial(m,{asphalt:asphaltLike,envMapIntensity:asphaltLike?.7:undefined}));
    o.material=Array.isArray(o.material)?out:out[0];
    if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}
  });
}

function addHumanDetail(scene){
  const groups=[];
  scene.traverse(o=>{if(o.isGroup){let n=0,box=0;o.traverse(q=>{if(q.isMesh){n++;if(q.geometry?.type==='BoxGeometry')box++;}});if(n>=4&&n<=30&&box>=2)groups.push(o);}});
  for(const g of groups.slice(0,32)){
    if(g.userData[TAG])continue;
    const b=new THREE.Box3().setFromObject(g), size=b.getSize(new THREE.Vector3());
    if(size.y<1.1||size.y>3.2||size.x>1.8||size.z>1.8)continue;
    g.userData[TAG]=true;
    const skin=new THREE.MeshPhysicalMaterial({color:0xb87c59,roughness:.66,clearcoat:.06,clearcoatRoughness:.35,envMapIntensity:.55});
    const dark=new THREE.MeshPhysicalMaterial({color:0x171b20,roughness:.58,metalness:.05,envMapIntensity:.4});
    const neck=new THREE.Mesh(new THREE.CylinderGeometry(.065,.075,.16,12),skin); neck.position.y=size.y*.56; g.add(neck);
    const handL=new THREE.Mesh(new THREE.SphereGeometry(.075,10,8),skin); handL.position.set(-size.x*.39,size.y*.39,0); g.add(handL);
    const handR=handL.clone(); handR.position.x=size.x*.39; g.add(handR);
    const shoeL=new THREE.Mesh(new RoundedBoxGeometry(.16,.10,.29,.035,2),dark); shoeL.position.set(-size.x*.15,.06,.055); g.add(shoeL);
    const shoeR=shoeL.clone(); shoeR.position.x=size.x*.15; g.add(shoeR);
    const hair=new THREE.Mesh(new THREE.SphereGeometry(Math.max(.13,size.x*.22),14,10,0,Math.PI*2,0,Math.PI*.48),dark); hair.position.y=size.y*.69; g.add(hair);
  }
}

function roundSmallBoxes(scene){
  scene.traverse(o=>{
    if(!o.isMesh||o.userData[TAG]||!o.geometry||o.geometry.type!=='BoxGeometry')return;
    const p=o.parent; if(!p)return;
    const b=new THREE.Box3().setFromObject(o),s=b.getSize(new THREE.Vector3());
    if(Math.max(s.x,s.y,s.z)>5 || Math.min(s.x,s.y,s.z)<.035)return;
    const r=Math.min(.055,Math.min(s.x,s.y,s.z)*.12);
    if(r<=.008)return;
    const g=new RoundedBoxGeometry(s.x,s.y,s.z,r,2);
    g.translate(-s.x/2,-s.y/2,-s.z/2);
    const worldCenter=b.getCenter(new THREE.Vector3());
    const clone=o.clone(); clone.geometry=g; clone.position.set(worldCenter.x,worldCenter.y,worldCenter.z); clone.rotation.set(0,0,0); clone.scale.set(1,1,1);
    if(o.material)clone.material=o.material;
    clone.userData[TAG]=true;
    if(!p.rotation.x&&!p.rotation.z){p.add(clone);o.visible=false;}
  });
}

function facadeDetail(scene){
  const windowMat=new THREE.MeshPhysicalMaterial({color:0x87aeb9,roughness:.16,metalness:.15,transmission:.05,clearcoat:.65,envMapIntensity:1.15});
  const frameMat=new THREE.MeshStandardMaterial({color:0x252a2e,roughness:.62,metalness:.55});
  let count=0;
  scene.traverse(o=>{
    if(count>180||!o.isMesh||!o.geometry||o.userData[TAG])return;
    if(o.geometry.type!=='BoxGeometry')return;
    const b=new THREE.Box3().setFromObject(o),s=b.getSize(new THREE.Vector3());
    if(s.y<3.5||s.x<2.5||s.z<2.5||s.y<Math.max(s.x,s.z)*.65)return;
    const parent=o.parent;if(!parent)return;
    const center=b.getCenter(new THREE.Vector3());
    const faceZ=center.z+s.z/2+.012;
    const rows=Math.min(5,Math.max(2,Math.floor(s.y/2.7))), cols=Math.min(6,Math.max(2,Math.floor(s.x/2.6)));
    for(let ry=0;ry<rows;ry++)for(let cx=0;cx<cols;cx++){
      const w=Math.max(.35,(s.x/cols)*.58),h=Math.max(.42,(s.y/rows)*.48);
      const win=new THREE.Mesh(new THREE.BoxGeometry(w,h,.045),windowMat);win.position.set(center.x-s.x/2+(cx+.5)*s.x/cols,center.y-s.y/2+(ry+.5)*s.y/rows,faceZ);parent.add(win);
      const sill=new THREE.Mesh(new THREE.BoxGeometry(w+.06,.045,.075),frameMat);sill.position.set(win.position.x,win.position.y-h/2-.035,faceZ-.02);parent.add(sill);count++;
    }
  });
}

function removeReservedAircraft(scene){
  let removed=0;
  scene.traverse(o=>{
    if(!o.isGroup||o.userData.__coastlineAircraftRemoved)return;
    const p=o.position;
    if(Math.abs(p.x-600)<3 && Math.abs(p.z-650)<3){
      o.userData.__coastlineAircraftRemoved=true;
      o.visible=false;
      if(o.parent)o.parent.remove(o);
      removed++;
    }
  });
  window.__coastlineFlightState={version:1,prototypeAircraftRemoved:true,removedCount:removed,status:'flight-reserved'};
}

function install(scene,camera,renderer,composer){
  if(!scene||installedScenes.has(scene))return;
  installedScenes.add(scene); scene.userData[TAG]={max:true};
  enhanceMaterials(scene); roundSmallBoxes(scene); facadeDetail(scene); addHumanDetail(scene); removeReservedAircraft(scene);
  if(composer){
    try{
      const ssao=new SSAOPass(scene,camera,Math.min(innerWidth,1280),Math.min(innerHeight,720));
      ssao.kernelRadius=18; ssao.minDistance=.001; ssao.maxDistance=.16; ssao.output='Default';
      composer.passes.splice(1,0,ssao);
    }catch(e){console.warn('Coastline MAX SSAO skipped',e);}
  }
  renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.3;
  scene.traverse(o=>{if(o.isMesh&&o.material?.isMeshPhysicalMaterial){o.material.envMapIntensity=Math.max(o.material.envMapIntensity||0,1.05);}});
  window.__coastlineMaxVisuals={version:2,scene,camera,renderer,composer};
}

function wait(){
  const h=window.__coastlineHooks;
  if(h?.scene&&h?.camera&&h?.renderer){install(h.scene,h.camera,h.renderer,h.composer);return;}
  setTimeout(wait,80);
}
wait();