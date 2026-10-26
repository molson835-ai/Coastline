/**
 * Coastline's canonical four-island design manifest.
 *
 * World content density is intentionally separate from the shared actor/render
 * pipeline: developed worlds receive their authored scenery; future worlds
 * receive terrain/basic coverage only until their content is designed.
 */
export const COASTLINE_ISLAND_REGIONS = Object.freeze([
  Object.freeze({ id: 'downtown', title: 'Downtown Island', theme: 'urban-core', purpose: 'Skyline, dense avenues, plazas and glass towers', center: Object.freeze({ x: 500, z: 500 }), bounds: Object.freeze({ halfWidth: 110, halfDepth: 110, cornerRadius: 20 }), bridge: Object.freeze({ entry: 'north', exit: 'north', target: 'residential' }), population: Object.freeze({ traffic: 12, pedestrians: 16 }), visual: Object.freeze({ landmark: 'skyline', vegetation: 'street-palms', waterline: true }), contentDensity: 'sparse' }),
  Object.freeze({ id: 'residential', title: 'Residential Island', theme: 'coastal-neighborhood', purpose: 'Homes, parks, winding roads and quiet neighborhood streets', center: Object.freeze({ x: 0, z: 0 }), bounds: Object.freeze({ halfWidth: 110, halfDepth: 110, cornerRadius: 20 }), bridge: Object.freeze({ entry: 'north', exit: 'east', target: 'waterfront' }), population: Object.freeze({ traffic: 8, pedestrians: 12 }), visual: Object.freeze({ landmark: 'neighborhood-park', vegetation: 'tropical-gardens', waterline: true }), contentDensity: 'developed' }),
  Object.freeze({ id: 'waterfront', title: 'Waterfront Island', theme: 'resort-marina', purpose: 'Beach, boardwalk, resorts, marina and entertainment streets', center: Object.freeze({ x: 0, z: 0 }), bounds: Object.freeze({ halfWidth: 110, halfDepth: 110, cornerRadius: 20 }), bridge: Object.freeze({ entry: 'west', exit: 'east', target: 'port' }), population: Object.freeze({ traffic: 10, pedestrians: 16 }), visual: Object.freeze({ landmark: 'marina', vegetation: 'beach-palms', waterline: true }), contentDensity: 'sparse' }),
  Object.freeze({ id: 'port', title: 'Port Island', theme: 'working-harbor', purpose: 'Working harbor, warehouses, freight roads and expansion space', center: Object.freeze({ x: 0, z: 0 }), bounds: Object.freeze({ halfWidth: 110, halfDepth: 110, cornerRadius: 20 }), bridge: Object.freeze({ entry: 'west', exit: 'west', target: 'waterfront' }), population: Object.freeze({ traffic: 8, pedestrians: 10 }), visual: Object.freeze({ landmark: 'container-cranes', vegetation: 'sparse-coastal', waterline: true }), contentDensity: 'sparse' }),
]);

export const COASTLINE_ISLAND_ELEVATION = 6;
export const COASTLINE_ISLAND_WATER_DROP = 3.0;
export const COASTLINE_WORLD_POPULATION_LIMITS = Object.freeze({ city: Object.freeze({ traffic: 12, pedestrians: 16 }), downtown: COASTLINE_ISLAND_REGIONS[0].population, residential: COASTLINE_ISLAND_REGIONS[1].population, waterfront: COASTLINE_ISLAND_REGIONS[2].population, port: COASTLINE_ISLAND_REGIONS[3].population });
export function getCoastlineIslandRegion(id) { return COASTLINE_ISLAND_REGIONS.find(region => region.id === id) ?? null; }

const RESIDENTIAL_SHORELINE = Object.freeze([[-0.72,-1],[0.18,-1],[0.56,-0.94],[0.82,-0.82],[0.72,-0.48],[0.82,-0.22],[0.94,-0.08],[1,0],[1,0.08],[0.78,0.34],[0.86,0.55],[0.62,0.66],[0.18,0.96],[0,1],[-0.18,0.92],[-0.48,0.82],[-0.63,0.62],[-0.82,0.43],[-0.92,0.18],[-0.92,-0.15],[-0.86,-0.38],[-0.82,-0.70]]);

