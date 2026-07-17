# SPEC-F1-07: parallax de camadas e placeholders substituíveis

Status: Done
Owner: Codex  
Requisitos: `GAME-05` (parcial), `ASSET-01` (preservado), `DET-01` (preservado), `PERF-01` (instrumentação)  
Dependências: `F1-01` (`Done`); ADR-0001, ADR-0002, ADR-0003, ADR-0005, ADR-0006, ADR-0008 e ADR-0009 aceitos

## Problema e resultado

A `GameplayScene` tem fundo sólido e formas diagnósticas, por isso a vertical slice ainda não comunica deslocamento no mundo. F1-07 entrega uma apresentação Phaser de pelo menos três planos de fundo repetíveis, com velocidades visuais distintas e placeholders geométricos declarados por dados locais do renderer. O resultado é parallax legível em portrait e landscape, reutiliza objetos já criados e permite substituir cada forma por textura/atlas futuro sem tocar em simulação, hitbox, seed, hash ou regras.

## Escopo

- Incluído:
  - módulo `game` puro de apresentação para definir e validar um conjunto congelado de, no mínimo, três layers de placeholder, cada um com ID estável, profundidade, cor/forma técnica, fator visual de scroll, repetição horizontal, overscan e ordem de desenho;
  - criação prévia, reprojeção e destruição idempotente de uma faixa repetível por layer na `GameplayScene`, atrás de aeronave, entidades, hitbox, zonas e diagnóstico;
  - deslocamento exclusivamente visual a partir do tick já presente no snapshot e de constantes inteiras/estáveis da layer; `tilePositionX` (ou equivalente) é calculado/reaplicado sem usar relógio, delta de render, RNG ou DOM;
  - reconfiguração atômica de tamanho/posição/cobertura quando viewport, orientação ou safe area mudarem, mantendo o mundo lógico e input existentes;
  - contrato explícito de substituição: uma futura `VisualDefinition`/atlas poderá fornecer a textura/frame por `visualId`; a definição de gameplay, hitboxes e projeção das entidades continuam independentes;
  - datasets diagnósticos mínimos e testes de unidade, integração Phaser, E2E/viewports e reuso pós-warm-up; atualização de rastreabilidade, roadmap, índice e memória.
- Fora de escopo:
  - raster, atlas, PNG/WebP, licença, ficha individual de asset, identidade visual final, período do dia, clima, blend artístico, partículas, foreground destrutível ou áudio;
  - qualquer alteração em `simulation`, `RunState`, `RunConfig`, schema/hash/corpus/golden, seed/RNG, hitboxes, física, spawn, scroll de gameplay, dificuldade ou regras publicadas;
  - HUD, game over, distância/score, save/replay, backend, rede, i18n, dependência nova, workflow, deploy ou medição física F0;
  - demonstrar pack cosmético carregável (F6), acessibilidade visual final ou todas as camadas sugeridas pelo catálogo.

## Regras e contratos

### Camadas, ordem e substituição

- O módulo de parallax pertence a `src/game/`; `simulation` não o importa nem recebe sua configuração. Suas definições são imutáveis e somente descrevem apresentação.
- `PARALLAX_LAYERS` contém exatamente quatro layers nesta entrega, ordenadas por `depth` crescente: `background.sky.v1` (fator `0`), `background.clouds.far.v1` (`5`), `background.terrain.distant.v1` (`15`) e `background.terrain.mid.v1` (`35`). Os fatores são unidades visuais inteiras por 100 ticks, não velocidade de gameplay nem balanço. A ordem fica atrás do gameplay; o céu fixo cobre a janela inteira e as três layers móveis usam repetição horizontal.
- Cada layer possui `visualId`, `placeholder` e `assetSlot` estáveis. `placeholder` contém somente parâmetros de `Graphics`/textura técnica; `assetSlot` reserva a chave que um renderer futuro resolverá em atlas/frame. Nenhum caminho de arquivo, pixel, dimensão de textura, licença ou dado de gameplay entra no contrato.
- A implementação pode gerar uma textura técnica em memória uma vez por layer/cena e usá-la em `TileSprite`, ou reutilizar `Graphics` equivalentes, desde que uma faixa cubra a janela lógica mais `overscan` e seja repetível sem seam observável. Não pode criar/destruir objetos, texturas ou arrays por tick.
- A substituição futura conserva `visualId`, pivot de apresentação e área coberta; não lê/infere hitbox do bitmap. Mudança de asset é cosmética e deve manter idênticos os snapshots/hashes para mesma config e inputs.

### Movimento, viewport e lifecycle

