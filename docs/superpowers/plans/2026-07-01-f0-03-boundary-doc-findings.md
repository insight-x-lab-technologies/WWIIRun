# F0-03 Boundary and Documentation Findings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close `F0-03-BOUNDARY-03` and `F0-03-DOC-01` with exhaustive root-relative import regressions and operational documentation that matches the executable gate.

**Architecture:** Extend the existing semantic ESLint boundary resolver so Vite project-root specifiers under `/src` resolve against the repository root before restricted-layer comparison. Keep the custom rule as the single AST-level guard for imports, reexports, and dynamic imports, and document the exact npm script composition without changing runtime, dependencies, workflow, goldens, or baselines.

**Tech Stack:** ESLint flat config/custom rule, Vitest, TypeScript, npm scripts, Markdown.

---

### Task 1: Prove every root-relative boundary path is rejected

**Files:**
- Modify: `tests/unit/eslintConfig.test.ts`

- [x] **Step 1: Add a table-driven regression over all restricted roots and import forms**

Add cases for `/src/app`, `/src/game`, `/src/platform`, and `/src/services`, each exercised through static import, named reexport, export-all, and dynamic import. Add normalization cases and allowed controls under `/src/simulation` and `/src/shared`.

- [x] **Step 2: Run the focused suite and verify RED**

Run: `npm run test:unit -- tests/unit/eslintConfig.test.ts --reporter=verbose`

Expected: the new restricted root-relative cases fail because `simulation-boundaries/no-external-imports` is absent; allowed controls remain diagnostic-free.

### Task 2: Resolve Vite project-root specifiers semantically

**Files:**
- Modify: `eslint.config.mjs`
- Test: `tests/unit/eslintConfig.test.ts`

- [x] **Step 1: Implement the minimal resolver change**

Treat `/src` and `/src/...` as project-root module specifiers, resolve them against `import.meta.dirname`, and apply the existing normalized restricted-root comparison. Preserve Phaser rejection, relative resolution, computed dynamic-import fail-closed behavior, and allowed imports into pure layers.

- [x] **Step 2: Run the focused suite and verify GREEN**

Run: `npm run test:unit -- tests/unit/eslintConfig.test.ts --reporter=verbose`

Expected: all boundary regressions pass.

- [x] **Step 3: Prove the real ESLint integration**

Temporarily add a fixture under `src/simulation` containing a root-relative static import, reexport, dynamic import, and prohibited global access. Run `npm run lint`, verify non-zero exit with boundary/global diagnostics, then remove the fixture and rerun lint successfully.

### Task 3: Align operational documentation with the current gate

**Files:**
- Modify: `README.md`

- [x] **Step 1: Document the executable script graph**

List `test:determinism`, `content:validate`, and `performance:budget`; state that `check` runs format, lint, typecheck, unit, deterministic tests, then `build`, whose pipeline performs typecheck, content validation, Vite build, and budget validation. Keep E2E separate and describe its product/performance harness scope.

- [x] **Step 2: Correct capability and limitation claims**

State that deterministic vectors/hashes and build/content budgets are now enforced, while PWA/offline behavior is not yet proven. Do not mark `DET-01`, `PERF-01`, `PWA-01`, or `COST-01` complete.

### Task 4: Verify, record evidence, and return to review

**Files:**
- Modify: `docs/specs/SPEC-F0-03-quality-toolchain-and-ci.md`
- Modify: `docs/specs/README.md`
- Modify: `docs/roadmap/ROADMAP.md`
- Modify: `docs/memory/CURRENT_STATE.md`

- [x] **Step 1: Run focused and complete gates**

Run Node/npm version checks, `npm ci`, direct dependency inspection, focused boundary tests, unit coverage, `npm run check`, CI-mode E2E, `git diff --check`, and scope scans. Record only fresh factual results.

- [x] **Step 2: Review the diff against both findings and acceptance criteria**

Confirm every restricted root/import form is tested, README matches `package.json`, no fixture remains, and no runtime, dependency, workflow, simulation source, golden, or baseline changed.

- [x] **Step 3: Update lifecycle and handoff**

Mark criteria 3 and 10 satisfied, append RED/GREEN and gate evidence without rewriting review history, set spec/index/roadmap to `In review`, update memory with risks and exact next step, and hand off to `$review-roadmap-item F0-03`. Do not mark `Done`, push, or create external state.
