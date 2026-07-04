# SPEC-F1-01: gameplay scene, viewport lógico e input teclado/touch

Status: In review
Owner: Codex  
Requisitos: `GAME-01` (parcial), `UI-04` (parcial), `DET-01` (preservado), `PERF-01` (baseline)  
Dependências: fase F0 (`Done`); ADR-0001, ADR-0002, ADR-0005, ADR-0006 e ADR-0009 aceitos

## Problema e resultado

O scaffold atual termina em uma cena diagnóstica com input desabilitado e canvas dimensionado diretamente em pixels CSS. F1-01 deve entregar a primeira cena de gameplay geométrica, uma projeção lógica previsível em portrait/landscape e adaptadores de teclado e touch que produzam o mesmo `InputFrame` quantizado para o core.

Ao final, uma sessão local entra em `GameplayScene`, avança o `RunState` somente em ticks fixos de 60 Hz enquanto ativa, mostra um marcador geométrico que responde ao último snapshot de input e permanece utilizável nos viewports mínimos. A cena não adiciona aeronave, física, colisão, combate ou regra de movimento: esses comportamentos começam em F1-02.

## Escopo

- Incluído:
  - substituir a transição diagnóstica por `BootstrapScene → GameplayScene`, mantendo boot e gameplay como cenas separadas;
  - criar um controlador de sessão que instancia o `RunState`, consome `InputFrame` em tick fixo e sinaliza o lifecycle ativo ao coordenador PWA;
  - criar contrato puro de viewport e adaptador Phaser que aplica safe area, orientação, `FIT`/letterbox e reprojeção em resize;
  - criar uma única fonte combinada de input a partir de teclado e touch, quantizada antes de entrar em `simulation`;
  - oferecer movimento por teclado e área touch relativa, além das três ações já versionadas em `InputActionBits`;
  - pausar avanço de ticks durante perda de visibilidade/foco e durante mudança de orientação, preservando estado e input neutro na retomada;
  - marcador/placeholders geométricos e diagnóstico mínimo para tornar cena, viewport, tick e input observáveis em testes;
  - instruções essenciais em DOM acessível para controles e estado pausado, sem implementar HUD de gameplay;
  - testes unitários, de integração e E2E focados no contrato deste item.
- Fora de escopo:
  - aeronave, movimento canônico, vida, dano, colisões e hitboxes (F1-02);
  - pools, projéteis, inimigos, moedas, parallax, HUD, game over e run de 3–5 minutos (F1-03–F1-10);
  - gamepad, remapeamento, layout touch configurável, autofire, vibração e acessibilidade completa de gameplay;
  - menus, pause overlay final, áudio, assets raster, atlas, i18n e escolha do décimo locale;
  - replay persistido, save, backend, leaderboard ou mudança de ruleset/golden;
  - nova dependência, deploy, publicação ou alteração de workflow.

## Regras e contratos

### Fronteiras e ownership

- `simulation` continua sem Phaser, DOM, relógio, rede, storage ou locale. `InputFrame` e `stepRun` existentes são reutilizados sem alargar seus limites.
- `game` possui `GameplayScene`, apresentação geométrica, adaptadores Phaser e a conversão de controles reais em amostras quantizadas.
- `platform/viewport` possui cálculo puro de layout a partir da área CSS segura; o adapter Phaser apenas aplica o resultado.
- `app` cria/encerra a sessão e liga `run active` ao port já exposto pelo coordenador PWA. O bootstrap recebe esse port por injeção; não importa o módulo PWA concreto.
- Listeners e referências de teclado/pointer/visibility/resize são registrados uma vez por sessão e removidos idempotentemente em shutdown/destroy/HMR.

### Sessão e tick

- `GameplaySession` expõe, no mínimo, `start()`, `update(renderDeltaMs)`, `pause(reason)`, `resume(reason)`, `snapshot()` e `destroy()`; chamadas inválidas após `destroy()` falham de forma explícita ou são no-op documentado e testado, sem listener residual.
- A sessão inicia com config local canônica e versionada já aceita por `createRunState`; valores de demonstração ficam fora da cena e não representam balanceamento publicado.
- Um acumulador converte delta de render em passos inteiros de `1000 / 60` ms. Cada passo amostra exatamente um `InputFrame` e chama `stepRun` uma vez. Chunkings de render equivalentes geram a mesma sequência de frames/ticks.
- Delta negativo, `NaN` ou infinito é rejeitado. Para evitar espiral após suspensão, uma atualização consome no máximo 5 ticks; excesso de tempo é descartado e diagnosticado, nunca convertido em avanço tardio da simulação.
- Pausa zera acumulador e input transitório, não chama `stepRun` e não altera o hash. Retomada começa com frame neutro até novo estado físico/pointer ser amostrado.
- `setRunActive(true)` ocorre somente enquanto uma sessão de gameplay está iniciada e não destruída; pausa por foco/orientação ainda conta como run ativa para impedir atualização do service worker no meio da run. `false` ocorre no encerramento/destroy, inclusive HMR.