export function isCoastlineIslandPointInside(x, z, regionId = 'residential') {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return false;
  const region = getCoastlineIslandRegion(regionId); if (!region) return false;
  const nx = (x - 500) / region.bounds.halfWidth, nz = (z - 500) / region.bounds.halfDepth;
  if (regionId !== 'residential') {
    const corner = Math.min(0.22, (region.bounds.cornerRadius || 20) / region.bounds.halfWidth);
    if (Math.abs(nx) > 1 || Math.abs(nz) > 1) return false;
    const dx = Math.max(0, Math.abs(nx) - (1 - corner)), dz = Math.max(0, Math.abs(nz) - (1 - corner));
    return dx * dx + dz * dz <= corner * corner;
  }
  const points = RESIDENTIAL_SHORELINE, epsilon = 1e-6;
  for (let i=0;i<points.length;i++) { const [ax,az]=points[i], [bx,bz]=points[(i+1)%points.length], cross=(nx-ax)*(bz-az)-(nz-az)*(bx-ax), dot=(nx-ax)*(bx-ax)+(nz-az)*(bz-az), lengthSquared=(bx-ax)**2+(bz-az)**2; if(Math.abs(cross)<epsilon&&dot>=-epsilon&&dot<=lengthSquared+epsilon)return true; }
  let inside=false;
  for(let i=0,j=points.length-1;i<points.length;j=i++){const [xi,zi]=points[i],[xj,zj]=points[j];if((zi>nz)!==(zj>nz)&&nx<((xj-xi)*(nz-zi))/(zj-zi)+xi)inside=!inside;}
  return inside;
}

function createIslandShape(THREE, region, scale=1) {
  const half=region.bounds.halfWidth, shape=new THREE.Shape();
  if(region.id==='residential'){
    shape.moveTo(-half*.72*scale,-half*scale); shape.lineTo(half*.18*scale,-half*scale); shape.quadraticCurveTo(half*.7*scale,-half*scale,half*.82*scale,-half*.82*scale); shape.lineTo(half*.72*scale,-half*.48*scale); shape.quadraticCurveTo(half*.66*scale,-half*.2*scale,half*.92*scale,-half*.08*scale); shape.quadraticCurveTo(half*scale,0,half*scale,half*.08*scale); shape.quadraticCurveTo(half*.98*scale,half*.26*scale,half*.78*scale,half*.34*scale); shape.quadraticCurveTo(half*.86*scale,half*.55*scale,half*.62*scale,half*.66*scale); shape.quadraticCurveTo(half*.36*scale,half*.82*scale,half*.18*scale,half*.96*scale); shape.quadraticCurveTo(0,half*1.02*scale,-half*.18*scale,half*.92*scale); shape.quadraticCurveTo(-half*.48*scale,half*.82*scale,-half*.63*scale,half*.62*scale); shape.quadraticCurveTo(-half*.83*scale,half*.43*scale,-half*.92*scale,half*.18*scale); shape.quadraticCurveTo(-half*1.01*scale,-half*.12*scale,-half*.86*scale,-half*.38*scale); shape.quadraticCurveTo(-half*.82*scale,-half*.7*scale,-half*.72*scale,-half*scale); shape.closePath(); return shape;
  }
  const corner=(region.bounds.cornerRadius||20)*scale, edge=half*scale, inner=edge-corner;
  shape.moveTo(-inner,-edge);shape.lineTo(inner,-edge);shape.quadraticCurveTo(edge,-edge,edge,-inner);shape.lineTo(edge,inner);shape.quadraticCurveTo(edge,edge,inner,edge);shape.lineTo(-inner,edge);shape.quadraticCurveTo(-edge,edge,-edge,inner);shape.lineTo(-edge,-inner);shape.quadraticCurveTo(-edge,-edge,-inner,-edge); return shape;
}

