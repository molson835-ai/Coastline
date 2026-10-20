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
 * Static records are spatially bucketed so an update only visits cells intersecting
 * the visibility radius. Moving records opt into `dynamic:true` and are re-bucketed
 * as they cross cell boundaries. Critical records remain visible regardless of range.
 */
export function createDistanceVisibilityController({ showDistance=500, hideDistance=600, cellSize=DEFAULT_CELL_SIZE }={}) {
  const show=Number.isFinite(showDistance)&&showDistance>=0?showDistance:500;
  const hide=Number.isFinite(hideDistance)&&hideDistance>=show?hideDistance:NaN;
  const bucketSize=Number.isFinite(cellSize)&&cellSize>0?cellSize:DEFAULT_CELL_SIZE;
  if(!Number.isFinite(hide))throw new Error('hideDistance must be greater than or equal to showDistance');
  const records=new Map();
  const buckets=new Map();
  const dynamicIds=new Set();
  const criticalIds=new Set();
  let culledCount=0;
  const cellKey=(cx,cz)=>`${cx}:${cz}`;
  const positionCell=position=>({cx:Math.floor(position.x/bucketSize),cz:Math.floor(position.z/bucketSize)});
  const removeFromBucket=record=>{
    if(!record.bucketKey)return;
    const bucket=buckets.get(record.bucketKey);
    bucket?.delete(record.id);
    if(bucket?.size===0)buckets.delete(record.bucketKey);
    record.bucketKey=null;
  };
  const addToBucket=(record,position)=>{
    const {cx,cz}=positionCell(position);
    const key=cellKey(cx,cz);
    let bucket=buckets.get(key);
    if(!bucket){bucket=new Set();buckets.set(key,bucket);}
    bucket.add(record.id);
    record.bucketKey=key;
  };
  const restore=record=>{
    if(record.culled&&record.object){record.object.visible=record.baseVisible;record.culled=false;culledCount=Math.max(0,culledCount-1);}
    else if(record.object&&record.baseVisible)record.object.visible=true;
  };
  const readPosition=record=>{
    try {
      const position=record.getPosition();
      if(!position||!Number.isFinite(position.x)||!Number.isFinite(position.z))return null;
      return position;
    } catch { return null; }
  };
  const moveDynamicRecord=record=>{
    const position=readPosition(record);
    if(!position)return null;
    const {cx,cz}=positionCell(position);
    const nextKey=cellKey(cx,cz);
    if(record.bucketKey!==nextKey){removeFromBucket(record);addToBucket(record,position);}
    return position;
  };
  const applyVisibility=(record,originX,originZ)=>{
    const position=readPosition(record);
    if(!position)return {hidden:0,shown:0};
    if(record.isCritical()){
      if(record.culled){record.object.visible=true;record.culled=false;culledCount=Math.max(0,culledCount-1);return {hidden:0,shown:1};}
      record.object.visible=true;
      return {hidden:0,shown:0};
    }
    const distance=Math.hypot(position.x-originX,position.z-originZ);
    if(!record.culled&&distance>hide){record.object.visible=false;record.culled=true;culledCount++;return {hidden:1,shown:0};}
    if(record.culled&&distance<show){record.object.visible=true;record.culled=false;culledCount=Math.max(0,culledCount-1);return {hidden:0,shown:1};}
    return {hidden:0,shown:0};
  };
  const cellDistanceToOrigin=(cx,cz,originX,originZ)=>{
    const minX=cx*bucketSize,maxX=(cx+1)*bucketSize,minZ=cz*bucketSize,maxZ=(cz+1)*bucketSize;
    const dx=originX<minX?minX-originX:originX>maxX?originX-maxX:0;
    const dz=originZ<minZ?minZ-originZ:originZ>maxZ?originZ-maxZ:0;
    return Math.hypot(dx,dz);
  };
  return {
    register(id,{object,getPosition,isCritical=()=>false,dynamic=false}={}) {
      if(id===undefined||id===null)throw new Error('id is required');
      if(!object||typeof object!=='object')throw new Error('object is required');
      if(typeof getPosition!=='function')throw new Error('getPosition must be a function');
      if(records.has(id))this.unregister(id);
      const record={id,object,getPosition,isCritical,baseVisible:object.visible!==false,culled:false,dynamic:!!dynamic,bucketKey:null};
      records.set(id,record);
      if(record.dynamic)dynamicIds.add(id);
      if(record.isCritical())criticalIds.add(id);
      const position=readPosition(record);
      if(position&&record.baseVisible)addToBucket(record,position);
      return records.size;
    },
    unregister(id) {
      const record=records.get(id);
      if(!record)return false;
      restore(record);
      removeFromBucket(record);
      dynamicIds.delete(id);
      criticalIds.delete(id);
      records.delete(id);
      return true;
    },
    update(x,z) {
      const originX=Number.isFinite(x)?x:0,originZ=Number.isFinite(z)?z:0;
      let hidden=0,shown=0,visited=0;
      for(const id of dynamicIds){
        const record=records.get(id);
        if(record)moveDynamicRecord(record);
      }
      const originCell=positionCell({x:originX,z:originZ});
      const cellRadius=Math.ceil(hide/bucketSize)+1;
      const candidateIds=new Set();
      const hideSquared=hide*hide;
      for(let dz=-cellRadius;dz<=cellRadius;dz++)for(let dx=-cellRadius;dx<=cellRadius;dx++){
        const cx=originCell.cx+dx,cz=originCell.cz+dz;
        if(cellDistanceToOrigin(cx,cz,originX,originZ)**2>hideSquared)continue;
        const bucket=buckets.get(cellKey(cx,cz));
        if(bucket)for(const id of bucket)candidateIds.add(id);
      }
      for(const id of criticalIds)candidateIds.add(id);
      for(const id of candidateIds){
        const record=records.get(id);
        if(!record||!record.baseVisible)continue;
        visited++;
        const change=applyVisibility(record,originX,originZ);
        hidden+=change.hidden;
        shown+=change.shown;
      }
      return {size:records.size,visited,culled:culledCount,hidden,shown};
    },
    clear() {
      for(const record of records.values())restore(record);
      records.clear();buckets.clear();dynamicIds.clear();criticalIds.clear();culledCount=0;
    },
    size() { return records.size; }
  };
}
