# SPEC-F0-06: harness de performance, matriz real e budgets

Status: Done
Owner: proprietário do projeto
Requisitos: `PERF-01` (fundação parcial); habilita medições futuras de `UI-04` e budgets de `ASSET-02` sem concluí-los
Dependências: `F0-02` (`Done`), ADR-0001 (`Accepted`), ADR-0006 (`Accepted`), ADR-0007 (`Accepted`)

## Problema e resultado

O projeto possui apenas um renderer Phaser vazio e um baseline informal de build: o chunk JavaScript mede 1.200,71 kB (320,30 kB gzip) e excede o warning padrão de 500 kB do Vite. Ainda não existe workload reproduzível, formato de relatório, gate de bytes nem matriz com aparelhos físicos identificados. Logo, o shell vazio e o tempo dos testes não sustentam qualquer afirmação sobre `PERF-01`.

F0-06 entrega um harness diagnóstico isolado do produto, um workload geométrico sintético e versionado, coleta local de frame/tick/long tasks/memória quando suportada, budgets automatizados do build de produção e um protocolo reproduzível de medição em aparelhos reais. A entrega estabelece a linha de base e a infraestrutura; não declara que gameplay futuro já cumpre 60 FPS.

A spec foi aprovada após o proprietário registrar os aparelhos físicos acessíveis: Lenovo ThinkPad T430u, iPhone 17, iPad 10ª geração, Samsung Galaxy Tab S9 e um desktop com Intel Core i5-9600KF. Em 2026-06-29, o proprietário autorizou substituir o ThinkPad pelo desktop Windows como `desktop-primary`; os relatórios confirmaram NVIDIA GeForce RTX 2060 SUPER e 16 GiB. O iPhone continua sendo o celular obrigatório e os tablets ampliam a matriz. A ausência de um trio com GPU integrada permanece lacuna futura explícita, sem bloquear o exit de F0 autorizado nem ser representada como `pass`.

## Escopo

- Incluído:
  - harness Vite diagnóstico separado do entrypoint e do build de produção;
  - workload `tier-base-stress-v1` geométrico, determinístico e sem assets externos, gameplay ou áudio;
  - coletor local versionado de amostras e relatório JSON comparável/auditável;
  - visualização diagnóstica e exportação manual do relatório, sem telemetria/rede;
  - smoke curto automatizado que valida lifecycle e relatório, sem threshold temporal de CI;
  - protocolo de três medições de dez minutos por cenário/aparelho de referência;
  - matriz documentada com hardware, SO, browser, viewport, DPR, renderer e condições da medição;
  - budgets versionados de JavaScript/CSS, transferência inicial, payload core e arquivos de asset;
  - checker de budget sem dependência nova, integrado ao build/gate existente;
  - baseline real em ao menos um desktop e um celular, requisito de exit da fase F0;
  - ADR-0006, documentação operacional, rastreabilidade e memória.
- Fora de escopo:
  - gameplay, entidades reais, colisão, armas, diretor, stress scene de produto ou caps finais de entidades (F1/F2);
  - adapter de input, loop de jogo/accumulator de produção, interpolação ou HUD final (F1);
  - quality tiers do produto ou alteração de densidade visual em runtime;
  - otimizar, lazy-load ou substituir Phaser somente para fazer o baseline passar;
  - corrigir findings, workflow ou histórico de `F0-03`; executar GitHub Actions ou publicar relatório externo;
  - PWA, service worker, cache/offline, deploy/subpath ou Lighthouse (F0-07);
  - schemas gerais, dimensões/alpha/atlas, referências, licenças e provenance de assets (F0-08/F6-04);
  - assets finais, áudio, fontes, i18n, save, backend, analytics ou telemetria;
  - comprar aparelho, contratar device farm/serviço pago ou prometer desempenho em hardware fora da matriz;
  - alterar regras, estado, hash ou golden outputs de F0-04/F0-05.

## Regras e contratos

### Arquitetura do harness

- O harness vive em `tests/performance/` e usa configuração/entrypoint Vite próprios. Seu output temporário não é `dist/`, permanece ignorado pelo Git e nunca é referenciado por `index.html`, `src/main.ts` ou pelo grafo inicial do produto.
- Código reutilizável de medição pode viver em `tests/performance/lib/`; não criar API de analytics em `src/`, rota secreta ou query parameter no app de produção.
- O harness pode importar Phaser e APIs públicas de `simulation`, mas `simulation` nunca importa o harness, browser APIs ou relógio. Nenhum resultado de performance entra em `RunConfig`, `RunState`, hash ou replay.
- O entrypoint oferece somente os comandos diagnósticos `start`, `stop/reset` e `export report`. Falta de capacidade opcional não derruba a medição; é registrada como `unsupported`.
- Não adicionar dependência npm. Vite, Phaser, Vitest e Playwright existentes podem ser usados. A entrega não resolve nem mascara os findings independentes de F0-03.

### Workload `tier-base-stress-v1`

