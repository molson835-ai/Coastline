// Coastline Adaptive World Budget: shared proximity/relevance decisions for
// world subsystems. This module never changes renderer-wide quality settings.

const DEFAULTS=Object.freeze({
  heroDistance:24,
  nearDistance:80,
  midDistance:180,
  farDistance:360
});

function finiteNonNegative(value,fallback){
  return Number.isFinite(value)&&value>=0?value:fallback;
}

export function createAdaptiveWorldBudget(options={}){
  const heroDistance=finiteNonNegative(options.heroDistance,DEFAULTS.heroDistance);
  const nearDistance=Math.max(heroDistance,finiteNonNegative(options.nearDistance,DEFAULTS.nearDistance));
  const midDistance=Math.max(nearDistance,finiteNonNegative(options.midDistance,DEFAULTS.midDistance));
  const farDistance=Math.max(midDistance,finiteNonNegative(options.farDistance,DEFAULTS.farDistance));
  return Object.freeze({heroDistance,nearDistance,midDistance,farDistance});
}

export function evaluateWorldBudget({
  budget=createAdaptiveWorldBudget(),
  distance=0,
  visible=true,
  gameplayCritical=false,
  interactive=false,
  collisionRequired=false,
  category='world'
}={}){
  const safeBudget=createAdaptiveWorldBudget(budget);
  const critical=Boolean(gameplayCritical);
  const activeInteraction=Boolean(interactive);
  const safeDistance=Number.isFinite(distance)&&distance>=0?distance:0;
  const mustRemainFunctional=critical||activeInteraction||Boolean(collisionRequired);

  let detailTier;
  if(critical){
    detailTier='hero';
  }else if(!visible&&!mustRemainFunctional){
    detailTier='hidden';
  }else if(safeDistance<=safeBudget.heroDistance){
    detailTier='hero';
  }else if(safeDistance<=safeBudget.nearDistance){
    detailTier='near';
  }else if(safeDistance<=safeBudget.midDistance){
    detailTier='mid';
  }else{
    detailTier='far';
  }

  let simulationTier='full';
  let updateIntervalMs=0;
  let shadowEligible=true;

  if(detailTier==='hidden'){
    simulationTier='off';
    updateIntervalMs=Infinity;
    shadowEligible=false;
  }else if(detailTier==='mid'){
    simulationTier='reduced';
    updateIntervalMs=250;
    shadowEligible=false;
  }else if(detailTier==='far'){
    simulationTier=mustRemainFunctional?'reduced':'minimal';
    updateIntervalMs=mustRemainFunctional?250:1000;
    shadowEligible=false;
  }else if(detailTier==='near'){
    simulationTier='full';
    updateIntervalMs=50;
    shadowEligible=true;
  }

  if(critical){
    simulationTier='full';
    updateIntervalMs=0;
    shadowEligible=true;
  }

  return Object.freeze({
    category,
    distance:safeDistance,
    visible:Boolean(visible),
    detailTier,
    simulationTier,
    shadowEligible,
    collisionRequired:Boolean(collisionRequired)||activeInteraction||critical,
    interactionRequired:activeInteraction||critical,
    updateIntervalMs
  });
}
