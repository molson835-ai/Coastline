const assert=require('node:assert/strict');
const fs=require('node:fs');

(async()=>{
  const {detectCoastlineDeviceProfile,createCoastlineRenderConfig}=await import('../coastline-render-config.js');
  const {createFidelityBudget}=await import('../coastline-fidelity-budget.js');
  const {createWorldCellStream,createObjectLod}=await import('../coastline-world-streaming.js');

  const fullProfile=detectCoastlineDeviceProfile({width:1200,cores:8,memory:8});
  const constrainedProfile=detectCoastlineDeviceProfile({width:390,cores:4,memory:4});
  assert.equal(fullProfile.constrained,false);
  assert.equal(constrainedProfile.constrained,true);

  const full=createCoastlineRenderConfig(fullProfile);
  const constrained=createCoastlineRenderConfig(constrainedProfile);
  assert.equal(full.profile,'full');
  assert.equal(constrained.profile,'constrained');
  assert.ok(full.pixelRatioMax>constrained.pixelRatioMax);
  assert.ok(full.maxVisibleWorldCells>constrained.maxVisibleWorldCells);
  assert.equal(full.shadowMapSize,2048);
  assert.equal(constrained.shadowMapSize,1024);
  assert.equal(full.antialias,true);
  assert.equal(constrained.antialias,false);
  assert.equal(full.shadows,true);
  assert.equal(constrained.shadows,false);

  const budget=createFidelityBudget(constrained);
  assert.ok(budget.gpu.drawCalls>0);
  assert.ok(budget.scheduler.maxNpcUpdatesPerFrame>0);
  assert.ok(budget.cpu.simulationMs<constrained.targetFrameMs);

  const stream=createWorldCellStream({cellSize:100,maxActiveCells:9});
  let loaded=0,unloaded=0;
  const first=stream.update(0,0,{radius:3,load:()=>loaded++,unload:()=>unloaded++});
  assert.equal(first.count,9);
  assert.equal(loaded,9);
  const second=stream.update(350,0,{radius:3,load:()=>loaded++,unload:()=>unloaded++});
  assert.equal(second.count,9);
  assert.ok(unloaded>0);

  const lod=createObjectLod([40,100,220]);
  assert.equal(lod.select(20),0);
  assert.equal(lod.select(120),2);
  assert.equal(lod.select(500),3);
  assert.equal(lod.visible(220),true);
  assert.equal(lod.visible(221),false);

  const gameHtml=fs.readFileSync(new URL('../game-v3.html', 'file://' + __dirname + '/'), 'utf8');
  assert.ok(gameHtml.includes('categoryTimingCounts'),'category timing diagnostics should track sample counts');
  assert.ok(gameHtml.includes('v/Math.max(1,diagState.categoryTimingCounts[k])'),'reported category costs should be per-call averages, not unbounded cumulative totals');
  const adaptiveStart=gameHtml.indexOf('function updateAdaptiveQuality');
  const adaptiveEnd=gameHtml.indexOf('\ndocument.body.prepend',adaptiveStart);
  assert.ok(adaptiveStart>=0&&adaptiveEnd>adaptiveStart,'adaptive quality function should remain identifiable for regression checks');
  const adaptiveQuality=gameHtml.slice(adaptiveStart,adaptiveEnd);
  assert.ok(!adaptiveQuality.includes('renderer.setPixelRatio'),'frame pressure must not lower renderer pixel ratio');
  assert.ok(!adaptiveQuality.includes('bloomPass.enabled=false'),'frame pressure must not disable bloom');
  assert.ok(!adaptiveQuality.includes('renderer.shadowMap.enabled=false'),'frame pressure must not disable shadows');
  assert.ok(gameHtml.includes('window.__coastlineTreeStats={version:1,trees:treeCount,drawBatches:treeBatches.size,instanced:true}'));
  assert.ok(gameHtml.includes('new THREE.InstancedMesh(batch.geometry,batch.material,batch.matrices.length)'));
  assert.ok(!gameHtml.includes('const seed=worldModel.hash(x,z,21),tree=new THREE.Group()'));

  assert.ok(gameHtml.includes("createDistanceVisibilityController"),'active game runtime should integrate distance-aware visibility');
  assert.ok(gameHtml.includes('coastlineVehicleVisibility.register'),'traffic visuals should be registered with the visibility controller');
  assert.ok(gameHtml.includes('updateCoastlineVehicleVisibility(now)'),'visibility updates should run from the active frame loop');
  assert.ok(gameHtml.includes('const proxy=group.children[0],detailGroup=new THREE.Group()'),'buildings should retain a silhouette proxy while detail meshes are grouped');
  assert.ok(gameHtml.includes('coastlineBuildingDetailVisibility.register'),'building details should use distance-aware visibility');
  assert.ok(gameHtml.includes('coastlineBuildingDetailVisibility.update(player.x,player.z)'),'building detail visibility should update with player position');
  const vehicleUpdateStart=gameHtml.indexOf('function updateVehicle(dt){');
  const vehicleUpdateEnd=gameHtml.indexOf('\nfunction ',vehicleUpdateStart+10);
  const vehicleUpdate=gameHtml.slice(vehicleUpdateStart,vehicleUpdateEnd);
  assert.ok(vehicleUpdate.includes('for(const o of nearbyVehicles(v.x,v.z,3.3))'),'player collision should use the local traffic spatial broadphase');
  const frameLoopStart=gameHtml.lastIndexOf('measureCategory(\'traffic\',()=>updateAI(dt))');
  const frameLoopEnd=gameHtml.indexOf('measureCategory(\'render\',()=>composer.render())',frameLoopStart);
  const frameLoop=gameHtml.slice(frameLoopStart,frameLoopEnd);
  assert.ok(frameLoop.indexOf('measureCategory(\'traffic\',()=>updateAI(dt))') < frameLoop.indexOf('measureCategory(\'traffic\',()=>rebuildVehicleSpatialGrid())'), 'traffic spatial grid should refresh after AI movement');
  assert.ok(frameLoop.indexOf('measureCategory(\'traffic\',()=>rebuildVehicleSpatialGrid())') < frameLoop.indexOf('measureCategory(\'vehicle\',()=>updateVehicle(dt))'), 'traffic spatial grid must refresh before player collision checks');
  assert.ok(frameLoop.lastIndexOf('measureCategory(\'traffic\',()=>rebuildVehicleSpatialGrid())') > frameLoop.indexOf('measureCategory(\'vehicle\',()=>updateVehicle(dt))'), 'grid should refresh again after player movement for pedestrian proximity');
  assert.ok(gameHtml.includes('new THREE.InstancedMesh(crosswalkStripeAGeo,crosswalkMat,108)'),'crosswalk stripes should use instanced rendering');
  assert.ok(gameHtml.includes('new THREE.InstancedMesh(roadEdgeVerticalGeo,edgeLineMat,14)'),'vertical road edge lines should use instanced rendering');
  assert.ok(gameHtml.includes('new THREE.InstancedMesh(roadEdgeHorizontalGeo,edgeLineMat,14)'),'horizontal road edge lines should use instanced rendering');
  assert.ok(!gameHtml.includes('const stripeA=new THREE.Mesh(new THREE.BoxGeometry(1.25,.035,.48),crosswalkMat)'),'crosswalk stripes should not create one mesh per stripe');
  assert.ok(!gameHtml.includes('const left=new THREE.Mesh(new THREE.BoxGeometry(.16,.035,1500),edgeLineMat)'),'road edges should not create one mesh per line');
  assert.ok(!vehicleUpdate.includes('for(const o of vehicles){if(o===v||airborne)'),'player collision should not scan the full traffic fleet every frame');
  const enhancer=fs.readFileSync(new URL('../vehicle-visual-enhancer.js', 'file://' + __dirname + '/'), 'utf8');
  const loader=fs.readFileSync(new URL('../coastline-vehicle-asset-loader.js', 'file://' + __dirname + '/'), 'utf8');
  const cinematic=fs.readFileSync(new URL('../cinematic-world-upgrade.js', 'file://' + __dirname + '/'), 'utf8');
  const itchBuild=fs.readFileSync(new URL('../scripts/build-itch.mjs', 'file://' + __dirname + '/'), 'utf8');
  assert.ok(enhancer.includes("./coastline-vehicle-asset-loader.js"));
  assert.ok(enhancer.includes("./assets/vehicles/coastline-hero.glb"));
  assert.ok(enhancer.includes('authoredAssetPending:true'));
  assert.ok(loader.includes("GLTFLoader"));
  assert.ok(loader.includes("https://cdn.3dassets.dev/assets/32495/v1/model.glb"));
  assert.ok(loader.includes("./assets/vehicles/coastline-hero.glb"));
  assert.ok(loader.includes("source:'authored-glb'"));
  assert.ok(loader.includes('fallbackTried'));
  assert.ok(cinematic.includes("quality:'CINEMATIC-DAYLIGHT'"));
  assert.ok(cinematic.includes("lightRig:'key-fill-rim-hemi'"));
  assert.ok(itchBuild.includes("'coastline-vehicle-asset-loader.js'"));

  console.log('fidelity core tests passed');
})();
