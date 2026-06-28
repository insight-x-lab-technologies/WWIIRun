# F0-05 Headless Run Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved F0-05 pure headless run contracts, fixed tick transition, canonical state hash, and shared Node/Chromium golden corpus.

**Architecture:** Add a focused `src/simulation/run` module that depends only on the completed random module. Keep validation and mutation explicit, encode the hash field-by-field in normative order, and reuse immutable golden data in Vitest and Playwright without exposing application globals.

**Tech Stack:** TypeScript 6 strict, Vitest 4, Playwright 1.61, Vite 8, existing `xoshiro128ss-v1` module.

**Execution status:** Completed on 2026-06-28; factual evidence is recorded in `docs/specs/SPEC-F0-05-fixed-headless-run-state-hash.md`.

---

### Task 1: Lifecycle and public contracts

**Files:**
- Modify: `docs/specs/SPEC-F0-05-fixed-headless-run-state-hash.md`
- Modify: `docs/specs/README.md`
- Modify: `docs/roadmap/ROADMAP.md`
- Modify: `docs/adr/0005-headless-run-state-and-hash.md`
- Modify: `docs/memory/DECISIONS.md`
- Create: `src/simulation/run/types.ts`
- Create: `src/simulation/run/index.ts`
- Test: `tests/unit/run.test.ts`

- [ ] **Step 1: Record approval and move the item to `In progress`**

  Accept ADR-0005 and update spec, index, roadmap, and decision summary without changing F0-03/F0-04 lifecycle.

- [ ] **Step 2: Write the failing contract test**

  Import the wished-for public API and assert the exact constants, action bits, neutral input, tick zero, canonical modifier sorting, frozen config, and exact F0-04 stream bank.

- [ ] **Step 3: Verify RED**

  Run `npm run test:unit -- --run tests/unit/run.test.ts`; expect module-resolution failure because `src/simulation/run` does not exist.

- [ ] **Step 4: Add minimal types/barrel and state creation**

  Define `RunMode`, `RunConfig`, `InputFrame`, `RunState`, `StateHash`, `TICKS_PER_SECOND`, `RUN_STATE_SCHEMA_VERSION`, `InputActionBits`, and export `createRunState`. Validate canonical seed through `parseSeedHex`, validate ASCII tokens with `^[a-z0-9][a-z0-9._:-]{0,63}$`, reject duplicate/over-cap modifiers, sort a copied array, freeze the copied config, and create independent RNG streams.

- [ ] **Step 5: Verify GREEN**

  Run `npm run test:unit -- --run tests/unit/run.test.ts`; expect the creation contract tests to pass.

### Task 2: Validation and atomic fixed-tick transition

**Files:**
- Create: `src/simulation/run/run.ts`
- Modify: `src/simulation/run/index.ts`
- Modify: `tests/unit/run.test.ts`

- [ ] **Step 1: Write failing validation/transition tests**

  Cover invalid mode/seed/token/modifier config with stable `TypeError` field messages; valid axes/actions; invalid axis/reserved actions; one tick; empty list; chunking; input aliasing; `0xffffffff` overflow; and batch atomicity including RNG snapshots.

- [ ] **Step 2: Verify RED**

  Run the focused unit file; expect missing `stepRun`/`advanceRun` or incorrect mutation behavior.

- [ ] **Step 3: Implement minimal transition**

  Validate every input and total tick capacity before mutation. `stepRun` copies the input then increments tick; `advanceRun` prevalidates the full list and delegates in order. Do not consume RNG or accept delta/time/platform data.

- [ ] **Step 4: Verify GREEN and refactor**

  Run the focused unit file; then consolidate shared validators while preserving stable errors and rerun it.

### Task 3: Canonical FNV-1a 64-bit state hash

**Files:**
- Create: `src/simulation/run/hash.ts`
- Modify: `src/simulation/run/index.ts`
- Modify: `tests/unit/run.test.ts`

- [ ] **Step 1: Write failing hash tests**

  Assert 16 lowercase hexadecimal digits, repeat purity, property-order independence, modifier-order equivalence, divergence for every competitive field and each RNG word, and exclusion of external locale/timezone/audio/quality/viewport/FPS/cosmetic metadata.

- [ ] **Step 2: Verify RED**

  Run the focused unit file; expect missing `hashRunState`/`STATE_HASH_ALGORITHM`.

