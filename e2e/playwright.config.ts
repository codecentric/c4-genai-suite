import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// eslint-disable-next-line
require('dotenv').config();

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: process.env.TEST_DIR || './tests',
  // timeout for each test
  timeout: 120_000,
  // timeout for each assertion
  expect: { timeout: 30_000 },
  /* Run tests in files in parallel */
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1, // Only one worker, since our tests use one DB-State
  //workers: process.env.CI ? 1 : undefined,
  reporter: [['list', { printSteps: true }], ['html']],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        permissions: ['clipboard-read', 'clipboard-write'],
      },
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        launchOptions: {
          firefoxUserPrefs: {
            'dom.events.testing.asyncClipboard': true,
            'dom.events.asyncClipboard.readText': true,
            'dom.events.asyncClipboard.clipboardItem': true,
            'dom.events.asyncClipboard.writeText': true,
            'permissions.default.clipboard-read': 1,
            'permissions.default.clipboard-write': 1,
          },
        },
      },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});