### Input canônico

- Todo produtor converge para `InputFrame { moveX, moveY, actions }`; apenas inteiros em `[-127, 127]` e bits existentes `0x0001`, `0x0002`, `0x0004` podem chegar ao core.
- Teclado: setas ou `WASD` controlam eixos; `Space` = primária, `ShiftLeft`/`ShiftRight` = secundária e `E` = especial. Direções opostas se anulam. Cada eixo ativo vale `-127` ou `127`; diagonal não usa float nem normalização trigonométrica.
- Teclas só são prevenidas quando a cena possui foco e a tecla é parte desse mapa. `repeat` não cria pulsos: ações representam estado pressionado no tick.
- Touch/pointer de movimento começa somente na zona esquerda, limitada a 60% da largura da janela de mundo. O ponto inicial vira a origem do gesto relativo; deslocamento é dividido por um raio de `min(96 CSS px, 25% do menor lado seguro)`, limitado por eixo a `[-1, 1]` e quantizado por `round(valor * 127)`. Magnitudes abaixo de 12% do raio viram zero por eixo.
- Três botões na zona direita mapeiam diretamente aos bits de ação. Cada alvo mede no mínimo `44×44 CSS px`, respeita safe areas e suporta pressionar ação simultaneamente ao gesto de movimento por ponteiros distintos.
- Somente o ponteiro que adquiriu uma zona pode atualizá-la; `pointerup`, `pointercancel`, perda de foco, pausa, resize e destroy liberam a captura e neutralizam o respectivo estado. Ponteiros fora das zonas são ignorados.
- Combinação teclado+touch é determinística: eixos usam o valor de maior magnitude por eixo, com teclado vencendo empate; ações usam OR bit a bit. O resultado é copiado na amostragem para impedir mutação retroativa.

### Viewport lógico e responsividade

- O cálculo puro recebe largura/altura CSS finitas e positivas e quatro safe-area insets não negativos. Entrada inválida retorna erro tipado/fail-closed; não produz dimensões parciais.
- Área segura é o retângulo após insets. Orientação é `landscape` quando largura segura ≥ altura segura, senão `portrait`; quadrado permanece landscape para evitar oscilação.
- Perfil landscape usa canvas lógico `960×540` e janela de mundo `960×540`. Perfil portrait usa canvas lógico `540×960` e janela de mundo `540×540` centralizada verticalmente; as faixas restantes são reservadas a controles/HUD futuros. Coordenadas de regras/spawn nunca derivam de pixels CSS.
- O canvas inteiro usa `FIT` e centralização, sem expandir o mundo para preencher ultrawide. Letterbox pertence à apresentação. DPR altera apenas resolução de render dentro do tier/cap existente, nunca coordenadas lógicas ou input.
- Resize/orientação inicia pausa `viewport-change`, aplica um layout coerente de forma atômica no próximo frame, atualiza câmera e zonas e retoma apenas se a sessão estava ativa antes. O mesmo `RunState`, tick e config são preservados; input retoma neutro.
- Safe areas são aplicadas no host DOM com `env(safe-area-inset-*)` e também entram no cálculo testável por valores explícitos. Controles, janela de mundo e texto acessível não podem ocupar os insets.
- A cena expõe apenas um canvas e não realiza leitura de layout DOM dentro do loop de tick/render; medições ocorrem em criação e eventos de resize.

### Apresentação e acessibilidade mínima

- O placeholder é geometria Phaser sem asset novo, não possui hitbox/regra e representa visualmente `moveX`, `moveY` e ações sem alterar `RunState` além do input/tick existente.
- Um nó DOM semanticamente nomeado informa controles disponíveis, orientação e estado ativo/pausado; atualizações de alta frequência não usam live region. Botões touch têm nomes acessíveis e estado pressionado observável.
- Não há strings localizadas neste item: texto diagnóstico é somente inglês técnico e marcado como provisório. Nenhum texto entra em bitmap.

