// Coastline world fidelity v6 — AAA silhouette, surface and edge pass.
// Visual-only: preserves gameplay, physics and collision. Designed to upgrade vehicles,
// people, roads, buildings and procedural dressing without trading fidelity for density.
import { RoundedBoxGeometry } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/geometries/RoundedBoxGeometry.js';

const installRendererQuality = THREE => {
  if (!THREE?.WebGLRenderer?.prototype || THREE.WebGLRenderer.prototype.__coastlineMaxPixelRatio) return;
  const p=THREE.WebGLRenderer.prototype, original=p.setPixelRatio;
  p.setPixelRatio=function(pixelRatio){const mobile=typeof window!=='undefined'&&window.innerWidth<=760;return original.call(this,Math.max(Number(pixelRatio)||1,mobile?1.5:2));};
  p.__coastlineMaxPixelRatio=true;
};

function upgradeMaterials(THREE,renderer,scene){
  const maxAniso=renderer?.capabilities?.getMaxAnisotropy?.()||1;
  let meshes=0,smoothed=0,materials=0;
  scene.traverse(o=>{
    if(!o.isMesh||!o.geometry)return;
    meshes++;o.castShadow=true;o.receiveShadow=true;o.frustumCulled=true;
    const g=o.geometry;
    if(g.computeVertexNormals){g.computeVertexNormals();g.normalizeNormals();smoothed++;}
    const list=Array.isArray(o.material)?o.material:[o.material];
    for(const m of list){if(!m)continue;materials++;if('flatShading'in m)m.flatShading=false;if('needsUpdate'in m)m.needsUpdate=true;if('envMapIntensity'in m)m.envMapIntensity=Math.max(Number(m.envMapIntensity)||0,1.15);if(m.map)m.map.anisotropy=Math.min(maxAniso,8);if(m.normalMap)m.normalMap.anisotropy=Math.min(maxAniso,8);}
  });
  return {meshes,smoothed,materials};
}

function bevelBox(THREE,scene,o){
  if(!o.isMesh||!o.geometry?.parameters||o.userData?.coastlineBeveled)return false;
  const p=o.geometry.parameters,w=Number(p.width),h=Number(p.height),d=Number(p.depth);
  if(!w||!h||!d)return false;
  // Only bevel substantial architectural/prop boxes; never road slabs, collision helpers or tiny detail.
  const long=Math.max(w,h,d),short=Math.min(w,h,d);
  if(long<2.5||short<.18||long/short>16)return false;
  const buildingLike=h>=Math.max(w,d)*.55&&h>2.2;
  const vehicleLike=long<5.5&&short>.35;
  if(!buildingLike&&!vehicleLike)return false;
  const r=Math.min(.10,short*.045);
  const replacement=new RoundedBoxGeometry(w,h,d,r,3);
  replacement.translate(p.translateX||0,p.translateY||0,p.translateZ||0);
  o.geometry.dispose();o.geometry=replacement;o.userData.coastlineBeveled=true;return true;
}

