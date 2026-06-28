# Estado atual

Atualizado em: 2026-06-28

## Fase

F0 — Fundação documental e técnica.

## Concluído

- escopo inicial capturado e organizado;
- arquitetura alvo, determinismo, assets, backend, UX e distribuição definidos;
- roadmap faseado e matriz de rastreabilidade criados;
- regras para sessões autônomas, templates e gates de qualidade estabelecidos.
- cinco skills repo-local criadas para especificação, implementação, revisão, auditoria determinística e fechamento de fase.
- spec `F0-02` implementada: scaffold npm com Vite 8.1.0, TypeScript 6.0.3 strict, Phaser 3.90.0, Node 24.15.0 e lockfile reproduzível;
- composition root, lifecycle/HMR, cena diagnóstica, shell responsivo e fronteiras dos sete módulos criados;
- revisão independente de `F0-02` aprovada sem findings; item movido para `Done` e `F0-03` liberado como `Ready`.
- spec `F0-03` implementada: ESLint/Prettier, typecheck separado de runtime/tooling, Vitest com cobertura V8, Playwright Chromium em dois viewports e CI GitHub Actions de privilégio mínimo;
- revisão independente de `F0-03` solicitou mudanças: regras de isolamento aceitam bypass por `globalThis.Math.random()` e import relativo profundo; a unidade também não possui commit/diff isolado nem execução real do Actions.
- `F0-04` implementado e revisado: algoritmo, streams e corpus golden passaram nos gates principais, mas a revisão independente retornou `Changes requested` porque a evidência de cobertura focada do módulo random não é reproduzível com a configuração atual.
- finding de cobertura de `F0-04` corrigido: relatório textual agora explicita os arquivos 100% cobertos em agentes/CI e o teste de 10.000 draws permanece equivalente com uma única asserção agregada; item retornou para `In review`.
- ADR-0004 aceito e autonomia técnica delegada registrada: decisões internas/reversíveis seguem a recomendação do agente, preservadas as matérias humanas reservadas e autorizações externas.
- segunda revisão independente de `F0-04` aprovada sem findings; auditoria determinística recebeu `Pass`, item movido para `Done` e `F0-05` liberado como `Ready`.
- `F0-05` implementado: contratos canônicos de run/input/estado, tick fixo e executor headless atômico, hash `fnv1a64-v1`, corpus independente e execução idêntica em Node/Chromium; ADR-0005 aceito e item em `In review`.
- revisão independente de `F0-05` confirmou o núcleo e o determinismo, mas retornou `Changes requested`: F0-04/F0-05 seguem misturados como arquivos não rastreados sem unidade versionada isolada, e o índice arquitetural classifica ADR-0005 aceito como proposto e omite ADR-0004.
- findings de `F0-05` corrigidos sem mudar runtime ou goldens: commit local `9b6568b` materializa F0-04 como baseline aprovado, o sucessor isola F0-05 e o índice lista ADR-0004/0005 como aceitos; item retornado para `In review`.
- segunda revisão independente de `F0-05` aprovada sem findings; todos os critérios e gates passaram, item movido para `Done` e `F0-08` liberado como `Ready`.
- spec `F0-06` criada em `Draft`: harness de performance isolado, workload sintético versionado, relatório, protocolo real e budgets de bundle/assets definidos; ADR-0006 proposto e item movido para `Specified`.
- proprietário aprovou SPEC-F0-06/ADR-0006 e registrou ThinkPad T430u, iPhone 17, iPad 10ª geração, Galaxy Tab S9 e desktop i5-9600KF; ADR aceito e item movido para `In progress`.
- infraestrutura automatizável de F0-06 implementada: workload `tier-base-stress-v1`, coletor/relatório v1, lifecycle com cinco ciclos, smoke Chromium, checker de budgets integrado ao build, protocolo e matriz sem resultados fictícios.

## Ainda não iniciado

- execução real do workflow CI no GitHub e PWA manifest;
- protótipo jogável;
- projeto Supabase e qualquer integração externa.

## Próximo passo exato

