const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  // Browser tests are CommonJS. Node-only contract/performance tests are ESM.
  // Match the browser suite positively so Playwright cannot accidentally import
  // a Node test file during sharding.
  testMatch: ['**/*.spec.cjs'],
  timeout: 90000,
  expect: { timeout: 20000 },
  globalTimeout: process.env.CI ? 30 * 60 * 1000 : 0,
  fullyParallel: true,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  workers: process.env.CI ? 1 : undefined,
  use: {
    viewport: { width: 390, height: 844 },
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173',
    headless: true,
    launchOptions: {
      args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl']
    },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  }
});
