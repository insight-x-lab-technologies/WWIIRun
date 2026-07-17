import { describe, expect, test } from "vitest";

import { parseSeedHex } from "../../src/simulation/random";
import {
  advanceRun,
  createRunState,
  hashRunState,
  stepRun,
  type RunConfig,
  type RunState,
} from "../../src/simulation/run";
import { runGoldenVectors } from "./runGoldenVectors";
import { runV2GoldenVectors } from "./runV2GoldenVectors";
import { runV4GoldenVectors } from "./runV4GoldenVectors";
import { runV5GoldenVectors } from "./runV5GoldenVectors";
import { runV6GoldenVectors } from "./runV6GoldenVectors";
import { runV6LootGoldenVectors } from "./runV6LootGoldenVectors";
import { activateEnemy, tryActivateProjectile } from "../../src/simulation/run";

const runV3Checkpoints = [
  { tick: 0, hash: "ed1cf31232d871b7" },
  { tick: 1, hash: "591a387cc0accd65" },
  { tick: 3, hash: "4bd178e4ff851577" },
  { tick: 8, hash: "fad2ea090cd25723" },
] as const;
const { checkpoints: runV6Checkpoints } = runV6GoldenVectors;

describe("headless run golden corpus", () => {
  test("matches literal hashes at every checkpoint", () => {
    const state = createGoldenState();
    const actual = [{ tick: state.tick, hash: hashRunState(state) }];

    for (const input of runV2GoldenVectors.inputs) {
      stepRun(state, input);
      if (
        runV2GoldenVectors.checkpoints.some(({ tick }) => tick === state.tick)
      ) {
        actual.push({ tick: state.tick, hash: hashRunState(state) });
      }
    }

    expect(actual).toEqual(runV6Checkpoints);
    expect(state.player).toEqual(runV2GoldenVectors.finalPlayer);
  });

  test("matches frame, batch, partition, empty-batch, and repeated runs", () => {
    const stepped = createGoldenState();
    const batched = createGoldenState();
    const partitioned = createGoldenState();
    const repeated = createGoldenState();

    for (const input of runGoldenVectors.inputs) stepRun(stepped, input);
    advanceRun(batched, runV2GoldenVectors.inputs);
    advanceRun(partitioned, runV2GoldenVectors.inputs.slice(0, 1));
    advanceRun(partitioned, []);
    advanceRun(partitioned, runV2GoldenVectors.inputs.slice(1, 3));
    advanceRun(partitioned, runV2GoldenVectors.inputs.slice(3));
    advanceRun(repeated, runV2GoldenVectors.inputs);

    const expectedHash = runV6Checkpoints.at(-1)?.hash;
    expect(hashRunState(stepped)).toBe(expectedHash);
    expect(hashRunState(batched)).toBe(expectedHash);
    expect(hashRunState(partitioned)).toBe(expectedHash);
    expect(hashRunState(repeated)).toBe(expectedHash);
  });
});

test("matches the independent v6 loot checkpoints", () => {
  const state = createGoldenState();
  activateEnemy(state.pools, "enemy.scout.v1", 60_000, state.player.position.y);
  tryActivateProjectile(state.pools, 59_488, state.player.position.y, 0, 3);
  state.rng.loot.s0 = 1;
  state.rng.loot.s1 = 0xb61c71c7;
  state.rng.loot.s2 = 0;
  state.rng.loot.s3 = 0;
  const actual = [{ tick: state.tick, hash: hashRunState(state) }];
  stepRun(state, { moveX: 0, moveY: 0, actions: 0 });
  actual.push({ tick: state.tick, hash: hashRunState(state) });
  expect(actual).toEqual(runV6LootGoldenVectors.checkpoints);
  expect(state.runStats).toEqual({
    runCoins: 0,
    coinsSpawned: 1,
    coinsCollected: 0,
    enemiesDestroyed: 1,
  });
});

function createGoldenState(): RunState {
  const parsed = parseSeedHex(runV2GoldenVectors.config.seed);
  if (!parsed.ok) throw new Error(`Invalid golden seed: ${parsed.code}`);
  const config: RunConfig = {
    ...runV2GoldenVectors.config,
    seed: parsed.value,
  };
  const state = createRunState(config);
  expect(state.config.modifierIds).toEqual(
    runV2GoldenVectors.canonicalModifierIds,
  );
  return state;
}

test("preserves the complete v1 golden vector fixture byte-for-byte", () => {
  expect(runGoldenVectors.checkpoints).toEqual([
    { tick: 0, hash: "0c8d1a30d7b17210" },
    { tick: 1, hash: "0de18a8817e3a594" },
    { tick: 3, hash: "6c361b31acf23fb3" },
    { tick: 8, hash: "8915f7da45a2a608" },
  ]);
});

test("preserves the literal historical v3 checkpoints", () => {
  expect(runV3Checkpoints).toEqual([
    { tick: 0, hash: "ed1cf31232d871b7" },
    { tick: 1, hash: "591a387cc0accd65" },
    { tick: 3, hash: "4bd178e4ff851577" },
    { tick: 8, hash: "fad2ea090cd25723" },
  ]);
});

test("preserves the literal historical v4 fixture", () => {
  expect(runV4GoldenVectors.checkpoints).toEqual([
    { tick: 0, hash: "7872620e85f718a5" },
    { tick: 1, hash: "f5669c004c76448c" },
    { tick: 3, hash: "ec3b3be55012d628" },
    { tick: 8, hash: "b142516a99acbc04" },
  ]);
});

test("preserves the literal historical v5 fixture", () => {
  expect(runV5GoldenVectors.checkpoints).toEqual([
    { tick: 0, hash: "93bb88d1368664f3" },
    { tick: 1, hash: "0d32f0b48cc68244" },
    { tick: 3, hash: "81f9f679f77a8e70" },
    { tick: 8, hash: "12078eecb5d76110" },
  ]);
});
