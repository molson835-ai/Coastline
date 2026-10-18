const assert=require('node:assert/strict');
const fs=require('node:fs');

(async()=>{
  const {createCoastlineRenderConfig}=await import('../coastline-render-config.js');
  const {createFidelityBudget}=await import('../coastline-fidelity-budget.js');
  const {createWorldCellStream,createObjectLod}=await import('../coastline-world-streaming.js');

  const full=createCoastlineRenderConfig({width:1200,cores:8,memory:8});
  const constrained=createCoastlineRenderConfig({width:390,cores:4,memory:4});
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
  assert.ok(gameHtml.includes('window.__coastlineTreeStats={version:1,trees:treeCount,drawBatches:treeBatches.size,instanced:true}'));
  assert.ok(gameHtml.includes('new THREE.InstancedMesh(batch.geometry,batch.material,batch.matrices.length)'));
  assert.ok(!gameHtml.includes('const seed=worldModel.hash(x,z,21),tree=new THREE.Group()'));

  const enhancer=fs.readFileSync(new URL('../vehicle-visual-enhancer.js', 'file://' + __dirname + '/'), 'utf8');
  const loader=fs.readFileSync(new URL('../coastline-vehicle-asset-loader.js', 'file://' + __dirname + '/'), 'utf8');
  const cinematic=fs.readFileSync(new URL('../cinematic-world-upgrade.js', 'file://' + __dirname + '/'), 'utf8');
  const itchBuild=fs.readFileSync(new URL('../scripts/build-itch.mjs', 'file://' + __dirname + '/'), 'utf8');
  assert.ok(enhancer.includes("./coastline-vehicle-asset-loader.js"));
  assert.ok(enhancer.includes("./assets/vehicles/coastline-hero.glb"));
  assert.ok(enhancer.includes('authoredAssetPending:true'));
  assert.ok(loader.includes("GLTFLoader"));
  assert.ok(loader.includes("./assets/vehicles/coastline-hero.glb"));
  assert.ok(loader.includes("source:'authored-glb'"));
  assert.ok(cinematic.includes("quality:'CINEMATIC-DAYLIGHT'"));
  assert.ok(cinematic.includes("lightRig:'key-fill-rim-hemi'"));
  assert.ok(itchBuild.includes("'coastline-vehicle-asset-loader.js'"));

  console.log('fidelity core tests passed');
})();
