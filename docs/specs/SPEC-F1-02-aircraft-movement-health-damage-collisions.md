# SPEC-F1-02: aeronave, movimento, vida/dano e colisões primitivas/compostas

Status: In review
Owner: Codex
Requisitos: `GAME-01` (parcial), `GAME-02` (parcial), `ASSET-01` (parcial), `DET-01` (preservado), `PERF-01` (baseline)
Dependências: `F1-01` (`Done`); ADR-0001, ADR-0002, ADR-0005 e ADR-0010 aceitos

## Problema e resultado

F1-01 entrega cena, tick e input, mas o marcador visual não é uma entidade: o core guarda apenas o último input e não possui posição, movimento, vida, dano ou colisão. F1-02 deve transformar `aircraft.placeholder.v1` na primeira entidade canônica da run, inteiramente controlada pela simulação pura e renderizada pela cena a partir de snapshot.

Ao final, teclado e touch movem a aeronave com a mesma transição inteira; bounds, HP, dano, invulnerabilidade e destruição são reproduzíveis; a aeronave possui hitbox composta explícita, independente da geometria visual; e o hash v2 detecta qualquer divergência nesses campos. O item fornece narrow phase reutilizável, mas não cria outra entidade de produção nem um loop automático de contatos.

## Escopo

- Incluído:
  - estado v2 da run com uma aeronave do jogador e hash/layout v2;
  - definição pura/versionada do placeholder com stats, pivot, limites e hitbox composta;
  - movimento inteiro por tick a partir de `InputFrame`, incluindo aceleração, velocidade máxima, arrasto e clamp;
  - vida, dano explícito, invulnerabilidade temporária e transição idempotente para destruído;
  - primitivas `aabb`/`circle`, composição e narrow phase puro para todos os pares suportados;
  - apresentação geométrica Phaser lida do estado/definição, overlay de hitbox para diagnóstico e indicador técnico de HP/estado;
  - corpus determinístico v2 em Node e Chromium, mantendo corpus v1 intacto;
  - testes unitários, de propriedade/invariantes, integração e E2E focados.
- Fora de escopo:
  - pools, broad phase, projéteis, inimigos, moedas e IDs/coleções de múltiplas entidades (F1-03/F1-04/F1-06);
  - fonte de dano automática, colisão com borda causando dano, knockback, resistências, escudo, reparo ou game over;
  - armas, cooldowns, spawns, drops, score, distância, dificuldade, HUD final ou áudio;
  - rotação gameplay, cápsulas, polígonos, swept collision/CCD ou física Phaser;
  - asset raster/atlas, arte final, identidade visual, balanceamento final ou escolha de aeronaves;
  - save/replay persistido, backend, leaderboard, deploy, dependência ou workflow novo.

## Regras e contratos

### Fronteiras e tipos canônicos

- `simulation` possui definição, estado, movimento, dano e colisão; não importa Phaser, DOM, relógio, rede, storage, locale ou cosmético.
- `RunState.schemaVersion` torna-se `2`; `createRunState` cria `player`, `stepRun` o atualiza antes de incrementar `tick`, e `hashRunState` usa tag `wwiirun.run-state.v2`. Tipos v1 necessários aos goldens históricos ficam isolados no fixture/compatibilidade de teste; não existe migração de save.
- Estado mínimo canônico: `player.definitionId`, `position{x,y}`, `velocity{x,y}`, `health.current/max`, `invulnerabilityTicks` e `status: "active" | "destroyed"`. Todos os números são inteiros validados e JSON-safe.
- `SIMULATION_UNITS_PER_LOGICAL_PIXEL = 256`. Conversão para render ocorre somente no adapter. Coordenadas, velocidade, HP e timers possuem caps exportados/validados que garantem integração e distância ao quadrado abaixo de `Number.MAX_SAFE_INTEGER`.
- O hash serializa os campos acima em ordem normativa, com inteiros signed/unsigned explicitamente codificados. Alterar estado da aeronave altera hash; viewport, orientação, geometria visual, debug overlay e HP técnico DOM não alteram hash.

### Definição inicial da aeronave

