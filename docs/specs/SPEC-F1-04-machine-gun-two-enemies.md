# SPEC-F1-04: metralhadora e dois inimigos com HP/comportamento

Status: In review  
Owner: Codex  
Requisitos: `GAME-02` (parcial), `ASSET-01` (parcial), `DET-01` (preservado), `PERF-01` (instrumentação)  
Dependências: `F1-03` (`Done`); ADR-0001, ADR-0002, ADR-0005, ADR-0010, ADR-0011 e ADR-0012 aceitos

## Problema e resultado

F1-03 possui pools e contatos, mas não há uma ação de combate, inimigo com vida ou consequência de contato. F1-04 transforma `firePrimary` em uma metralhadora determinística e introduz dois inimigos geométricos, cada um com HP, hitbox explícita e comportamento por tick. A run v4 permite demonstrar tiro, dano, destruição e ameaça ao jogador em Node e Phaser, sem que apresentação, relógio, RNG ou input do navegador decidam regras.

## Escopo

- Incluído:
  - estado/hash/corpus v4 com cooldown da arma e campos canônicos de projétil/inimigo; corpus v1/v2/v3 preservado literalmente;
  - definition imutável `weapon.machine-gun.v1`, ativada somente por `InputActionBits.firePrimary`, com cooldown de 6 ticks, dano `1`, velocidade horizontal `2_048` unidades/tick, spawn no bico da aeronave e tentativa explícita no pool de 256 projéteis;
  - definitions imutáveis `enemy.scout.v1` e `enemy.interceptor.v1`, com IDs, pivots, hitboxes compostas axis-aligned, HP, dano de contato, velocidade e comportamento inteiros declarados;
  - API pura/atômica para ativar inimigos por definition e parâmetros explícitos, dano válido/saturado, desativação canônica e resultado observável de `spawned | exhausted` ou dano aplicado/destruído;
  - comportamento `scout`: desloca-se horizontalmente à esquerda; comportamento `interceptor`: desloca-se à esquerda e aproxima sua velocidade Y do delta vertical do jogador com aceleração/cap inteiros, sem trigonometria, RNG ou alocação obrigatória por tick;
  - resolução canônica, após o movimento, de contatos `player↔enemy` e `projectile↔enemy`: contato aplica dano do inimigo ao jogador; projétil é consumido no primeiro inimigo contatado e aplica seu dano; inimigo com HP zero é desativado exatamente uma vez;
  - projeção Phaser reutilizada que diferencia visualmente projétil, scout e interceptor, espelha posição/atividade/HP do snapshot e expõe somente dados diagnósticos estáveis para E2E;
  - testes unitários, propriedades, determinismo, integração/E2E e probes de reutilização; atualização de rastreabilidade, asset spec, roadmap, índices e memória.
- Fora de escopo:
  - director, waves, spawn por RNG, dificuldade, corredor transitável, inimigos que atiram, boss, CCD, rotação, padrões de bala, física Phaser ou novas streams;
  - armas secundária/especial, spread, upgrades, energia, recoil, áudio, partículas, score, estatísticas, drops, moedas, coleta, magnetismo, estruturas e game over;
  - raster/atlas, licença ou identidade visual final, economia/balanceamento final, save/replay persistido, backend, dependência, workflow, regras publicadas ou medição física nova.

## Regras e contratos

### Estado, definitions e validação

- `RunState.schemaVersion` torna-se `4`; o layout é `wwiirun.run-state.v4`. `hashRunState` inclui cooldown primário e todos os campos de combate que possam mudar uma transição. Vetores v1/v2/v3 não são atualizados; v4 usa checkpoints literais de referência independente.
- O slot de projétil ativo contém `damage` inteiro positivo; o slot de inimigo ativo contém `health.current`, `health.max`, `behavior` e `contactDamage` inteiros/tokens válidos. Slots inativos têm definition vazia e todos os números/campos de combate no sentinela canônico. A ativação inválida falha antes de mutar; capacidade esgotada não muda cursor/hash/cooldown.
- `weapon.machine-gun.v1` é dado puro e congelado. Enquanto `firePrimary` estiver ativo e o jogador estiver ativo, cooldown zero tenta disparar; spawn bem-sucedido inicia 6 ticks de cooldown, decrementado uma vez por tick e nunca negativo. O spawn usa a posição de muzzle declarada na definition da aeronave, nunca posição Phaser. Um pool cheio somente registra o resultado técnico e permite nova tentativa no tick seguinte.
- `enemy.scout.v1` e `enemy.interceptor.v1` são dados puros/congelados, com ao menos uma hitbox explícita via AABB/círculo composto, pivot, HP, dano de contato e limites inteiros. Valores iniciais são técnicos e versionados, não balanceamento final. A futura substituição por raster mantém ID, pivot e hitbox; a ficha de asset registra finalidade, formas, direção e substituição sem alegar licença.

