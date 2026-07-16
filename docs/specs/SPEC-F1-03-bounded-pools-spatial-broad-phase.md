# SPEC-F1-03: pools limitados de entidades e broad phase espacial

Status: Done  
Owner: Codex  
Requisitos: `GAME-02` (parcial), `GAME-03` (fundação), `ASSET-01` (parcial), `PERF-01` (instrumentação), `DET-01` (preservado)  
Dependências: `F1-02` (`Done`); ADR-0001, ADR-0002, ADR-0005, ADR-0010 e ADR-0011 aceitos

## Problema e resultado

F1-02 possui somente uma aeronave e narrow phase. Sem uma representação canônica e limitada para múltiplas entidades, F1-04 não pode disparar nem apresentar inimigos e F1-06 não pode materializar moedas sem arrays transitórios, GC ou colisões quadráticas. F1-03 entrega slots determinísticos e reutilizáveis para projéteis, inimigos e moedas, uma grade espacial que reduz pares candidatos e uma projeção diagnóstica Phaser que comprova a separação entre simulação e visual.

O resultado é uma run v3 que produz os mesmos slots ativos, ordem de candidatos, contatos e hashes para a mesma config/inputs/comandos explícitos em Node e Chromium. O item não transforma esses placeholders em combate, IA ou economia.

## Escopo

- Incluído:
  - estado/hash v3 com pools pré-alocados e limitados para `projectile`, `enemy` e `coin`, IDs derivadas de slot e limpeza canônica de slots inativos;
  - API pura validada para ativar, atualizar por velocidade inteira, desativar e iterar entidades sem criar arrays/objetos no hot path;
  - definitions imutáveis de placeholder para as três classes, cada uma com hitbox composta explícita, pivot e limites inteiros; geometria Phaser é apenas diagnóstica;
  - grade uniforme inteira e scratch buffers reutilizados que emitem pares candidatos deduplicados e ordenados para a narrow phase existente;
  - integração da transição de pools em `stepRun`, comandos de teste explícitos e corpus determinístico v3, preservando literalmente v1/v2;
  - pool de `Graphics`/diagnóstico no `game` que espelha snapshot sem criar/destruir objetos por tick e expõe contagens técnicas estáveis para E2E;
  - testes unitários, propriedades, determinismo, integração, E2E e microprobes de alocação/pares; documentação, rastreabilidade e memória.
- Fora de escopo:
  - arma, cooldown, autofire, dano por projétil, comportamento/HP final de inimigo, score, drop, coleta, magnetismo, estatísticas ou HUD (F1-04/F1-06/F1-08);
  - director, spawn aleatório, RNG novo, dificuldade, corredor, padrões de bala, obstáculos/estruturas, partículas e parallax;
  - novos assets raster/atlas, licença/identidade final, balanceamento final, save/replay persistido, backend, dependência, workflow ou budget físico novo;
  - quadtree, física Phaser, CCD, rotação, polígonos, mudança de regras publicadas ou alteração dos corpus v1/v2.

## Regras e contratos

### Estado, slots e limites

- `RunState.schemaVersion` torna-se `3`, o layout é `wwiirun.run-state.v3` e `hashRunState` serializa pools e cursores em ordem normativa. Vetores v1/v2 permanecem byte a byte; novos vetores v3 são literais obtidos por referência independente.
- Capacidades fixas exportadas: `MAX_PROJECTILES = 256`, `MAX_ENEMIES = 64`, `MAX_COINS = 128`. `createRunState` pré-aloca exatamente esses slots e buffers; nenhum tick usa `push`, `splice`, `Map`, `Set`, generator, `sort` ou cria entidade/shape/array obrigatória.
- O ID é canônico e não reciclável por texto: `projectile:<slot>`, `enemy:<slot>`, `coin:<slot>`, com slot `uint16` dentro da capacidade. A ordem observável é `kind` na ordem acima, depois slot crescente; nunca ordem de inserção ou de propriedade JavaScript.
- Cada slot contém `active`, `definitionId`, `position{x,y}`, `velocity{x,y}` e os campos mínimos explicitamente necessários ao pool. Inativo significa `active=false`, definition vazia e todos os inteiros zero. Desativar restaura integralmente esse sentinela antes de o slot poder ser reutilizado.
- `activate` valida kind, definition, inteiros, hitbox e bounds antes de qualquer mutação; procura circularmente a partir do cursor daquele kind e retorna um resultado explícito `spawned | exhausted`. `exhausted` deixa estado, cursor e hash inalterados. O cursor avança somente após ativação bem-sucedida e entra no hash.
- Cada tick atualiza slots ativos em ordem canônica por sua velocidade inteira e desativa, também canonicamente, objetos que cruzem o envelope de simulação definido. Não há movimento autônomo, input implícito, RNG, dano ou efeito de colisão.

