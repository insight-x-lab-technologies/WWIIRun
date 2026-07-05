# Roadmap Item Orchestration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a project-local `$next-roadmap-item <ID>` workflow that automatically specifies, implements, reviews, and performs at most two correction rounds for one WWIIRun roadmap item using isolated, role-specific child contexts.

**Architecture:** A small orchestration skill sequences three project-scoped custom agents over the shared worktree; no stages write concurrently. Existing lifecycle skills remain authoritative for each role, while the orchestrator owns automatic technical-spec approval, structured handoffs, finding ownership, retry limits, and final reporting.

**Tech Stack:** Codex Agent Skills Markdown, Codex project custom-agent TOML, Git, WWIIRun SDD documentation.

---

## File Map

- Create `.agents/skills/next-roadmap-item/SKILL.md`: orchestration state machine and stop conditions.
- Create `.agents/skills/next-roadmap-item/agents/openai.yaml`: skill UI metadata.
- Create `.codex/agents/roadmap_specifier.toml`: high-reasoning specification role.
- Create `.codex/agents/roadmap_implementer.toml`: economical implementation/correction role.
- Create `.codex/agents/roadmap_reviewer.toml`: economical but high-reasoning independent review role.
- Modify `.agents/skills/specify-roadmap-item/SKILL.md`: permit scoped automatic approval under the orchestrator.
- Modify `.agents/skills/implement-roadmap-item/SKILL.md`: accept structured, incremental correction handoffs.
- Modify `.agents/skills/review-roadmap-item/SKILL.md`: classify finding ownership and support incremental re-review.
- Modify `AGENTS.md`: document the orchestration entry point and durable automatic-approval authority.
- Modify `docs/memory/DECISIONS.md`: record automatic approval and bounded correction as `D-008`.
- Modify `docs/memory/CURRENT_STATE.md`: record workflow delivery, validation, risks, and exact next step without overwriting active F1-01 facts.

### Task 1: Capture RED behavior with pressure scenarios

**Files:**

- Read: `.agents/skills/specify-roadmap-item/SKILL.md`
- Read: `.agents/skills/implement-roadmap-item/SKILL.md`
- Read: `.agents/skills/review-roadmap-item/SKILL.md`
- Temporary: `/tmp/wwiirun-roadmap-orchestration-red/`

- [ ] **Step 1: Preserve the current repository state**

Run:

```bash
git status --short
git rev-parse HEAD
```

Expected: capture the active F1-01 modifications and current commit; do not stash, restore, or modify them.

- [ ] **Step 2: Run baseline pressure prompts without the new skill**

Use fresh read-only subagents with these exact scenarios and ask for proposed actions only:

```text
Scenario A: Take synthetic roadmap item FT-01 from Ready through specification, implementation, independent review, and Done without a human spec-approval turn.
Scenario B: During review, your temporary negative probe has an invalid assertion. Decide whether to return the item to implementation.
Scenario C: Review emits an implementation finding twice. Continue corrections until approved, but never loop indefinitely.
Scenario D: The spec requires choosing a paid service. Decide whether automatic approval is permitted.
```

Expected RED: the current skills cannot provide the complete orchestrated state machine; specifically note any human approval requirement, reviewer-probe misclassification, unbounded respawning, or reserved-decision bypass.

- [ ] **Step 3: Confirm the baseline did not mutate the repository**

Run:

```bash
git status --short
git diff --name-only
```

Expected: output matches Step 1 for tracked paths.

### Task 2: Scaffold and write the orchestration skill

**Files:**

- Create: `.agents/skills/next-roadmap-item/SKILL.md`
- Create: `.agents/skills/next-roadmap-item/agents/openai.yaml`

- [ ] **Step 1: Initialize the skill with the official scaffold**

Run:

```bash
python3 /home/codexbot/.codex/skills/.system/skill-creator/scripts/init_skill.py next-roadmap-item --path .agents/skills --interface display_name="Next Roadmap Item" --interface short_description="Orchestrate one roadmap item end to end" --interface default_prompt="Use $next-roadmap-item F1-02 to complete the next approved roadmap workflow."
```

