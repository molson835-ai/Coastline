const CACHE_NAME='coastline-static-v16';
const CORE=['./','./index.html','./coastline-cinematic-v2.html','./game-v3.html','./world-model.js','./world-engine.js','./living-world.js','./douglassville-layout.js','./realism-library.js','./presentation-runtime.js','./cinematic-visual-library.js','./cinematic-animation-library.js','./cinematic-environment-library.js','./replayability-engine.js','./npc-agency-engine.js','./npc-world-slice.js','./social-rumor-engine.js','./player-reputation-engine.js','./coastline-ai-runtime.js','./coastline-ai-worker.js','./coastline-live-ops.js','./coastline-ai-devs.js'];
const FULL_BETA_PATCH=`<script id="coastline-full-beta-upgrades">(()=>{
'use strict';
const held=new Map(),started=new Map(),STEER_KEYS=new Set(['a','d']),HOLD_RAMP=650;
window.__coastlineSteerScale=.32;window.__coastlineSteerHeld=held;
const begin=k=>{k=String(k||'').toLowerCase();if(!STEER_KEYS.has(k))return;if(!held.has(k)){held.set(k,true);started.set(k,performance.now())}};
const end=k=>{k=String(k||'').toLowerCase();if(!STEER_KEYS.has(k))return;held.delete(k);started.delete(k)};
window.addEventListener('keydown',e=>begin(e.key),true);window.addEventListener('keyup',e=>end(e.key),true);window.addEventListener('blur',()=>{for(const k of [...held.keys()])end(k)},true);
const bindTouch=()=>document.querySelectorAll('.touch [data-k="a"],.touch [data-k="d"]').forEach(btn=>{if(btn.__coastlineSteerBound)return;btn.__coastlineSteerBound=true;btn.addEventListener('pointerdown',()=>begin(btn.dataset.k),true);['pointerup','pointercancel','pointerleave','lostpointercapture'].forEach(t=>btn.addEventListener(t,()=>end(btn.dataset.k),true))});
bindTouch();new MutationObserver(bindTouch).observe(document.documentElement,{childList:true,subtree:true});
setInterval(()=>{const now=performance.now();let magnitude=.32;for(const t0 of started.values())magnitude=Math.max(magnitude,.32+.68*Math.min(1,(now-t0)/HOLD_RAMP));window.__coastlineSteerScale=-magnitude},16);
})();</script><script id="coastline-high-speed-visibility">(()=>{
'use strict';
const BASE_FAR=1400,MED_FAR=1020,HIGH_FAR=720;
let camera=null,lastFar=BASE_FAR,lastMode='low',nextProbe=0;
const tick=now=>{if(now<nextProbe){requestAnimationFrame(tick);return}nextProbe=now+120;camera=window.__coastlineCamera||camera;if(camera){const speed=Math.abs(Number(window.__coastlineSpeed||0)),perf=window.__coastlinePerf||{};let target=speed>34?HIGH_FAR:speed>18?MED_FAR:BASE_FAR;if(Number(perf.slowFrames||0)>=8)target=Math.min(target,650);lastFar+=(target-lastFar)*.28;if(Math.abs(camera.far-lastFar)>2){camera.far=lastFar;camera.updateProjectionMatrix()}const mode=target===BASE_FAR?'low':target===MED_FAR?'medium':'high';if(mode!==lastMode){document.documentElement.dataset.coastlineHighSpeed=mode;lastMode=mode}window.__coastlinePerf=Object.assign({},perf,{farViewScale:lastFar/BASE_FAR,cameraFar:lastFar})}requestAnimationFrame(tick)};requestAnimationFrame(tick);
})();</script><script id="coastline-mobile-performance">(()=>{
'use strict';
let sampleStart=performance.now(),last=sampleStart,frames=0,slow=0;
const sample=now=>{const dt=now-last;last=now;frames++;if(dt>28)slow++;if(now-sampleStart>=1000){window.__coastlinePerf=Object.assign({},window.__coastlinePerf||{},{fps:frames,slowFrames:slow,frameBudgetMs:1000/60});frames=0;slow=0;sampleStart=now}requestAnimationFrame(sample)};requestAnimationFrame(sample);
})();</script>`;
function patchFullBetaHtml(text){
 let out=text;
 const old="const kind=v.kind||'car',accel=(keys.w?1:0)-(keys.s?1:0),steer=(keys.d?1:0)-(keys.a?1:0);";
 const replacement="const kind=v.kind||'car',accel=(keys.w?1:0)-(keys.s?1:0),steer=((keys.d?1:0)-(keys.a?1:0))*(window.__coastlineSteerScale||1);";
 if(out.includes(old))out=out.replace(old,replacement);
 out=out.replace("new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'})","new THREE.WebGLRenderer({antialias:false,powerPreference:'high-performance',stencil:false,depth:true,preserveDrawingBuffer:false})");
 out=out.replace("renderer.shadowMap.type=THREE.PCFSoftShadowMap","renderer.shadowMap.type=THREE.PCFShadowMap");
 const qualityHook="const lowPowerDevice=innerWidth<=760||(navigator.hardwareConcurrency||8)<=4||(navigator.deviceMemory||8)<=4;";
 if(out.includes(qualityHook)&&!out.includes('coastline-mobile-shadow-governor'))out=out.replace(qualityHook,qualityHook+"\nif(lowPowerDevice)renderer.shadowMap.enabled=false;");
 const cameraHook="renderer.setPixelRatio(currentPixelRatio);renderer.setSize(innerWidth,innerHeight);";
 if(out.includes(cameraHook)&&!out.includes('coastline-camera-performance-bridge'))out=out.replace(cameraHook,cameraHook+"window.__coastlineCamera=camera;window.__coastlineSpeed=0;window.__coastlineCameraPerformanceBridge=true;");
 const speedHook='const speed=$(';
 if(out.includes(speedHook)&&!out.includes('coastline-speed-performance-hook'))out=out.replace(speedHook,"window.__coastlineSpeed=Number($('speed')?.textContent||0);\n"+speedHook);
 const runtimeImport="import { CoastlineAIRuntime } from './coastline-ai-runtime.js';";
 const moduleAnchor="import { OutputPass } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/postprocessing/OutputPass.js';";
 if(out.includes(moduleAnchor)&&!out.includes(runtimeImport))out=out.replace(moduleAnchor,moduleAnchor+'\n'+runtimeImport);
 const playerAnchor='player.vehicle.occupied=true;';
 if(out.includes(playerAnchor)&&!out.includes('coastlineAI=new CoastlineAIRuntime'))out=out.replace(playerAnchor,playerAnchor+"const coastlineAI=new CoastlineAIRuntime({THREE,scene,renderer,camera,getPlayer:()=>player,getMode:()=>player.mode,getTraffic:()=>vehicles.filter(v=>v.ai),getNPCs:()=>pedestrians});");
 const loopAnchor='updateEnvironment(dt,now);';
 if(out.includes(loopAnchor)&&!out.includes('coastlineAI.update(dt,now)'))out=out.replace(loopAnchor,loopAnchor+'coastlineAI.update(dt,now);');
 if(out.includes('</head>'))out=out.replace('</head>',FULL_BETA_PATCH+'</head>');
 return out;
}
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(CORE).catch(()=>{})).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{const request=event.request;if(request.method!=='GET')return;const url=new URL(request.url);if(url.origin!==self.location.origin)return;const isHtml=request.mode==='navigate'||request.destination==='document'||url.pathname.endsWith('.html');if(isHtml){event.respondWith(fetch(request).then(async response=>{if(!response.ok)return response;let result=response;if(url.pathname.endsWith('/game-v3.html')){const source=await response.text();const patched=patchFullBetaHtml(source);result=new Response(patched,{status:response.status,statusText:response.statusText,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}})}caches.open(CACHE_NAME).then(cache=>cache.put(request,result.clone()));return result}).catch(()=>caches.match(request).then(c=>c||caches.match('./index.html'))));return}event.respondWith(caches.match(request).then(cached=>{const network=fetch(request).then(response=>{if(response.ok)caches.open(CACHE_NAME).then(cache=>cache.put(request,response.clone()));return response}).catch(()=>cached);return cached||network}))});