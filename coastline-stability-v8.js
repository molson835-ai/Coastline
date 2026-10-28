(()=>{
'use strict';
const TAG='CoastlineStabilityV9';
const R=window.__coastlineRuntime||{};
R.stabilityTag=TAG;
R.contextLossCount=R.contextLossCount||0;
R.steeringNormalized=true;

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

const held=new Set();
const opposite=k=>k==='a'?'d':k==='d'?'a':k;
const driving=()=>document.getElementById('mode')?.textContent?.trim()==='DRIVING';
function synthetic(type,key){
  const e=new KeyboardEvent(type,{key,bubbles:true,cancelable:true});
  Object.defineProperty(e,'__coastlineSteeringNormalized',{value:true});
  window.dispatchEvent(e);
}
window.addEventListener('keydown',e=>{
  if(e.__coastlineSteeringNormalized)return;
  const k=e.key?.toLowerCase();
  if(k!=='a'&&k!=='d')return;
  if(held.has(k)){e.preventDefault();e.stopImmediatePropagation();return}
  // Apply the same physical left/right direction in vehicles and on foot.
  // The previous conditional skipped the swap while driving, so vehicle controls
  // remained reversed even though the on-foot path was normalized.
  e.preventDefault();e.stopImmediatePropagation();
  held.add(k);synthetic('keydown',opposite(k));
},true);
window.addEventListener('keyup',e=>{
  if(e.__coastlineSteeringNormalized)return;
  const k=e.key?.toLowerCase();
  if((k==='a'||k==='d')&&held.has(k)){
    e.preventDefault();e.stopImmediatePropagation();
    held.delete(k);synthetic('keyup',opposite(k));
  }
},true);
window.addEventListener('blur',()=>{for(const k of [...held]){held.delete(k);synthetic('keyup',opposite(k));}},true);

function normalizeTouch(e){
  const b=e.target?.closest?.('[data-k]');
  if(!b)return;
  const k=b.getAttribute('data-k');
  if(k!=='a'&&k!=='d')return;
  const isStart=e.type==='pointerdown'||e.type==='touchstart';
  if(isStart){
    e.stopImmediatePropagation();
    if(!held.has(k)){held.add(k);synthetic('keydown',opposite(k))}
    return;
  }
  if(!held.has(k))return;
  e.stopImmediatePropagation();
  held.delete(k);synthetic('keyup',opposite(k));
}
for(const type of ['pointerdown','pointerup','pointercancel','touchstart','touchend'])window.addEventListener(type,normalizeTouch,true);

window.addEventListener('error',e=>{
  if(String(e.message||'').includes('Error creating WebGL context')){
    R.contextLossCount=(R.contextLossCount||0)+1;
    console.warn(TAG,'WebGL context unavailable; renderer cleanup was attempted before unload.',e.error||e.message);
  }
},true);
window.addEventListener('webglcontextlost',()=>{R.contextLossCount=(R.contextLossCount||0)+1},{capture:true});
window.__coastlineStabilitySnapshot=()=>({tag:TAG,contextLossCount:R.contextLossCount||0,steeringNormalized:true});
})();