- [ ] **Step 3: Implement the normative byte layout**

  Use a local FNV accumulator with offset `0xcbf29ce484222325n`, prime `0x00000100000001b3n`, and mask `0xffffffffffffffffn`. Feed ASCII strings with little-endian uint32 byte lengths, fixed uint32 fields, signed axes as one byte, actions as uint16, and streams in `spawn`, `loot`, `weather`, `patterns` order. Do not use `JSON.stringify`, `TextEncoder`, typed-array endianness, object enumeration, or automatic per-tick hashing.

- [ ] **Step 4: Verify GREEN**

  Run the focused unit file and confirm all hash tests pass without mutation.

### Task 4: Independent golden corpus and cross-runtime execution

**Files:**
- Create: `tests/determinism/runGoldenVectors.ts`
- Create: `tests/determinism/run.golden.test.ts`
- Create: `tests/e2e/run.determinism.spec.ts`
- Modify: `tests/determinism/README.md`
- Test: `tests/unit/run.test.ts`

- [ ] **Step 1: Add failing golden consumers with literal expected values**

  Define a frozen valid config, nontrivial inputs covering negative/positive axes and all three actions, checkpoint ticks, expected hashes, and expected final RNG words. Consume exactly those literals in both Vitest and Playwright; test frame-by-frame, one batch, partitioned batches including empty batches, and repetition.

- [ ] **Step 2: Verify RED before expected values exist**

  Run `npm run test:determinism` and the focused Playwright file; expect mismatched placeholder hashes rather than a harness/import error.

- [ ] **Step 3: Compute expected hashes independently**

  Use a temporary Python implementation under `/tmp` that independently canonicalizes the specified data, packs the exact binary layout, and applies FNV-1a 64-bit. Copy only its literal results into `runGoldenVectors.ts`; do not import or retain the script in production/tests.

- [ ] **Step 4: Verify GREEN in Node and Chromium**

  Run `npm run test:determinism` and `CI=1 npx playwright test tests/e2e/run.determinism.spec.ts`; expect the unchanged F0-04 corpus plus F0-05 corpus to pass in Node and both configured Chromium projects.

- [ ] **Step 5: Add the 100,000-frame functional test**

  Run a deterministic repeating valid frame sequence, assert exactly 100,000 ticks and stable terminal input, and avoid elapsed-time thresholds.

### Task 5: Coverage, documentation, evidence, and review handoff

**Files:**
- Modify: `vitest.config.ts`
- Create: `src/simulation/run/README.md`
- Modify: `src/simulation/README.md`
- Modify: `tests/README.md`
- Modify: `tests/determinism/README.md`
- Modify: `docs/product/REQUIREMENTS.md`
- Modify: `docs/specs/SPEC-F0-05-fixed-headless-run-state-hash.md`
- Modify: `docs/specs/README.md`
- Modify: `docs/roadmap/ROADMAP.md`
- Modify: `docs/memory/CURRENT_STATE.md`

- [ ] **Step 1: Add run coverage and module documentation**

  Include `src/simulation/run/**/*.ts` in V8 coverage. Document public API, input ranges/action bits, fixed-tick semantics, atomic batches, canonical hash layout/version, diagnostic-not-authentication limitation, and future replay/gameplay boundaries.

- [ ] **Step 2: Run focused gates**

  Run `npm run test:unit -- --run tests/unit/run.test.ts`, `npm run test:unit:coverage -- --run tests/unit/run.test.ts`, and `npm run test:determinism`; record exact factual counts/results.

- [ ] **Step 3: Run the complete quality gate**

  Run `npm run format`, `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm run test:unit`, `npm run test:determinism`, `npm run build`, `npm run check`, `CI=1 npm run test:e2e`, `git diff --check`, forbidden API/import scans, and `git status --short`.

- [ ] **Step 4: Audit every acceptance criterion and lifecycle**

  Re-read the approved spec, inspect the final diff, preserve F0-04 goldens and F0-03 changes, record evidence/risks, update `DET-01` only as partial evidence, and move F0-05 to `In review`—never `Done`.

- [ ] **Step 5: Hand off**

  Report changed files, criteria evidence, commands/results, remaining risks, current `In review` status, and exact prompt: `Execute $review-roadmap-item F0-05.`
