/**
 * Electric Lemonade excursion state.
 * Keeps purchase accounting and timed rocket-boot effects independent from scene construction.
 */
export const ELECTRIC_LEMONADE_PRICE_CB = 10;
export const ROCKET_BOOTS_DURATION_MS = 5 * 60 * 1000;
export const ROCKET_BOOTS_STORAGE_KEY = 'coastlineRocketBootsExpiresAtV1';

export function isFacingElectricLemonadeVendor(player,target,{maxDistance=3.2,minimumFacingDot=.45}={}) {
  if (![player?.x,player?.z,player?.heading,target?.x,target?.z,maxDistance,minimumFacingDot].every(Number.isFinite)) return false;
  const dx=target.x-player.x,dz=target.z-player.z,distance=Math.hypot(dx,dz);
  if(distance>maxDistance||distance<1e-6)return false;
  return (dx*Math.sin(player.heading)+dz*Math.cos(player.heading))/distance>=minimumFacingDot;
}

export function createElectricLemonadeState({getBalance,setBalance,now=()=>Date.now(),storage=typeof localStorage!=='undefined'?localStorage:null,boostDurationMs=ROCKET_BOOTS_DURATION_MS}={}) {
  if(typeof getBalance!=='function'||typeof setBalance!=='function')throw new TypeError('getBalance and setBalance callbacks are required');
  let glowPurchased=false,dungeonActive=false,glowActive=false,boostExpiresAt=0,pickupAvailable=true;
  try{const saved=Number(storage?.getItem(ROCKET_BOOTS_STORAGE_KEY)||0);if(Number.isFinite(saved)&&saved>now()){boostExpiresAt=saved;pickupAvailable=false}else storage?.removeItem(ROCKET_BOOTS_STORAGE_KEY)}catch{}
  const update=()=>{if(boostExpiresAt&&now()>=boostExpiresAt){boostExpiresAt=0;pickupAvailable=true;try{storage?.removeItem(ROCKET_BOOTS_STORAGE_KEY)}catch{}return{expired:true}}return{expired:false}};
  return {
    buyLemonade(){const balance=Number(getBalance());if(!Number.isFinite(balance)||balance<ELECTRIC_LEMONADE_PRICE_CB)return{ok:false,reason:'insufficient-funds',balance:Number.isFinite(balance)?balance:0};const nextBalance=balance-ELECTRIC_LEMONADE_PRICE_CB;setBalance(nextBalance);glowPurchased=true;glowActive=true;return{ok:true,charged:ELECTRIC_LEMONADE_PRICE_CB,balance:nextBalance}},
    enterDungeon(){dungeonActive=true;glowActive=glowPurchased||glowActive;glowPurchased=false;return{dungeonActive,glowActive}},
    exitDungeon(){dungeonActive=false;glowActive=false;glowPurchased=false;return{dungeonActive,glowActive}},
    collectRocketBoots(){update();if(!dungeonActive||!pickupAvailable)return{ok:false,reason:'unavailable'};pickupAvailable=false;boostExpiresAt=now()+boostDurationMs;try{storage?.setItem(ROCKET_BOOTS_STORAGE_KEY,String(boostExpiresAt))}catch{}return{ok:true,expiresAt:boostExpiresAt,durationMs:boostDurationMs}},
    update,
    isRocketBoostActive(){update();return boostExpiresAt>now()},
    snapshot(){update();return{dungeonActive,glowPurchased,glowActive,rocketBootsActive:boostExpiresAt>now(),rocketBootsExpiresAt:boostExpiresAt||null,pickupAvailable,balance:Number(getBalance())}},
  };
}

