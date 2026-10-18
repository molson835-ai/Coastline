// Coastline hero-vehicle rendering pass.
// Visual-only layer: preserves gameplay dimensions, input, physics and collision.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
import { RoundedBoxGeometry } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/geometries/RoundedBoxGeometry.js';
const installed=Symbol('coastlineHeroVisualsInstalled'),enhanced=Symbol('coastlineHeroVisualsEnhanced');
const mat=(color,roughness,metalness,extra={})=>new THREE.MeshStandardMaterial({color,roughness,metalness,...extra});
const physical=(color,roughness,metalness,extra={})=>new THREE.MeshPhysicalMaterial({color,roughness,metalness,clearcoat:.62,clearcoatRoughness:.16,...extra});
function add(group,geometry,material,x=0,y=0,z=0,rx=0,ry=0,rz=0){const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.rotation.set(rx,ry,rz);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh;}
function rb(w,h,d,r=.08){return new RoundedBoxGeometry(w,h,d,r,3);}
function enhanceCar(group){
 if(!group||group[enhanced])return;group[enhanced]=true;
 const detail=new THREE.Group();detail.name='coastline-hero-vehicle-details';group.add(detail);
 const paint=physical(0x167e99,.22,.72),paintDark=physical(0x0d4f62,.27,.62),carbon=physical(0x101419,.34,.62),glass=new THREE.MeshPhysicalMaterial({color:0x102832,roughness:.09,metalness:.18,transmission:.16,transparent:true,opacity:.88,clearcoat:.8,clearcoatRoughness:.08,ior:1.48});
 const rubber=mat(0x090c0f,.86,.04),trim=mat(0x161b1f,.34,.72),chrome=mat(0xb8bec1,.17,.92),brake=mat(0xc92b2b,.28,.64);
 const lamp=new THREE.MeshStandardMaterial({color:0xf4f7ff,emissive:0x9bc9ff,emissiveIntensity:2.4,roughness:.12,metalness:.06}),tail=new THREE.MeshStandardMaterial({color:0x9c1722,emissive:0x70060b,emissiveIntensity:2.2,roughness:.16});
 // Compact SUV/crossover silhouette: no wings, no long aero fins, no airplane-like appendages.
 add(detail,rb(1.92,.11,1.48,.045),paint,0,.91,.98);
 add(detail,rb(1.78,.10,1.10,.04),paintDark,0,.975,.82);
 add(detail,rb(1.76,.52,1.78,.12),paintDark,0,1.12,-.18);
 add(detail,rb(1.54,.32,.76,.10),glass,0,1.29,.22);
 add(detail,rb(1.50,.30,.78,.10),glass,0,1.28,-.62);
 for(const x of[-.77,.77])add(detail,rb(.055,.34,1.34,.018),trim,x,1.28,-.18);
 add(detail,rb(1.42,.045,.055,.02),chrome,0,1.08,.67);
 // restrained lower bumpers instead of front/rear wings
 add(detail,rb(1.42,.12,.18,.035),paintDark,0,.55,1.96);
 add(detail,rb(1.42,.10,.16,.035),paintDark,0,.55,-1.96);
 for(const x of[-.55,.55])add(detail,rb(.36,.13,.045,.02),lamp,x,.72,2.01);
 for(const x of[-.66,.66])add(detail,rb(.40,.14,.045,.02),tail,x,.73,-2.01);
 const leftBeam=new THREE.SpotLight(0xddeeff,13,30,Math.PI/10,.5,1.35),rightBeam=new THREE.SpotLight(0xddeeff,13,30,Math.PI/10,.5,1.35);leftBeam.position.set(-.55,.72,2.03);rightBeam.position.set(.55,.72,2.03);
 const lt=new THREE.Object3D(),rt=new THREE.Object3D();lt.position.set(-.55,.5,12);rt.position.set(.55,.5,12);detail.add(lt,rt);leftBeam.target=lt;rightBeam.target=rt;detail.add(leftBeam,rightBeam);
 // Mirrors and subtle side trim
 for(const x of[-1.02,1.02]){add(detail,rb(.16,.10,.28,.045),paint,x,1.12,.58);add(detail,rb(.08,.03,.16,.02),glass,x*1.01,1.12,.58);add(detail,rb(.08,.04,.95,.02),trim,x*1.005,.47,0);}
 // Four road wheels, proportioned as SUV wheels rather than aircraft nacelles.
 const wheelPositions=[[-1.08,-1.25],[1.08,-1.25],[-1.08,1.25],[1.08,1.25]];
 for(const[x,z]of wheelPositions){add(detail,new THREE.TorusGeometry(.46,.065,12,28,Math.PI),paintDark,x,.48,z,0,Math.PI/2,Math.PI/2);add(detail,new THREE.CylinderGeometry(.39,.39,.23,28),rubber,x,.47,z,0,0,Math.PI/2);add(detail,new THREE.TorusGeometry(.285,.055,10,28),trim,x,.47,z,0,Math.PI/2,0);add(detail,new THREE.CylinderGeometry(.205,.205,.245,24),chrome,x,.47,z,0,0,Math.PI/2);add(detail,new THREE.CylinderGeometry(.11,.11,.255,20),brake,x,.47,z,0,0,Math.PI/2);for(let spoke=0;spoke<5;spoke++)add(detail,new THREE.BoxGeometry(.025,.15,.05),chrome,x,.47,z,0,0,spoke*Math.PI/5);}
 // Keep the underbody visually tucked inside the vehicle instead of forming a wing.
 add(detail,rb(1.66,.055,3.18,.025),rubber,0,.25,0);
 detail.traverse(o=>{if(o.isMesh){o.userData.coastlineHeroDetail=true;o.castShadow=true;o.receiveShadow=true;}});group.userData.coastlineHeroVisuals='v3';
}
function looksLikePlayerCar(child){const p=child?.geometry?.parameters;if(!p)return false;const w=Number(p.width),h=Number(p.height),d=Number(p.depth);return(Math.abs(w-2.12)<.03&&Math.abs(h-.62)<.03&&Math.abs(d-4.35)<.05)||(Math.abs(w-2.05)<.03&&Math.abs(h-.62)<.03&&Math.abs(d-4.35)<.05);}
export function installVehicleVisualEnhancer(){if(globalThis[installed])return;globalThis[installed]=true;const originalAdd=THREE.Group.prototype.add;THREE.Group.prototype.add=function(...objects){const result=originalAdd.apply(this,objects);if(!this[enhanced]&&objects.some(looksLikePlayerCar))enhanceCar(this);return result;};globalThis.__coastlineHeroVehicleVisuals={version:3,enhanceCar};}