- Existe uma `GameplayAircraftDefinition` imutável com ID `aircraft.placeholder.v1`, `maxHealth: 100`, `damageInvulnerabilityTicks: 30`, aceleração `96` unidades/tick², velocidade máxima por eixo `768` unidades/tick e arrasto `64` unidades/tick².
- Spawn canônico: pivot `(160, 270)` pixels lógicos convertido para unidades. Bounds do pivot: `x=[48,320]`, `y=[32,508]` pixels lógicos. Esses limites são comuns aos viewports F1-01 e mantêm a aeronave no setor esquerdo sem derivar regra da orientação.
- A hitbox final do placeholder é composta, em coordenadas locais inteiras e ordem fixa, por: fuselagem `aabb` com centro `(0,0)` e half-extents `(22,8)` pixels; asa `aabb` com centro `(-4,0)` e half-extents `(8,20)` pixels; nariz `circle` com centro `(22,0)` e raio `6` pixels. Valores são armazenados em unidades de simulação.
- `maxHealth`, movimento, pivot, bounds e hitboxes são gameplay, não podem ser sobrescritos pelo catálogo/pack cosmético. A geometria Phaser pode mudar ou ser substituída por raster preservando pivot/hitboxes.

### Movimento e tick

- Por eixo e por tick, na ordem X depois Y: `accelerationDelta = trunc(inputAxis * acceleration / 127)`; somar à velocidade e limitar a `[-maxSpeed,maxSpeed]`. Se o eixo é zero, aproximar velocidade de zero por `drag`, sem ultrapassá-lo. Integrar posição por velocidade e limitar o pivot ao bound; ao tocar bound, zerar somente a componente de velocidade que aponta para fora.
- O cálculo usa somente inteiros e não usa delta, trigonometria, float de plataforma ou física Phaser. Inputs opostos já chegam neutralizados por F1-01.
- Enquanto `status === "destroyed"`, movimento não altera posição/velocidade, velocidade permanece zero e input/tick ainda seguem o contrato geral até F1-09 definir encerramento.
- No início de cada tick, `invulnerabilityTicks > 0` decrementa exatamente uma vez. Dano não é inferido de input ou render.

### Vida e dano

- `applyDamage(player, amount)` aceita somente inteiro positivo dentro do cap documentado; entrada inválida lança erro antes de mutar.
- Em jogador ativo e sem invulnerabilidade, dano satura `health.current` em zero. Se HP permanece positivo, invulnerabilidade recebe `30`; se chega a zero, status vira `destroyed`, velocidade vira zero e invulnerabilidade vira zero.
- Durante invulnerabilidade ou após destruição, dano válido retorna resultado `ignored` sem mutação. A primeira destruição retorna `destroyed`; dano comum retorna `applied`. Não há HP negativo, ressurreição ou evento duplicado.
- `applyDamage` é a única mutação pública de HP deste item; testes e futuros sistemas chamam essa função, sem escrever campos diretamente.

### Colisão primitiva e composta

- Tipos fechados: `AabbHitbox { kind:"aabb", offsetX, offsetY, halfWidth, halfHeight }` e `CircleHitbox { kind:"circle", offsetX, offsetY, radius }`. Extensões/raio são inteiros estritamente positivos; offsets são inteiros dentro dos caps.
- `intersectsPrimitive(aTransform,aShape,bTransform,bShape)` cobre AABB/AABB, círculo/círculo e círculo/AABB nas duas ordens. Formas são axis-aligned; transforms contêm somente posição inteira.
- Contato tangente conta como interseção. Círculo/AABB usa o ponto mais próximo; comparações usam quadrados inteiros e limites de definição impedem overflow inseguro.
- `intersectsCompound` percorre arrays na ordem declarada e retorna no primeiro par positivo. Lista vazia e forma inválida falham na criação/validação da definição, não durante o tick.
- Colisão não aplica dano nem resposta física neste item. Separar detecção de consequência evita acoplar o narrow phase à aeronave e permite reuso em F1-03.

### Adapter Phaser e diagnóstico