export function applyCinematicWorldUpgrade({THREE,scene,worldModel,groundY,lowPowerDevice=false,renderer=null}){
  if(!THREE||!scene||!worldModel||typeof groundY!=='function')throw new Error('Coastline visual upgrade requires THREE, scene, worldModel and groundY');
  if(scene.userData.coastlineCinematicWorldUpgrade)return scene.userData.coastlineCinematicWorldUpgrade;
  installRendererQuality(THREE);

  // Upgrade the entire already-built world first: buildings, roads, props, vehicles and NPCs.
  // PBR materials + smooth normals are the visual foundation; geometry is selectively beveled.
  let beveled=0;
  scene.traverse(o=>{if(bevelBox(THREE,scene,o))beveled++;});
  const surface=upgradeMaterials(THREE,renderer,scene);

  const half=Math.min(worldModel.halfSize||750,740),block=worldModel.roadSpacing||200;
  const seeded=(x,z,s=0)=>worldModel.hash(x,z,s+3901),inRoad=(x,z,m=9)=>worldModel.isRoadCorridor(x,z,m);
  const nearBuildingPad=(x,z,r=39)=>{const bx=Math.round((x-block/2)/block)*block+block/2,bz=Math.round((z-block/2)/block)*block+block/2;return Math.abs(x-bx)<r&&Math.abs(z-bz)<r;};
  const mat=(color,roughness=.9,metalness=0,extra={})=>new THREE.MeshStandardMaterial({color,roughness,metalness,...extra});
  const dummy=new THREE.Object3D();
  const addInstances=(geometry,material,items,cast=false)=>{if(!items.length)return null;const mesh=new THREE.InstancedMesh(geometry,material,items.length);mesh.name='Coastline v6 high-fidelity instanced dressing';mesh.castShadow=cast;mesh.receiveShadow=true;mesh.frustumCulled=true;for(let i=0;i<items.length;i++){const p=items[i];dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(p.rx||0,p.yaw||0,p.rz||0);dummy.scale.set(p.sx||1,p.sy||1,p.sz||1);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);if(p.color!==undefined&&mesh.setColorAt)mesh.setColorAt(i,new THREE.Color(p.color));}mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;scene.add(mesh);return mesh;};

  // Curved six-blade grass clusters.
  const gv=[],gi=[];const blade=(a,w,h,l)=>{const dx=Math.cos(a),dz=Math.sin(a),px=-dz*w/2,pz=dx*w/2,b=gv.length/3;gv.push(px,0,pz,-px,0,-pz,dx*l*.32+px*.3,h*.46,dz*l*.32+pz*.3,dx*l+px*.08,h,dz*l+pz*.08,dx*l*.68-px*.16,h*.76,dz*l*.68-pz*.16);gi.push(b,b+1,b+2,b+1,b+3,b+2,b+2,b+3,b+4,b+3,b+5,b+4);};
  [.05,1.25,2.45,3.65,4.85,5.8].forEach((a,i)=>blade(a,.12+.02*(i%2),.46+.09*(i%3),.08+.025*(i%3)));
  const grassGeometry=new THREE.BufferGeometry();grassGeometry.setAttribute('position',new THREE.Float32BufferAttribute(gv,3));grassGeometry.setIndex(gi);grassGeometry.computeVertexNormals();
  const grassItems=[],step=lowPowerDevice?24:15;
  for(let x=-half+7;x<=half-7;x+=step)for(let z=-half+7;z<=half-7;z+=step){if(seeded(x,z,3)>(lowPowerDevice?.15:.23))continue;const px=x+(seeded(x,z,7)-.5)*step,pz=z+(seeded(x,z,11)-.5)*step;if(inRoad(px,pz,14)||nearBuildingPad(px,pz,31))continue;const s=.48+seeded(x,z,23)*.88;grassItems.push({x:px,y:groundY(px,pz)+.035,z:pz,yaw:seeded(x,z,29)*Math.PI*2,sx:s,sy:s*(.8+seeded(x,z,31)),sz:s,color:[0x3f6838,0x527844,0x688a4a,0x789653,0x8b9d59][Math.floor(seeded(x,z,37)*5)]});}
  addInstances(grassGeometry,mat(0xffffff,.96,0,{side:THREE.DoubleSide,vertexColors:true}),grassItems,false);

  const weedGeo=new THREE.ConeGeometry(.055,1,14,3),weedItems=[];for(let x=-half+9;x<=half-9;x+=25)for(let z=-half+9;z<=half-9;z+=25){const px=x+(seeded(x,z,141)-.5)*19,pz=z+(seeded(x,z,143)-.5)*19;if(inRoad(px,pz,16)||nearBuildingPad(px,pz,33)||seeded(x,z,145)>.11)continue;const s=.22+seeded(x,z,147)*.34;weedItems.push({x:px,y:groundY(px,pz)+s*.5,z:pz,yaw:seeded(x,z,149)*6.28,sx:s,sy:s*(.7+seeded(x,z,151)*1.2),sz:s,color:[0xb8b85e,0xcaa96a,0x8fae5b,0x9f6f59][Math.floor(seeded(x,z,153)*4)]});}addInstances(weedGeo,mat(0xffffff,.92,0,{vertexColors:true}),weedItems,false);

  const dirtGeometry=new THREE.CircleGeometry(1,64);dirtGeometry.rotateX(-Math.PI/2);const dirtItems=[];for(let x=-half+15;x<=half-15;x+=35)for(let z=-half+15;z<=half-15;z+=35){if(seeded(x,z,41)>.2)continue;const px=x+(seeded(x,z,43)-.5)*24,pz=z+(seeded(x,z,47)-.5)*24;if(inRoad(px,pz,13)||nearBuildingPad(px,pz,36))continue;dirtItems.push({x:px,y:groundY(px,pz)+.019,z:pz,yaw:seeded(x,z,53)*Math.PI,sx:1.25+seeded(x,z,59)*3.4,sy:1,sz:.65+seeded(x,z,61)*1.7,color:[0x66513a,0x765f43,0x897052,0x5a4936][Math.floor(seeded(x,z,67)*4)]});}addInstances(dirtGeometry,mat(0xffffff,1,0,{side:THREE.DoubleSide,vertexColors:true}),dirtItems,false);

  const shrubGeometry=new THREE.SphereGeometry(1,20,14),rockGeometry=new THREE.SphereGeometry(1,18,12),shrubItems=[],rockItems=[];for(let i=0;i<(lowPowerDevice?180:300);i++){const x=(seeded(i,101,71)*2-1)*(half-18),z=(seeded(i,211,73)*2-1)*(half-18);if(inRoad(x,z,18)||nearBuildingPad(x,z,42))continue;const size=.62+seeded(i,401,83)*1.65;shrubItems.push({x,y:groundY(x,z)+size*.47,z,yaw:seeded(i,503,89)*Math.PI,sx:size*(1.1+seeded(i,601,97)*.55),sy:size*.72,sz:size*(1+seeded(i,701,101)*.5),color:[0x294f31,0x355f35,0x46723d,0x5b7b45][Math.floor(seeded(i,809,103)*4)]});if(i%3===0)rockItems.push({x:x+2.4,y:groundY(x+2.4,z)+.3,z:z-1.8,yaw:seeded(i,907,107),sx:.45+size*.45,sy:.28+size*.24,sz:.5+size*.38,color:0x73736d});}addInstances(shrubGeometry,mat(0xffffff,.98,0,{vertexColors:true}),shrubItems,false);addInstances(rockGeometry,mat(0xffffff,.88,0,{vertexColors:true}),rockItems,false);

  const poleGeo=new THREE.CylinderGeometry(.075,.105,5.8,20),armGeo=new RoundedBoxGeometry(1.2,.09,.10,.025,3),lampGeo=new THREE.SphereGeometry(.24,20,14),poleItems=[],armItems=[],lampItems=[];const stride=lowPowerDevice?112:82;let lampCount=0;for(let road=-600;road<=600;road+=block)for(let along=-620;along<=620;along+=stride)for(const axis of ['v','h']){if(Math.abs(along-Math.round(along/block)*block)<19)continue;const x=axis==='v'?road+9.7:along,z=axis==='v'?along:road+9.7;if(inRoad(x,z,0))continue;const y=groundY(x,z),yaw=axis==='v'?Math.PI/2:0;poleItems.push({x,y:y+2.9,z,yaw});armItems.push({x:x+.45,y:y+5.55,z,yaw});lampItems.push({x:x+.95,y:y+5.47,z,yaw});lampCount++;}addInstances(poleGeo,mat(0x3e4748,.38,.76),poleItems,false);addInstances(armGeo,mat(0x3e4748,.38,.76),armItems,false);addInstances(lampGeo,new THREE.MeshStandardMaterial({color:0xffd9a0,emissive:0xffb95f,emissiveIntensity:2.3,roughness:.18,metalness:.04}),lampItems,false);

  const result=Object.freeze({version:6,quality:'AAA-SILHOUETTE-SURFACE',pixelRatioCeiling:lowPowerDevice?1.5:2,sceneMeshes:surface.meshes,smoothedMeshes:surface.smoothed,materialsUpgraded:surface.materials,beveledObjects:beveled,grassClumps:grassItems.length,weeds:weedItems.length,dirtPatches:dirtItems.length,shrubs:shrubItems.length,rocks:rockItems.length,streetLamps:lampCount});
  scene.userData.coastlineCinematicWorldUpgrade=result;if(typeof window!=='undefined')window.__coastlineCinematicWorldUpgrade=result;return result;
}
