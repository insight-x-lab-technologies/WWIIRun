# Estado atual

Atualizado em: 2026-06-27

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

## Ainda não iniciado

- execução real do workflow CI no GitHub e PWA manifest;
- protótipo jogável;
- projeto Supabase e qualquer integração externa.

## Próximo passo exato

Executar `$implement-roadmap-item F0-03` para corrigir os dois findings registrados na spec, adicionar regressões dos bypasses, organizar unidades versionadas rastreáveis e obter uma execução real verde do workflow antes de retornar a `In review`.

## Bloqueios

F0-03 está em `Changes requested`; commit/push e a execução real no GitHub exigem autorização explícita. Antes do backend será necessário o usuário criar/selecionar um projeto Supabase. Antes de monetização serão necessárias decisões legais e de fornecedor.

## Validações, pendências e riscos da sessão

- realizado nesta sessão: revisão independente de F0-03; nenhum código runtime foi alterado; spec, índice, roadmap e memória movidos para `Changes requested`.
- validações: Node `v24.15.0`, npm `11.12.1`; `npm ci`, árvore direta, gates individuais, cobertura, build e `npm run check` verdes; `CI=1 npm run test:e2e` verde em 2/2 viewports e 12,8 s com um worker.
- provas negativas: Prettier rejeitou arquivo mal formatado; ESLint rejeitou warning com `--max-warnings 0`, import simples de `game` e `Math.random` simples; fixtures removidas. Provas de bypass mostraram exit `0` para `globalThis.Math.random()` e import válido `../../../game/createGame` em subdiretório profundo de `simulation`.
- pendências: corrigir e testar os bypasses; separar unidades F0-02/F0-03 em commits rastreáveis; executar o workflow real no GitHub Actions e registrar URL/identificador, SHA e resultado.
- risco mantido: bundle JS de 1.200,71 kB (gzip 320,30 kB) segue com warning acima de 500 kB e pertence a F0-06; determinismo, performance e PWA continuam `Planned`.
- risco de custo: standard runners são gratuitos em repositório público; repositório privado fica sujeito à franquia da conta. F0-03 não altera visibilidade nem autoriza cobrança.
