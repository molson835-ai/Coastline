(()=>{
'use strict';
const TAG='CoastlineStabilityV8';
const R=window.__coastlineRuntime||{};
R.stabilityTag=TAG;
R.contextLossCount=R.contextLossCount||0;
R.steeringNormalized=true;

// The previous crash signature is consistent with the browser refusing another WebGL
// context after a renderer crash/reload cycle. Always release Coastline's GPU context
// when the page is hidden/unloaded so the next beta launch starts cleanly.
function releaseGraphics(){
  try{
    const renderer=window.__coastlineRuntime?.renderer;
    if(renderer){
      try{renderer.renderLists?.dispose?.()}catch{}
      try{renderer.dispose?.()}catch{}
      try{renderer.forceContextLoss?.()}catch{}
    }
    document.querySelectorAll('canvas').forEach(canvas=>{
      try{const gl=canvas.getContext('webgl2')||canvas.getContext('webgl')||canvas.getContext('experimental-webgl');gl?.getExtension('WEBGL_lose_context')?.loseContext()}catch{}
    });
  }catch{}
}
window.addEventListener('pagehide',releaseGraphics,{capture:true});
window.addEventListener('beforeunload',releaseGraphics,{capture:true});

// Normalize vehicle steering at the input boundary. The current game build's native
// A/D interpretation has regressed intermittently; this keeps left/right semantics
// stable without changing the physics implementation.
const held=new Set();
const opposite=k=>k==='a'?'d':k==='d'?'a':k;
function synthetic(type,key){
  const e=new KeyboardEvent(type,{key,bubbles:true,cancelable:true});
  Object.defineProperty(e,'__coastlineSteeringNormalized',{value:true});
  window.dispatchEvent(e);
}
window.addEventListener('keydown',e=>{
  if(e.__coastlineSteeringNormalized)return;
  const k=e.key?.toLowerCase();
  if(k==='a'||k==='d'){
    e.preventDefault();e.stopImmediatePropagation();
    if(!held.has(k)){held.add(k);synthetic('keydown',opposite(k));}
  }
},true);
window.addEventListener('keyup',e=>{
  if(e.__coastlineSteeringNormalized)return;
  const k=e.key?.toLowerCase();
  if(k==='a'||k==='d'){
    e.preventDefault();e.stopImmediatePropagation();
    held.delete(k);synthetic('keyup',opposite(k));
  }
},true);
window.addEventListener('blur',()=>{for(const k of [...held]){held.delete(k);synthetic('keyup',opposite(k));}},true);

// Touch controls use the same normalized keyboard path. Stop the original touch
// handler from firing so a single press cannot produce opposite steering twice.
function normalizeTouch(e){
  const b=e.target?.closest?.('[data-k]');
  if(!b)return;
  const k=b.getAttribute('data-k');
  if(k!=='a'&&k!=='d')return;
  e.stopImmediatePropagation();
  const mapped=opposite(k);
  if(e.type==='pointerdown'||e.type==='touchstart'){if(!held.has(k)){held.add(k);synthetic('keydown',mapped)}}
  else if(e.type==='pointerup'||e.type==='pointercancel'||e.type==='touchend'){if(held.has(k)){held.delete(k);synthetic('keyup',mapped)}}
}
for(const type of ['pointerdown','pointerup','pointercancel','touchstart','touchend'])window.addEventListener(type,normalizeTouch,true);

// If WebGL context creation fails, expose a useful diagnostic instead of allowing
// an unhandled constructor exception to collapse into a blank page.
window.addEventListener('error',e=>{
  if(String(e.message||'').includes('Error creating WebGL context')){
    R.contextLossCount=(R.contextLossCount||0)+1;
    console.warn(TAG,'WebGL context unavailable; prior context was released on page exit.',e.error||e.message);
  }
},true);

window.__coastlineStabilitySnapshot=()=>({tag:TAG,contextLossCount:R.contextLossCount||0,steeringNormalized:true});
})();
