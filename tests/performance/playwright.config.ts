import { defineConfig } from "@playwright/test";

const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "../e2e",
  testMatch: "performance.harness.spec.ts",
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: 1,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: isCI ? [["line"], ["html", { open: "never" }]] : "line",
  use: {
    baseURL: "http://127.0.0.1:8081",
    browserName: "chromium",
    viewport: { width: 1280, height: 720 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  webServer: {
    command: "npm run performance:harness -- --host 127.0.0.1 --port 8081",
    url: "http://127.0.0.1:8081",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