export function createCoastlineIslandRoot({ THREE, region, groundY=()=>0, addBridge, addSideBridge }) {
  if(!THREE||!region)throw new Error('THREE and an island region are required');
  const center={x:500,z:500}, half=region.bounds.halfWidth, edgeY=Number.isFinite(groundY(center.x,center.z))?groundY(center.x,center.z):0;
  const root=new THREE.Group(); root.name=`coastline-island-${region.id}-root`;
  const colliders=[]; root.userData.coastlineColliders=colliders; root.userData.coastlineContentDensity=region.contentDensity;
  const material=(color,roughness=.9,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
  const landMat=material(region.theme==='working-harbor'?0x777b70:0x55785b,.96), sandMat=material(0xc2b28b,.9), roadMat=material(0x343c3d,.9), concreteMat=material(0x777c7a,.88), oceanMat=material(0x176b80,.34,.08);
  const ocean=new THREE.Mesh(new THREE.PlaneGeometry(740,740),oceanMat); ocean.name=`coastline-${region.id}-surrounding-ocean`; ocean.rotation.x=-Math.PI/2; ocean.position.set(center.x,edgeY-COASTLINE_ISLAND_WATER_DROP,center.z); ocean.receiveShadow=false; root.add(ocean);
  const shoreShape=createIslandShape(THREE,region,1.04), shore=new THREE.Mesh(new THREE.ShapeGeometry(shoreShape,6),sandMat); shore.name=`coastline-${region.id}-shoreline`; shore.rotation.x=-Math.PI/2; shore.position.set(center.x,edgeY-.28,center.z); shore.receiveShadow=true; root.add(shore);
  const upperBeachPoints=shoreShape.getPoints(8), lowerBeachScale=1.12/1.04, beachVertices=[], beachIndices=[];
  for(let i=0;i<upperBeachPoints.length-1;i++){const a=upperBeachPoints[i],b=upperBeachPoints[i+1],base=beachVertices.length/3;beachVertices.push(center.x+a.x,edgeY-.28,center.z+a.y,center.x+b.x,edgeY-.28,center.z+b.y,center.x+a.x*lowerBeachScale,edgeY-COASTLINE_ISLAND_WATER_DROP+.05,center.z+a.y*lowerBeachScale,center.x+b.x*lowerBeachScale,edgeY-COASTLINE_ISLAND_WATER_DROP+.05,center.z+b.y*lowerBeachScale);beachIndices.push(base,base+1,base+2,base+1,base+3,base+2);}
  const beachGeometry=new THREE.BufferGeometry(); beachGeometry.setAttribute('position',new THREE.Float32BufferAttribute(beachVertices,3)); beachGeometry.setIndex(beachIndices); beachGeometry.computeVertexNormals(); const slopedBeach=new THREE.Mesh(beachGeometry,new THREE.MeshStandardMaterial({color:0xc2b28b,roughness:.94,side:THREE.DoubleSide})); slopedBeach.name=`coastline-${region.id}-sloped-sand-to-water`; slopedBeach.receiveShadow=true; root.add(slopedBeach);
  const landShape=createIslandShape(THREE,region,.94), land=new THREE.Mesh(new THREE.ShapeGeometry(landShape,6),landMat); land.name=`coastline-${region.id}-land`; land.rotation.x=-Math.PI/2; land.position.set(center.x,edgeY-.02,center.z); land.receiveShadow=true; root.add(land);
  const addBox=(name,x,y,z,width,height,depth,mat,castShadow=true,collidable=true)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(width,height,depth),mat);mesh.name=name;mesh.position.set(x,y,z);mesh.castShadow=castShadow;mesh.receiveShadow=true;root.add(mesh);if(collidable)colliders.push({name,x,z,w:width,d:depth});return mesh;};
  addBox(`coastline-${region.id}-main-road`,center.x,edgeY+.02,center.z-82.5,16,.16,55,roadMat,false,false);

  // Developed worlds own authored scenery. Sparse/future worlds stop after terrain,
  // basic road coverage, and the shared actor pipeline supplied by the host runtime.
  if(region.contentDensity==='developed'){
    if(region.theme==='coastal-neighborhood'){
      const plaster=material(0xff9b32,.72,.05), warmStone=material(0xf2d5a3,.82), roof=material(0x303238,.8,.12), glass=material(0x315e69,.24,.18), timber=material(0x5b2f1e,.9), garageShadow=material(0x111c20,.98), poolWater=new THREE.MeshStandardMaterial({color:0x3195a6,roughness:.24,metalness:.12,transparent:true,opacity:.72}), deck=material(0xe4c68e,.88), lawn=material(0x477a4b,.98);
      addBox('coastline-villa-main-volume',center.x+5,edgeY+4.5,center.z,26,9,24,plaster,true,false); addBox('coastline-villa-upper-volume',center.x+6,edgeY+10,center.z,20,3.2,18,warmStone,true,false); addBox('coastline-villa-flat-roof',center.x+5,edgeY+11.8,center.z,29,.65,27,roof,true,false); addBox('coastline-villa-roof-overhang',center.x+5,edgeY+6.1,center.z-.4,28,.38,25,roof,true,false);
      for(const [i,x] of [center.x-4,center.x+2,center.x+8,center.x+13].entries())addBox(`coastline-villa-front-glass-${i+1}`,x,edgeY+5.1,center.z-12.15,4.2,3.1,.12,glass,false,false);
      addBox('coastline-villa-entry-door',center.x+4.2,edgeY+2.1,center.z-12.28,2.1,4.1,.16,timber,false,false); addBox('coastline-villa-entry-porch',center.x+4,edgeY+.2,center.z-15,11,.3,6,deck,false,false);
      addBox('coastline-villa-garage-left-wall',center.x-23.1,edgeY+2.7,center.z-2,.8,5.4,20,plaster,true,false); addBox('coastline-villa-garage-right-wall',center.x-10.9,edgeY+2.7,center.z-2,.8,5.4,20,plaster,true,false); addBox('coastline-villa-garage-roof',center.x-17,edgeY+5.5,center.z-2,13.4,.55,20.5,roof,true,false); addBox('coastline-villa-garage-shadow',center.x-17,edgeY+2.4,center.z+7.7,11.8,4.6,.12,garageShadow,false,false); addBox('coastline-villa-garage-beam',center.x-17,edgeY+5.05,center.z-12.2,13.4,.55,.7,warmStone,true,false); addBox('coastline-villa-driveway',center.x-17,edgeY+.08,center.z-42,7.8,.16,56,concreteMat,false,false); addBox('coastline-villa-driveway-apron',center.x-17,edgeY+.1,center.z-14,10,.18,7,deck,false,false);
      addBox('coastline-villa-garden-lawn',center.x+39,edgeY+.03,center.z+3,30,.08,42,lawn,false,false); addBox('coastline-villa-pool-deck',center.x+38,edgeY+.06,center.z+3,17,.12,24,deck,false,false);
      const pool=new THREE.Mesh(new THREE.BoxGeometry(11,.08,18),poolWater); pool.name='coastline-villa-waist-deep-pool'; pool.position.set(center.x+38,edgeY+.92,center.z+3); pool.renderOrder=2; poolWater.depthWrite=false; root.add(pool);
      // Pattern panels make the Homey house intentionally playful rather than generic.
      const patternMat=material(0x4d2358,.74,.02); for(let i=0;i<5;i++)addBox(`coastline-villa-playful-pattern-${i+1}`,center.x-7+i*5.1,edgeY+7.3,center.z-12.3,2.1,.55,.08,patternMat,false,false);
      const rockMat=material(0x77756c,.98),rockGeometry=new THREE.DodecahedronGeometry(1,0),rocks=new THREE.InstancedMesh(rockGeometry,rockMat,12),rockDummy=new THREE.Object3D(); rocks.name='coastline-residential-giant-decorative-rocks'; for(let i=0;i<12;i++){const angle=i*Math.PI*2/12;rockDummy.position.set(center.x+Math.cos(angle)*101,edgeY+.35,center.z+Math.sin(angle)*101);rockDummy.scale.set(1.8+(i%3)*.65,.75+(i%2)*.35,1.5+(i%4)*.35);rockDummy.rotation.set(0,angle,0);rockDummy.updateMatrix();rocks.setMatrixAt(i,rockDummy.matrix);} rocks.instanceMatrix.needsUpdate=true; rocks.castShadow=false; rocks.receiveShadow=true; root.add(rocks);
      colliders.push({name:'coastline-villa-west-wall',x:center.x-8,z:center.z,w:1.1,d:24},{name:'coastline-villa-east-wall',x:center.x+18,z:center.z,w:1.1,d:24},{name:'coastline-villa-back-wall',x:center.x+5,z:center.z+12,w:26,d:1.1},{name:'coastline-villa-front-left-wall',x:center.x+1,z:center.z-12,w:12,d:1.1},{name:'coastline-villa-front-right-wall',x:center.x+13,z:center.z-12,w:8,d:1.1},{name:'coastline-villa-garage-west-wall',x:center.x-23.1,z:center.z-2,w:.9,d:20},{name:'coastline-villa-garage-east-wall',x:center.x-10.9,z:center.z-2,w:.9,d:20},{name:'coastline-villa-garage-back-wall',x:center.x-17,z:center.z+8,w:13.4,d:.9});
      addBox('coastline-villa-front-garden-bed',center.x+7,edgeY+.06,center.z-17,18,.12,3.2,lawn,false,false); addBox('coastline-villa-front-walk',center.x+4,edgeY+.08,center.z-20,4,.16,8,deck,false,false); addBox('coastline-residential-park',center.x+42,edgeY+.03,center.z-51,24,.08,18,lawn,false,false);
    }
  }
  if(region.contentDensity==='developed' && region.visual?.vegetation!=='sparse-coastal'){
    const trunk=material(0x79583d,.96),leaves=material(0x2f7047,.94),coconutMat=material(0x6b5635,.92),treeOffsets=region.id==='residential'?[[-82,-56],[-63,-80],[-28,-88],[34,-88],[72,-68],[91,-8],[78,48],[46,82],[-12,88],[-58,73],[-86,32]]:Array.from({length:8},(_,i)=>[-82+(i%4)*54,i<4?-72:76]);
    const treeDummy=new THREE.Object3D(),trunks=new THREE.InstancedMesh(new THREE.CylinderGeometry(.35,.5,5.5,7),trunk,treeOffsets.length),crowns=new THREE.InstancedMesh(new THREE.SphereGeometry(1.05,7,5),leaves,treeOffsets.length),fronds=new THREE.InstancedMesh(new THREE.CylinderGeometry(.035,.14,4.8,5),leaves,treeOffsets.length*7),coconuts=new THREE.InstancedMesh(new THREE.SphereGeometry(.22,5,4),coconutMat,treeOffsets.length*3); trunks.name=`coastline-${region.id}-palm-trunks`;crowns.name=`coastline-${region.id}-palm-crowns`;fronds.name=`coastline-${region.id}-palm-fronds`;coconuts.name=`coastline-${region.id}-palm-coconuts`;let frondIndex=0,coconutIndex=0;
    treeOffsets.forEach(([dx,dz],i)=>{const x=center.x+dx,z=center.z+dz;treeDummy.position.set(x,edgeY+2.75,z);treeDummy.updateMatrix();trunks.setMatrixAt(i,treeDummy.matrix);treeDummy.position.set(x,edgeY+5.6,z);treeDummy.scale.set(1.25,.62,1.25);treeDummy.rotation.set(0,0,0);treeDummy.updateMatrix();crowns.setMatrixAt(i,treeDummy.matrix);colliders.push({name:`coastline-${region.id}-palm-trunk-${i+1}`,x,z,w:2,d:2});for(let frond=0;frond<7;frond++){const angle=frond*Math.PI*2/7+(i%3)*.18,direction=new THREE.Vector3(Math.cos(angle),-.48-(frond%2)*.08,Math.sin(angle)).normalize();treeDummy.position.set(x+direction.x*1.9,edgeY+6.25+direction.y*1.9,z+direction.z*1.9);treeDummy.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction);treeDummy.scale.set(1,1,1);treeDummy.updateMatrix();fronds.setMatrixAt(frondIndex++,treeDummy.matrix);}for(let nut=0;nut<3;nut++){const angle=nut*Math.PI*2/3;treeDummy.position.set(x+Math.cos(angle)*.48,edgeY+5.45,z+Math.sin(angle)*.48);treeDummy.quaternion.set(0,0,0,1);treeDummy.scale.set(1,1,1);treeDummy.updateMatrix();coconuts.setMatrixAt(coconutIndex++,treeDummy.matrix);}});
    for(const mesh of [trunks,crowns,fronds,coconuts]){mesh.instanceMatrix.needsUpdate=true;mesh.castShadow=mesh===trunks;mesh.receiveShadow=mesh===trunks;root.add(mesh);}
  }
  if(region.id==='residential'&&typeof addBridge==='function')addBridge(THREE,root,{x:center.x,startZ:center.z-half,y:edgeY,length:100});
  if(typeof addSideBridge==='function'){if(region.id==='waterfront'||region.id==='port')addSideBridge(THREE,root,{edgeX:center.x-half,z:center.z,y:edgeY,length:100,direction:-1,name:`${region.id}-west`});if(region.id==='residential'||region.id==='waterfront')addSideBridge(THREE,root,{edgeX:center.x+half,z:center.z,y:edgeY,length:100,direction:1,name:`${region.id}-east`});}
  return root;
}

export function validateCoastlineIslandManifest(regions=COASTLINE_ISLAND_REGIONS){
  const ids=new Set(); for(const region of regions){if(!region||typeof region.id!=='string'||!region.id.trim())throw new Error('each Coastline island must have a non-empty id');if(ids.has(region.id))throw new Error(`duplicate Coastline island id: ${region.id}`);ids.add(region.id);}
  for(const region of regions){if(!region.title||!region.theme||!region.purpose)throw new Error(`island ${region.id} is missing its identity or design purpose`);if(!['developed','sparse'].includes(region.contentDensity))throw new Error(`island ${region.id} has invalid content density`);if(!Number.isFinite(region.bounds?.halfWidth)||region.bounds.halfWidth<=0||!Number.isFinite(region.bounds?.halfDepth)||region.bounds.halfDepth<=0)throw new Error(`island ${region.id} has invalid bounds`);for(const key of ['traffic','pedestrians'])if(!Number.isInteger(region.population?.[key])||region.population[key]<0)throw new Error(`island ${region.id} has an invalid ${key} budget`);if(!ids.has(region.bridge?.target))throw new Error(`island ${region.id} targets an unknown neighboring island`);}
  return true;
}
