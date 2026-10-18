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