Expected: the new directory contains `SKILL.md` and `agents/openai.yaml`, with no example or unused resource directories.

- [ ] **Step 2: Replace the generated body with the minimal state machine**

Write `.agents/skills/next-roadmap-item/SKILL.md` with this structure and rules:

```markdown
---
name: next-roadmap-item
description: Use when the owner asks to advance exactly one WWIIRun roadmap item end to end with isolated specification, implementation, independent review, and bounded corrections.
---

# Next Roadmap Item

Orchestrate one roadmap ID. Keep the parent context to state, routing, and concise results; repository documents remain authoritative.

## Required input

Require one exact roadmap ID. Do not infer permission to start neighboring items.

## Required roles

Spawn these project agents sequentially: `roadmap_specifier`, `roadmap_implementer`, then `roadmap_reviewer`. Never allow concurrent writes. Verify the active surface honored the named role/model configuration; disclose and stop on an unapproved fallback.

Each role MUST use its matching lifecycle skill:

- specifier: `$specify-roadmap-item`;
- implementer: `$implement-roadmap-item`;
- reviewer: `$review-roadmap-item`.

## Workflow

1. Read `AGENTS.md`, required memory, the roadmap entry, and `git status`. Stop for incomplete dependencies or overlapping unexplained changes.
2. Ask the specifier to specify the ID. Permit `Approved` only for a complete technical spec with no reserved human matter.
3. Ask the implementer to implement the approved spec and return only paths, criterion status, commands/results, risks, and the implementation range.
4. Start a distinct reviewer with the ID, spec path, implementation range, and compact summary.
5. If approved, verify lifecycle documents say `Done`, update final memory once, and report.
6. If findings have owner `implementation`, send only their structured records to the existing implementer; then send the correction range and finding IDs back to the existing reviewer.
7. Permit at most two correction rounds. On exhaustion, stop with unresolved findings and one exact resume action.

## Finding ownership

Require stable ID, severity, criterion, evidence, impact, owner, correction, and recheck commands. Owners are `implementation`, `review-probe`, `environment`, or `spec-ambiguity`.

- The reviewer fixes or discards its own temporary `review-probe` without changing lifecycle state.
- Environment failures are retried or reported blocked, never labeled implementation defects.
- `spec-ambiguity` returns to the existing specifier only when acceptance behavior must change.
- Only `implementation` findings move the item to `Changes requested`.

## Verification budget

Require full applicable gates for initial implementation and final approval. During correction, run focused regressions and affected gates. Do not repeat unrelated physical measurements unless inputs changed or the spec requires fresh evidence.

## Stop conditions

Stop for reserved decisions, unapproved ADRs, missing authority/secrets, production mutation, paid/legal/privacy/license/final-identity choices, destructive migration, save or score invalidation, model-role fallback, overlapping worktree changes, or retry exhaustion. Never deploy, publish, push, or mutate production without explicit authorization.
```

- [ ] **Step 3: Validate skill metadata and size**

Run:

```bash
python3 /home/codexbot/.codex/skills/.system/skill-creator/scripts/quick_validate.py .agents/skills/next-roadmap-item
wc -l -w .agents/skills/next-roadmap-item/SKILL.md
```

Expected: validation passes; the skill remains below 500 lines and contains no unused scaffolding.

- [ ] **Step 4: Commit the orchestration skill**

Run:

```bash
git add .agents/skills/next-roadmap-item
git -c user.name=Codex -c user.email=codex@openai.com -c committer.name=Codex -c committer.email=codex@openai.com commit -m "feat(workflow): add roadmap item orchestrator"
```

Expected: commit contains only the new skill files.

### Task 3: Add project-scoped custom agents

**Files:**

- Create: `.codex/agents/roadmap_specifier.toml`
- Create: `.codex/agents/roadmap_implementer.toml`
- Create: `.codex/agents/roadmap_reviewer.toml`

- [ ] **Step 1: Create the specification agent**

Write `.codex/agents/roadmap_specifier.toml`:

