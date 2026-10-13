import { defineConfig, devices } from '@playwright/test';
import {
  API,
  apiEnv,
  DASHBOARD,
  DASHBOARD_PORT,
  dashboardEnv,
} from './test/browser/stack';

// Run through `bun run test:browser`, which brings up the containers, migrates
// and builds first (test/browser/run.ts).
export default defineConfig({
  testDir: './test/browser',
  testMatch: '*.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: DASHBOARD,
    locale: 'en-US',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'bun src/server.ts',
      cwd: '../dashboard-api',
      url: `${API}/status`,
      env: apiEnv,
      stdout: 'ignore',
      stderr: 'pipe',
    },
    {
      command: 'node build',
      port: DASHBOARD_PORT,
      env: dashboardEnv,
      stdout: 'ignore',
      stderr: 'pipe',
    },
  ],
});