- `GameplayScene` remove a posição derivada diretamente do último input. A geometria da aeronave é criada uma vez e, a cada render, recebe posição do snapshot convertida por `units / 256`; orientação/resize não recriam estado.
- O placeholder desenha fuselagem/asa/nariz coerentes com a definição, mas a hitbox permanece pertencente ao core. Um overlay técnico liga/desliga por constante/config de diagnóstico e desenha as três formas a partir da definição, sem participar de colisão.
- O diagnóstico existente acrescenta HP e estado. Um atributo DOM estável expõe posição/HP/status para E2E; isso é observabilidade técnica provisória, não HUD F1-08 nem live region de alta frequência.
- Destroy/recreate não acumula gráficos, callbacks ou listeners. O hot path reaproveita objetos/arrays de estado e gráficos; não cria definição ou shape por tick.

### Aplicabilidade transversal

- Determinismo: aplicável; estado/layout/hash v2 e goldens novos são obrigatórios, enquanto vetores v1 permanecem imutáveis.
- Performance: aplicável; movimento e narrow phase não alocam após warm-up, definição é singleton congelado e um probe de 10.000 pares compostos registra tempo informativo e confirma o número exato de comparações/resultados. Não há threshold temporal de CI para microbenchmark instável. A matriz física F0 não é repetida porque ainda não há workload de slice completa.
- UI responsiva: aplicável somente à projeção da aeronave/overlay nos perfis F1-01; sem novo controle ou layout DOM.
- Assets: aplicável como contrato `ASSET-01`; placeholder geométrico e hitbox final são separados. Nenhum arquivo raster, licença ou ficha nova.
- i18n: não aplicável; apenas diagnóstico técnico inglês existente.
- Save/migração: não aplicável; nenhum estado é persistido. Alteração do estado em memória começa em nova run.
- Segurança/backend/privacidade: não aplicável; sem rede ou dado pessoal.
- Offline: preservado; nenhum recurso ou request novo.

### Decisão estrutural

ADR-0010 é criado e aceito sob D-007/D-008. A escolha é técnica, interna e reversível; não decide balanceamento final, identidade visual, save/placar publicado nem matéria econômica/legal.

## Critérios de aceitação

- [x] AC-01 — Ao criar uma run v2, a aeronave nasce com definição, spawn, velocidade zero, `100/100` HP, zero invulnerabilidade e estado ativo exatamente como especificado.
- [x] AC-02 — Para sequências limite de eixos, movimento segue a ordem/aceleração/arrasto/caps inteiros e nunca ultrapassa os bounds; contato com bound zera apenas velocidade externa.
- [x] AC-03 — A mesma sequência de inputs sob chunkings de render diferentes produz posições, velocidades, HP, ticks e hashes v2 idênticos em Node e Chromium.
- [x] AC-04 — Enquanto destruída, a aeronave não se move, mantém HP zero/velocidade zero e o tick continua sem transição duplicada.
- [x] AC-05 — Dano inválido falha antes de mutar; dano válido satura HP, ativa 30 ticks de invulnerabilidade quando não letal, ignora hits durante a janela e destrói exatamente uma vez quando letal.
- [x] AC-06 — Decremento de invulnerabilidade ocorre uma vez no início de cada tick e os limites 30→29→…→0 permitem novo dano somente após expirar.
- [x] AC-07 — AABB/AABB, círculo/círculo e círculo/AABB passam casos separados, sobrepostos, contidos e tangentes, simetricamente e sem depender da ordem dos argumentos.
- [x] AC-08 — Uma composição colide se e somente se ao menos um par colide; definições vazias, dimensões não positivas, não inteiros e valores fora dos caps falham fechadas.
- [x] AC-09 — Alterar cada campo canônico do jogador altera o hash v2; mudanças somente de viewport/visual/overlay não o alteram.
- [x] AC-10 — Os goldens v1 F0 permanecem byte a byte; um corpus v2 hardcoded e obtido por referência independente coincide em Node e nos viewports Chromium existentes.
- [x] AC-11 — Em portrait/landscape e após resize, a posição lógica da aeronave corresponde ao snapshot, continua dentro da janela comum e não é reinicializada; input não posiciona o gráfico diretamente.
- [x] AC-12 — Placeholder, overlay e definição demonstram as três formas/pivot; trocar o desenho por um double de teste preserva estado, colisões e hash.
- [x] AC-13 — Após warm-up, 120 ticks de sessão e 10.000 narrow phases não criam arrays/shapes/estado obrigatórios por iteração; o probe registra ambiente/tempo e valida contagem/resultado sem threshold temporal flakey nem promover `PERF-01`.
- [x] AC-14 — Cinco ciclos de cena não acumulam gráficos/listeners/callbacks e não há atualização após destroy.
- [x] AC-15 — Gates de formato, lint, typecheck, unitários/coverage, determinismo, build, E2E produto/PWA e budget passam; baselines físicos, dependências e workflows não mudam.
- [x] AC-16 — Documentação, requisito, ADR, matriz de rastreabilidade, índice, roadmap e memória refletem a entrega; somente revisão independente move F1-02 para `Done`.