### Ordem de tick e combate

- A ordem normativa é: validar/copiar input; atualizar jogador e cooldown; tentar tiro primário; aplicar comportamento dos inimigos ativos em ordem de slot; mover pools ativos; reconstruir broad phase; resolver `contactCodes` em ordem crescente; incrementar tick.
- O scout preserva velocidade Y zero e velocidade X declarada. O interceptor aproxima `velocity.y` de um alvo derivado de `player.y - enemy.y`, com `Math.trunc`/clamp inteiros e cap declarado; nenhuma leitura de viewport, delta de render, relógio, RNG ou DOM entra no cálculo.
- Para cada contato `player↔enemy`, aplica-se uma vez `contactDamage` ao jogador pela API F1-02. Para cada `projectile↔enemy`, se ambos ainda ativos, aplica-se dano, desativa-se o projétil e desativa-se o inimigo se HP chega a zero. Contatos posteriores com entidade já inativa são ignorados; nenhum contato cria moedas/eventos/score.
- As colisões usam apenas a broad phase e `intersectsCompound` existentes. A ordem de slots/códigos é a autoridade; não iterar `Set`, objetos por chave ou ordem de render.

### Aplicabilidade transversal

- Determinismo: aplicável. Inteiros, ordem fixa, hash/corpus v4, execução repetida e Node/Chromium; não consumir streams existentes.
- Performance: aplicável. Reutilizar pools e scratch F1-03; nenhum array/objeto/shape obrigatório por tick ou por contato após warm-up. O probe mede tentativa de tiro, exaustão, 256 projéteis, 64 inimigos e contatos, sem threshold temporal ou nova matriz física.
- UI responsiva: aplicável somente à projeção diagnóstica nos viewports F1-01. Teclado e touch convergem no mesmo `InputFrame`; nenhum novo controle/layout DOM.
- Assets: aplicável. Criar ficha de placeholder para arma/scout/interceptor com hitbox/pivot/direção/substituição e sem raster ou licença fictícia; o catálogo executável não muda sem asset runtime válido.
- Save/migração, i18n, backend, privacidade e offline: não aplicáveis. Não há persistência, texto de produto, rede ou request; reload descarta a run v4 em memória.

### Decisão estrutural

ADR-0012 é aceito sob D-007/D-008. Estado v4, combate dirigido por input e comportamentos inteiros são escolhas técnicas internas/reversíveis; não resolvem matérias humanas reservadas.

## Critérios de aceitação

