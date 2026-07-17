import { describe, expect, test } from "vitest";

import {
  formatCompactSeed,
  formatDistance,
  formatSpeed,
  projectHud,
  RenderFpsWindow,
} from "../../src/game/hudProjection";

describe("F1-08 HUD projection", () => {
  test("formats only canonical snapshot fields with the specified units", () => {
    expect(formatDistance(119)).toBe("1 m");
    expect(formatSpeed({ x: -256, y: 128 })).toBe("216 km/h");
    expect(formatCompactSeed("00112233445566778899aabbccddeeff")).toBe(
      "00112233…ccddeeff",
    );
    const state = {
      tick: 180,
      config: { seed: "00112233445566778899aabbccddeeff" },
      player: { health: { current: 7, max: 10 }, velocity: { x: 256, y: 0 } },
      runStats: { runCoins: 3 },
    } as Parameters<typeof projectHud>[0];
    const before = structuredClone(state);
    expect(projectHud(state, "60 FPS")).toEqual({
      life: "7/10",
      distance: "3 m",
      coins: "3",
      fps: "60 FPS",
      level: "1",
      speed: "216 km/h",
      seed: "00112233…ccddeeff",
      fullSeed: "00112233445566778899aabbccddeeff",
    });
    expect(state).toEqual(before);
  });

  test("uses a bounded local render FPS window and rejects invalid deltas", () => {
    const fps = new RenderFpsWindow();
    expect(fps.update(1000 / 60)).toBe("60 FPS");
    expect(fps.update(0)).toBe("—");
    expect(fps.update(Number.NaN)).toBe("—");
    expect(fps.update(1000 / 30)).toBe("30 FPS");
  });
});
