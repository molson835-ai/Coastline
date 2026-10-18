/* Coastline Landscape Detail Pass
 * Scale-first world dressing: road edge, curb, sidewalk, vegetation microdetail,
 * storm drains, manholes and small roadside cues. Geometry is intentionally shared
 * and instanced so the pass adds visual density without a large draw-call tax.
 */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';

const ROAD_Y = 3.04;
const ROAD_W = 15;
const HALF = ROAD_W / 2;
const ROAD_SPACING = 200;
const WORLD_HALF = 750;
const SIDEWALK_INNER = HALF + 0.35;
const SIDEWALK_OUTER = 11.75;
const CURB_W = 0.32;
const SIDEWALK_W = SIDEWALK_OUTER - (HALF + 0.55);

const mat = (color, roughness=0.9, metalness=0) => new THREE.MeshStandardMaterial({color,roughness,metalness});

function addBox(parent, geo, material, x,y,z, rx=0, ry=0, rz=0, order=0){
  const m=new THREE.Mesh(geo,material);m.position.set(x,y,z);m.rotation.set(rx,ry,rz);m.receiveShadow=true;m.renderOrder=order;parent.add(m);return m;
}

export function applyLandscapeDetail({scene}={}){
  if(!scene || scene.getObjectByName('coastlineLandscapeDetail')) return null;
  const root=new THREE.Group();root.name='coastlineLandscapeDetail';scene.add(root);

  // --- Correct scale hierarchy ---
  // Road: 15m two-way carriageway. Curb: ~0.32m wide / 0.16m high.
  // Sidewalk: ~2.7m clear width with a subtle 0.14m rise above road.
  // These proportions keep a person/car visually grounded instead of making
  // sidewalks and curbs look like oversized slabs from the gameplay camera.
  const curbMat=mat(0x777b79,.88);
  const sidewalkMat=mat(0x9a9b96,.94);
  const sidewalkEdgeMat=mat(0x6f7472,.92);
  const asphaltDustMat=mat(0x343a3b,1);
  const drainMat=mat(0x25292a,.72,.35);
  const metalMat=mat(0x4b5050,.6,.65);
  const soilMat=mat(0x5b4937,1);
  const grassMat=mat(0x3f6240,1);
  const weedMat=mat(0x56744a,.98);

  const sidewalkGeoX=new THREE.BoxGeometry(SIDEWALK_W,.14,ROAD_SPACING-18);
  const sidewalkGeoZ=new THREE.BoxGeometry(ROAD_SPACING-18,.14,SIDEWALK_W);
  const curbGeoX=new THREE.BoxGeometry(CURB_W,.18,ROAD_SPACING-18);
  const curbGeoZ=new THREE.BoxGeometry(ROAD_SPACING-18,.18,CURB_W);
  const edgeGeoX=new THREE.BoxGeometry(.06,.035,ROAD_SPACING-18);
  const edgeGeoZ=new THREE.BoxGeometry(ROAD_SPACING-18,.035,.06);

  // Dress road corridors in 200m blocks. Intersections stay open so the road,
  // crossings and vehicle paths remain readable.
  for(let p=-WORLD_HALF;p<=WORLD_HALF;p+=ROAD_SPACING){
    for(const side of [-1,1]){
      const offset=(SIDEWALK_INNER+SIDEWALK_OUTER)/2*side;
      addBox(root,sidewalkGeoX,sidewalkMat,p+0,ROAD_Y+.17,offset,0,0,0,4);
      addBox(root,curbGeoX,curbMat,p+side*(HALF+.16),ROAD_Y+.10,0,0,0,0,5);
      addBox(root,edgeGeoX,sidewalkEdgeMat,p+side*(SIDEWALK_OUTER+.02),ROAD_Y+.245,0,0,0,0,5);
      addBox(root,sidewalkGeoZ,sidewalkMat,offset,ROAD_Y+.17,p,0,0,0,4);
      addBox(root,curbGeoZ,curbMat,0,ROAD_Y+.10,p+side*(HALF+.16),0,0,0,0,5);
      addBox(root,edgeGeoZ,sidewalkEdgeMat,0,ROAD_Y+.245,p+side*(SIDEWALK_OUTER+.02),0,0,0,0,5);
    }
  }

  // Subtle asphalt shoulder seams keep the road/curb relationship legible at distance.
  const seamGeoX=new THREE.BoxGeometry(.045,.012,ROAD_SPACING-18);
  const seamGeoZ=new THREE.BoxGeometry(ROAD_SPACING-18,.012,.045);
  for(let p=-WORLD_HALF;p<=WORLD_HALF;p+=ROAD_SPACING){
    for(const side of [-1,1]){
      addBox(root,seamGeoX,asphaltDustMat,p+side*(HALF+.08),ROAD_Y+.087,0,0,0,0,6);
      addBox(root,seamGeoZ,asphaltDustMat,0,ROAD_Y+.087,p+side*(HALF+.08),0,0,0,0,6);
    }
  }

  // --- Storm drains / sewer grates ---
  // One compact grate per block face, deliberately flush with the curb rather than
  // floating in the carriageway. Crossbars provide a visible fine-detail silhouette.
  const grateGroup=new THREE.Group();grateGroup.name='storm-drains';root.add(grateGroup);
  const grateBaseGeo=new THREE.BoxGeometry(.72,.035,.34);
  const grateBarGeo=new THREE.BoxGeometry(.055,.043,.30);
  const grateBarGeoZ=new THREE.BoxGeometry(.30,.043,.055);
  const grateCount=[];
  for(let p=-WORLD_HALF+50;p<=WORLD_HALF-50;p+=ROAD_SPACING){
    for(const side of [-1,1]){
      const x=p;
      const z=side*(HALF+.12);
      const base=addBox(grateGroup,grateBaseGeo,drainMat,x,ROAD_Y+.205,z,0,0,0,12);
      for(let i=-.25;i<=.25;i+=.125)addBox(grateGroup,grateBarGeo,metalMat,x+i,ROAD_Y+.229,z,0,0,0,13);
      grateCount.push(base);
      const x2=side*(HALF+.12),z2=p;
      addBox(grateGroup,grateBaseGeo,drainMat,x2,ROAD_Y+.205,z2,0,Math.PI/2,0,12);
      for(let i=-.25;i<=.25;i+=.125)addBox(grateGroup,grateBarGeo,metalMat,x2,ROAD_Y+.229,z2+i,0,Math.PI/2,0,13);
    }
  }

  // Manholes sit in the sidewalk/road margin, not directly in the travel lane.
  const manholeGeo=new THREE.CylinderGeometry(.46,.46,.045,16);
  const manholeRingGeo=new THREE.TorusGeometry(.46,.035,6,16);
  for(let p=-WORLD_HALF+80;p<=WORLD_HALF-80;p+=ROAD_SPACING*2){
    for(const side of [-1,1]){
      const mh=addBox(root,new THREE.CylinderGeometry(.46,.46,.045,16),metalMat,p,ROAD_Y+.205,side*(HALF+1.25),0,0,0,11);
      mh.geometry=manholeGeo;
      const ring=new THREE.Mesh(manholeRingGeo,drainMat);ring.rotation.x=Math.PI/2;ring.position.set(p,ROAD_Y+.23,side*(HALF+1.25));ring.renderOrder=12;root.add(ring);
    }
  }

  // --- Micro vegetation ---
  // Instanced clumps give the grass verge a natural broken edge without hundreds of
  // independent meshes. Keep them outside the sidewalk and off the carriageway.
  const weedGeo=new THREE.ConeGeometry(.055,.34,4);
  const weedInst=new THREE.InstancedMesh(weedGeo,weedMat,420);
  weedInst.name='micro-vegetation';weedInst.castShadow=false;weedInst.receiveShadow=true;weedInst.frustumCulled=true;
  const dummy=new THREE.Object3D();let wi=0;
  const hash=(n)=>{const x=Math.sin(n*12.9898)*43758.5453;return x-Math.floor(x)};
  for(let p=-WORLD_HALF;p<=WORLD_HALF && wi<420;p+=40){
    for(let j=0;j<7 && wi<420;j++){
      const roadSide=j%2?-1:1;
      const along=p+(hash(p*3+j)*30-15);
      const lateral=SIDEWALK_OUTER+1.4+hash(p+j*11)*5.5;
      const x=(j%3===0)?along:roadSide*lateral;
      const z=(j%3===0)?roadSide*lateral:along;
      dummy.position.set(x,ROAD_Y+.16+hash(wi*2)*.05,z);
      const s=.65+hash(wi+17)*.9;dummy.scale.set(s,.7+hash(wi+31)*1.1,s);
      dummy.rotation.y=hash(wi+7)*Math.PI;dummy.updateMatrix();weedInst.setMatrixAt(wi++,dummy.matrix);
    }
  }
  weedInst.count=wi;weedInst.instanceMatrix.needsUpdate=true;root.add(weedInst);

  // Small soil patches break up perfectly uniform grass edges near sidewalks.
  const patchGeo=new THREE.CircleGeometry(.8,7);const patchMat=mat(0x554636,1);
  const patches=new THREE.InstancedMesh(patchGeo,patchMat,120);const pm=new THREE.Object3D();let pi=0;
  for(let p=-WORLD_HALF+25;p<=WORLD_HALF-25&&pi<120;p+=55){
    const side=(pi%2)?1:-1;const lateral=SIDEWALK_OUTER+2.4+hash(pi+91)*7;
    pm.position.set((pi%3===0)?p:side*lateral,ROAD_Y+.125,(pi%3===0)?side*lateral:p);
    const s=.35+hash(pi+19)*.8;pm.scale.set(s,s,s);pm.rotation.x=-Math.PI/2;pm.rotation.z=hash(pi+33)*Math.PI;pm.updateMatrix();patches.setMatrixAt(pi++,pm.matrix);
  }
  patches.count=pi;patches.instanceMatrix.needsUpdate=true;root.add(patches);

  // Tiny curb access plates add believable repetition without becoming clutter.
  const plateGeo=new THREE.BoxGeometry(.32,.028,.22);
  for(let p=-WORLD_HALF+25;p<=WORLD_HALF-25;p+=100){
    addBox(root,plateGeo,metalMat,p,ROAD_Y+.255,HALF+.52,0,0,0,12);
    addBox(root,plateGeo,metalMat,-HALF-.52,ROAD_Y+.255,p,0,Math.PI/2,0,12);
  }

  root.userData={version:'LandscapeDetailV1',scale:{roadWidth:ROAD_W,curbWidth:CURB_W,sidewalkWidth:SIDEWALK_W,roadSpacing:ROAD_SPACING},detailCounts:{stormDrains:grateCount.length,vegetation:wi,soilPatches:pi}};
  return root;
}