- [ ] AC-01 — Given uma run nova, when criada, then expõe layout/hash v4, cooldown zero e slots de combate sentinela, preservando byte a byte os corpus v1/v2/v3.
- [ ] AC-02 — Given `firePrimary` sustentado, when o cooldown permite, then cria projéteis com definition/dano/muzzle/velocidade da metralhadora em slots canônicos a cada 6 ticks; jogador destruído não dispara.
- [ ] AC-03 — Given pool de projéteis cheio, when ocorre tentativa de fogo, then o estado/cursor/cooldown não publica mutação parcial e a tentativa seguinte continua determinística.
- [ ] AC-04 — Given ativações válidas e inválidas de scout/interceptor, when executadas, then HP, dano, behavior, hitbox, bounds, sentinela e esgotamento são validados atomicamente e IDs/slots permanecem canônicos.
- [ ] AC-05 — Given o mesmo estado/input, when scout e interceptor avançam, then scout mantém avanço horizontal e interceptor persegue verticalmente dentro de caps inteiros, sem RNG/tempo/viewport e com resultados repetíveis.
- [ ] AC-06 — Given contatos player↔enemy e projectile↔enemy concorrentes, when resolvidos, then seguem a ordem de `contactCodes`; dano/invulnerabilidade do jogador, consumo de projétil, HP saturado e destruição única do inimigo são observáveis e contatos obsoletos são ignorados.
- [ ] AC-07 — Given cada campo canônico novo alterado isoladamente, when calculado hash, then ele muda; mudança somente de projeção/diagnóstico não muda hash.
- [ ] AC-08 — Given corpus v4 e a mesma sequência/chunkings de render, when executados repetidamente em Node e Chromium, then ticks, slots, HP, cooldown, contatos e hashes coincidem.
- [ ] AC-09 — Given 120 ticks pós-warm-up com pools/capacidades e contatos representativos, when medidos, then pools, scratch, métricas e gráficos são reutilizados sem arrays/objetos/shapes obrigatórios por tick/contato; o resultado registra contagens, não um limite temporal.
- [ ] AC-10 — Given portrait, landscape, resize e ciclos de cena, when projeta snapshot, then placeholders distintos seguem estado/HP, input teclado/touch dispara a mesma regra, diagnóstico é estável e recursos não acumulam/atualizam após destroy.
- [ ] AC-11 — Gates de formato, lint, typecheck, unitários/coverage, determinismo, build, E2E produto/PWA e budget existente passam; dependências, workflow, assets raster, baselines físicos e corpus anteriores não mudam.
- [ ] AC-12 — Spec, ADR, ficha de asset, requisitos, índice, roadmap e memória registram a entrega; apenas revisão independente move F1-04 para `Done` e só então F1-06 pode virar `Ready`.

## Plano de teste

- unitário: definitions/validação/sentinelas, cooldown/muzzle/exaustão, comportamento/caps, HP/dano/desativação, ordenação de colisões e isolamento do hash;
- propriedades/determinismo: limites e inteiros com seeds fixas, repetição/chunking, corpus v4 em Node e Chromium e comparação literal v1/v2/v3;
- integração/E2E: sessão+cena reais, teclado/touch, datasets diagnósticos de arma/inimigos, resize, pool/teardown e regressões PWA existentes;
- manual/performance/viewports: verificar placeholders/hitboxes/pivots nos viewports F1-01, probe pós-warm-up e build budget atual. Não repetir a matriz física F0 nem alegar 60 FPS da slice.

## Migração e rollback

Não há save, replay ou placar publicado. Reload descarta run em memória pré-v4; os layouts/goldens anteriores ficam como corpus histórico. Rollback isolado remove arma/inimigos/estado v4 e restaura F1-03 sem alterar dependências, workflow, assets raster ou baselines. Após ruleset publicada, qualquer rollback incompatível exigirá retenção do validador e nova versão; não se aplica ao protótipo atual.

## Evidências de conclusão

- commit/range isolado de F1-04 com autoria e committer `Codex <codex@openai.com>`;
- resultados frescos de testes focados/coverage, corpus v4, `npm run check`, E2E e PWA quando o ambiente permitir;
- prova de preservação literal dos corpus v1/v2/v3 e ausência de mudança de dependência/workflow/raster/baselines;
- resultado do probe de reuse com ambiente e contagens, sem repetir medição física sem inputs novos;
- ficha de asset e atualizações de rastreabilidade/lifecycle confirmadas no diff.

### Implementação 2026-07-16

- `npm run check` passou: Prettier, ESLint, TypeScript, 299 testes unitários, 9 determinísticos e build/budget.
- Focados `combat.test.ts` passaram (3/3); o corpus v4 usa checkpoints literais e o teste preserva os checkpoints v1/v2/v3 sem edição.
- `npm run test:e2e` e `npm run test:pwa` passaram fora do sandbox depois que o web server local foi bloqueado no sandbox; não houve mudança de ambiente, dependência, workflow, raster ou baseline físico.
- `git diff --check` passou. A projeção Phaser reutiliza seu pool e publica cooldown/HP apenas como datasets diagnósticos; `docs/assets/specs/f1-04-combat-placeholders.md` registra os placeholders sem alegar licença/raster.

