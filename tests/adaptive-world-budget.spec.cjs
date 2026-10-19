const assert=require('node:assert/strict');

(async()=>{
  const {
    createAdaptiveWorldBudget,
    evaluateWorldBudget
  }=await import('../coastline-adaptive-world-budget.js');

  const budget=createAdaptiveWorldBudget({heroDistance:24,nearDistance:80,midDistance:180,farDistance:360});

  test('nearby visible content keeps highest detail and normal updates',()=>{
    const result=evaluateWorldBudget({budget,distance:12,visible:true,category:'vegetation'});
    assert.equal(result.detailTier,'hero');
    assert.equal(result.simulationTier,'full');
    assert.equal(result.shadowEligible,true);
    assert.equal(result.collisionRequired,false);
    assert.equal(result.interactionRequired,false);
    assert.equal(result.updateIntervalMs,0);
  });

  test('mid-range visible content preserves visual presence while reducing simulation work',()=>{
    const result=evaluateWorldBudget({budget,distance:120,visible:true,category:'building'});
    assert.equal(result.detailTier,'mid');
    assert.equal(result.simulationTier,'reduced');
    assert.equal(result.shadowEligible,false);
    assert.equal(result.updateIntervalMs,250);
  });

  test('far visible content keeps a cheap representation',()=>{
    const result=evaluateWorldBudget({budget,distance:500,visible:true,category:'tree'});
    assert.equal(result.detailTier,'far');
    assert.equal(result.simulationTier,'minimal');
    assert.equal(result.updateIntervalMs,1000);
  });

  test('hidden non-critical content is render/update suppressed',()=>{
    const result=evaluateWorldBudget({budget,distance:120,visible:false,category:'prop'});
    assert.equal(result.detailTier,'hidden');
    assert.equal(result.simulationTier,'off');
    assert.equal(result.shadowEligible,false);
    assert.equal(result.updateIntervalMs,Infinity);
  });

  test('gameplay-critical content cannot be downgraded by distance or visibility',()=>{
    const result=evaluateWorldBudget({budget,distance:1000,visible:false,category:'garage',gameplayCritical:true,interactive:true});
    assert.equal(result.detailTier,'hero');
    assert.equal(result.simulationTier,'full');
    assert.equal(result.shadowEligible,true);
    assert.equal(result.collisionRequired,true);
    assert.equal(result.interactionRequired,true);
    assert.equal(result.updateIntervalMs,0);
  });

  test('interactive content preserves interaction and collision requirements',()=>{
    const result=evaluateWorldBudget({budget,distance:500,visible:false,category:'traffic',interactive:true,collisionRequired:true});
    assert.equal(result.collisionRequired,true);
    assert.equal(result.interactionRequired,true);
    assert.notEqual(result.simulationTier,'off');
  });

  test('invalid distances fail closed to hero detail rather than silently disabling gameplay',()=>{
    const result=evaluateWorldBudget({budget,distance:NaN,visible:true,category:'npc'});
    assert.equal(result.detailTier,'hero');
    assert.equal(result.simulationTier,'full');
  });

  console.log('adaptive world budget tests passed');
})();
