/* Coastline AI Simulation Worker
 * Pure-data work only: no scene objects, DOM, renderer, or generated code execution.
 * Deterministic outputs make scenarios reproducible and regression-testable.
 */
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function hash(x,z){return (((x*73856093)^(z*19349663)^0xC0A57)>>>0)}
function district(seed){return ['WATERFRONT','DOWNTOWN','RESIDENTIAL','INDUSTRIAL','PARKLAND','RETAIL'][seed%6]}
function classifyDistance(d){return d<180?'NEAR':d<500?'MID':'FAR'}
function tick(data){
 const p=data.player||{x:0,z:0},fps=Number(data.fps)||60,traffic=data.traffic||[];
 const cells=[];
 for(let dz=-2;dz<=2;dz++)for(let dx=-2;dx<=2;dx++){
  const x=Math.round(p.x/400)+dx,z=Math.round(p.z/400)+dz,key=x+':'+z;
  const seed=hash(x,z),dist=Math.hypot(x*400-p.x,z*400-p.z);
  cells.push({key,x:x*400,z:z*400,seed,district:district(seed),distance:Math.round(dist),lod:classifyDistance(dist)});
 }
 const budget=fps<24?{aiHz:2,maxActiveNPCs:12,maxTrafficUpdates:10,worldBuildsPerTick:0,quality:'EMERGENCY'}:
 fps<35?{aiHz:5,maxActiveNPCs:24,maxTrafficUpdates:18,worldBuildsPerTick:1,quality:'REDUCED'}:
 fps<50?{aiHz:8,maxActiveNPCs:48,maxTrafficUpdates:28,worldBuildsPerTick:2,quality:'BALANCED'}:
 {aiHz:12,maxActiveNPCs:80,maxTrafficUpdates:traffic.length,worldBuildsPerTick:3,quality:'FULL'};
 const trafficHealth=traffic.slice(0,200).map(t=>({id:t.id,stalled:!!t.stalled,dist:Math.round(Math.hypot((t.x||0)-p.x,(t.z||0)-p.z)),lod:classifyDistance(Math.hypot((t.x||0)-p.x,(t.z||0)-p.z))}));
 return {type:'COASTLINE_AI_TICK_RESULT',seq:data.seq,at:Date.now(),budget,cells,trafficHealth,summary:{cells:cells.length,near:cells.filter(c=>c.lod==='NEAR').length,mid:cells.filter(c=>c.lod==='MID').length,far:cells.filter(c=>c.lod==='FAR').length,traffic:traffic.length}};
}
self.onmessage=e=>{const d=e.data||{};if(d.type==='TICK'){try{self.postMessage(tick(d))}catch(err){self.postMessage({type:'COASTLINE_AI_ERROR',seq:d.seq,message:String(err?.message||err)})}}};
