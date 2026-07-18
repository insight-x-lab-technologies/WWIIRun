# SPEC-F1-08: HUD de gameplay e telemetria da run

Status: Done  
Owner: Codex  
Requisitos: `GAME-08` (parcial), `UI-04` (parcial), `PERF-01` (instrumentação), `DET-01` (preservado)  
Dependências: `F1-06` (`Done`); ADR-0001, ADR-0002, ADR-0005, ADR-0006 e ADR-0014 aceitos

## Problema e resultado

A vertical slice já possui vida, tick, velocidade, seed e estatísticas canônicas, mas só os expõe por diagnóstico técnico. F1-08 entrega um HUD Phaser legível que projeta esses dados sem se tornar fonte de verdade: vida, distância, moedas, FPS, nível técnico, velocidade e seed ficam visíveis em portrait e landscape enquanto a run permanece idêntica.

## Escopo

- Incluído:
  - módulo de apresentação em `src/game/` com view-models puros, formatadores e contrato explícito do HUD; a `GameplayScene` cria recursos uma vez, atualiza-os a partir do snapshot/render delta e os libera no teardown;
  - vida atual/máxima, moedas transitórias de `runStats.runCoins`, seed canônica de `RunConfig`, velocidade instantânea do jogador, distância técnica da run, nível provisório e FPS de render; datasets/estado DOM acessível mínimos e estáveis para E2E, sem substituir o HUD canvas;
  - layout que reserva faixa de HUD fora do mundo em portrait e respeita safe areas/cantos superiores em landscape, sem cobrir aeronave, ameaças, zonas de toque ou controles; resize/rotação reaplicam somente geometria de apresentação;
  - seed abreviada em exibição compacta e representação completa acessível/diagnóstica; ação futura de copiar/expandir fica fora deste item;
  - testes unitários, integração Phaser, E2E/viewports e probe de reuso; rastreabilidade e memória atualizadas.
- Fora de escopo:
  - diretor, progressão/dificuldade real, spawn, score, economia, wallet, save, replay, game-over/resumo, retry/home, power-ups, ameaças ou cooldown visual adicional; F2/F1-09 são donos desses comportamentos;
  - qualquer alteração de `simulation`, `RunState`, `RunConfig`, schemas, hash, corpus/goldens, seed/RNG, regras publicadas ou dados de balanceamento;
  - menus/DOM de produto, i18n completo, clipboard, rede, backend, telemetria enviada, assets raster/licença, dependência, workflow, PWA/deploy e medição física F0.

## Regras e contratos

### Projeção e valores

- O HUD é consumidor read-only de `GameplaySession.snapshot()`. Não chama `stepRun`, não escreve player/runStats/config, não altera input, pausa, PWA ou lifecycle, e `simulation` nunca o importa.
- Vida é `current/max` do player. Moedas são somente `runStats.runCoins`, explicitamente não uma carteira persistida. Seed é `state.config.seed` canônica de 32 hex minúsculos; a forma compacta é os primeiros/últimos oito caracteres separados por `…`, e a completa fica em dataset/label técnico estável.
- Distância é uma apresentação técnica, não score: `floor(tick / 60)` metros. Ela avança com ticks canônicos, não com delta/FPS/tempo de parede, e não entra no estado/hash. Velocidade é `round(max(abs(velocity.x), abs(velocity.y)) * 60 * 3.6 / 256)` km/h, derivada somente da velocidade inteira já existente. Ambos devem declarar suas unidades no HUD.
- Até F2-03 introduzir diretor/progressão, nível é o literal técnico `1`; não derivar nível por relógio, FPS ou distância. A troca futura deve permanecer uma entrada de apresentação explícita e não pode retroativamente mudar regras F1.
- FPS é diagnóstico de render, calculado de `delta` recebido pelo renderer por uma janela limitada/reutilizável; entrada inválida/não positiva exibe `—`. FPS não usa `Date`, não entra em datasets canônicos nem pode influenciar simulação. Pausa/resize não avançam distância ou estado; podem limpar/reinicializar somente a janela visual de FPS.

### Layout, acessibilidade e lifecycle

- O HUD canvas fica acima de parallax/entidades e abaixo de overlays futuros. Em portrait usa a faixa lógica superior fora de `world` (`0..210`); em landscape usa margem superior do canvas sem ultrapassar safe area CSS. Seus bounds são recalculados somente em create/layout/resize, não há leitura de layout DOM no update.
- Texto deve manter contraste técnico suficiente, rótulo + valor (não apenas cor) e não capturar ponteiro/teclado. O status DOM acessível permanece de baixa frequência; valores de HUD necessários para E2E usam `data-hud-*` estáveis, mas não há live region de FPS/tick.
- Textos/arrays/objetos do HUD são pré-alocados ou atualizados in-place após warm-up; não criar `Text`, `Graphics`, listeners, timers ou arrays obrigatórios por frame. Cinco ciclos create/update/shutdown removem todos os recursos e update após destroy é inerte.

