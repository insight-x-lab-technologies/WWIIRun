---
name: audit-roadmap-phase
description: Audit one WWIIRun roadmap phase against its exit criteria, item reviews, traced requirements, quality gates, risks, and documentation. Use when all items in a phase such as F0 appear complete and the user asks to close, validate, or advance the phase. Produce a closure report without implementing missing work.
---

# Audit Roadmap Phase

Decide from evidence whether a named phase can close. This is a release-style gate, not a feature implementation session.

## Preconditions

Require one exact phase ID. Read `AGENTS.md`, memory, the complete phase section in the roadmap, requirements matrix, quality strategy and risk register.

## Workflow

1. Enumerate every phase item, dependency and exit criterion.
2. Require each item to be `Done` with an approved spec review. Flag missing specs, evidence or lifecycle inconsistencies.
3. Trace phase requirements to implementation and tests. Check that documentation reflects actual behavior.
4. Run the phase-level gates available in the repository: format, lint, typecheck, unit, determinism, integration/E2E, build, asset budgets, responsive/performance or security checks as applicable.
5. Invoke the determinism criteria directly for F0/F3 or any phase changing simulation; require a current `$audit-determinism` report when the harness exists.
6. Review open risks, deferred work, working-tree state, migration/rollback and non-negotiable constraints.
7. Create `docs/audits/phases/YYYY-MM-DD-<phase>.md` with an evidence matrix, commands/results, gaps, risk acceptance and verdict.

## Verdict

- `Pass`: all items, exit criteria and required gates have evidence. Update `CURRENT_STATE.md` to the next phase and record the phase closure in the roadmap.
- `Fail`: list minimal follow-up roadmap/spec actions, leave the phase open and update `CURRENT_STATE.md` with the first blocking action.

## Boundaries

- Do not implement missing features or repair failures during the audit.
- Do not waive a non-negotiable requirement. Record any permitted deferral explicitly with owner, destination phase and rationale.
- Do not close a phase because individual items are marked `Done`; verify the aggregate exit criteria.

Return the report path, verdict, blocking gaps, residual risks and exact next prompt.
