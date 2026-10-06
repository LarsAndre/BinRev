import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';
const development = process.env.BINREV_TEST_DEV === '1';
const previewPort = development ? 4323 : 4322;

export default defineConfig({
  testDir: './tests/browser',
  testMatch: development ? '**/note-images.spec.ts' : '**/*.spec.ts',
  fullyParallel: !development,
  workers: development ? 1 : undefined,
  use: {
    baseURL: `http://127.0.0.1:${previewPort}`,
    launchOptions: { executablePath: process.env.CHROMIUM_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined) },
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: `npm run ${development ? 'dev' : 'preview'} -- --port ${previewPort} --ignore-lock`,
    url: `http://127.0.0.1:${previewPort}`,
    reuseExistingServer: false,
  },
});
