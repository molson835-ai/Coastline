const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  testMatch: [
    '**/*.spec.cjs',
    '**/bridge-guardrails.spec.mjs',
    '**/city-road-edges.spec.mjs',
    '**/coastline-proximity-camera.spec.mjs',
    '**/contextual-use-button.spec.mjs',
    '**/electric-lemonade-runtime.spec.mjs'
  ],
  timeout: 45000,
  expect: { timeout: 15000 },
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
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
