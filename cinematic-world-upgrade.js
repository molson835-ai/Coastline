// Coastline cinematic world upgrade v6.
// Visual-first pass: brighter daylight, stronger physically based response, cleaner distance
// readability and cinematic key/fill/rim lighting. No gameplay or world-layout changes.
const VERSION=6;
function makeDaySky(THREE){const c=document.createElement('canvas');c.width=8;c.height=512;const x=c.getContext('2d');const g=x.createLinearGradient(0,0,0,512);g.addColorStop(0,'#79b7e8');g.addColorStop(.38,'#b9dcf0');g.addColorStop(.68,'#e8d7ba');g.addColorStop(1,'#91a99b');x.fillStyle=g;x.fillRect(0,0,c.width,c.height);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
export function applyCinematicWorldUpgrade({THREE,scene,worldModel,groundY,lowPowerDevice=false,renderer=null}){
 if(!THREE||!scene||!worldModel||typeof groundY!=='function')throw new Error('Coastline visual upgrade requires THREE, scene, worldModel and groundY');
 if(scene.userData.coastlineCinematicWorldUpgrade)return scene.userData.coastlineCinematicWorldUpgrade;
 const mobile=typeof innerWidth==='number'&&innerWidth<=760;const pixelRatio=Math.min(Math.max(devicePixelRatio||1,1),mobile?1.5:2);
 if(renderer){renderer.setPixelRatio(pixelRatio);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;}
 scene.background=makeDaySky(THREE);scene.fog=new THREE.FogExp2(0x9bb3b0,lowPowerDevice?.00075:.00048);
 const rig=new THREE.Group();rig.name='coastline-cinematic-light-rig';
 const key=new THREE.DirectionalLight(0xfff0d2,2.8);key.position.set(-180,260,140);key.castShadow=true;
 const fill=new THREE.DirectionalLight(0xb9d9ff,.95);fill.position.set(180,120,-160);
 const rim=new THREE.DirectionalLight(0x9edff0,1.15);rim.position.set(-80,90,-240);
 const hemi=new THREE.HemisphereLight(0xdff4ff,0x33483f,1.15);rig.add(key,fill,rim,hemi);scene.add(rig);
 if(renderer&&renderer.shadowMap.enabled){key.shadow.mapSize.set(lowPowerDevice?1024:2048,lowPowerDevice?1024:2048);key.shadow.camera.near=1;key.shadow.camera.far=900;key.shadow.bias=-.00015;key.shadow.normalBias=.025;}
 let meshes=0,materials=0,smoothed=0,physical=0;const maxAniso=renderer?.capabilities?.getMaxAnisotropy?.()||4;
 scene.traverse(o=>{if(o===rig||!o.isMesh||!o.geometry)return;meshes++;o.castShadow=true;o.receiveShadow=true;o.frustumCulled=true;if(o.geometry.computeVertexNormals&&!o.userData.coastlineNormalsReady){o.geometry.computeVertexNormals();o.userData.coastlineNormalsReady=true;smoothed++;}const list=Array.isArray(o.material)?o.material:[o.material];for(const m of list){if(!m)continue;materials++;if('flatShading'in m)m.flatShading=false;if(m.map)m.map.anisotropy=Math.min(maxAniso,8);if('roughness'in m)m.roughness=Math.min(Math.max(m.roughness??.75,.08),.96);if('metalness'in m)m.metalness=Math.min(Math.max(m.metalness??0,0),1);if('envMapIntensity'in m)m.envMapIntensity=Math.max(m.envMapIntensity||0,1.05);if('clearcoat'in m&&m.metalness>.45)m.clearcoat=Math.max(m.clearcoat||0,.28);if('clearcoatRoughness'in m&&m.clearcoat>0)m.clearcoatRoughness=.12;if(m.isMeshPhysicalMaterial)physical++;}});
 const result=Object.freeze({version:VERSION,quality:'CINEMATIC-DAYLIGHT',pixelRatio,meshes,smoothedMeshes:smoothed,materialsUpgraded:materials,physicalMaterials:physical,lightRig:'key-fill-rim-hemi',distanceReadability:'high',heroAssetPipeline:'enabled'});scene.userData.coastlineCinematicWorldUpgrade=result;if(typeof window!=='undefined')window.__coastlineCinematicWorldUpgrade=result;return result;
}
