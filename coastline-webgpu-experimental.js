// Coastline WebGPU experiment. This never replaces the production renderer automatically.
export async function createExperimentalRenderer({ THREE, canvas, width=innerWidth, height=innerHeight, pixelRatio=devicePixelRatio||1 }={}) {
  if(!THREE) throw new Error('THREE is required');
  if(!('gpu' in navigator)) return { supported:false, renderer:null, reason:'WebGPU unavailable' };
  try {
    const renderer=new THREE.WebGPURenderer({canvas,antialias:true,powerPreference:'high-performance'});
    renderer.setPixelRatio(Math.min(pixelRatio,1.75));
    renderer.setSize(width,height,false);
    await renderer.init();
    return { supported:true, renderer, backend:'webgpu' };
  } catch(error) {
    return { supported:false, renderer:null, reason:String(error?.message||error) };
  }
}

export function createRenderBackend({ renderer, backend='webgl' }={}) {
  if(!renderer) throw new Error('renderer is required');
  return Object.freeze({
    backend,
    render(scene,camera){ return renderer.render(scene,camera); },
    resize(width,height){ renderer.setSize(width,height,false); },
    dispose(){ renderer.dispose?.(); }
  });
}