- O workload é capacidade sintética, não regra de gameplay nem cap final. Sua versão faz parte do relatório; mudança de contagem, algoritmo ou lifecycle cria novo ID e preserva baselines antigos.
- Gerar uma textura simples em memória e reutilizá-la. Não carregar PNG, atlas, áudio, fonte remota ou request de rede.
- Criar exatamente três camadas `TileSprite` de parallax, 1.200 imagens pooled e visíveis derivadas da mesma textura e um texto diagnóstico atualizado no máximo uma vez por segundo. Posição e velocidade derivam de índice e tick inteiro; `Math.random`, `Date.now` e locale não participam do workload.
- Um tick diagnóstico chama `stepRun` uma vez com input neutro e atualiza o workload por contagens fixas. O accumulator e o relógio existem somente no harness e não podem ser exportados como loop do produto.
- A cada ciclo de 120 segundos, destruir completamente a cena e recriá-la; uma amostra de dez minutos contém quatro transições e cinco ciclos completos. Após cada destruição não podem restar canvas extra, listener, timer, objeto Phaser ativo ou referência deliberadamente retida.
- `document.visibilityState !== "visible"`, perda de contexto WebGL, resize durante a janela, pausa do debugger ou lacuna de `requestAnimationFrame` acima de 1.000 ms invalida a repetição; o relatório registra o motivo e nunca a classifica como aprovada.

### Coleta e relatório

- Usar timestamps monotônicos de `requestAnimationFrame` para frame time e `performance.now()` somente para duração do callback/tick. Tempo de parede não entra em regra ou workload.
- Descartar 30 segundos de warm-up e coletar 600 segundos. Guardar histogramas/estatísticas agregadas; não persistir dez minutos de amostras brutas no repositório.
- Percentil usa lista crescente e nearest-rank: para `n > 0`, índice zero-based `ceil(p * n) - 1`. FPS de uma janela é quantidade de callbacks dividida pela duração monotônica da janela. Avaliar janelas consecutivas, não sobrepostas, de cinco segundos.
- `LongTask` usa `PerformanceObserver` quando suportado. Memória JS usa a API disponível sem cast silencioso; renderer/VRAM que o browser não expõe ficam `unsupported`, não zero.
- O relatório `wwiirun.performance-report.v1` contém no mínimo:
  - `schemaVersion`, `workloadVersion`, hash/commit testado, status `valid | invalid` e avaliação `pass | fail | not-evaluated`;
  - papel e modelo do aparelho informados manualmente, CPU/GPU/RAM conhecidos, SO e versão;
  - browser/versão, user agent, renderer Phaser/WebGL/Canvas, viewport CSS, DPR e refresh observado;
  - energia, temperatura qualitativa (`normal | warm | hot | unknown`), throttling e orientação;
  - warm-up/duração/amostras, frame p50/p95/p99, FPS por janela e menor janela;
  - tick p50/p95/p99, long tasks acima de 50 ms, lifecycle/transições e lacunas;
  - heap inicial/final/pico e capacidade de memória/long task;
  - resultado de cada budget e lista objetiva de falhas/invalidações.
- O export não coleta nome, hostname, serial, IP, geolocalização, identificador persistente ou dado de perfil. Nenhum relatório é enviado automaticamente.
- Relatórios aprovados são versionados sob `docs/performance/baselines/<data>/`, acompanhados de um resumo Markdown da matriz. JSON deve ser formatado e estável; campos não suportados usam `null` mais a capacidade correspondente, nunca omissão ambígua.

### Matriz e protocolo real

- A matriz alvo tem quatro papéis: desktop físico publicado, Android intermediário com pelo menos 4 GB, iPhone/Safari suportado e tablet Android ou iPad. Cada papel deve registrar hardware concreto; emulação de viewport não conta como aparelho real. Para F0, o proprietário autorizou o desktop Windows com GPU dedicada como `desktop-primary` no lugar do ThinkPad; um perfil integrado continua sendo cobertura futura.
- Para o exit de F0, são obrigatórios pelo menos `desktop-primary` e um dos celulares (`android-primary` ou `iphone-primary`). Os demais papéis ficam com modelo e data de medição previstos antes de F1 fechar; indisponibilidade não pode ser escondida como `pass`.
- Em cada cenário/aparelho, executar três repetições válidas de 30 s de warm-up + 600 s de coleta. Usar build/commit idêntico, browser estável instalado, DevTools fechado, zoom 100%, sem throttling artificial, foreground, orientação fixa e sem outra carga deliberada. Registrar se está em bateria ou tomada.
- Exceção de evidência aceita no ADR-0007: os nove baselines F0 já coletados no commit `1d75de79e7f5f340787a88e7d018a3a406bf59c0` com `wwiirun.performance-report.v1`/`tier-base-stress-v1` são avaliáveis com 119 janelas consecutivas, totalizando 595 s. O intervalo `595–600 s` não é presumido nem reconstruído. Outros commits e relatórios futuros permanecem em 600 s/120 janelas.
- A medição primária usa viewport nativo do aparelho. Celular/tablet também executa smoke de rotação fora da janela medida para confirmar resize/lifecycle, sem alegar cobertura final de `UI-04`.
- Um aparelho passa o baseline somente quando as três repetições são válidas e cada uma satisfaz: frame p95 `<= 16,67 ms`, tick p95 `<= 4 ms`, zero long tasks `> 50 ms` quando observáveis e nenhuma janela de cinco segundos abaixo de 55 FPS.
- Memória é gate quando mensurável: depois de cada recriação e estabilização, heap não pode crescer monotonicamente em todos os ciclos, e o heap final pode exceder o baseline pós-warm-up em no máximo o maior valor entre 10% desse baseline e 16 MiB. Quando a API não existir, registrar inspeção manual do profiler e classificar o gate automático como `unsupported`.
- Exceção logística aceita para a fundação F0: Safari remoto no iPhone exige Mac e o proprietário não dispõe desse equipamento. A capacidade permanece `unsupported`, a inspeção manual fica registrada como `unavailable` e não é convertida em `pass`; isso não exige compra, empréstimo ou bloqueio indefinido da fase, mas permanece risco explícito para revisão futura.
- Falha de desempenho é evidência, não autoriza reduzir workload/threshold ou mudar runtime fora da spec. Registrar finding, perfil e proposta de item corretivo; qualquer alteração de budget exige justificativa e revisão do ADR/spec.

