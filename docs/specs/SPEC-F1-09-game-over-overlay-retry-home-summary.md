# SPEC-F1-09: overlay de game over, retry/home e resumo da run

Status: Done  
Owner: Codex  
Requisitos: `GAME-09` (parcial), `UI-04` (parcial), `GAME-08` (consumido), `DET-01` (preservado), `PERF-01` (instrumentação)  
Dependências: `F1-08` (`Done`); ADR-0001, ADR-0002, ADR-0005, ADR-0006, ADR-0010 e ADR-0014 aceitos

## Problema e resultado

F1 já pode destruir a aeronave e já expõe HUD e estatísticas transitórias, mas a cena continua sem término apresentado nem caminho seguro para reiniciar ou sair. F1-09 entrega um overlay DOM acessível que detecta a transição canônica do jogador para `destroyed`, encerra a sessão de apresentação sem avançar ticks, mostra um resumo estritamente derivado do snapshot final e oferece `Retry` e `Home`. O retry cria uma nova run demo limpa; home encerra a run e mostra uma tela mínima de retorno capaz de iniciar outra preview. Nenhuma regra, hash, seed, score ou dado persistido é criado ou modificado.

## Escopo

- Incluído:
  - coordenação em `src/app/` que observa somente snapshots da sessão e possui os estados de apresentação `gameplay`, `game-over` e `home`; `player.status === "destroyed"` é o único gatilho automático de game over;
  - parada idempotente da sessão após o tick letal, limpeza de input pressionado e liberação do estado `run active` do coordenador PWA; enquanto o overlay estiver aberto, nenhum novo `stepRun` pode ocorrer;
  - overlay DOM modal, acima do canvas/HUD e do conteúdo de instruções, com título, modo, seed canônica completa, distância técnica, moedas ganhas nesta run, inimigos destruídos, duração em ticks/segundos e nível técnico `1`;
  - resumo puro/testável que congela os valores do primeiro snapshot terminal. Distância usa `floor(tick / 60)` m, duração usa `tick` e sua apresentação em segundos deriva de ticks; moedas usam somente `runStats.runCoins`; inimigos usam somente `runStats.enemiesDestroyed`;
  - ações acessíveis `Retry` e `Home`: retry desmonta integralmente a apresentação/sessão terminada e cria uma `GameplaySession` nova com o mesmo `DEMO_CONFIG`; home desmonta gameplay e apresenta a home técnica mínima com ação explícita para iniciar uma nova preview;
  - foco inicial no título/modal ou em `Retry`, trap de foco, `Escape` sem fechar/perder o resumo, botões de no mínimo 44×44 CSS px, contraste e layout responsivo/safe-area nos viewports F1; dados estáveis mínimos para E2E e status DOM acessível de baixa frequência;
  - testes unitários, integração, E2E/viewports, probe de teardown/retry e atualizações de rastreabilidade/memória.
- Fora de escopo:
  - score, multiplicadores, precisão, dano agregado, estruturas destruídas, nível/dificuldade reais, recordes, recompensas persistentes, submissão, leaderboard, Daily/Weekly, replay, compartilhamento, revive/continues ou economia; o resumo não mostra campos sem fonte canônica existente;
  - mudança em `simulation`, `RunState`, `RunConfig`, schema/hash/corpus/goldens, RNG, seed, regras publicadas, balanceamento, conteúdo, hitboxes ou ordem de tick;
  - home final, onboarding, perfil, hangar, navegação completa, i18n final, identidade visual final, assets raster/licença, rede, backend, storage/save, dependência, workflow, PWA/deploy e nova medição física F0.

## Regras e contratos

### Término, resumo e isolamento

