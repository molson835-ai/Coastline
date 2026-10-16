(() => {
  'use strict';

  // Steering input is corrected before the game listener receives it.
  // Held steering is then ramped from a gentle initial input toward full lock,
  // approximating the continued steering-wheel rotation a driver makes while
  // committing to a turn. Throttle/brake keys remain untouched.
  const remap = key => {
    const k = String(key || '').toLowerCase();
    if (k === 'a') return 'd';
    if (k === 'd') return 'a';
    if (k === 'arrowleft') return 'arrowright';
    if (k === 'arrowright') return 'arrowleft';
    return k;
  };

  const steeringKeys = new Set(['a', 'd', 'arrowleft', 'arrowright']);
  const held = new Map();
  const activeSynthetic = new Set();
  const rampStart = new Map();
  const CYCLE_MS = 34;
  const RAMP_MS = 900;
  const MIN_DUTY = 0.30;

  const makeEvent = (type, key) => {
    const synthetic = new KeyboardEvent(type, {
      key,
      code: key.startsWith('arrow') ? key.replace('arrow', 'Arrow') : ('Key' + key.toUpperCase()),
      bubbles: true,
      cancelable: true
    });
    Object.defineProperty(synthetic, '__coastlineProgressiveSteering', { value: true });
    return synthetic;
  };

  const emit = (type, key) => window.dispatchEvent(makeEvent(type, key));

  // Capture the user's steering intent before the original game listener.
  // We synthesize corrected key events on our own schedule so a held key can
  // represent increasing wheel rotation instead of a permanently binary input.
  window.addEventListener('keydown', event => {
    if (!event || event.__coastlineProgressiveSteering || !event.key) return;
    const raw = event.key.toLowerCase();
    if (!steeringKeys.has(raw)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const mapped = remap(raw);
    held.set(raw, mapped);
    if (!rampStart.has(raw)) rampStart.set(raw, performance.now());
  }, true);

  window.addEventListener('keyup', event => {
    if (!event || event.__coastlineProgressiveSteering || !event.key) return;
    const raw = event.key.toLowerCase();
    if (!steeringKeys.has(raw)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const mapped = held.get(raw) || remap(raw);
    held.delete(raw);
    rampStart.delete(raw);
    if (activeSynthetic.has(raw)) {
      emit('keyup', mapped);
      activeSynthetic.delete(raw);
    }
  }, true);

  // Keep the game-level key state synchronized with a time-based steering ramp.
  // The ramp is deliberately short enough to feel responsive, but long enough
  // that a quick lane correction stays gentle while a committed corner builds
  // toward full steering authority.
  setInterval(() => {
    const now = performance.now();
    for (const [raw, mapped] of held) {
      const elapsed = Math.max(0, now - (rampStart.get(raw) || now));
      const t = Math.min(1, elapsed / RAMP_MS);
      const duty = MIN_DUTY + (1 - MIN_DUTY) * t;
      const phase = (now % CYCLE_MS) / CYCLE_MS;
      const shouldBeDown = phase < duty;
      const isDown = activeSynthetic.has(raw);
      if (shouldBeDown && !isDown) {
        emit('keydown', mapped);
        activeSynthetic.add(raw);
      } else if (!shouldBeDown && isDown) {
        emit('keyup', mapped);
        activeSynthetic.delete(raw);
      }
    }
  }, 8);

  // Adaptive internal resolution: preserve visual quality when the device has
  // headroom, but automatically trade a small amount of resolution for stable
  // frame pacing when rendering becomes GPU-bound. This remains conservative
  // so performance improves without permanently making the game look worse.
  const Engine = window.BABYLON && window.BABYLON.Engine;
  if (!Engine) return;
  const originalSetScaling = Engine.prototype.setHardwareScalingLevel;
  const engines = new Set();
  Engine.prototype.setHardwareScalingLevel = function(level) {
    engines.add(this);
    const mobile = matchMedia('(max-width: 760px)').matches;
    const requested = Number(level) || 1;
    const minimum = mobile ? 1.35 : 1.0;
    const maximum = mobile ? 2.05 : 1.55;
    const initial = Math.max(minimum, Math.min(maximum, mobile ? Math.max(requested, 1.5) : requested));
    return originalSetScaling.call(this, initial);
  };

  setInterval(() => {
    for (const engine of engines) {
      if (!engine || engine._disposed) continue;
      const fps = typeof engine.getFps === 'function' ? engine.getFps() : 60;
      const current = typeof engine.getHardwareScalingLevel === 'function'
        ? engine.getHardwareScalingLevel()
        : (engine._hardwareScalingLevel || 1);
      const mobile = matchMedia('(max-width: 760px)').matches;
      const minimum = mobile ? 1.35 : 1.0;
      const maximum = mobile ? 2.05 : 1.55;
      let next = current;
      if (fps < 40) next = Math.min(maximum, current + 0.18);
      else if (fps < 47) next = Math.min(maximum, current + 0.08);
      else if (fps > 59) next = Math.max(minimum, current - 0.06);
      else if (fps > 54) next = Math.max(minimum, current - 0.03);
      if (Math.abs(next - current) >= 0.025) originalSetScaling.call(engine, next);
    }
  }, 1200);
})();
