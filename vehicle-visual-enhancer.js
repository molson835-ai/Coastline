// Coastline hero-vehicle rendering pass v6.
// Visual-only layer: preserves gameplay dimensions, input, physics and collision.
// Goal: make the replacement unmistakable in beta testing while following AAA vehicle-art principles:
// accurate silhouette, separated body/glass/rubber/metal/light materials, panel/trim depth,
// believable wheels, lamps, grounding and strong readable paint reflections.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
import { RoundedBoxGeometry } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/geometries/RoundedBoxGeometry.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/loaders/GLTFLoader.js';
const installed=Symbol('coastlineHeroVisualsInstalled'),enhanced=Symbol('coastlineHeroVisualsEnhanced');let heroClaimed=false;
const mat=(color,roughness,metalness,extra={})=>new THREE.MeshStandardMaterial({color,roughness,metalness,...extra});
const physical=(color,roughness,metalness,extra={})=>new THREE.MeshPhysicalMaterial({color,roughness,metalness,clearcoat:.72,clearcoatRoughness:.13,...extra});
function add(group,geometry,material,x=0,y=0,z=0,rx=0,ry=0,rz=0){const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.rotation.set(rx,ry,rz);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh;}
function rb(w,h,d,r=.08){return new RoundedBoxGeometry(w,h,d,r,4);}
function addWheel(detail,x,z){
 const tire=mat(0x080a0c,.9,.02),sidewall=mat(0x14171a,.72,.03),rim=physical(0x9da5ab,.2,.9),hub=physical(0x20252a,.25,.82),brake=physical(0xb3262b,.25,.7);
 add(detail,new THREE.CylinderGeometry(.42,.42,.24,32),tire,x,.47,z,0,0,Math.PI/2);
 add(detail,new THREE.TorusGeometry(.39,.035,12,32),sidewall,x,.47,z,0,Math.PI/2,0);
 add(detail,new THREE.CylinderGeometry(.30,.30,.25,32),rim,x,.47,z,0,0,Math.PI/2);
 add(detail,new THREE.CylinderGeometry(.17,.17,.27,24),hub,x,.47,z,0,0,Math.PI/2);
 add(detail,new THREE.CylinderGeometry(.10,.10,.275,20),brake,x,.47,z,0,0,Math.PI/2);
 for(let i=0;i<5;i++){const a=i*Math.PI*2/5;add(detail,new THREE.BoxGeometry(.035,.035,.22),rim,x+Math.cos(a)*.20,.47+Math.sin(a)*.20,z,0,0,Math.PI/2+a);}
}
function addFallback(detail){
 const paint=physical(0x8e1020,.18,.78),paint2=physical(0xb51b2b,.20,.76),paintDark=physical(0x470812,.25,.7),black=physical(0x0b0d10,.3,.7),rubber=mat(0x07090b,.9,.02),chrome=physical(0xc4cbd0,.15,.95);
 const glass=new THREE.MeshPhysicalMaterial({color:0x071a23,roughness:.055,metalness:.22,transmission:.12,transparent:true,opacity:.92,clearcoat:.9,clearcoatRoughness:.06,ior:1.48});
 const lamp=new THREE.MeshStandardMaterial({color:0xf8fbff,emissive:0xbfe2ff,emissiveIntensity:3.2,roughness:.08,metalness:.08});
 const tail=new THREE.MeshStandardMaterial({color:0xb20d18,emissive:0x7d0208,emissiveIntensity:3.0,roughness:.1});
 // Main body shell: low, wide modern performance crossover silhouette.
 add(detail,rb(1.96,.20,3.25,.11),paint,0,.76,0);
 add(detail,rb(1.84,.30,2.38,.14),paint2,0,.94,-.16);
 add(detail,rb(1.74,.30,1.25,.12),paintDark,0,1.16,-.38);
 // Hood and roof/cabin are deliberately separated to create readable panel breaks.
 add(detail,rb(1.72,.055,1.22,.035),paint2,0,1.17,.73);
 add(detail,rb(1.50,.055,1.18,.03),paint2,0,1.42,-.38);
 add(detail,rb(1.43,.30,.94,.10),glass,0,1.33,.25);
 add(detail,rb(1.40,.25,.76,.08),glass,0,1.30,-.68);
 // Pillars, window surround and mirrors.
 for(const x of[-.70,.70]) add(detail,rb(.055,.34,.96,.018),black,x,1.33,.25);
 for(const x of[-.73,.73]){add(detail,rb(.13,.09,.25,.035),paintDark,x,1.27,.62);add(detail,rb(.08,.05,.17,.02),glass,x*1.01,1.28,.62);}
 add(detail,rb(1.47,.045,.045,.015),chrome,0,1.14,1.35);
 // Front fascia: grille, intake depth, splitter and distinct LED signatures.
 add(detail,rb(1.48,.24,.18,.045),black,0,.69,1.66);
 add(detail,rb(1.12,.10,.035,.015),chrome,0,.74,1.76);
 for(const x of[-.52,.52]) add(detail,rb(.42,.08,.045,.02),lamp,x,.79,1.79);
 for(const x of[-.74,.74]) add(detail,rb(.25,.09,.045,.018),lamp,x,.73,1.80);
 add(detail,rb(1.62,.09,.18,.035),paintDark,0,.59,1.75);
 // Rear fascia and taillight blade.
 add(detail,rb(1.58,.20,.16,.035),paintDark,0,.67,-1.67);
 add(detail,rb(1.38,.07,.045,.02),tail,0,.80,-1.76);
 add(detail,rb(1.10,.055,.04,.015),chrome,0,.70,-1.79);
 // Side sculpting, rocker trim and door handles.
 for(const x of[-.985,.985]){add(detail,rb(.075,.20,2.18,.025),paintDark,x,.67,0);add(detail,rb(.045,.035,1.52,.015),black,x*1.002,.51,0);}
 for(const x of[-.91,.91]){add(detail,rb(.16,.035,.38,.012),chrome,x,.98,.16);add(detail,rb(.12,.025,.30,.01),chrome,x,.98,-.50);}
 // Wheel arches, wheels, brakes and tucked underbody. No airplane-like aero wings.
 for(const x of[-1.02,1.02])for(const z of[-1.18,1.18]){
  add(detail,new THREE.TorusGeometry(.51,.075,14,36,Math.PI),paintDark,x,.50,z,0,Math.PI/2,Math.PI/2);
  addWheel(detail,x,z);
 }
 add(detail,rb(1.66,.07,3.05,.025),rubber,0,.25,0);
 // Roof spoiler and shark-fin antenna give the silhouette a production-car finish.
 add(detail,rb(1.30,.07,.30,.025),paintDark,0,1.57,-.93);
 add(detail,new THREE.ConeGeometry(.07,.16,4),black,0,1.62,.08);
 // Grounding/contact shadow proxy, intentionally subtle.
 const shadow=new THREE.Mesh(new THREE.PlaneGeometry(2.05,3.8),new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:.16,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.235;detail.add(shadow);
}
function classifyMaterial(name){const n=(name||'').toLowerCase();return {glass:/glass|window|windshield|windowglass/.test(n),rubber:/tire|tyre|rubber/.test(n),metal:/chrome|metal|aluminum|alloy|rim|wheel/.test(n),light:/lamp|light|headlight|taillight|led|emissive/.test(n)};}
function makeHeroModelReadablyDifferent(model){
 model.traverse(o=>{
  if(!o.isMesh||!o.material)return;
  const list=Array.isArray(o.material)?o.material:[o.material];
  for(const m of list){
   const cls=classifyMaterial((o.name||'')+' '+(m.name||''));
   if(cls.glass){m.color?.set(0x061923);if('roughness'in m)m.roughness=.045;if('metalness'in m)m.metalness=.22;if('envMapIntensity'in m)m.envMapIntensity=1.8;}
   else if(cls.rubber){m.color?.set(0x07090b);if('roughness'in m)m.roughness=.88;}
   else if(cls.metal){m.color?.set(0x9aa3aa);if('metalness'in m)m.metalness=.92;if('roughness'in m)m.roughness=.19;}
   else if(cls.light){m.emissive?.set(0xc8e7ff);if('emissiveIntensity'in m)m.emissiveIntensity=Math.max(m.emissiveIntensity||0,2.5);}
   else {
    // Deliberately dramatic crimson metallic replacement paint for this verification build.
    m.color?.set(0x9b1224);if('metalness'in m)m.metalness=.72;if('roughness'in m)m.roughness=.18;
    if('clearcoat'in m)m.clearcoat=.78;if('clearcoatRoughness'in m)m.clearcoatRoughness=.12;
   }
   if('envMapIntensity'in m)m.envMapIntensity=Math.max(m.envMapIntensity||1,1.55);
   if('needsUpdate'in m)m.needsUpdate=true;
  }
 });
}
async function loadRealHero(detail,group){
 if(detail.userData.coastlineRealAssetAttempted)return;detail.userData.coastlineRealAssetAttempted=true;
 const loader=new GLTFLoader();
 try{
  const gltf=await loader.loadAsync('https://jaronkbragg7337.github.io/spectral-gt-rs/spectral_gt_rs_game_ready.glb');
  const model=gltf.scene;model.name='coastline-crimson-hero-replacement';model.rotation.y=-Math.PI/2;model.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
  const targetLength=4.35,scale=targetLength/Math.max(size.z,size.x,.001);model.scale.setScalar(scale);model.updateMatrixWorld(true);
  const b2=new THREE.Box3().setFromObject(model);model.position.y+=.46-b2.min.y;model.position.x-=center.x*scale;model.position.z-=center.z*scale;
  makeHeroModelReadablyDifferent(model);
  model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.frustumCulled=true;o.userData.coastlineRealVehicle=true;}});
  detail.visible=false;group.add(model);group.userData.coastlineHeroVisuals='v6-crimson-cc0-glb';group.userData.coastlineHeroProof='CRIMSON-REPLACEMENT-V6';
 }catch(err){console.warn('Coastline detailed hero vehicle failed; using crimson production-style fallback',err);group.userData.coastlineHeroVisuals='v6-crimson-fallback';group.userData.coastlineHeroProof='CRIMSON-FALLBACK-V6';}
}
function enhanceCar(group){
 if(!group||group[enhanced])return;group[enhanced]=true;
 const detail=new THREE.Group();detail.name='coastline-hero-vehicle-details-v6-crimson';group.add(detail);addFallback(detail);
 detail.traverse(o=>{if(o.isMesh){o.userData.coastlineHeroDetail=true;o.castShadow=true;o.receiveShadow=true;}});
 group.userData.coastlineHeroVisuals='v6-loading-crimson';group.userData.coastlineHeroProof='CRIMSON-REPLACEMENT-V6';loadRealHero(detail,group);
}
function looksLikePlayerCar(child){const p=child?.geometry?.parameters;if(!p)return false;const w=Number(p.width),h=Number(p.height),d=Number(p.depth);return(Math.abs(w-2.05)<.03&&Math.abs(h-.55)<.03&&Math.abs(d-4.25)<.05)||(Math.abs(w-2.12)<.03&&Math.abs(h-.62)<.03&&Math.abs(d-4.35)<.05);}
export function installVehicleVisualEnhancer(){if(globalThis[installed])return;globalThis[installed]=true;const originalAdd=THREE.Group.prototype.add;THREE.Group.prototype.add=function(...objects){const result=originalAdd.apply(this,objects);if(!heroClaimed&&!this[enhanced]&&objects.some(looksLikePlayerCar)){heroClaimed=true;this.userData.coastlineHeroTarget='starter-player-car';enhanceCar(this);}return result;};globalThis.__coastlineHeroVehicleVisuals={version:6,enhanceCar,installed:true};}
installVehicleVisualEnhancer();