- A simulação permanece a autoridade: F1-09 não chama dano nem altera `PlayerState`; depois de `session.update(delta)`, o coordenador lê o snapshot. Se o status ainda é `active`, a apresentação continua. Ao primeiro snapshot `destroyed`, ele o congela, reseta input e pausa/finaliza a sessão de apresentação antes do próximo update. Snapshots destruídos posteriores não recriam overlay, não mudam valores congelados nem disparam listeners extras.
- O tick letal já pertence à run e entra no resumo; o overlay não dá um tick extra. `retry`, `home`, resize, foco, visibilidade, cliques e teclado não podem alterar a run terminal, o hash, corpus ou seed. A sessão encerrada não volta a ser usada.
- `GameOverSummary` é uma projeção pura de `RunState`: `mode = config.mode`, `seed = config.seed` completa, `distanceMeters = floor(tick / 60)`, `durationTicks = tick`, `durationSeconds = floor(tick / 60)`, `runCoins = runStats.runCoins`, `enemiesDestroyed = runStats.enemiesDestroyed`, `level = 1`. Formatação deve declarar unidade, validar inteiros não negativos e falhar fechada para estado impossível; não usa relógio de parede, `Date`, delta, DOM, locale, score ou dado inferido.
- `runCoins` é saldo transitório somente desta execução, não wallet/compra/recompensa. `enemiesDestroyed` não inclui estruturas. O literal `level = 1` não antecipa o diretor F2. O modo e seed são identificação técnica, não contrato de challenge publicado.

### Navegação, acessibilidade e lifecycle

- O overlay é DOM, pois menus/diálogos pertencem à camada `app`/DOM; gameplay, HUD e core não importam DOM. Ele fica acima do canvas, HUD, zonas touch e instruções; ao abrir, os controles gameplay ficam inertes e não recebem ponteiro/teclado.
- `Retry` é a ação primária. Ele remove overlay, listeners, instruções, canvas e sessão anteriores antes de criar novos `KeyboardInput`, `PointerInput`, `CombinedInput`, sessão e jogo; a nova run usa o mesmo config demo/seed enquanto F1 não expõe seletor de modo/seed. Não há tentativa de resetar estado existente nem de reter input, accumulator, overlay ou objetos Phaser.
- `Home` tem significado mínimo e explícito em F1: remove a run e mostra uma tela DOM técnica sem canvas nem sessão ativa, com uma ação para iniciar uma preview nova. Não afirma existir home de produto, perfil ou persistência. Ação principal da home reinicia pela mesma fábrica usada por retry.
- O modal usa semântica de diálogo, nome/descrição acessíveis, foco visível e contido, e não fecha em `Escape`, clique externo, resize, blur ou visibility. `Escape` pode apenas manter foco no modal; não existe ação perigosa/irreversível. Resize/orientação reaplica layout sem remover modal ou foco; safe areas e textos não podem ficar cortados. i18n final não é aplicável, mas strings provisórias ficam agrupadas para futura troca.
- Recursos DOM/listeners/Phaser e lifecycle PWA são criados e destruídos por ciclo. Cinco ciclos gameplay → game over → retry/home não acumulam canvas, diálogos, listeners, callbacks, botões ativos ou `setRunActive(true)` pendente. Enquanto game over/home estiver visível, PWA pode considerar a run inativa.

### Aplicabilidade transversal e decisão

- Determinismo: aplicável por isolamento. O core, hashes e corpus/goldens v1–v6 ficam literalmente inalterados. Para o mesmo snapshot terminal, a projeção pura é igual em Node/Chromium; detalhes de foco/layout não são canônicos.
- Performance: aplicável. O overlay e home não alocam no tick ativo; criação ocorre uma vez na transição terminal. Há probe de ciclos/contagens, sem repetir medição física F0 ou alegar 60 FPS.
- Responsividade/acessibilidade: aplicável nos viewports F1, portrait/landscape, rotação e safe areas simuladas. Assets, save/migração, segurança, privacidade, backend, rede e offline não são aplicáveis: não há asset, persistência, request, identificador novo ou mudança de precache.
- Não há ADR novo. Um coordenador/overlay DOM de apresentação que apenas observa o estado terminal é compatível com ADR-0001/0002 e com a arquitetura existente; é decisão interna, reversível e tecnicamente autoaprovada por D-007/D-008. Economia, score/ranking, regras publicadas, identidade final e navegação de produto permanecem fora do escopo/reservados.

