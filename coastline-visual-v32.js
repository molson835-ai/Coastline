(()=>{
  const started=performance.now();
  let applied=false;
  function apply(){
    const h=window.__coastlineHooks;
    if(!h?.scene)return false;
    const scene=h.scene;
    let terrain=0,roads=0,lines=0;
    scene.traverse(o=>{
      if(!o.isMesh||!o.geometry)return;
      const p=o.geometry.parameters||{};
      const w=Number(p.width)||0, d=Number(p.height)||0, dep=Number(p.depth)||0;
      const isHugeGround=o.geometry.type==='PlaneGeometry'&&w>=1000&&d>=1000;
      const isLongRoad=o.geometry.type==='BoxGeometry'&&((w>=1000&&dep<=30)||(dep>=1000&&w<=30));
      const mats=Array.isArray(o.material)?o.material:[o.material];
      const hex=mats[0]?.color?.getHex?.();
      const isRoadLine=(hex===0xf4c95d||hex===0xe9e9dc||hex===0xf4c95d||hex===0xe8e4cf)&&o.geometry.type==='BoxGeometry'&&((w<1&&dep<20)||(dep<1&&w<20));
      if(isHugeGround){o.userData.coastlineTerrainLayer=true;o.userData.coastlineAlwaysVisible=true;o.renderOrder=Math.min(o.renderOrder||0,5);terrain++;
        mats.forEach(m=>{if(m)m.roughness=1});
      }else if(isLongRoad){o.userData.coastlineRoadLayer=true;o.userData.coastlineAlwaysVisible=true;o.renderOrder=Math.max(o.renderOrder||0,8);roads++;}
      if(isRoadLine){o.userData.coastlineRoadLayer=true;o.userData.coastlineAlwaysVisible=true;o.renderOrder=22;lines++;mats.forEach(m=>{if(!m)return;m.polygonOffset=true;m.polygonOffsetFactor=-3;m.polygonOffsetUnits=-3;m.depthWrite=false;m.roughness=.9;});}
    });
    scene.userData.coastlineVisualV32={terrain,roads,lines};
    applied=true;return true;
  }
  const timer=setInterval(()=>{
    if(apply()||performance.now()-started>15000){clearInterval(timer);}
  },250);
  window.__coastlineVisualV32={apply:()=>apply(),get applied(){return applied}};
})();
