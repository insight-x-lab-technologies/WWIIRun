import { describe, expect, test } from "vitest";

import {
  createRngState,
  createRngStreams,
  nextIntExclusive,
  nextUint32,
  parseSeedHex,
  type RngState,
  type RngStreamId,
  type Seed128,
} from "../../src/simulation/random";
import { randomGoldenVectors } from "./randomGoldenVectors";

const streamIds = ["spawn", "loot", "weather", "patterns"] as const;

function hex(value: number): string {
  return value.toString(16).padStart(8, "0");
}

function stateFromHex(words: readonly string[]): RngState {
  const [s0, s1, s2, s3] = words.map((word) => Number.parseInt(word, 16));
  if (
    s0 === undefined ||
    s1 === undefined ||
    s2 === undefined ||
    s3 === undefined
  ) {
    throw new Error("Golden state must contain exactly four words.");
  }
  return { algorithm: "xoshiro128ss-v1", s0, s1, s2, s3 };
}

function stateToHex(state: RngState): readonly string[] {
  return [hex(state.s0), hex(state.s1), hex(state.s2), hex(state.s3)];
}

function seed(input: string): Seed128 {
  const result = parseSeedHex(input);
  if (!result.ok) throw new Error(`Invalid golden seed: ${result.code}`);
  return result.value;
}

describe("xoshiro128ss-v1 golden corpus", () => {
  test("matches canonical parser and word-order vectors", () => {
    for (const vector of randomGoldenVectors.parser) {
      const parsed = parseSeedHex(vector.input);
      expect(parsed).toEqual({ ok: true, value: vector.canonical });
      if (parsed.ok) {
        expect(stateToHex(createRngState(parsed.value))).toEqual(vector.words);
      }
    }
  });

  test("matches reference sequences and final states", () => {
    for (const vector of randomGoldenVectors.sequences) {
      const state = stateFromHex(vector.initialState);
      const outputs = Array.from({ length: vector.calls }, () =>
        hex(nextUint32(state)),
      );
      expect(outputs).toEqual(vector.outputs);
      expect(stateToHex(state)).toEqual(vector.finalState);
    }
  });

  test("matches jump-derived stream states for both reference seeds", () => {
    for (const vector of randomGoldenVectors.streams) {
      const streams = createRngStreams(seed(vector.seed));
      for (const streamId of streamIds) {
        expect(stateToHex(streams[streamId])).toEqual(vector.states[streamId]);
      }
      expect(new Set(streamIds.map((streamId) => streams[streamId])).size).toBe(
        4,
      );
    }
  });

  test("keeps stream sequences independent of consumption order", () => {
    const reference = randomGoldenVectors.streams[0];
    const firstBank = createRngStreams(seed(reference.seed));
    const secondBank = createRngStreams(seed(reference.seed));
    const forward = consume(firstBank, streamIds);
    const reverse = consume(secondBank, [...streamIds].reverse());

    for (const streamId of streamIds) {
      expect(forward[streamId]).toEqual(reverse[streamId]);
    }
  });

  test("matches the bounded rejection vector and final state", () => {
    for (const vector of randomGoldenVectors.bounded) {
      const state = stateFromHex(vector.initialState);
      const control = stateFromHex(vector.initialState);
      for (let index = 0; index < vector.drawsConsumed; index += 1) {
        nextUint32(control);
      }

      expect(hex(nextIntExclusive(state, vector.upperExclusive))).toBe(
        vector.output,
      );
      expect(stateToHex(state)).toEqual(vector.finalState);
      expect(state).toEqual(control);
    }
  });
});

function consume(
  streams: Record<RngStreamId, RngState>,
  order: readonly RngStreamId[],
): Record<RngStreamId, readonly string[]> {
  const outputs = {} as Record<RngStreamId, readonly string[]>;
  for (const streamId of order) {
    outputs[streamId] = Array.from({ length: 5 }, () =>
      hex(nextUint32(streams[streamId])),
    );
  }
  return outputs;
}
