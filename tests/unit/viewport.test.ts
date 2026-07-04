import { describe, expect, it } from "vitest";

import { calculateViewportLayout } from "../../src/platform/viewport/layout";

describe("calculateViewportLayout", () => {
  it("selects exact landscape and portrait logical profiles", () => {
    expect(
      calculateViewportLayout(1920, 1080, {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
      }),
    ).toMatchObject({
      orientation: "landscape",
      logicalWidth: 960,
      logicalHeight: 540,
      world: { x: 0, y: 0, width: 960, height: 540 },
      scale: 2,
    });
    expect(
      calculateViewportLayout(320, 568, {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
      }),
    ).toMatchObject({
      orientation: "portrait",
      logicalWidth: 540,
      logicalHeight: 960,
      world: { x: 0, y: 210, width: 540, height: 540 },
    });
  });

  it("uses safe area, keeps square landscape, and letterboxes ultrawide", () => {
    const square = calculateViewportLayout(120, 120, {
      top: 10,
      right: 10,
      bottom: 10,
      left: 10,
    });
    expect(square.orientation).toBe("landscape");
    expect(square.safeArea).toEqual({ x: 10, y: 10, width: 100, height: 100 });
    const ultrawide = calculateViewportLayout(2400, 900, {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    });
    expect(ultrawide.scale).toBeCloseTo(900 / 540);
    expect(ultrawide.canvasCss.width).toBeCloseTo(1600);
    expect(ultrawide.canvasCss.x).toBeCloseTo(400);
  });

  it.each([
    [0, 100, { top: 0, right: 0, bottom: 0, left: 0 }],
    [100, Number.NaN, { top: 0, right: 0, bottom: 0, left: 0 }],
    [100, 100, { top: -1, right: 0, bottom: 0, left: 0 }],
    [20, 20, { top: 0, right: 11, bottom: 0, left: 11 }],
  ])("fails closed for invalid dimensions/insets", (width, height, insets) => {
    expect(() => calculateViewportLayout(width, height, insets)).toThrow(
      TypeError,
    );
  });
});
