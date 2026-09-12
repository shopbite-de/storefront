import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: ".",
  outputDir: "./results",
  snapshotPathTemplate: "{testDir}/__snapshots__/{projectName}/{arg}{ext}",
  timeout: 90_000,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.BASE_URL || "https://localhost:3443",
    ignoreHTTPSErrors: true,
    deviceScaleFactor: 1,
  },
  expect: {
    toHaveScreenshot: {
      maxDiffPixels: 0,
      threshold: 0.01,
      animations: "disabled",
    },
  },
  projects: [
    {
      name: "mobile",
      use: {
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
    { name: "desktop", use: { viewport: { width: 1280, height: 800 } } },
  ],
});
