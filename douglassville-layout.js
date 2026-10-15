// Regional layout inspired by Douglassville / Amity Township, Pennsylvania.
// Coordinates are a playable, scaled interpretation—not a survey-grade replica.
// Roads and landmarks reference the local pattern: US 422 / Benjamin Franklin Hwy,
// PA 662 (Old Swede Road), Old Philadelphia Pike, rail corridor, Schuylkill River,
// Monocacy Creek, historic Morlatton Village, and rural woodland/farmland.
export const DOUGLASSVILLE_LAYOUT = Object.freeze({
  name: 'Douglassville, Pennsylvania',
  roads: [
    { id:'us-422', name:'US 422 / Benjamin Franklin Highway', kind:'highway', width:27, points:[[-760,210],[-560,178],[-360,132],[-150,82],[40,32],[220,-18],[385,-55],[520,-72],[690,-86]] },
    { id:'pottstown-bypass', name:'Pottstown Bypass', kind:'bypass', width:24, points:[[430,-54],[490,-105],[535,-170],[590,-245],[665,-315],[760,-365]] },
    { id:'pa-662', name:'PA 662 / Old Swede Road', kind:'arterial', width:15, points:[[315,720],[305,560],[300,410],[305,265],[315,120],[330,-30],[345,-185],[365,-350],[400,-520]] },
    { id:'old-philadelphia-pike', name:'Old Philadelphia Pike', kind:'local-arterial', width:12, points:[[-760,-235],[-570,-250],[-390,-268],[-210,-285],[-30,-304],[150,-321],[340,-338],[540,-350],[760,-360]] },
    { id:'monocacy-creek-road', name:'Monocacy Creek Road', kind:'rural', width:9, points:[[-700,490],[-570,440],[-470,365],[-400,275],[-350,180],[-270,90],[-185,35],[-100,15]] },
    { id:'limekiln-road', name:'Limekiln Road', kind:'rural', width:9, points:[[-500,720],[-480,590],[-445,480],[-420,365],[-430,255],[-465,155],[-500,70]] },
    { id:'geiger-road', name:'Geiger Road', kind:'rural', width:8, points:[[-300,720],[-275,610],[-255,520],[-240,435],[-215,365],[-175,300]] },
    { id:'river-bridge-road', name:'River Bridge Road', kind:'rural', width:9, points:[[610,700],[595,565],[590,440],[600,330],[625,235],[660,155]] }
  ],
  rail: { name:'Norfolk Southern rail corridor', points:[[-760,-455],[-560,-455],[-360,-456],[-160,-458],[40,-462],[240,-467],[440,-472],[640,-478],[760,-482]] },
  creek: { name:'Monocacy Creek', points:[[-700,520],[-600,445],[-520,365],[-455,275],[-405,190],[-350,115],[-290,70],[-220,48],[-150,42],[-90,20]] },
  river: { name:'Schuylkill River', points:[[-760,-720],[-580,-708],[-400,-718],[-220,-705],[-40,-720],[140,-708],[320,-725],[500,-714],[680,-730],[760,-720]] },
  landmarks: [
    {id:'morlatton-village',name:'Morlatton Village',kind:'historic',x:-390,z:-365},
    {id:'white-horse-inn',name:'White Horse Inn',kind:'historic',x:-350,z:-345},
    {id:'river-trailhead',name:'Schuylkill River Trail access',kind:'trailhead',x:-250,z:-395},
    {id:'amity-park',name:'Amity Community Park',kind:'park',x:110,z:410},
    {id:'monocacy-hill',name:'Monocacy Hill woodland',kind:'nature',x:-565,z:565},
    {id:'highway-retail',name:'Route 422 retail strip',kind:'retail',x:120,z:5},
    {id:'gas-station',name:'Route 422 Service Station',kind:'gas',x:205,z:-5},
    {id:'farmstead',name:'Amity Township Farmstead',kind:'farm',x:520,z:405}
  ],
  districts: [
    {id:'route-422-corridor',name:'Route 422 commercial corridor',kind:'commercial',bounds:[-240,280,-150,180]},
    {id:'historic-morlatton',name:'Morlatton historic riverfront',kind:'historic',bounds:[-500,-250,-430,-300]},
    {id:'amity-suburbs',name:'Amity residential neighborhoods',kind:'residential',bounds:[-160,260,180,520]},
    {id:'monocacy-woodland',name:'Monocacy Hill woodland',kind:'woodland',bounds:[-700,-350,300,720]},
    {id:'farm-country',name:'Berks County farm country',kind:'rural',bounds:[380,720,200,620]}
  ]
});

export function distanceToPolyline(x,z,points){
  let best=Infinity;
  for(let i=1;i<points.length;i++){
    const [ax,az]=points[i-1],[bx,bz]=points[i],dx=bx-ax,dz=bz-az;
    const t=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz||1)));
    best=Math.min(best,Math.hypot(x-(ax+t*dx),z-(az+t*dz)));
  }
  return best;
}

export function nearestRegionalRoad(x,z){
  let best=null;
  for(const road of DOUGLASSVILLE_LAYOUT.roads){
    const distance=distanceToPolyline(x,z,road.points);
    if(!best||distance<best.distance)best={id:road.id,name:road.name,kind:road.kind,width:road.width,distance};
  }
  return best;
}
