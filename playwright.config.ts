import { defineConfig, devices } from '@playwright/test';
import type { ConfigOptions } from "@nuxt/test-utils/playwright";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import path from 'path';

dotenv.config({ path: path.resolve(".env.test") });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig<ConfigOptions>({
  use: {
    baseURL: process.env.NUXT_PUBLIC_STORE_URL || "http://localhost:3000",
    nuxt: {
      rootDir: fileURLToPath(new URL(".", import.meta.url)),
    },
    trace: "on-first-retry",
  },
  testDir: "./test/e2e",
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: "html",
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */

  /* Configure projects for major browsers */
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },

    // {
    //   name: "firefox",
    //   use: { ...devices["Desktop Firefox"] },
    // },
    //
    // {
    //   name: "webkit",
    //   use: { ...devices["Desktop Safari"] },
    // },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: "node .output/server/index.mjs",
    url: process.env.NUXT_PUBLIC_STORE_URL || "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});
