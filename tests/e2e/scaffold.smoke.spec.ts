import { expect, test } from "@playwright/test";

test("renders one canvas inside the viewport without browser failures", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  const failedLocalRequests: string[] = [];

  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("requestfailed", (request) => {
    if (new URL(request.url()).origin === "http://127.0.0.1:4173") {
      failedLocalRequests.push(
        `${request.method()} ${request.url()}: ${request.failure()?.errorText}`,
      );
    }
  });
  page.on("response", (response) => {
    if (
      new URL(response.url()).origin === "http://127.0.0.1:4173" &&
      response.status() >= 400
    ) {
      failedLocalRequests.push(
        `${response.request().method()} ${response.url()}: HTTP ${response.status()}`,
      );
    }
  });

  await page.goto("/");

  const canvas = page.locator("#game-root canvas");
  await expect(canvas).toHaveCount(1);
  await expect
    .poll(async () => {
      const box = await canvas.boundingBox();
      return box !== null && box.width > 0 && box.height > 0;
    })
    .toBe(true);

  const viewport = page.viewportSize();
  const box = await canvas.boundingBox();
  expect(viewport).not.toBeNull();
  expect(box).not.toBeNull();

  if (viewport === null || box === null) {
    throw new Error(
      "Playwright did not expose the configured viewport or canvas bounds.",
    );
  }

  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);

  const hasDocumentOverflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
        document.documentElement.clientWidth ||
      document.documentElement.scrollHeight >
        document.documentElement.clientHeight,
  );
  expect(hasDocumentOverflow).toBe(false);
  expect(pageErrors).toEqual([]);
  expect(failedLocalRequests).toEqual([]);
});
