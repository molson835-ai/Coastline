(() => {
  'use strict';

  // Input correction is installed before the game script so the original
  // keyboard listener receives the corrected direction without changing the
  // driving physics implementation.
  const remap = key => {
    const k = String(key || '').toLowerCase();
    if (k === 'a') return 'd';
    if (k === 'd') return 'a';
    if (k === 'arrowleft') return 'arrowright';
    if (k === 'arrowright') return 'arrowleft';
    return k;
  };

  const forwardKeyboard = event => {
    if (!event || event.__coastlineRemapped || !event.key) return;
    const mapped = remap(event.key);
    if (mapped === event.key.toLowerCase()) return;
    event.stopImmediatePropagation();
    const synthetic = new KeyboardEvent(event.type, {
      key: mapped,
      code: event.code,
      location: event.location,
      ctrlKey: event.ctrlKey,
      shiftKey: event.shiftKey,
      altKey: event.altKey,
      metaKey: event.metaKey,
      repeat: event.repeat,
      bubbles: true,
      cancelable: true
    });
    Object.defineProperty(synthetic, '__coastlineRemapped', { value: true });
    window.dispatchEvent(synthetic);
  };
  window.addEventListener('keydown', forwardKeyboard, true);
  window.addEventListener('keyup', forwardKeyboard, true);

  // Adaptive internal resolution: preserve visual quality when the device has
  // headroom, but automatically trade a small amount of resolution for stable
  // frame pacing when rendering becomes GPU-bound. This is intentionally
  // conservative so the game never drops to a visibly poor resolution.
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