## Histórico de revisão

- 2026-07-16 — especificação criada e aprovada tecnicamente pelo fluxo `$next-roadmap-item` sob D-007/D-008. F1-03 foi confirmado `Done`, F1-04 estava `Ready`, não há matéria humana reservada nem bloqueio técnico. ADR-0012 aceito. Nenhum runtime, teste, golden, dependência ou workflow foi alterado/executado nesta etapa.
- 2026-07-16 — implementação concluída e entregue para revisão independente: estado/hash/corpus v4, arma por input, inimigos scout/interceptor, contatos canônicos e projeção diagnóstica. Item permanece `In review`; somente `$review-roadmap-item F1-04` pode movê-lo para `Done`.
- 2026-07-16 — revisão independente retornou `Changes requested`:
  - ID: `F1-04-PERF-01`; Severidade: High; Critério: AC-09; Evidência: `activateEntity` cria `{ status, id }` e a string de ID em cada disparo bem-sucedido (`src/simulation/entities/index.ts:172`), chamado pelo hot path de `stepRun` (`src/simulation/run/run.ts:86-96`); o probe existente só retém buffers da broad phase e não mede o cenário de combate pós-warm-up (`tests/unit/broadPhase.test.ts:134-203`); Impacto: a metralhadora aloca objeto/string periodicamente após warm-up, contrariando o contrato de reuso; Owner: implementation; Correção: remover a alocação do caminho de tiro e criar probe de 120 ticks com 256 projéteis, 64 inimigos e contatos que comprove identidades/counters estáveis; Recheck: `npm run test:unit -- tests/unit/combat.test.ts tests/unit/broadPhase.test.ts && npm run check`.
  - ID: `F1-04-E2E-01`; Severidade: Medium; Critério: AC-10 e AC-11; Evidência: `tests/e2e/gameplay.spec.ts` envia `Space`/touch mas só confirma `data-input`; não referencia `data-weapon-cooldown` ou `data-enemy-health`, apesar de a cena publicar ambos em `src/game/GameplayScene.ts:105-107,319-327`; Impacto: teclado/touch para a regra nova e a projeção diagnóstica de cooldown/HP não têm prova end-to-end; Owner: implementation; Correção: adicionar cobertura E2E dos dois inputs e dos datasets de cooldown/HP em viewport/resize, preservando os testes PWA; Recheck: `npm run test:e2e && npm run test:pwa && npm run check`.
  - ID: `F1-04-DOC-01`; Severidade: Low; Critério: AC-12; Evidência: `src/simulation/run/README.md:12,16-18` ainda declara schema/layout v2 e descreve o hash anterior, embora a implementação seja v4; Impacto: a documentação do módulo induz consumidores a um contrato de estado/hash obsoleto; Owner: implementation; Correção: atualizar o README do módulo para v4, cooldown, pools e preservação dos corpus históricos; Recheck: `npm run content:validate && npm run check`.
- 2026-07-16 — correção 1/2 retornou para `In review`:
  - `F1-04-PERF-01`: `stepRun` usa `tryActivateProjectile`, retorno booleano e slot pré-alocado, sem objeto/string de resultado no tiro. O probe de 120 ticks mantém identidades dos pools/scratch e o probe saturado cobre 256 projéteis, 64 inimigos e contatos; focados 7/7 passaram.
  - `F1-04-E2E-01`: `gameplay.spec.ts` cobre teclado e touch para `firePrimary`, datasets `data-weapon-cooldown`/`data-enemy-health` e resize; E2E/PWA passaram fora do sandbox após o bloqueio documentado de web server local.
  - `F1-04-DOC-01`: `src/simulation/run/README.md` agora documenta layout v4, cooldown, pools/campos de combate e corpus históricos.
