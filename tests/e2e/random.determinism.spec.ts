import { expect, test } from "@playwright/test";

import { randomGoldenVectors } from "../determinism/randomGoldenVectors";

type BrowserRngState = {
  readonly algorithm: "xoshiro128ss-v1";
  s0: number;
  s1: number;
  s2: number;
  s3: number;
};

type BrowserRandomModule = {
  parseSeedHex(
    input: string,
  ):
    | { readonly ok: true; readonly value: string }
    | { readonly ok: false; readonly code: string };
  createRngState(seed: string): BrowserRngState;
  createRngStreams(seed: string): Record<string, BrowserRngState>;
  nextUint32(state: BrowserRngState): number;
  nextIntExclusive(state: BrowserRngState, upperExclusive: number): number;
};

test("matches the Node deterministic corpus in Chromium", async ({ page }) => {
  await page.goto("/");

  const actual = await page.evaluate(async (corpus) => {
    const modulePath = "/src/simulation/random/index.ts";
    const random = (await import(modulePath)) as unknown as BrowserRandomModule;
    const hex = (value: number): string => value.toString(16).padStart(8, "0");
    const stateFromHex = (words: readonly string[]): BrowserRngState => ({
      algorithm: "xoshiro128ss-v1",
      s0: Number.parseInt(words[0] ?? "", 16),
      s1: Number.parseInt(words[1] ?? "", 16),
      s2: Number.parseInt(words[2] ?? "", 16),
      s3: Number.parseInt(words[3] ?? "", 16),
    });
    const stateToHex = (state: BrowserRngState): readonly string[] => [
      hex(state.s0),
      hex(state.s1),
      hex(state.s2),
      hex(state.s3),
    ];

    const parser = corpus.parser.map((vector) => {
      const parsed = random.parseSeedHex(vector.input);
      if (!parsed.ok)
        throw new Error(`Browser rejected golden seed: ${parsed.code}`);
      return {
        canonical: parsed.value,
        words: stateToHex(random.createRngState(parsed.value)),
      };
    });

    const sequences = corpus.sequences.map((vector) => {
      const state = stateFromHex(vector.initialState);
      return {
        outputs: Array.from({ length: vector.calls }, () =>
          hex(random.nextUint32(state)),
        ),
        finalState: stateToHex(state),
      };
    });

    const streams = corpus.streams.map((vector) => {
      const bank = random.createRngStreams(vector.seed);
      return Object.fromEntries(
        Object.keys(vector.states).map((streamId) => {
          const state = bank[streamId];
          if (state === undefined)
            throw new Error(`Missing stream ${streamId}.`);
          return [streamId, stateToHex(state)];
        }),
      );
    });

    const bounded = corpus.bounded.map((vector) => {
      const boundedState = stateFromHex(vector.initialState);
      return {
        output: hex(
          random.nextIntExclusive(boundedState, vector.upperExclusive),
        ),
        finalState: stateToHex(boundedState),
      };
    });

    return { parser, sequences, streams, bounded };
  }, randomGoldenVectors);

  expect(actual.parser).toEqual(
    randomGoldenVectors.parser.map((vector) => ({
      canonical: vector.canonical,
      words: vector.words,
    })),
  );
  expect(actual.sequences).toEqual(
    randomGoldenVectors.sequences.map((vector) => ({
      outputs: vector.outputs,
      finalState: vector.finalState,
    })),
  );
  expect(actual.streams).toEqual(
    randomGoldenVectors.streams.map((vector) => vector.states),
  );
  expect(actual.bounded).toEqual(
    randomGoldenVectors.bounded.map((vector) => ({
      output: vector.output,
      finalState: vector.finalState,
    })),
  );
});
