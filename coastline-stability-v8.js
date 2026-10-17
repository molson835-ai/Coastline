(()=>{
'use strict';
const TAG='CoastlineStabilityV10';
const R=window.__coastlineRuntime||{};
R.stabilityTag=TAG;
R.contextLossCount=R.contextLossCount||0;
R.steeringNormalized=false;
R.inputTelemetry=R.inputTelemetry||{a:0,d:0,down:0,up:0};

// Stability layer must never rewrite player input. Vehicle control has one authority;
// this layer only observes input and protects renderer lifecycle.
function releaseGraphics(){
  try{
    const renderer=window.__coastlineRuntime?.renderer;
    if(renderer){
      try{renderer.setAnimationLoop?.(null)}catch{}
      try{renderer.renderLists?.dispose?.()}catch{}
      try{renderer.dispose?.()}catch{}
      try{renderer.forceContextLoss?.()}catch{}
    }
  }catch{}
}
window.addEventListener('pagehide',releaseGraphics,{capture:true});
window.addEventListener('beforeunload',releaseGraphics,{capture:true});

window.addEventListener('keydown',e=>{
  const k=e.key?.toLowerCase();
  if(k==='a'||k==='d'){
    R.inputTelemetry[k]++;
    R.inputTelemetry.down++;
  }
},{capture:true,passive:true});
window.addEventListener('keyup',e=>{
  const k=e.key?.toLowerCase();
  if(k==='a'||k==='d')R.inputTelemetry.up++;
},{capture:true,passive:true});

window.addEventListener('pointerdown',e=>{
  const k=e.target?.closest?.('[data-k]')?.getAttribute?.('data-k');
  if(k==='a'||k==='d')R.inputTelemetry[k]++;
},{capture:true,passive:true});

window.addEventListener('error',e=>{
  if(String(e.message||'').includes('Error creating WebGL context')){
    R.contextLossCount=(R.contextLossCount||0)+1;
    console.warn(TAG,'WebGL context unavailable; renderer cleanup was attempted before unload.',e.error||e.message);
  }
},{capture:true});
window.addEventListener('webglcontextlost',()=>{R.contextLossCount=(R.contextLossCount||0)+1},{capture:true});
window.__coastlineStabilitySnapshot=()=>({tag:TAG,contextLossCount:R.contextLossCount||0,steeringNormalized:false,inputTelemetry:{...R.inputTelemetry}});
})();
