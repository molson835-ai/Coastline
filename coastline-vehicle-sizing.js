/** Shared world-unit envelope for RGSDev vehicle assets. */
export function getCoastlineVehicleTarget(name, override = null) {
  if (override) return override;
  const label = String(name || '').toLowerCase();
  return Object.freeze({
    width: 2.05,
    length: label.includes('limousine') ? 5.15 : label.includes('suv') ? 4.55 : 4.25,
    height: 2.05,
  });
}

export function getCoastlineVehicleUniformScale(size, target, isLimousine = false) {
  const widthScale = target.width / Math.max(size.x, .001);
  const heightScale = target.height / Math.max(size.y, .001);
  if (isLimousine) return Math.min(widthScale, heightScale);
  return Math.min(widthScale, target.length / Math.max(size.z, .001), heightScale);
}

export function getCoastlineVehicleLengthCorrection(size, target, isLimousine = false) {
  return isLimousine ? target.length / Math.max(size.z, .001) : 1;
}
