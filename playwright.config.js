import { defineConfig } from '@playwright/test';

const port = Number(process.env.PLAYWRIGHT_PORT || 4173);

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    viewport: { width: 1280, height: 800 },
    trace: 'retain-on-failure'
  },
  webServer: {
    command: 'node tests/static-server.mjs',
    port,
    reuseExistingServer: true
  }
});
