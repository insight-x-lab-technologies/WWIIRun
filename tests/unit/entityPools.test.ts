import { describe, expect, test } from "vitest";
import { parseSeedHex } from "../../src/simulation/random";
import {
  activateEntity,
  createRunState,
  deactivateEntity,
  hashRunState,
  MAX_COINS,
  MAX_ENEMIES,
  MAX_PROJECTILES,
} from "../../src/simulation/run";

function state() {
  const seed = parseSeedHex("0123456789abcdeffedcba9876543210");
  if (!seed.ok) throw new Error("seed");
  return createRunState({
    mode: "daily",
    seed: seed.value,
    rulesetVersion: "rules.v1",
    contentVersion: "content.v1",
    aircraftId: "aircraft.p51d.v1",
    loadoutId: "loadout.daily.v1",
    modifierIds: [],
  });
}
describe("bounded entity pools", () => {
  test("preallocates canonical capacities and reuses cleared slots", () => {
    const run = state();
    expect([
      run.pools.projectiles.length,
      run.pools.enemies.length,
      run.pools.coins.length,
    ]).toEqual([MAX_PROJECTILES, MAX_ENEMIES, MAX_COINS]);
    expect(
      activateEntity(
        run.pools,
        "projectile",
        "projectile.placeholder.v1",
        0,
        0,
        1,
        0,
      ),
    ).toEqual({ status: "spawned", id: "projectile:0" });
    deactivateEntity(run.pools, "projectile", 0);
    expect(run.pools.projectiles[0]).toEqual({
      active: false,
      definitionId: "",
      position: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
      damage: 0,
      health: { current: 0, max: 0 },
      behavior: "",
      contactDamage: 0,
      value: 0,
    });
  });
  test("exhaustion is atomic and cursors affect the canonical hash", () => {
    const run = state();
    for (let index = 0; index < MAX_ENEMIES; index += 1)
      activateEntity(
        run.pools,
        "enemy",
        "enemy.placeholder.v1",
        index,
        0,
        0,
        0,
      );
    const before = hashRunState(run);
    expect(
      activateEntity(run.pools, "enemy", "enemy.placeholder.v1", 1, 1, 0, 0),
    ).toEqual({ status: "exhausted" });
    expect(hashRunState(run)).toBe(before);
  });
  test("invalid activation never publishes partial state", () => {
    const run = state();
    const before = hashRunState(run);
    expect(() =>
      activateEntity(
        run.pools,
        "coin",
        "coin.placeholder.v1",
        16_000_000,
        0,
        0,
        0,
      ),
    ).toThrow(RangeError);
    expect(hashRunState(run)).toBe(before);
  });
});