### Aplicabilidade transversal

- Determinismo: aplicável; input é quantizado antes do core, pausa/foco/render delta não mudam regra e goldens F0 não podem mudar.
- Performance: aplicável como baseline; zero alocação obrigatória por tick após warm-up, nenhum layout read no loop e ausência de crescimento de listeners após recriar a cena 5 vezes. Os thresholds físicos F0 não são reclassificados.
- UI responsiva/acessibilidade: aplicável conforme contratos acima e matriz reduzida deste item.
- Assets: não aplicável; somente formas runtime, sem catálogo/licença nova.
- i18n: não aplicável além de texto diagnóstico provisório; infraestrutura de locale continua fora do escopo.
- Save/migração: não aplicável; não persiste sessão nem muda schema.
- Segurança/privacidade/backend: não aplicável; nenhum dado ou rede novo.
- Offline: aplicável; a cena e controles usam apenas recursos precacheados pelo build e funcionam após reload offline existente.

### Decisões estruturais

Não há ADR novo. A separação core/Phaser, tick fixo, input quantizado, lifecycle PWA e budgets já são decisões aceitas. Dimensões, deadzone, keymap e política de merge são contratos internos reversíveis deste incremento; qualquer mudança posterior que altere replay publicado exigirá versionamento/ADR, mas F1-01 não publica ruleset nem altera golden.

## Critérios de aceitação

- [x] AC-01 — Dado o bootstrap concluído, quando Phaser inicia, então `BootstrapScene` transfere para uma única `GameplayScene`, existe um único canvas e a cena expõe marcador geométrico e diagnóstico de tick/input.
- [x] AC-02 — Dada uma sessão ativa, quando deltas somam N passos de 1/60 s em chunkings diferentes, então ocorrem exatamente N `stepRun` com a mesma sequência de `InputFrame` e estado/hash final.
- [x] AC-03 — Dado delta inválido ou backlog acima de 5 ticks, quando atualizado, então inválidos falham explicitamente e backlog é limitado/diagnosticado sem espiral nem avanço tardio.
- [x] AC-04 — Dado teclado com foco, quando setas/WASD e Space/Shift/E mudam, então eixos, cancelamento de opostos e bits resultam exatamente no contrato quantizado; repeat não cria pulso.
- [x] AC-05 — Dado um gesto iniciado na zona de movimento, quando cruza deadzone/raio, então produz inteiros limitados e reproduzíveis; cancel/up/foco/resize neutralizam o gesto.
- [x] AC-06 — Dados dois ponteiros, quando um move e outro pressiona qualquer ação, então movimento e bit coexistem; ponteiro estranho não sequestra nem libera a captura alheia.
- [x] AC-07 — Dados teclado e touch simultâneos, quando amostrados, então merge por maior magnitude/empate do teclado e OR das ações produz um novo `InputFrame` válido.
- [x] AC-08 — Dados tamanhos seguros representativos, quando calculado o layout, então `960×540` landscape ou `540×960` portrait, janela de mundo e letterbox são exatos; entrada inválida falha fechada.
- [x] AC-09 — Dado ultrawide ou DPR diferente, quando renderizado, então a janela lógica de mundo não cresce, coordenadas/input não mudam e nenhum pixel CSS entra no core.
- [x] AC-10 — Dada rotação no meio da sessão, quando o layout muda, então ticks pausam, estado/config/tick são preservados, zonas são recalculadas e a retomada começa neutra.
- [x] AC-11 — Dada perda de foco/visibility, quando a página fica oculta e volta, então nenhum tick oculto é recuperado e nenhum comando preso permanece ativo.
- [x] AC-12 — Dado gameplay iniciado/encerrado ou HMR, quando o lifecycle muda, então o port PWA recebe `true`/`false` corretamente e todos os listeners/capturas são liberados de modo idempotente.
- [x] AC-13 — Em `320×568`, celular landscape baixo, `768×1024`, `1024×768` e `1920×1080`, então canvas/controles/texto ficam dentro da safe area, sem overflow, e cada ação touch mede ao menos `44×44 CSS px`.
- [x] AC-14 — Dado reload offline com shell já cacheado, quando a aplicação abre, então gameplay e ambos os métodos de input permanecem disponíveis sem request obrigatório de rede.
- [x] AC-15 — Os gates `format`, `lint`, `typecheck`, unitários, determinismo F0, build, E2E de produto e PWA passam; hashes/goldens F0 e relatórios físicos permanecem byte a byte inalterados.
- [x] AC-16 — Após cinco ciclos de criar/destruir a cena, então não há crescimento de listeners, canvas duplicado, input preso nem callback após destroy.