- Para tick `t`, a posição horizontal de cada layer móvel deriva apenas de `t` e do fator da layer, com aritmética determinística e módulo pelo período visual da própria faixa. A layer fixa permanece em zero. `delta`, FPS, pausa, visibilidade, timezone, locale, `Math.random()`, `Date.now()` e timers não participam.
- O renderer atualiza a posição visual após obter o snapshot. Múltiplos renders do mesmo tick são idempotentes; chunkings de render diferentes que chegam ao mesmo tick exibem a mesma posição de layer.
- Em `applyLayout`, resize ou rotação, cada faixa recebe a nova janela lógica/cobertura e preserva a posição derivada do tick atual. O parallax não altera `ViewportLayout`, câmera, zonas touch, sessão ou lifecycle PWA definidos em F1-01.
- `create` instancia cada recurso uma vez; `shutdown`/`destroy` libera todos, inclusive texturas técnicas criadas pela cena quando não compartilhadas. Cinco ciclos não deixam canvas, listeners, callback, GameObject ou textura residual. Falha de configuração inválida falha fechada antes de publicar uma camada parcial.

### Aplicabilidade transversal

- Determinismo: aplicável por isolamento. A apresentação usa tick já produzido, mas não escreve no core; goldens/corpus existentes permanecem byte a byte inalterados.
- Performance: aplicável. Máximo de quatro layers, objetos pré-alocados, nenhum allocation obrigatório no update e nenhuma leitura DOM no hot path. O probe mede identidade/contagem/reuso, não FPS nem matriz física.
- Responsividade: aplicável nos perfis F1-01; layers cobrem somente a janela lógica e permanecem atrás de controles/diagnóstico, sem invadir safe areas por CSS.
- Assets/licença/i18n/save/segurança/privacidade/backend: não aplicáveis nesta etapa, pois só há geometria/técnica em memória e nenhum arquivo, texto de produto, persistência ou rede novo.
- Offline: preservado. Nenhuma request nem asset externo é introduzido; o shell PWA existente continua suficiente.

### Decisão estrutural

Não há ADR novo. A escolha de quatro layers técnicas, fatores inteiros e `visualId`/`assetSlot` locais é interna, reversível e já compatível com ADR-0001, ADR-0002, ADR-0003 e ADR-0008. Direção de arte final, raster e licenças continuam matérias reservadas e fora de escopo.

## Critérios de aceitação

- [ ] AC-01 — Dada `GameplayScene` criada, quando o renderer inicializa, então existem exatamente quatro layers ordenadas atrás do gameplay, com ao menos três fatores de velocidade distintos e os IDs/slots técnicos estáveis definidos na spec.
- [ ] AC-02 — Dado um tick `t`, quando a projeção é atualizada repetidamente ou após chunkings de render distintos que atingem `t`, então cada layer móvel tem a mesma posição repetível, a layer fixa fica parada e nenhum delta/FPS/relógio/RNG/DOM muda o resultado.
- [ ] AC-03 — Dado resize, rotação portrait↔landscape ou safe areas, quando o layout é reaplicado, então as quatro faixas cobrem a janela lógica mais overscan, preservam ordem e posição derivada do tick, e não mudam sessão, input, câmera, mundo ou controles.
- [ ] AC-04 — Dada uma troca futura simulada de `assetSlot` por `visualId`, quando o placeholder é resolvido por uma implementação fake, então somente a apresentação muda; definition/hitbox de gameplay, estado, hash e corpus continuam idênticos.
- [ ] AC-05 — Dados cinco ciclos de criação/update/shutdown, quando cada um termina, então não restam recursos de parallax nem listeners/canvas adicionais; o update pós-destroy é inerte e o hot path não cria GameObject/textura/array obrigatório.
- [ ] AC-06 — Dados os viewports `320×568`, landscape baixo, `768×1024`, `1024×768` e `1920×1080`, com safe-area simulada, quando a cena roda e gira, então as layers permanecem legíveis/cobertas atrás de aeronave, entidades, zonas e diagnóstico, sem overflow nem captura de input.
- [ ] AC-07 — Formato, lint, typecheck, unitários/coverage aplicável, determinismo, build/inspector/budget, E2E produto, PWA e `git diff --check` passam; não mudam dependências, workflow, `src/simulation`, corpus/goldens, baselines físicos nem assets licenciáveis.
- [ ] AC-08 — Spec, requisitos, roadmap, índice de specs e `CURRENT_STATE.md` rastreiam F1-07; somente revisão independente move `In review` para `Done` e libera F1-08.

## Plano de teste

- unitário: validar IDs únicos, ordem, fatores, repetição/overscan e rejeição de definição inválida; função pura de offset para tick zero, limites, módulo e idempotência; adapter fake para resolução placeholder/assetSlot e contadores/identidade pós-warm-up.
- determinismo: repetir run/timeline sob chunkings distintos e confirmar que estado/hash/corpus atuais não mudam enquanto offsets no mesmo tick coincidem; não atualizar snapshot/golden.
- integração/E2E: `GameplayScene` cria/quebra quatro layers, z-order e teardown; Playwright inspeciona datasets técnicos, canvas único, rotação/resize e ausência de interferência em teclado/touch nos viewports requeridos; manter PWA offline e update-during-run existentes.
- manual/performance/viewports: inspecionar cobertura, seam, depth e contraste técnico nos cinco viewports com safe area; executar probe de quatro layers e cinco ciclos. Não repetir matriz física F0 nem alegar 60 FPS sem inputs novos.

