/* Coastline runtime diagnostics: measurement only, intentionally avoids gameplay mutations. */
(()=>{
  const started=performance.now();
  const state={version:1,startedAt:Date.now(),frames:0,fps:0,lastFrameMs:0,maxFrameMs:0,avgFrameMs:0,render:{calls:0,triangles:0,points:0,lines:0,geometries:0,textures:0},audio:{contexts:0,states:[],baseLatency:[],outputLatency:[]},errors:[],events:[]};
  let last=performance.now(),sum=0,count=0;
  const push=(arr,value,max=24)=>{arr.push(value);if(arr.length>max)arr.shift()};
  const record=(type,data={})=>{push(state.events,{t:Math.round(performance.now()-started),type,...data},80)};
  const report=()=>{
    const r=window.__coastlineRenderer;
    if(r?.info){const i=r.info;state.render={calls:i.render?.calls||0,triangles:i.render?.triangles||0,points:i.render?.points||0,lines:i.render?.lines||0,geometries:i.memory?.geometries||0,textures:i.memory?.textures||0};}
    const a=window.__coastlineAudioContexts||[];state.audio.contexts=a.length;state.audio.states=a.map(x=>x.state);state.audio.baseLatency=a.map(x=>x.baseLatency).filter(Number.isFinite);state.audio.outputLatency=a.map(x=>x.outputLatency).filter(Number.isFinite);
    return JSON.parse(JSON.stringify(state));
  };
  window.__coastlinePerf={state,report,mark:(name,data)=>record(name,data)};
  window.addEventListener('error',e=>{push(state.errors,{t:Math.round(performance.now()-started),message:String(e.message||'error'),source:e.filename||''});});
  window.addEventListener('unhandledrejection',e=>{push(state.errors,{t:Math.round(performance.now()-started),message:'unhandledrejection:'+String(e.reason||'unknown')});});
  const NativeRAF=window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame=(cb)=>NativeRAF(ts=>{const now=performance.now(),dt=now-last;last=now;sum+=dt;count++;state.frames++;state.lastFrameMs=dt;state.maxFrameMs=Math.max(state.maxFrameMs,dt);state.avgFrameMs=sum/count;state.fps=dt>0?1000/dt:0;cb(ts)});
  const NativeAC=window.AudioContext||window.webkitAudioContext;
  if(NativeAC){
    const WrappedAC=function(...args){const ctx=new NativeAC(...args);(window.__coastlineAudioContexts ||= []).push(ctx);record('audio-context-created',{latencyHint:args[0]?.latencyHint||'default',baseLatency:ctx.baseLatency});ctx.addEventListener?.('statechange',()=>record('audio-state',{state:ctx.state}));return ctx};
    WrappedAC.prototype=NativeAC.prototype;try{Object.defineProperty(window,'AudioContext',{value:WrappedAC,configurable:true})}catch{}
    if(window.webkitAudioContext){try{Object.defineProperty(window,'webkitAudioContext',{value:WrappedAC,configurable:true})}catch{}}
  }
  const NativeRenderer=window.THREE?.WebGLRenderer;
  if(NativeRenderer){
    const WrappedRenderer=function(...args){const r=new NativeRenderer(...args);window.__coastlineRenderer=r;record('renderer-created',{pixelRatio:r.getPixelRatio?.()});return r};
    WrappedRenderer.prototype=NativeRenderer.prototype;window.THREE.WebGLRenderer=WrappedRenderer;
  }
  const nativeFetch=window.fetch?.bind(window);
  if(nativeFetch){window.fetch=(...args)=>{const t=performance.now();return nativeFetch(...args).then(r=>{if(performance.now()-t>250)record('slow-fetch',{ms:Math.round(performance.now()-t),url:String(args[0]||'').slice(0,160),status:r.status});return r}).catch(e=>{record('fetch-error',{url:String(args[0]||'').slice(0,160),message:String(e)});throw e})};}
  setInterval(()=>report(),1000);
  window.addEventListener('beforeunload',()=>{try{localStorage.setItem('coastline:lastPerf',JSON.stringify(report()))}catch{}});
})();
