/* Coastline AI Dev Team
 * Browser-safe development director. These agents inspect telemetry and produce bounded,
 * actionable recommendations without executing generated code inside the player session.
 * A future server-side AI endpoint can replace the deterministic recommendations.
 */
const DEV_AGENTS=[
  {id:'perf',name:'PERFORMANCE DEV',focus:'frame pacing, GPU budget, streaming, LOD'},
  {id:'graphics',name:'GRAPHICS DEV',focus:'lighting, materials, geometry, visual quality'},
  {id:'vehicle',name:'VEHICLE DEV',focus:'steering, handling, collision, camera'},
  {id:'qa',name:'QA DEV',focus:'regressions, startup, stability, reproducibility'}
];
function perfState(){
  const p=window.__coastlinePerf||{}; return {fps:Number(p.fps)||0,slowFrames:Number(p.slowFrames)||0};
}
function recommendations(){
  const {fps,slowFrames}=perfState();
  const out=[];
  if(fps&&fps<30){out.push(['perf','CRITICAL','Reduce GPU pressure first; keep distant simulation dormant and protect the close-range visual budget.']);out.push(['graphics','HOLD','Do not increase scene density until frame pacing is stable.']);}
  else if(fps&&fps<45){out.push(['perf','HIGH','Frame pacing is below the 45 FPS gate; prioritize LOD/visibility and traffic cadence.']);out.push(['graphics','TUNE','Spend recovered budget on close-range lighting/material detail, not distant objects.']);}
  else {out.push(['perf','OK','Frame budget is healthy enough to begin a controlled visual-quality increase.']);out.push(['graphics','READY','Increase close-range material/lighting quality in small validated steps.']);}
  if(slowFrames>10)out.push(['qa','WATCH','Long-frame spikes detected; test high-speed driving and district transitions before promoting.']);
  out.push(['vehicle','WATCH','Verify physical LEFT/RIGHT input after every controller patch; never rely on the visual button glyph alone.']);
  return out;
}
export function installCoastlineAIDevs(){
  if(typeof document==='undefined'||document.getElementById('coastAIDevs'))return;
  const style=document.createElement('style');style.textContent=`#coastAIDevs{position:fixed;left:12px;bottom:12px;z-index:85;width:min(430px,calc(100vw - 24px));display:none;background:rgba(4,12,18,.95);border:1px solid rgba(126,223,255,.35);border-radius:12px;color:#dff7ff;padding:12px;font:11px/1.4 ui-monospace,SFMono-Regular,Consolas,monospace;box-shadow:0 14px 44px #0009;backdrop-filter:blur(12px)}#coastAIDevs.open{display:block}#coastAIDevs h3{margin:0 0 8px;color:#8de9ff;font-size:12px;letter-spacing:.12em}#coastAIDevs .agents{display:grid;grid-template-columns:1fr 1fr;gap:5px}.coast-dev{padding:7px;border:1px solid #ffffff1c;border-radius:7px;background:#0b202b}.coast-dev b{display:block;color:#fff}.coast-dev small{color:#8ca9b5}.coast-dev em{display:block;margin-top:4px;color:#a8d8e4;font-style:normal}.coast-ai-foot{margin-top:8px;color:#7898a5;font-size:9px}`;document.head.appendChild(style);
  const el=document.createElement('section');el.id='coastAIDevs';el.innerHTML='<h3>COASTLINE // AI DEV TEAM</h3><div class="agents"></div><div class="coast-ai-foot">Deterministic safe director · no generated code executes in the player session</div>';document.body.appendChild(el);
  const render=()=>{const grid=el.querySelector('.agents');const rec=new Map(recommendations().map(r=>[r[0],r]));grid.innerHTML=DEV_AGENTS.map(a=>{const r=rec.get(a.id)||[a.id,'IDLE','Monitoring'];return `<div class="coast-dev"><b>${a.name}</b><small>${a.focus}</small><em>${r[1]} · ${r[2]}</em></div>`}).join('')};
  render();setInterval(render,2000);addEventListener('keydown',e=>{if(e.key==='F4'||e.code==='NumpadDivide'){e.preventDefault();el.classList.toggle('open');render()}},true);
  window.__coastlineAIDevs={agents:DEV_AGENTS,recommendations,open:()=>{el.classList.add('open');render()},close:()=>el.classList.remove('open')};
}
installCoastlineAIDevs();