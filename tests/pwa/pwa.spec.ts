import { expect, test } from "@playwright/test";

const basePath = "/WWIIRun/";

test.beforeEach(async ({ request }) => {
  await request.post("http://127.0.0.1:4174/__test__/version/a");
});

test("emits an installable manifest and registers only the project scope", async ({
  page,
}) => {
  await page.goto(basePath);
  const manifestResponse = await page.request.get(
    `${basePath}manifest.webmanifest`,
  );
  expect(manifestResponse.status()).toBe(200);
  expect(manifestResponse.headers()["content-type"]).toContain(
    "application/manifest+json",
  );
  const manifest = (await manifestResponse.json()) as Record<string, unknown>;
  expect(manifest).toMatchObject({
    name: "WWIIRun",
    short_name: "WWIIRun",
    id: basePath,
    start_url: basePath,
    scope: basePath,
    display: "standalone",
    orientation: "any",
    lang: "en",
    prefer_related_applications: false,
  });
  expect(manifest.icons).toEqual([
    expect.objectContaining({ sizes: "192x192", purpose: "any" }),
    expect.objectContaining({ sizes: "512x512", purpose: "any" }),
    expect.objectContaining({ sizes: "512x512", purpose: "maskable" }),
  ]);
  const iconAlphaRanges = await page.evaluate(
    async (icons) => {
      return Promise.all(
        icons.map(async ({ src, sizes }) => {
          const response = await fetch(src);
          const bitmap = await createImageBitmap(await response.blob());
          const canvas = document.createElement("canvas");
          canvas.width = bitmap.width;
          canvas.height = bitmap.height;
          const context = canvas.getContext("2d", { willReadFrequently: true });
          if (context === null)
            throw new Error("2D canvas context unavailable.");
          context.drawImage(bitmap, 0, 0);
          const pixels = context.getImageData(
            0,
            0,
            bitmap.width,
            bitmap.height,
          ).data;
          let minimum = 255;
          let maximum = 0;
          for (let index = 3; index < pixels.length; index += 4) {
            const alpha = pixels[index] ?? 0;
            minimum = Math.min(minimum, alpha);
            maximum = Math.max(maximum, alpha);
          }
          bitmap.close();
          return {
            sizes,
            width: canvas.width,
            height: canvas.height,
            minimum,
            maximum,
          };
        }),
      );
    },
    manifest.icons as { src: string; sizes: string }[],
  );
  expect(iconAlphaRanges).toEqual([
    { sizes: "192x192", width: 192, height: 192, minimum: 255, maximum: 255 },
    { sizes: "512x512", width: 512, height: 512, minimum: 255, maximum: 255 },
    { sizes: "512x512", width: 512, height: 512, minimum: 255, maximum: 255 },
  ]);

  const scope = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    return registration.scope;
  });
  expect(scope).toBe("http://127.0.0.1:4174/WWIIRun/");
});

test("reloads the cached shell offline after one completed online visit", async ({
  context,
  page,
}) => {
  await page.goto(basePath);
  await page.evaluate(async () => navigator.serviceWorker.ready);
  await page.reload();
  await expect
    .poll(() =>
      page.evaluate(() => navigator.serviceWorker.controller !== null),
    )
    .toBe(true);
  const serviceWorker = context.serviceWorkers()[0];
  expect(serviceWorker).toBeDefined();
  const cachedUrls = await serviceWorker?.evaluate(async () => {
    const keys = await caches.keys();
    return (
      await Promise.all(
        keys.map(async (key) =>
          (await caches.open(key))
            .keys()
            .then((requests) => requests.map((request) => request.url)),
        ),
      )
    ).flat();
  });
  expect(
    await page.evaluate(() => navigator.serviceWorker.controller?.scriptURL),
  ).toBe("http://127.0.0.1:4174/WWIIRun/sw.js");
  expect(
    cachedUrls?.some((url) =>
      url.startsWith("http://127.0.0.1:4174/WWIIRun/index.html"),
    ),
  ).toBe(true);
  await expect(page.locator("#game-root canvas")).toHaveCount(1);

  await context.setOffline(true);
  await page.reload();
  await expect(page.locator("#game-root canvas")).toHaveCount(1);
  await expect(page.locator("html")).toHaveAttribute(
    "data-build-id",
    "pwa-e2e-a",
  );
  expect(await page.locator("#game-root canvas").count()).toBe(1);

  const negative = await page.evaluate(async () => {
    const missing = await fetch("/WWIIRun/missing.bin").then(
      (response) => response.status,
      () => -1,
    );
    const outside = await fetch("/outside-scope/").then(
      (response) => response.status,
      () => -1,
    );
    const post = await fetch("/WWIIRun/", { method: "POST" }).then(
      (response) => response.status,
      () => -1,
    );
    return { missing, outside, post };
  });
  expect(negative).toEqual({ missing: -1, outside: -1, post: -1 });
});