## Plano de teste

- unitário:
  - cálculo puro do viewport para limites, quadrado, portrait/landscape, safe insets, ultrawide e entradas inválidas;
  - quantização touch nos limites `0`, deadzone, raio e clamp; mapa/merge de teclado, ações, opostos e cópia defensiva;
  - acumulador em chunkings equivalentes, cap de 5 ticks, pausa/retomada neutra, erros e lifecycle idempotente;
  - ownership de múltiplos ponteiros e cancelamentos.
- determinismo:
  - executar a mesma timeline lógica de teclado e touch sob chunkings de render diferentes e comparar frames, ticks e hashes;
  - repetir corpus F0-04/F0-05 sem atualizar snapshots; provar que resize, DPR, foco e orientação não entram no hash.
- integração/E2E:
  - integração Phaser para transição de cenas, adapter de viewport, shutdown e port PWA fake;
  - Playwright teclado e touch sintético, ações simultâneas, rotação no meio da sessão, perda de foco simulável, canvas único e reload offline;
  - manter toda a suíte E2E/PWA existente verde.
- manual/performance/viewports:
  - inspeção nos cinco viewports de AC-13 com safe-area simulada e DPR alto; confirmar legibilidade, alvo mínimo e ausência de cobertura indevida da janela de mundo;
  - cinco ciclos scene/session e inspeção de listeners/canvas;
  - smoke do harness/build budget existente. Não repetir a matriz física F0: F1-01 não contém workload representativo da slice e não pode promover `PERF-01`.

## Migração e rollback

- Não há migração de save, content manifest, asset, ruleset ou golden.
- Rollback remove a unidade F1-01 e restaura `BootstrapScene` diagnóstica/input desabilitado. Como nenhum estado é persistido, não há conversão reversa.
- O commit de implementação deve ser isolado sobre o baseline aprovado da fase F0; rollback não pode remover documentação/evidência F0.
- Se um adapter falhar na inicialização, o bootstrap encerra a criação parcial, remove listeners/canvas e mostra erro explícito; não mantém run marcada como ativa.

## Evidências de conclusão

- spec aprovada e arquivos de implementação/teste rastreáveis a F1-01;
- commit/diff isolado com autoria e committer `Codex <codex@openai.com>`;
- resultados frescos dos testes focados e `npm run check`, suíte determinística, E2E, PWA e `git diff --check`;
- tabela dos viewports de AC-13 com orientação, área segura, perfil lógico, escala e tamanho dos três alvos touch;
- comparação explícita dos blobs/hashes de goldens F0 e confirmação de que baselines físicos não mudaram;
- atualização de requisitos, roadmap, índice de specs e `CURRENT_STATE.md`, sem marcar requisitos amplos `Done` antes dos itens restantes/revisão independente.

### Evidência executada em 2026-07-04

- RED: três suites falharam por módulos ausentes; GREEN focado passou 14/14 após viewport, input e sessão serem implementados.
- `npm run check`: 19 arquivos/269 testes unitários, 7 determinísticos, typecheck, build, inspector PWA e budget verdes.
- `npm run test:unit:coverage`: viewport 100%, sessão 97,87% statements/100% lines, input 87,34% statements; `simulation/random` e `simulation/run` mantidos em 100%.
- `npm run test:e2e`: 10/10 produto nos projetos `320×568` e `1920×1080`, mais 1/1 harness; `npm run test:pwa`: 10/10, incluindo reload offline e update durante run.
- `git diff --check`: verde. Nenhum arquivo em `src/simulation`, `tests/determinism` ou baselines físicos foi alterado; SHA-256 dos vetores permanecem `7d45e812…` (random) e `46e3fa54…` (run).

| viewport CSS | orientação | perfil lógico | escala FIT | canvas CSS | alvos touch |
|---|---|---:|---:|---:|---:|
| `320×568` | portrait | `540×960` | `0,5917` | `319,5×568` | `56×56` |
| `568×320` | landscape baixo | `960×540` | `0,5917` | `568×319,5` | `56×56` |
| `768×1024` | portrait | `540×960` | `1,0667` | `576×1024` | `56×56` |
| `1024×768` | landscape | `960×540` | `1,0667` | `1024×576` | `56×56` |
| `1920×1080` | landscape | `960×540` | `2` | `1920×1080` | `56×56` |