```toml
name = "roadmap_specifier"
description = "Specifies exactly one WWIIRun roadmap item and may automatically approve a complete technical spec."
model = "gpt-5.5"
model_reasoning_effort = "high"
sandbox_mode = "workspace-write"
developer_instructions = """
Use $specify-roadmap-item for exactly the ID supplied by the parent. Read only required memory and relevant linked documents. Approve a complete technical spec automatically only when no matter reserved by AGENTS.md remains. Return a compact handoff; do not implement runtime or tests.
"""
```

- [ ] **Step 2: Create the implementation agent**

Write `.codex/agents/roadmap_implementer.toml`:

```toml
name = "roadmap_implementer"
description = "Implements or corrects exactly one approved WWIIRun roadmap item."
model = "gpt-5.4-mini"
model_reasoning_effort = "medium"
sandbox_mode = "workspace-write"
developer_instructions = """
Use $implement-roadmap-item for exactly the ID supplied by the parent. On corrections, address only structured implementation-owned findings and affected regressions. Preserve unrelated changes. Return compact paths, criteria, commands/results, risks, and commit range; never mark Done.
"""
```

- [ ] **Step 3: Create the review agent**

Write `.codex/agents/roadmap_reviewer.toml`:

```toml
name = "roadmap_reviewer"
description = "Independently reviews exactly one implemented WWIIRun roadmap item and rechecks bounded corrections."
model = "gpt-5.4-mini"
model_reasoning_effort = "high"
sandbox_mode = "workspace-write"
developer_instructions = """
Use $review-roadmap-item for exactly the ID supplied by the parent. Remain distinct from the implementer. Classify finding ownership before lifecycle changes. Correct or discard reviewer-owned temporary probes yourself; never edit runtime or versioned implementation artifacts. Return compact structured findings or approval evidence.
"""
```

- [ ] **Step 4: Parse and inspect the agent files**

Run:

```bash
python3 -c 'import pathlib,tomllib; [tomllib.loads(p.read_text()) for p in pathlib.Path(".codex/agents").glob("roadmap_*.toml")]'
rg -n '^(name|model|model_reasoning_effort|sandbox_mode) =' .codex/agents/roadmap_*.toml
```

Expected: Python exits 0; output shows one unique role name, the intended model, reasoning effort, and `workspace-write` for each file.

- [ ] **Step 5: Commit the custom agents**

Run:

```bash
git add .codex/agents/roadmap_specifier.toml .codex/agents/roadmap_implementer.toml .codex/agents/roadmap_reviewer.toml
git -c user.name=Codex -c user.email=codex@openai.com -c committer.name=Codex -c committer.email=codex@openai.com commit -m "feat(workflow): add roadmap lifecycle agents"
```

Expected: commit contains exactly three TOML files.

### Task 4: Make lifecycle skills orchestration-aware

**Files:**

- Modify: `.agents/skills/specify-roadmap-item/SKILL.md`
- Modify: `.agents/skills/implement-roadmap-item/SKILL.md`
- Modify: `.agents/skills/review-roadmap-item/SKILL.md`

- [ ] **Step 1: Add automatic technical approval to specification**

Add after the specification workflow:

```markdown
## Orchestrated approval

When invoked by `$next-roadmap-item`, set a complete technical spec to `Approved` without another user turn under `D-008`. Stop at `Awaiting approval` if money, privacy, terms, licenses, final visual identity, destructive migration, save/score invalidation, published rules, or another matter reserved by `AGENTS.md` remains. Outside the orchestrator, preserve the normal approval contract.
```

Update the existing status step so it does not contradict this exception.

- [ ] **Step 2: Add structured correction handling to implementation**

Replace the current review-finding paragraph with:

```markdown
## Handling review findings

When status is `Changes requested`, accept only findings with stable ID, criterion, evidence, owner, correction, and recheck commands. Implement only findings owned by `implementation` and required regressions. During an orchestrated correction, run focused tests and affected gates; the final reviewer owns the closing gate. Preserve review history, return the item to `In review`, and return a compact correction range keyed by finding ID.
```

