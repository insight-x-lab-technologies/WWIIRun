---
name: audit-determinism
description: Audit WWIIRun deterministic simulation, challenge generation, replays, ruleset versioning, and cosmetic isolation. Use when deterministic core code exists, before closing determinism-related items or phases, after simulation changes, or when Daily/Weekly runs diverge. Produce evidence and findings without changing gameplay or golden outputs.
---

# Audit Determinism

Verify the contract in `docs/architecture/DETERMINISM.md` and ADR-0002 independently of feature implementation.

## Scope input

Accept a roadmap ID, ruleset version, commit/diff, or `current implementation`. If no deterministic implementation exists yet, report `Not applicable yet` and do not fabricate a pass.

## Workflow

1. Read `AGENTS.md`, `docs/architecture/DETERMINISM.md`, ADR-0002, relevant specs and test commands.
2. Inspect the diff and identify every change capable of affecting state, ordering, RNG consumption, collision, spawn, input, score or serialization.
3. Scan `simulation` for prohibited dependencies and entropy: Phaser/DOM/network/storage/locale imports, `Math.random`, wall clocks, timers, Web Crypto and variable-delta rules.
4. Verify fixed 60 Hz ticks, integer/scaled units, stable entity iteration, quantized inputs, versioned PRNG vectors, named RNG streams and explicit overflow behavior.
5. Run available unit, golden replay and determinism suites repeatedly. Verify identical hashes across render chunking and checkpoint restore where harnesses exist.
6. Verify locale, audio, quality tier and cosmetic pack cannot change simulation hashes. Run cross-browser corpus when the project provides it.
7. Verify challenge manifests bind seed, period, ruleset, content and normalized loadout.
8. Never update a golden hash to make a failure pass. Require an approved ruleset change and ADR when behavior intentionally changes.
9. Create `docs/audits/determinism/YYYY-MM-DD-<scope>.md` with environment, commands, results, unsupported checks and findings.

## Verdicts

- `Pass`: every applicable required check executed and passed.
- `Conditional pass`: executed checks pass but named platform/tool checks are unavailable and non-blocking for the current phase.
- `Fail`: divergence, forbidden dependency, unversioned behavior change or missing required evidence.
- `Not applicable yet`: required implementation/harness does not exist.

Do not modify simulation, tests, golden files or rules during the audit. Route fixes through `$implement-roadmap-item` and verify them in a fresh audit.