### Evidência das correções em 2026-07-04

- `F1-01-INPUT-01`: botões DOM agora usam captura por `pointerId` no `PointerInput`, separada do `KeyboardInput`; ponteiro estranho não libera a ação, `pointerup` fora libera a captura real e `keyup` só é prevenido com foco da cena. Regressões unitárias e Chromium cobrem ownership, liberação externa e tecla física durante touch.
- `F1-01-VIEWPORT-01`: o mesmo `Graphics` é limpo e redesenhado após cada layout; E2E confirma que a orientação renderizada das zonas acompanha `landscape → portrait`.
- `F1-01-PERF-01`: `KeyboardInput`, `PointerInput`, `CombinedInput`, `GameplaySession` e `stepRun` reutilizam armazenamento após inicialização. Testes confirmam identidade estável do frame da sessão e de `RunState.input` por cinco ticks.
- RED: testes focados falharam por `actionDown`/`sampleInto` ausentes e troca de `RunState.input`; GREEN: 70/70 testes focados passaram.
- `npm run check`: 19 arquivos/273 testes unitários, 7 determinísticos, format, lint, typecheck, build, inspeção PWA e budget verdes.
- `npm run test:unit:coverage`: 273/273; `simulation/run` 100% statements/branches/functions/lines, input 92,70% statements e sessão 97,95% statements/100% lines.
- `npm run test:e2e`: 10/10 produto e 1/1 harness; `npm run test:pwa`: 10/10.
- Goldens preservados: SHA-256 `7d45e812fa33d866afd2d62d022d8e2d504fad6598d763d5c993ec200e7cd5da` (random) e `46e3fa54c5ded1fd07e6a9bd9562ab16e923d552d843237b025a67586a5aab2b` (run). Baselines físicos, dependências e workflows não foram alterados.

## Histórico de revisão

- 2026-07-04 — especificação inicial criada por Codex; dependência F0 confirmada `Done`; nenhum código runtime/teste, asset, golden, baseline, dependência ou workflow alterado; aguardando aprovação do proprietário.
- 2026-07-04 — proprietário aprovou a especificação; implementação iniciada por `$implement-roadmap-item F1-01`.
- 2026-07-04 — implementação e gates concluídos; item movido para `In review`, aguardando revisão independente.
- 2026-07-04 — revisão independente: `Changes requested`. Finding `F1-01-INPUT-01` (`High`): os botões touch DOM escrevem no mesmo `KeyboardInput` do teclado físico sem captura própria; soltar o ponteiro fora deixa ação presa (`aria-pressed=true`, input `0,0,1`) e um `keyup` físico libera uma ação touch ainda pressionada (`aria-pressed=true`, input passa de `0,0,1` para `0,0,0`). Isso viola ownership/liberação e independência teclado+touch de AC-06/AC-07; `keyup` também chama `preventDefault()` sem foco da cena. Finding `F1-01-VIEWPORT-01` (`Medium`): `applyLayout()` recalcula as zonas funcionais no resize, mas os gráficos criados uma vez por `drawZones()` não são limpos/redesenhados, deixando a indicação visual nas coordenadas/tamanhos anteriores após rotação. Finding `F1-01-PERF-01` (`Medium`): o contrato exige zero alocação obrigatória por tick após warm-up, porém cada amostragem aloca frames em `KeyboardInput`, `PointerInput` e `CombinedInput`, sem medição ou teste que demonstre o gate. Gates frescos: `npm run check` passou com 269 unitários/7 determinísticos e build; `npm run test:e2e` passou 10/10 + harness 1/1; `npm run test:pwa` passou 10/10 após repetição fora do sandbox (a primeira tentativa falhou apenas ao abrir `127.0.0.1:4174` com `EPERM`); `git diff --check` passou. Commit `234bc42` tem autoria/committer Codex e range isolado sobre `f066e6f`; simulation, goldens, baselines, dependências e workflows não mudaram. Nenhum runtime/teste foi alterado pelo revisor.
- 2026-07-04 — findings `F1-01-INPUT-01`, `F1-01-VIEWPORT-01` e `F1-01-PERF-01` corrigidos por TDD; AC-06/AC-07 revalidados, gates completos verdes e item retornado para `In review`.