## Critérios de aceitação

- [ ] AC-01 — Dada uma sessão ativa cujo jogador recebe dano letal no tick `T`, quando a cena projeta o snapshot terminal, então abre exatamente um game over com os valores congelados de `T`, reseta input e nenhum tick posterior é executado até retry/home.
- [ ] AC-02 — Dado um estado terminal conhecido, quando `GameOverSummary` é projetado repetidamente em Node e Chromium, então modo, seed completa, distância, duração, moedas, inimigos e nível obedecem literalmente às fórmulas/fontes desta spec; campos ausentes de score/precisão/dano/estrutura não são inventados.
- [ ] AC-03 — Dados snapshots, comandos e chunkings iguais até morte, quando o overlay/retry/home é exercitado, então o hash/corpus v1–v6 e o snapshot terminal permanecem literais; DOM, delta, foco e clique não afetam simulação.
- [ ] AC-04 — Dado game over aberto, quando teclado, touch, clique externo, `Escape`, blur, visibilidade, resize ou rotação ocorrem, então gameplay não recebe input/ticks, modal continua acessível, foco é utilizável e o resumo não muda.
- [ ] AC-05 — Dados `Retry` e a ação de iniciar preview na home, quando acionados, então cada uma cria uma sessão/run nova em estado inicial demo, sem canvas/overlay/listener/input/accumulator herdado; `Home` não mantém sessão nem canvas ativo.
- [ ] AC-06 — Dado portrait estreito, landscape baixo, tablet e desktop com safe areas simuladas, quando game over/home aparecem e há resize/rotação, então título, resumo e botões ficam visíveis, não cobrem controles ativos, respeitam safe area e todos os alvos têm ao menos 44×44 CSS px.
- [ ] AC-07 — Dados cinco ciclos de morte → retry e morte → home, quando recursos são contados pós-warm-up, então não acumulam canvas, diálogo, listeners/callbacks, botões ou estado PWA ativo; o overlay só aloca na transição e não por frame.
- [ ] AC-08 — Formato, lint, typecheck, unitários/coverage aplicável, determinismo, build/inspector/budget, E2E produto, PWA e `git diff --check` passam; não mudam dependências, workflow, `src/simulation`, corpus/goldens, assets licenciáveis ou baselines físicos.
- [ ] AC-09 — Spec, índice, requisitos, roadmap e `CURRENT_STATE.md` rastreiam F1-09; somente revisão independente pode mover o item de `In review` para `Done` e liberar F1-10.

## Plano de teste

- unitário: projeção/formatação/limites de resumo, congelamento/idempotência, transição terminal, pausa/reset de input, retry/home e erro para estado impossível;
- determinismo: timeline letal em Node/Chromium e chunkings, comparação de snapshot/hash/corpus v1–v6 antes/depois, e igualdade da projeção para snapshot terminal;
- integração/E2E: dano letal pela rota diagnóstica controlada, modal/datasets/semântica/foco/teclado/touch, ausência de tick/input após morte, retry, home/iniciar preview, resize/rotação/safe area e canvas único/zero conforme estado;
- manual/performance/viewports: inspecionar contraste, foco, truncamento, ordem visual, targets e safe area em `320×568`, landscape baixo, `768×1024`, `1024×768` e `1920×1080`; rodar probe de cinco ciclos e contagens. Não repetir matriz física F0.

## Migração e rollback

