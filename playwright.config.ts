import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env files only locally - in CI, env vars come from GitHub secrets
if (!process.env.CI) {
  dotenv.config();
  dotenv.config({ path: '.env.local', override: true });
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

process.env.TS_NODE_PROJECT = path.resolve(__dirname, 'tsconfig.json');

export default defineConfig({
  testDir: './tests',
  fullyParallel: false, // Run tests sequentially to avoid conflicts
  testMatch: '**/*.spec.ts',
  forbidOnly: !!process.env.CI,
  
  // Retries: 2 in CI, 0 locally
  retries: process.env.CI ? 2 : 0,
  
  // Workers: 1 in CI to avoid concurrent logins/conflicts
  workers: process.env.CI ? 1 : undefined,
  
  // Increased timeout for CI (slower network)
  timeout: process.env.CI ? 120000 : 60000, // 2 min in CI, 1 min local
  expect: {
    timeout: process.env.CI ? 15000 : 10000, // 15s in CI, 10s local
  },
  
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
    ['list']
  ],
  
  use: {
    baseURL: process.env.APP_BASE_URL,
    
    // Traces and artifacts for debugging
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    
    // Increased action timeout for CI
    actionTimeout: process.env.CI ? 30000 : 15000, // 30s in CI
    navigationTimeout: process.env.CI ? 60000 : 30000, // 60s in CI
  },
  
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
