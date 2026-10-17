const CACHE_NAME='coastline-static-v32';
const CORE=['./game-v3.html','./coastline-runtime-fix.js','./coastline-stability-v8.js','./coastline-visual-v32.js'];
const RUNTIME_PATCH='<script id="coastline-runtime-v32" src="./coastline-runtime-fix.js"></script><script id="coastline-stability-v8" src="./coastline-stability-v8.js"></script><script id="coastline-visual-v32" src="./coastline-visual-v32.js"></script>';
function patch(text){
 let out=text;
 if(out.includes('</head>')&&!out.includes('coastline-runtime-v32'))out=out.replace('</head>',RUNTIME_PATCH+'</head>');
 out=out.replace('const worldArchitecture=createWorldArchitecture(worldModel);','const worldArchitecture=createWorldArchitecture(worldModel);window.__coastlineHooks={scene,camera,renderer,composer,worldArchitecture};');
 out=out.replace("const strafe=(keys['KeyD']?1:0)-(keys['KeyA']?1:0);","const strafe=(keys['KeyA']?1:0)-(keys['KeyD']?1:0);");
 out=out.replace("steer=(left?1:0)-(right?1:0);","steer=(right?1:0)-(left?1:0);");
 out=out.replace('new THREE.WebGLRenderer({antialias:true,powerPreference:\'high-performance\'})','new THREE.WebGLRenderer({antialias:false,powerPreference:\'high-performance\',alpha:false,preserveDrawingBuffer:false})');
 out=out.replace('renderer.shadowMap.enabled=true;','renderer.shadowMap.enabled=!lowPowerDevice;renderer.shadowMap.autoUpdate=!lowPowerDevice;');
 out=out.replace('const reflectionCanvas=document.createElement(\'canvas\');reflectionCanvas.width=1024;reflectionCanvas.height=512;','const reflectionCanvas=document.createElement(\'canvas\');reflectionCanvas.width=lowPowerDevice?512:1024;reflectionCanvas.height=lowPowerDevice?256:512;');
 out=out.replace('const composer=new EffectComposer(renderer);\ncomposer.addPass(new RenderPass(scene,camera));\nconst bloomPass=new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.38,.38,.74);\ncomposer.addPass(bloomPass);\ncomposer.addPass(new OutputPass());','const composer=lowPowerDevice?null:new EffectComposer(renderer);const bloomPass=lowPowerDevice?{enabled:false}:new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.38,.38,.74);if(composer){composer.addPass(new RenderPass(scene,camera));composer.addPass(bloomPass);composer.addPass(new OutputPass());}const coastlineRenderFrame=()=>composer?composer.render():renderer.render(scene,camera);');
 out=out.replace(/composer\.render\(\)/g,'coastlineRenderFrame()');
 out=out.replace('composer.setSize(innerWidth,innerHeight)','if(composer)composer.setSize(innerWidth,innerHeight)');
 out=out.replace('renderer.compile(scene,camera);','if(!lowPowerDevice)renderer.compile(scene,camera);');
 return out;
}
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(CORE).catch(()=>{})).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);if(u.origin!==self.location.origin)return;const html=r.mode==='navigate'||r.destination==='document'||u.pathname.endsWith('.html');if(html){e.respondWith(fetch(r).then(async res=>{if(!res.ok)return res;const body=await res.text();const patched=u.pathname.endsWith('/game-v3.html')?patch(body):body;const out=new Response(patched,{status:res.status,statusText:res.statusText,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});caches.open(CACHE_NAME).then(c=>c.put(r,out.clone()));return out}).catch(()=>caches.match(r)));return}e.respondWith(caches.match(r).then(c=>c||fetch(r).then(res=>{if(res.ok)caches.open(CACHE_NAME).then(x=>x.put(r,res.clone()));return res})))});
