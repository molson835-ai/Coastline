// Coastline vehicle realism pass v8.
// Visual-only: preserves vehicle transforms, controls, physics and gameplay collision.
// Research-driven principles: rounded geometry, smooth normals, physically based paint,
// clearcoat, realistic glass/rubber/metal separation, high-detail wheels/lights, and LOD-aware detail.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
import { RoundedBoxGeometry } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/geometries/RoundedBoxGeometry.js';

const installed=Symbol('coastlineVehicleRealismInstalled');
const enhanced=Symbol('coastlineVehicleRealismEnhanced');
let vehicleSerial=0;

const physical=(color,roughness=.25,metalness=.35,extra={})=>new THREE.MeshPhysicalMaterial({color,roughness,metalness,clearcoat:.72,clearcoatRoughness:.11,...extra});
const standard=(color,roughness=.5,metalness=.1,extra={})=>new THREE.MeshStandardMaterial({color,roughness,metalness,...extra});
const rb=(w,h,d,r=.08,s=5)=>new RoundedBoxGeometry(w,h,d,s,r);

function add(g,geo,mat,x=0,y=0,z=0,rx=0,ry=0,rz=0){
 const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.rotation.set(rx,ry,rz);m.castShadow=true;m.receiveShadow=true;g.add(m);return m;
}
function mats(color){
 const paint=physical(color,.19,.68,{clearcoat:.9,clearcoatRoughness:.085,envMapIntensity:1.55});
 const paint2=physical(new THREE.Color(color).multiplyScalar(.82),.22,.62,{clearcoat:.88,clearcoatRoughness:.10,envMapIntensity:1.5});
 const trim=physical(0x0b0e12,.31,.72,{clearcoat:.35,clearcoatRoughness:.18});
 const chrome=physical(0xc4cbd0,.14,.94,{envMapIntensity:1.8});
 const rubber=standard(0x080a0c,.88,.02);
 const rim=physical(0x8e969e,.20,.92,{envMapIntensity:1.8});
 const glass=new THREE.MeshPhysicalMaterial({color:0x071a22,roughness:.035,metalness:.08,transmission:.16,transparent:true,opacity:.94,clearcoat:.96,clearcoatRoughness:.045,ior:1.48,envMapIntensity:1.8});
 const head=new THREE.MeshPhysicalMaterial({color:0xeaf7ff,roughness:.055,metalness:.08,emissive:0x9ddcff,emissiveIntensity:3.4,transmission:.06,clearcoat:.7});
 const tail=new THREE.MeshStandardMaterial({color:0x8d1016,roughness:.13,metalness:.08,emissive:0x550308,emissiveIntensity:2.7});
 const brake=standard(0x9d1119,.25,.68);
 return {paint,paint2,trim,chrome,rubber,rim,glass,head,tail,brake};
}
function wheel(g,m,x,z,scale=1){
 const r=.40*scale,w=.24*scale;
 add(g,new THREE.CylinderGeometry(r,r,w,32),m.rubber,x,.46*scale,z,0,0,Math.PI/2);
 add(g,new THREE.TorusGeometry(r*.78,.035*scale,10,32),m.rim,x,.46*scale,z,0,Math.PI/2,0);
 add(g,new THREE.CylinderGeometry(r*.62,r*.62,w*1.04,32),m.rim,x,.46*scale,z,0,0,Math.PI/2);
 add(g,new THREE.CylinderGeometry(r*.28,r*.28,w*1.08,24),m.brake,x,.46*scale,z,0,0,Math.PI/2);
 add(g,new THREE.CylinderGeometry(r*.13,r*.13,w*1.12,20),m.chrome,x,.46*scale,z,0,0,Math.PI/2);
}
function fascia(g,m,w,l,front=true){
 const z=(front?1:-1)*(l/2+.015);
 add(g,rb(w*.74,.20,.14,.035),m.trim,0,.66,z);
 add(g,rb(w*.52,.055,.035,.012),front?m.head:m.tail,0,.78,z+(front?.035:-.035));
 if(front){add(g,rb(w*.30,.055,.025,.01),m.chrome,0,.69,z+.05);for(const x of[-w*.29,w*.29])add(g,rb(w*.13,.06,.035,.012),m.head,x,.73,z+.05);}
 else add(g,rb(w*.46,.045,.025,.01),m.chrome,0,.69,z-.04);
}
function windows(g,m,w,style){
 const cabW=style==='suv'?w*.72:w*.70;
 const cabD=style==='pickup'?1.25:style==='hatch'?1.72:1.82;
 const y=style==='coupe'?1.22:style==='suv'?1.29:1.20;
 const z=style==='pickup'?.05:-.12;
 add(g,rb(cabW,.55,cabD,.12),m.glass,0,y,z);
 // Blacked-out pillars and roof surround make the glass read as a real cabin rather than a box.
 for(const x of[-cabW/2,cabW/2])add(g,rb(.045,.50,cabD*.86,.012),m.trim,x,y,z);
 add(g,rb(cabW+.05,.045,.10,.018),m.trim,0,y+.29,z-cabD/2);
}
function buildVehicle(group,color,style,index){
 const m=mats(color);
 const spec={sedan:[2.02,4.25,1.48],suv:[2.10,4.48,1.68],coupe:[2.00,4.22,1.35],hatch:[2.00,4.05,1.55],pickup:[2.08,4.60,1.72]}[style];
 const [w,l,h]=spec;
 const d=new THREE.Group();d.name=`coastline-real-vehicle-${style}-${index}`;group.add(d);
 // Existing primitive vehicle meshes are visual duplicates; hide them, never remove them, so gameplay references remain intact.
 group.children.forEach(c=>{if(c!==d&&c.isMesh)c.visible=false;});
 const bodyH=style==='suv'?.58:style==='pickup'?.56:.52;
 add(d,rb(w,bodyH,l,.13),m.paint,0,.67,0);
 // Lower rocker, shoulder and bumper layers give the body believable panel depth.
 add(d,rb(w*.92,.16,l*.82,.055),m.paint2,0,.86,-.02);
 add(d,rb(w*.94,.11,l*.80,.035),m.trim,0,.48,0);
 add(d,rb(w*.82,.10,.20,.03),m.trim,0,.59,l/2+.04);
 add(d,rb(w*.82,.10,.20,.03),m.trim,0,.59,-l/2-.04);
 // Hood and deck are curved rather than flat boxes.
 const hoodL=style==='pickup'?1.15:style==='suv'?1.30:1.38;
 add(d,rb(w*.84,.16,hoodL,.08),m.paint2,0,.92,l/2-hoodL/2-.16);
 if(style!=='pickup')add(d,rb(w*.80,.14,style==='hatch'?.72:.86,.07),m.paint2,0,.91,-l/2+.40);
 windows(d,m,w,style);
 // Roof proportions change by body class.
 const roofW=style==='suv'?w*.74:w*.70;
 const roofD=style==='pickup'?1.12:style==='hatch'?1.56:style==='coupe'?1.68:1.78;
 add(d,rb(roofW,.075,roofD,.035),m.paint2,0,1.48,style==='pickup'?.03:-.12);
 // Front/rear production fascia, lamps and grille.
 fascia(d,m,w,l,true);fascia(d,m,w,l,false);
 add(d,rb(w*.40,.10,.035,.012),m.trim,0,.72,l/2+.075);
 // Side mirrors and handles.
 for(const x of[-w*.53,w*.53]){
  add(d,rb(.12,.08,.22,.035),m.paint2,x,1.13,.48);
  add(d,rb(.07,.045,.14,.02),m.glass,x*1.01,1.13,.48);
 }
 for(const x of[-w*.51,w*.51])for(const z of[-.34,.36])add(d,rb(.13,.028,.26,.012),m.chrome,x,.96,z);
 // Wheel arches and four complete road wheels.
 const wx=w*.53,wz=l*.36;
 for(const x of[-wx,wx])for(const z of[-wz,wz]){
  add(d,new THREE.TorusGeometry(.47,.055,12,40,Math.PI),m.paint2,x,.47,z,0,Math.PI/2,Math.PI/2);
  wheel(d,m,x,z,style==='suv'?1.04:1);
 }
 // Roof/bed details make the archetypes distinguishable.
 if(style==='pickup'){
  add(d,rb(w*.92,.42,1.32,.07),m.trim,0,.82,-1.25);
  add(d,rb(w*.82,.05,1.14,.02),m.paint2,0,1.05,-1.25);
  add(d,rb(w*.70,.07,.08,.015),m.chrome,0,1.09,-1.88);
 }
 if(style==='suv')add(d,rb(w*.54,.06,.18,.02),m.trim,0,1.57,.02);
 if(style==='coupe')add(d,rb(w*.56,.06,.28,.02),m.trim,0,1.47,-.92);
 // License plates and subtle exhausts.
 const plate=standard(0xe9e5d9,.52,.05);
 add(d,rb(w*.25,.07,.025,.008),plate,0,.67,l/2+.085);
 add(d,rb(w*.25,.07,.025,.008),plate,0,.67,-l/2-.085);
 if(style!=='suv')for(const x of[-w*.25,w*.25])add(d,new THREE.CylinderGeometry(.045,.045,.12,16),m.chrome,x,.54,-l/2-.09,Math.PI/2,0,0);
 d.traverse(o=>{if(o.isMesh){o.userData.coastlineVehicleDetail=true;o.castShadow=true;o.receiveShadow=true;if(o.geometry.computeVertexNormals)o.geometry.computeVertexNormals();}});
 group.userData.coastlineVehicleRealism={version:8,style,index};
}
function readColor(group){
 let color=0x167e99;
 group.traverse(o=>{if(o.isMesh&&o.material&&!o.userData.coastlineVehicleDetail){const ms=Array.isArray(o.material)?o.material:[o.material];for(const x of ms){if(x?.color?.isColor&&x.metalness!==undefined){color=x.color.getHex();return;}}}});
 return color;
}
function isVehicleBodyMesh(o){
 const p=o?.geometry?.parameters;if(!p)return false;
 const vals=[Number(p.width),Number(p.height),Number(p.depth)];
 return (Math.abs(vals[0]-2.05)<.04&&Math.abs(vals[1]-.55)<.04&&Math.abs(vals[2]-4.25)<.07)||(Math.abs(vals[0]-2.12)<.05&&Math.abs(vals[1]-.62)<.05&&Math.abs(vals[2]-4.35)<.08);
}
export function enhanceCar(group){
 if(!group||group[enhanced])return;
 group[enhanced]=true;
 const index=vehicleSerial++;
 const styles=['sedan','suv','coupe','hatch','pickup'];
 const style=styles[index%styles.length];
 buildVehicle(group,readColor(group),style,index);
}
function hookVehicleCreation(){
 const proto=THREE.Group.prototype;
 if(proto.__coastlineVehicleAddHook)return;
 proto.__coastlineVehicleAddHook=true;
 const original=proto.add;
 proto.add=function(...objects){
  const result=original.apply(this,objects);
  if(!this[enhanced]&&!this.userData?.coastlineVehicleDetail){
   let found=false;
   for(const o of objects){if(o?.isMesh&&isVehicleBodyMesh(o)){found=true;break;}}
   if(found){
    clearTimeout(this.__coastlineVehicleEnhanceTimer);
    this.__coastlineVehicleEnhanceTimer=setTimeout(()=>enhanceCar(this),0);
   }
  }
  return result;
 };
}
export function installVehicleVisualEnhancer(){
 if(globalThis[installed])return;
 globalThis[installed]=true;
 hookVehicleCreation();
 globalThis.__coastlineHeroVehicleVisuals={version:8,enhanceCar,installed:true,allVehicles:true,styles:['sedan','suv','coupe','hatch','pickup']};
}
installVehicleVisualEnhancer();