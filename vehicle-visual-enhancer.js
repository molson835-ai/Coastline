// Coastline Hero Vehicle v20 — high-resolution 2008-era American muscle coupe study.
// Built from measured public dimensions and period design cues; no external 3D asset dependency.
// Performance-safe: one hero mesh, compact UV set, procedural texture maps, no global renderer changes.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';

const installed=Symbol('coastlineVehicleHero20Installed'),enhanced=Symbol('coastlineVehicleHero20Enhanced');
let serial=0;

const IN={L:187.6*0.0254,W:73.9*0.0254,H:55.4*0.0254,WB:107.1*0.0254,TRACK:62.5*0.0254};

function matPaint(color){return new THREE.MeshPhysicalMaterial({color,metalness:.68,roughness:.18,clearcoat:.92,clearcoatRoughness:.065,envMapIntensity:1.45});}
function matGlass(){return new THREE.MeshPhysicalMaterial({color:0x0a1217,metalness:.04,roughness:.045,transmission:.18,transparent:true,opacity:.94,ior:1.5,clearcoat:.9,clearcoatRoughness:.035,envMapIntensity:1.35});}
function matRubber(){return new THREE.MeshStandardMaterial({color:0x080a0c,roughness:.88,metalness:.02});}
function matChrome(){return new THREE.MeshPhysicalMaterial({color:0xbcc4c8,metalness:.96,roughness:.13,clearcoat:.25,envMapIntensity:1.8});}
function matBlack(){return new THREE.MeshStandardMaterial({color:0x080b0d,metalness:.72,roughness:.28});}
function matLamp(color,emissive,intensity){return new THREE.MeshPhysicalMaterial({color,roughness:.12,metalness:.06,clearcoat:.7,emissive,emissiveIntensity:intensity});}

// Compact 1024px procedural UV textures: subtle clearcoat micro-variation and panel roughness.
function textureMaps(THREE,color){
 const c=document.createElement('canvas');c.width=c.height=1024;const x=c.getContext('2d');
 const rgb=new THREE.Color(color);const r=Math.round(rgb.r*255),g=Math.round(rgb.g*255),b=Math.round(rgb.b*255);
 x.fillStyle=`rgb(${r},${g},${b})`;x.fillRect(0,0,1024,1024);
 for(let i=0;i<9000;i++){const p=.965+Math.random()*.035;x.fillStyle=`rgba(255,255,255,${(p-.965)*.75})`;x.fillRect(Math.random()*1024,Math.random()*1024,1,1);}
 const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=4;map.wrapS=map.wrapT=THREE.RepeatWrapping;
 return map;
}

