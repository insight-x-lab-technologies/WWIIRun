import { expect, test } from "@playwright/test";

import { runV2GoldenVectors as runGoldenVectors } from "../determinism/runV2GoldenVectors";

type BrowserRunState = {
  readonly tick: number;
  readonly config: { readonly modifierIds: readonly string[] };
  readonly rng: Record<
    string,
    { s0: number; s1: number; s2: number; s3: number }
  >;
};

type BrowserRunModule = {
  createRunState(config: typeof runGoldenVectors.config): BrowserRunState;
  stepRun(
    state: BrowserRunState,
    input: (typeof runGoldenVectors.inputs)[number],
  ): void;
  advanceRun(
    state: BrowserRunState,
    inputs: typeof runGoldenVectors.inputs,
  ): void;
  hashRunState(state: BrowserRunState): string;
};

test("matches the Node headless run corpus in Chromium", async ({ page }) => {
  await page.goto("/");

  const actual = await page.evaluate(async (corpus) => {
    const modulePath = "/src/simulation/run/index.ts";
    const run = (await import(modulePath)) as unknown as BrowserRunModule;
    const streamIds = ["spawn", "loot", "weather", "patterns"] as const;
    const state = run.createRunState(corpus.config);
    const checkpoints = [{ tick: state.tick, hash: run.hashRunState(state) }];

    for (const input of corpus.inputs) {
      run.stepRun(state, input);
      if (corpus.checkpoints.some(({ tick }) => tick === state.tick)) {
        checkpoints.push({ tick: state.tick, hash: run.hashRunState(state) });
      }
    }

    const batched = run.createRunState(corpus.config);
    run.advanceRun(batched, corpus.inputs);
    return {
      checkpoints,
      canonicalModifierIds: state.config.modifierIds,
      finalHash: run.hashRunState(state),
      batchedHash: run.hashRunState(batched),
      finalRng: Object.fromEntries(
        streamIds.map((streamId) => [
          streamId,
          [
            state.rng[streamId]?.s0,
            state.rng[streamId]?.s1,
            state.rng[streamId]?.s2,
            state.rng[streamId]?.s3,
          ].map((word) => word?.toString(16).padStart(8, "0")),
        ]),
      ),
    };
  }, runGoldenVectors);

  expect(actual.checkpoints).toEqual(runGoldenVectors.checkpoints);
  expect(actual.canonicalModifierIds).toEqual(
    runGoldenVectors.canonicalModifierIds,
  );
  expect(actual.finalHash).toBe(runGoldenVectors.checkpoints.at(-1)?.hash);
  expect(actual.batchedHash).toBe(actual.finalHash);
  expect(actual.finalRng).toEqual(runGoldenVectors.finalRng);
});
