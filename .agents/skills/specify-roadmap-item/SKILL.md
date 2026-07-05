---
name: specify-roadmap-item
description: Specify exactly one WWIIRun roadmap item before implementation. Use when the user names an item such as F0-02 and asks to define, plan, architect, refine, or prepare its specification. Produce or update the feature spec, surface decisions and dependencies, and do not write runtime code.
---

# Specify Roadmap Item

Create an implementable contract for one roadmap ID. Treat the repository documents, not prior chat, as the durable source of truth.

## Required input

Require one exact roadmap ID. If it is absent or ambiguous, identify the next eligible item but ask the user to confirm before creating its spec.

## Workflow

1. Read `AGENTS.md`, `docs/memory/PROJECT.md`, `docs/memory/CURRENT_STATE.md`, `docs/memory/DECISIONS.md` and the target entry in `docs/roadmap/ROADMAP.md`.
2. Inspect the working tree and existing specs. Preserve unrelated changes.
3. Verify dependencies. If a required dependency is incomplete, document the blocker and stop without pretending the item is ready.
4. Read only the product, architecture, ADR, quality and design documents relevant to the target.
5. Map the item to requirement IDs in `docs/product/REQUIREMENTS.md`.
6. Create `docs/specs/SPEC-<ID>-<slug>.md` from `docs/templates/SPEC-TEMPLATE.md`, or refine the existing file.
7. Define included and excluded scope, contracts, invariants, error behavior, acceptance criteria, tests, migration, rollback and evidence required.
8. Address determinism, performance, responsive UI, assets, i18n, save compatibility, security and offline behavior only when applicable; state `not applicable` where ambiguity would remain.
9. Record structural choices as a proposed ADR. Do not silently decide reserved human matters.
10. Set the spec to `Draft` when unresolved design work remains, otherwise `Awaiting approval`. Set the roadmap item to `Specified` and update `CURRENT_STATE.md`.

## Orchestrated approval

Only when invoked under `$next-roadmap-item` and D-008, a complete technical spec may move directly to `Approved` without another user turn. An internal, reversible technical ADR covered by D-007/D-008 may be created, registered, recommended and approved in that run.

Before implementation, stop with `Awaiting approval` and name the exact human decision if the item, spec or ADR touches money, privacy, terms, licenses, final identity, destructive migration, save/score invalidation, published rules or `AGENTS.md`. Outside that orchestrator, use the normal approval contract.

## Boundaries

- Do not install dependencies, generate application scaffolding, edit runtime/test code or implement the item.
- Do not expand the item to neighboring roadmap entries.
- Do not approve the spec on the user's behalf except under the delegated orchestrated approval above.
- Do not describe a test as evidence before it has run.

## Completion report

Return the spec path, requirements covered, decisions required, dependencies, principal risks and the exact approval/implementation prompt. A specification is complete only when another fresh Codex session can implement it without relying on the current conversation.