## Plano de teste

- unitário:
  - definição/validação, spawn, movimento por eixo, arrasto, bounds, destruição e erros atômicos;
  - dano nos limites e janela completa de invulnerabilidade;
  - tabela de pares primitivos e compostos, simetria, tangência, caps/overflow;
  - hash v2 com mutação isolada de cada campo e isolamento visual;
- determinismo:
  - corpus v2 com inputs hardcoded, checkpoints de posição/velocidade/HP/hash e cálculo independente fora da implementação;
  - Node repetido e Chromium nos viewports existentes; corpus F0 v1 sem atualizar expected;
  - propriedades com seeds fixas: bounds, HP, inteiros, simetria e chunking de render;
- integração/E2E:
  - sessão real move o snapshot; cena projeta snapshot, exibe HP/status, preserva estado em resize e limpa recursos;
  - teclado e touch percorrem o mesmo core; double visual não altera hash; manter E2E/PWA existentes verdes;
- manual/performance/viewports:
  - inspecionar hitbox overlay/pivot nos cinco viewports de F1-01 e nos bounds;
  - gate instrumentado pós-warm-up para reuse, benchmark 10.000 pares e build budget existente;
  - não repetir aparelhos físicos F0 nem alegar 60 FPS representativo.

## Migração e rollback

- Não existe save/replay publicado a migrar. Uma sessão antiga em memória é descartada por reload/rollback; v1 permanece apenas como contrato histórico do corpus F0.
- Rollback isolado remove estado/definição/colisão v2 e restaura marcador dirigido por input de F1-01. Não altera arquivos de baseline F0, dependências ou workflows.
- Se definição/estado falhar na criação, a run falha explicitamente antes de marcar gameplay ativo; não cria estado parcial nem fallback visual com regras divergentes.
- Após publicação futura de ruleset v2, rollback incompatível exigirá retenção do validador e nova versão; não se aplica ao protótipo não publicado atual.

## Evidências de conclusão

- commit/range isolado de F1-02 com autoria/committer `Codex <codex@openai.com>`;
- resultados frescos dos testes focados, coverage e gate completo, incluindo E2E/PWA quando aplicáveis;
- corpus v2 e referência independente, comparação explícita dos blobs v1 e dos baselines físicos;
- tabela de primitivas/compostos e dos cinco viewports; resultado do gate de reuse/benchmark com ambiente;
- diff confirmando ausência de dependência/workflow/asset raster e atualização de todos os documentos de AC-16.

## Histórico de revisão

