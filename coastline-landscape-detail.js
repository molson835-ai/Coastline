import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
const Y=3.04,W=15,H=W/2,S=200,WH=750,IN=H+.35,OUT=11.75,CW=.32,SW=OUT-(H+.55);
const M=(c,r=.9,m=0)=>new THREE.MeshStandardMaterial({color:c,roughness:r,metalness:m});
const addInst=(root,geo,material,items,order=0)=>{const im=new THREE.InstancedMesh(geo,material,items.length);im.receiveShadow=true;im.renderOrder=order;const d=new THREE.Object3D();items.forEach((p,i)=>{d.position.set(p.x,p.y,p.z);d.rotation.set(p.rx||0,p.ry||0,p.rz||0);d.scale.set(p.sx||1,p.sy||1,p.sz||1);d.updateMatrix();im.setMatrixAt(i,d.matrix)});im.instanceMatrix.needsUpdate=true;root.add(im);return im};
const hash=n=>{const x=Math.sin(n*12.9898)*43758.5453;return x-Math.floor(x)};
export function applyLandscapeDetail({scene}={}){
 if(!scene||scene.getObjectByName('coastlineLandscapeDetail'))return null;
 const root=new THREE.Group();root.name='coastlineLandscapeDetail';scene.add(root);
 const curb=M(0x777b79,.88),side=M(0x9a9b96,.94),edge=M(0x6f7472,.92),seam=M(0x343a3b,1),drain=M(0x25292a,.72,.35),metal=M(0x4b5050,.6,.65),weed=M(0x56744a,.98),soil=M(0x554636,1);
 const sx=[],sz=[],cx=[],cz=[],ex=[],ez=[],ax=[],az=[];
 for(let p=-WH;p<=WH;p+=S)for(const q of[-1,1]){
  const o=(IN+OUT)/2*q;
  sx.push({x:p,y:Y+.17,z:o});cx.push({x:p+q*(H+.16),y:Y+.10,z:0});ex.push({x:p+q*(OUT+.02),y:Y+.245,z:0});
  sz.push({x:o,y:Y+.17,z:p});cz.push({x:0,y:Y+.10,z:p+q*(H+.16)});ez.push({x:0,y:Y+.245,z:p+q*(OUT+.02)});
  ax.push({x:p+q*(H+.08),y:Y+.087,z:0});az.push({x:0,y:Y+.087,z:p+q*(H+.08)});
 }
 addInst(root,new THREE.BoxGeometry(SW,.14,S-18),side,sx,4);addInst(root,new THREE.BoxGeometry(S-18,.14,SW),side,sz,4);
 addInst(root,new THREE.BoxGeometry(CW,.18,S-18),curb,cx,5);addInst(root,new THREE.BoxGeometry(S-18,.18,CW),curb,cz,5);
 addInst(root,new THREE.BoxGeometry(.06,.035,S-18),edge,ex,5);addInst(root,new THREE.BoxGeometry(S-18,.035,.06),edge,ez,5);
 addInst(root,new THREE.BoxGeometry(.045,.012,S-18),seam,ax,6);addInst(root,new THREE.BoxGeometry(S-18,.012,.045),seam,az,6);
 // Storm drains: compact curb-flush grates, instanced so detail stays cheap.
 const gb=[],gx=[],gz=[];
 for(let p=-WH+50;p<=WH-50;p+=S)for(const q of[-1,1]){gb.push({x:p,y:Y+.205,z:q*(H+.12)});gx.push({x:p,y:Y+.229,z:q*(H+.12)});gz.push({x:q*(H+.12),y:Y+.229,z:p});gb.push({x:q*(H+.12),y:Y+.205,z:p})}
 addInst(root,new THREE.BoxGeometry(.72,.035,.34),drain,gb,12);
 for(const p of gx)addInst(root,new THREE.BoxGeometry(.055,.043,.30),metal,[p],13);
 // The bars are batched separately below using one shared instance set.
 const barX=gx.slice(),barZ=gz.slice();
 const barsX=[];barX.forEach(p=>{for(let i=-2;i<=2;i++)barsX.push({x:p.x+i*.125,y:p.y,z:p.z})});
 const barsZ=[];barZ.forEach(p=>{for(let i=-2;i<=2;i++)barsZ.push({x:p.x,y:p.y,z:p.z+i*.125,ry:Math.PI/2})});
 // Remove the one-bar-per-grate temporary batch and use the full batched bars.
 root.remove(root.children[root.children.length-1]);
 addInst(root,new THREE.BoxGeometry(.055,.043,.30),metal,barsX,13);addInst(root,new THREE.BoxGeometry(.055,.043,.30),metal,barsZ,13);
 // Manholes and rings in the sidewalk/curb margin.
 const mh=[],mr=[];for(let p=-WH+80;p<=WH-80;p+=S*2)for(const q of[-1,1]){mh.push({x:p,y:Y+.205,z:q*(H+1.25)});mr.push({x:p,y:Y+.23,z:q*(H+1.25),rx:Math.PI/2})}
 addInst(root,new THREE.CylinderGeometry(.46,.46,.045,16),metal,mh,11);addInst(root,new THREE.TorusGeometry(.46,.035,6,16),drain,mr,12);
 // Micro vegetation and soil patches: intentionally sparse and off the paved hierarchy.
 const wi=[],pi=[];for(let p=-WH;p<=WH;p+=40)for(let j=0;j<7;j++){const q=j%2?-1:1,a=p+(hash(p*3+j)*30-15),lat=OUT+1.4+hash(p+j*11)*5.5;wi.push({x:j%3===0?a:q*lat,y:Y+.16+hash(j+7)*.05,z:j%3===0?q*lat:a,sx:.65+hash(j+17)*.9,sy:.7+hash(j+31)*1.1,sz:.65+hash(j+17)*.9,ry:hash(j+7)*Math.PI})}
 addInst(root,new THREE.ConeGeometry(.055,.34,4),weed,wi,0);
 for(let i=0,p=-WH+25;p<=WH-25&&i<120;p+=55,i++){const q=i%2?1:-1,lat=OUT+2.4+hash(i+91)*7;pi.push({x:i%3===0?p:q*lat,y:Y+.125,z:i%3===0?q*lat:p,rx:-Math.PI/2,sx:.35+hash(i+19)*.8,sy:.35+hash(i+19)*.8,sz:.35+hash(i+19)*.8,rz:hash(i+33)*Math.PI})}
 addInst(root,new THREE.CircleGeometry(.8,7),soil,pi,0);
 root.userData={version:'LandscapeDetailV2',scale:{roadWidth:W,curbWidth:CW,sidewalkWidth:SW,roadSpacing:S},detailCounts:{stormDrains:gb.length,vegetation:wi.length,soilPatches:pi.length}};
 return root;
}
