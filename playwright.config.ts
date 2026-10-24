import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import path from 'path';
import { validateTestConfig } from './src/lib/config';

// Load environment variables from .env.local first, then .env
dotenv.config({ path: path.resolve(__dirname, '.env.local') });
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Startup validation of testing mode and environment configuration (Section A)
const testConfig = validateTestConfig();

// Define all available projects
const allProjects = [
  // ========== Mode: Playwright Deterministic Automation (UI & API) ==========
  {
    name: 'playwright',
    use: {
      ...devices['Desktop Chrome'],
    },
    testMatch: /.*(ui|api)\.spec\.ts/,
  },

  // ========== Mode: AI-Assisted Testing ==========
  {
    name: 'ai',
    use: {
      ...devices['Desktop Chrome'],
    },
    testMatch: /.*\/ai\.spec\.ts/,
  },

  // ========== Mode: Hybrid Testing (Playwright + AI) ==========
  {
    name: 'hybrid',
    use: {
      ...devices['Desktop Chrome'],
    },
    testMatch: /.*hybrid\.spec\.ts/,
  },

  // ========== Storefront UI Tests ==========
  {
    name: 'ui',
    use: {
      ...devices['Desktop Chrome'],
    },
    testMatch: /.*ui\.spec\.ts/,
  },

  // ========== Backend API Tests ==========
  {
    name: 'api',
    use: {
      ...devices['Desktop Chrome'],
    },
    testMatch: /.*api\.spec\.ts/,
  },

  // ========== Admin Console (Authenticated Deterministic) ==========
  {
    name: 'admin',
    use: {
      ...devices['Desktop Chrome'],
      storageState: 'playwright/.auth/admin.json',
    },
    testMatch: /.*\/admin(?!-ai).*\.spec\.ts/,
  },

  // ========== Admin Console (AI-Assisted) ==========
  {
    name: 'admin-ai',
    use: {
      ...devices['Desktop Chrome'],
      storageState: 'playwright/.auth/admin.json',
    },
    testMatch: /.*admin\-ai\.spec\.ts/,
  },

  // ========== Customer Portal (Authenticated) ==========
  {
    name: 'customer',
    use: {
      ...devices['Desktop Chrome'],
      storageState: 'playwright/.auth/customer.json',
    },
    testMatch: /.*customer\.spec\.ts/,
  },

  // ========== Mobile Customer ==========
  {
    name: 'customer-mobile',
    use: {
      ...devices['iPhone 13'],
      storageState: 'playwright/.auth/customer.json',
    },
    testMatch: /.*customer\.spec\.ts/,
  },

  // ========== Visual Quality Testing ==========
  {
    name: 'visual',
    use: {
      ...devices['Desktop Chrome'],
    },
    testMatch: /.*visual\.spec\.ts/,
  },
];

// Determine active projects:
// If the user specified a project or file on the CLI, expose all projects so Playwright can select it.
// If the user ran a generic `npm test` without parameters, dynamically default to the configured TEST_MODE.
export default defineConfig({
  testDir: './src/tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  timeout: 60 * 1000,
  expect: {
    timeout: 10 * 1000,
  },
  reporter: [
    ['list'],
    ['./src/lib/unified-reporter.ts'],
    ['html', { open: 'never' }],
  ],

  // Global setup for authenticated projects
  globalSetup: require.resolve('./src/lib/setup-auth.ts'),

  use: {
    baseURL: testConfig.baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15 * 1000,
    navigationTimeout: 30 * 1000,
  },

  projects: allProjects,
});