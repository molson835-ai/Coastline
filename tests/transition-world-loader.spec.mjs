import test from 'node:test';
import assert from 'node:assert/strict';
import { WorldLoaderAdapter } from '../src/transition/world-loader-adapter.mjs';

const manifest = { id:'world-a', version:1, assetManifest:[], entryPoints:[], gates:[], spawnPoints:[{id:'spawn'}], memoryBudget:1, streamingPriority:1, collisionPolicy:{}, aiPolicy:{}, missionPolicy:{}, environment:{}, persistencePolicy:{} };

test('runs preload, warm, activate, deactivate and dispose exactly once', async () => {
  const calls=[];
  const loader=new WorldLoaderAdapter({ preload:async()=>({dispose:()=>calls.push('resource-dispose')}), warm:async()=>calls.push('warm'), activate:async()=>calls.push('activate'), deactivate:async()=>calls.push('deactivate'), dispose:async()=>calls.push('dispose') });
  const instance=await loader.preload(manifest);
  await loader.warm(instance); await loader.activate(instance); await loader.deactivate(instance); await loader.dispose(instance); await loader.dispose(instance);
  assert.deepEqual(calls,['warm','activate','deactivate','dispose','resource-dispose']);
  assert.equal(instance.state,'DISPOSED');
});

test('propagates preload failure', async () => {
  const loader=new WorldLoaderAdapter({ preload:async()=>{ throw new Error('load failed'); } });
  await assert.rejects(loader.preload(manifest), /load failed/);
});
