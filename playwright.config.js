import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.PLAYWRIGHT_PORT || 4173);

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  workers: process.env.CI ? 4 : 6,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    viewport: { width: 1280, height: 800 },
    trace: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'firefox-smoke',
      testMatch: '**/cross-browser.spec.js',
      use: { ...devices['Desktop Firefox'] }
    },
    {
      name: 'webkit-smoke',
      testMatch: '**/cross-browser.spec.js',
      use: { ...devices['Desktop Safari'] }
    }
  ],
  webServer: {
    command: 'node tests/static-server.mjs',
    port,
    reuseExistingServer: true
  }
});