### Aplicabilidade transversal

- Determinismo: aplicável por isolamento. O core, hashes e corpus/goldens v1–v6 permanecem byte a byte inalterados; a mesma snapshot sempre forma os mesmos campos exceto FPS, que é assumidamente diagnóstico local e não canônico.
- Performance: aplicável. Há recursos limitados/reutilizados e probe de identidade/contagem; não repetir matriz física F0 nem alegar 60 FPS por execução automatizada.
- Responsividade/acessibilidade: aplicável nos viewports de F1, incluindo rotação e safe area simulada. i18n final não é aplicável: F4 é dona das mensagens/locales, mas os rótulos provisórios devem ficar isolados para futura substituição.
- Assets, save, segurança, privacidade, backend e offline: não aplicáveis; não há asset, persistência, coleta externa, request, segredo ou dependência nova. PWA offline existente é preservada.

### Decisão estrutural

Não há ADR novo. Derivar distância/velocidade/nível técnico no renderer é interno, reversível e evita antecipar o diretor F2 ou alterar o contrato determinístico, conforme D-007/D-008 e ADRs aceitos. Economia, progressão publicada, identidade final e i18n permanecem fora de escopo e reservados quando aplicáveis.

## Critérios de aceitação

- [ ] AC-01 — Dada uma `GameplayScene` ativa, quando projeta um snapshot, então HUD mostra vida, distância em m, moedas, FPS, nível 1, velocidade em km/h e seed compacta; valores completos/técnicos são observáveis sem confundir moedas com carteira.
- [ ] AC-02 — Dados ticks, velocidades, vida, moedas e seed conhecidos, quando formatados repetidamente, então distância/velocidade/seed/nível coincidem exatamente com as fórmulas e entradas desta spec; FPS inválido mostra `—` e nunca altera snapshot/core.
- [ ] AC-03 — Dados snapshots e inputs idênticos sob render chunking, Node e Chromium, quando HUD é atualizado, então estado/hash/corpus v1–v6 permanecem literais e todos os campos canônicos do HUD coincidem; somente FPS pode diferir localmente.
- [ ] AC-04 — Dado portrait, landscape, resize, rotação e safe areas simuladas, quando o layout é reaplicado, então HUD permanece dentro da área lógica/coberta, legível e não intercepta aeronave, mundo ou zonas de toque.
- [ ] AC-05 — Dados cinco ciclos create/update/shutdown e atualização pós-destroy, quando recursos são contados após warm-up, então não acumulam texto/gráficos/listeners/callbacks/canvas nem há alocação obrigatória por frame.
- [ ] AC-06 — Dados teclado e touch durante HUD ativo, quando ações/movimento são enviados, então input e lifecycle existentes continuam funcionais; datasets técnicos e status acessível permanecem estáveis sem live region de alta frequência.
- [ ] AC-07 — Formato, lint, typecheck, unitários/coverage aplicável, determinismo, build/inspector/budget, E2E produto, PWA e `git diff --check` passam; não mudam dependências, workflow, `src/simulation`, corpus/goldens, assets licenciáveis ou baselines físicos.
- [ ] AC-08 — Spec, requisitos, roadmap, índice de specs e `CURRENT_STATE.md` rastreiam F1-08; somente revisão independente pode movê-lo de `In review` para `Done` e liberar F1-09.

## Plano de teste

- unitário: formatadores/fórmulas e limites de vida/moedas/seed, nível literal, FPS válido/inválido/janela limitada e garantia de que view-model não muta snapshot;
- determinismo: repetir timeline/chunkings em Node/Chromium, comparar campos derivados canônicos e confirmar preservação literal de corpus/goldens v1–v6;
- integração/E2E: cena cria/projeta/destrói HUD, datasets e status acessível; teclado/touch continuam funcionais; Playwright cobre portrait, landscape, resize/rotação e safe area;
- manual/performance/viewports: inspecionar contraste, truncamento, cobertura e sobreposição em `320×568`, landscape baixo, `768×1024`, `1024×768` e `1920×1080`; rodar probe pós-warm-up/cinco ciclos. Não repetir medição física F0.

## Migração e rollback

