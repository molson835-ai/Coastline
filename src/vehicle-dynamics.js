/* Coastline Vehicle Dynamics v1
 * Lightweight, deterministic vehicle model intended for browser simulation.
 * No rendering or audio dependencies. Keep this layer independent so the
 * player vehicle can run at high fidelity while traffic uses cheaper presets.
 */

export const SURFACES = Object.freeze({
  asphalt: { grip: 1.00, rolling: 0.014, bump: 0.08 },
  concrete: { grip: 0.96, rolling: 0.016, bump: 0.10 },
  grass: { grip: 0.62, rolling: 0.070, bump: 0.32 },
  dirt: { grip: 0.56, rolling: 0.085, bump: 0.38 },
  gravel: { grip: 0.48, rolling: 0.105, bump: 0.52 },
  sand: { grip: 0.32, rolling: 0.160, bump: 0.62 },
  mud: { grip: 0.25, rolling: 0.210, bump: 0.70 }
});

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const lerp = (a, b, t) => a + (b - a) * clamp(t, 0, 1);
const sign = v => v < 0 ? -1 : v > 0 ? 1 : 0;

export const DEFAULT_VEHICLE = Object.freeze({
  mass: 1900,
  wheelRadius: 0.34,
  wheelbase: 2.85,
  track: 1.62,
  cgHeight: 0.58,
  // More natural road-car steering: the previous high-speed clamp made the
  // vehicle feel artificially locked as speed increased.
  maxSteer: 0.72,
  steeringRate: 3.8,
  steeringReturn: 5.5,
  enginePeakTorque: 285,
  engineRedline: 6500,
  idleRpm: 850,
  gears: [3.55, 2.10, 1.45, 1.03, 0.80, 0.64],
  finalDrive: 3.15,
  reverseRatio: 3.20,
  drivetrainEfficiency: 0.86,
  brakeTorque: 6200,
  handbrakeTorque: 9000,
  maxSpeed: 62.0,
  dragCoefficient: 0.31,
  frontalArea: 2.35,
  rollingResistance: 0.014,
  suspension: {
    restLength: 0.34,
    travel: 0.18,
    spring: 34000,
    damper: 4200,
    antiRoll: 5200
  }
});

function mergeConfig(config = {}) {
  return {
    ...DEFAULT_VEHICLE,
    ...config,
    gears: config.gears ? [...config.gears] : [...DEFAULT_VEHICLE.gears],
    suspension: { ...DEFAULT_VEHICLE.suspension, ...(config.suspension || {}) }
  };
}

export class CoastlineVehicleDynamics {
  constructor(config = {}) {
    this.cfg = mergeConfig(config);
    this.reset();
  }

  reset() {
    this.speed = 0;
    this.yawRate = 0;
    this.heading = 0;
    this.steer = 0;
    this.throttle = 0;
    this.brake = 0;
    this.rpm = this.cfg.idleRpm;
    this.gear = 1;
    this.surface = 'asphalt';
    this.airborne = false;
    this.airTime = 0;
    this.verticalSpeed = 0;
    this.height = 0;
    this.wheels = [0, 1, 2, 3].map(() => ({
      contact: true, compression: 0, slip: 0, spin: 0, steer: 0,
      load: this.cfg.mass * 9.81 / 4, brake: 0
    }));
    this.damage = {
      body: 0, engine: 0, drivetrain: 0, suspension: 0,
      steering: 0, brakes: 0, tires: [0, 0, 0, 0], panelsDetached: []
    };
    return this.state();
  }

  setSurface(name) {
    this.surface = SURFACES[name] ? name : 'asphalt';
  }

  setAirborne(value, verticalSpeed = this.verticalSpeed) {
    this.airborne = !!value;
    this.verticalSpeed = verticalSpeed;
    if (this.airborne) this.airTime = 0;
  }