### Definitions, hitboxes e apresentação

- `projectile.placeholder.v1`, `enemy.placeholder.v1` e `coin.placeholder.v1` são singleton puros, congelados e versionados. Cada um declara pivot, velocidade/margem apenas quando necessária ao pool, e ao menos uma AABB ou círculo composto via o contrato F1-02. As shapes não são derivadas de pixels.
- Os valores de placeholder não são balanceamento final e não podem ser sobrescritos por cosméticos. Não há arquivo raster novo: a cena usa `Graphics` técnico e a ficha de assets registra finalidade, direção, pivot, hitbox e substituição futura sem declarar licença fictícia.
- O adapter Phaser recebe snapshot somente de leitura, mantém um `Graphics` por slot e o oculta/reusa quando inativo. Ele não decide ativação, posição de regra, broad phase, contato, hash ou consequente de colisão. Resize, destroy/recreate e diagnóstico preservam o contrato de F1-01/F1-02.

### Broad phase e contatos

- A grade usa células quadradas de `64` pixels lógicos (`16_384` unidades), limites inteiros documentados e máximo de `64` ocupações por entidade. Inserção usa o AABB englobante da hitbox composta; valores fora de cap, bounds ou ocupação falham fechados sem publicar parcial.
- A grade é scratchpad reconstruído in-place no início de cada consulta/tick e não participa do hash. Ela não cria regra: produz somente pares candidatos dos grupos permitidos (`player↔enemy`, `player↔coin`, `projectile↔enemy`) em ordem lexical estável e sem duplicata mesmo quando corpos ocupam várias células.
- O consumidor chama `intersectsCompound` para cada candidato. O primeiro contato não aplica dano, coleta, destruição ou evento neste item; a API expõe somente contato canônico de diagnóstico/teste para os itens posteriores decidirem consequências.
- Métricas reutilizadas expõem entidades ativas, ocupações, pares brutos, pares únicos e comparações primitivas. Elas não entram no hash e não usam relógio; duração é observação informativa, sem threshold de CI.

### Aplicabilidade transversal

- Determinismo: aplicável; somente inteiros, ordem estável, sem APIs proibidas, corpus/hash v3 em Node e Chromium. `spawn` RNG existente não é consumido por este item.
- Performance: aplicável; capacities, buffers, pool visual e microprobes pós-warm-up são obrigatórios. Não repetir a matriz física F0 nem alegar FPS da vertical slice.
- UI responsiva: aplicável apenas à projeção/diagnóstico nos viewports existentes; sem HUD ou controle novo.
- Assets: aplicável; ficha de placeholder sem raster runtime e contract `ASSET-01` separado de hitbox. Catálogo executável não muda sem arquivo runtime.
- Save/migração, i18n, backend, privacidade, segurança e offline: não aplicáveis; sem persistência, texto de produto, rede ou asset novo. Reload descarta run em memória v2/v3.

### Decisão estrutural

ADR-0011 é aceito sob D-007/D-008. Pools fixos, slots/cursor, grade uniforme e layout v3 são escolhas internas e reversíveis enquanto não há ruleset publicada; não decidem economia, arte final, licença, save/placar ou regra publicada.

## Critérios de aceitação

