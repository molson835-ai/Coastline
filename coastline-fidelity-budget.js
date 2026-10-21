// Coastline Fidelity Core: bounded work budgets for each frame.
export function createFidelityBudget(config={}) {
  const targetFrameMs=config.targetFrameMs??16.67;
  const constrained=config.profile==='constrained';
  return {
    version:1,
    targetFrameMs,
    cpu:{
      simulationMs:constrained?4.5:6,
      npcMs:constrained?1.5:2.5,
      streamingMs:constrained?1:1.5,
      miscMs:constrained?1:1.5
    },
    gpu:{
      drawCalls:constrained?350:900,
      triangles:constrained?650000:1800000,
      textureMB:constrained?220:480,
      shadowCasters:constrained?80:220,
      reflectionUpdatesPerFrame:constrained?0:1
    },
    scheduler:{
      maxNpcUpdatesPerFrame:constrained?10:22,
      maxStreamingOpsPerFrame:constrained?2:4,
      maxLodChangesPerFrame:constrained?18:40
    }
  };
}

export function createFrameBudgetScheduler(budget) {
  const queues=new Map();
  return {
    enqueue(kind,task,priority=0){
      if(typeof task!=='function')return;
      if(!queues.has(kind))queues.set(kind,[]);
      queues.get(kind).push({task,priority});
      queues.get(kind).sort((a,b)=>b.priority-a.priority);
    },
    run(kind,limit){
      const q=queues.get(kind)||[];let ran=0;
      while(q.length&&ran<limit){q.shift().task();ran++;}
      return ran;
    },
    pending(kind){return (queues.get(kind)||[]).length;},
    budget
  };
}

/**
 * Distance-aware cadence for ambient traffic. Nearby traffic stays frame-synchronous;
 * only distant AI is scheduled less often. This does not change render quality.
 */
export function selectTrafficUpdateIntervalMs(distance,{nearDistance=120,midDistance=300,farDistance=600}={}) {
  if(!Number.isFinite(distance)||distance<0)return 0;
  if(distance<=nearDistance)return 0;
  if(distance<=midDistance)return 33;
  if(distance<=farDistance)return 50;
  return 200;
}
