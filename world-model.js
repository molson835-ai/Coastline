// Coastline world guard is installed from an early gameplay module so the
// runtime and tests share the same world boundary. Vehicle A/D steering is
// intentionally NOT rewritten here: coastline-sw.js already owns the physical
// mapping, where A/left is left and D/right is right.
if (typeof window !== 'undefined' && !window.__coastlineWorldGuardInstalled) {
  window.__coastlineWorldGuardInstalled = true;

  // A manually selected inactive world must not accidentally inherit the City
  // root. Real CTM transitions replace this sentinel with the destination root.
  let activeWorldValue = window.__coastlineActiveWorldId;
  const inactiveWorldSentinel = { name: 'coastline-inactive-world-sentinel' };
  const existingActiveWorldDescriptor = Object.getOwnPropertyDescriptor(window, '__coastlineActiveWorldId');
  if (!existingActiveWorldDescriptor || existingActiveWorldDescriptor.configurable) {
    Object.defineProperty(window, '__coastlineActiveWorldId', {
      configurable: true,
      enumerable: true,
      get: () => activeWorldValue,
      set: value => {
        activeWorldValue = value;
        if (value !== 'city' && (!window.__coastlineActiveWorldRoot || window.__coastlineActiveWorldRoot.name === 'coastline-city-root')) {
          window.__coastlineActiveWorldRoot = inactiveWorldSentinel;
        }
      },
    });
  }
}

// Coastline 2.1 world truth: deterministic terrain, road hierarchy, lanes, sidewalks,
// parking, regions and streaming-friendly spatial data. The design borrows principles
// repeatedly visible in top-tier open worlds: handcrafted-feeling road flow, distinct
// regional identities, stable building pads, and cheap multi-scale terrain detail.
const smooth = t => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const hash = (x, z, seed = 0) => { const n = Math.sin((x + seed * 13.17) * 127.1 + (z - seed * 7.31) * 311.7) * 43758.5453; return n - Math.floor(n); };
const noise = (x, z, seed) => { const x0 = Math.floor(x), z0 = Math.floor(z), fx = smooth(x - x0), fz = smooth(z - z0); const a = hash(x0,z0,seed), b = hash(x0+1,z0,seed), c = hash(x0,z0+1,seed), d = hash(x0+1,z0+1,seed); return lerp(lerp(a,b,fx),lerp(c,d,fx),fz)*2-1; };

