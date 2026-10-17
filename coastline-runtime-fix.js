(()=>{
'use strict';
const TAG='CoastlineRuntimeV3';
const state=window.__coastlineRuntime={tag:TAG,ready:false,scene:null,camera:null,renderer:null,composer:null,lastFrame:performance.now(),frameMs:16,slowSamples:0,fastSamples:0,far:520,quality:.88,errors:0,tuned:new WeakSet(),loading:true};
const bootAt=performance.now();
const loader=document.createElement('div');loader.id='coastlineWorldLoader';loader.style.cssText='position:fixed;inset:0;z-index:9998;display:grid;place-items:center;background:linear-gradient(180deg,#07131d,#0b2630);color:#eefcff;font:14px/1.5 system-ui,sans-serif;transition:opacity .65s ease;pointer-events:auto';loader.innerHTML='<div style="width:min(520px,86vw);text-align:center"><div style="font-size:11px;letter-spacing:.24em;color:#91eef8;font-weight:900">COASTLINE · WORLD BUILD</div><div id="coastlineLoadTitle" style="font-size:28px;font-weight:900;margin:10px 0">Building the city</div><div id="coastlineLoadSub" style="color:#a9c9d0">Streaming roads, buildings, lighting and living-world systems…</div><div style="height:6px;margin:20px 0 8px;border-radius:99px;background:#ffffff16;overflow:hidden"><div id="coastlineLoadBar" style="height:100%;width:8%;border-radius:99px;background:#79e3ef;transition:width .45s ease"></div></div><div id="coastlineLoadHint" style="font-size:11px;color:#7898a1">First launch can take longer while the renderer warms up.</div></div>';
document.documentElement.appendChild(loader);
const loadTitle=document.getElementById('coastlineLoadTitle'),loadSub=document.getElementById('coastlineLoadSub'),loadBar=document.getElementById('coastlineLoadBar'),loadHint=document.getElementById('coastlineLoadHint');
let loaderStage=0;const stages=[['Building the city','Streaming roads, buildings, terrain and districts…',22],['Lighting the world','Stabilizing cinematic lighting, reflections and shadows…',48],['Warming the renderer','Compiling the visual pipeline and performance budget…',72],['Finalizing Coastline','Preparing traffic, NPCs and interactive systems…',92]];
const stageTimer=setInterval(()=>{if(!state.loading){clearInterval(stageTimer);return}loaderStage=Math.min(stages.length-1,loaderStage+1);const s=stages[loaderStage];loadTitle.textContent=s[0];loadSub.textContent=s[1];loadBar.style.width=s[2]+'%'},2200);
function hideLoader(){if(!state.loading)return;state.loading=false;clearInterval(stageTimer);loadBar.style.width='100%';loadHint.textContent='World ready';setTimeout(()=>{loader.style.opacity='0';setTimeout(()=>loader.remove(),700)},250)}
const steerHeld=new Set();
const mapKey=k=>k==='a'?'d':k==='d'?'a':k;
const synth=(type,key)=>{const e=new KeyboardEvent(type,{key,bubbles:true,cancelable:true});Object.defineProperty(e,'__coastlineRuntimeSynthetic',{value:true});window.dispatchEvent(e)};
function steerDown(key){if(!['a','d'].includes(key)||steerHeld.has(key))return;steerHeld.add(key);synth('keydown',mapKey(key))}
function steerUp(key){if(!['a','d'].includes(key))return;steerHeld.delete(key);synth('keyup',mapKey(key))}
window.addEventListener('keydown',e=>{if(e.__coastlineRuntimeSynthetic)return;const k=e.key?.toLowerCase();if(['a','d'].includes(k)){e.preventDefault();e.stopImmediatePropagation();steerDown(k)}},true);
window.addEventListener('keyup',e=>{if(e.__coastlineRuntimeSynthetic)return;const k=e.key?.toLowerCase();if(['a','d'].includes(k)){e.preventDefault();e.stopImmediatePropagation();steerUp(k)}},true);
window.addEventListener('blur',()=>[...steerHeld].forEach(steerUp),true);
function sanitizeObject(o){if(!o?.position)return;const p=o.position;if(!Number.isFinite(p.x)||!Number.isFinite(p.y)||!Number.isFinite(p.z))p.set(0,0,0);if(o.quaternion){const q=o.quaternion;if(!Number.isFinite(q.x)||!Number.isFinite(q.y)||!Number.isFinite(q.z)||!Number.isFinite(q.w))q.set(0,0,0,1)}}
function tuneScene(scene,camera){
  if(!scene)return;
  state.scene=scene;state.camera=camera||state.camera;
  if(camera){camera.near=Math.max(.18,camera.near||.1);camera.far=Math.min(camera.far||520,state.far);camera.updateProjectionMatrix?.()}
  if(state.tuned.has(scene)){state.ready=true;return}
  state.tuned.add(scene);
  if(scene.environment)scene.environmentIntensity=Math.max(scene.environmentIntensity||0,.98);
  if(scene.fog)scene.fog.density=Math.min(scene.fog.density||.00048,.00062);
  scene.traverse?.(o=>{
    if(o.isLight){if(o.intensity<.45)o.intensity*=1.15;if(o.castShadow&&o.shadow?.mapSize){const s=innerWidth<=760?1024:1536;o.shadow.mapSize.set(Math.min(s,o.shadow.mapSize.x),Math.min(s,o.shadow.mapSize.y));o.shadow.bias=-.00025;o.shadow.normalBias=.015}}
    if(o.isMesh){o.frustumCulled=true;if(o.material){const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>{const a=state.renderer?.capabilities?.getMaxAnisotropy?.()||4;if(m.map)m.map.anisotropy=Math.min(4,a);if(m.normalMap)m.normalMap.anisotropy=Math.min(4,a)})}}
  });
  try{const THREE=window.THREE;if(THREE){const fill=new THREE.HemisphereLight(0xb9d8ff,0x18202a,0.52);fill.name='__coastlineCinematicFill';scene.add(fill);const sun=new THREE.DirectionalLight(0xffd0a0,.85);sun.name='__coastlineCinematicSun';sun.position.set(-140,220,90);sun.castShadow=true;const sm=innerWidth<=760?1024:1536;sun.shadow.mapSize.set(sm,sm);sun.shadow.camera.near=10;sun.shadow.camera.far=700;sun.shadow.camera.left=-260;sun.shadow.camera.right=260;sun.shadow.camera.top=260;sun.shadow.camera.bottom=-260;scene.add(sun)}}catch{}
  state.ready=true;
}
function qualityTick(){
  const now=performance.now(),dt=now-state.lastFrame;state.lastFrame=now;state.frameMs=state.frameMs*.9+dt*.1;
  if(dt>40)state.slowSamples++;else state.slowSamples=Math.max(0,state.slowSamples-1);
  if(dt<19)state.fastSamples++;else state.fastSamples=Math.max(0,state.fastSamples-1);
  if(state.ready&&now-bootAt>1800&&state.frameMs<32)hideLoader();
  if(state.renderer&&now-(state.lastQuality||0)>2500){state.lastQuality=now;if(state.slowSamples>=8){state.quality=Math.max(.62,state.quality-.08);state.far=Math.max(420,state.far-45);state.slowSamples=0;applyQuality()}else if(state.fastSamples>=80){state.quality=Math.min(.92,state.quality+.03);state.far=Math.min(560,state.far+25);state.fastSamples=0;applyQuality()}}
  requestAnimationFrame(qualityTick);
}
function applyQuality(){const r=state.renderer;if(!r)return;try{r.setPixelRatio?.(Math.min(devicePixelRatio||1,state.quality));if(state.composer){state.composer.setPixelRatio?.(Math.min(devicePixelRatio||1,state.quality));state.composer.setSize?.(innerWidth,innerHeight)}}catch{}if(state.camera){state.camera.far=Math.min(state.camera.far||state.far,state.far);state.camera.updateProjectionMatrix?.()}}
function patchThree(){
  const THREE=window.THREE;if(!THREE||THREE.WebGLRenderer?.prototype.__coastlinePatched)return false;
  const RP=THREE.WebGLRenderer?.prototype;if(!RP?.render)return false;const originalRender=RP.render;
  RP.render=function(scene,camera){state.renderer=this;state.scene=scene||state.scene;state.camera=camera||state.camera;try{tuneScene(scene,camera);scene?.traverse?.(o=>{if(o.visible!==false&&o.position)sanitizeObject(o)});if(camera?.position)sanitizeObject(camera);camera?.updateProjectionMatrix?.();return originalRender.apply(this,arguments)}catch(err){state.errors++;try{this.setRenderTarget?.(null);this.clear?.(true,true,true);if(scene&&camera)originalRender.call(this,scene,camera)}catch{}return undefined}};
  RP.__coastlinePatched=true;return true;
}
window.addEventListener('error',e=>{if(state.ready){state.errors++;console.warn(TAG,'runtime error',e.message||e.error||e)}},true);
window.addEventListener('unhandledrejection',e=>{if(state.ready){state.errors++;console.warn(TAG,'runtime rejection',e.reason)}},true);
window.addEventListener('webglcontextlost',e=>{e.preventDefault();state.errors++;setTimeout(()=>{try{state.renderer?.forceContextRestore?.()}catch{}},250)},true);
window.__coastlineRuntimeSnapshot=()=>({tag:TAG,fps:Math.round(1000/Math.max(8,state.frameMs)),far:Math.round(state.far),renderScale:Number(state.quality.toFixed(2)),errors:state.errors,loading:state.loading});
(async()=>{try{window.THREE=await import('https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js');patchThree();}catch{}setInterval(()=>{patchThree();if(state.scene)tuneScene(state.scene,state.camera);applyQuality()},1800);requestAnimationFrame(qualityTick)})();
})();