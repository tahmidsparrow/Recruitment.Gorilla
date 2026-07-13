import { defineConfig, devices } from '@playwright/test';

// Read-only E2E smoke against the already-running dev stack (client :5173 → proxy → API :5000 → MySQL).
// Start the app first (npm run dev + the API), then: E2E_EMAIL=… E2E_PASSWORD=… npm run e2e
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
