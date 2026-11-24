import { defineConfig, devices } from "@playwright/test";
import type { ConfigOptions } from "@nuxt/test-utils/playwright";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import path from "path";
import { defineBddConfig } from "playwright-bdd";

dotenv.config({ path: path.resolve(".env.test") });
// the storefront's settings for the Shopware run (test/bdd/shopware-stack.sh)
if (process.env.NUXT_SHOP_BITE_BACKEND === "shopware") {
  dotenv.config({ path: path.resolve(".bdd-stack/storefront.env") });
}

/**
 * Behaviour tests (test/bdd): Gherkin features in English that match the
 * German UI, run against the backend the started storefront uses
 * (`NUXT_SHOP_BITE_BACKEND`: `memory` needs a build with
 * SHOPBITE_TEST_SEAMS=1, `shopware` a Shopware with the ShopBite plugin,
 * see CLAUDE.md, Behaviour tests). `bddgen` writes the Playwright tests.
 */
const mutants = process.env.BDD_MUTANTS === "1";
const bddTestDir = defineBddConfig({
  // the mutants (test/bdd/mutants) prove each scenario can fail
  features: mutants
    ? "test/bdd/mutants/**/*.feature"
    : "test/bdd/features/**/*.feature",
  steps: ["test/bdd/steps/**/*.ts"],
  outputDir: mutants ? ".features-gen/mutants" : ".features-gen/features",
  featuresRoot: mutants ? "test/bdd/mutants" : "test/bdd/features",
});

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
  testDir: bddTestDir,
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  // the mutants run checks that each mutant failed at its last step
  reporter: mutants
    ? [["list"], ["./test/bdd/mutants/lastStepReporter.ts"]]
    : [["html", { open: "never" }]],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */

  /* Configure projects for major browsers */
  projects: [
    /*
     * Behaviour tests (#433). One worker: a scenario sets the restaurant
     * (hours, ordering switch) of the one backend all scenarios share.
     */
    {
      name: "bdd",
      testDir: bddTestDir,
      workers: 1,
      use: { ...devices["Desktop Chrome"], trace: "retain-on-failure" },
    },
    /* Accessibility checks of the preset pages (#446), no login needed. */
    {
      name: "a11y",
      testDir: "./test/a11y",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "a11y-mobile",
      testDir: "./test/a11y",
      use: { ...devices["Pixel 7"] },
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