## Migração e rollback

Não há migração de save, content manifest, ruleset, replay, score ou asset. Rollback remove somente o renderer/configuração de parallax e restaura o fundo sólido da cena, preservando F1-01–F1-06, hashes, corpus, PWA, dependências e documentação histórica. Se uma layer falhar na criação, a cena deve liberar o conjunto parcial e falhar explicitamente, nunca iniciar com parallax parcialmente publicado.

## Evidências de conclusão

- range/commit isolado de F1-07 com autor e committer `Codex <codex@openai.com>`;
- testes focados, coverage aplicável, determinismo, `npm run check`, E2E, PWA e `git diff --check` frescos;
- tabela/probe de IDs, factors, profundidade, cobertura, offsets e identidade de recursos; comparação literal dos goldens/corpus antes/depois;
- inspeção dos viewports e prova de teardown; diff demonstrando ausência de `simulation`, assets, dependências, workflow, baselines e rede;
- atualização de documentação/rastreabilidade sem marcar `GAME-05` amplo como `Done` antes da vertical slice e revisão independente.

## Histórico de revisão

- 2026-07-17 — especificação criada e aprovada tecnicamente pelo fluxo `$next-roadmap-item` sob D-007/D-008. F1-07 estava `Ready`, F1-01 foi confirmado `Done`, e não há decisão humana reservada. Nenhum runtime, teste, golden, dependência, asset ou workflow foi alterado/executado nesta etapa.
- 2026-07-17 — implementação enviada para revisão: `src/game/parallax.ts` fixa quatro definições e o cálculo puro de offset; `GameplayScene` pré-aloca/reprojeta/destroi quatro `TileSprite`s e expõe datasets técnicos somente para diagnóstico/E2E. Foram adicionados testes unitários de contrato/offset/resolução, lifecycle de cinco ciclos e E2E dos cinco viewports. Evidências frescas: foco 7/7; `npm run typecheck`; `npm run lint`; coverage completa; `npm run test:determinism` 12/12; `npm run test:e2e`; `npm run test:pwa`; `npm run check`; `git diff --check`; e `graphify update .`, todos com exit 0. Nenhum arquivo de `src/simulation`, corpus/golden, asset, dependência, workflow ou baseline físico foi alterado. Próximo passo: `$review-roadmap-item F1-07`.
- 2026-07-17 — revisão independente: `F1-07-VISUAL-01` (High, implementation) permanece aberto. As três layers móveis recebem `__WHITE`, uma textura uniforme de 1×1, e apenas tint/alpha; `placeholder.shape` nunca é materializado. Assim, offsets diferentes em `tilePositionX` não produzem parallax perceptível, contrariando AC-01/AC-02 e o resultado visual declarado. Rechecks independentes passaram: foco 7/7, typecheck, lint, determinismo 12/12, `npm run check`, E2E, PWA e `git diff --check`. Corrigir criando/reutilizando uma textura técnica repetível com padrão distinguível por layer (ou equivalente), exercitar a diferença visual/offset por integração e retornar com os gates afetados. Item movido para `Changes requested`.
- 2026-07-17 — correção de `F1-07-VISUAL-01` enviada para recheck: `technicalPlaceholderInstructions` materializa, por `Graphics.generateTexture`, céu sólido, nuvens e dois relevos repetíveis; as chaves técnicas estáveis e os períodos próprios (`256`, `256`, `384`, `256`) são aplicados aos `TileSprite`s e removidos no teardown. A integração fake confirma quatro texturas distintas, offsets `[0,5,15,35]` no tick 100 e nenhuma criação após warm-up; os unitários também verificam as instruções geométricas por shape. Rechecks frescos com exit 0: foco 8/8, `npm run check`, `npm run test:e2e`, `npm run test:pwa`, `git diff --check` e `graphify update .`. Nenhum core, corpus/golden, asset externo/licenciável, dependência, workflow ou baseline mudou. Item retorna para `In review`; próximo passo: `$review-roadmap-item F1-07`.
- 2026-07-17 — recheck independente aprovado: `F1-07-VISUAL-01` foi resolvido. As instruções técnicas agora geram texturas repetíveis distintas para céu, nuvens e relevos, e os `TileSprite`s usam períodos próprios com offsets visivelmente significativos. A inspeção de código confirmou criação somente no ciclo de vida, reuso no update e remoção de texturas próprias no teardown. Gates independentes: foco 8/8, `npm run check`, determinismo 12/12, E2E, PWA e `git diff --check` com exit 0; E2E/PWA precisaram de execução fora do sandbox porque a porta local `127.0.0.1:4173` recebe `EPERM` nele. Não houve alterações em `src/simulation`, corpus/goldens, dependências, workflows, baselines ou assets licenciáveis. F1-07 movido para `Done` por revisão independente.
