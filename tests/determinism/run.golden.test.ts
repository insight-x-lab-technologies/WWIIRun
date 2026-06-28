import { describe, expect, test } from "vitest";

import { parseSeedHex, type RngState } from "../../src/simulation/random";
import {
  advanceRun,
  createRunState,
  hashRunState,
  stepRun,
  type RunConfig,
  type RunState,
} from "../../src/simulation/run";
import { runGoldenVectors } from "./runGoldenVectors";

const streamIds = ["spawn", "loot", "weather", "patterns"] as const;

describe("headless run golden corpus", () => {
  test("matches literal hashes at every checkpoint", () => {
    const state = createGoldenState();
    const actual = [{ tick: state.tick, hash: hashRunState(state) }];

    for (const input of runGoldenVectors.inputs) {
      stepRun(state, input);
      if (
        runGoldenVectors.checkpoints.some(({ tick }) => tick === state.tick)
      ) {
        actual.push({ tick: state.tick, hash: hashRunState(state) });
      }
    }

    expect(actual).toEqual(runGoldenVectors.checkpoints);
    expect(rngToHex(state)).toEqual(runGoldenVectors.finalRng);
  });

  test("matches frame, batch, partition, empty-batch, and repeated runs", () => {
    const stepped = createGoldenState();
    const batched = createGoldenState();
    const partitioned = createGoldenState();
    const repeated = createGoldenState();

    for (const input of runGoldenVectors.inputs) stepRun(stepped, input);
    advanceRun(batched, runGoldenVectors.inputs);
    advanceRun(partitioned, runGoldenVectors.inputs.slice(0, 1));
    advanceRun(partitioned, []);
    advanceRun(partitioned, runGoldenVectors.inputs.slice(1, 3));
    advanceRun(partitioned, runGoldenVectors.inputs.slice(3));
    advanceRun(repeated, runGoldenVectors.inputs);

    expect(batched).toEqual(stepped);
    expect(partitioned).toEqual(stepped);
    expect(repeated).toEqual(stepped);
    expect(hashRunState(stepped)).toBe(
      runGoldenVectors.checkpoints.at(-1)?.hash,
    );
  });
});

function createGoldenState(): RunState {
  const parsed = parseSeedHex(runGoldenVectors.config.seed);
  if (!parsed.ok) throw new Error(`Invalid golden seed: ${parsed.code}`);
  const config: RunConfig = {
    ...runGoldenVectors.config,
    seed: parsed.value,
  };
  const state = createRunState(config);
  expect(state.config.modifierIds).toEqual(
    runGoldenVectors.canonicalModifierIds,
  );
  return state;
}

function rngToHex(state: RunState) {
  return Object.fromEntries(
    streamIds.map((streamId) => [streamId, stateToHex(state.rng[streamId])]),
  );
}

function stateToHex(state: RngState): readonly string[] {
  return [state.s0, state.s1, state.s2, state.s3].map((word) =>
    word.toString(16).padStart(8, "0"),
  );
}