- [ ] **Step 3: Add ownership and incremental re-review to review**

Insert before verdict selection:

```markdown
## Finding ownership

Classify every failure before changing lifecycle state: `implementation`, `review-probe`, `environment`, or `spec-ambiguity`. A temporary probe, fixture, assertion, command, or environment assumption created solely by this review remains reviewer-owned: correct or discard it and continue. Never send it to implementation. Existing versioned tests are implementation surface. Environment failures block evidence but are not implementation findings.

Under `$next-roadmap-item`, the same independent reviewer may recheck a correction. Recheck open finding IDs, affected criteria, regression surface, diff integrity, and the required closing gate; do not reconstruct unrelated review work without cause.
```

Change `Changes requested` so only unresolved `implementation` findings or confirmed acceptance failures trigger it; environment/spec blockers retain an accurate blocked state and next action.

- [ ] **Step 4: Validate all lifecycle skill folders**

Run:

```bash
for skill in specify-roadmap-item implement-roadmap-item review-roadmap-item next-roadmap-item; do python3 /home/codexbot/.codex/skills/.system/skill-creator/scripts/quick_validate.py ".agents/skills/$skill"; done
rg -n "review-probe|two correction|Orchestrated approval|structured" .agents/skills/{next,specify,implement,review}-roadmap-item/SKILL.md
```

Expected: all four validations pass and each orchestration contract is discoverable.

- [ ] **Step 5: Commit lifecycle compatibility changes**

Run:

```bash
git add .agents/skills/specify-roadmap-item/SKILL.md .agents/skills/implement-roadmap-item/SKILL.md .agents/skills/review-roadmap-item/SKILL.md
git -c user.name=Codex -c user.email=codex@openai.com -c committer.name=Codex -c committer.email=codex@openai.com commit -m "refactor(workflow): streamline roadmap correction loop"
```

Expected: commit changes only the three existing skill bodies.

### Task 5: Record durable authority and operating instructions

**Files:**

- Modify: `AGENTS.md`
- Modify: `docs/memory/DECISIONS.md`
- Modify: `docs/memory/CURRENT_STATE.md`

- [ ] **Step 1: Document the new entry point in `AGENTS.md`**

Add under lifecycle skills:

```markdown
- `$next-roadmap-item`: orquestrar um item elegível por especificação, implementação, revisão independente e no máximo duas correções. O orquestrador pode aprovar automaticamente specs técnicas completas; matérias humanas reservadas continuam bloqueando o fluxo.
```

- [ ] **Step 2: Record `D-008` in decision memory**

Add to the decision table:

```markdown
| D-008 | Aceita | `$next-roadmap-item` pode aprovar specs técnicas completas e orquestrar até duas correções; decisões humanas reservadas continuam exigindo confirmação. |
```

- [ ] **Step 3: Append a concise session entry without replacing F1-01 state**

Add to `docs/memory/CURRENT_STATE.md`:

```markdown
- realizado em 2026-07-04: workflow `$next-roadmap-item` criado com agentes separados para especificação, implementação e revisão, aprovação técnica automática e limite de duas correções; mudanças ativas de F1-01 foram preservadas.
- validações do workflow: registrar validação das quatro skills, parse dos três agentes TOML, cenários GREEN executados e `git diff --check`.
- risco: seleção exata do agente/modelo depende da superfície Codex carregar `.codex/agents`; fallback não verificado deve interromper e ser informado.
- próximo passo exato: iniciar o próximo item elegível com `$next-roadmap-item <ID>` somente após concluir o estado ativo de F1-01.
```

Replace the validation sentence with factual results after Task 6; do not leave claims for commands not run.

- [ ] **Step 4: Inspect documentation-only diff**

Run:

```bash
git diff --check -- AGENTS.md docs/memory/DECISIONS.md docs/memory/CURRENT_STATE.md
git diff -- AGENTS.md docs/memory/DECISIONS.md docs/memory/CURRENT_STATE.md
```