- 2026-07-05 — especificação criada e aprovada tecnicamente pelo fluxo `$next-roadmap-item` sob D-007/D-008; dependência F1-01 confirmada `Done`, worktree limpo, sem matéria humana reservada. ADR-0010 aceito. Nenhum runtime, teste, golden, dependência ou workflow alterado/executado.
- 2026-07-05 — implementação concluída por TDD e enviada para revisão independente: estado/hash v2, aeronave, movimento/dano, colisões, projeção Phaser, diagnóstico e corpus v2 adicionados; fixture v1, dependências, workflows, assets raster e baselines físicos preservados. Evidência fresca: 288 unitários/coverage, 8 determinísticos, `npm run check`, 10 E2E produto + 1 harness e 10 PWA passaram; o primeiro E2E local falhou somente por bind bloqueado e passou fora do sandbox.
- 2026-07-05 — revisão independente sobre `688b4fb..49c239d`: `Changes requested`. `npm run check` passou com 288 unitários/8 determinísticos/build/budget; coverage passou com aircraft/run em 100% e collision em 97,87% statements/96,55% branches; 73 testes focados e o corpus v2 passaram. E2E/PWA não foram repetidos porque o sandbox bloqueou o servidor local e a execução externa foi rejeitada por limite de uso, lacuna classificada como ambiente. Findings de implementação: `F1-02-UI-01` (overlay sem chave de diagnóstico), `F1-02-LIFECYCLE-01` (AC-14 sem prova da cena), `F1-02-PERF-01` (AC-13 não mede a contagem de comparações/alocações declarada) e `F1-02-DIFF-01` (`git diff --check` falha).
  - `F1-02-UI-01`; severidade `Medium`; critério: Adapter Phaser e AC-12; evidência: `GameplayScene.create()` sempre chama `drawHitboxes()` e não existe constante/configuração que desligue o overlay; impacto: o diagnóstico não é comutável como especificado e fica permanentemente misturado à apresentação; owner: `implementation`; correção: introduzir configuração/constante explícita, testável e sem efeito sobre estado/hash; recheck: `npm run test:unit -- --run tests/unit/gameplayScene.test.ts tests/unit/run.test.ts` e `npm run check`.
  - `F1-02-LIFECYCLE-01`; severidade `Medium`; critério: AC-14; evidência: a única regressão de cinco ciclos está em `tests/unit/gameplaySession.test.ts` e exercita `GameplaySession`, não criação/destruição de `GameplayScene`, gráficos, listeners, callbacks nem update após destroy; impacto: o critério foi marcado como atendido sem demonstrar que a camada Phaser não acumula recursos; owner: `implementation`; correção: adicionar probe/teste da cena que cubra cinco ciclos, contagens estáveis e ausência de update tardio; recheck: executar o novo teste focado, `npm run test:e2e` e `npm run check`.
  - `F1-02-PERF-01`; severidade `Medium`; critério: AC-13; evidência: `tests/unit/collision.test.ts` confirma 10.000 chamadas, 8.000 resultados e igualdade de conteúdo, mas não a contagem exata de pares primitivos nem ausência de arrays/shapes/estado criados por iteração; impacto: o gate não sustenta integralmente a alegação de reuse/contagem do critério; owner: `implementation`; correção: tornar o probe observável e reproduzível para identidades/alocações obrigatórias e contagem exata de comparações, sem threshold temporal; recheck: `npm run test:unit -- --run tests/unit/collision.test.ts tests/unit/gameplaySession.test.ts` e `npm run test:unit:coverage`.
  - `F1-02-DIFF-01`; severidade `Low`; critério: AC-15 e evidência de conclusão; evidência: `git diff --check 688b4fb..49c239d` retorna cinco erros de trailing whitespace em ADR-0010 e na spec; impacto: o gate de integridade do range não passa; owner: `implementation`; correção: remover whitespace terminal sem alterar conteúdo; recheck: `git diff --check 688b4fb..HEAD`.
- 2026-07-05 — correção 1/2 concluída por TDD e retornada a `In review`: `F1-02-UI-01` recebe `DEFAULT_GAMEPLAY_DIAGNOSTICS` desligado e opt-in explícito; `F1-02-LIFECYCLE-01` recebe probe da cena por cinco ciclos com contagem de Graphics/Text/listeners/callbacks e update tardio ignorado; `F1-02-PERF-01` recebe métrica opcional sem alocação e probe com transform/estado/formas reutilizados, 10.000 chamadas, 8.000 contatos e 12.000 pares primitivos; `F1-02-DIFF-01` remove os cinco whitespaces terminais. RED confirmou métrica zero, toggle ausente e recursos não destruídos; GREEN passou 78/78 focados. Coverage passou 290/290; `npm run check` passou com 290 unitários, 8 determinísticos e build/budget; E2E passou 10/10 produto + 1/1 harness e PWA passou 10/10 fora do sandbox, fechando com evidência nova a lacuna ambiental sem convertê-la em mudança de implementação.