Executar três repetições físicas válidas no `desktop-primary` (ThinkPad T430u) e `iphone-primary` (iPhone 17), enviar os seis JSONs exportados e confirmar a GPU informada como “RTX 2600 SUPER”. Depois registrar baselines/resumo, concluir os critérios restantes, mover F0-06 para `In review` e executar `$review-roadmap-item F0-06`.

## Bloqueios

F0-06 não tem dependência técnica incompleta, mas a conclusão exige execução humana do protocolo nos aparelhos físicos; não há acesso remoto a esses dispositivos nesta sessão. F0-08 não possui bloqueio conhecido. Os commits locais de F0-04/F0-05 e as atualizações documentais ainda não foram enviados ao GitHub. F0-03 permanece em `Changes requested` por findings independentes. Antes do backend será necessário o usuário criar/selecionar um projeto Supabase. Antes de monetização serão necessárias decisões legais e de fornecedor.

## Validações, pendências e riscos da sessão

- realizado nesta sessão: revisão independente de F0-03; nenhum código runtime foi alterado; spec, índice, roadmap e memória movidos para `Changes requested`.
- validações: Node `v24.15.0`, npm `11.12.1`; `npm ci`, árvore direta, gates individuais, cobertura, build e `npm run check` verdes; `CI=1 npm run test:e2e` verde em 2/2 viewports e 12,8 s com um worker.
- provas negativas: Prettier rejeitou arquivo mal formatado; ESLint rejeitou warning com `--max-warnings 0`, import simples de `game` e `Math.random` simples; fixtures removidas. Provas de bypass mostraram exit `0` para `globalThis.Math.random()` e import válido `../../../game/createGame` em subdiretório profundo de `simulation`.
- pendências: corrigir e testar os bypasses; separar unidades F0-02/F0-03 em commits rastreáveis; executar o workflow real no GitHub Actions e registrar URL/identificador, SHA e resultado.
- risco mantido: bundle JS de 1.200,71 kB (gzip 320,30 kB) segue com warning acima de 500 kB e pertence a F0-06; determinismo, performance e PWA continuam `Planned`.
- risco de custo: standard runners são gratuitos em repositório público; repositório privado fica sujeito à franquia da conta. F0-03 não altera visibilidade nem autoriza cobrança.
- realizado em 2026-06-28: especificação de F0-04 criada, requisito `DET-01` mapeado como fundação parcial, ADR-0004 proposto, roadmap/índice/memória atualizados e regra de autonomia técnica registrada; nenhum runtime, teste ou dependência foi alterado.
- validações de 2026-06-28: dependência F0-02 confirmada `Done`; F0-03 não é dependência de F0-04; contrato confrontado com ADR-0002, arquitetura de determinismo, requisitos e implementação oficial `xoshiro128**` 1.1. Nenhum gate de implementação foi executado ou alegado.
- realizado em 2026-06-28: F0-04 implementado com API pura em `src/simulation/random`, parser estrito, `xoshiro128ss-v1`, clone, bounded integer, quatro streams por `jump`, corpus golden e execução cross-runtime; ADR-0004 aceito e lifecycle movido para `In review`.
- validações de F0-04: revisão independente confirmou `npm run check`, `npm run test:unit:coverage`, `CI=1 npm run test:e2e` e `git diff --check` verdes; 30/30 unitários, 5/5 determinísticos em Node e 4/4 E2E Chromium permaneceram verdes; imports/APIs auditados sem Phaser/DOM/rede/storage/clock/crypto/`Math.random`.
- pendência de F0-04: corrigir a reprodutibilidade do gate/evidência de coverage. O comando `npm run test:unit:coverage -- --run tests/unit/random.test.ts` falhou na revisão por timeout do teste longo em `tests/unit/random.test.ts`, e o relatório do `npm run test:unit:coverage` padrão não sustentou a claim registrada de 100% para `src/simulation/random`.
- realizado em 2026-06-28: revisão independente de F0-04 concluída; spec, índice e roadmap movidos para `Changes requested`; nenhum código runtime foi alterado.
- risco de F0-04: qualquer mudança posterior em algoritmo, ordem de palavras, saltos, tabela de streams ou consumo por rejection sampling altera saídas determinísticas e deve ser versionada, nunca absorvida por atualização silenciosa de golden. Firefox/WebKit continuam fora deste item.
- realizado em 2026-06-28: tentativa de especificar F0-05 interrompida na verificação de dependências; nenhuma spec, código runtime, teste, ADR ou estado de roadmap de F0-05 foi criado/alterado.
- validação de F0-05: o roadmap declara dependência direta em F0-04, cuja spec e item permanecem em `Changes requested` por finding `High` de cobertura não reproduzível.
- pendência e próximo passo de F0-05: obter revisão independente de F0-04 e somente após F0-04 chegar a `Done` executar `$specify-roadmap-item F0-05`.
- realizado em 2026-06-28: finding `High` de F0-04 corrigido sem alteração em runtime, API ou corpus golden. `tests/unit/random.test.ts` preserva 10.000 draws e agrega a validação em uma asserção; `vitest.config.ts` fixa `skipFull: false` no reporter textual, tornando a evidência independente da detecção de agente/CI; documentação e lifecycle atualizados para `In review`.
- validações da correção F0-04: RED reproduzido com o comando focado e `--testTimeout=1000`; GREEN em 614 ms totais e 108 ms de testes. `npm run check` passou com 30/30 unitários, 5/5 determinísticos e build; `npm run test:unit:coverage` mostrou `src/simulation/random` com 100% nas quatro métricas; o comando focado passou com 29/29 em 630 ms; `CI=1 npm run test:e2e` passou 4/4 em Chromium.
- pendência de F0-04: revisão independente com `$review-roadmap-item F0-04`; não marcar `Done` antes dela.
- riscos mantidos: warning do bundle Phaser de 1.200,71 kB (gzip 320,30 kB) pertence a F0-06; Firefox/WebKit continuam fora do escopo de F0-04; F0-03 segue com findings próprios não misturados nesta correção.
- realizado em 2026-06-28: segunda revisão independente de F0-04 aprovada sem findings; spec, índice e roadmap movidos para `Done`, F0-05 movido para `Ready` e relatório `docs/audits/determinism/2026-06-28-f0-04.md` registrado com veredito `Pass`. Nenhum código runtime, teste ou golden foi alterado pela revisão.
- validações da revisão final de F0-04: Node `v24.15.0`, npm `11.12.1`; `npm run check` verde com 30/30 unitários, 5/5 determinísticos e build; cobertura completa e focada mostraram `src/simulation/random` em 100% nas quatro métricas; comando focado com timeout de 1 s passou 29/29 em 605 ms; duas repetições adicionais do corpus Node passaram 5/5; `CI=1 npm run test:e2e` passou 4/4 no Chromium; árvore direta, `git diff --check`, imports/APIs proibidos, worktree e fonte normativa oficial foram inspecionados.
- pendência após F0-04: executar `$specify-roadmap-item F0-05`; `DET-01` permanece `Planned` até loop, inputs, estado/hash/replay e desafios Daily/Weekly serem entregues. F0-03 continua em `Changes requested` por findings independentes.
- realizado em 2026-06-28: `SPEC-F0-05` criada em `Awaiting approval`, ADR-0005 proposto, item movido de `Ready` para `Specified` e índice/memória atualizados. Nenhum arquivo de runtime/teste, golden, dependência ou gate foi alterado/executado.
- validações de especificação F0-05: dependência F0-04 confirmada `Done`; contrato confrontado com ADR-0001/0002/0004, arquitetura de determinismo, requisitos, qualidade e API real de `src/simulation/random`. `DET-01` e `DET-02` permanecem `Planned`.
- pendência de F0-05: aprovar a spec e ADR-0005, então executar `$implement-roadmap-item F0-05`; a implementação deve produzir corpus golden independente em Node/Chromium e passar os gates definidos.
- riscos de F0-05: FNV-1a 64-bit detecta divergência, mas não autentica cliente; custo de `BigInt` será medido em F0-06 e o hash fica sob demanda. Extensões futuras do estado/layout exigem versionamento e não podem atualizar goldens silenciosamente.
- realizado em 2026-06-28: `F0-05` implementado por TDD em `src/simulation/run` com config/input validados, tick/headless atômico, isolamento/cópias defensivas, layout canônico e hash `fnv1a64-v1`; ADR-0005 aceito, rastreabilidade/documentação atualizadas e lifecycle movido para `In review`.
- validações de F0-05: teste focado 59/59; coverage focada do módulo `run` em 100% nas quatro métricas; `npm run check` verde com 89/89 unitários, 7/7 determinísticos e build; `CI=1 npm run test:e2e` verde 6/6 em dois viewports Chromium; `git diff --check` e scans de fronteira/APIs proibidas verdes.
- corpus F0-05: script Python temporário independente produziu layout de 392 bytes e hashes hardcoded nos ticks 0/1/3/8, confirmados em Node e Chromium; prova negativa Chromium com expected adulterado falhou nos dois projetos antes da restauração.
- pendência de F0-05: revisão independente com `$review-roadmap-item F0-05`. O worktree continua contendo mudanças não commitadas de F0-03/F0-04; não houve commit, push ou execução de GitHub Actions. Riscos mantidos: warning de bundle pertence a F0-06; custo/frequência de `BigInt` serão medidos em F0-06; FNV não autentica cliente; `DET-01`/`DET-02` permanecem `Planned`.
- realizado em 2026-06-28: revisão independente de F0-05 concluída sem alterar runtime, testes ou goldens; spec, índice e roadmap movidos para `Changes requested`; auditoria `docs/audits/determinism/2026-06-28-f0-05.md` registrada com `Pass`.
- validações da revisão F0-05: Node `v24.15.0`, npm `11.12.1`; `npm run check` verde com 89/89 unitários, 7/7 determinísticos e build; coverage focada 59/59 e `src/simulation/run` em 100% nas quatro métricas; corpus Node verde em três execuções totais; `CI=1 npm run test:e2e` verde 6/6 em Chromium; recomputação Python independente confirmou layouts de 392 bytes e hashes nos ticks 0/1/3/8; árvore direta, scans de fronteira/API, worktree e `git diff --check` inspecionados.
- pendências F0-05: versionar F0-04 como baseline aprovado, produzir commit/diff isolado de F0-05 e corrigir `docs/README.md` para listar ADR-0004/0005 entre os aceitos; depois executar nova revisão independente. Não alterar runtime ou goldens para resolver estes findings.
- riscos mantidos após a revisão F0-05: warning do bundle pertence a F0-06; custo/frequência de `BigInt` serão medidos em F0-06; FNV não autentica cliente; restore/checkpoints persistidos, manifests e Firefox/WebKit permanecem fora deste item; `DET-01`/`DET-02` continuam `Planned`.
- realizado em 2026-06-28: findings de F0-05 corrigidos sem reescrever o remoto: `9b6568b` registra o baseline F0-04 validado e seu sucessor direto contém a unidade F0-05 isolada; `docs/README.md` agora classifica ADR-0004/0005 como aceitos. Runtime, testes e goldens F0-05 coincidem por blob com `06065ee`; item movido para `In review`.
- validações da correção F0-05: baseline F0-04 passou `npm run check` com 30/30 unitários e 5/5 determinísticos, além de Playwright 4/4; F0-05 passou teste/coverage focados 59/59 com módulo `run` em 100% nas quatro métricas, `npm run check` com 89/89 unitários e 7/7 determinísticos, build e Playwright 6/6 em Chromium. `git diff --check` e comparação dos blobs foram verdes.
- pendência: executar `$review-roadmap-item F0-05`; não marcar `Done` antes da revisão independente e não fazer push sem autorização explícita.
- riscos mantidos: warning do bundle Phaser de 1.200,71 kB (gzip 320,30 kB) pertence a F0-06; FNV não autentica cliente; custo/frequência de `BigInt`, restore/checkpoints persistidos, manifests e Firefox/WebKit permanecem fora deste item; `DET-01`/`DET-02` continuam `Planned`.
- realizado em 2026-06-28: segunda revisão independente de F0-05 aprovada sem findings; nenhum runtime, teste ou golden foi alterado; spec, índice e roadmap movidos para `Done`, evidência parcial de `DET-01` confirmada e F0-08 movido para `Ready`.
- validações da revisão final de F0-05: Node `v24.15.0`, npm `11.12.1`; coverage focada 59/59 e `src/simulation/run` em 100% nas quatro métricas; `npm run check` verde com 89/89 unitários, 7/7 determinísticos, typecheck e build; `CI=1 npm run test:e2e` verde 6/6 em Chromium; recomputação Python independente confirmou 392 bytes e os hashes nos ticks 0/1/3/8; árvore direta, scans de fronteira/API, diff isolado, blobs, worktree e `git diff --check` inspecionados.
- pendência após F0-05: executar `$specify-roadmap-item F0-08`; F0-03 continua em `Changes requested` e não foi misturado nesta revisão. Não houve push nem qualquer ação externa.
- riscos mantidos após aprovação de F0-05: warning do bundle pertence a F0-06; FNV não autentica cliente; custo/frequência de `BigInt`, restore/checkpoints persistidos, manifests e Firefox/WebKit pertencem a itens futuros; `DET-01`/`DET-02` permanecem `Planned`.
- realizado em 2026-06-28: `SPEC-F0-06` criada em `Draft`, ADR-0006 proposto, item movido de `Backlog` para `Specified` e índices/memória atualizados. Nenhum runtime, teste, dependência, budget executável ou golden foi alterado.
- validações de especificação F0-06: dependência F0-02 confirmada `Done`; contrato confrontado com ADR-0001/0005, arquitetura, pipeline de assets, qualidade, riscos, requisitos e baseline documentado de 1.200,71 kB raw/320,30 kB gzip. F0-03 permanece fora do escopo e `Changes requested`.
- pendência de F0-06: proprietário deve registrar os modelos físicos disponíveis (mínimo desktop + celular; alvo Android + iPhone + tablet + desktop), aprovar spec/ADR-0006 e então executar `$implement-roadmap-item F0-06`.
- riscos de F0-06: workload geométrico F0 é sintético e não comprova gameplay futuro; APIs de long task/heap variam por browser; coleta real exige três execuções de dez minutos por cenário/aparelho; budgets iniciais precisarão de revisão justificada conforme conteúdo real entrar. `PERF-01`, `UI-04` e `ASSET-02` permanecem `Planned`.
- realizado em 2026-06-28: F0-06 implementado até o limite automatizável por TDD, sem dependência nova e sem alterar runtime/goldens F0-04/F0-05. Harness Vite/Phaser isolado, workload/relatório versionados, lifecycle, capabilities, avaliação por três runs, checker fail-closed, budgets, smoke e documentação foram adicionados; status permanece `In progress` por falta das medições físicas.
- validações de F0-06: Node `v24.15.0`, npm `11.12.1`; 16/16 testes focados, coverage 105/105, `npm run check` verde com 105 unitários/7 determinísticos/build, budget verde (JS 1.200.712 raw/318.817 gzip; payload inicial 319.410; core 1.201.632 bytes), `CI=1 npm run test:e2e` verde em 6/6 existentes + 1/1 harness e `git diff --check` verde.
- pendência de F0-06: três runs válidos no ThinkPad e três no iPhone no mesmo commit/workload, profiler manual quando capability for `unsupported`, seis JSONs e resumo em `docs/performance/baselines/<data>/`; confirmar o modelo da GPU discreta informado como “RTX 2600 SUPER”.
- riscos mantidos: smoke virtualizado pode registrar lacuna >1 s e invalidar seu relatório curto, por isso só valida estrutura e não velocidade; o warning genérico do Vite permanece, enquanto o budget aprovado passa; workload sintético não representa gameplay futuro. `PERF-01`, `UI-04` e `ASSET-02` continuam `Planned`.
- realizado em 2026-06-28: harness F0-06 ajustado por solicitação do proprietário para servir por padrão em `0.0.0.0:8080`, única porta acessível pelos aparelhos na rede local. Configuração, Playwright e instruções foram alinhados; produto e porta 4173 dos E2E existentes não foram alterados.
- validações do ajuste de porta: teste TDD reproduziu `127.0.0.1:4173` e passou com `0.0.0.0:8080`; `npm run performance:harness` publicou `http://192.168.68.121:8080/` e `curl` recebeu HTTP 200; smoke focado passou 1/1; `npm run check` passou com 106 unitários, 7 determinísticos, build e budget; `git diff --check` passou antes do registro documental.
