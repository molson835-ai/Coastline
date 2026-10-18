// Coastline Graphics Realism v2 — visual-only pass
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
const scenes=new WeakSet(),state=new WeakMap();
function makeEnv(renderer){
  const c=document.createElement('canvas'); c.width=1024; c.height=512;
  const x=c.getContext('2d'); const g=x.createLinearGradient(0,0,0,512);
  g.addColorStop(0,'#18334d'); g.addColorStop(.22,'#5f89a4'); g.addColorStop(.48,'#b9c7c8'); g.addColorStop(.67,'#e0b18e'); g.addColorStop(1,'#30433e');
  x.fillStyle=g; x.fillRect(0,0,1024,512);
  const sun=x.createRadialGradient(770,205,2,770,205,120); sun.addColorStop(0,'rgba(255,246,215,1)'); sun.addColorStop(.08,'rgba(255,220,166,.85)'); sun.addColorStop(.35,'rgba(255,175,110,.24)'); sun.addColorStop(1,'rgba(255,130,80,0)'); x.fillStyle=sun; x.fillRect(620,55,300,300);
  for(let i=0;i<18;i++){const px=(i*173)%1024,py=75+(i*47)%155,rx=55+(i%5)*22,ry=10+(i%4)*8;const cg=x.createRadialGradient(px,py,2,px,py,rx);cg.addColorStop(0,'rgba(245,248,248,.16)');cg.addColorStop(1,'rgba(245,248,248,0)');x.fillStyle=cg;x.beginPath();x.ellipse(px,py,rx,ry,0,0,Math.PI*2);x.fill()}
  const tex=new THREE.CanvasTexture(c); tex.colorSpace=THREE.SRGBColorSpace; tex.mapping=THREE.EquirectangularReflectionMapping;
  const pmrem=new THREE.PMREMGenerator(renderer); pmrem.compileEquirectangularShader(); const env=pmrem.fromEquirectangular(tex).texture; tex.dispose(); pmrem.dispose(); return env;
}
function polishMaterial(m){if(!m||m.userData?.coastlineRealismV2)return;m.userData=m.userData||{};m.userData.coastlineRealismV2=true;if(m.isMeshPhysicalMaterial||m.isMeshStandardMaterial)m.roughness=Math.min(.92,Math.max(.18,m.roughness??.7));if('envMapIntensity'in m)m.envMapIntensity=m.isMeshPhysicalMaterial?1.15:.82;if(m.isMeshPhysicalMaterial){m.clearcoat=Math.max(m.clearcoat||0,.32);m.clearcoatRoughness=Math.min(m.clearcoatRoughness??.22,.16)}}
function walk(o){if(!o)return;if(o.isMesh&&o.material){(Array.isArray(o.material)?o.material:[o.material]).forEach(polishMaterial);o.castShadow=o.castShadow||!!o.userData.coastlineHero;o.receiveShadow=true}for(const c of o.children||[])walk(c)}
function install(scene,renderer){if(!scene||scenes.has(scene))return;scenes.add(scene);try{scene.environment=makeEnv(renderer);scene.environmentIntensity=.78}catch(e){}if(renderer){renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08}walk(scene);state.set(scene,{ready:true})}
const oldAdd=THREE.Scene.prototype.add; THREE.Scene.prototype.add=function(...objects){const r=oldAdd.apply(this,objects);for(const o of objects)walk(o);return r};
const oldRender=THREE.WebGLRenderer.prototype.render; THREE.WebGLRenderer.prototype.render=function(scene,camera){if(scene&&this)install(scene,this);return oldRender.call(this,scene,camera)};
if(!document.getElementById('coastlineRealismV2')){const s=document.createElement('style');s.id='coastlineRealismV2';s.textContent='canvas{filter:saturate(1.015) contrast(1.012) brightness(1.01)}@media(max-width:700px){canvas{filter:saturate(1.01) contrast(1.006)}}';document.head.appendChild(s)}
globalThis.__coastlineGraphicsRealismV2={version:2,install};
