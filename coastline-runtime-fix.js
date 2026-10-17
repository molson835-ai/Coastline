(()=>{
'use strict';
const TAG='CoastlineRuntimeV2';
const state=window.__coastlineRuntime={tag:TAG,ready:false,scene:null,camera:null,renderer:null,composer:null,lastFrame:performance.now(),frameMs:16,slowSamples:0,fastSamples:0,far:520,quality:.88,errors:0,whiteFrames:0};
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
  if(scene.environment)scene.environmentIntensity=Math.max(scene.environmentIntensity||0,.98);
  if(scene.fog){scene.fog.density=Math.min(scene.fog.density||.00048,.00062)}
  let lights=0;
  scene.traverse?.(o=>{
    if(o.isLight){lights++;if(o.intensity<.45)o.intensity*=1.15;if(o.castShadow&&o.shadow?.mapSize){const s=innerWidth<=760?1024:1536;o.shadow.mapSize.set(Math.min(s,o.shadow.mapSize.x),Math.min(s,o.shadow.mapSize.y));o.shadow.bias=-.00025;o.shadow.normalBias=.015}}
    if(o.isMesh){o.frustumCulled=true;if(o.material){const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>{if(m.map)m.map.anisotropy=Math.min(4,state.renderer?.capabilities?.getMaxAnisotropy?.()||4);if(m.normalMap)m.normalMap.anisotropy=Math.min(4,state.renderer?.capabilities?.getMaxAnisotropy?.()||4)})}}
  });
  if(!scene.getObjectByName?.('__coastlineCinematicFill')){
    try{
      const THREE=window.THREE;
      if(THREE){const fill=new THREE.HemisphereLight(0xb9d8ff,0x18202a,0.52);fill.name='__coastlineCinematicFill';scene.add(fill);const sun=new THREE.DirectionalLight(0xffd0a0,.85);sun.name='__coastlineCinematicSun';sun.position.set(-140,220,90);sun.castShadow=true;sun.shadow.mapSize.set(innerWidth<=760?1024:1536,innerWidth<=760?1024:1536);sun.shadow.camera.near=10;sun.shadow.camera.far=700;sun.shadow.camera.left=-260;sun.shadow.camera.right=260;sun.shadow.camera.top=260;sun.shadow.camera.bottom=-260;scene.add(sun)}
    }catch{}
  }
  state.ready=true;
}
function qualityTick(){
  const now=performance.now(),dt=now-state.lastFrame;state.lastFrame=now;state.frameMs=state.frameMs*.9+dt*.1;
  if(dt>40)state.slowSamples++;else state.slowSamples=Math.max(0,state.slowSamples-1);
  if(dt<19)state.fastSamples++;else state.fastSamples=Math.max(0,state.fastSamples-1);
  if(state.renderer&&now-(state.lastQuality||0)>2500){state.lastQuality=now;
    if(state.slowSamples>=8){state.quality=Math.max(.62,state.quality-.08);state.far=Math.max(420,state.far-45);state.slowSamples=0;applyQuality()}
    else if(state.fastSamples>=80){state.quality=Math.min(.92,state.quality+.03);state.far=Math.min(560,state.far+25);state.fastSamples=0;applyQuality()}
  }
  requestAnimationFrame(qualityTick);
}
function applyQuality(){const r=state.renderer;if(!r)return;try{r.setPixelRatio?.(Math.min(devicePixelRatio||1,state.quality));r.setSize?.(innerWidth,innerHeight,false);if(state.composer){state.composer.setPixelRatio?.(Math.min(devicePixelRatio||1,state.quality));state.composer.setSize?.(innerWidth,innerHeight)}}catch{}if(state.camera){state.camera.far=Math.min(state.camera.far||state.far,state.far);state.camera.updateProjectionMatrix?.()}}
function patchThree(){
  const THREE=window.THREE;
  if(!THREE||THREE.WebGLRenderer?.prototype.__coastlinePatched)return false;
  const RP=THREE.WebGLRenderer?.prototype;if(!RP?.render)return false;
  const originalRender=RP.render;
  RP.render=function(scene,camera){state.renderer=this;state.scene=scene||state.scene;state.camera=camera||state.camera;try{tuneScene(scene,camera);scene?.traverse?.(sanitizeObject);if(camera?.position)sanitizeObject(camera);camera?.updateProjectionMatrix?.();const out=originalRender.apply(this,arguments);return out}catch(err){state.errors++;try{this.setRenderTarget?.(null);this.clear?.(true,true,true);if(scene&&camera)originalRender.call(this,scene,camera)}catch{}return undefined}};
  RP.__coastlinePatched=true;
  return true;
}
function patchComposer(){
  const C=window.__THREE_EFFECT_COMPOSER__;
  if(C?.prototype?.render&&!C.prototype.__coastlinePatched){const original=C.prototype.render;C.prototype.render=function(){state.composer=this;state.renderer=this.renderer||state.renderer;try{return original.apply(this,arguments)}catch(err){state.errors++;try{if(state.renderer&&state.scene&&state.camera)state.renderer.render(state.scene,state.camera)}catch{}return undefined}};C.prototype.__coastlinePatched=true;return true}return false;
}
window.addEventListener('error',e=>{if(state.ready){state.errors++;console.warn(TAG,'runtime error',e.message||e.error||e)}},true);
window.addEventListener('unhandledrejection',e=>{if(state.ready){state.errors++;console.warn(TAG,'runtime rejection',e.reason)}},true);
window.addEventListener('webglcontextlost',e=>{e.preventDefault();state.errors++;setTimeout(()=>{try{state.renderer?.forceContextRestore?.()}catch{}},250)},true);
window.__coastlineRuntimeSnapshot=()=>({tag:TAG,fps:Math.round(1000/Math.max(8,state.frameMs)),far:Math.round(state.far),renderScale:Number(state.quality.toFixed(2)),errors:state.errors});
const findComposer=()=>{for(const k of Object.keys(window)){try{const v=window[k];if(v?.renderer&&Array.isArray(v.passes)&&typeof v.render==='function')return v}catch{}}return null};
(async()=>{try{window.THREE=await import('https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js');patchThree();}catch{};
  setInterval(()=>{patchThree();const c=findComposer();if(c)state.composer=c;tuneScene(state.scene,state.camera);applyQuality()},1200);
  requestAnimationFrame(qualityTick);
})();
})();