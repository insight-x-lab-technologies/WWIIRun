import { expect, test } from "@playwright/test";

interface PerformanceHarnessApi {
  readonly snapshot: () => {
    readonly running: boolean;
    readonly imageCount: number;
    readonly layerCount: number;
    readonly canvasCount: number;
    readonly report: {
      readonly schemaVersion: string;
      readonly workloadVersion: string;
      readonly status: string;
      readonly evaluation: string;
      readonly lifecycle: {
        readonly cycles: number;
        readonly transitions: number;
      };
      readonly invalidations: readonly string[];
    } | null;
  };
  readonly invalidateForTest: (reason: string) => void;
}

test("runs, exports, invalidates, and tears down the isolated performance harness", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  const externalRequests: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("request", (request) => {
    if (new URL(request.url()).origin !== "http://127.0.0.1:8080") {
      externalRequests.push(request.url());
    }
  });

  await page.goto("/?smoke=1");
  await page.getByLabel("Build commit").fill("e2e-smoke");
  await page.getByLabel("Device role").fill("automated-smoke");
  await page.getByLabel("Device model").fill("Playwright Chromium");
  await page.getByRole("button", { name: "Start" }).click();

  await expect
    .poll(() =>
      page.evaluate(() =>
        (
          window as Window & {
            __WWIIRUN_PERFORMANCE__?: PerformanceHarnessApi;
          }
        ).__WWIIRUN_PERFORMANCE__?.snapshot(),
      ),
    )
    .toMatchObject({
      running: true,
      imageCount: 1_200,
      layerCount: 3,
      canvasCount: 1,
    });
  await expect(page.getByTestId("status")).toHaveText("complete", {
    timeout: 15_000,
  });

  const valid = await page.evaluate(() =>
    (
      window as Window & { __WWIIRUN_PERFORMANCE__?: PerformanceHarnessApi }
    ).__WWIIRUN_PERFORMANCE__?.snapshot(),
  );
  expect(valid).toMatchObject({
    running: false,
    canvasCount: 0,
    report: {
      schemaVersion: "wwiirun.performance-report.v1",
      workloadVersion: "tier-base-stress-v1",
      lifecycle: { cycles: 5, transitions: 4 },
    },
  });
  expect(valid?.report?.invalidations).not.toContain("e2e-forced-invalid");
  await expect(
    page.getByRole("button", { name: "Export report" }),
  ).toBeEnabled();

  await page.getByRole("button", { name: "Start" }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            window as Window & {
              __WWIIRUN_PERFORMANCE__?: PerformanceHarnessApi;
            }
          ).__WWIIRUN_PERFORMANCE__?.snapshot().running,
      ),
    )
    .toBe(true);
  await page.evaluate(() =>
    (
      window as Window & { __WWIIRUN_PERFORMANCE__?: PerformanceHarnessApi }
    ).__WWIIRUN_PERFORMANCE__?.invalidateForTest("e2e-forced-invalid"),
  );
  await expect(page.getByTestId("status")).toHaveText("complete", {
    timeout: 15_000,
  });

  const invalid = await page.evaluate(() =>
    (
      window as Window & { __WWIIRUN_PERFORMANCE__?: PerformanceHarnessApi }
    ).__WWIIRUN_PERFORMANCE__?.snapshot(),
  );
  expect(invalid).toMatchObject({
    running: false,
    canvasCount: 0,
    report: {
      status: "invalid",
      evaluation: "not-evaluated",
    },
  });
  expect(invalid?.report?.invalidations).toContain("e2e-forced-invalid");

  await page.getByRole("button", { name: "Stop / reset" }).click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        (
          window as Window & {
            __WWIIRUN_PERFORMANCE__?: PerformanceHarnessApi;
          }
        ).__WWIIRUN_PERFORMANCE__?.snapshot(),
      ),
    )
    .toMatchObject({ running: false, canvasCount: 0, report: null });
  expect(pageErrors).toEqual([]);
  expect(externalRequests).toEqual([]);
});
