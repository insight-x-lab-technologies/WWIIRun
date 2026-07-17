import { describe, expect, test } from "vitest";
import { parseSeedHex } from "../../src/simulation/random";
import {
  activateStructure,
  applyStructureModuleDamage,
  candidateAt,
  collectContacts,
  createRunState,
  hashRunState,
  MODULAR_BLOCK_STRUCTURE,
  stepRun,
  tryActivateProjectile,
  type RunConfig,
} from "../../src/simulation/run";
import { PLACEHOLDER_AIRCRAFT } from "../../src/simulation/aircraft";

const parsed = parseSeedHex("0123456789abcdeffedcba9876543210");
if (!parsed.ok) throw new Error("seed");
const config: RunConfig = {
  mode: "endless",
  seed: parsed.value,
  rulesetVersion: "rules.v1",
  contentVersion: "content.v1",
  aircraftId: "aircraft.placeholder.v1",
  loadoutId: "loadout.v1",
  modifierIds: [],
};
const create = () => createRunState(config);

describe("F1-05 modular structures", () => {
  test("preallocates sentinels and activates the fixed definition canonically", () => {
    const state = create();
    expect(state.schemaVersion).toBe(5);
    expect(state.pools.structures).toHaveLength(16);
    expect(state.pools.cursors.structure).toBe(0);
    expect(state.pools.structures[0]!.modules).toEqual(
      Array.from({ length: 4 }, () => ({
        active: false,
        health: { current: 0, max: 0 },
      })),
    );
    expect(
      activateStructure(state.pools, MODULAR_BLOCK_STRUCTURE.id, 0, 0, 0, 0),
    ).toEqual({ status: "spawned", id: "structure:0" });
    expect(
      state.pools.structures[0]!.modules.map((module) => module.health.current),
    ).toEqual([3, 3, 3, 0]);
    expect(state.pools.cursors.structure).toBe(1);
  });
  test("rejects invalid activation and exhaustion without changing the canonical hash", () => {
    const state = create();
    const before = hashRunState(state);
    expect(() =>
      activateStructure(state.pools, "structure.invalid", 0, 0, 0, 0),
    ).toThrow(TypeError);
    expect(hashRunState(state)).toBe(before);
    for (let index = 0; index < 16; index += 1)
      activateStructure(
        state.pools,
        MODULAR_BLOCK_STRUCTURE.id,
        index * 8192,
        0,
        0,
        0,
      );
    const full = hashRunState(state);
    expect(
      activateStructure(state.pools, MODULAR_BLOCK_STRUCTURE.id, 0, 0, 0, 0),
    ).toEqual({ status: "exhausted" });
    expect(hashRunState(state)).toBe(full);
  });
  test("deduplicates module pairs, resolves projectile damage and clears only after the final module", () => {
    const state = create();
    activateStructure(
      state.pools,
      MODULAR_BLOCK_STRUCTURE.id,
      state.player.position.x,
      state.player.position.y,
      0,
      0,
    );
    collectContacts(
      state.pools,
      state.player,
      PLACEHOLDER_AIRCRAFT.hitboxes,
      state.broadPhase,
    );
    expect(
      Array.from({ length: state.broadPhase.candidateCount }, (_, index) =>
        candidateAt(state.broadPhase, index),
      ),
    ).toContainEqual({ first: "player:0", second: "structure:0:module:1" });
    for (let moduleIndex = 0; moduleIndex < 3; moduleIndex += 1) {
      const x = state.player.position.x + (moduleIndex - 1) * 4096;
      expect(
        tryActivateProjectile(state.pools, x, state.player.position.y, 0, 3),
      ).toBe(true);
      stepRun(state, { moveX: 0, moveY: 0, actions: 0 });
    }
    expect(state.pools.structures[0]!.active).toBe(false);
    expect(state.pools.projectiles.filter((slot) => slot.active)).toHaveLength(
      0,
    );
  });
  test("hash includes module state while scratch remains excluded", () => {
    const baseline = create(),
      changed = create();
    activateStructure(changed.pools, MODULAR_BLOCK_STRUCTURE.id, 0, 0, 0, 0);
    expect(hashRunState(changed)).not.toBe(hashRunState(baseline));
    const before = hashRunState(changed);
    changed.broadPhase.metrics.occupancies = 99;
    expect(hashRunState(changed)).toBe(before);
    applyStructureModuleDamage(changed.pools, 0, 0, 1);
    expect(hashRunState(changed)).not.toBe(before);
  });
});
