# F0-06 Desktop Intake Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Concluir F0-06 com três relatórios válidos de desktop Windows no lugar do ThinkPad, preservar os findings medidos e entregar o item para revisão independente.

**Architecture:** O avaliador existente continua sendo a única implementação de classificação. Os JSONs físicos permanecem imutáveis e são promovidos para pastas datadas somente após validação de schema, unicidade, comparabilidade e formatação; documentos de lifecycle registram a substituição logística sem alterar workload, thresholds ou runtime.

**Tech Stack:** TypeScript, Vitest, Playwright, Vite, JSON e Markdown.

---

### Task 1: Auditar o trio de desktop

**Files:**
- Read: `docs/performance/baselines/desktop-primary-run-01.json`
- Read: `docs/performance/baselines/desktop-primary-run-02.json`
- Read: `docs/performance/baselines/desktop-primary-run-03.json`
- Read: `tests/performance/lib/measurement.ts`

- [x] **Step 1: Calcular os hashes e confirmar que os arquivos são distintos**

Run:

```bash
sha256sum docs/performance/baselines/desktop-primary-run-0{1,2,3}.json
```

Expected: três hashes SHA-256 diferentes.

- [x] **Step 2: Avaliar os três relatórios com o contrato do projeto**

Run:

```bash
node --experimental-strip-types --input-type=module -e 'import fs from "node:fs"; import { evaluateDeviceReports } from "./tests/performance/lib/measurement.ts"; const reports=[1,2,3].map((n)=>JSON.parse(fs.readFileSync(`docs/performance/baselines/desktop-primary-run-0${n}.json`,"utf8"))); console.log(evaluateDeviceReports(reports));'
```

Expected: `evaluation: "fail"` apenas por `frameP95` e `longTasksAbove50Ms` nas três runs, nunca `not-evaluated`.

### Task 2: Promover e documentar os baselines físicos

**Files:**
- Move: `docs/performance/baselines/iphone-primary-run-02.json` → `docs/performance/baselines/2026-06-28/iphone-primary-run-02.json`
- Move: `docs/performance/baselines/iphone-primary-run-03.json` → `docs/performance/baselines/2026-06-28/iphone-primary-run-03.json`
- Move: `docs/performance/baselines/iphone-primary-run-04.json` → `docs/performance/baselines/2026-06-28/iphone-primary-run-04.json`
- Move: `docs/performance/baselines/tablet-android-run-02.json` → `docs/performance/baselines/2026-06-28/tablet-android-run-02.json`
- Move: `docs/performance/baselines/tablet-android-run-03.json` → `docs/performance/baselines/2026-06-28/tablet-android-run-03.json`
- Move: `docs/performance/baselines/tablet-android-run-04.json` → `docs/performance/baselines/2026-06-28/tablet-android-run-04.json`
- Move: `docs/performance/baselines/desktop-primary-run-01.json` → `docs/performance/baselines/2026-06-29/desktop-primary-run-01.json`
- Move: `docs/performance/baselines/desktop-primary-run-02.json` → `docs/performance/baselines/2026-06-29/desktop-primary-run-02.json`
- Move: `docs/performance/baselines/desktop-primary-run-03.json` → `docs/performance/baselines/2026-06-29/desktop-primary-run-03.json`
- Modify: `docs/performance/baselines/2026-06-28-intake.md`
- Modify: `docs/performance/baselines/README.md`

- [x] **Step 1: Mover somente os trios aceitos**

Preserve na raiz os relatórios históricos inválidos, duplicados ou incompletos. Coloque os trios aceitos nas pastas das datas de coleta/intake.

- [x] **Step 2: Registrar os hashes e resultados exatos**

O resumo deve registrar desktop frame p95 `16,80 ms`, tick p95 `0,20 ms`, quatro Long Tasks, menor janela `57,8–58,0 FPS`, heap dentro do limite e avaliação agregada `fail`.

### Task 3: Fechar a documentação de implementação

**Files:**
- Modify: `docs/specs/SPEC-F0-06-performance-harness-matrix-budgets.md`
- Modify: `docs/performance/MATRIX.md`
- Modify: `docs/product/REQUIREMENTS.md`
- Modify: `docs/quality/RISKS.md`
- Modify: `docs/specs/README.md`
- Modify: `docs/roadmap/ROADMAP.md`
- Modify: `docs/memory/CURRENT_STATE.md`

- [x] **Step 1: Registrar a substituição logística do desktop**

Declare que o desktop Windows com Intel Core i5-9600KF, NVIDIA GeForce RTX 2060 SUPER e 16 GiB substitui o ThinkPad como `desktop-primary` por decisão explícita do proprietário. Preserve a falta de cobertura de GPU integrada como risco futuro.

- [x] **Step 2: Fechar o critério físico sem fabricar aprovação de performance**

Marque a existência do trio desktop + trio celular como atendida, mantenha `PERF-01` em `Planned` e registre `fail` nas três runs de cada aparelho onde aplicável.

- [x] **Step 3: Mover o lifecycle para revisão**

Depois das verificações, defina spec, índice e roadmap como `In review`. Atualize a memória com realizado, validações, pendências, riscos e próximo passo exato `$review-roadmap-item F0-06`.

### Task 4: Verificar o incremento completo

**Files:**
- Verify: all F0-06 files and repository gates

- [x] **Step 1: Executar testes e determinismo**

Run:

```bash
npm run test:unit -- --run tests/unit/performance.test.ts tests/unit/performanceBudget.test.ts
npm run test:determinism
```

Expected: todos os testes verdes e nenhum golden alterado.

- [x] **Step 2: Executar build, budget e E2E**

Run:

```bash
npm run build
npm run performance:budget
CI=1 npm run test:e2e
```

Expected: build/budget com exit 0, testes de produto e smoke do harness verdes.

- [x] **Step 3: Executar o gate agregado e inspeções finais**

Run:

```bash
npm run check
git diff --check
git status --short
```

Expected: gate agregado e whitespace verdes; status contém apenas a unidade F0-06 já existente e sua conclusão documental.
