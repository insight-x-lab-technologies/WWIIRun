import { defineConfig } from "@playwright/test";

const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: ".",
  testMatch: "pwa.spec.ts",
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: "line",
  use: {
    baseURL: "http://127.0.0.1:4174/WWIIRun/",
    browserName: "chromium",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "mobile-320x568", use: { viewport: { width: 320, height: 568 } } },
    {
      name: "desktop-1920x1080",
      use: { viewport: { width: 1920, height: 1080 } },
    },
  ],
  webServer: {
    command: "node server.ts",
    url: "http://127.0.0.1:4174/__test__/health",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
