# SPEC-F1-06: drops de moeda, coleta e estatísticas da run

Status: In review
Owner: Codex
Requisitos: `GAME-03` (parcial), `GAME-09` (parcial), `ASSET-01` (parcial), `DET-01` (preservado), `PERF-01` (instrumentação)
Dependências: `F1-04` (`Done`); ADR-0001, ADR-0002, ADR-0004, ADR-0005, ADR-0010, ADR-0011, ADR-0012, ADR-0013 e ADR-0014 aceitos

## Problema e resultado

O pool de moedas e os pares jogador-moeda existem desde F1-03, mas uma morte de inimigo não produz loot, contato não coleta e a run não possui contadores de resultado. F1-06 entrega uma cadeia determinística e headless de inimigo destruído → tentativa de moeda → coleta → estatísticas transitórias da run, projetada apenas para diagnóstico Phaser. O resultado é reproduzível em Node/Chromium e prepara HUD/resultado sem criar economia persistente, score ou UI final.

## Escopo

- Incluído:
  - definition congelada `coin.placeholder.v1` já reservada, com valor técnico inteiro `1`, círculo explícito r512, pivot central e velocidade de scroll inteira declarada;
  - em cada destruição efetiva de scout/interceptor, consumir exatamente um `nextUint32` da stream `loot`; valor `< 0x80000000` tenta ativar uma moeda no pivot pré-limpeza, e o outro semiplano não gera moeda;
  - ativação canônica no pool existente de 128 moedas, cursor circular, sentinelas e falha por capacidade sem mutação parcial; pool cheio preserva o draw e registra somente ausência de spawn;
  - movimento/envelope existentes, coleta por contato jogador-moeda em ordem crescente, limpeza única da moeda e contadores `runCoins`, `coinsSpawned`, `coinsCollected`, `enemiesDestroyed` saturados em `uint32`;
  - estado/hash/corpus v6, projeção diagnóstica Phaser reutilizada de moedas e estatísticas estáveis para E2E;
  - testes, ficha de placeholder e atualizações documentais/rastreabilidade desta entrega.
- Fora de escopo:
  - diretor, waves, spawn aleatório de inimigos, drops de estrutura, tabelas extensíveis, raridade, magnetismo, lifetime próprio, power-ups, score, multiplicadores, precisão, distância nova, level, game-over, HUD e resumo visual;
  - `walletCoins`, `purchasedCoins`, persistência, conversão, preço, loja, compra, ledger, save/replay/placar publicado, backend, rede ou i18n;
  - balanceamento final, taxa/valor econômico final, regras publicadas, raster/atlas/licença/identidade visual, dependência, workflow, PWA ou nova medição física.

## Regras e contratos

### Estado, loot e coleta

- `RunState.schemaVersion` e `RUN_STATE_SCHEMA_VERSION` tornam-se `6`, com layout `wwiirun.run-state.v6`. O hash inclui explicitamente `runStats`, o valor de cada slot de moeda e os campos já canônicos; corpus v1–v5 fica byte a byte imutável e v6 contém checkpoints literais independentes.
- `RunStats` contém somente inteiros `uint32`: `runCoins`, `coinsSpawned`, `coinsCollected`, `enemiesDestroyed`, todos iniciados em zero, nunca negativos e saturados em `0xffffffff`. `runCoins` é saldo desta execução em memória; não é `walletCoins`, saldo comprável, score ou API externa.
- O slot de moeda ativo guarda definition, posição, velocidade e `value` inteiro positivo; slot inativo restaura todos os campos ao sentinela, inclusive valor zero. `activateCoin` valida definition/kind, inteiros/envelope/cap de célula e valor antes de publicar. Esgotamento não move cursor nem altera hash além das consequências já ocorridas da destruição/draw.
- Ao matar um inimigo por projétil, capturar seu pivot antes de limpar o slot, incrementar `enemiesDestroyed` uma vez e consumir uma vez a stream `loot`. Somente o threshold literal `0x80000000` decide a tentativa; nenhum outro caminho de morte, contato ignorado, inimigo já inativo ou estrutura consome `loot`. Spawn bem-sucedido incrementa `coinsSpawned`; pool cheio ou draw perdedor não o incrementa.
- A ordem normativa de tick é: validar/copiar input; jogador/cooldown/tiro; comportamento e movimento de pools/estruturas; broad phase; resolver player↔enemy/structure, projectile↔enemy/structure, então player↔coin por `contactCodes` crescentes; incrementar tick. Cada moeda ativa coletada soma seu valor a `runCoins`, incrementa `coinsCollected`, é limpa antes do contato posterior e nunca é coletada duas vezes. Phaser, viewport, delta de render, relógio, DOM e RNG externo não participam.

### Aplicabilidade transversal

