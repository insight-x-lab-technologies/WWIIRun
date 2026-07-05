---
name: next-roadmap-item
description: Orchestrate exactly one WWIIRun roadmap item end to end through specification, implementation, independent review, and bounded correction rounds. Use when the owner asks to advance one exact item through the complete approved roadmap workflow.
---

# Next Roadmap Item

Coordinate one item without doing specialist work in the parent context. Treat repository documents as authoritative; keep only routing state, lifecycle state, and compact results in the parent.

## Establish scope and authority

1. Require one exact roadmap ID. Reject ranges, phases, batches, and implicit or neighboring items.
2. Read the repository `AGENTS.md`, required memory files, the item's roadmap entry, and `git status` before routing work. Then load only the documents required by `AGENTS.md` and the active specialist skill.
3. Before spawning any role, require the authoritative roadmap state to be exactly `Ready`, the entry point for this complete end-to-end workflow. Stop and report `Backlog`, `Specified`, `In progress`, `In review`, `Changes requested`, `Done`, `Blocked`, or any unknown/incompatible state; never start, reopen, resume, or repeat work silently. A future resume requires an explicit owner request and must follow the then-authoritative lifecycle rather than an invented transition in this skill.
4. Stop if a dependency is incomplete or the worktree has overlapping changes whose ownership or safe preservation is unclear. Do not silently absorb adjacent work.
5. Use the repository lifecycle and documents as the source of truth. Never infer completion from a role's prose alone.

## Enforce specialist roles

Run these named roles sequentially, with no concurrent writes:

| Role | Required skill | Responsibility |
| --- | --- | --- |
| `roadmap-specifier` | `$specify-roadmap-item` | Specify the exact item and obtain the permitted approval state. |
| `roadmap-implementer` | `$implement-roadmap-item` | Implement the approved spec, validate it, provide a compact handoff, and move the item to `In review`. |
| `roadmap-reviewer` | `$review-roadmap-item` | Independently review the implementation and either close it or report normalized findings. |

Before accepting output from any role, verify that the orchestration surface actually honored the requested role and model. If it did not, stop and disclose the fallback; do not continue unless the owner explicitly approves that fallback.

The parent MUST NOT replace a specialist. Every role MUST load and follow its matching skill. Preserve role identity across corrections: route implementation findings to the same `roadmap-implementer`, then route the correction range to the same `roadmap-reviewer`.

## Run the lifecycle

### 1. Specify

Give `roadmap-specifier` only the exact ID and repository context needed by its skill. It may mark a spec `Approved` only when the technical spec is complete and no reserved human matter remains. When architecture needs an ADR for an internal, reversible technical decision covered by D-007/D-008, the specifier must create and register it, apply the delegated recommendation, and approve it without another owner turn. If acceptance behavior must change later because of a `spec-ambiguity` finding, return it to this same specifier; otherwise do not reopen specification.

### 2. Implement

Give `roadmap-implementer` the exact ID and approved spec. Require a compact handoff containing lifecycle state, implementation range, summary, validation evidence, remaining risks, and overlap notes. Continue only when repository state shows `In review`.

Run the complete applicable repository gates for the initial implementation. During a correction, run focused tests plus all affected gates. Before final approval, run the complete applicable gates again. Do not repeat a physical measurement unless its inputs, implementation, environment, or governing spec changed; preserve and cite valid evidence instead.

### 3. Review independently

Give a distinct `roadmap-reviewer` the exact ID, approved spec, implementation range, and compact implementation summary. The reviewer must inspect evidence independently rather than accept the handoff as proof.

Normalize every finding with:

- stable ID;
- severity;
- violated acceptance criterion;
- evidence;
- impact;
- owner: `implementation`, `review-probe`, `environment`, or `spec-ambiguity`;
- required correction;
- recheck procedure.

Route findings by owner:

- `implementation`: the only class that moves the item to `Changes requested`; send it to the same implementer.
- `review-probe`: the reviewer must correct or discard its own temporary probe and rerun it without changing lifecycle state.
- `environment`: report the environmental blocker or missing evidence; never relabel it as an implementation defect.
- `spec-ambiguity`: return to the same specifier only if resolving it changes acceptance behavior. Otherwise clarify within review without reopening the spec.

After corrections, give the same reviewer the correction range and updated compact summary. Permit at most two implementation correction rounds. If unresolved findings remain after round two, stop with their stable IDs and the exact action needed to resume.

### 4. Confirm closure

Accept approval only after the reviewer completes the final full gates and repository documents show the item as `Done`. If the review prose says approved but authoritative lifecycle state is not `Done`, stop and report the mismatch.

Return a compact result with the exact ID, terminal lifecycle state, role/model verification, ranges, validation evidence, unresolved findings, risks, and next resume action. Do not advance a neighboring item.

## Mandatory stop conditions

Stop and request owner direction for:

- an ADR or decision involving a reserved human matter or authority not delegated by D-007/D-008;
- secrets, missing authority, or production mutation;
- money, privacy, terms, licenses, or final visual identity;
- destructive migration or invalidation of saves or scores;
- changes to published rules;
- unapproved role/model fallback;
- overlapping work that cannot be preserved safely;
- exhausted correction rounds.

Never deploy, publish, push, mutate production, or perform another external release action without explicit authorization. A request to orchestrate the item does not grant that authority.
