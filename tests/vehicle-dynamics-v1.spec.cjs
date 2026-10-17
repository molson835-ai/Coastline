const test = require('node:test');
const assert = require('node:assert/strict');

(async () => {
  const { CoastlineVehicleDynamics } = await import('../src/vehicle-dynamics.js');

  test('vehicle builds speed progressively instead of teleporting', () => {
    const v = new CoastlineVehicleDynamics();
    const speeds = [];
    for (let i = 0; i < 180; i++) speeds.push(v.step({ throttle: 1 }, 1 / 60).speed);
    assert(speeds[30] > speeds[5]);
    assert(speeds[120] > speeds[30]);
    assert(Number.isFinite(speeds.at(-1)));
  });

  test('steering is progressive and speed sensitive', () => {
    const v = new CoastlineVehicleDynamics();
    for (let i = 0; i < 120; i++) v.step({ throttle: 1 }, 1 / 60);
    const low = v.step({ steering: 1, throttle: 0.5 }, 1 / 60);
    for (let i = 0; i < 60; i++) v.step({ steering: 1, throttle: 0.5 }, 1 / 60);
    const high = v.state();
    assert(Math.abs(high.steer) > Math.abs(low.steer));
    assert(Math.abs(high.yawRate) > 0);
  });

  test('surface changes reduce traction and increase rolling resistance', () => {
    const road = new CoastlineVehicleDynamics();
    const dirt = new CoastlineVehicleDynamics();
    for (let i = 0; i < 120; i++) {
      road.step({ throttle: 1 }, 1 / 60);
      dirt.setSurface('dirt');
      dirt.step({ throttle: 1 }, 1 / 60);
    }
    assert(dirt.speed < road.speed);
  });

  test('braking decelerates and transmission produces changing gears/RPM', () => {
    const v = new CoastlineVehicleDynamics();
    for (let i = 0; i < 240; i++) v.step({ throttle: 1 }, 1 / 60);
    const moving = v.state();
    assert(moving.speed > 0);
    assert(moving.rpm >= v.cfg.idleRpm);
    const before = Math.abs(v.speed);
    for (let i = 0; i < 60; i++) v.step({ brake: 1 }, 1 / 60);
    assert(Math.abs(v.speed) < before);
  });

  test('impact energy scales damage and can affect specific systems', () => {
    const v = new CoastlineVehicleDynamics();
    const moderate = v.applyImpact(15, 'front');
    const severe = v.applyImpact(60, 'front');
    assert(severe.severity > moderate.severity);
    assert(severe.damage.body > moderate.damage.body);
    assert(severe.damage.panelsDetached.includes('front-bumper'));
  });

  test('airborne state falls back under gravity and records landing load', () => {
    const v = new CoastlineVehicleDynamics();
    v.height = 2;
    v.setAirborne(true, 1);
    for (let i = 0; i < 120; i++) v.step({}, 1 / 60);
    assert.equal(v.airborne, false);
    assert.equal(v.height, 0);
    assert(v.damage.suspension >= 0);
  });
})();