Não há migração: a run F1 existe só em memória e nenhum save, replay, score, placar ou wallet é introduzido. Rollback remove somente coordenador/overlay/home e volta à preview sem término, preservando estado v6, corpus, PWA, dependências e documentação histórica. Se a criação do overlay falhar, limpar recursos parciais e apresentar erro explícito de bootstrap; nunca continuar uma sessão destruída sem input/lifecycle consistente.

## Evidências de conclusão

- implementação não commitada no worktree: coordenador em `src/app/`, pausa terminal idempotente em `GameplaySession`, observação única em `GameplayScene`, overlay/home DOM e cobertura unitária/E2E; nenhum commit, push ou deploy foi autorizado nesta etapa;
- `npm run test:unit:coverage`, `npm run test:determinism`, `npm run check`, `npm run test:e2e`, `npm run test:pwa` e `git diff --check` retornaram sucesso em 2026-07-18;
- testes unitários cobrem projeção/formatação congelada e erro fechado, parada sem tick adicional e observação terminal idempotente; E2E cobre rota diagnóstica letal, modal, Escape, resize, home e nova preview;
- inspeção de diff confirma ausência de alterações em `src/simulation`, corpus/goldens, dependências, workflow, assets e baselines físicos;
- rastreabilidade atualizada sem marcar `GAME-09`, `GAME-08`, `UI-04`, `DET-01` ou `PERF-01` amplos como `Done`; aguarda revisão independente.

## Histórico de revisão

- 2026-07-18 — especificação criada e aprovada tecnicamente pelo fluxo `$next-roadmap-item` sob D-007/D-008. F1-08 foi confirmado `Done`, F1-09 estava `Ready` e não há matéria humana reservada. Nenhum runtime, teste, golden, dependência, asset ou workflow foi alterado/executado nesta etapa.
- 2026-07-18 — revisão independente: `F1-09-TERM-01` (`High`, implementação) encontrado. `GameplaySession.update()` executa todos os ticks disponíveis (até cinco) antes de `GameplayScene.update()` observar o snapshot terminal; assim, se o dano letal ocorrer no primeiro tick de um frame acumulado, `stepRun()` ainda pode avançar a run nos ticks posteriores antes de `finish()`. Isso viola AC-01/AC-03 e o contrato de congelar exatamente no tick letal. `npm run test:unit:coverage`, `npm run test:determinism`, `npm run check`, `npm run test:e2e`, `npm run test:pwa` e `git diff --check 04a434f` passaram, mas não exercem esse chunking terminal. Retornado para `Changes requested`; corrigir na implementação e reexecutar os gates afetados.
- 2026-07-18 — correção de implementação `F1-09-TERM-01`: o loop de `GameplaySession.update()` agora testa o status após cada `stepRun`, chama `finish()` no tick letal e interrompe o frame antes do próximo passo; accumulator, input e lifecycle são encerrados de forma idempotente. A regressão focalizada começa com cinco ticks disponíveis e contato letal no primeiro, prova `tick === 1`, retorno `{ ticks: 1, dropped: false }`, input/lifecycle encerrados e update subsequente zerado. `npm run test:unit:coverage`, `npm run test:determinism`, `npm run check`, `npm run test:e2e`, `npm run test:pwa` e `git diff --check 04a434f` passaram; retornado para `In review`.
- 2026-07-18 — rechecagem independente aprovada: `F1-09-TERM-01` foi resolvido. A revisão confirmou que o loop interrompe no primeiro `stepRun` terminal, limpa accumulator/input/lifecycle e não permite tick posterior; a regressão de frame com cinco ticks disponíveis prova o tick terminal `1` e update seguinte nulo. `npm run test:unit:coverage`, `npm run test:determinism` (12/12), `npm run check`, `npm run test:e2e`, `npm run test:pwa` e `git diff --check 04a434f` passaram de forma independente. Não há finding pendente; core, corpus/goldens, dependências, workflow, assets, baselines físicos e a alteração preexistente de `.gitignore` foram preservados. F1-09 movido para `Done`.
