import { detectCoastlineDeviceProfile, createCoastlineRenderConfig, applyCoastlineRendererConfig } from './coastline-render-config.js';
import { createFidelityBudget } from './coastline-fidelity-budget.js';

const profile=detectCoastlineDeviceProfile();
const config=createCoastlineRenderConfig(profile);
const budget=createFidelityBudget(config);
window.__coastlineFidelity={version:1,profile,config,budget};

const apply=()=>{
  const hooks=window.__coastlineHooks;
  if(!hooks?.renderer)return false;
  applyCoastlineRendererConfig({renderer:hooks.renderer,config});
  const runtime=window.__coastlineRuntime;
  if(runtime){
    runtime.fidelityConfig=config;
    runtime.fidelityBudget=budget;
    runtime.far=Math.min(runtime.far,config.maxVisibleWorldCells*config.targetFrameMs);
  }
  return true;
};
if(!apply()){
  const timer=setInterval(()=>{if(apply())clearInterval(timer)},250);
  setTimeout(()=>clearInterval(timer),10000);
}
