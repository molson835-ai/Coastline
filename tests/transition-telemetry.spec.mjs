import test from 'node:test';
import assert from 'node:assert/strict';
import { TransitionTelemetry } from '../src/transition/transition-telemetry.mjs';
function clockFrom(values = [100, 110, 125, 140, 160, 190]) {
  let index = 0; return () => values[Math.min(index++, values.length - 1)];
}
test('records completion and lifecycle milestone durations', () => {
  const telemetry = new TransitionTelemetry({ clock: clockFrom() });
  telemetry.start('t-1', { sourceWorldId: 'a', destinationWorldId: 'b', gateId: 'bridge-a-b', gateType: 'physical' });
  telemetry.mark('t-1', 'PRELOADING'); telemetry.mark('t-1', 'WARMING');
  const complete = telemetry.complete('t-1', { state: 'COMPLETE', cleanupWarnings: [] });
  assert.equal(complete.status, 'COMPLETE'); assert.equal(complete.durationMs, 40);
  assert.equal(complete.milestonesMs.PRELOADING, 10); assert.equal(complete.sourceWorldId, 'a');
  assert.equal(complete.destinationWorldId, 'b'); assert.ok(complete.events.some(e => e.name === 'COMPLETE'));
});
test('records compact failure and cancellation without arbitrary payloads', () => {
  const telemetry = new TransitionTelemetry({ clock: clockFrom([10,20,30,40]) });
  telemetry.start('fail-1', { sourceWorldId: 'a', destinationWorldId: 'b' });
  const failed = telemetry.fail('fail-1', { state: 'FAILED', failure: {name:'Error',message:'asset fetch failed',code:'ASSET_LOAD'}, playerStateSnapshot:{money:999999} });
  assert.equal(failed.status, 'FAILED'); assert.equal(failed.failure.message, 'asset fetch failed');
  assert.equal(Object.hasOwn(failed, 'playerStateSnapshot'), false); assert.equal(JSON.stringify(failed).includes('money'), false);
  telemetry.start('cancel-1');
  assert.equal(telemetry.fail('cancel-1', {failure:{name:'TransitionCancelledError',message:'cancelled',code:'TRANSITION_CANCELLED'}}).status, 'CANCELLED');
});
test('bounds retained records and counts evictions', () => {
  const telemetry = new TransitionTelemetry({ maxRecords:2, clock:clockFrom([1,2,3,4,5,6]) });
  telemetry.start('a'); telemetry.start('b'); telemetry.start('c');
  assert.deepEqual(telemetry.snapshot().records.map(r=>r.id), ['b','c']);
  assert.equal(telemetry.snapshot().size, 2); assert.equal(telemetry.snapshot().droppedRecords, 1); assert.equal(telemetry.get('a'), null);
});
test('bounds events while preserving the newest lifecycle events', () => {
  const telemetry = new TransitionTelemetry({ maxEventsPerRecord:3, clock:clockFrom([10,20,30,40,50,60]) });
  telemetry.start('bounded'); telemetry.mark('bounded','PRELOADING'); telemetry.mark('bounded','WARMING'); telemetry.mark('bounded','READY');
  const record=telemetry.get('bounded'); assert.equal(record.events.length,3); assert.equal(record.droppedEvents,1);
  assert.deepEqual(record.events.map(e=>e.name), ['PRELOADING','WARMING','READY']);
});
test('resource samples are whitelisted and bounded', () => {
  const telemetry=new TransitionTelemetry({maxResourceSamplesPerRecord:2,clock:clockFrom([1,2,3,4,5])});
  telemetry.start('resources'); telemetry.sampleResources('resources',{meshes:25,triangles:1000,textures:8,secret:'ignore',npcs:-1});
  telemetry.sampleResources('resources',{meshes:28,drawCalls:14}); telemetry.sampleResources('resources',{meshes:31});
  const record=telemetry.get('resources'); assert.equal(record.resources.length,2); assert.equal(record.droppedResourceSamples,1);
  assert.equal(record.resources[0].drawCalls,14); assert.equal(Object.hasOwn(record.resources[0],'secret'),false); assert.equal(Object.hasOwn(record.resources[0],'npcs'),false);
});
test('snapshots are isolated copies and duplicate start does not reset a record', () => {
  const telemetry=new TransitionTelemetry({clock:clockFrom([5,10,15])}); telemetry.start('stable',{sourceWorldId:'a'}); telemetry.mark('stable','READY');
  const external=telemetry.get('stable'); external.events.length=0; telemetry.start('stable',{sourceWorldId:'overwritten'});
  const again=telemetry.get('stable'); assert.equal(again.sourceWorldId,'a'); assert.ok(again.events.some(e=>e.name==='READY'));
});
test('integrates with TransitionManager lifecycle hooks', async () => {
  const {TransitionManager}=await import('../src/transition/transition-manager.mjs');
  const {WorldLoaderAdapter}=await import('../src/transition/world-loader-adapter.mjs');
  const {testWorld,testGate}=await import('./fixtures/transition-worlds.mjs');
  const telemetry=new TransitionTelemetry();
  const manager=new TransitionManager({telemetry,idFactory:()=> 'instrumented-transition',loader:new WorldLoaderAdapter({
    preload:async()=>({dispose(){}}),warm:async i=>i.setState('WARMED'),activate:async i=>i.setState('ACTIVE'),deactivate:async i=>i.setState('DEACTIVATED')
  })});
  manager.registerWorld(testWorld('world-a')); manager.registerWorld(testWorld('world-b')); await manager.initializeWorld('world-a');
  await manager.requestTransition({gate:testGate('world-a','world-b')}).promise;
  const record=telemetry.get('instrumented-transition'); assert.equal(record.status,'COMPLETE');
  assert.equal(record.sourceWorldId,'world-a'); assert.equal(record.destinationWorldId,'world-b');
  assert.ok(record.events.some(e=>e.name==='ACTIVATING'));
});
test('validates capacities, IDs and clock output', () => {
  assert.throws(()=>new TransitionTelemetry({maxRecords:0}),/maxRecords/);
  assert.throws(()=>new TransitionTelemetry({maxEventsPerRecord:-1}),/maxEventsPerRecord/);
  assert.throws(()=>new TransitionTelemetry({clock:()=>NaN}).start('bad-clock'),/finite timestamp/);
  assert.throws(()=>new TransitionTelemetry().start(''),/ID is required/);
});
