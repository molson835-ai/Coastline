const assert=require('node:assert/strict');

(async()=>{
  const {
    createAdaptiveWorldBudget,
    evaluateWorldBudget
  }=await import('../coastline-adaptive-world-budget.js');

  const budget=createAdaptiveWorldBudget({heroDistance:24,nearDistance:80,midDistance:180,farDistance:360});

  const nearby=evaluateWorldBudget({budget,distance:12,visible:true,category:'vegetation'});
  assert.equal(nearby.detailTier,'hero');
  assert.equal(nearby.simulationTier,'full');
  assert.equal(nearby.shadowEligible,true);
  assert.equal(nearby.collisionRequired,false);
  assert.equal(nearby.interactionRequired,false);
  assert.equal(nearby.updateIntervalMs,0);

  const mid=evaluateWorldBudget({budget,distance:120,visible:true,category:'building'});
  assert.equal(mid.detailTier,'mid');
  assert.equal(mid.simulationTier,'reduced');
  assert.equal(mid.shadowEligible,false);
  assert.equal(mid.updateIntervalMs,250);

  const far=evaluateWorldBudget({budget,distance:500,visible:true,category:'tree'});
  assert.equal(far.detailTier,'far');
  assert.equal(far.simulationTier,'minimal');
  assert.equal(far.updateIntervalMs,1000);

  const hidden=evaluateWorldBudget({budget,distance:120,visible:false,category:'prop'});
  assert.equal(hidden.detailTier,'hidden');
  assert.equal(hidden.simulationTier,'off');
  assert.equal(hidden.shadowEligible,false);
  assert.equal(hidden.updateIntervalMs,Infinity);

  const critical=evaluateWorldBudget({budget,distance:1000,visible:false,category:'garage',gameplayCritical:true,interactive:true});
  assert.equal(critical.detailTier,'hero');
  assert.equal(critical.simulationTier,'full');
  assert.equal(critical.shadowEligible,true);
  assert.equal(critical.collisionRequired,true);
  assert.equal(critical.interactionRequired,true);
  assert.equal(critical.updateIntervalMs,0);

  const interactive=evaluateWorldBudget({budget,distance:500,visible:false,category:'traffic',interactive:true,collisionRequired:true});
  assert.equal(interactive.collisionRequired,true);
  assert.equal(interactive.interactionRequired,true);
  assert.notEqual(interactive.simulationTier,'off');

  const invalid=evaluateWorldBudget({budget,distance:NaN,visible:true,category:'npc'});
  assert.equal(invalid.detailTier,'hero');
  assert.equal(invalid.simulationTier,'full');

  console.log('adaptive world budget tests passed');
})();
