const RELEASE_ID='20261019-core-sandbox-5';
const CACHE_NAME=`coastline-static-v-${RELEASE_ID}`;
const CORE=['./','./index.html','./coastline-cinematic-v2.html','./game-v3.html','./vehicle-visual-enhancer.js','./cinematic-world-upgrade.js','./coastline-runtime-fix.js','./coastline-stability-v8.js','./car-customization.js','./world-model.js','./world-engine.js','./living-world.js','./douglassville-layout.js','./realism-library.js','./presentation-runtime.js','./cinematic-visual-library.js','./cinematic-animation-library.js','./cinematic-environment-library.js','./replayability-engine.js','./npc-agency-engine.js','./npc-world-slice.js','./social-rumor-engine.js','./player-reputation-engine.js','./coastline-ai-runtime.js','./coastline-live-ops.js','./coastline-render-config.js','./coastline-fidelity-budget.js','./coastline-world-streaming.js','./coastline-instancing.js','./coastline-fidelity-bridge.js'];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(CORE).catch(()=>{})).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});

async function networkFirst(request,cachedFallback=true){
  try{
    const freshRequest=new Request(request,{cache:'no-store'});
    let response=await fetch(freshRequest);
    if(response.ok && new URL(request.url).pathname.endsWith('/game-v3.html')) response=await applyCoreSandboxTransform(response);
    if(response.ok){const cache=await caches.open(CACHE_NAME);await cache.put(request,response.clone())}
    return response;
  }catch(error){
    if(!cachedFallback)throw error;
    const cached=await caches.match(request);if(cached)return cached;throw error;
  }
}

async function applyCoreSandboxTransform(response){
  const source=await response.text();
  let html=source;

  // The map is removed from the visible HUD, but a tiny inert canvas remains so
  // legacy map references cannot crash startup. The draw routine is disabled below.
  html=html.replace(/<div id="coastMap"[\s\S]*?<\/div><div id="diag"/,'<canvas id="mapCanvas" width="1" height="1" style="display:none"></canvas><div id="diag"');

  // Do not construct ordinary building interiors up front. The garage is created
  // on demand when its building is entered, preserving the only intended interior.
  html=html.replace('for(const b of buildings)b.interior=createInterior(b);','for(const b of buildings)b.interior=null;');
  html=html.replace("function enterBuilding(b){if(!b||player.mode==='vehicle')return false;", "function enterBuilding(b){if(!b||player.mode==='vehicle')return false;if(!b.interior&&garageLocations.some(s=>s.building===b))b.interior=createInterior(b);");

  // Missions, landmark discovery, garage task chains and replayability encounters are disabled.
  html=html.replaceAll('startMission();','void 0;');
  html=html.replace(/function startMission\(\)\{[\s\S]*?\}\nfunction nearestBench/,'function startMission(){return false}\nfunction nearestBench');
  html=html.replace(/function checkLandmarkDiscovery\(\)\{[\s\S]*?\}\nconst mission=/,'function checkLandmarkDiscovery(){return 0}\nconst mission=');
  html=html.replace(/function startGarageChain\([^)]*\)\{[\s\S]*?\}\nfunction finishGarageStep/,'function startGarageChain(){return false}\nfunction finishGarageStep');
  html=html.replace(/function missionUpdate\(\)\{[\s\S]*?\}\nfunction updateMissionPrompt/,'function missionUpdate(){}\nfunction updateMissionPrompt');
  html=html.replace(/function updateMissionPrompt\([^)]*\)\{[\s\S]*?\}\nfunction cameraUpdate/,'function updateMissionPrompt(){}\nfunction cameraUpdate');
  html=html.replace(/function updateReplayability\([^)]*\)\{[\s\S]*?\}\nconst avatar=/,'function updateReplayability(){}\nconst avatar=');

  // Pedestrians remain visible ambient scenery but no longer run AI/collision/interaction behavior.
  html=html.replace(/function pedestrianBlocked\([^)]*\)\{[\s\S]*?\}/,'function pedestrianBlocked(){return false}');
  html=html.replace(/function updatePedestrians\([^)]*\)\{[\s\S]*?\}\nfunction missionUpdate/,'function updatePedestrians(){}\nfunction missionUpdate');
  html=html.replace(/function interact\(\)\{[\s\S]*?\}\nfunction exitVehicle/,'function interact(){if(paused)return;if(player.mode===\'vehicle\'){exitVehicle();return}if(player.mode===\'interior\'){exitBuilding();return}const garage=nearestGarage();if(garage){openGarage(garage);return}const v=nearestVehicle();if(v){enterVehicle(v);return}const b=nearestBuilding();if(b){enterBuilding(b);return}}\nfunction exitVehicle');

  // Remove map rendering and waypoint work from the frame loop while leaving the
  // inert canvas reference above for compatibility with the legacy code.
  html=html.replace(/function drawCoastMap\(\)\{[\s\S]*?\}\nmapCanvas\.addEventListener/,'function drawCoastMap(){}\nmapCanvas.addEventListener');
  html=html.replace(/mapCanvas\.addEventListener\('click',[\s\S]*?\}\);\nmapCanvas\.addEventListener\('touchend',[\s\S]*?\},\{passive:true\}\);/,'');
  html=html.replace(/if\(now-lastMapDraw>=100\)\{drawCoastMap\(\);lastMapDraw=now\}/,'');

  return new Response(html,{status:response.status,statusText:response.statusText,headers:response.headers});
}

self.addEventListener('fetch',event=>{
  const request=event.request;if(request.method!=='GET')return;
  const url=new URL(request.url);if(url.origin!==self.location.origin)return;
  const isHtml=request.mode==='navigate'||request.destination==='document'||url.pathname.endsWith('.html');
  const isExecutable=request.destination==='script'||url.pathname.endsWith('.js')||url.pathname.endsWith('.mjs');
  if(isHtml||isExecutable){event.respondWith(networkFirst(request,true).catch(()=>caches.match(request).then(c=>c||caches.match('./index.html'))));return}
  event.respondWith(caches.match(request).then(cached=>{if(cached)return cached;return fetch(request).then(response=>{if(response.ok)caches.open(CACHE_NAME).then(cache=>cache.put(request,response.clone()));return response})}));
});
