// Coastline hero-vehicle rendering pass.
// Visual-only layer: preserves gameplay dimensions, input, physics and collision.
// v5: actively installs the enhancer; v4 was imported by the runtime but never invoked.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
import { RoundedBoxGeometry } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/geometries/RoundedBoxGeometry.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/loaders/GLTFLoader.js';
const installed=Symbol('coastlineHeroVisualsInstalled'),enhanced=Symbol('coastlineHeroVisualsEnhanced');
const mat=(color,roughness,metalness,extra={})=>new THREE.MeshStandardMaterial({color,roughness,metalness,...extra});
const physical=(color,roughness,metalness,extra={})=>new THREE.MeshPhysicalMaterial({color,roughness,metalness,clearcoat:.62,clearcoatRoughness:.16,...extra});
function add(group,geometry,material,x=0,y=0,z=0,rx=0,ry=0,rz=0){const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.rotation.set(rx,ry,rz);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh;}
function rb(w,h,d,r=.08){return new RoundedBoxGeometry(w,h,d,r,3);}
function addFallback(detail){
 const paint=physical(0x167e99,.22,.72),paintDark=physical(0x0d4f62,.27,.62),carbon=physical(0x101419,.34,.62),glass=new THREE.MeshPhysicalMaterial({color:0x102832,roughness:.09,metalness:.18,transmission:.16,transparent:true,opacity:.88,clearcoat:.8,clearcoatRoughness:.08,ior:1.48});
 const rubber=mat(0x090c0f,.86,.04),trim=mat(0x161b1f,.34,.72),chrome=mat(0xb8bec1,.17,.92),brake=mat(0xc92b2b,.28,.64);
 const lamp=new THREE.MeshStandardMaterial({color:0xf4f7ff,emissive:0x9bc9ff,emissiveIntensity:2.4,roughness:.12,metalness:.06}),tail=new THREE.MeshStandardMaterial({color:0x9c1722,emissive:0x70060b,emissiveIntensity:2.2,roughness:.16});
 add(detail,rb(1.92,.11,1.48,.045),paint,0,.91,.98); add(detail,rb(1.78,.10,1.10,.04),paintDark,0,.975,.82); add(detail,rb(1.76,.52,1.78,.12),paintDark,0,1.12,-.18);
 add(detail,rb(1.54,.32,.76,.10),glass,0,1.29,.22); add(detail,rb(1.50,.30,.78,.10),glass,0,1.28,-.62);
 for(const x of[-.77,.77])add(detail,rb(.055,.34,1.34,.018),trim,x,1.28,-.18); add(detail,rb(1.42,.045,.055,.02),chrome,0,1.08,.67);
 add(detail,rb(1.42,.12,.18,.035),paintDark,0,.55,1.96); add(detail,rb(1.42,.10,.16,.035),paintDark,0,.55,-1.96);
 for(const x of[-.55,.55])add(detail,rb(.36,.13,.045,.02),lamp,x,.72,2.01); for(const x of[-.66,.66])add(detail,rb(.40,.14,.045,.02),tail,x,.73,-2.01);
 for(const x of[-1.02,1.02]){add(detail,rb(.16,.10,.28,.045),paint,x,1.12,.58);add(detail,rb(.08,.03,.16,.02),glass,x*1.01,1.12,.58);add(detail,rb(.08,.04,.95,.02),trim,x*1.005,.47,0);}
 const wheelPositions=[[-1.08,-1.25],[1.08,-1.25],[-1.08,1.25],[1.08,1.25]];
 for(const[x,z]of wheelPositions){add(detail,new THREE.TorusGeometry(.46,.065,12,28,Math.PI),paintDark,x,.48,z,0,Math.PI/2,Math.PI/2);add(detail,new THREE.CylinderGeometry(.39,.39,.23,28),rubber,x,.47,z,0,0,Math.PI/2);add(detail,new THREE.TorusGeometry(.285,.055,10,28),trim,x,.47,z,0,Math.PI/2,0);add(detail,new THREE.CylinderGeometry(.205,.205,.245,24),chrome,x,.47,z,0,0,Math.PI/2);add(detail,new THREE.CylinderGeometry(.11,.11,.255,20),brake,x,.47,z,0,0,Math.PI/2);}
 add(detail,rb(1.66,.055,3.18,.025),rubber,0,.25,0);
}
async function loadRealHero(detail,group){
 if(detail.userData.coastlineRealAssetAttempted)return; detail.userData.coastlineRealAssetAttempted=true;
 const loader=new GLTFLoader();
 try{
  const gltf=await loader.loadAsync('https://jaronkbragg7337.github.io/spectral-gt-rs/spectral_gt_rs_game_ready.glb');
  const model=gltf.scene; model.name='coastline-cc0-real-hero-car';
  model.rotation.y=-Math.PI/2; model.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(model), size=box.getSize(new THREE.Vector3()), center=box.getCenter(new THREE.Vector3());
  const targetLength=4.35, scale=targetLength/Math.max(size.z,size.x,0.001); model.scale.setScalar(scale); model.updateMatrixWorld(true);
  const b2=new THREE.Box3().setFromObject(model); model.position.y += .46-b2.min.y; model.position.x -= center.x*scale; model.position.z -= center.z*scale;
  model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.frustumCulled=true;o.userData.coastlineRealVehicle=true;if(o.material){const ms=Array.isArray(o.material)?o.material:[o.material];for(const m of ms){if('envMapIntensity' in m)m.envMapIntensity=Math.max(m.envMapIntensity||1,1.35);if('needsUpdate'in m)m.needsUpdate=true;}}}});
  detail.visible=false; group.add(model); group.userData.coastlineHeroVisuals='v5-cc0-glb';
  if(gltf.animations?.length){const mixer=new THREE.AnimationMixer(model);for(const clip of gltf.animations){if(/steering/i.test(clip.name))mixer.clipAction(clip).play();}const clock=new THREE.Clock();const tick=()=>{if(model.parent){mixer.update(Math.min(clock.getDelta(),.05));requestAnimationFrame(tick);}};tick();}
 }catch(err){console.warn('Coastline detailed hero vehicle failed; keeping procedural fallback',err);group.userData.coastlineHeroVisuals='v5-fallback';}
}
function enhanceCar(group){
 if(!group||group[enhanced])return;group[enhanced]=true;
 const detail=new THREE.Group();detail.name='coastline-hero-vehicle-details';group.add(detail);
 addFallback(detail); detail.traverse(o=>{if(o.isMesh){o.userData.coastlineHeroDetail=true;o.castShadow=true;o.receiveShadow=true;}});
 group.userData.coastlineHeroVisuals='v5-loading-cc0';
 loadRealHero(detail,group);
}
function looksLikePlayerCar(child){const p=child?.geometry?.parameters;if(!p)return false;const w=Number(p.width),h=Number(p.height),d=Number(p.depth);return(Math.abs(w-2.12)<.03&&Math.abs(h-.62)<.03&&Math.abs(d-4.35)<.05)||(Math.abs(w-2.05)<.03&&Math.abs(h-.62)<.03&&Math.abs(d-4.35)<.05);}
export function installVehicleVisualEnhancer(){if(globalThis[installed])return;globalThis[installed]=true;const originalAdd=THREE.Group.prototype.add;THREE.Group.prototype.add=function(...objects){const result=originalAdd.apply(this,objects);if(!this[enhanced]&&objects.some(looksLikePlayerCar))enhanceCar(this);return result;};globalThis.__coastlineHeroVehicleVisuals={version:5,enhanceCar,installed:true};}
// Critical: this module is injected by the service worker; importing it alone does not execute the exported installer.
installVehicleVisualEnhancer();