### Budgets de build e assets

- Versionar `performance-budgets.json` com `schemaVersion: 1`, limites em bytes inteiros e racional. Um checker Node com funções testáveis inspeciona o `dist/` de produção, nunca o build do harness.
- O build de produção habilita o manifest do Vite como metadado de medição. O checker usa `index.html` + manifest para distinguir grafo inicial, chunks lazy e assets; calcula tamanhos raw e gzip de HTML/CSS/JS com `node:zlib`. O manifest e sourcemaps não são payload alcançável; formatos já comprimidos usam bytes raw para budget de payload.
- Budgets iniciais aprováveis para o scaffold atual:

| Recurso | Limite |
|---|---:|
| maior chunk JavaScript raw | 1.250.000 bytes |
| maior chunk JavaScript gzip | 335.000 bytes |
| JavaScript inicial total gzip | 350.000 bytes |
| HTML + CSS + JS iniciais gzip | 400.000 bytes |
| payload inicial total, incluindo assets eager | 2.097.152 bytes (2 MiB) |
| payload core total do build | 10.485.760 bytes (10 MiB) |
| arquivo raster/atlas individual | 524.288 bytes (512 KiB) |
| arquivo de áudio individual | 1.572.864 bytes (1,5 MiB) |

- O baseline conhecido de 1.200,71 kB raw/320,30 kB gzip cabe com margem pequena e mensurável; o warning genérico de 500 kB do Vite não é o gate do projeto. Não suprimir o warning sem configurar limite coerente e documentado.
- `assets/core/README.md`, sourcemaps e arquivos diagnósticos não contam como payload porque não são emitidos. Qualquer arquivo emitido e alcançável pelo shell/core conta uma vez; assets remotos são proibidos como fuga do budget.
- A allowlist inicial de extensões emitidas é `.html`, `.css`, `.js`, `.json`, `.png`, `.webp`, `.jpg`, `.jpeg`, `.avif`, `.svg`, `.ogg`, `.mp3`, `.m4a`, `.aac`, `.wav`, `.woff2`, `.ico` e `.webmanifest`; manifest/sourcemap são classificados separadamente como metadado. Extensão nova exige classificação e budget explícitos, não fallback genérico.
- O checker falha fechado para config ausente/inválida, `dist/`/manifest ausente, entrypoint não resolvido, extensão desconhecida emitida ou estouro. A mensagem identifica métrica, limite e valor observado e sai com código diferente de zero.
- O build/gate existente executa o checker depois do build Vite. O smoke de CI valida coleta e schema, mas thresholds temporais reais nunca rodam como gate em runner virtualizado.
- Aumentar budget exige medição na matriz, justificativa no diff e aprovação em revisão. Redução comprovadamente compatível pode ser feita por spec futura. Nunca rebaixar silenciosamente expected para acomodar regressão.

### Comportamentos não funcionais

- Determinismo: o workload tem versão e sequência fixa para comparabilidade, mas seus tempos não são deterministic golden. Nenhuma medição, FPS ou quality setting toca o core/goldens.
- Performance: central. Thresholds reais valem apenas no protocolo/aparelhos publicados; CI garante forma e lifecycle, não velocidade.
- UI responsiva: somente controles diagnósticos legíveis e canvas redimensionável; não conclui menus/HUD, safe areas ou `UI-04`.
- Assets: nenhum asset é criado. F0-06 limita bytes emitidos; dimensões, alpha, atlas, referências, licença e provenance ficam em F0-08/F6-04.
- i18n: não aplicável; UI e erros do harness são diagnósticos em inglês e não entram no produto.
- Save/compatibilidade: não aplicável; relatório não é save. Mudança incompatível cria novo `schemaVersion`/`workloadVersion`.
- Segurança/privacidade: sem rede, segredo, identificador persistente ou dado pessoal. User agent/modelo são evidência técnica versionada e limitada.
- Offline: o harness roda localmente com dependências instaladas e sem requests externos, mas não entrega cache PWA nem conclui `PWA-01`.
- Custo: nenhuma ferramenta, device farm ou serviço pago é obrigatório. Ausência de aparelho físico é decisão/logística humana, não autoriza compra.