- [x] AC-01 — Given uma run nova v3, when criada, then contém exatamente as capacidades/slots sentinela, cursores zero e hash v3 normativos, sem mudar o corpus v1/v2.
- [x] AC-02 — Given ativações/desativações limites, when executadas, then IDs, cursor circular, ordem por slot e limpeza de cada campo são reproduzíveis; pool cheio retorna `exhausted` sem mutação parcial.
- [x] AC-03 — Given comandos inválidos, coordenadas/velocidades/shape fora de cap ou envelope, when ativados/atualizados, then falham antes de mutar e não deixam slot/grade parcialmente publicado.
- [x] AC-04 — Given movimento inteiro e desativação fora do envelope, when processados por ticks, then somente slots ativos mudam na ordem canônica; input, FPS, viewport, visual e RNG não alteram o resultado.
- [x] AC-05 — Given cada definition placeholder, when inspecionada ou projetada, then tem hitbox composta, pivot e Graphics técnico coerente; trocar o renderer por double não muda snapshot, contatos ou hash.
- [x] AC-06 — Given corpos em células distintas, adjacentes e sobrepostas em múltiplas células, when a broad phase roda, then emite apenas pares permitidos, únicos e lexicalmente ordenados; nenhum contato possível é perdido e nenhum par é repetido.
- [x] AC-07 — Given cada candidato emitido, when o narrow phase atual é aplicado, then AABB/círculo/composto mantém simetria e tangência de F1-02; a broad phase não aplica dano, coleta ou destruição.
- [x] AC-08 — Given mesmas config, inputs e comandos explícitos, when executados repetidamente, em lote/partições e sob chunkings distintos em Node e Chromium, then ticks, slots, cursores, candidatos, contatos e hashes v3 coincidem.
- [x] AC-09 — Given mudança isolada de cada campo canônico de pool/cursor, when hasheada, then muda o hash; métricas, grade scratch, viewport, `Graphics` e overlay não o mudam.
- [x] AC-10 — Given warm-up, when 120 ticks de sessão e stress no limite de todos os pools/grade são executados, then não há identidade/array/shape/Graphics obrigatória nova por tick; métricas confirmam caps, pares e comparações sem threshold temporal.
- [x] AC-11 — Given portrait, landscape, resize e cinco ciclos de cena, when pools diagnósticos são projetados, then contagens de objetos/listeners/callbacks são estáveis, slots inativos ficam invisíveis e não há update após destroy.
- [x] AC-12 — Gates de formato, lint, typecheck, unitários/coverage, determinismo, build, E2E/PWA e budget passam; dependências, workflows, corpus v1/v2, baselines físicos e assets raster permanecem inalterados.
- [x] AC-13 — Spec, ADR, ficha de placeholder, índices, requisitos, roadmap e memória registram a entrega; somente revisão independente move F1-03 para `Done`.

## Plano de teste

- unitário: sentinela, capacities, cursor/exhaustion, erro atômico, reutilização, ordem de slots, movimento/desativação; definitions/hitboxes; célula, bordas, pares permitidos, deduplicação e métricas.
- determinismo: referência independente de serialização v3 e corpus hardcoded com ativações/remoções; execuções repetidas, batches/partições e Chromium; assert literal dos fixtures v1/v2.
- integração/E2E: `GameplaySession` e cena projetam snapshot sem mutar core; diagnostic data attributes contam ativos/pool; viewport/resize, cinco ciclos e destroy tardio; manter E2E/PWA existentes.
- manual/performance/viewports: inspecionar overlay nos viewports F1-01, casos de borda de células e pool cheio; probe instrumentado pós-warm-up no limite; registrar ambiente/tempo apenas informativo, sem repetir matriz física F0.

## Migração e rollback

Não há save, replay ou score publicado. Estado v2 em memória é descartado em reload; nenhuma migração é criada. O rollback isolado restaura F1-02, layout/hash v2 e o marcador único, sem tocar goldens v1/v2, baselines, dependências ou workflows. Após ruleset publicada, uma reversão incompatível requer retenção de v3, nova versão e corpus próprio.

## Evidências de conclusão

- commit/range isolado F1-03 com autor e committer `Codex <codex@openai.com>`;
- resultados frescos de focados, coverage, `npm run check`, determinismo, E2E/PWA e `git diff --check`;
- corpus/referência v3 e prova literal de preservação v1/v2; tabela de activation/exhaustion e pares/células;
- relatório do probe de reuse/caps/pares/comparações e cinco ciclos da cena, com ambiente e sem alegação de FPS;
- diff que demonstra ausência de dependência/workflow/raster/baseline e atualização documental AC-13.

## Histórico de revisão