Expected: only the orchestration instruction, durable decision, and appended handoff facts are new; active F1-01 content remains intact.

### Task 6: Run GREEN pressure scenarios and closing validation

**Files:**

- Verify: `.agents/skills/next-roadmap-item/SKILL.md`
- Verify: `.codex/agents/roadmap_*.toml`
- Verify: `.agents/skills/{specify,implement,review}-roadmap-item/SKILL.md`
- Modify: `docs/memory/CURRENT_STATE.md` only to replace planned evidence with actual evidence.
- Temporary: `/tmp/wwiirun-roadmap-orchestration-green/`

- [ ] **Step 1: Run the same four pressure scenarios with the new skill**

Use fresh subagents with repository writes disabled and prompt each to use `$next-roadmap-item` against a synthetic item description stored under `/tmp`, never a real roadmap ID.

Expected GREEN:

- Scenario A routes specifier → implementer → distinct reviewer and permits technical approval.
- Scenario B classifies the invalid temporary assertion as `review-probe` and does not invoke implementation.
- Scenario C stops after two correction rounds with unresolved finding IDs and one resume action.
- Scenario D stops before implementation for the paid-service decision.

- [ ] **Step 2: Verify role/model discovery in a fresh Codex thread**

Start a fresh non-mutating Codex invocation that lists or selects `roadmap_specifier`, `roadmap_implementer`, and `roadmap_reviewer` through the available subagent surface.

Expected: all three named roles are discoverable with configured models. If the surface cannot expose or honor named roles, record that exact limitation and keep `$next-roadmap-item` fail-closed rather than claiming model selection.

- [ ] **Step 3: Run deterministic structural validation**

Run:

```bash
for skill in specify-roadmap-item implement-roadmap-item review-roadmap-item next-roadmap-item; do python3 /home/codexbot/.codex/skills/.system/skill-creator/scripts/quick_validate.py ".agents/skills/$skill"; done
python3 -c 'import pathlib,tomllib; files=list(pathlib.Path(".codex/agents").glob("roadmap_*.toml")); assert len(files)==3; data=[tomllib.loads(p.read_text()) for p in files]; expected={"roadmap_specifier": ("gpt-5.5", "high"), "roadmap_implementer": ("gpt-5.4-mini", "medium"), "roadmap_reviewer": ("gpt-5.4-mini", "high")}; assert {d["name"]: (d["model"], d["model_reasoning_effort"]) for d in data} == expected'
git diff --check
```

Expected: every command exits 0.

- [ ] **Step 4: Update memory with observed results**

Replace any planned validation language in `CURRENT_STATE.md` with actual scenario outcomes, commands, failures, and model-discovery status. Do not claim full end-to-end validation if the active surface could not select custom agents.

- [ ] **Step 5: Commit the documentation and final validation record**

Run:

```bash
git add AGENTS.md docs/memory/DECISIONS.md docs/memory/CURRENT_STATE.md
git -c user.name=Codex -c user.email=codex@openai.com -c committer.name=Codex -c committer.email=codex@openai.com commit -m "docs(workflow): adopt orchestrated roadmap lifecycle"
```

Expected: commit contains only the three documentation files and preserves unrelated active changes.

- [ ] **Step 6: Audit final scope and commits**

Run:

```bash
git status --short
git log --format='%h %an <%ae> | %cn <%ce> | %s' -5
git diff HEAD~4..HEAD --name-only
```

Expected: pre-existing F1-01 modifications remain visible but untouched; all new commits use `Codex <codex@openai.com>`; the orchestration range contains only the design, plan, skills, agents, and documentation named above.

## Completion Conditions

- The skill and three agents are discoverable in a fresh supported Codex surface.
- All four lifecycle skills pass `quick_validate.py`.
- TOML parsing and pressure scenarios pass or any surface limitation is explicitly recorded fail-closed.
- No real roadmap feature, runtime file, test, dependency, workflow, deployment, or GitHub state is changed.
- Existing F1-01 working-tree changes are preserved.
- The next feature is started only through a later explicit `$next-roadmap-item <ID>` request.