## Critérios de aceitação

- [x] Given build de produção, when a árvore de imports/HTML é inspecionada, then nenhum arquivo, comando ou código do harness integra o entrypoint/payload inicial do produto.
- [x] Given `tier-base-stress-v1`, when duas execuções iniciam, then criam as contagens/camadas exatas e a mesma evolução por tick sem asset externo, rede, áudio, gameplay ou aleatoriedade/tempo de parede como dado.
- [x] Given uma medição completa, when warm-up e 600 segundos terminam, then o relatório v1 contém todos os campos, percentis nearest-rank, janelas de cinco segundos, capacidades e cinco ciclos/quatro recriações.
- [x] Given background, lacuna acima de 1.000 ms, resize, perda de contexto ou lifecycle incompleto, when a coleta termina, then o relatório é `invalid`, registra motivo e não produz `pass`.
- [x] Given APIs opcionais ausentes, when o relatório é exportado, then long task/memória/renderer indisponível aparece como `null` + capability `unsupported`, sem erro nem valor zero enganoso.
- [x] Given três repetições válidas em um aparelho, when thresholds são avaliados, then cada repetição e o aparelho recebem pass/fail reproduzível, sem arredondamento que esconda estouro.
- [x] Given stop/reset e quatro recriações, when lifecycle é auditado, then permanece exatamente um canvas durante a execução e zero após teardown, sem listeners/timers/objetos deliberadamente retidos.
- [x] Given smoke automatizado curto, when roda em Chromium, then valida workload, lifecycle, schema/export e caso inválido sem comparar FPS, milissegundos ou memória com thresholds de hardware.
- [x] Given o build atual, when o checker roda, then mede raw/gzip/grafos/assets, passa dentro dos budgets versionados e produz resumo legível.
- [x] Given fixtures no limite, um byte acima, config/entrypoint ausente e extensão desconhecida, when o checker roda, then aceita o limite exato e rejeita cada erro com exit code/mensagem determinísticos.
- [x] Given asset eager/lazy, duplicado ou remoto nas fixtures, when o grafo é medido, then bytes são classificados/contados uma vez e URL remota é rejeitada.
- [x] Given matriz publicada, when a evidência é revisada, then há modelos/ambiente concretos e três relatórios válidos para ao menos um desktop e um celular físicos no mesmo commit/workload.
- [x] Given aparelho ou métrica que falha, when a entrega é documentada, then o valor observado permanece registrado e vira finding/item corretivo; workload, threshold e expected não são afrouxados no mesmo diff para fabricar aprovação.
- [x] Given implementação concluída, when gates aplicáveis rodam, then format, lint, typecheck, unitários, determinismo, build+budget e E2E/smoke passam sem alterar goldens ou declarar `PERF-01`, `UI-04` ou `ASSET-02` `Done`.
- [x] A documentação registra como executar/exportar, matriz, commit, relatórios brutos agregados, resumo, limitações, findings e próximo passo exato.

## Plano de teste

- unitário:
  - nearest-rank, janela de cinco segundos, capabilities e invalidação;
  - schema/export estável e campos privados proibidos;
  - parser/validação de budgets e classificação de grafo/extensões;
  - fixtures com limite exato, `+1 byte`, gzip, duplicata, asset eager/lazy, URL remota, config/`dist` ausente;
  - teardown idempotente e zero/uma instância conforme lifecycle.
- determinismo:
  - `npm run test:determinism` permanece verde e goldens F0-04/F0-05 não mudam;
  - teste funcional compara contagens e snapshots lógicos do workload em ticks fixos, não tempos/FPS.
- integração/E2E:
  - Chromium executa modo curto configurado para teste, exporta relatório v1 e cobre start/stop/recreate/invalidação;
  - inspecionar console, exceptions, requests externos, quantidade de canvas e separação do build de produção;
  - nenhuma asserção temporal de hardware no runner local/CI.
- manual/performance/viewports:
  - três repetições reais de 10 min por aparelho/cenário após 30 s de warm-up;
  - pelo menos desktop e celular físicos; rotação smoke em dispositivos móveis;
  - guardar JSONs e resumo, inspecionar profiler quando long tasks/memória não forem expostas;
  - comparar build de produção com budgets e conferir que o harness não foi emitido.
- comandos mínimos de evidência esperados da implementação:

```bash
node --version
npm --version
npm run test:unit -- --run tests/unit/performance.test.ts tests/unit/performanceBudget.test.ts
npm run test:determinism
npm run build
npm run performance:budget
npm run performance:harness
CI=1 npm run test:e2e
npm run check
git diff --check
git status --short
```