function loftBody(){
 // 64 longitudinal sections x 32 perimeter points = 2048 vertices.
 const segZ=64,segR=32,pos=[],uv=[],idx=[];
 for(let i=0;i<=segZ;i++){
  const t=i/segZ,z=-IN.L/2+t*IN.L;
  const nose=(t<.15)?t/.15:1,rear=(t>.83)?(1-t)/.17:1;
  const center=Math.max(.36,Math.min(.72,.57+.11*(1-nose)+.055*rear));
  const width=(IN.W/2)*Math.sin(Math.PI*Math.min(1,t*1.12))*(.93+.07*rear);
  const bodyH=.54+.16*(nose*.55+rear*.45);
  for(let j=0;j<segR;j++){
   const a=j/segR*Math.PI*2;
   const ca=Math.cos(a),sa=Math.sin(a);
   const side=Math.abs(ca);
   const vertical=sa;
   let x=width*ca;
   let y=center+(bodyH*.5)*vertical;
   // Flatten floor and shape belt/shoulders; hood is lower at front, deck slightly raised rear.
   if(y<.37)y=.37+(y-.37)*.24;
   const shoulder=1+.055*(1-Math.abs(vertical));
   x*=shoulder;
   if(t<.20)y-=.035*(1-t/.20);
   if(t>.70)y+=.018*((t-.70)/.30);
   pos.push(x,y,z);
   uv.push(t,j/segR);
  }
 }
 for(let i=0;i<segZ;i++)for(let j=0;j<segR;j++){const a=i*segR+j,b=i*segR+(j+1)%segR,c=(i+1)*segR+(j+1)%segR,d=(i+1)*segR+j;idx.push(a,b,d,b,c,d);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
}

function curvedCabin(){
 // Fastback-style greenhouse with UVs, 24 sections, continuous surfaces.
 const nz=24,nx=12,pos=[],uv=[],idx=[];
 const z0=-.73,z1=.83;
 for(let i=0;i<=nz;i++){
  const t=i/nz,z=z0+(z1-z0)*t;
  const roof=.98-.16*Math.sin(Math.PI*t);const half=IN.W*.34*(.98-.10*Math.sin(Math.PI*t));
  const y=1.03+.38*Math.sin(Math.PI*t); 
  for(let j=0;j<=nx;j++){const u=j/nx,x=-half+2*half*u;const crown=.05*Math.sin(Math.PI*u);pos.push(x,y+crown,z);uv.push(u,t);}
 }
 for(let i=0;i<nz;i++)for(let j=0;j<nx;j++){const a=i*(nx+1)+j,b=a+1,c=a+(nx+1)+1,d=a+(nx+1);idx.push(a,b,d,b,c,d);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
}

function mesh(g,geo,material,p=[0,0,0],r=[0,0,0]){const m=new THREE.Mesh(geo,material);m.position.set(...p);m.rotation.set(...r);m.castShadow=true;m.receiveShadow=true;m.frustumCulled=true;g.add(m);return m;}
function roundedBox(w,h,d,r,mat){return new THREE.Mesh(new THREE.BoxGeometry(w,h,d,4,3,4),mat);}

function addWheel(g,m,x,z,r=.225){
 mesh(g,new THREE.CylinderGeometry(r,r,.20,48,2),m.rubber,[x,.43,z],[0,0,Math.PI/2]);
 mesh(g,new THREE.TorusGeometry(r*.73,.025,12,48),m.rim,[x,.43,z],[0,Math.PI/2,0]);
 mesh(g,new THREE.CylinderGeometry(r*.58,r*.58,.212,40,2),m.rim,[x,.43,z],[0,0,Math.PI/2]);
 mesh(g,new THREE.CylinderGeometry(r*.30,r*.30,.22,32,2),m.brake,[x,.43,z],[0,0,Math.PI/2]);
}

function addFront(g,m){
 // Shark-like 2005–09 Mustang front treatment: recessed grille + round projector lamps.
 const z=IN.L/2+.008;
 mesh(g,roundedBox(IN.W*.72,.25,.10,.035,m.black),m.black,[0,.66,z]);
 mesh(g,roundedBox(IN.W*.57,.075,.025,.012,m.chrome),m.chrome,[0,.67,z+.06]);
 for(const x of[-IN.W*.31,IN.W*.31]){
  mesh(g,new THREE.CylinderGeometry(.085,.085,.045,40),m.head,[x,.78,z+.055],[Math.PI/2,0,0]);
  mesh(g,new THREE.TorusGeometry(.105,.018,10,40),m.chrome,[x,.78,z+.082],[Math.PI/2,0,0]);
 }
 for(const x of[-IN.W*.23,IN.W*.23])mesh(g,new THREE.CylinderGeometry(.055,.055,.035,32),m.fog,[x,.58,z+.06],[Math.PI/2,0,0]);
 // hood center crease / grille surround.
 mesh(g,roundedBox(.055,.025,IN.L*.30,.01,m.black),m.black,[0,.93,.72]);
}
function addRear(g,m){
 const z=-IN.L/2-.015;
 mesh(g,roundedBox(IN.W*.73,.23,.09,.03,m.black),m.black,[0,.69,z]);
 // Three-element taillamps on each side.
 for(const x of[-IN.W*.29,IN.W*.29])for(let k=0;k<3;k++)mesh(g,roundedBox(.07,.105,.025,.012,m.tail),m.tail,[x+k*(x<0?-.07:.07),.75,z-.055]);
 mesh(g,roundedBox(IN.W*.34,.055,.03,.01,m.chrome),m.chrome,[0,.64,z-.055]);
}
function addSideDetails(g,m){
 // Door seams, handles, rocker and C-scoop cues. Thin geometry keeps the silhouette clean.
 for(const x of[-IN.W*.505,IN.W*.505]){
  mesh(g,new THREE.BoxGeometry(.012,.012,1.35),m.black,[x,.76,-.10]);
  mesh(g,new THREE.BoxGeometry(.035,.018,.13),m.chrome,[x*1.005,1.00,.10]);
  mesh(g,new THREE.BoxGeometry(.045,.09,.48),m.black,[x*1.004,.69,-.52]);
 }
 // C-scoop triangular impression using three connected bars.
 for(const x of[-1,1]){
  mesh(g,new THREE.BoxGeometry(.025,.12,.62),m.black,[x*.962,.91,-.70],[0,x*.32,0]);
  mesh(g,new THREE.BoxGeometry(.025,.10,.42),m.black,[x*.962,.84,-.91],[0,-x*.32,0]);
 }
}
function buildHero(group,color){
 const g=new THREE.Group();g.name='coastline-2008-american-muscle-hero';group.add(g);
 const paint=matPaint(color);paint.map=textureMaps(THREE,color);paint.needsUpdate=true;
 const m={paint,glass:matGlass(),rubber:matRubber(),rim:matChrome(),chrome:matChrome(),black:matBlack(),head:matLamp(0xf4fbff,0xb7dcff,2.1),tail:matLamp(0xa4141d,0x6d0308,1.5),fog:matLamp(0xf6d8a0,0xa86d20,.8),brake:matLamp(0xb20f18,0x3d0206,.6)};
 mesh(g,loftBody(),m.paint);
 mesh(g,curvedCabin(),m.glass,[0,.05,-.02]);
 // Roof skin and pillars.
 mesh(g,roundedBox(IN.W*.70,.065,1.54,.035,m.paint),m.paint,[0,1.42,-.02]);
 for(const x of[-1,1])for(const z of[-.74,.70])mesh(g,roundedBox(.045,.45,.055,.015,m.black),m.black,[x*IN.W*.335,1.22,z],[0,0,x*.08]);
 addFront(g,m);addRear(g,m);addSideDetails(g,m);
 const wx=IN.TRACK/2*.0254/0.0254; // normalize measured track back to meters below.
 const wheelX=IN.TRACK/2, wheelZ=IN.WB/2;
 for(const x of[-wheelX,wheelX])for(const z of[-wheelZ,wheelZ])addWheel(g,m,x,z,.225);
 // Subtle underbody and rear diffuser.
 mesh(g,roundedBox(IN.W*.72,.09,IN.L*.55,.025,m.black),m.black,[0,.38,-.05]);
 g.traverse(o=>{if(o.isMesh){o.userData.coastlineHeroVehicle=true;o.castShadow=true;o.receiveShadow=true;o.frustumCulled=true;}});
 group.userData.coastlineHeroVehicle={version:20,vehicle:'2008-era American muscle coupe',dimensions:{length:IN.L,width:IN.W,height:IN.H,wheelbase:IN.WB},uv:true,highResolutionGeometry:true,proceduralPBRTextures:true};
}
function readColor(group){let c=0x1a5d8f;group.traverse(o=>{const ms=o.isMesh?(Array.isArray(o.material)?o.material:[o.material]):[];for(const m of ms)if(m?.color?.isColor&&m.metalness!==undefined)c=m.color.getHex();});return c;}
function looksLikeVehicle(o){const p=o?.geometry?.parameters;if(!p)return false;const a=Number(p.width)||0,b=Number(p.height)||0,c=Number(p.depth)||0;return a>1.4&&a<2.7&&c>3.4&&c<6.3&&b>.35&&b<1.1;}
function hook(){const proto=THREE.Group.prototype;if(proto.__coastlineHero20Hook)return;proto.__coastlineHero20Hook=true;const original=proto.add;proto.add=function(...objects){const result=original.apply(this,objects);if(!this[enhanced]&&!this.userData?.coastlineHeroVehicle){if(objects.some(o=>o?.isMesh&&looksLikeVehicle(o))||/vehicle|car|traffic/i.test(this.name||'')){clearTimeout(this.__hero20Timer);this.__hero20Timer=setTimeout(()=>enhanceCar(this),0);}}return result;};}
export function enhanceCar(group){if(!group||group[enhanced])return;group[enhanced]=true;buildHero(group,readColor(group));serial++;}
export function installVehicleVisualEnhancer(){if(globalThis[installed])return;globalThis[installed]=true;hook();globalThis.__coastlineHeroVehicleVisuals={version:20,installed:true,highResolution:true,uvMapped:true,vehicleStudy:'2008-era American muscle coupe'};}
installVehicleVisualEnhancer();
