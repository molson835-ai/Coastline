// Lightweight animation state definitions for cinematic character motion.

const STATES = Object.freeze({
  idle: Object.freeze({ speed: 0, stride: 0, pelvisDrop: 0, armSwing: 0.04, spineLean: 0 }),
  walk: Object.freeze({ speed: 1.45, stride: 0.72, pelvisDrop: 0.025, armSwing: 0.18, spineLean: 0.02 }),
  run: Object.freeze({ speed: 4.1, stride: 1.35, pelvisDrop: 0.055, armSwing: 0.42, spineLean: 0.09 }),
  jump: Object.freeze({ speed: 0, stride: 0, pelvisDrop: -0.08, armSwing: 0.16, spineLean: 0.01 }),
  crouch: Object.freeze({ speed: 0.9, stride: 0.42, pelvisDrop: 0.42, armSwing: 0.06, spineLean: 0.12 }),
  enterVehicle: Object.freeze({ speed: 0, stride: 0, pelvisDrop: 0.06, armSwing: 0.32, spineLean: 0.22 }),
  exitVehicle: Object.freeze({ speed: 0, stride: 0, pelvisDrop: 0.06, armSwing: 0.28, spineLean: -0.08 }),
});

const TRANSITIONS = Object.freeze({
  idle: Object.freeze(['walk', 'run', 'jump', 'crouch', 'enterVehicle']),
  walk: Object.freeze(['idle', 'run', 'jump', 'crouch']),
  run: Object.freeze(['walk', 'idle', 'jump', 'crouch']),
  jump: Object.freeze(['idle', 'walk', 'run']),
  crouch: Object.freeze(['idle', 'walk', 'run']),
  enterVehicle: Object.freeze(['idle']),
  exitVehicle: Object.freeze(['idle']),
});

export function getAnimationState(name) {
  return STATES[name] ?? STATES.idle;
}

export function canTransition(from, to) {
  return Boolean(TRANSITIONS[from]?.includes(to));
}

export function blendAnimationState(from, to, alpha = 0.5) {
  const a = getAnimationState(from);
  const b = getAnimationState(to);
  const t = Math.max(0, Math.min(1, alpha));
  return Object.freeze({
    speed: a.speed + (b.speed - a.speed) * t,
    stride: a.stride + (b.stride - a.stride) * t,
    pelvisDrop: a.pelvisDrop + (b.pelvisDrop - a.pelvisDrop) * t,
    armSwing: a.armSwing + (b.armSwing - a.armSwing) * t,
    spineLean: a.spineLean + (b.spineLean - a.spineLean) * t,
  });
}

export function animationRules() {
  return Object.freeze({
    updateMode: 'event-driven-state-plus-bounded-pose-step',
    transition: 'blend-not-snap',
    crouch: 'visible-pelvis-and-knee-compression',
    locomotion: 'stride-scaled-by-speed',
    distantActors: 'pose-proxy',
  });
}

export { STATES, TRANSITIONS };