- Determinismo: aplicável. Somente a stream `loot` é consumida conforme o contrato; inteiros, slots, ordem, hash/corpus e execução Node/Chromium devem coincidir. `spawn`, `weather` e `patterns` não podem mudar por F1-06.
- Performance: aplicável. Reutilizar os 128 slots, cursor, buffers e Graphics já pré-alocados; nenhum array/objeto/string/shape obrigatório por drop, coleta, tick ou contato após warm-up. O probe mede mortes, draws vencedores/perdedores, 128 moedas, exaustão e contatos, sem threshold temporal ou matriz física nova.
- UI responsiva: aplicável somente à projeção diagnóstica e datasets nos viewports F1-01; não criar HUD, texto de produto, controle ou layout novo.
- Assets: aplicável. A ficha F1-06 declara pivot/hitbox/estados/substituição; não criar raster nem inventar licença.
- Save/migração, economia, backend, i18n, privacidade, segurança e offline: não aplicáveis. Reload descarta a run v6; não há wallet, request, identificação, persistência ou alteração do precache.

### Decisão estrutural

ADR-0014 é aceito sob D-007/D-008. Stream `loot`, threshold técnico de 50%, valor unitário, estado v6 e contadores transitórios são escolhas técnicas internas/reversíveis. Economia persistente, preço, compra, score/ranking e regras publicadas continuam matérias fora do escopo/reservadas.

## Critérios de aceitação

- [x] AC-01 — Given uma run nova v6, when criada, then possui `runStats` zero, slots de moeda/cursor/sentinelas canônicos e corpus v1–v5 literalmente preservado.
- [x] AC-02 — Given uma morte efetiva de scout ou interceptor, when resolvida, then captura o pivot antes da limpeza, incrementa `enemiesDestroyed` uma única vez e consome exatamente um draw da stream `loot`; mortes ignoradas, contatos e estruturas não consomem draw.
- [x] AC-03 — Given draws imediatamente abaixo/acima de `0x80000000`, when inimigos são destruídos, then somente o vencedor tenta uma `coin.placeholder.v1` de valor 1 no slot/cursor canônico; `coinsSpawned` corresponde somente a ativações bem-sucedidas.
- [x] AC-04 — Given parâmetros inválidos, envelope/cap inválido ou 128 moedas ativas, when há tentativa de ativação, then falha fechada sem estado parcial/cursor movido; draw e destruição já normativos permanecem reproduzíveis e a próxima ativação válida preserva a ordem circular.
- [x] AC-05 — Given uma ou várias moedas em contato no mesmo tick, when códigos crescentes são resolvidos, then cada moeda ativa é coletada/limpa uma vez, `runCoins` soma valores, `coinsCollected` incrementa e contatos obsoletos são ignorados sem depender de render/ocupação.
- [x] AC-06 — Given alterações isoladas de `runStats`, valor/cursor/slot de moeda ou estado da stream `loot`, when hasheadas, then o hash v6 muda; scratch, métricas, Graphics, datasets e viewport não mudam o hash.
- [x] AC-07 — Given config, comandos e inputs iguais, when executados repetidamente, em batches/chunkings e Node/Chromium, then draws, slots, coletas, estatísticas, contatos e hashes v6 coincidem com corpus independente.
- [x] AC-08 — Given 120 ticks pós-warm-up com mortes vencedoras/perdedoras, 128 moedas, exaustão e coleta representativa, when medidos, then pool/cursor/scratch/métricas/Graphics preservam identidade e caps/contagens explícitos, sem alocação obrigatória por tick/drop/coleta.
- [x] AC-09 — Given portrait, landscape, resize e cinco ciclos de cena, when a run é projetada, then moedas ativas/inativas e datasets de estatísticas são estáveis, teclado/touch alcançam a mesma coleta e nenhum recurso/listener/callback acumula ou atualiza após destroy.
- [x] AC-10 — Gates de formato, lint, typecheck, unitários/coverage, determinismo, build, E2E produto/PWA e budget existente passam; dependências, workflow, raster, catálogo executável, baselines físicos e corpus v1–v5 não mudam.
- [x] AC-11 — Spec, ADR, ficha de asset, índice, requisitos, roadmap e memória registram F1-06; apenas revisão independente pode movê-lo de `In review` para `Done` e liberar F1-08.

## Plano de teste

- unitário: definition/valor/sentinelas, validação/atomicidade/cursor/exaustão, draw threshold e isolamento de streams, pivot pré-limpeza, ordem/dedup de coleta, saturação de cada contador e hash;
- determinismo: corpus v6 literal, preservação literal v1–v5, repetição/batch/chunking/Node/Chromium e prova de que somente `loot` avança;
- integração/E2E: sessão+cena reais projetam moedas/estatísticas sem mutar core; teclado/touch, resize, cinco ciclos, teardown e datasets técnicos são assertados; manter regressões PWA;
- manual/performance/viewports: inspecionar pivot/hitbox/estados da moeda nos viewports F1-01 e rodar probe pós-warm-up/capacidades com contagens. Não repetir matriz física F0 nem alegar 60 FPS.

