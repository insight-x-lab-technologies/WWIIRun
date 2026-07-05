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

    expect(actual).toEqual(runV2GoldenVectors.checkpoints);
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

    expect(batched).toEqual(stepped);
    expect(partitioned).toEqual(stepped);
    expect(repeated).toEqual(stepped);
    expect(hashRunState(stepped)).toBe(
      runV2GoldenVectors.checkpoints.at(-1)?.hash,
    );
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
