// Coastline cinematic world dressing v5 — SMOOTH EDGE / HIGH FIDELITY.
// Replaces visibly faceted procedural props with genuinely smooth silhouettes.
// Keeps instancing and gameplay untouched.

// Install the render-resolution ceiling at module evaluation time, before the game creates its renderer.
if (typeof globalThis !== 'undefined') {
  const THREEGlobal = globalThis.THREE;
  if (THREEGlobal?.WebGLRenderer?.prototype && !THREEGlobal.WebGLRenderer.prototype.__coastlineMaxPixelRatio) {
    const proto = THREEGlobal.WebGLRenderer.prototype;
    const originalSetPixelRatio = proto.setPixelRatio;
    proto.setPixelRatio = function(pixelRatio) {
      const mobile = typeof window !== 'undefined' && window.innerWidth <= 760;
      const ceiling = mobile ? 1.5 : 2.0;
      return originalSetPixelRatio.call(this, Math.max(Number(pixelRatio) || 1, ceiling));
    };
    proto.__coastlineMaxPixelRatio = true;
  }
}

export function applyCinematicWorldUpgrade({ THREE, scene, worldModel, groundY, lowPowerDevice = false }) {
  if (!THREE || !scene || !worldModel || typeof groundY !== 'function') throw new Error('Coastline visual upgrade requires THREE, scene, worldModel and groundY');
  if (scene.userData.coastlineCinematicWorldUpgrade) return scene.userData.coastlineCinematicWorldUpgrade;

  // Renderer may have been constructed before this function on some browsers.
  if (THREE.WebGLRenderer?.prototype && !THREE.WebGLRenderer.prototype.__coastlineMaxPixelRatio) {
    const proto = THREE.WebGLRenderer.prototype;
    const originalSetPixelRatio = proto.setPixelRatio;
    proto.setPixelRatio = function(pixelRatio) {
      const mobile = typeof window !== 'undefined' && window.innerWidth <= 760;
      const ceiling = mobile ? 1.5 : 2.0;
      return originalSetPixelRatio.call(this, Math.max(Number(pixelRatio) || 1, ceiling));
    };
    proto.__coastlineMaxPixelRatio = true;
  }

  const half=Math.min(worldModel.halfSize||750,740), block=worldModel.roadSpacing||200;
  const seeded=(x,z,s=0)=>worldModel.hash(x,z,s+2701);
  const inRoad=(x,z,m=9)=>worldModel.isRoadCorridor(x,z,m);
  const nearBuildingPad=(x,z,r=39)=>{const bx=Math.round((x-block/2)/block)*block+block/2,bz=Math.round((z-block/2)/block)*block+block/2;return Math.abs(x-bx)<r&&Math.abs(z-bz)<r};
  const mat=(color,roughness=.9,metalness=0,extra={})=>new THREE.MeshStandardMaterial({color,roughness,metalness,...extra});
  const dummy=new THREE.Object3D();
  const addInstances=(geometry,material,items,castShadow=false)=>{
    if(!items.length)return null;
    const mesh=new THREE.InstancedMesh(geometry,material,items.length);
    mesh.name='Coastline SMOOTH-FIDELITY instanced dressing'; mesh.castShadow=castShadow; mesh.receiveShadow=true; mesh.frustumCulled=true;
    for(let i=0;i<items.length;i++){
      const p=items[i]; dummy.position.set(p.x,p.y,p.z); dummy.rotation.set(p.rx||0,p.yaw||0,p.rz||0); dummy.scale.set(p.sx||1,p.sy||1,p.sz||1); dummy.updateMatrix(); mesh.setMatrixAt(i,dummy.matrix);
      if(p.color!==undefined&&mesh.setColorAt)mesh.setColorAt(i,new THREE.Color(p.color));
    }
    mesh.instanceMatrix.needsUpdate=true; if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true; scene.add(mesh); return mesh;
  };

  // Grass uses curved multi-segment blades instead of flat/angular cards.
  const gv=[],gi=[];
  const blade=(a,w,h,l)=>{const dx=Math.cos(a),dz=Math.sin(a),px=-dz*w/2,pz=dx*w/2,b=gv.length/3;
    gv.push(px,0,pz,-px,0,-pz,dx*l*.32+px*.30,h*.46,dz*l*.32+pz*.30,dx*l+px*.08,h,dz*l+pz*.08,dx*l*.68-px*.16,h*.76,dz*l*.68-pz*.16);
    gi.push(b,b+1,b+2,b+1,b+3,b+2,b+2,b+3,b+4,b+3,b+5,b+4);
  };
  blade(.05,.16,.62,.11);blade(1.25,.14,.52,.10);blade(2.45,.15,.68,.13);blade(3.65,.13,.57,.09);blade(4.85,.16,.74,.12);blade(5.8,.12,.46,.08);
  const grassGeometry=new THREE.BufferGeometry();grassGeometry.setAttribute('position',new THREE.Float32BufferAttribute(gv,3));grassGeometry.setIndex(gi);grassGeometry.computeVertexNormals();
  const grassMaterial=mat(0xffffff,.96,0,{side:THREE.DoubleSide,vertexColors:true});
  const grassItems=[]; const gridStep=lowPowerDevice?24:15;
  for(let x=-half+7;x<=half-7;x+=gridStep)for(let z=-half+7;z<=half-7;z+=gridStep){
    if(seeded(x,z,3)>(lowPowerDevice?.15:.23))continue;
    const px=x+(seeded(x,z,7)-.5)*gridStep,pz=z+(seeded(x,z,11)-.5)*gridStep;
    if(inRoad(px,pz,14)||nearBuildingPad(px,pz,31))continue;
    const region=worldModel.regionAt(px,pz);if(region==='city'&&seeded(x,z,19)>.18)continue;
    const s=.48+seeded(x,z,23)*.88;grassItems.push({x:px,y:groundY(px,pz)+.035,z:pz,yaw:seeded(x,z,29)*Math.PI*2,sx:s,sy:s*(.78+seeded(x,z,31)*.95),sz:s,color:[0x3f6838,0x527844,0x688a4a,0x789653,0x8b9d59,0x365b34][Math.floor(seeded(x,z,37)*6)]});
  }
  addInstances(grassGeometry,grassMaterial,grassItems,false);

  // Higher radial tessellation makes weeds read as organic rather than cones.
  const weedGeo=new THREE.ConeGeometry(.055,1,14,3),weedMat=mat(0xffffff,.92,0,{vertexColors:true}),weedItems=[];
  for(let x=-half+9;x<=half-9;x+=25)for(let z=-half+9;z<=half-9;z+=25){
    const px=x+(seeded(x,z,141)-.5)*19,pz=z+(seeded(x,z,143)-.5)*19;if(inRoad(px,pz,16)||nearBuildingPad(px,pz,33)||seeded(x,z,145)>.11)continue;
    const s=.22+seeded(x,z,147)*.34;weedItems.push({x:px,y:groundY(px,pz)+s*.5,z:pz,yaw:seeded(x,z,149)*6.28,sx:s,sy:s*(.7+seeded(x,z,151)*1.2),sz:s,color:[0xb8b85e,0xcaa96a,0x8fae5b,0x9f6f59][Math.floor(seeded(x,z,153)*4)]});
  }
  addInstances(weedGeo,weedMat,weedItems,false);

  // 64-sided patches are effectively smooth at gameplay distance.
  const dirtGeometry=new THREE.CircleGeometry(1,64);dirtGeometry.rotateX(-Math.PI/2);const dirtItems=[];
  for(let x=-half+15;x<=half-15;x+=35)for(let z=-half+15;z<=half-15;z+=35){
    if(seeded(x,z,41)>.20)continue;const px=x+(seeded(x,z,43)-.5)*24,pz=z+(seeded(x,z,47)-.5)*24;if(inRoad(px,pz,13)||nearBuildingPad(px,pz,36))continue;
    dirtItems.push({x:px,y:groundY(px,pz)+.019,z:pz,yaw:seeded(x,z,53)*Math.PI,sx:1.25+seeded(x,z,59)*3.4,sy:1,sz:.65+seeded(x,z,61)*1.7,color:[0x66513a,0x765f43,0x897052,0x5a4936,0x9a8260][Math.floor(seeded(x,z,67)*5)]});
  }
  addInstances(dirtGeometry,mat(0xffffff,1,0,{side:THREE.DoubleSide,vertexColors:true}),dirtItems,false);

  // True smooth sphere-based foliage and rocks. Smooth shading gives continuous silhouettes instead of faceted icosahedra.
  const shrubGeometry=new THREE.SphereGeometry(1,20,14),rockGeometry=new THREE.SphereGeometry(1,18,12),shrubItems=[],rockItems=[];const attempts=lowPowerDevice?180:300;
  for(let i=0;i<attempts;i++){
    const x=(seeded(i,101,71)*2-1)*(half-18),z=(seeded(i,211,73)*2-1)*(half-18);if(inRoad(x,z,18)||nearBuildingPad(x,z,42))continue;
    const region=worldModel.regionAt(x,z);if(region==='city'&&seeded(i,307,79)<.80)continue;
    const size=.62+seeded(i,401,83)*1.65;shrubItems.push({x,y:groundY(x,z)+size*.47,z,yaw:seeded(i,503,89)*Math.PI,sx:size*(1.1+seeded(i,601,97)*.55),sy:size*.72,sz:size*(1+seeded(i,701,101)*.5),color:[0x294f31,0x355f35,0x46723d,0x5b7b45,0x6b8148][Math.floor(seeded(i,809,103)*5)]});
    if(i%3===0)rockItems.push({x:x+2.4,y:groundY(x+2.4,z)+.3,z:z-1.8,yaw:seeded(i,907,107),sx:.45+size*.45,sy:.28+size*.24,sz:.5+size*.38,color:[0x67665f,0x7b7970,0x8b887b][i%3]});
  }
  addInstances(shrubGeometry,mat(0xffffff,.98,0,{vertexColors:true}),shrubItems,false);addInstances(rockGeometry,mat(0xffffff,.88,0,{vertexColors:true}),rockItems,false);

  // Rounder street furniture silhouettes.
  const poleGeo=new THREE.CylinderGeometry(.075,.105,5.8,20),armGeo=new THREE.BoxGeometry(1.2,.09,.10),lampGeo=new THREE.SphereGeometry(.24,20,14);
  const lampMetal=mat(0x3e4748,.38,.76),lampGlass=new THREE.MeshStandardMaterial({color:0xffd9a0,emissive:0xffb95f,emissiveIntensity:2.3,roughness:.18,metalness:.04});
  const poleItems=[],armItems=[],lampItems=[];const stride=lowPowerDevice?112:82;let lampCount=0;
  for(let road=-600;road<=600;road+=block)for(let along=-620;along<=620;along+=stride)for(const axis of ['v','h']){
    if(Math.abs(along-Math.round(along/block)*block)<19)continue;const x=axis==='v'?road+9.7:along,z=axis==='v'?along:road+9.7;if(inRoad(x,z,0))continue;const y=groundY(x,z),yaw=axis==='v'?Math.PI/2:0;poleItems.push({x,y:y+2.9,z,yaw});armItems.push({x:x+.45,y:y+5.55,z,yaw});lampItems.push({x:x+.95,y:y+5.47,z,yaw});lampCount++;
  }
  addInstances(poleGeo,lampMetal,poleItems,false);addInstances(armGeo,lampMetal,armItems,false);addInstances(lampGeo,lampGlass,lampItems,false);

  const seatGeo=new THREE.BoxGeometry(1.75,.12,.52),legGeo=new THREE.CylinderGeometry(.055,.065,.48,12),backGeo=new THREE.BoxGeometry(1.75,.62,.10),wood=mat(0x8b6848,.86),metal=mat(0x343c40,.62,.58),seats=[],legs=[],backs=[];
  for(let x=-500;x<=500;x+=200)for(let z=-500;z<=500;z+=200)for(const side of[-1,1]){const px=x+side*13.4,pz=z+14;if(inRoad(px,pz,0))continue;const y=groundY(px,pz);seats.push({x:px,y:y+.58,z:pz});backs.push({x:px,y:y+.94,z:pz-.22});for(const dx of[-.7,.7])legs.push({x:px+dx,y:y+.28,z:pz})}
  addInstances(seatGeo,wood,seats,false);addInstances(legGeo,metal,legs,false);addInstances(backGeo,wood,backs,false);

  const result=Object.freeze({version:5,quality:'SMOOTH-FIDELITY',pixelRatioCeiling:lowPowerDevice?1.5:2,grassClumps:grassItems.length,weeds:weedItems.length,dirtPatches:dirtItems.length,shrubs:shrubItems.length,rocks:rockItems.length,streetLamps:lampCount,benches:seats.length,renderObjectsAdded:15});
  scene.userData.coastlineCinematicWorldUpgrade=result;if(typeof window!=='undefined')window.__coastlineCinematicWorldUpgrade=result;return result;
}
