const { test, expect } = require('@playwright/test');

test('shared world model provides deterministic terrain, road corridors, and region metadata', async ({ page }) => {
  await page.goto('/game-v3.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__coastlineTest), null, { timeout: 30000 });
  const result = await page.evaluate(() => {
    const world = window.__coastlineTest.worldModel;
    return {
      sameGround: world.groundY(123, 237) === world.groundY(123, 237),
      buildingPadHeights: [[-540,-540],[-500,-500],[-460,-460],[-440,-500]].map(([x,z]) => world.groundY(x,z)),
      roadCenterHeight: world.groundY(200, 237),
      roadCorridor: world.isRoadCorridor(200, 237),
      offRoadCorridor: world.isRoadCorridor(123, 237),
      city: world.regionAt(0, 0),
      suburbs: world.regionAt(350, 0),
      countryside: world.regionAt(550, 0),
      chunkStable: world.regionKey(10, 20) === world.regionKey(10, 20),
      nearestRoad: world.nearestRoad(203, 237),
      inBounds: world.inBounds(0, 0),
      outOfBounds: world.inBounds(900, 0)
    };
  });
  expect(result.sameGround).toBe(true);
  expect(Math.max(...result.buildingPadHeights) - Math.min(...result.buildingPadHeights)).toBeLessThan(0.001);
  expect(result.roadCenterHeight).toBeCloseTo(3, 3);
  expect(result.roadCorridor).toBe(true);
  expect(result.offRoadCorridor).toBe(false);
  expect(result.city).toBe('city');
  expect(result.suburbs).toBe('suburbs');
  expect(result.countryside).toBe('countryside');
  expect(result.chunkStable).toBe(true);
  expect(result.nearestRoad.axis).toBe('vertical');
  expect(result.inBounds).toBe(true);
  expect(result.outOfBounds).toBe(false);
});
