import { expect, test } from "@playwright/test";

test("boots gameplay, accepts keyboard input, and exposes accessible touch actions", async ({
  page,
}) => {
  await page.goto("/");
  const status = page.locator("[data-gameplay-status]");
  await expect(status).toContainText("Active");
  await expect(status).toContainText("tick");
  await page.keyboard.down("ArrowRight");
  await expect(page.locator("#game-root")).toHaveAttribute(
    "data-input",
    /^127,0,0$/,
  );
  await page.keyboard.up("ArrowRight");
  const actions = page.locator(".gameplay-actions button");
  await expect(actions).toHaveCount(3);
  for (const button of await actions.all()) {
    const box = await button.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);
  }
  await actions.first().dispatchEvent("pointerdown", { pointerId: 10 });
  await expect(actions.first()).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#game-root")).toHaveAttribute(
    "data-input",
    /^0,0,1$/,
  );
  await actions.first().dispatchEvent("pointerup", { pointerId: 10 });
  await expect(actions.first()).toHaveAttribute("aria-pressed", "false");

  await actions.first().hover();
  await page.mouse.down();
  await page.mouse.move(0, 0);
  await page.mouse.up();
  await expect(actions.first()).toHaveAttribute("aria-pressed", "false");

  await actions.first().hover();
  await page.mouse.down();
  await page.keyboard.down("Space");
  await page.keyboard.up("Space");
  await expect(actions.first()).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#game-root")).toHaveAttribute(
    "data-input",
    /^0,0,1$/,
  );
  await page.mouse.up();
});

test("reprojects the logical profile across orientation changes without duplicating canvas", async ({
  page,
}) => {
  await page.goto("/");
  await page.setViewportSize({ width: 1024, height: 768 });
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
  await expect(page.locator("[data-gameplay-status]")).toContainText(
    "Active; portrait",
  );
});
