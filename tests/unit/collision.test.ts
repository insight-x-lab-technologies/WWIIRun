import { describe, expect, test } from "vitest";

import {
  createCompoundHitbox,
  intersectsCompound,
  intersectsPrimitive,
  type Hitbox,
} from "../../src/simulation/collision";

const origin = { x: 0, y: 0 };
const aabb: Hitbox = {
  kind: "aabb",
  offsetX: 0,
  offsetY: 0,
  halfWidth: 10,
  halfHeight: 5,
};
const circle: Hitbox = { kind: "circle", offsetX: 0, offsetY: 0, radius: 5 };

describe("integer narrow phase", () => {
  test.each([
    [aabb, { x: 20, y: 0 }, aabb, true],
    [aabb, { x: 21, y: 0 }, aabb, false],
    [circle, { x: 10, y: 0 }, circle, true],
    [circle, { x: 11, y: 0 }, circle, false],
    [circle, { x: 15, y: 0 }, aabb, true],
    [circle, { x: 16, y: 0 }, aabb, false],
  ] as const)(
    "handles separated and tangent primitive pairs symmetrically",
    (left, position, right, expected) => {
      expect(intersectsPrimitive(origin, left, position, right)).toBe(expected);
      expect(intersectsPrimitive(position, right, origin, left)).toBe(expected);
    },
  );

  test("validates compounds and intersects if any ordered pair intersects", () => {
    const first = createCompoundHitbox([aabb, circle]);
    const second = createCompoundHitbox([circle]);
    expect(intersectsCompound(origin, first, { x: 15, y: 0 }, second)).toBe(
      true,
    );
    expect(intersectsCompound(origin, first, { x: 100, y: 0 }, second)).toBe(
      false,
    );
    expect(() => createCompoundHitbox([])).toThrow(RangeError);
    for (const shape of [
      { ...aabb, halfWidth: 0 },
      { ...circle, radius: -1 },
      { ...circle, offsetX: 1.5 },
    ])
      expect(() => createCompoundHitbox([shape])).toThrow(RangeError);
  });

  test("runs 10,000 compound probes with stable shape identities and exact results", () => {
    const first = createCompoundHitbox([aabb, circle]);
    const second = createCompoundHitbox([circle]);
    const identities = [...first, ...second];
    const moving = { x: 0, y: 0 };
    const metrics = { primitiveComparisons: 0 };
    const started = performance.now();
    let intersections = 0;
    for (let index = 0; index < 10_000; index += 1) {
      moving.x = index % 20;
      if (intersectsCompound(origin, first, moving, second, metrics))
        intersections += 1;
    }
    const elapsedMs = performance.now() - started;
    expect(intersections).toBe(8_000);
    expect(metrics.primitiveComparisons).toBe(12_000);
    expect([...first, ...second]).toEqual(identities);
    expect(first[0]).toBe(identities[0]);
    expect(first[1]).toBe(identities[1]);
    expect(second[0]).toBe(identities[2]);
    expect({ probes: 10_000, elapsedMs: Number.isFinite(elapsedMs) }).toEqual({
      probes: 10_000,
      elapsedMs: true,
    });
  });
});
