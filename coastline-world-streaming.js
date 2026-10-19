// Coastline Fidelity Core: simulation/render separation for large-world streaming.
const DEFAULT_CELL_SIZE=200;

export function createWorldCellStream({ cellSize=DEFAULT_CELL_SIZE, maxActiveCells=36 }={}) {
  const cells=new Map();
  let centerKey=null;
  const key=(cx,cz)=>`${cx}:${cz}`;
  const coords=(x,z)=>({cx:Math.floor(x/cellSize),cz:Math.floor(z/cellSize)});
  const required=(cx,cz,radius)=>{
    const out=[];
    for(let dz=-radius;dz<=radius;dz++)for(let dx=-radius;dx<=radius;dx++)out.push({cx:cx+dx,cz:cz+dz,distance:Math.max(Math.abs(dx),Math.abs(dz))});
    return out.sort((a,b)=>a.distance-b.distance);
  };
  return {
    cellSize,
    update(x,z,{radius=3,load,unload}={}){
      const {cx,cz}=coords(x,z);centerKey=key(cx,cz);
      const desired=required(cx,cz,radius).slice(0,maxActiveCells);
      const wanted=new Set(desired.map(c=>key(c.cx,c.cz)));
      for(const c of desired){const k=key(c.cx,c.cz);if(!cells.has(k)){const record={...c,key:k,state:'loading'};cells.set(k,record);load?.(record);record.state='active';}}
      for(const [k,record] of cells){if(!wanted.has(k)){cells.delete(k);record.state='unloaded';unload?.(record);}}
      return {center:{cx,cz,key:centerKey},active:[...cells.values()],count:cells.size};
    },
    has(cx,cz){return cells.has(key(cx,cz));},
    active(){return [...cells.values()];},
    center(){return centerKey;},
    clear(unload){for(const record of cells.values())unload?.(record);cells.clear();centerKey=null;}
  };
}

export function createObjectLod(distanceBands=[40,100,220,500]) {
  return {
    select(distance){for(let i=0;i<distanceBands.length;i++)if(distance<=distanceBands[i])return i;return distanceBands.length;},
    visible(distance,maxDistance=distanceBands.at(-1)){return distance<=maxDistance;}
  };
}

/**
 * Hide distant render objects without changing their simulation or collision state.
 * A separate show/hide threshold prevents visible popping at cell boundaries.
 */
export function createDistanceVisibilityController({ showDistance=500, hideDistance=600 }={}) {
  const show=Number.isFinite(showDistance)&&showDistance>=0?showDistance:500;
  const hide=Number.isFinite(hideDistance)&&hideDistance>=show?hideDistance:NaN;
  if(!Number.isFinite(hide))throw new Error('hideDistance must be greater than or equal to showDistance');
  const records=new Map();
  const restore=record=>{
    if(record.culled&&record.object)record.object.visible=record.baseVisible;
    record.culled=false;
  };
  return {
    register(id,{object,getPosition,isCritical=()=>false}={}) {
      if(id===undefined||id===null)throw new Error('id is required');
      if(!object||typeof object!=='object')throw new Error('object is required');
      if(typeof getPosition!=='function')throw new Error('getPosition must be a function');
      if(records.has(id))restore(records.get(id));
      records.set(id,{object,getPosition,isCritical,baseVisible:object.visible!==false,culled:false});
      return records.size;
    },
    unregister(id) {
      const record=records.get(id);
      if(!record)return false;
      restore(record);
      records.delete(id);
      return true;
    },
    update(x,z) {
      const originX=Number.isFinite(x)?x:0,originZ=Number.isFinite(z)?z:0;
      let hidden=0,shown=0,culled=0;
      for(const record of records.values()) {
        if(!record.baseVisible)continue;
        let position;
        try { position=record.getPosition(); } catch { continue; }
        if(!position||!Number.isFinite(position.x)||!Number.isFinite(position.z))continue;
        if(record.isCritical()) {
          if(record.culled)shown++;
          record.object.visible=true;
          record.culled=false;
          continue;
        }
        const distance=Math.hypot(position.x-originX,position.z-originZ);
        if(!record.culled&&distance>hide) {
          record.object.visible=false;
          record.culled=true;
          hidden++;
        } else if(record.culled&&distance<show) {
          record.object.visible=true;
          record.culled=false;
          shown++;
        }
        if(record.culled)culled++;
      }
      return {size:records.size,culled,hidden,shown};
    },
    clear() {
      for(const record of records.values())restore(record);
      records.clear();
    },
    size() { return records.size; }
  };
}
