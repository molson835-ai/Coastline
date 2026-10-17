(()=>{
'use strict';
/* Startup recovery: the loading UI must never become a permanent dead-end. */
const state=window.__coastlineStartupRecovery={started:performance.now(),lastProgress:performance.now(),lastLabel:'',frames:0,hidden:false};
const text=()=>document.getElementById('loadText');
const detail=()=>document.getElementById('loadDetail');
const load=()=>document.getElementById('load');
function markProgress(){state.lastProgress=performance.now();state.lastLabel=text()?.textContent||''}
window.addEventListener('coastline:progress',markProgress);
function hide(){const l=load();if(!l||state.hidden)return;state.hidden=true;l.classList.add('done');l.style.pointerEvents='none';l.style.opacity='0';l.style.transition='opacity .35s ease';setTimeout(()=>{l.style.display='none'},400)}
function tick(){
 const l=load();if(!l||state.hidden)return;
 const now=performance.now();
 const canvas=document.querySelector('canvas');
 if(canvas&&canvas.width>0&&canvas.height>0)state.frames++;
 /* Once a real canvas has rendered repeatedly, the player should never be trapped by a stale loading panel. */
 if(state.frames>=8&&now-state.started>4500){hide();return}
 /* A long stall after progress is evidence that the UI is waiting on a nonessential world-system batch. */
 if(now-state.lastProgress>10000&&state.frames>=2){
   const d=detail();if(d)d.textContent='WORLD SYSTEMS CONTINUE INITIALIZING IN BACKGROUND';
   hide();
 }
}
setInterval(tick,750);
window.__coastlineHideStartup=hide;
})();