`performance:harness` deve abrir/servir somente o harness e `performance:budget` deve ser reproduzível sobre um `dist/` recém-gerado. Nenhum comando ou threshold é evidência antes de ser executado.

## Migração e rollback

Não há save, ruleset, asset publicado ou relatório anterior a migrar. Relatórios e workload nascem em versão 1; mudança incompatível cria versão sucessora e mantém leitura/contexto dos baselines antigos.

Rollback seguro reverte harness, scripts, budgets, testes, ADR-0006 e documentação como uma unidade. O build anterior deve continuar funcional depois do rollback. Não reverter/alterar F0-04/F0-05, não apagar evidência de uma regressão e não deixar `package.json` apontando para script ausente. Se um budget estiver tecnicamente incorreto, corrigir via nova revisão com baseline preservado, não editando relatórios históricos.

## Evidências de conclusão

- Commit/diff isolado de F0-06, sem findings de F0-03, PWA, gameplay ou otimização oportunista.
- ADR-0006 aceito e config de budgets versionada com racional e testes de borda.
- Prova de que o build de produção não contém o harness; resumo raw/gzip/inicial/core e exit code do checker.
- Saídas dos gates realmente executados, incluindo teste focado, determinismo inalterado, build+budget, check e smoke Chromium sem threshold temporal.
- Três relatórios JSON v1 válidos e resumo para cada papel obrigatório inicial (`desktop-primary` + um celular), todos no mesmo commit e workload.
- Evidência de profiler/capability para métricas não expostas e findings honestos para qualquer threshold não atendido.
- Matriz com quatro papéis concretos ou indisponibilidade/prazo explícito dos papéis adicionais, sem representar emulação como hardware real.
- Requisitos, qualidade, riscos, índice, roadmap e memória atualizados; `PERF-01`, `UI-04` e `ASSET-02` permanecem `Planned` nesta fundação.

## Histórico de revisão

