const RELEASE_ID='20261019-core-sandbox-3';
const CACHE_NAME=`coastline-static-v-${RELEASE_ID}`;
const CORE=['./','./index.html','./coastline-cinematic-v2.html','./game-v3.html','./vehicle-visual-enhancer.js','./cinematic-world-upgrade.js','./coastline-runtime-fix.js','./coastline-stability-v8.js','./car-customization.js','./world-model.js','./world-engine.js','./living-world.js','./douglassville-layout.js','./realism-library.js','./presentation-runtime.js','./cinematic-visual-library.js','./cinematic-animation-library.js','./cinematic-environment-library.js','./replayability-engine.js','./npc-agency-engine.js','./npc-world-slice.js','./social-rumor-engine.js','./player-reputation-engine.js','./coastline-ai-runtime.js','./coastline-live-ops.js','./coastline-render-config.js','./coastline-fidelity-budget.js','./coastline-world-streaming.js','./coastline-instancing.js','./coastline-fidelity-bridge.js'];

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
    const freshRequest=new Request(request,{cache:'no-store'});
    let response=await fetch(freshRequest);
    if(response.ok && new URL(request.url).pathname.endsWith('/game-v3.html')) response=await applyCoreSandboxTransform(response);
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

async function applyCoreSandboxTransform(response){
  const source=await response.text();
  let html=source;

  // Remove the map from the delivered shell rather than merely hiding it.
  html=html.replace(/<div id="coastMap"[\s\S]*?<\/div><div id="diag"/,'<div id="diag"');

  // Do not construct ordinary building interiors up front. The garage is created
  // on demand when its building is entered, preserving the only intended interior.
  html=html.replace('for(const b of buildings)b.interior=createInterior(b);','for(const b of buildings)b.interior=null;');
  html=html.replace("function enterBuilding(b){if(!b||player.mode==='vehicle')return false;", "function enterBuilding(b){if(!b||player.mode==='vehicle')return false;if(!b.interior&&garageLocations.some(s=>s.building===b))b.interior=createInterior(b);");

  // Mission, landmark, garage-task and replayability activity triggers are deferred.
  html=html.replaceAll('startMission();','void 0;');
  html=html.replace(/function checkLandmarkDiscovery\(\)\{[\s\S]*?\}\nconst mission=/,'function checkLandmarkDiscovery(){return 0}\nconst mission=');
  html=html.replace(/function startGarageChain\([^)]*\)\{[\s\S]*?\}\nfunction finishGarageStep/,'function startGarageChain(){return false}\nfunction finishGarageStep');
  html=html.replace(/function missionUpdate\(\)\{[\s\S]*?\}\nfunction updateMissionPrompt/,'function missionUpdate(){}\nfunction updateMissionPrompt');
  html=html.replace(/function updateMissionPrompt\([^)]*\)\{[\s\S]*?\}\nfunction cameraUpdate/,'function updateMissionPrompt(){}\nfunction cameraUpdate');

  // Pedestrians remain visible ambient scenery but stop consuming an AI/collision
  // update every frame. This also removes player-to-pedestrian interaction.
  html=html.replace(/function pedestrianBlocked\([^)]*\)\{[\s\S]*?\}/,'function pedestrianBlocked(){return false}');
  html=html.replace(/function updatePedestrians\([^)]*\)\{[\s\S]*?\}\nfunction missionUpdate/,'function updatePedestrians(){}\nfunction missionUpdate');

  return new Response(html,{status:response.status,statusText:response.statusText,headers:response.headers});
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
