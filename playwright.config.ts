import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright e2e configuration for MoneyMind.
 * Tests live in ./e2e and run against the Vite dev server (port 8080).
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'html',
  // The first navigation can trigger Vite dependency pre-bundling, which is slow
  // on a cold start, so give tests and navigations generous headroom.
  timeout: 60 * 1000,
  use: {
    baseURL: 'http://localhost:8080',
    trace: 'on-first-retry',
    navigationTimeout: 45 * 1000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:8080',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
