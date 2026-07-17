import { describe, expect, test } from "vitest";

import { parseSeedHex } from "../../src/simulation/random";
import {
  activateEnemy,
  collectContacts,
  createRunState,
  hashRunState,
  InputActionBits,
  stepRun,
  tryActivateProjectile,
  type RunConfig,
} from "../../src/simulation/run";

const seed = parseSeedHex("0123456789abcdeffedcba9876543210");
if (!seed.ok) throw new Error("test seed invalid");
const config: RunConfig = {
  mode: "endless",
  seed: seed.value,
  rulesetVersion: "rules.v1",
  contentVersion: "content.v1",
  aircraftId: "aircraft.placeholder.v1",
  loadoutId: "loadout.v1",
  modifierIds: [],
};

describe("F1-04 combat", () => {
  test("fires only on successful six-tick cooldown opportunities", () => {
    const state = createRunState(config);
    stepRun(state, {
      moveX: 0,
      moveY: 0,
      actions: InputActionBits.firePrimary,
    });
    expect(state.pools.projectiles[0]).toMatchObject({
      active: true,
      definitionId: "projectile.placeholder.v1",
      damage: 1,
      velocity: { x: 2048, y: 0 },
    });
    expect(state.primaryCooldownTicks).toBe(6);
    for (let i = 0; i < 5; i += 1)
      stepRun(state, {
        moveX: 0,
        moveY: 0,
        actions: InputActionBits.firePrimary,
      });
    expect(state.pools.projectiles.filter((slot) => slot.active)).toHaveLength(
      1,
    );
    stepRun(state, {
      moveX: 0,
      moveY: 0,
      actions: InputActionBits.firePrimary,
    });
    expect(state.pools.projectiles.filter((slot) => slot.active)).toHaveLength(
      2,
    );
  });

  test("activates combat enemy definitions and resolves projectile damage once", () => {
    const state = createRunState(config);
    const result = activateEnemy(
      state.pools,
      "enemy.scout.v1",
      60000,
      state.player.position.y,
    );
    expect(result.status).toBe("spawned");
    const enemy = state.pools.enemies[0]!;
    expect(enemy).toMatchObject({
      active: true,
      health: { current: 3, max: 3 },
      behavior: "scout",
      contactDamage: 10,
    });
    state.pools.projectiles[0] = {
      active: true,
      definitionId: "projectile.placeholder.v1",
      position: { x: 60000, y: state.player.position.y },
      velocity: { x: 0, y: 0 },
      damage: 3,
      health: { current: 0, max: 0 },
      behavior: "",
      contactDamage: 0,
      value: 0,
    };
    stepRun(state, { moveX: 0, moveY: 0, actions: 0 });
    expect(enemy.active).toBe(false);
    expect(state.pools.projectiles[0].active).toBe(false);
  });

  test("includes cooldown and combat fields in the canonical hash", () => {
    const baseline = createRunState(config);
    const cooldown = createRunState(config);
    cooldown.primaryCooldownTicks = 1;
    const enemy = createRunState(config);
    activateEnemy(enemy.pools, "enemy.interceptor.v1", 60000, 50000);
    expect(hashRunState(cooldown)).not.toBe(hashRunState(baseline));
    expect(hashRunState(enemy)).not.toBe(hashRunState(baseline));
  });

  test("reuses preallocated combat storage across a 120-tick saturated probe", () => {
    const state = createRunState(config);
    const projectiles = state.pools.projectiles;
    const enemies = state.pools.enemies;
    const scratch = state.broadPhase;
    for (let index = 0; index < 256; index += 1)
      expect(
        tryActivateProjectile(
          state.pools,
          state.player.position.x,
          state.player.position.y,
          0,
          1,
        ),
      ).toBe(true);
    expect(tryActivateProjectile(state.pools, 0, 0, 0, 1)).toBe(false);
    for (let index = 0; index < 64; index += 1)
      activateEnemy(
        state.pools,
        index % 2 === 0 ? "enemy.scout.v1" : "enemy.interceptor.v1",
        state.player.position.x,
        state.player.position.y,
      );
    collectContacts(
      state.pools,
      state.player,
      [{ kind: "aabb", offsetX: 0, offsetY: 0, halfWidth: 1, halfHeight: 1 }],
      scratch,
    );
    expect(scratch.contactCount).toBe(16_448);
    for (let index = 0; index < projectiles.length; index += 1) {
      const projectile = projectiles[index]!;
      projectile.position.x = 1_000_000 + index * 4_096;
      projectile.position.y = 1_000_000;
    }
    for (let index = 0; index < enemies.length; index += 1) {
      const enemy = enemies[index]!;
      enemy.position.x = 3_000_000 + index * 4_096;
      enemy.position.y = 3_000_000;
    }
    for (let tick = 0; tick < 120; tick += 1)
      stepRun(state, {
        moveX: 0,
        moveY: 0,
        actions: InputActionBits.firePrimary,
      });
    expect(projectiles).toBe(state.pools.projectiles);
    expect(enemies).toBe(state.pools.enemies);
    expect(scratch).toBe(state.broadPhase);
    expect(projectiles).toHaveLength(256);
    expect(enemies).toHaveLength(64);
  }, 15_000);
});
