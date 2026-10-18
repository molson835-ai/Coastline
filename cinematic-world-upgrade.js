// Coastline stable world fidelity pass.
// Performance-first rollback: avoids global geometry replacement and forced 2x rendering.
const VERSION=5;
export function applyCinematicWorldUpgrade({THREE,scene,worldModel,groundY,lowPowerDevice=false,renderer=null}){
 if(!THREE||!scene||!worldModel||typeof groundY!=='function')throw new Error('Coastline visual upgrade requires THREE, scene, worldModel and groundY');
 if(scene.userData.coastlineCinematicWorldUpgrade)return scene.userData.coastlineCinematicWorldUpgrade;
 const mobile=typeof innerWidth==='number'&&innerWidth<=760;
 const pixelRatio=Math.min(Math.max(devicePixelRatio||1,1),mobile?1.25:1.5);
 if(renderer)renderer.setPixelRatio(pixelRatio);
 let meshes=0,materials=0,smoothed=0;
 scene.traverse(o=>{
  if(!o.isMesh||!o.geometry)return;
  meshes++;o.castShadow=true;o.receiveShadow=true;o.frustumCulled=true;
  if(o.geometry.computeVertexNormals&&!o.userData.coastlineNormalsReady){o.geometry.computeVertexNormals();o.userData.coastlineNormalsReady=true;smoothed++;}
  const list=Array.isArray(o.material)?o.material:[o.material];
  for(const m of list){if(!m)continue;materials++;if('flatShading'in m)m.flatShading=false;if(m.map)m.map.anisotropy=Math.min(renderer?.capabilities?.getMaxAnisotropy?.()||4,4);}
 });
 const result=Object.freeze({version:VERSION,quality:'STABLE-PERFORMANCE',pixelRatio,meshes,smoothedMeshes:smoothed,materialsUpgraded:materials});
 scene.userData.coastlineCinematicWorldUpgrade=result;
 if(typeof window!=='undefined')window.__coastlineCinematicWorldUpgrade=result;
 return result;
}
