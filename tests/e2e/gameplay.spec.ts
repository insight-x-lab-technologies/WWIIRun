import { expect, test } from "@playwright/test";

test("enables combat diagnostics only for the exact opt-in query", async ({
  page,
}) => {
  for (const path of [
    "/",
    "/?notcombat-diagnostics=1",
    "/?combat-diagnostics=0",
  ]) {
    await page.goto(path);
    await expect(page.locator("[data-gameplay-status]")).toContainText(
      "Active",
    );
    await expect(page.locator("#game-root")).toHaveAttribute(
      "data-active-entities",
      "0",
    );
    await expect(page.locator("#game-root")).toHaveAttribute(
      "data-enemy-health",
      "",
    );
  }
});

test("boots gameplay, accepts keyboard input, and exposes accessible touch actions", async ({
  page,
}) => {
  await page.goto("/?combat-diagnostics=1");
  const status = page.locator("[data-gameplay-status]");
  await expect(status).toContainText("Active");
  await expect(status).toContainText("tick");
  await page.keyboard.down("ArrowRight");
  await expect(page.locator("#game-root")).toHaveAttribute(
    "data-input",
    /^127,0,0$/,
  );
  await expect(page.locator("#game-root")).toHaveAttribute(
    "data-player",
    /^\d+,\d+,100,active$/,
  );
  await expect(page.locator("#game-root")).toHaveAttribute(
    "data-pool-capacity",
    "512",
  );
  await expect(page.locator("#game-root")).toHaveAttribute(
    "data-active-entities",
    "1",
  );
  await expect(page.locator("#game-root")).toHaveAttribute(
    "data-broad-phase-candidates",
    "0",
  );
  await expect(page.locator("#game-root")).toHaveAttribute(
    "data-broad-phase-contacts",
    "0",
  );
  await expect(page.locator("#game-root")).toHaveAttribute(
    "data-weapon-cooldown",
    "0",
  );
  await expect(page.locator("#game-root")).toHaveAttribute(
    "data-enemy-health",
    "3/3",
  );
  await expect(page.locator("#game-root")).toHaveAttribute(
    "data-active-structure-modules",
    "3",
  );
  await page.keyboard.up("ArrowRight");
  const actions = page.locator(".gameplay-actions button");
  await expect(actions).toHaveCount(3);
  for (const button of await actions.all()) {
    const box = await button.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);
  }
  await page.keyboard.down("Space");
  await expect(page.locator("#game-root")).toHaveAttribute(
    "data-weapon-cooldown",
    /^[1-6]$/,
  );
  await expect(page.locator("#game-root")).toHaveAttribute(
    "data-enemy-health",
    "2/3",
  );
  await page.keyboard.up("Space");
  await actions.first().dispatchEvent("pointerdown", { pointerId: 10 });
  await expect(actions.first()).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#game-root")).toHaveAttribute(
    "data-input",
    /^0,0,1$/,
  );
  await expect(page.locator("#game-root")).toHaveAttribute(
    "data-weapon-cooldown",
    /^[1-6]$/,
  );
  await expect(page.locator("#game-root")).toHaveAttribute(
    "data-enemy-health",
    "1/3",
  );
  await actions.first().dispatchEvent("pointerup", { pointerId: 10 });
  await expect(actions.first()).toHaveAttribute("aria-pressed", "false");

  await actions.first().hover();
  await page.mouse.down();
  await page.mouse.move(0, 0);
  await page.mouse.up();
  await expect(actions.first()).toHaveAttribute("aria-pressed", "false");

  await actions.first().dispatchEvent("pointerup", { pointerId: 10 });
});

test("projects transient coin statistics through the real keyboard gameplay path", async ({
  page,
}) => {
  await page.goto("/?loot-diagnostics=1");
  const root = page.locator("#game-root");
  await expect(root).toHaveAttribute("data-run-coins", "0");
  await expect(root).toHaveAttribute("data-coins-collected", "0");
  await page.keyboard.down("ArrowRight");
  await expect(root).toHaveAttribute("data-run-coins", "1");
  await expect(root).toHaveAttribute("data-coins-collected", "1");
  await page.keyboard.up("ArrowRight");
});

test("reprojects the logical profile across orientation changes without duplicating canvas", async ({
  page,
}) => {
  await page.goto("/?combat-diagnostics=1");
  await page.setViewportSize({ width: 1024, height: 768 });
  const playerBeforeResize = await page
    .locator("#game-root")
    .getAttribute("data-player");
  await expect(page.locator("#game-root")).toHaveAttribute(
    "data-orientation",
    "landscape",
  );
  await expect(page.locator("#game-root")).toHaveAttribute(
    "data-zone-render-orientation",
    "landscape",
  );
  await page.setViewportSize({ width: 320, height: 568 });
  await expect(page.locator("#game-root")).toHaveAttribute(
    "data-orientation",
    "portrait",
  );
  await expect(page.locator("#game-root")).toHaveAttribute(
    "data-zone-render-orientation",
    "portrait",
  );
  await expect(page.locator("#game-root canvas")).toHaveCount(1);
  expect(await page.locator("#game-root").getAttribute("data-player")).toBe(
    playerBeforeResize,
  );
  await expect(page.locator("[data-gameplay-status]")).toContainText(
    "Active; portrait",
  );
  await expect(page.locator("#game-root")).toHaveAttribute(
    "data-enemy-health",
    /^(?:3|2|1)\/3$/,
  );
  await expect(page.locator("#game-root")).toHaveAttribute(
    "data-parallax-layer-count",
    "4",
  );
  await expect(page.locator("#game-root")).toHaveAttribute(
    "data-parallax-coverage",
    "540x960",
  );
});

test("keeps four cosmetic parallax layers covered through required viewports", async ({
  page,
}) => {
  await page.goto("/");
  const root = page.locator("#game-root");
  for (const [width, height, coverage] of [
    [320, 568, "540x960"],
    [568, 320, "960x540"],
    [768, 1024, "540x960"],
    [1024, 768, "960x540"],
    [1920, 1080, "960x540"],
  ] as const) {
    await page.setViewportSize({ width, height });
    await expect(root).toHaveAttribute("data-parallax-layer-count", "4");
    await expect(root).toHaveAttribute("data-parallax-coverage", coverage);
    await expect(root).toHaveAttribute(
      "data-parallax-visual-ids",
      "background.sky.v1,background.clouds.far.v1,background.terrain.distant.v1,background.terrain.mid.v1",
    );
    await expect(page.locator("#game-root canvas")).toHaveCount(1);
  }
});
