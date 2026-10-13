const { test, expect } = require('@playwright/test');

test('Coastline boots, renders, and exits the vehicle without a runtime crash', async ({ page }) => {
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await page.goto('/game-v3.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('canvas')).toBeAttached({ timeout: 30000 });
  await expect(page.locator('#mode')).toHaveText('DRIVING');
  await page.waitForTimeout(7000);

  // Catch the class of regression that previously caused the black screen.
  expect(pageErrors, 'uncaught JavaScript errors').toEqual([]);
  expect(consoleErrors.filter(text => !/favicon|third-party cookie/i.test(text)), 'browser console errors').toEqual([]);

  await page.locator('#actionButton').click();
  await expect(page.locator('#mode')).toHaveText('ON FOOT');
  await expect(page.locator('#actionButton')).toHaveText('USE');
  expect(pageErrors, 'errors after exiting vehicle').toEqual([]);
});