function installReplacementRuntimeCorrections(){
  if(typeof window==='undefined'||window.__coastlineReplacementRuntimeInstalled)return;
  window.__coastlineReplacementRuntimeInstalled=true;
  const patchVehicleVisuals=()=>{
    const vehicles=window.__coastlineVehicleRegistry,THREE=window.__coastlineThree;
    if(!Array.isArray(vehicles)||!THREE?.Group)return;
    for(const vehicle of vehicles){
      if(!vehicle?.g||vehicle.kind!=='car'||!vehicle.rgsdevModelName||vehicle.g.userData.coastlineRgsdevForwardCorrection)continue;
      const children=[...vehicle.g.children];if(!children.length)continue;
      const visual=new THREE.Group();visual.name='coastline-rgsdev-forward-axis-correction';visual.rotation.y=Math.PI;
      for(const child of children)visual.add(child);vehicle.g.add(visual);
      vehicle.g.userData.coastlineRgsdevForwardCorrection=true;vehicle.g.userData.coastlineRgsdevForwardAxis='-Z-authored-to-+Z-runtime';
    }
  };
  const patchAuthoredHair=()=>{
    const root=window.__coastlineAvatar?.userData?.cozyActor?.root;if(!root?.traverse)return;
    root.traverse(node=>{
      if(!node.isMesh||node.userData.coastlineAuthoredHairCorrected)return;
      const materials=Array.isArray(node.material)?node.material:[node.material];
      if(!materials.some(material=>String(material?.name||'').toLowerCase()==='hair'))return;
      node.scale.x*=1.08;node.scale.z*=1.08;node.scale.y*=1.04;
      node.userData.coastlineAuthoredHairCorrected=true;node.userData.coastlineHairCorrection={authored:true,xz:1.08,y:1.04};
    });
  };
  const patchCaveAndVendor=()=>{
    const root=window.__coastlineRegionRoot;if(!root||window.__coastlineActiveWorldId!=='waterfront')return;
    const cave=root.userData?.coastlineCaveGLB||root.getObjectByName?.('coastline-waterfront-cave-entrance-glb');
    if(cave&&!cave.userData.coastlineReplacementOrientationApplied){cave.rotation.y=0;cave.userData.coastlineReplacementOrientationApplied=true;cave.userData.coastlineDoorwayFacing='-Z';}
    const actor=root.userData?.coastlineLemonadeVendorActor||window.__coastlineWaterfrontVendorActor;
    if(actor?.root){actor.root.userData.coastlineLivingWorldVendor=true;actor.root.userData.coastlineWorldId='waterfront';actor.root.userData.coastlineVendorRole='electric-lemonade';if(actor.mixer)actor.mixer.update(1/60);actor.root.visible=true;actor.root.position.x=520;actor.root.position.z=528.8;actor.root.rotation.y=Math.PI;if(actor.root.parent!==root)root.add(actor.root);window.__coastlineWaterfrontVendorActor=actor;}
  };
  window.__coastlineReplacementVisualPatch=()=>{patchVehicleVisuals();patchAuthoredHair();patchCaveAndVendor();let hair=false;window.__coastlineAvatar?.userData?.cozyActor?.root?.traverse?.(n=>{if(n.userData?.coastlineAuthoredHairCorrected)hair=true});return{vehicles:Array.isArray(window.__coastlineVehicleRegistry)?window.__coastlineVehicleRegistry.filter(v=>v?.g?.userData?.coastlineRgsdevForwardCorrection).length:0,authoredHairCorrected:hair,caveOrientationCorrected:Boolean(window.__coastlineRegionRoot?.userData?.coastlineCaveGLB?.userData?.coastlineReplacementOrientationApplied),lemonadeVendorLivingWorld:Boolean(window.__coastlineWaterfrontVendorActor?.root?.userData?.coastlineLivingWorldVendor)}};
  window.addEventListener('coastline:wardrobe-applied',patchAuthoredHair);
  let attempts=0;const timer=setInterval(()=>{patchVehicleVisuals();patchAuthoredHair();patchCaveAndVendor();if(++attempts>=240)clearInterval(timer)},250);
  window.__coastlineReplacementSteeringProbe=(key,reverse=false,frames=30)=>{
    const api=window.__coastlineTest,vehicles=window.__coastlineVehicleRegistry,vehicle=Array.isArray(vehicles)?vehicles.find(v=>v?.kind==='car'):null,THREE=window.__coastlineThree;
    if(!api||!vehicle||!THREE)throw new Error('Coastline runtime steering probe unavailable');
    patchVehicleVisuals();const player=window.__coastlinePlayer,before={mode:player?.mode,vehicle:player?.vehicle,x:vehicle.x,z:vehicle.z,heading:vehicle.heading,speed:vehicle.speed,px:player?.x,pz:player?.z};
    try{api.setVehiclePosition(0,0,0);vehicle.speed=reverse?-12:12;api.keyDown(key);api.advanceTestFrame(1/60,frames);api.keyUp(key);const q=vehicle.g?.getWorldQuaternion?.(new THREE.Quaternion());const nose=q?new THREE.Vector3(0,0,1).applyQuaternion(q).normalize():null;return{key,reverse,displacement:{x:vehicle.x,z:vehicle.z},heading:vehicle.heading,visualNose:nose?{x:nose.x,z:nose.z}:null};}
    finally{api.keyUp(key);vehicle.x=before.x;vehicle.z=before.z;vehicle.heading=before.heading;vehicle.speed=before.speed;if(vehicle.g)vehicle.g.rotation.y=before.heading;if(player){player.mode=before.mode;player.vehicle=before.vehicle;player.x=before.px;player.z=before.pz}}
  };
}
installReplacementRuntimeCorrections();
