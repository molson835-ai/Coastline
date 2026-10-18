// Coastline Fidelity Core: reusable instancing utilities for vegetation and props.
export function createInstancedLayer({ THREE, geometry, material, transforms=[], castShadow=false, receiveShadow=true }) {
  if(!THREE||!geometry||!material) throw new Error('THREE, geometry and material are required');
  const mesh=new THREE.InstancedMesh(geometry,material,Math.max(1,transforms.length));
  const dummy=new THREE.Object3D();
  transforms.forEach((t,index)=>{
    dummy.position.set(t.x||0,t.y||0,t.z||0);
    dummy.rotation.set(t.rx||0,t.ry||0,t.rz||0);
    dummy.scale.set(t.sx??1,t.sy??1,t.sz??1);
    dummy.updateMatrix();
    mesh.setMatrixAt(index,dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate=true;
  mesh.castShadow=castShadow;
  mesh.receiveShadow=receiveShadow;
  mesh.frustumCulled=true;
  mesh.userData.coastlineInstanced=true;
  return mesh;
}

export function groupTransformsByCell(transforms,cellSize=200){
  const groups=new Map();
  for(const transform of transforms){
    const cx=Math.floor((transform.x||0)/cellSize),cz=Math.floor((transform.z||0)/cellSize),key=`${cx}:${cz}`;
    if(!groups.has(key))groups.set(key,[]);
    groups.get(key).push(transform);
  }
  return groups;
}