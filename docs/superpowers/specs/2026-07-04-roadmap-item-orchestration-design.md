# Roadmap Item Orchestration Design

## Goal

Add a project-local `$next-roadmap-item <ID>` workflow that takes one eligible WWIIRun roadmap item from specification through implementation and independent review while keeping each role's context bounded. Reduce repeated full-session handoffs, duplicate gate execution, and false implementation returns caused by reviewer-owned probes.

The workflow must preserve SDD, lifecycle traceability, architectural boundaries, independent review, factual evidence, and the human decisions reserved by `AGENTS.md`.

## Scope

Included:

- one orchestration skill;
- three project-scoped custom agents for specification, implementation, and review;
- compatible refinements to the existing lifecycle skills;
- automatic approval of technically complete specifications;
- a bounded review/correction loop;
- concise, structured handoffs and proportionate verification;
- documentation of the new operating model.

Excluded:

- implementing the next gameplay roadmap item;
- concurrent writes to the shared worktree;
- removing the standalone lifecycle skills;
- weakening required quality, determinism, performance, or documentation gates;
- deployment, publication, GitHub writes, or production changes;
- automatic decisions about money, privacy, terms, licenses, final visual identity, destructive migrations, saves, or score invalidation.

## Chosen Architecture

Use one thin parent orchestrator and three sequential, persistent child roles per roadmap item:

| Role | Preferred configuration | Responsibility |
|---|---|---|
| Specifier | `gpt-5.5`, high reasoning | Produce an implementable spec and approve it when no reserved decision remains. |
| Implementer | `gpt-5.4-mini`, medium reasoning | Implement the approved spec, test it, and prepare review evidence. |
| Reviewer | `gpt-5.4-mini`, high reasoning | Independently inspect and validate the implementation, then approve or emit bounded findings. |

Define the roles in `.codex/agents/`. The orchestrator requests those roles explicitly and keeps their full logs outside its own context. Model settings are preferences enforced by Codex custom-agent configuration when the active Codex surface supports named custom agents. On a surface that cannot select the configured role/model, the orchestrator must disclose the fallback; it must not claim model isolation it cannot verify.

Only one child may write at a time. Parallelism is intentionally excluded because all three stages depend on the preceding filesystem state and share one worktree.

## Lifecycle and Data Flow

1. Validate the exact roadmap ID, eligibility, repository state, and absence of conflicting active work.
2. Spawn the specifier with the ID and the existing `$specify-roadmap-item` contract.
3. The specifier reads the required project memory and relevant documents, creates or refines the spec, and:
   - sets it to `Approved` when it is complete and contains no reserved decision;
   - stops at `Awaiting approval` when a reserved human decision exists;
   - records dependencies and blockers rather than bypassing them.
4. Spawn the implementer with the ID and spec path. It follows `$implement-roadmap-item`, records evidence, and moves the item to `In review`.
5. Spawn a fresh reviewer with the ID, spec path, implementation range, and compact implementation summary. It follows `$review-roadmap-item` and either closes the item or produces structured findings.
6. For actionable implementation findings, send the existing implementer only the spec path, finding IDs, affected files, and required evidence. Do not create a new implementation context.
7. Send the same reviewer the correction range and finding IDs. It rechecks resolved findings, affected criteria, and regression surface without rebuilding the entire review from zero.
8. Allow at most two automatic correction rounds. After that, stop with the unresolved evidence and a root-cause-oriented next action.
9. On success, update lifecycle records and project memory once, report the final evidence, and close child threads.

Repository documents remain the durable source of truth. Parent-to-child summaries are routing aids, never substitutes for the spec or required memory files.

## Review and Correction Policy

Findings use stable IDs and contain severity, criterion, evidence, impact, owner, required correction, and recheck commands.

The reviewer must classify each failure before changing lifecycle state:

- `implementation`: production code, versioned tests, documentation, architecture, or required evidence is defective or missing; return only these findings to the implementer;
- `review-probe`: a temporary command, fixture, assertion, environment assumption, or test authored solely by the reviewer is defective; the reviewer corrects or discards its own probe and continues without moving the item to `Changes requested`;
- `environment`: sandbox, unavailable browser, network, credentials, or external service prevented verification; retry through the permitted mechanism or stop as blocked, without representing it as an implementation defect;
- `spec-ambiguity`: the approved contract cannot determine correctness; return to the specifier only when clarification changes acceptance behavior.

