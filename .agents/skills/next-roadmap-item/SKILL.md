---
name: next-roadmap-item
description: Use when the owner asks to advance exactly one WWIIRun roadmap item end to end with isolated lifecycle roles and bounded automatic corrections.
---

# Next Roadmap Item

Orchestrate one exact ID. The parent retains only routing, state, and compact results; repository documents remain authoritative.

## Preconditions

Before spawning, read `AGENTS.md`, required memory, the roadmap entry.

- Require roadmap state exactly `Ready` and complete dependencies.
- Stop/report `Backlog`, `Specified`, `In progress`, `In review`, `Changes requested`, `Done`, `Blocked`, unknown states, or overlapping work. Never silently start, reopen, resume, or include neighboring items.
- Future resumption requires an explicit owner request and the then-authoritative lifecycle.

## Sequential routing

Allow no concurrent writes; the parent never performs specialist work. Verify the orchestration surface honored each requested role/model; stop and disclose any unapproved fallback.

1. Spawn `roadmap_specifier`; it MUST use `$specify-roadmap-item`. It may approve only a complete technical spec with no reserved human matter. For an internal, reversible technical ADR covered by D-007/D-008, it MUST create/register the ADR, apply the delegated recommendation, and approve without another owner turn.
2. Spawn `roadmap_implementer`; it MUST use `$implement-roadmap-item`, run complete applicable initial gates, move the item to `In review`, and return lifecycle, implementation range, summary, evidence, risks, and overlap notes.
3. Spawn a distinct `roadmap_reviewer`; it MUST use `$review-roadmap-item` and receive the ID, approved spec, implementation range, and summary. It independently verifies evidence and returns normalized findings or approval.

Each finding MUST have stable ID, severity, criterion, evidence, impact, owner, correction, and recheck. Owners and routing:

- `implementation`: only this owner causes `Changes requested`; send to the same implementer.
- `review-probe`: the reviewer corrects/discards its temporary probe and reruns it without lifecycle change.
- `environment`: report the blocker/evidence gap; never convert it to implementation.
- `spec-ambiguity`: return to the same specifier only if acceptance changes; otherwise the reviewer clarifies without reopening.

After implementation correction, send its range/summary to the same reviewer. Permit at most two implementation correction rounds; then stop with unresolved IDs and exact resume action. Correction runs focused tests plus affected gates. Final approval requires complete applicable gates and authoritative state `Done`; prose approval is insufficient.

Do not repeat physical measurement without changed inputs, implementation, environment, or spec; cite valid evidence.

## Stop and return

Stop for reserved decisions; non-delegated ADR/authority; secrets; production mutation; money; privacy; terms; licenses; final identity; destructive migration; save/score invalidation; published-rule changes; model fallback; unsafe overlap; or exhausted retries. Never deploy, publish, push, or mutate production without explicit authorization.

Return ID, terminal state, role/model verification, ranges, validations, unresolved findings, risks, and resume action. Never advance another item.
