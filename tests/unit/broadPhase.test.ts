import { expect, test } from "vitest";
import { parseSeedHex } from "../../src/simulation/random";
import {
  activateEntity,
  candidateAt,
  collectContacts,
  createBroadPhaseScratch,
  createRunState,
} from "../../src/simulation/run";
import { PLACEHOLDER_AIRCRAFT } from "../../src/simulation/aircraft";

test("broad phase emits canonical allowed candidates and reuses its scratch buffers", () => {
  const seed = parseSeedHex("0123456789abcdeffedcba9876543210");
  if (!seed.ok) throw new Error("seed");
  const state = createRunState({
    mode: "daily",
    seed: seed.value,
    rulesetVersion: "rules.v1",
    contentVersion: "content.v1",
    aircraftId: "aircraft.p51d.v1",
    loadoutId: "loadout.daily.v1",
    modifierIds: [],
  });
  activateEntity(
    state.pools,
    "enemy",
    "enemy.placeholder.v1",
    state.player.position.x,
    state.player.position.y,
    0,
    0,
  );
  activateEntity(
    state.pools,
    "coin",
    "coin.placeholder.v1",
    state.player.position.x,
    state.player.position.y,
    0,
    0,
  );
  activateEntity(
    state.pools,
    "projectile",
    "projectile.placeholder.v1",
    state.player.position.x,
    state.player.position.y,
    0,
    0,
  );
  const scratch = createBroadPhaseScratch();
  const candidates = scratch.candidateCodes;
  collectContacts(
    state.pools,
    state.player,
    PLACEHOLDER_AIRCRAFT.hitboxes,
    scratch,
  );
  expect(
    Array.from({ length: scratch.candidateCount }, (_, index) =>
      candidateAt(scratch, index),
    ),
  ).toEqual([
    { first: "player:0", second: "enemy:0" },
    { first: "player:0", second: "coin:0" },
    { first: "projectile:0", second: "enemy:0" },
  ]);
  expect(scratch.contactCount).toBe(3);
  expect(scratch.metrics.occupancies).toBeGreaterThan(0);
  collectContacts(
    state.pools,
    state.player,
    PLACEHOLDER_AIRCRAFT.hitboxes,
    scratch,
  );
  expect(scratch.candidateCodes).toBe(candidates);
});

test("broad phase rejects distinct cells, includes shared boundaries, and deduplicates multi-cell pairs", () => {
  const seed = parseSeedHex("0123456789abcdeffedcba9876543210");
  if (!seed.ok) throw new Error("seed");
  const state = createRunState({
    mode: "daily",
    seed: seed.value,
    rulesetVersion: "rules.v1",
    contentVersion: "content.v1",
    aircraftId: "aircraft.p51d.v1",
    loadoutId: "loadout.daily.v1",
    modifierIds: [],
  });
  const scratch = createBroadPhaseScratch();
  activateEntity(
    state.pools,
    "enemy",
    "enemy.placeholder.v1",
    state.player.position.x + 10 * 16_384,
    state.player.position.y,
    0,
    0,
  );
  collectContacts(
    state.pools,
    state.player,
    PLACEHOLDER_AIRCRAFT.hitboxes,
    scratch,
  );
  expect(scratch.candidateCount).toBe(0);
  state.pools.enemies[0]!.position.x = 65_536;
  collectContacts(
    state.pools,
    state.player,
    PLACEHOLDER_AIRCRAFT.hitboxes,
    scratch,
  );
  expect(scratch.candidateCount).toBe(0);
  state.pools.enemies[0]!.position.x = state.player.position.x;
  state.pools.enemies[0]!.position.y = 65_536;
  collectContacts(
    state.pools,
    state.player,
    PLACEHOLDER_AIRCRAFT.hitboxes,
    scratch,
  );
  expect(candidateAt(scratch, 0)).toEqual({
    first: "player:0",
    second: "enemy:0",
  });
  expect(scratch.metrics.rawPairs).toBeGreaterThan(scratch.metrics.uniquePairs);
  expect(scratch.metrics.uniquePairs).toBe(1);
  expect(scratch.contactCount).toBe(1);
  expect(scratch.metrics.primitiveComparisons).toBe(3);
});

test("broad phase stays bounded for all pools across 120 warm ticks without replacing scratch", () => {
  const seed = parseSeedHex("0123456789abcdeffedcba9876543210");
  if (!seed.ok) throw new Error("seed");
  const state = createRunState({
    mode: "daily",
    seed: seed.value,
    rulesetVersion: "rules.v1",
    contentVersion: "content.v1",
    aircraftId: "aircraft.p51d.v1",
    loadoutId: "loadout.daily.v1",
    modifierIds: [],
  });
  for (let index = 0; index < 256; index += 1)
    activateEntity(
      state.pools,
      "projectile",
      "projectile.placeholder.v1",
      state.player.position.x,
      state.player.position.y,
      0,
      0,
    );
  for (let index = 0; index < 64; index += 1)
    activateEntity(
      state.pools,
      "enemy",
      "enemy.placeholder.v1",
      state.player.position.x,
      state.player.position.y,
      0,
      0,
    );
  for (let index = 0; index < 128; index += 1)
    activateEntity(
      state.pools,
      "coin",
      "coin.placeholder.v1",
      state.player.position.x,
      state.player.position.y,
      0,
      0,
    );
  const scratch = createBroadPhaseScratch(),
    metric = scratch.narrowMetrics,
    candidates = scratch.candidateCodes,
    contacts = scratch.contactCodes,
    occupancyX = scratch.occupiedCellsX;
  collectContacts(
    state.pools,
    state.player,
    PLACEHOLDER_AIRCRAFT.hitboxes,
    scratch,
  );
  for (let tick = 0; tick < 120; tick += 1)
    collectContacts(
      state.pools,
      state.player,
      PLACEHOLDER_AIRCRAFT.hitboxes,
      scratch,
    );
  expect(scratch.candidateCount).toBe(16_576);
  expect(scratch.contactCount).toBe(16_576);
  expect(scratch.metrics.uniquePairs).toBe(16_576);
  expect(scratch.metrics.rawPairs).toBeGreaterThanOrEqual(16_576);
  expect(scratch.metrics.primitiveComparisons).toBe(16_576);
  expect(scratch.narrowMetrics).toBe(metric);
  expect(scratch.candidateCodes).toBe(candidates);
  expect(scratch.contactCodes).toBe(contacts);
  expect(scratch.occupiedCellsX).toBe(occupancyX);
}, 20_000);