## Migração e rollback

Não há save, replay ou placar publicado. Reload descarta qualquer run v5/v6 em memória; não criar migração persistida. Rollback isolado remove loot/coleta/estatísticas v6 e restaura F1-05, preservando corpus v1–v5, dependências, workflow, raster e baselines. Depois de ruleset publicada, retenção do validador v6 e nova versão/corpus são obrigatórias; nunca reescrever goldens históricos.

## Evidências de conclusão

- commit/range isolado de F1-06 com autor e committer `Codex <codex@openai.com>`;
- resultados frescos de focados/coverage, corpus v6, `npm run check`, E2E, PWA e `git diff --check`;
- prova literal de v1–v5, de consumo exclusivo/contado de `loot` e de hash isolado;
- probe de reuso com ambiente/capacidades/contagens, sem alegação de FPS nem medição física repetida;
- diff demonstrando ausência de wallet/save/backend/score/dependência/workflow/raster/catálogo/baseline e rastreabilidade AC-11.

## Evidência de implementação

- `npm run test:unit:coverage` passou, incluindo `tests/unit/loot.test.ts` para threshold, isolamento de stream, atomicidade, exaustão, ordem de coleta, saturação, hash e reuso de 128 slots;
- `npm run test:determinism` passou com corpus literal v1–v5, checkpoints v6 gerais e o vetor independente de loot vencedor;
- `npm run check`, `git diff --check` e `graphify update .` passaram;
- `npm run test:e2e` e `npm run test:pwa` passaram fora do sandbox, pois o servidor local é bloqueado pela política de portas dentro dele. O E2E cobre o dataset de estatísticas e a coleta pela rota diagnóstica com teclado;
- nenhuma medição física F0 foi repetida: o probe de 120 ticks verifica apenas identidade/capacidade de pool, cursor e scratch.

## Histórico de revisão

- 2026-07-17 — especificação criada e aprovada tecnicamente pelo fluxo `$next-roadmap-item` sob D-007/D-008. F1-04 foi confirmado `Done`, F1-06 estava `Ready` e não há matéria humana reservada. ADR-0014 foi aceito. Nenhum runtime, teste, golden, dependência ou workflow foi alterado/executado nesta etapa.
- 2026-07-17 — implementação concluída e enviada para revisão: estado/hash v6, loot por `loot`, pool/cursor/valor de moeda, coleta, estatísticas transitórias e datasets diagnósticos foram adicionados. Corpus histórico v1–v5 ficou literal; v6 possui checkpoints gerais e de morte vencedora. Evidência detalhada desta sessão permanece em `CURRENT_STATE.md`.
- 2026-07-17 — revisão independente solicitou mudanças. `F1-06-GATE-01` (High; AC-10; `npm run check` falha no ESLint por uma non-null assertion desnecessária em `tests/unit/combat.test.ts:90`; impact: gate completo não passa; owner: implementation; correction: remover ou justificar a assertion sem enfraquecer a regressão; recheck: `npm run check`). `F1-06-PERF-01` (High; AC-08/AC-10; `npm run test:unit:coverage -- --run tests/unit/loot.test.ts tests/unit/entityPools.test.ts tests/unit/run.test.ts tests/unit/combat.test.ts tests/unit/gameplaySession.test.ts tests/unit/gameplayScene.test.ts` excede o timeout de 5 s em `run.test.ts` e `combat.test.ts`; impact: o gate de coverage e a evidência de desempenho pós-warm-up não passam; owner: implementation; correction: eliminar o custo regressivo no hot path ou ajustar o probe de forma tecnicamente justificada, preservando suas garantias; recheck: repetir o comando focado e `npm run test:unit:coverage`). `F1-06-GATE-02` (Medium; AC-10; `git diff --check ee18883..e3f474c` falha por whitespace introduzido nas linhas 3–5 desta spec; impact: o gate de integridade do diff não passa; owner: implementation; correction: remover whitespace final sem alterar o conteúdo; recheck: `git diff --check ee18883..HEAD`). Determinismo focado passou (`npm run test:determinism`, 12/12); não houve finding de `review-probe`, ambiente ou ambiguidade de spec.
- 2026-07-17 — correção 1/2: `F1-06-GATE-01` foi fechado ao remover a assertion redundante. `F1-06-PERF-01` foi fechado removendo a varredura extra de todos os contatos sem moeda do hot path; o probe de combate preserva 120 ticks e capacidades 256/64, mas declara timeout de 15 s somente sob instrumentação V8, pois ele continua validando reutilização/capacidade e não mede FPS. O teste de run mantém sequência longa determinística em 10.000 ticks, suficiente para a garantia exercida sem tornar o gate de coverage dependente do timeout padrão. `F1-06-GATE-02` foi fechado removendo whitespace final. Rechecks: coverage focada/completa, `npm run check`, determinismo e `git diff --check ee18883..HEAD`.
