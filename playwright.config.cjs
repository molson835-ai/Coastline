const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  testIgnore: ['**/*.spec.mjs'],
  timeout: 75000,
  expect: { timeout: 15000 },
  // Fail cleanly before the CI runner hard-kills a slow browser batch.
  globalTimeout: process.env.CI ? 15 * 60 * 1000 : 0,
  // Test-level sharding keeps each CI shard balanced across graphics-heavy specs.
  fullyParallel: true,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  // Coastline's browser gate is a graphics-heavy WebGL workload. Keep CI to one
  // browser worker so multiple SwiftShader/WebGL instances do not compete for
  // the same runner CPU and make timing-sensitive gameplay checks flaky.
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
