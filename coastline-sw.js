const RELEASE_ID='20261019-fidelity-cache-1';
const CACHE_NAME=`coastline-static-v-${RELEASE_ID}`;
const CORE=['./','./index.html','./coastline-cinematic-v2.html','./game-v3.html','./vehicle-visual-enhancer.js','./cinematic-world-upgrade.js','./coastline-runtime-fix.js','./coastline-stability-v8.js','./car-customization.js','./world-model.js','./world-engine.js','./living-world.js','./douglassville-layout.js','./realism-library.js','./presentation-runtime.js','./cinematic-visual-library.js','./cinematic-animation-library.js','./cinematic-environment-library.js','./replayability-engine.js','./npc-agency-engine.js','./npc-world-slice.js','./social-rumor-engine.js','./player-reputation-engine.js','./coastline-ai-runtime.js','./coastline-live-ops.js','./coastline-render-config.js','./coastline-fidelity-budget.js','./coastline-world-streaming.js','./coastline-instancing.js','./coastline-fidelity-bridge.js'];

// Delivery layer only: rendering configuration and runtime hooks belong to the app.
// Executable code is network-first so a beta deployment is never intentionally
// held behind an older service-worker cache while the origin is reachable.
self.addEventListener('install',event=>{
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache=>cache.addAll(CORE).catch(()=>{}))
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

async function networkFirst(request,cachedFallback=true){
  try{
    // Bypass the browser HTTP cache for executable app code. The active deployment
    // remains authoritative whenever the origin is reachable.
    const freshRequest=new Request(request,{cache:'no-store'});
    const response=await fetch(freshRequest);
    if(response.ok){
      const cache=await caches.open(CACHE_NAME);
      await cache.put(request,response.clone());
    }
    return response;
  }catch(error){
    if(!cachedFallback)throw error;
    const cached=await caches.match(request);
    if(cached)return cached;
    throw error;
  }
}

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;

  const isHtml=request.mode==='navigate'||request.destination==='document'||url.pathname.endsWith('.html');
  const isExecutable=request.destination==='script'||url.pathname.endsWith('.js')||url.pathname.endsWith('.mjs');

  if(isHtml||isExecutable){
    event.respondWith(networkFirst(request,true).catch(()=>caches.match(request).then(c=>c||caches.match('./index.html'))));
    return;
  }

  // Non-executable static assets can remain cache-first for performance/offline use.
  event.respondWith(
    caches.match(request).then(cached=>{
      if(cached)return cached;
      return fetch(request).then(response=>{
        if(response.ok)caches.open(CACHE_NAME).then(cache=>cache.put(request,response.clone()));
        return response;
      });
    })
  );
});