An existing versioned test belongs to the implementation surface even when the reviewer discovers the problem. A reviewer may never edit runtime or versioned implementation artifacts.

## Verification Budget

- Specification: document consistency and dependency checks only; no application gate claims.
- Initial implementation: focused RED/GREEN checks plus every applicable gate required by the spec and `docs/quality/QUALITY.md`.
- Initial review: independent criterion tracing and applicable review checks. Reuse implementation evidence only as provenance, never as independent proof.
- Intermediate correction: focused regression tests and gates affected by the finding.
- Final reviewer approval: recheck all findings, affected criteria, repository diff, and the minimum complete closing gate required by project quality policy. Avoid rerunning unrelated expensive physical measurements unless their inputs changed or the spec requires fresh evidence.

Commands must be recorded with exit status and concise results. Raw logs stay in child contexts or existing artifacts; project memory receives only outcomes, risks, pending work, and the exact next step.

## Failure Handling

Stop the orchestration without guessing when:

- dependencies are incomplete;
- the worktree contains overlapping unexplained changes;
- a reserved human decision is required;
- a structural change needs an unapproved ADR;
- required authority, secrets, external state, or production mutation is missing;
- the preferred custom-agent/model configuration cannot be honored and the user has not accepted fallback behavior;
- two correction rounds do not produce approval.

Preserve the current lifecycle state and provide one exact resume command. Never restart completed stages merely because the parent context was compacted.

## Skill Compatibility

Keep `$specify-roadmap-item`, `$implement-roadmap-item`, and `$review-roadmap-item` usable independently. Add orchestration-aware rules rather than duplicating their full bodies:

- specification may auto-approve only when invoked by `$next-roadmap-item` under the owner's recorded authorization;
- implementation accepts structured findings and performs scoped correction;
- review classifies ownership before requesting changes and supports incremental re-review by the same independent reviewer;
- the orchestrator references these skills as required sub-skills and owns sequencing, retry limits, and final reporting.

Record the owner's durable authorization for automatic technical-spec approval in project decision memory. This does not override the reserved human matters in `AGENTS.md`.

## Acceptance Criteria

1. `$next-roadmap-item F<X>-<Y>` validates and orchestrates exactly one eligible item.
2. Specification, implementation, and review run in separate child contexts and sequential filesystem phases.
3. Project custom-agent files declare the preferred models, reasoning effort, role, and narrow instructions.
4. A complete technical spec can become `Approved` without a separate user turn.
5. Any reserved decision stops before implementation and names the required human choice.
6. The first review is performed by an agent distinct from the implementer.
7. Reviewer-owned probe defects do not set `Changes requested` or invoke the implementer.
8. Implementation findings enter a maximum two-round correction loop using the existing implementer and reviewer contexts.
9. Intermediate corrections run proportional checks; final approval retains all mandatory closing evidence.
10. Standalone lifecycle skills continue to work.
11. The orchestrator never deploys, publishes, pushes, or mutates production without explicit authorization.
12. A dry-run or controlled fixture demonstrates success, reserved-decision stop, reviewer-probe recovery, implementation correction, and retry exhaustion without touching a real roadmap feature.

## Validation Strategy

Follow skill TDD with isolated pressure scenarios:

1. Capture baseline behavior without the new skill for representative orchestration prompts.
2. Validate the skill folder and custom-agent TOML syntax.
3. Forward-test the controlled scenarios with fresh subagents and inspect emitted files/status transitions.
4. Verify no scenario edits runtime code or a live roadmap item.
5. Run repository documentation checks and `git diff --check`.

Because the current worktree contains active F1-01 changes, implementation must preserve them and use synthetic fixtures or a temporary isolated worktree for forward tests.

## Rollout

Implement the workflow before starting the next roadmap feature. Initially require an explicit `$next-roadmap-item <ID>` invocation. After one real item completes, compare correction count, gate executions, elapsed time, and approximate token usage with the prior workflow, then refine the skill if the evidence shows avoidable repetition.
