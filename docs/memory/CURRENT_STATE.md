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

## Ainda não iniciado

- execução real do workflow CI no GitHub e PWA manifest;
- protótipo jogável;
- projeto Supabase e qualquer integração externa.

## Próximo passo exato

Executar `$specify-roadmap-item F0-05`. F0-03 permanece em `Changes requested` e deve continuar separada.

## Bloqueios

F0-03 permanece em `Changes requested` por findings independentes. Antes do backend será necessário o usuário criar/selecionar um projeto Supabase. Antes de monetização serão necessárias decisões legais e de fornecedor.

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
