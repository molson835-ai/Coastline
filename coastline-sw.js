const CACHE_NAME='coastline-static-v12';
const CORE=['./','./index.html','./coastline-cinematic-v2.html','./game-v3.html','./world-model.js','./world-engine.js','./living-world.js','./douglassville-layout.js','./realism-library.js','./presentation-runtime.js','./cinematic-visual-library.js','./cinematic-animation-library.js','./cinematic-environment-library.js','./replayability-engine.js','./npc-agency-engine.js','./npc-world-slice.js','./social-rumor-engine.js','./player-reputation-engine.js','./coastline-ai-runtime.js','./coastline-live-ops.js'];
const FULL_BETA_PATCH=`<script id="coastline-full-beta-upgrades">(()=>{
'use strict';
const steerMap=k=>k==='a'?'d':k==='d'?'a':k;
const held=new Map();const started=new Map();const STEER_KEYS=new Set(['a','d']);const HOLD_RAMP=900;
window.__coastlineSteerScale=.28;window.__coastlineSteerHeld=held;
const synth=(type,key)=>{const e=new KeyboardEvent(type,{key,bubbles:true,cancelable:true});Object.defineProperty(e,'__coastlineSteerSynthetic',{value:true});window.dispatchEvent(e)};
const begin=raw=>{const k=String(raw||'').toLowerCase();if(!STEER_KEYS.has(k))return;const mapped=steerMap(k);if(!held.has(k)){held.set(k,mapped);started.set(k,performance.now());synth('keydown',mapped)}};
const end=raw=>{const k=String(raw||'').toLowerCase();if(!STEER_KEYS.has(k))return;const mapped=held.get(k)||steerMap(k);held.delete(k);started.delete(k);synth('keyup',mapped)};
window.addEventListener('keydown',e=>{if(e.__coastlineSteerSynthetic)return;const k=e.key?.toLowerCase();if(!STEER_KEYS.has(k))return;e.preventDefault();e.stopImmediatePropagation();begin(k)},true);
window.addEventListener('keyup',e=>{if(e.__coastlineSteerSynthetic)return;const k=e.key?.toLowerCase();if(!STEER_KEYS.has(k))return;e.preventDefault();e.stopImmediatePropagation();end(k)},true);
window.addEventListener('blur',()=>{for(const k of [...held.keys()])end(k)},true);
const bindTouch=()=>document.querySelectorAll('.touch [data-k="a"],.touch [data-k="d"]').forEach(btn=>{if(btn.__coastlineSteerBound)return;btn.__coastlineSteerBound=true;btn.addEventListener('pointerdown',e=>{e.preventDefault();e.stopImmediatePropagation();begin(btn.dataset.k);btn.setPointerCapture?.(e.pointerId)},true);['pointerup','pointercancel','pointerleave','lostpointercapture'].forEach(t=>btn.addEventListener(t,e=>{e.preventDefault();e.stopImmediatePropagation();end(btn.dataset.k)},true))});
bindTouch();new MutationObserver(bindTouch).observe(document.documentElement,{childList:true,subtree:true});
setInterval(()=>{const now=performance.now();let scale=.28;for(const t0 of started.values())scale=Math.max(scale,.28+.72*Math.min(1,(now-t0)/HOLD_RAMP));window.__coastlineSteerScale=scale},16);

/* Adaptive performance layer. Inspired by the recurring architecture of large open-world engines:
   distance culling + dynamic resolution + static-world freezing + simulation budgets. The browser build
   cannot use engine-specific HLOD/World Partition, so this approximates the same policy at runtime. */
const perf=window.__coastlinePerf={targetFps:42,far:700,minFar:520,maxFar:760,scale:1,last:performance.now(),frames:0,low:0,high:0};
function findScene(){
  const c=window.scene||window.__coastlineScene||window.gameScene||window.__scene;
  if(c&&c.getEngine)return c;
  for(const k of Object.keys(window)){try{const v=window[k];if(v&&v.getEngine&&v.activeCamera&&v.meshes)return v}catch{}}
  return null;
}
function isStatic(m){if(!m||!m.position)return false;const n=String(m.name||'').toLowerCase();return !/(car|vehicle|npc|ped|player|animal|traffic|camera|collider|collision|wheel|door|character)/.test(n)}
function apply(scene){
  const cam=scene.activeCamera;if(cam){cam.maxZ=perf.far;cam.minZ=Math.max(.05,cam.minZ||.1)}
  if(scene.performancePriority!==undefined)scene.performancePriority='aggressive';
  let frozen=0;
  if(perf.frames===1){for(const m of scene.meshes||[]){if(isStatic(m)&&m.freezeWorldMatrix&&!m.isFrozen){try{m.freezeWorldMatrix();frozen++}catch{}}}}
  const engine=scene.getEngine?.();
  if(engine?.setHardwareScalingLevel){try{engine.setHardwareScalingLevel(perf.scale)}catch{}}
  return frozen;
}
function sample(){
  const scene=findScene();if(!scene)return;
  const now=performance.now();perf.frames++;
  if(now-perf.last<500)return;
  const fps=perf.frames*1000/(now-perf.last);perf.frames=0;perf.last=now;
  perf.fps=Math.round(fps);
  if(fps<perf.targetFps-5){perf.low++;perf.high=0;if(perf.low>=2){perf.far=Math.max(perf.minFar,perf.far*.88);perf.scale=Math.min(1.5,perf.scale+.08);perf.low=0}}
  else if(fps>perf.targetFps+10){perf.high++;perf.low=0;if(perf.high>=4){perf.far=Math.min(perf.maxFar,perf.far*1.06);perf.scale=Math.max(1,perf.scale-.04);perf.high=0}}
  apply(scene);
}
let bootTries=0;const boot=()=>{const s=findScene();if(s){perf.far=700;perf.scale=1.18;apply(s);window.__coastlinePerfReady=true;return}if(++bootTries<80)setTimeout(boot,250)};
setTimeout(boot,250);setInterval(sample,250);
window.__coastlinePerfSnapshot=()=>({fps:perf.fps||0,far:Math.round(perf.far),renderScale:Number(perf.scale.toFixed(2))});
})();</script>`;
function patchFullBetaHtml(text){
  let out=text;
  const old="const kind=v.kind||'car',accel=(keys.w?1:0)-(keys.s?1:0),steer=(keys.d?1:0)-(keys.a?1:0);";
  const replacement="const kind=v.kind||'car',accel=(keys.w?1:0)-(keys.s?1:0),steer=((keys.d?1:0)-(keys.a?1:0))*(window.__coastlineSteerScale||1);";
  if(out.includes(old))out=out.replace(old,replacement);else console.warn('Coastline: full-beta vehicle steering hook not found.');
  if(out.includes('</head>'))out=out.replace('</head>',FULL_BETA_PATCH+'</head>');
  return out;
}
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(CORE).catch(()=>{})).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{const request=event.request;if(request.method!=='GET')return;const url=new URL(request.url);if(url.origin!==self.location.origin)return;const isHtml=request.mode==='navigate'||request.destination==='document'||url.pathname.endsWith('.html');if(isHtml){event.respondWith(fetch(request).then(async response=>{if(!response.ok)return response;let result=response;if(url.pathname.endsWith('/game-v3.html')){const source=await response.text();const patched=patchFullBetaHtml(source);result=new Response(patched,{status:response.status,statusText:response.statusText,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}})}caches.open(CACHE_NAME).then(cache=>cache.put(request,result.clone()));return result}).catch(()=>caches.match(request).then(c=>c||caches.match('./index.html'))));return}event.respondWith(caches.match(request).then(cached=>{const network=fetch(request).then(response=>{if(response.ok)caches.open(CACHE_NAME).then(cache=>cache.put(request,response.clone()));return response}).catch(()=>cached);return cached||network}))});
