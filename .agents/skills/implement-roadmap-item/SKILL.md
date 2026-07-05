---
name: implement-roadmap-item
description: Implement or correct exactly one approved WWIIRun roadmap specification. Use when the user names an item such as F0-02 and asks to code it, execute its approved spec, or address findings from its review. Enforce scope, tests, documentation, and handoff to independent review.
---

# Implement Roadmap Item

Implement one approved spec as a reviewable increment. Keep architecture and evidence explicit.

## Preconditions

1. Require an exact roadmap ID.
2. Read `AGENTS.md` and the prescribed memory files.
3. Locate one matching spec in `docs/specs/`.
4. Require spec status `Approved`, `In progress`, or `Changes requested`. If it is missing, draft, or awaiting approval, stop and direct the user to `$specify-roadmap-item`.
5. Inspect `git status` and preserve unrelated/user changes.

## Workflow

1. Read the entire spec and only its linked architecture, ADR and quality context.
2. Restate implementation scope and set the roadmap/spec status to `In progress`.
3. Implement in small vertical steps. Keep `simulation` pure and observe every boundary in `AGENTS.md`.
4. Add or update tests named by the spec. For deterministic behavior, add vectors/replays before accepting snapshot changes.
5. Run focused every applicable gate in `docs/quality/QUALITY.md` after all implementation done.
6. Record commands and factual results in the spec's evidence section. Never claim an unexecuted check passed.
7. Update requirements, decisions, asset specs and memory only where the implementation changes their truth.
8. Set spec and roadmap item to `In review`; do not mark `Done`. Point the next session to `$review-roadmap-item`.

## Handling review findings

When status is `Changes requested`, require each finding to have stable ID, severity, criterion, evidence, impact, owner, correction and recheck commands. Implement only findings owned by `implementation` and their required regressions; review probes, environment failures and spec ambiguity are not implementation work.

Preserve review history. In an orchestrated intermediate correction, run focused checks and affected gates; the final reviewer owns the complete closing gate. Return the item to `In review` with a compact correction range and result keyed by finding ID. Standalone corrections still run every applicable final gate before handoff.

## Stop conditions

Stop and report a blocker instead of guessing when implementation requires a new product decision, unapproved ADR, secret, production mutation, payment/legal choice, destructive migration or scope outside the spec.

## Completion report

Return changed files, acceptance criteria satisfied, commands/results, remaining risk, current status and the exact review prompt.
