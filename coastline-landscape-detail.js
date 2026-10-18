import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
const Y=3.04,S=200,WH=750,SIDEWALK=2.7;
const roadWidthAt=v=>Math.abs(v)>=400?6.5:Math.abs(v)>=200?9:12;
const M=(c,r=.9,m=0)=>new THREE.MeshStandardMaterial({color:c,roughness:r,metalness:m});
const addInst=(root,geo,material,items,order=0)=>{const im=new THREE.InstancedMesh(geo,material,items.length);im.receiveShadow=true;im.renderOrder=order;const d=new THREE.Object3D();items.forEach((p,i)=>{d.position.set(p.x,p.y,p.z);d.rotation.set(p.rx||0,p.ry||0,p.rz||0);d.scale.set(p.sx||1,p.sy||1,p.sz||1);d.updateMatrix();im.setMatrixAt(i,d.matrix)});im.instanceMatrix.needsUpdate=true;root.add(im);return im};
const hash=n=>{const x=Math.sin(n*12.9898)*43758.5453;return x-Math.floor(x)};
export function applyLandscapeDetail({scene}={}){
 if(!scene||scene.getObjectByName('coastlineLandscapeDetail'))return null;
 const root=new THREE.Group();root.name='coastlineLandscapeDetail';scene.add(root);
 const curb=M(0x777b79,.88),side=M(0x9a9b96,.94),edge=M(0x6f7472,.92),seam=M(0x343a3b,1),drain=M(0x25292a,.72,.35),metal=M(0x4b5050,.6,.65),weed=M(0x56744a,.98),soil=M(0x554636,1);
 const sx=[],sz=[],cx=[],cz=[],ex=[],ez=[],ax=[],az=[];
 for(let p=-600;p<=600;p+=S){const rw=roadWidthAt(p),h=rw/2,inner=h+.35,outer=inner+SIDEWALK,center=(inner+outer)/2;
  for(const q of[-1,1]){sx.push({x:p,y:Y+.17,z:q*center});cx.push({x:p+q*(h+.16),y:Y+.10,z:0});ex.push({x:p+q*(outer+.02),y:Y+.245,z:0});sz.push({x:q*center,y:Y+.17,z:p});cz.push({x:0,y:Y+.10,z:p+q*(h+.16)});ez.push({x:0,y:Y+.245,z:p+q*(outer+.02)});ax.push({x:p+q*(h+.08),y:Y+.087,z:0});az.push({x:0,y:Y+.087,z:p+q*(h+.08)})}}
 addInst(root,new THREE.BoxGeometry(SIDEWALK,.14,S-18),side,sx,4);addInst(root,new THREE.BoxGeometry(S-18,.14,SIDEWALK),side,sz,4);
 addInst(root,new THREE.BoxGeometry(.32,.18,S-18),curb,cx,5);addInst(root,new THREE.BoxGeometry(S-18,.18,.32),curb,cz,5);
 addInst(root,new THREE.BoxGeometry(.06,.035,S-18),edge,ex,5);addInst(root,new THREE.BoxGeometry(S-18,.035,.06),edge,ez,5);
 addInst(root,new THREE.BoxGeometry(.045,.012,S-18),seam,ax,6);addInst(root,new THREE.BoxGeometry(S-18,.012,.045),seam,az,6);
 // Storm drains are placed immediately beside each road's actual curb line.
 const gb=[],bars=[];for(let p=-600+50;p<=600-50;p+=S){const rw=roadWidthAt(p),h=rw/2;for(const q of[-1,1]){gb.push({x:p,y:Y+.205,z:q*(h+.12)});gb.push({x:q*(h+.12),y:Y+.205,z:p});for(let i=-2;i<=2;i++){bars.push({x:p+i*.125,y:Y+.229,z:q*(h+.12)});bars.push({x:q*(h+.12),y:Y+.229,z:p+i*.125,ry:Math.PI/2})}}}
 addInst(root,new THREE.BoxGeometry(.72,.035,.34),drain,gb,12);addInst(root,new THREE.BoxGeometry(.055,.043,.30),metal,bars,13);
 const mh=[],mr=[];for(let p=-600+80;p<=600-80;p+=S*2){const rw=roadWidthAt(p),h=rw/2;for(const q of[-1,1]){mh.push({x:p,y:Y+.205,z:q*(h+1.25)});mr.push({x:p,y:Y+.23,z:q*(h+1.25),rx:Math.PI/2})}}
 addInst(root,new THREE.CylinderGeometry(.46,.46,.045,16),metal,mh,11);addInst(root,new THREE.TorusGeometry(.46,.035,6,16),drain,mr,12);
 // Fine grass/soil detail stays outside the sidewalk hierarchy. It is sparse and instanced.
 const wi=[],pi=[];for(let p=-WH;p<=WH;p+=40)for(let j=0;j<7;j++){const q=j%2?-1:1,a=p+(hash(p*3+j)*30-15),lat=12.8+hash(p+j*11)*5.5;wi.push({x:j%3===0?a:q*lat,y:Y+.16+hash(j+7)*.05,z:j%3===0?q*lat:a,sx:.65+hash(j+17)*.9,sy:.7+hash(j+31)*1.1,sz:.65+hash(j+17)*.9,ry:hash(j+7)*Math.PI})}
 addInst(root,new THREE.ConeGeometry(.055,.34,4),weed,wi,0);
 for(let i=0,p=-WH+25;p<=WH-25&&i<120;p+=55,i++){const q=i%2?1:-1,lat=15.1+hash(i+91)*7;pi.push({x:i%3===0?p:q*lat,y:Y+.125,z:i%3===0?q*lat:p,rx:-Math.PI/2,sx:.35+hash(i+19)*.8,sy:.35+hash(i+19)*.8,sz:.35+hash(i+19)*.8,rz:hash(i+33)*Math.PI})}
 addInst(root,new THREE.CircleGeometry(.8,7),soil,pi,0);
 root.userData={version:'LandscapeDetailV3',scale:{roadWidths:{outer:6.5,mid:9,inner:12},curbWidth:.32,sidewalkWidth:SIDEWALK,roadSpacing:S},detailCounts:{stormDrains:gb.length,vegetation:wi.length,soilPatches:pi.length}};
 return root;
}
