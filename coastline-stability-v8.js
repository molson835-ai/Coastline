(()=>{
'use strict';
const TAG='CoastlineStabilityV9';
const R=window.__coastlineRuntime||{};
R.stabilityTag=TAG;
R.contextLossCount=R.contextLossCount||0;
R.steeringNormalized=false;

// Release only the renderer/context that Coastline created. Do not call getContext()
// during cleanup: doing so can allocate a fresh WebGL context on an otherwise empty canvas.
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

// Native keyboard and touch controls already map A/left to left and D/right to right.
// Do not synthesize opposite keys here: doing so reverses steering and turn controls.


window.addEventListener('error',e=>{
  if(String(e.message||'').includes('Error creating WebGL context')){
    R.contextLossCount=(R.contextLossCount||0)+1;
    console.warn(TAG,'WebGL context unavailable; renderer cleanup was attempted before unload.',e.error||e.message);
  }
},true);
window.addEventListener('webglcontextlost',()=>{R.contextLossCount=(R.contextLossCount||0)+1},{capture:true});
window.__coastlineStabilitySnapshot=()=>({tag:TAG,contextLossCount:R.contextLossCount||0,steeringNormalized:false});
})();