test("does not claim offline readiness on a clean first visit without network", async ({
  browser,
}) => {
  const context = await browser.newContext({ offline: true });
  const page = await context.newPage();
  await expect(page.goto("http://127.0.0.1:4174/WWIIRun/")).rejects.toThrow();
  expect(await page.locator("text=ready to work offline").count()).toBe(0);
  await context.close();
});

test("dismisses the update notice without permanently covering the canvas", async ({
  page,
  request,
}) => {
  await page.goto(basePath);
  await page.evaluate(async () => navigator.serviceWorker.ready);
  await page.reload();
  await request.post("http://127.0.0.1:4174/__test__/version/b");
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    await registration.update();
  });
  await expect(
    page.getByText("A new version of WWIIRun is available."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Later" }).click();
  await expect(page.locator(".pwa-notice")).toBeHidden();
  const canvasBox = await page.locator("#game-root canvas").boundingBox();
  expect(canvasBox?.width).toBeGreaterThan(0);
  expect(canvasBox?.height).toBeGreaterThan(0);
});

test("defers version B during a run, activates once after consent, and preserves foreign cache", async ({
  context,
  page,
  request,
}) => {
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setSafeAreaInsetsOverride", {
    insets: { top: 20, right: 18, bottom: 30, left: 24 },
  });
  await page.goto(basePath);
  await page.evaluate(async () => navigator.serviceWorker.ready);
  await page.reload();
  const versionAJavaScriptUrl = await page.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .map((entry) => entry.name)
      .find((url) => /\/assets\/index-[^/]+\.js$/u.test(url)),
  );
  expect(versionAJavaScriptUrl).toBeDefined();
  await page.evaluate(async () => {
    await caches.open("unrelated-app-cache");
    window.__WWIIRUN_PWA_TEST__.setRunActive(true);
  });

  await request.post("http://127.0.0.1:4174/__test__/version/b");
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    await registration.update();
  });
  await expect(
    page.getByText("A new version of WWIIRun is available."),
  ).toBeVisible();
  const updateButton = page.getByRole("button", { name: "Update now" });
  const buttonBox = await updateButton.boundingBox();
  expect(buttonBox?.width).toBeGreaterThanOrEqual(44);
  expect(buttonBox?.height).toBeGreaterThanOrEqual(44);
  await updateButton.focus();
  expect(
    await updateButton.evaluate((button) => {
      const style = getComputedStyle(button);
      return {
        outlineStyle: style.outlineStyle,
        outlineWidth: style.outlineWidth,
      };
    }),
  ).toEqual({ outlineStyle: "solid", outlineWidth: "3px" });
  const noticeBox = await page.locator(".pwa-notice").boundingBox();
  const viewport = page.viewportSize();
  expect(noticeBox).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(noticeBox?.x).toBeGreaterThanOrEqual(24);
  expect((noticeBox?.x ?? 0) + (noticeBox?.width ?? 0)).toBeLessThanOrEqual(
    (viewport?.width ?? 0) - 18,
  );
  expect((noticeBox?.y ?? 0) + (noticeBox?.height ?? 0)).toBeLessThanOrEqual(
    (viewport?.height ?? 0) - 30,
  );
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
  await updateButton.click();
  await expect(
    page.getByText("Update postponed until this run ends."),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute(
    "data-build-id",
    "pwa-e2e-a",
  );

  await page.evaluate(() => window.__WWIIRUN_PWA_TEST__.setRunActive(false));
  await expect(
    page.getByText("A new version of WWIIRun is available."),
  ).toBeVisible();
  let navigations = 0;
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) navigations += 1;
  });
  await page.getByRole("button", { name: "Update now" }).click();
  await expect(page.locator("html")).toHaveAttribute(
    "data-build-id",
    "pwa-e2e-b",
  );
  expect(navigations).toBe(1);
  expect(
    await page.evaluate(async () => caches.has("unrelated-app-cache")),
  ).toBe(true);
  await expect
    .poll(() =>
      page.evaluate(async (oldUrl) => {
        const keys = (await caches.keys()).filter((key) =>
          key.startsWith("wwiirun-shell-"),
        );
        const requests = (
          await Promise.all(
            keys.map(async (key) => (await caches.open(key)).keys()),
          )
        ).flat();
        return requests.every((request) => request.url !== oldUrl);
      }, versionAJavaScriptUrl),
    )
    .toBe(true);
});