- 2026-06-28 — draft inicial criado; F0-02 confirmado `Done`; F0-03 permanece `Changes requested`, mas não é dependência declarada nem entra no escopo. ADR-0006 proposto. A arquitetura, workload, protocolo, schema e budgets foram definidos sem alterar runtime/testes/dependências ou alegar medição. Aprovação aguarda identificar os aparelhos físicos acessíveis.
- 2026-06-28 — proprietário aprovou a spec e ADR-0006 após informar ThinkPad T430u/Windows, iPhone 17, iPad 10ª geração, Galaxy Tab S9 e desktop i5-9600KF com modelo de GPU ainda a confirmar. Item movido para `In progress`; versões de SO/browser e resultados permanecem dados de execução, não pressupostos.
- 2026-06-28 — infraestrutura automatizável implementada por TDD: relatório/coletor, workload Phaser isolado, lifecycle, smoke Chromium, budgets do build e documentação operacional. Gates locais verdes; item permanece `In progress` porque os critérios de medição completa, matriz publicada com três runs físicos por aparelho obrigatório e resumo final ainda aguardam execução no ThinkPad T430u e iPhone 17.
- 2026-06-28 — ajuste operacional solicitado pelo proprietário: `performance:harness` passou a escutar por padrão em `0.0.0.0:8080`, com porta estrita e documentação LAN atualizada. Teste de configuração reproduziu RED em `127.0.0.1:4173` e GREEN no contrato novo; servidor real publicou endereço LAN e respondeu HTTP 200; smoke Chromium 1/1 e `npm run check` com 106 unitários/7 determinísticos/build+budget passaram. Item continua `In progress` aguardando os seis relatórios físicos.
- 2026-06-28 — intake dos seis arquivos físicos auditado: cada aparelho trouxe duas cópias byte a byte idênticas, totalizando três execuções únicas. ThinkPad e Galaxy Tab S9 são válidos com avaliação `fail`; iPhone é inválido por resize. Um teste RED provou que três cópias do mesmo relatório recebiam `pass`; o avaliador agora retorna `reports-not-distinct`. Matriz e resumo de intake registram valores e findings sem alterar threshold/workload. O item permanece `In progress` porque não existem três repetições válidas e distintas para desktop e celular.
- 2026-06-28 — novos trios físicos auditados: iPhone runs 02–04 e Galaxy Tab S9 runs 02–04 são válidos, distintos e comparáveis no mesmo commit/workload. Ambos recebem `fail` com valores preservados. O campo manual `device.role` do iPhone foi normalizado para o ID canônico com hashes pré/pós registrados. Long Task/heap do Safari seguem `unsupported`; o proprietário declarou não possuir Mac e aceitou profiler manual `unavailable` como risco conhecido, sem alegar `pass`. F0-06 permanece `In progress` somente pela ausência do trio obrigatório de desktop.
- 2026-06-29 — o proprietário substituiu explicitamente o ThinkPad pelo desktop Windows como `desktop-primary`. As runs 01–03 são válidas, distintas e comparáveis no mesmo commit/workload dos trios móveis; o aparelho recebe `fail` por frame p95 e quatro Long Tasks nas três runs, com tick, FPS mínimo e heap dentro dos budgets. Os relatórios aceitos foram promovidos a pastas datadas e a cobertura integrada ficou registrada como risco futuro, sem afrouxar threshold/workload.
- 2026-06-29 — revisão independente: `Changes requested`. Findings **High**: (1) `calculateFpsWindows` ancora as janelas no primeiro callback e exige um callback após o fim da janela; todos os nove baselines contêm 119 janelas, cobrindo somente 595 dos 600 segundos e deixando os 5 segundos finais fora do gate de FPS; (2) a unidade final não possui commit/diff isolado: código da proteção contra duplicatas, smoke, baselines e fechamento documental permanecem no worktree, enquanto `1d75de7` também carrega o encerramento de F0-05. Findings **Medium**: (3) o checker rejeita URL remota no manifest/HTML, mas uma fixture com `url(https://...)` em CSS foi aceita sem violação, permitindo escapar dos budgets; (4) `evaluateDeviceReports` compara apenas schema, workload, commit e papel/modelo, e uma prova negativa com browsers, viewports, DPRs e orientações divergentes retornou `pass`. Finding **Low**: (5) `OPEN_DECISIONS.md` ainda pede confirmar a GPU “RTX 2600 SUPER”, contradizendo a RTX 2060 SUPER já confirmada, e `git diff 8f8d7c2 --check` falha no diff completo. Checks independentes: Node `v24.15.0`, npm `11.12.1`; focados 18/18; cobertura 107/107; `npm run check` verde com 107 unitários, 7 determinísticos e build/budget; `CI=1 npm run test:e2e` verde fora do sandbox com 6/6 testes de produto e 1/1 smoke; hashes dos nove baselines conferem e os três avaliadores retornam os findings de performance documentados. A primeira tentativa E2E no sandbox falhou antes dos testes com `listen EPERM`; a repetição autorizada fora dele passou. Nenhum runtime, golden ou relatório físico foi alterado pela revisão. Próxima ação: corrigir os quatro gaps funcionais/rastreáveis, atualizar a documentação contraditória, produzir uma unidade F0-06 revisável e retornar o item para `In review`.
- 2026-06-29 — correção iniciada por TDD: janelas agora são ancoradas no início/duração explícitos da coleta e cobrem `0–600.000 ms`; o avaliador exige 120 janelas e compara aparelho, SO/browser/user agent, renderer, viewport, DPR, energia, throttling, orientação e configuração temporal; CSS emitido rejeita `url()`/`@import` remoto. Os testes RED reproduziram os três gaps e o conjunto focado passou 20/20 após a implementação. Os nove JSONs históricos foram preservados byte a byte e agora retornam `run-N-incomplete-fps-windows`; sem timestamps brutos, a correção honesta exige nova coleta de desktop + iPhone. O item permanece `In progress` até essa evidência existir.
- 2026-06-29 — decisão do proprietário registrada no ADR-0007: 119 janelas consecutivas/595 s são cobertura suficiente para os baselines F0 existentes; não haverá recoleta. O coletor futuro permanece em 120 janelas/600 s e nenhuma janela foi sintetizada. RED comprovou que a exceção era rejeitada; GREEN passou 21/21 focados e a avaliação direta retornou `fail` reproduzível para desktop, iPhone e tablet com os findings originais preservados.
- 2026-06-29 — segunda revisão independente: `Changes requested`. Finding **Medium** `F0-06-PERF-04`: o callback de `PerformanceObserver` decide se registra o lote inteiro usando `performance.now()`, não o `startTime` de cada entrada, e `#finish` chama `disconnect()` imediatamente. Uma prova controlada em Chromium produziu uma Long Task de 121 ms quando o observer permaneceu conectado e zero entradas quando ele foi desconectado no mesmo callback; portanto uma Long Task do frame final pode ser descartada e uma entrada iniciada no warm-up pode ser classificada como coleta, permitindo falso `pass` no budget de zero Long Tasks. Os resultados históricos não mudam: desktop/iPhone/tablet continuam `fail`, os nove hashes conferem e os JSONs permanecem inalterados. Checks independentes: Node `v24.15.0`, npm `11.12.1`; 22/22 focados; cobertura 111/111; `npm run check` verde com 111 unitários, 7 determinísticos e build/budget; `CI=1 npm run test:e2e` verde com 6/6 produto e 1/1 harness; `git diff --check` e `git diff 8f8d7c2..HEAD --check` verdes; os três trios retornaram `fail` diretamente pelo avaliador. Próxima ação: classificar cada Long Task pelo intervalo monotônico da coleta, manter/drenar o observer até a entrega das entradas do frame final e adicionar regressões de warm-up/fim antes de retornar a `In review`.
- 2026-06-29 — `F0-06-PERF-04` corrigido por TDD: cada entrada é filtrada pelo próprio `startTime` no intervalo monotônico inclusivo da coleta; o término aguarda o task seguinte, drena `takeRecords()` e somente então desconecta/finaliza. O RED registrou quatro entradas em vez de duas e comprovou drenagem síncrona; o GREEN passou 18/18. Prova Chromium isolada retornou `[]` com desconexão imediata e `[92]` com drenagem adiada. Nenhum threshold, workload, ADR, baseline, runtime do produto ou golden foi alterado; item retornado para `In review`.
- 2026-06-29 — terceira revisão independente: `Changes requested`. Finding **High** `F0-06-TRACE-01`: a correção funcional de `F0-06-PERF-04` passou, mas a evidência obrigatória de unidade isolada/versionada continua ausente. `git diff 8f8d7c2..HEAD -- docs/specs/SPEC-F0-05-fixed-headless-run-state-hash.md` ainda inclui o fechamento de F0-05 dentro do range F0-06, portanto reverter a unidade também reabre uma dependência já aprovada; além disso, o patch final de Long Tasks permanece somente no worktree. Checks independentes: Node `v24.15.0`, npm `11.12.1`; 24/24 testes focados; coverage 113/113 com `simulation/random` e `simulation/run` em 100%; `npm run check` verde com 113 unitários, 7 determinísticos, build e budget; `CI=1 npm run test:e2e` verde com 6/6 produto e 1/1 harness; `git diff --check` e diff completo verdes. Os nove SHA-256 conferem, nenhum baseline difere de `HEAD` e a avaliação direta preserva `fail` em desktop, iPhone e tablet. Próxima ação: materializar uma unidade F0-06 isolada e versionada que preserve o fechamento de F0-05 e inclua a correção `F0-06-PERF-04`; então retornar o item para `In review` sem alterar runtime, thresholds, workload, ADR-0007, goldens ou baselines.
- 2026-06-29 — `F0-06-TRACE-01` corrigido sem reescrever `origin/main`: `ec5bcc1` materializa um baseline cuja árvore preserva F0-05 `Done` e não contém F0-06; o sucessor `3a40f98` restaura exatamente o checkpoint `5e3503b` como unidade F0-06. `git diff ec5bcc1..3a40f98` não toca a spec F0-05, `src/simulation` ou goldens e inclui `F0-06-PERF-04`. Gates e artefatos protegidos foram revalidados; item retornado para `In review`.
- 2026-06-29 — quarta revisão independente: `Approved`, sem findings. O range `ec5bcc1..HEAD` contém uma unidade F0-06 versionada que não altera a spec F0-05, `src/simulation` nem goldens; o snapshot `ec5bcc1` mantém F0-05 `Done`, F0-08 `Ready`, não contém F0-06 e passou `npm run check` com 89 unitários, 7 determinísticos e build. `F0-06-PERF-04` está incluído no range com filtro por `startTime`, drenagem no task seguinte e regressões de limites/ordem. No HEAD, 24/24 testes focados, coverage 113/113, `npm run check`, build/budget, determinismo 7/7, Playwright 6/6 produto + 1/1 harness, `git diff --check`, nove SHA-256 e avaliação direta dos três trios passaram; desktop, iPhone e tablet preservam `fail`. Todos os 15 critérios de aceitação estão cobertos; item movido para `Done`, enquanto `PERF-01`, `UI-04` e `ASSET-02` permanecem `Planned` conforme escopo.