Não há migração: nenhuma estrutura persistida, save, replay, score, ruleset ou conteúdo é alterado. Rollback remove somente o módulo/recursos de apresentação e retorna ao diagnóstico existente, preservando estado v6, corpus, PWA, dependências e documentação histórica. Se criação/layout do HUD falhar, a cena libera recursos parciais e falha explicitamente; nunca inicia um HUD parcialmente publicado.

## Evidências de conclusão

- range/commit isolado de F1-08 com autor e committer `Codex <codex@openai.com>`;
- testes focados/coverage, determinismo, `npm run check`, E2E, PWA e `git diff --check` frescos;
- probe de fórmulas, datasets, layout e identidade/reuso; comparação literal de corpus/goldens antes/depois;
- inspeção dos viewports e teardown, e diff demonstrando ausência de core, assets, dependências, workflow, rede e baselines;
- atualização de rastreabilidade sem marcar `GAME-08`, `UI-04` ou `PERF-01` amplos como `Done` antes da vertical slice/revisão independente.

## Histórico de revisão

- 2026-07-17 — especificação criada e aprovada tecnicamente pelo fluxo `$next-roadmap-item` sob D-007/D-008. F1-06 foi confirmado `Done`, F1-08 estava `Ready` e não há decisão humana reservada. Nenhum runtime, teste, golden, dependência, asset ou workflow foi alterado/executado nesta etapa.
- 2026-07-17 — implementação F1-08 concluída e enviada para revisão independente. `src/game/hud.ts` projeta read-only vida, distância técnica, moedas transitórias, FPS local, nível `1`, velocidade e seed; `GameplayScene` cria, reposiciona e libera o recurso. Evidências frescas: focados `tests/unit/hud.test.ts` + `tests/unit/gameplayScene.test.ts` (4/4), `npm run typecheck`, `npm run test:determinism` (12/12), `npm run check`, `npm run test:e2e` e `npm run test:pwa` verdes; os dois últimos exigiram execução fora do sandbox somente pelo bind do servidor local. `git diff --check` verde. Não houve alteração em `src/simulation`, corpus/goldens, assets, dependências, workflow, PWA ou baselines físicos.
- 2026-07-17 — revisão independente solicitou mudanças. `F1-08-HUD-01` (High, AC-07, owner: implementation): `npm run test:unit` e o foco `vitest run tests/unit/hud.test.ts tests/unit/gameplayScene.test.ts` falham porque `src/game/hud.ts` importa Phaser no ambiente Node e o módulo lança `ReferenceError: window is not defined`; separar a projeção/formatação pura da dependência Phaser ou prover configuração de teste adequada, então rodar os unitários e `npm run check`. `F1-08-LAYOUT-01` (High, AC-04/AC-06/AC-07, owner: implementation): o novo E2E serial (`npx playwright test tests/e2e/gameplay.spec.ts --grep "projects the technical HUD" --workers=1`) falha após `page.setViewportSize`, pois `data-hud-distance` fica vazio apesar do canvas único permanecer; preservar/reprojetar todos os datasets técnicos depois de resize/rotação e reexecutar o caso nos viewports exigidos e o gate E2E. `F1-08-GATE-01` (High, AC-07, owner: implementation): o gate unitário completo também falha em `tests/unit/structures.test.ts` porque o teste ainda espera schema `v5` enquanto o HEAD canônico é `v6`; a asserção versionada deve ser alinhada ao contrato v6 ou o gate equivalente deve voltar a passar. `npm run typecheck` e `npm run test:determinism` (12/12) passaram; a comparação de diff confirma que F1-08 não alterou `src/simulation` nem corpus/goldens. Nenhum probe foi mantido.
- 2026-07-17 — correção de implementação 1/2 concluída e devolvida a `In review`. `F1-08-HUD-01` foi resolvido ao separar `hudProjection.ts` puro do adapter Phaser; `F1-08-LAYOUT-01` foi resolvido ao reprojetar os datasets técnicos a partir do snapshot no relayout; `F1-08-GATE-01` foi resolvido ao alinhar a asserção histórica ao schema v6 canônico. Rechecks frescos: foco HUD/cena/estruturas 10/10, `npm run test:unit` 319/319, Playwright serial do HUD, `npm run check`, `npm run test:e2e`, `npm run test:pwa` e `git diff --check` verdes. Playwright E2E/PWA foi executado fora do sandbox somente pelo bind do servidor local. Core, corpus/goldens, dependências, workflow, assets e baselines permanecem inalterados.
- 2026-07-17 — recheck independente: `F1-08-HUD-01` e `F1-08-GATE-01` passaram no foco independente (10/10); `npm run test:determinism` passou (12/12). O recheck serial do E2E de HUD fora do sandbox não concluiu: em mobile `page.setViewportSize` excedeu 30 s e em desktop o canvas não voltou a ser observado antes do timeout. A captura mobile mostra o HUD renderizado e legível antes da rotação, mas isso não substitui o gate automatizado; a evidência E2E aplicável permanece bloqueada pelo ambiente de browser local. Não há finding de implementação novo nem veredito `Done` nesta rechecagem.
- 2026-07-17 — recheck independente posterior: `npm run check`, `npm run test:determinism` e `git diff --check` passaram; o caso serial do HUD concluiu nos projetos mobile e desktop. A execução abrangente `CI=1 npm run test:e2e` iniciou os dois primeiros de 18 casos, mas o worker Chromium permaneceu bloqueado por mais de dois minutos e foi encerrado junto ao servidor Vite temporário; `test:pwa` não iniciou. Isto é uma lacuna de ambiente sem finding novo de implementação. F1-08 permanece `In review` até E2E produto/performance e PWA independentes concluírem em ambiente Chromium estável.
- 2026-07-17 — revisão independente em Chromium estável. `npm run check`, `npm run test:e2e`, `npm run test:pwa`, o foco HUD/cena/estruturas, o caso serial do HUD e `git diff --check` passaram. Finding aberto: `F1-08-VISUAL-01` — severidade: High; critério: AC-01, AC-04 e AC-07; evidência: `GameplayScene` cria/atualiza o diagnóstico em `(12,12)` com depth `10` ([`src/game/GameplayScene.ts`](../../src/game/GameplayScene.ts) linhas 84–90 e 122–124), enquanto o HUD posiciona `Life` em `(12,12)` com depth `8` ([`src/game/hud.ts`](../../src/game/hud.ts) linhas 33–35 e 80–89); o diagnóstico, inclusive sua linha longa atualizada por frame, é desenhado sobre a vida do HUD; impacto: a vida não é legível no canvas, embora o dataset E2E continue correto, portanto o HUD não satisfaz a apresentação visível e não sobreposta exigida; owner: implementation; correção: separar visualmente ou desativar o diagnóstico técnico no layout de gameplay, preservando o HUD acima de parallax/entidades e abaixo de overlays, e adicionar uma asserção Chromium que verifique a ausência de sobreposição/oclusão da vida nos viewports requeridos; recheck commands: `npm run check`, `npx playwright test tests/e2e/gameplay.spec.ts --grep "technical HUD" --workers=1`, `npm run test:e2e`, `npm run test:pwa`, `git diff --check`.
- 2026-07-17 — correção de implementação 2/2 concluída e devolvida a `In review`. `F1-08-VISUAL-01` foi resolvido removendo da `GameplayScene` o diagnóstico textual sempre ativo que ocupava `(12,12)` acima de `Life`; o canvas mantém exclusivamente os quatro textos do HUD nessa camada. O E2E Chromium agora afirma `data-hud-overlay-text-count="4"` nos viewports requeridos, cobrindo a ausência de texto concorrente na faixa do HUD. Rechecks frescos: foco `tests/unit/gameplayScene.test.ts` + `tests/unit/hud.test.ts` 6/6, `npm run typecheck`, caso Playwright serial do HUD nos perfis mobile e desktop, `npm run check`, `npm run test:e2e`, `npm run test:pwa` e `git diff --check` passaram. E2E/PWA exigiram execução fora do sandbox somente para o bind do servidor local. Core, corpus/goldens, dependências, workflow, assets e baselines permanecem inalterados.
- 2026-07-18 — revisão independente aprovada, sem findings. `F1-08-VISUAL-01` foi rechecado: a cena cria somente os quatro textos do HUD, sem diagnóstico concorrente, e o Chromium confirma `data-hud-overlay-text-count="4"` nos cinco viewports requeridos. Critérios AC-01–AC-08 foram rastreados a `hudProjection`, `GameplayHud`, `GameplayScene`, testes unitários/integrados e E2E. Checks independentes verdes: `npm run test:unit:coverage`, `npm run test:determinism` (12/12), foco HUD/cena/estruturas, `npm run check`, caso serial Playwright do HUD, `npm run test:e2e`, `npm run test:pwa` e `git diff --check`. A comparação contra `a86fb9a` confirma que `src/simulation`, corpus/goldens, dependências, workflow, assets e baselines não mudaram. F1-08 foi movido para `Done`; F1-09 torna-se o próximo item elegível.