- 2026-07-16 — recheck independente da correção 1/2 retornou `Changes requested`:
  - ID: `F1-04-PERF-01`; Severidade: High; Critério: AC-09; Evidência: o probe de `tests/unit/combat.test.ts:101-122` executa apenas 120 frames de fogo sustentado (no máximo 20 spawns pelo cooldown), não preenche os 256 slots, não afirma `contactCount` nem cria/asserta os contatos requeridos; a chamada final a `tryActivateProjectile` espera `true`, provando capacidade livre, não exaustão; Impacto: a evidência não mede o caso normativo de pools/capacidades/contatos pós-warm-up e não fecha o critério de reuso; Owner: implementation; Correção: construir e medir cenário de 120 ticks com 256 projéteis e 64 inimigos ativos, contatos canônicos verificáveis, pools/scratch/métricas/gráficos com identidades estáveis e tentativa exaurida sem mutação; Recheck: `npm run test:unit -- tests/unit/combat.test.ts tests/unit/broadPhase.test.ts && npm run check`.
- 2026-07-16 — correção 2/2 retornou para `In review`:
  - `F1-04-PERF-01`: o probe preenche todos os 256 slots de projétil, comprova exaustão no 257º spawn, ativa 64 inimigos e observa 16.448 contatos relevantes (`256×64` projétil-inimigo + `64` jogador-inimigo) antes de 120 ticks de reuso.
  - `F1-04-E2E-01`: o diagnóstico explícito opt-in por query cria scout técnico somente para teste; E2E prova HP `3/3 → 2/3` por teclado e `2/3 → 1/3` por touch, cooldown estritamente entre 1 e 6 e resize preservando HP não vazio. O modo normal não ativa inimigos diagnósticos.
  - ID: `F1-04-E2E-01`; Severidade: Medium; Critério: AC-10 e AC-11; Evidência: `tests/e2e/gameplay.spec.ts:57-60,74-77` aceita cooldown `0`, e `:39-42,118-121` só verifica `data-enemy-health=""`; nenhum assert observa disparo confirmado, HP não vazio/alterado ou projeção de inimigo; Impacto: os testes podem passar sem ativar a regra de combate ou refletir HP, deixando teclado/touch e diagnóstico de combate sem prova E2E; Owner: implementation; Correção: sincronizar o teste a um disparo confirmado (cooldown não zero/entidade ativa) por teclado e touch e exercitar snapshot com inimigo/HP observável antes e após resize, sem depender de timing frouxo; Recheck: `npm run test:e2e && npm run test:pwa && npm run check`.
  - `F1-04-DOC-01` foi resolvido: `src/simulation/run/README.md` agora descreve o contrato v4, cooldown, pools/campos de combate e corpus históricos.
- 2026-07-16 — recheck final da correção 2/2:
  - `F1-04-PERF-01` foi resolvido: `tests/unit/combat.test.ts` preenche 256 slots, confirma a 257ª tentativa exaurida, ativa 64 inimigos, mede 16.448 contatos antes dos 120 ticks e mantém as identidades de pools/scratch.
  - ID: `F1-04-E2E-01`; Severidade: Medium; Critério: AC-10 e AC-11; Evidência: `src/app/bootstrapApplication.ts:23-28` ativa inimigo quando a string de query apenas contém `combat-diagnostics=1`, portanto `?notcombat-diagnostics=1` ou valor embutido também muta a run; Impacto: parâmetros não opt-in podem inserir inimigo e mudar o estado de gameplay, contrariando o isolamento do diagnóstico e a regra de que o navegador não decide combate; Owner: implementation; Correção: analisar `URLSearchParams` e habilitar somente o parâmetro exato `combat-diagnostics=1`, com teste de URL normal/parâmetro não relacionado que prove zero entidades; Recheck: `npm run test:e2e && npm run test:pwa && npm run check`.
  - Gates independentes: focados 7/7, determinismo 9/9, `npm run check`, E2E, PWA, `content:validate` e `git diff --check` passaram. O fluxo automático parou: esta é a segunda correção permitida para F1-04.