## Evidência de implementação parcial

- ambiente: Node `v24.15.0`, npm `11.12.1`;
- focados: `npm run test:unit -- --run tests/unit/performance.test.ts tests/unit/performanceBudget.test.ts` — 16/16 testes;
- cobertura: `npm run test:unit:coverage` — 105/105 testes; núcleo `simulation/random` e `simulation/run` permaneceu em 100% nas quatro métricas;
- gate completo: `npm run check` — format, lint, typecheck, 105 unitários, 7 determinísticos e build verdes;
- build/budget: maior JS 1.200.712 bytes raw e 318.817 gzip; JS inicial gzip 318.817; texto inicial gzip/payload inicial 319.410; core 1.201.632 bytes; três arquivos iniciais/core; checker `pass`;
- E2E: `CI=1 npm run test:e2e` — 6/6 testes existentes em dois viewports e 1/1 smoke do harness; o smoke não usa threshold temporal do runner;
- `git diff --check` passou; `dist/` contém apenas `index.html`, CSS, JS e metadado do manifest, sem harness;
- não executado/não alegado: três repetições físicas válidas e distintas no ThinkPad. Profiling manual do iPhone não foi executado por indisponibilidade de Mac e está explicitamente classificado `unavailable`, não `pass`.
- intake físico aceito: iPhone 02–04 e Galaxy Tab S9 02–04 formam conjuntos distintos e ambientalmente comparáveis no commit `1d75de79e7f5f340787a88e7d018a3a406bf59c0`. Cada JSON tem 119 janelas aceitas pelo ADR-0007; ambos avaliam `fail`, com failures, valores e hashes preservados.
- proteção contra duplicatas: RED focado retornou `pass` para três cópias; GREEN focado passou 12/12 após `reports-not-distinct`; conjunto focado final passou 18/18.
- gates finais da correção: `npm run check` verde com format, lint, typecheck, 107/107 unitários, 7/7 determinísticos, build e budget; `CI=1 npm run test:e2e` verde com 6/6 testes de produto e 1/1 smoke do harness.
- estabilidade do smoke: o primeiro E2E completo expôs carga média `13,31` em quatro CPUs e Chromium a aproximadamente 2 Hz; a observação transitória `start/snapshot/invalidate` foi tornada atômica no contexto da página. O smoke focado passou 1/1 sob contenção e o gate completo subsequente passou sem alterar duração, workload ou thresholds.
- validação dos trios: após ADR-0007, os três conjuntos retornam `fail` reproduzível. Desktop falha frame p95/Long Tasks; iPhone falha frame p95; tablet falha frame p95/Long Tasks e a run 03 também falha FPS mínimo/heap. Hashes e JSONs não foram alterados.
- decisão logística registrada: Web Inspector remoto do iPhone não foi executado por ausência de Mac. O proprietário autorizou seguir com `unavailable`; `unsupported` permanece no relatório e o risco não foi reclassificado como `pass`.
- trio desktop aceito: `docs/performance/baselines/2026-06-29/desktop-primary-run-01..03.json`, hashes únicos `1ad31f10…`, `7048dd3e…` e `2e3ee063…`; avaliação agregada `fail` por frame p95/Long Tasks, com cobertura de 595/600 s aceita no ADR-0007.
- conjunto obrigatório concluído: desktop Windows runs 01–03 e iPhone runs 02–04 são distintos e ambientalmente comparáveis no commit `1d75de79e7f5f340787a88e7d018a3a406bf59c0`; ambos são avaliáveis com 119 janelas conforme ADR-0007 e preservam resultado `fail`.
- gates de 2026-06-29: focados 17/17; `npm run check` verde com format, lint, typecheck, 107/107 unitários, 7/7 determinísticos, build e budget; `CI=1 npm run test:e2e` verde com 6/6 testes de produto e 1/1 smoke; `performance:harness` iniciou em `0.0.0.0:8080` e foi encerrado manualmente após publicar os endereços; `git diff --check` verde. O bundle permaneceu em 1.200.712 bytes raw/318.817 gzip, payload inicial 319.410 e core 1.201.632 bytes.
- lifecycle: todos os critérios estão atendidos com a exceção histórica explícita do ADR-0007; `PERF-01`, `UI-04` e `ASSET-02` continuam `Planned`. A quarta revisão independente aprovou F0-06 e o item está `Done`.
- correção de 2026-06-29: RED focado reproduziu cinco falhas e GREEN passou 20/20; `npm run check` passou com 110 unitários, 7 determinísticos, build e budget; coverage passou 110/110 com `simulation/random` e `simulation/run` em 100%; `CI=1 npm run test:e2e` passou 6/6 produto + 1/1 harness; o servidor do harness respondeu HTTP 200 na porta 8080; `git diff --check` e `git diff 8f8d7c2 --check` passaram. O bundle permaneceu em 1.200.712 bytes raw/318.817 gzip, payload inicial 319.410 e core 1.201.632 bytes.
- exceção ADR-0007 em 2026-06-29: teste RED rejeitou 595 s e GREEN focado passou 21/21 após aceitar exatamente 119 janelas consecutivas para relatórios v1/F0; menos cobertura continua `not-evaluated`. Avaliação direta dos JSONs retornou `fail` para desktop, iPhone e tablet com findings preservados. `npm run check` passou com 111 unitários, 7 determinísticos, build e budget; coverage passou 111/111 com random/run em 100%; Playwright fora do sandbox passou 6/6 produto + 1/1 harness. A execução E2E no sandbox falhou antes dos testes com `connect EPERM 127.0.0.1:4173`; nenhuma mudança de código foi necessária. JSONs, hashes, thresholds, workload e goldens permaneceram inalterados.
- correção `F0-06-PERF-04` em 2026-06-29: Node `v24.15.0`, npm `11.12.1`; GREEN focado 18/18; `npm run check` verde com format, lint, typecheck, 113 unitários, 7 determinísticos, build e budget; coverage 113/113 com random/run em 100%; Playwright completo 6/6 produto + 1/1 harness; `performance:harness` respondeu HTTP 200 em `localhost:8080`; `git diff --check` e `git diff 8f8d7c2 --check` passaram. Prova Chromium controlada confirmou `[]` imediato versus `[92]` adiado. Os nove hashes conferem, os JSONs não diferem de `HEAD` e desktop/iPhone/tablet continuam `fail` com os findings preservados.
- correção `F0-06-TRACE-01` em 2026-06-29: baseline `ec5bcc1`, unidade `3a40f98`, restauração idêntica a `5e3503b` e diff isolado sem F0-05/simulation/goldens. Focados 24/24; coverage 113/113 com random/run em 100%; `npm run check` exit 0 com build/budget; Playwright 6/6 produto + 1/1 harness; harness HTTP 200. Os nove SHA-256 conferem; thresholds, workload, ADR-0007, runtime do produto, goldens e baselines não diferem do checkpoint. Avaliação direta permanece `fail` para desktop, iPhone e tablet com os mesmos findings.
