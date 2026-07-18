import { describe, expect, test } from "vitest";

import {
  formatGameOverSummary,
  projectGameOverSummary,
} from "../../src/app/gameOverSummary";

describe("F1-09 game-over summary", () => {
  test("projects only the terminal snapshot fields and freezes their values", () => {
    const state = {
      tick: 181,
      config: {
        mode: "endless",
        seed: "00112233445566778899aabbccddeeff",
      },
      runStats: { runCoins: 4, enemiesDestroyed: 3 },
    } as Parameters<typeof projectGameOverSummary>[0];
    const before = structuredClone(state);
    const summary = projectGameOverSummary(state);

    expect(summary).toEqual({
      mode: "endless",
      seed: "00112233445566778899aabbccddeeff",
      distanceMeters: 3,
      durationTicks: 181,
      durationSeconds: 3,
      runCoins: 4,
      enemiesDestroyed: 3,
      level: 1,
    });
    expect(Object.isFrozen(summary)).toBe(true);
    expect(formatGameOverSummary(summary)).toEqual([
      "Mode: endless",
      "Seed: 00112233445566778899aabbccddeeff",
      "Distance: 3 m",
      "Run coins: 4",
      "Enemies destroyed: 3",
      "Duration: 181 ticks (3 s)",
      "Level: 1",
    ]);
    expect(state).toEqual(before);
  });

  test("fails closed for impossible terminal counters", () => {
    const state = {
      tick: -1,
      runStats: { runCoins: 0, enemiesDestroyed: 0 },
    } as Parameters<typeof projectGameOverSummary>[0];
    expect(() => projectGameOverSummary(state)).toThrow(RangeError);
  });
});