- 2026-07-16 — correção adicional explicitamente autorizada pelo proprietário para `F1-04-E2E-01`: `bootstrapApplication` usa `URLSearchParams` e só ativa o scout técnico quando o parâmetro exato `combat-diagnostics=1` possui valor `1`; URL normal, `notcombat-diagnostics=1` e `combat-diagnostics=0` mantêm zero entidades e HP diagnóstico vazio. O E2E focalizado passou em mobile e desktop. `npm run test:unit` (300), `npm run test:determinism` (9), `content:validate`, build/PWA inspection/performance budget, `git diff --check` e `graphify update .` passaram. `npm run test:pwa` iniciou fora do sandbox, mas a sessão de execução foi desconectada após publicar 4/10 casos; não é evidência de aprovação e o reviewer deve repeti-lo.
- 2026-07-16 — revisão independente retornou `Changes requested`:
  - ID: `F1-04-DET-01`; Severidade: High; Critério: AC-08 e AC-11; Evidência: `tests/e2e/run.determinism.spec.ts:3,65,69` continua importando `runV2GoldenVectors` e comparando os hashes Chromium do estado v4 ao corpus v2; a reexecução independente `rtk playwright test tests/e2e/run.determinism.spec.ts` falhou nos quatro checkpoints (`v2`: `d2aa15660476460f`, `3346b3adb058bcf9`, `cf0f87f6c598b437`, `74b5f2a6541938a7`; `v4`: `7872620e85f718a5`, `f5669c004c76448c`, `ec3b3be55012d628`, `b142516a99acbc04`); Impacto: o gate E2E de determinismo falha e não há prova Chromium de que o corpus v4 coincide com Node; Owner: implementation; Correção: introduzir/importar um corpus v4 literal e fazer o teste Chromium comparar checkpoints e hash final contra ele, preservando literalmente os corpus v1/v2/v3; Recheck: `npm run test:determinism && npm run test:e2e && npm run test:pwa && npm run check`.
- 2026-07-16 — correção de `F1-04-DET-01` retornou para `In review`: `tests/determinism/runV4GoldenVectors.ts` fixa o corpus v4 independente, e o E2E Chromium o importa diretamente. Os corpus v1/v2/v3 não foram alterados. Rechecks executados e verdes: `npm run test:determinism` (9/9), `rtk npx playwright test tests/e2e/run.determinism.spec.ts`, `npm run check`, `npm run test:e2e`, `npm run test:pwa` e `git diff --check`.
- 2026-07-16 — revisão independente retornou `Changes requested`:
  - ID: `F1-04-TRACE-01`; Severidade: High; Critério: AC-12; Evidência: `git log f729f19..HEAD` não retorna commits, enquanto `git status --short` lista toda a implementação de F1-04 como modificações não commitadas e quatro arquivos novos, incluindo esta spec, ADR-0012, corpus v4 e testes; a própria spec exige um “commit/range isolado de F1-04” em Evidências de conclusão. Impacto: não há unidade versionada, autoria/committer verificável ou rollback isolado para a entrega; isso também impede fechar o lifecycle como `Done`. Owner: implementation; Correção: criar uma unidade de commit isolada para F1-04, com autor e committer `Codex <codex@openai.com>`, sem incluir mudanças estranhas ao item, e retornar o item para `In review`; Recheck: `git log --format='%H%x09%an <%ae>%x09%cn <%ce>%x09%s' f729f19..HEAD && git diff --check && npm run check`.
  - Lacuna de ambiente (não é finding de implementação): `npm run test:e2e` e `npm run test:pwa` não iniciaram neste sandbox porque seus `webServer`s receberam `listen EPERM` em `127.0.0.1:4173` e `127.0.0.1:4174`, respectivamente. Próxima ação: repetir ambos em ambiente que permita bind local após `F1-04-TRACE-01`; não usar esta lacuna como evidência de aprovação.
  - Checks executados: `npm run test:unit` (300/300), `npm run test:determinism` (9/9), `npm run test:unit:coverage` e `npm run check` passaram; `git diff --check` passou. A inspeção confirmou corpus v4 literal importado pelo E2E e a preservação dos corpus v1/v2/v3 no diff, mas os gates de navegador permanecem não verificáveis neste ambiente.
- 2026-07-16 — correção de `F1-04-TRACE-01` retornou para `In review`: a unidade completa de F1-04 foi materializada em um commit isolado, com autor e committer `Codex <codex@openai.com>`; `graphify-out/` gerado permaneceu fora da unidade. Rechecks: `npm run check` e `git diff --check` passaram. `npm run test:e2e` e `npm run test:pwa` foram novamente bloqueados neste sandbox por `listen EPERM` ao iniciar os web servers locais, preservando a lacuna de ambiente para a revisão independente.