export function createWorldModel({ citySize = 1500, roadSpacing = 200, roadWidth = 15, roadSurfaceY = 3, seed = 0 } = {}) {
  const halfSize = citySize / 2, roadHalfWidth = roadWidth / 2;
  const roadOffset = (x,z) => ({ x:Math.abs(x-Math.round(x/roadSpacing)*roadSpacing), z:Math.abs(z-Math.round(z/roadSpacing)*roadSpacing) });
  const nearestRoad = (x,z) => { const o=roadOffset(x,z); return o.x<=o.z ? {x:Math.round(x/roadSpacing)*roadSpacing,z,axis:'vertical',distance:o.x} : {x,z:Math.round(z/roadSpacing)*roadSpacing,axis:'horizontal',distance:o.z}; };
  const isRoadCorridor = (x,z,extraWidth=0) => { const o=roadOffset(x,z), half=roadHalfWidth+extraWidth; return o.x<=half || o.z<=half; };
  const regionAt = (x,z) => { const distance=Math.hypot(x,z); if(Math.abs(x)>halfSize*.88||Math.abs(z)>halfSize*.88)return 'highway-edge'; if(distance<260)return 'city'; if(distance<470)return 'suburbs'; return 'countryside'; };

  // Multi-scale landscape: macro landform for readable silhouettes, meso undulation
  // for driving texture, and restrained micro detail. Roads and building sites remain
  // deliberately stable so terrain never fights vehicle/collision systems.
  const landscapeHeight = (x,z) => {
    const region=regionAt(x,z);
    const macro=noise(x*.00155,z*.00155,seed+11)*5.6;
    const meso=noise(x*.0048,z*.0048,seed+29)*2.5;
    const rolling=noise(x*.012,z*.012,seed+47)*.8;
    const micro=noise(x*.038,z*.038,seed+61)*.24;
    const ridge=(Math.sin((x+seed*19)*.004)+Math.cos((z-seed*13)*.003))*0.48;
    const regionalLift=region==='countryside'?1.15:region==='suburbs'?.35:region==='highway-edge'?.2:0;
    return roadSurfaceY+macro+meso+rolling+micro+ridge+regionalLift;
  };

  const blockCenter=v=>Math.round((v-roadSpacing/2)/roadSpacing)*roadSpacing+roadSpacing/2;
  const groundY = (x,z) => {
    const raw=landscapeHeight(x,z);
    const siteX=blockCenter(x),siteZ=blockCenter(z),siteHeight=landscapeHeight(siteX,siteZ);
    const siteDistance=Math.max(Math.abs(x-siteX),Math.abs(z-siteZ));
    const siteBlend=1-smoothstep(72,90,siteDistance);
    const blockTerrain=lerp(raw,siteHeight,siteBlend);
    const o=roadOffset(x,z), roadBlend=smoothstep(11,40,Math.min(o.x,o.z));
    return lerp(roadSurfaceY,blockTerrain,roadBlend);
  };

  const groundNormal = (x,z) => { const e=.75, dx=(groundY(x+e,z)-groundY(x-e,z))/(2*e), dz=(groundY(x,z+e)-groundY(x,z-e))/(2*e); const len=Math.hypot(dx,1,dz)||1; return {x:-dx/len,y:1/len,z:-dz/len}; };
  const terrainProfile = (x,z) => { const region=regionAt(x,z), slope=groundNormal(x,z), moisture=clamp(.5-noise(x*.002,z*.002,seed+73)*.28-(region==='highway-edge'?.12:0),.08,.92), roughness=region==='city'?.86:region==='suburbs'?.76:region==='countryside'?.68:.8; return {region,moisture,roughness,slope:{x:slope.x,y:slope.y,z:slope.z},road:isRoadCorridor(x,z,2)}; };

  const regionKey = (x,z,chunkSize=200) => `${Math.floor((x+halfSize)/chunkSize)}:${Math.floor((z+halfSize)/chunkSize)}`;
  const cellBounds = (x,z,cellSize=200) => { const cx=Math.floor((x+halfSize)/cellSize),cz=Math.floor((z+halfSize)/cellSize); return {cx,cz,key:`${cx}:${cz}`,minX:cx*cellSize-halfSize,maxX:(cx+1)*cellSize-halfSize,minZ:cz*cellSize-halfSize,maxZ:(cz+1)*cellSize-halfSize}; };
  const bridgeBuffer = (x,z,margin=0) => Math.abs(x)<=10+margin && z>=-860-margin && z<=-700+margin;
  const inBounds = (x,z,margin=0) => bridgeBuffer(x,z,margin) || (Math.abs(x)<=halfSize-margin&&Math.abs(z)<=halfSize-margin);
  const roadId = (x,z) => { const r=nearestRoad(x,z); return `${r.axis}:${Math.round((r.axis==='vertical'?r.x:r.z)/roadSpacing)}:${Math.round((r.axis==='vertical'?r.z:r.x)/roadSpacing)}`; };
  const roadLane = (x,z,laneOffset=4.2) => { const r=nearestRoad(x,z); return r.axis==='vertical'?{x:r.x+laneOffset,z,axis:r.axis}:{x,z:r.z+laneOffset,axis:r.axis}; };
  const sidewalk = (x,z,side=1,inset=11.5) => { const r=nearestRoad(x,z); return r.axis==='vertical'?{x:r.x+side*inset,z,axis:r.axis}:{x:inset?x:x,z:r.z+side*inset,axis:r.axis}; };
  const shoulder = (x,z,side=1,inset=9.3) => { const r=nearestRoad(x,z); return r.axis==='vertical'?{x:r.x+side*inset,z,axis:r.axis}:{x,z:r.z+side*inset,axis:r.axis}; };
  const parking = (x,z,side=1,slot=0,spacing=8) => { const r=nearestRoad(x,z), along=Math.round((r.axis==='vertical'?z:x)/spacing)*spacing+slot*spacing, curbToSpot=roadHalfWidth+10.5, p=r.axis==='vertical'?{x:r.x+side*curbToSpot,z:along}:{x:along,z:r.z+side*curbToSpot}; return {...p,axis:r.axis,side,slot,roadId:roadId(x,z),rotation:r.axis==='vertical'?(side>0?Math.PI/2:-Math.PI/2):(side>0?0:Math.PI)}; };
  const roadNodes = () => { const nodes=[]; for(let x=-halfSize;x<=halfSize;x+=roadSpacing) for(let z=-halfSize;z<=halfSize;z+=roadSpacing) nodes.push({id:`n:${Math.round(x)}:${Math.round(z)}`,x,z,type:'intersection',region:regionAt(x,z)}); return nodes; };
  return Object.freeze({citySize,halfSize,roadSpacing,roadWidth,roadSurfaceY,seed,groundY,groundNormal,landscapeHeight,terrainProfile,isRoadCorridor,roadOffset,regionAt,regionKey,cellBounds,inBounds,bridgeBuffer,nearestRoad,roadId,roadLane,sidewalk,shoulder,parking,roadNodes,hash});
}
