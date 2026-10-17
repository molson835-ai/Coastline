const CACHE_NAME='coastline-static-v19';
const CORE=['./','./index.html','./coastline-cinematic-v2.html','./game-v3.html','./coastline-runtime-fix.js','./coastline-stability-v8.js','./world-model.js','./world-engine.js','./living-world.js','./douglassville-layout.js','./realism-library.js','./presentation-runtime.js','./cinematic-visual-library.js','./cinematic-animation-library.js','./cinematic-environment-library.js','./replayability-engine.js','./npc-agency-engine.js','./npc-world-slice.js','./social-rumor-engine.js','./player-reputation-engine.js','./coastline-ai-runtime.js','./coastline-live-ops.js'];
const RUNTIME_PATCH='<script id="coastline-runtime-v19" src="./coastline-runtime-fix.js"></script><script id="coastline-stability-v8" src="./coastline-stability-v8.js"></script>';
function patchFullBetaHtml(text){
 let out=text;
 if(out.includes('</head>')&&!out.includes('coastline-runtime-v19'))out=out.replace('</head>',RUNTIME_PATCH+'</head>');
 if(out.includes('function physicsStep()')&&!out.includes('coastlineSteerSince')){
   out=out.replace('function physicsStep(){','let coastlineSteerSince=0,coastlineSteerLast=0;\nfunction physicsStep(){');
   out=out.replace('steer=(left?1:0)-(right?1:0),angle=steer*.5;','steer=(left?1:0)-(right?1:0);if(steer!==coastlineSteerLast){coastlineSteerSince=performance.now();coastlineSteerLast=steer}const steerHeldSeconds=steer?Math.max(0,(performance.now()-coastlineSteerSince)/1000):0,angle=steer*Math.min(.62,.16+steerHeldSeconds*.58);');
 }
 out=out.replace('b.position.set(x,y+h/2-.1,z);','y=Math.max(y,3.02);b.position.set(x,y+h/2-.1,z);');
 out=out.replace(/r\.position\.y\+\.1/g,'r.position.y+.16').replace(/r\.position\.y\+\.095/g,'r.position.y+.145');
 out=out.replace('audioMaster.gain.value=audioEnabled ? .62 : 0','audioMaster.gain.value=audioEnabled ? .16 : 0');
 out=out.replace("new AC();audioMaster","new AC({latencyHint:'interactive',sampleRate:22050});audioMaster");
 out=out.replace('new THREE.WebGLRenderer({antialias:true,powerPreference:\'high-performance\'})','new THREE.WebGLRenderer({antialias:false,powerPreference:\'high-performance\',alpha:false,preserveDrawingBuffer:false})');
 out=out.replace('lowPowerDevice?.9:1.15','lowPowerDevice?.58:1.0');
 out=out.replace('renderer.shadowMap.enabled=true;','renderer.shadowMap.enabled=!lowPowerDevice;renderer.shadowMap.autoUpdate=!lowPowerDevice;');
 out=out.replace('const reflectionCanvas=document.createElement(\'canvas\');reflectionCanvas.width=1024;reflectionCanvas.height=512;','const reflectionCanvas=document.createElement(\'canvas\');reflectionCanvas.width=lowPowerDevice?512:1024;reflectionCanvas.height=lowPowerDevice?256:512;');
 out=out.replace('const composer=new EffectComposer(renderer);\ncomposer.addPass(new RenderPass(scene,camera));\nconst bloomPass=new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.38,.38,.74);\ncomposer.addPass(bloomPass);\ncomposer.addPass(new OutputPass());','if(lowPowerDevice){const s=document.createElement(\'style\');s.textContent=\'.card,#coastMap{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}.card{box-shadow:none!important}.bug-report{box-shadow:none!important}\';document.head.appendChild(s)}\nconst composer=lowPowerDevice?null:new EffectComposer(renderer);\nconst bloomPass=lowPowerDevice?{enabled:false}:new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.38,.38,.74);\nif(composer){composer.addPass(new RenderPass(scene,camera));composer.addPass(bloomPass);composer.addPass(new OutputPass());}\nconst coastlineRenderFrame=()=>composer?composer.render():renderer.render(scene,camera);');
 out=out.replace('if(lowPowerDevice){bloomPass.enabled=false;composer.render=()=>renderer.render(scene,camera);}else if','if(lowPowerDevice){}else if');
 out=out.replace('if(lowPowerDevice)bloomPass.enabled=false;','if(lowPowerDevice){}');
 out=out.replace(/composer\.render\(\)/g,'coastlineRenderFrame()');
 out=out.replace('function loop(now){requestAnimationFrame(loop);if(document.hidden){','function loop(now){requestAnimationFrame(loop);if(lowPowerDevice&&now-(window.__coastlineLastDraw||0)<33)return;window.__coastlineLastDraw=now;if(document.hidden){');
 out=out.replace('renderer.compile(scene,camera);','if(!lowPowerDevice)renderer.compile(scene,camera);');
 return out;
}
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(CORE).catch(()=>{})).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{const request=event.request;if(request.method!=='GET')return;const url=new URL(request.url);if(url.origin!==self.location.origin)return;const isHtml=request.mode==='navigate'||request.destination==='document'||url.pathname.endsWith('.html');if(isHtml){event.respondWith(fetch(request).then(async response=>{if(!response.ok)return response;let result=response;if(url.pathname.endsWith('/game-v3.html')){const source=await response.text();const patched=patchFullBetaHtml(source);result=new Response(patched,{status:response.status,statusText:response.statusText,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}})}caches.open(CACHE_NAME).then(cache=>cache.put(request,result.clone()));return result}).catch(()=>caches.match(request).then(c=>c||caches.match('./index.html'))));return}event.respondWith(caches.match(request).then(cached=>{const network=fetch(request).then(response=>{if(response.ok)caches.open(CACHE_NAME).then(cache=>cache.put(request,response.clone()));return response}).catch(()=>cached);return cached||network}))});