  applyImpact(speed, side = 'front', otherMass = 1200) {
    const relative = Math.max(0, Math.abs(speed));
    const energy = 0.5 * Math.max(200, Math.min(this.cfg.mass, otherMass)) * relative * relative;
    const severity = clamp(energy / 180000, 0, 1);
    const scale = side === 'side' ? 1.15 : side === 'rear' ? 0.92 : 1;
    this.damage.body = clamp(this.damage.body + severity * 0.58 * scale, 0, 1);
    if (relative > 18) this.damage.suspension = clamp(this.damage.suspension + severity * 0.34, 0, 1);
    if (relative > 28 && side === 'front') this.damage.engine = clamp(this.damage.engine + severity * 0.28, 0, 1);
    if (relative > 24 && side === 'side') this.damage.steering = clamp(this.damage.steering + severity * 0.16, 0, 1);
    if (relative > 30 && side === 'front' && !this.damage.panelsDetached.includes('front-bumper')) this.damage.panelsDetached.push('front-bumper');
    return { energy, severity, damage: this.damageState() };
  }

  damageState() {
    return {
      ...this.damage,
      tires: [...this.damage.tires],
      panelsDetached: [...this.damage.panelsDetached]
    };
  }

  step(input = {}, dt = 1 / 60) {
    dt = clamp(Number(dt) || 1 / 60, 1 / 240, 0.05);
    const cfg = this.cfg;
    const surface = SURFACES[this.surface] || SURFACES.asphalt;
    const throttle = clamp(Number(input.throttle) || 0, -1, 1);
    const brake = clamp(Number(input.brake) || 0, 0, 1);
    const steering = clamp(Number(input.steering) || 0, -1, 1);
    const handbrake = !!input.handbrake;

    this.throttle = throttle;
    this.brake = brake;

    const speedAbs = Math.abs(this.speed);
    const speedNorm = clamp(speedAbs / 30, 0, 1);
    // Preserve substantially more steering authority at speed. This keeps
    // progressive steering controllable instead of forcing a near-straight
    // steering lock at highway speed.
    const steerLimit = lerp(cfg.maxSteer, cfg.maxSteer * 0.72, speedNorm);
    const targetSteer = steering * steerLimit * (1 - this.damage.steering * 0.55);
    const steerRate = Math.abs(targetSteer) > Math.abs(this.steer) ? cfg.steeringRate : cfg.steeringReturn;
    this.steer += clamp(targetSteer - this.steer, -steerRate * dt, steerRate * dt);

    if (this.airborne) {
      this.airTime += dt;
      this.verticalSpeed -= 9.81 * dt;
      this.height += this.verticalSpeed * dt;
      if (this.height <= 0) {
        this.height = 0;
        this.airborne = false;
        this.verticalSpeed = 0;
        const landing = Math.abs(this.yawRate) + Math.abs(this.speed) * 0.012;
        this.damage.suspension = clamp(this.damage.suspension + landing * 0.01, 0, 1);
      }
      this.heading += this.yawRate * dt;
      return this.state();
    }

    // Torque curve: broad mid-range torque, tapering toward redline.
    const rpmNorm = clamp((this.rpm - cfg.idleRpm) / (cfg.engineRedline - cfg.idleRpm), 0, 1);
    const torqueCurve = 0.72 + 0.38 * Math.sin(Math.PI * clamp(rpmNorm * 0.92, 0, 1));
    const engineTorque = cfg.enginePeakTorque * torqueCurve * Math.max(0, throttle) * (1 - this.damage.engine * 0.65);
    const ratio = this.gear > 0 ? cfg.gears[this.gear - 1] : cfg.reverseRatio;
    const driveTorque = engineTorque * ratio * cfg.finalDrive * cfg.drivetrainEfficiency;
    const wheelForce = driveTorque / cfg.wheelRadius;

    const rolling = cfg.mass * 9.81 * (cfg.rollingResistance + surface.rolling);
    const aero = 0.5 * 1.225 * cfg.dragCoefficient * cfg.frontalArea * speedAbs * speedAbs;
    const maxTireForce = cfg.mass * 9.81 * surface.grip * (1 - this.damage.tires.reduce((a, b) => a + b, 0) * 0.035);
    let longitudinal = clamp(wheelForce, -maxTireForce, maxTireForce);
    if (throttle < 0) longitudinal = -Math.min(maxTireForce * 0.72, Math.abs(wheelForce));
    if (speedAbs > 0.15) longitudinal -= sign(this.speed) * (rolling + aero);

    const brakeForce = brake * cfg.brakeTorque / cfg.wheelRadius;
    if (brakeForce > 0) longitudinal -= sign(this.speed) * Math.min(Math.abs(longitudinal) + brakeForce, maxTireForce * 1.15);
    if (handbrake) longitudinal -= sign(this.speed) * Math.min(Math.abs(this.speed) * 900, cfg.handbrakeTorque / cfg.wheelRadius);

    const acceleration = longitudinal / cfg.mass;
    this.speed += acceleration * dt;
    const tractionLimitSpeed = cfg.maxSpeed * (1 - this.damage.engine * 0.35);
    this.speed = clamp(this.speed, -11, tractionLimitSpeed);
    if (Math.abs(this.speed) < 0.05 && Math.abs(throttle) < 0.05 && brake > 0.1) this.speed = 0;

    // Kinematic bicycle yaw with speed-sensitive steering and surface grip.
    const direction = this.speed >= 0 ? 1 : -1;
    const gripFactor = clamp(surface.grip * (1 - this.damage.suspension * 0.35), 0.15, 1);
    const targetYawRate = Math.abs(this.speed) > 0.1 ? (this.speed / cfg.wheelbase) * Math.tan(this.steer) * gripFactor : 0;
    this.yawRate += clamp(targetYawRate - this.yawRate, -7 * dt, 7 * dt);
    this.heading += this.yawRate * dt;

    // Wheel telemetry: lightweight but useful for visuals, sound and damage.
    const loadTransfer = clamp((Math.abs(this.yawRate) * this.cfg.mass * this.cfg.cgHeight) / (cfg.track * this.cfg.mass * 9.81), -0.42, 0.42);
    const longitudinalTransfer = clamp(acceleration * cfg.cgHeight / cfg.wheelbase / 9.81, -0.35, 0.35);
    const frontLoad = cfg.mass * 9.81 * 0.53 * (1 - longitudinalTransfer) / 2;
    const rearLoad = cfg.mass * 9.81 * 0.47 * (1 + longitudinalTransfer) / 2;
    for (let i = 0; i < 4; i++) {
      const front = i < 2;
      const side = i % 2 === 0 ? -1 : 1;
      const base = front ? frontLoad : rearLoad;
      this.wheels[i].load = base * (1 + side * loadTransfer);
      this.wheels[i].steer = front ? this.steer : 0;
      this.wheels[i].spin += (this.speed / cfg.wheelRadius) * dt;
      this.wheels[i].slip = clamp((Math.abs(longitudinal) / Math.max(1, this.wheels[i].load)) - surface.grip, -1, 1);
      this.wheels[i].brake = brake + (handbrake && !front ? 1 : 0);
      this.wheels[i].compression = clamp(0.42 + longitudinalTransfer * (front ? -1 : 1) + side * loadTransfer, 0, 1);
    }

    // Automatic transmission with hysteresis to avoid gear hunting.
    const wheelRpm = Math.abs(this.speed) / (2 * Math.PI * cfg.wheelRadius) * 60;
    this.rpm = this.gear > 0
      ? Math.max(cfg.idleRpm, wheelRpm * ratio * cfg.finalDrive)
      : cfg.idleRpm;
    if (this.gear > 0 && this.rpm > cfg.engineRedline * 0.93 && this.gear < cfg.gears.length) this.gear++;
    else if (this.gear > 1 && this.rpm < cfg.engineRedline * 0.39 && throttle < 0.35) this.gear--;

    return this.state();
  }

  state() {
    return {
      speed: this.speed,
      speedMph: Math.abs(this.speed) * 2.236936,
      heading: this.heading,
      yawRate: this.yawRate,
      steer: this.steer,
      throttle: this.throttle,
      brake: this.brake,
      rpm: this.rpm,
      gear: this.gear,
      surface: this.surface,
      airborne: this.airborne,
      height: this.height,
      airTime: this.airTime,
      wheels: this.wheels.map(w => ({ ...w })),
      damage: this.damageState()
    };
  }
}

export function createVehicleDynamics(config) {
  return new CoastlineVehicleDynamics(config);
}
