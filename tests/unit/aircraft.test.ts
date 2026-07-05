import { describe, expect, test } from "vitest";

import {
  DAMAGE_AMOUNT_CAP,
  PLACEHOLDER_AIRCRAFT,
  SIMULATION_UNITS_PER_LOGICAL_PIXEL as U,
  applyDamage,
  createPlayerState,
  stepPlayer,
} from "../../src/simulation/aircraft";

describe("placeholder aircraft", () => {
  test("defines canonical spawn, movement, health, bounds, and compound hitbox", () => {
    expect(PLACEHOLDER_AIRCRAFT).toMatchObject({
      id: "aircraft.placeholder.v1",
      maxHealth: 100,
      damageInvulnerabilityTicks: 30,
      acceleration: 96,
      maxSpeed: 768,
      drag: 64,
      spawn: { x: 160 * U, y: 270 * U },
      bounds: { minX: 48 * U, maxX: 320 * U, minY: 32 * U, maxY: 508 * U },
    });
    expect(PLACEHOLDER_AIRCRAFT.hitboxes).toEqual([
      {
        kind: "aabb",
        offsetX: 0,
        offsetY: 0,
        halfWidth: 22 * U,
        halfHeight: 8 * U,
      },
      {
        kind: "aabb",
        offsetX: -4 * U,
        offsetY: 0,
        halfWidth: 8 * U,
        halfHeight: 20 * U,
      },
      { kind: "circle", offsetX: 22 * U, offsetY: 0, radius: 6 * U },
    ]);
    expect(Object.isFrozen(PLACEHOLDER_AIRCRAFT.hitboxes)).toBe(true);
  });

  test("creates canonical mutable player state and moves with acceleration, cap, drag, and bounds", () => {
    const player = createPlayerState();
    expect(player).toEqual({
      definitionId: "aircraft.placeholder.v1",
      position: { x: 160 * U, y: 270 * U },
      velocity: { x: 0, y: 0 },
      health: { current: 100, max: 100 },
      invulnerabilityTicks: 0,
      status: "active",
    });
    stepPlayer(player, { moveX: 127, moveY: -127, actions: 0 });
    expect(player.velocity).toEqual({ x: 96, y: -96 });
    for (let index = 0; index < 20; index += 1)
      stepPlayer(player, { moveX: 127, moveY: 0, actions: 0 });
    expect(player.velocity.x).toBe(768);
    expect(player.velocity.y).toBe(0);
    for (let index = 0; index < 1000; index += 1)
      stepPlayer(player, { moveX: 127, moveY: -127, actions: 0 });
    expect(player.position).toEqual({ x: 320 * U, y: 32 * U });
    expect(player.velocity).toEqual({ x: 0, y: 0 });
  });

  test("applies damage atomically, decrements invulnerability per tick, and destroys once", () => {
    const player = createPlayerState();
    const before = structuredClone(player);
    for (const amount of [0, -1, 1.5, DAMAGE_AMOUNT_CAP + 1]) {
      expect(() => applyDamage(player, amount)).toThrow(RangeError);
      expect(player).toEqual(before);
    }
    expect(applyDamage(player, 40)).toBe("applied");
    expect(player.health.current).toBe(60);
    expect(player.invulnerabilityTicks).toBe(30);
    expect(applyDamage(player, 10)).toBe("ignored");
    for (let index = 0; index < 30; index += 1)
      stepPlayer(player, { moveX: 0, moveY: 0, actions: 0 });
    expect(player.invulnerabilityTicks).toBe(0);
    expect(applyDamage(player, 100)).toBe("destroyed");
    expect(player).toMatchObject({
      health: { current: 0, max: 100 },
      status: "destroyed",
      velocity: { x: 0, y: 0 },
    });
    const destroyed = structuredClone(player);
    expect(applyDamage(player, 1)).toBe("ignored");
    stepPlayer(player, { moveX: 127, moveY: 127, actions: 0 });
    expect(player).toEqual(destroyed);
  });
});