- 2026-07-16 — revisão independente final: `Approved`, sem findings abertos. `F1-03-BROADPHASE-01` foi fechado: `narrowMetrics` reutilizado remove a alocação por candidato; o caso multicílula real produz `rawPairs > uniquePairs` com candidato/contato únicos e o stress de 120 consultas cobre as capacidades 256/64/128 com 16.576 candidatos, contatos e comparações primitivas, preservando buffers scratch. Focados 8/8, determinismo 8/8, `npm run check`, E2E, PWA e `git diff --check` passaram. Somente esta revisão move F1-03 para `Done`.
- 2026-07-16 — correção adicional autorizada de `F1-03-BROADPHASE-01`: prova de par multicílula agora confirma `rawPairs > uniquePairs` com um único candidato/contato; probe de 120 ticks aquece e exercita 256 projéteis, 64 inimigos e 128 moedas, preservando identidades scratch e métricas. Focados, gate completo e graphify passaram; retorna para `In review`.
- 2026-07-16 — recheck independente após correção adicional: `Changes requested`. `F1-03-BROADPHASE-01` permanece High (implementation/evidence; AC-06/AC-10). O objeto por candidato foi removido corretamente: `narrowMetrics` é scratch reutilizado. Porém a matriz ainda não prova o contrato que declara: o cenário rotulado multicílula deixa player e enemy dentro da célula `2` (logo `rawPairs === uniquePairs === 1` ainda passa), não força um par a compartilhar mais de uma célula, e o stress ativa somente 64 inimigos — não os 256 projéteis, 64 inimigos e 128 moedas nem os limites/contagens exatas de pares e comparações. Corrigir os testes/probe com um par realmente multicílula (`rawPairs > uniquePairs`, candidato único e contato único), borda/adjacência explícitas, e stress dos três pools por 120 ticks que retenha as identidades scratch e valide caps/métricas exatas. Recheck: `npm run test:unit -- --run tests/unit/broadPhase.test.ts tests/unit/entityPools.test.ts`, `npm run test:determinism`, `npm run check`, `npm run test:e2e`, `npm run test:pwa`.
- 2026-07-16 — validações independentes: focados 8/8 e determinismo 8/8 passaram; `npm run check` passou. A repetição E2E não iniciou porque `webServer` não conseguiu bindar; classificado como lacuna de ambiente. A execução PWA não foi repetida depois dessa falha de E2E encadeada; evidência verde anterior permanece histórica, não evidência fresca desta rechecagem.
- 2026-07-16 — correção adicional autorizada de `F1-03-BROADPHASE-01`: `narrowMetrics` passou a integrar o scratchpad e é reinicializada/reutilizada para cada narrow phase; a matriz focada cobre células distintas, borda/adjacência, deduplicação multicílula, capacidade e métricas. Focados, `npm run check`, E2E, PWA, `git diff --check` e atualização graphify passaram. Retorna para `In review`.
- 2026-07-16 — recheck independente da correção 2/2: `Changes requested` terminal para o fluxo automático. `F1-03-VISUAL-01` foi fechado: a cena reutiliza `entityPools`, publica os quatro datasets e E2E os verifica. `F1-03-BROADPHASE-01` permanece High (implementation; AC-06/AC-10): embora a grade agora use buffers pré-alocados/ocupações reais e dedup `seen`, `narrow` ainda cria `{ primitiveComparisons: 0 }` para cada candidato (`src/simulation/broadPhase/index.ts:207`), logo o hot path cria objetos. A prova unitária continua somente o cenário co-localizado e não verifica explicitamente células distintas/adjacentes/multicílula, caps ou métricas do stress. Correção futura deve reutilizar métrica scratch sem objeto por candidato e acrescentar a matriz/probe exigidos. Recheck: `npm run test:unit -- --run tests/unit/broadPhase.test.ts tests/unit/entityPools.test.ts`, `npm run test:determinism`, `npm run check`, `npm run test:e2e`, `npm run test:pwa`.
- 2026-07-16 — validações independentes: focados 6/6, determinismo 8/8, `npm run check`, E2E, PWA e `git diff --check` passaram. Os gates não eliminam o defeito de alocação nem substituem a matriz de AC-06/AC-10.
- 2026-07-15 — recheck independente da correção 1/2: `Changes requested`; nenhum finding foi fechado. `F1-03-BROADPHASE-01` permanece High (implementation; AC-06/AC-10): o código continua a varrer cada projectile×enemy e cada player×slot, calculando `sharedCellCount` para o par, em vez de consultar ocupações da grade scratch; `occupiedCellsX/Y` não participa da emissão de candidatos. Além disso, `sharedCellCount` cria duas tuplas por par e cada candidato cria `{ primitiveComparisons: 0 }`, contrariando o hot path sem arrays/objetos. A única prova focada (3 testes) ainda não cobre células distintas/adjacentes/multicílula, stress/caps ou métricas exatas. Correção: implementar inserção/consulta de grade scratch com deduplicação sem alocação por tick/par e adicionar a matriz/probe exigidos. Recheck: `npm run test:unit -- --run tests/unit/broadPhase.test.ts`, `npm run test:determinism`, `npm run check`.
- 2026-07-15 — recheck independente da correção 1/2: `F1-03-VISUAL-01` permanece Medium (implementation/evidence; AC-11/AC-12). O array transitório foi removido e os quatro datasets foram implementados, mas nenhum teste unitário, E2E ou PWA referencia `poolCapacity`, `activeEntities`, `broadPhaseCandidates` ou `broadPhaseContacts`; portanto não há a evidência E2E exigida para as contagens estáveis. Minha repetição de E2E/PWA ficou bloqueada por `webServer`/`listen EPERM 127.0.0.1:4174` (environment), não convertida em defeito de implementação. Correção: adicionar verificação E2E dos atributos, incluindo estabilidade após resize/ciclos, e executar os gates fora deste bloqueio. Recheck: `npm run test:e2e`, `npm run test:pwa`, `npm run check`.
- 2026-07-15 — recheck independente: focados `tests/unit/broadPhase.test.ts` e `tests/unit/gameplayScene.test.ts` passaram 3/3; `npm run check` e `git diff --check` passaram. E2E e PWA não produziram evidência independente por bloqueio ambiental de bind.
- 2026-07-15 — revisão independente: `Changes requested`. `F1-03-BROADPHASE-01` (High, implementation; AC-06/AC-07/AC-10): `collectContacts` registra células apenas como telemetria e decide candidatos com a sobreposição de AABBs em `sharesCell`; percorre todos os pares projectile×enemy, não constrói a grade nem deduplica pares multicílula. `rawPairs` e `uniquePairs` são sempre incrementados juntos, e `primitiveComparisons` só é atualizado para projectile×enemy que efetivamente colide (e chama o narrow phase duas vezes), omitindo player pairs. A única prova cobre corpos coincidentes, não células distintas/adjacentes/multicílula. Corrigir com inserção/consulta de grade scratch limitada, deduplicação por código de par, ordem lexical e uma única chamada instrumentada ao narrow phase; adicionar matriz de células/bordas/multicílula, pares não contatos e métricas exatas. Recheck: `npm run test:unit -- --run tests/unit/broadPhase.test.ts`, `npm run test:determinism`, `npm run check`.
- 2026-07-15 — revisão independente: `F1-03-VISUAL-01` (Medium, implementation; AC-10/AC-11): `GameplayScene.projectEntityPool` cria o array `pools` a cada `update`, contrariando a ausência de array obrigatório por tick; também não publica contagens técnicas de entidades/pool para E2E, apesar do contrato de diagnóstico. Substituir o array transitório por iteração direta dos três pools e expor contagens estáveis verificadas por E2E, preservando o teardown. Recheck: `npm run test:unit -- --run tests/unit/gameplayScene.test.ts`, `npm run test:e2e`, `npm run test:pwa`, `npm run check`.
- 2026-07-15 — validações independentes: `npm run check`, `npm run test:e2e`, `npm run test:pwa` e `git diff --check` encerraram com código 0. Esses gates não cobrem nem anulam os findings acima.
- 2026-07-15 — implementação: layout/hash v3, pools canônicos limitados, cursores, sentinelas, ativação atômica, movimento, grade scratch, candidatos/contatos diagnósticos, corpus v3 e projeção Phaser pré-alocada foram adicionados. Gates locais e browser passaram; aguarda revisão independente.
- 2026-07-15 — especificação criada e aprovada tecnicamente pelo fluxo `$next-roadmap-item` sob D-007/D-008. F1-02 foi confirmado `Done`; não há matéria humana reservada. ADR-0011 aceito. Nenhum runtime, teste, golden, dependência, workflow, asset ou comando de gate foi alterado/executado nesta etapa.
