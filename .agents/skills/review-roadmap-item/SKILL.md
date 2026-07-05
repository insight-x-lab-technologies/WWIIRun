---
name: review-roadmap-item
description: Independently review exactly one implemented WWIIRun roadmap item against its approved specification. Use when the user names an item in review and asks to verify, inspect, accept, or reject it. Run applicable evidence, record findings, and either close the item or request changes without implementing new features.
---

# Review Roadmap Item

Act as an independent gate, not as the original implementer. Prioritize correctness and evidence over completing the item optimistically.

## Preconditions

Require an exact roadmap ID, matching spec, and status `In review`. If implementation is incomplete or the spec is unapproved, report the lifecycle error and stop.

## Workflow

1. Read `AGENTS.md`, project memory, the complete spec, linked ADRs and applicable quality gates.
2. Inspect repository status and the implementation diff. Identify unrelated or unexplained changes.
3. Trace each acceptance criterion to code and a test, measurement or manual verification.
4. Review correctness, regression risk, architecture, failure paths, determinism, performance, security, accessibility, responsive behavior, save compatibility and documentation as applicable.
5. Run the relevant checks independently. Treat missing, skipped or unverifiable evidence as not passing.
6. Report findings first, ordered `Critical`, `High`, `Medium`, `Low`, with file/line references and concrete impact.
7. Append a dated review entry to the spec with checks run and findings.

## Finding ownership before verdict

Classify every issue before changing lifecycle:

- `implementation`: a versioned implementation surface, including existing repository tests, causes an acceptance failure.
- `review-probe`: a temporary reviewer-only probe, fixture, assertion, command or environment assumption is wrong; correct or discard it and continue, never hand it to implementation.
- `environment`: the environment blocks evidence; record the gap and next action, not an implementation defect.
- `spec-ambiguity`: acceptance is unclear; route it to specification when acceptance must change, otherwise clarify it in review.

Under `$next-roadmap-item`, the same independent reviewer may incrementally recheck open finding IDs, affected criteria, regression surface, diff integrity and the required closing gate. Do not rebuild unrelated review work without cause.

## Verdict

- `Changes requested`: use only for unresolved `implementation` findings or confirmed acceptance failures attributable to implementation. Set spec and roadmap to `Changes requested`; update `CURRENT_STATE.md` with the next implementation action.
- `Approved`: use only when all criteria and required gates pass. Set spec and roadmap to `Done`, update requirement status/evidence and `CURRENT_STATE.md` to the next eligible item.

Record environment and specification blockers with their accurate state and next action; use an available state such as `Blocked` only when genuinely blocked. Never mark `Done` without all required gates.

## Boundaries

- Do not modify runtime code or fix findings during a review-only invocation.
- Do not add features, redesign accepted scope or replace objective criteria with preference.
- Do not mark `Done` based only on code inspection when the spec requires executable evidence.
- Do not erase prior review findings; mark their resolution in later entries.

## Completion report

Return findings, checks/results, criterion coverage, verdict and the exact next prompt. State explicitly when no findings exist.
