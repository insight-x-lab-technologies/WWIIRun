# F0-03 Review Findings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the documented F0-03 lint-isolation and local-traceability findings without pushing or running GitHub Actions.

**Architecture:** Keep the existing ESLint flat configuration and strengthen only its `src/simulation` override. Exercise the actual rule map through ESLint's in-process `Linter`, then record the correction as a single local commit over the approved `fec1d5a` baseline so later completed roadmap items remain untouched.

**Tech Stack:** ESLint 10 flat config, TypeScript 6, Vitest 4, Git.

---

### Task 1: Add executable regressions for the reviewed bypasses

**Files:**
- Create: `tests/unit/eslintConfig.test.ts`
- Modify: `eslint.config.mjs`

- [x] **Step 1: Exercise the existing simulation rule map directly**

Load the executable flat config in the test and exercise the final override's rule map without adding a configuration API.

- [x] **Step 2: Write failing regression tests**

Use ESLint's `Linter` with `simulationRules` and assert that `globalThis.Math.random()` produces `no-restricted-globals`, `../../../game/createGame` produces `no-restricted-imports`, and `../../../shared/value` remains permitted.

- [x] **Step 3: Run the focused test and verify RED**

Run: `npm run test:unit -- tests/unit/eslintConfig.test.ts`

Expected: the two reviewed bypass assertions fail because the current configuration returns no messages; the allowed-import control passes.

- [x] **Step 4: Implement the minimal lint correction**

Add `globalThis` to `no-restricted-globals`. Replace the enumerated one/two-level architecture import patterns with the anchored regex `^(?:\.\./)+(?:app|game|platform|services)(?:/|$)` while preserving the Phaser restrictions and existing diagnostic message.

- [x] **Step 5: Run the focused test and verify GREEN**

Run: `npm run test:unit -- tests/unit/eslintConfig.test.ts`

Expected: three tests pass with no warnings or errors.

### Task 2: Record lifecycle and evidence

**Files:**
- Modify: `docs/specs/SPEC-F0-03-quality-toolchain-and-ci.md`
- Modify: `docs/specs/README.md`
- Modify: `docs/roadmap/ROADMAP.md`
- Modify: `docs/memory/CURRENT_STATE.md`

- [x] **Step 1: Move the item to In progress before implementation**

Set the spec, spec index, and roadmap item to `In progress` without changing any other roadmap lifecycle.

- [x] **Step 2: Run focused and complete local evidence**

Run the focused Vitest regression, `npm run lint`, `npm run test:unit:coverage`, `npm run check`, `CI=1 npm run test:e2e`, dependency inspection, boundary scans, and `git diff --check`. Record only factual exit codes/counts.

- [ ] **Step 3: Record the local traceable unit**

Commit only F0-03 code, regressions, plan, and lifecycle/evidence documents as `fix(F0-03): close quality isolation findings`. Verify `fec1d5a..HEAD` contains no F0-08 runtime, simulation behavior, golden, baseline, dependency, or lockfile changes.

- [ ] **Step 4: Return the item to In review**

Set the spec, index, and roadmap to `In review`. Keep the real GitHub Actions criterion unchecked and document that push/run evidence remains blocked by the user's explicit no-push instruction.

- [ ] **Step 5: Verify the final documentation commit**

Commit the final evidence/lifecycle update, rerun `git diff --check`, inspect `git status --short`, and hand off to `$review-roadmap-item F0-03` without marking the item `Done`.
