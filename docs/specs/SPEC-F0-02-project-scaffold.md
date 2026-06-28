# SPEC-F0-02: scaffold Vite, TypeScript strict e Phaser

Status: Done  
Owner: proprietário do projeto  
Requisitos: `COST-01` (parcial); habilita `DET-01`, `DET-02`, `PERF-01` e `PWA-01` sem concluí-los  
Dependências: `F0-01` (`Done`), ADR-0001 (`Accepted`)  

## Problema e resultado

O repositório ainda não possui uma aplicação executável. A implementação deve criar um scaffold mínimo, reproduzível e sem funcionalidade de gameplay, no qual uma instalação limpa consiga iniciar e empacotar uma página com um único canvas Phaser. A estrutura deve tornar explícitas as fronteiras entre aplicação, apresentação Phaser, simulação pura, conteúdo, serviços, plataforma e código compartilhado, permitindo que os próximos itens sejam adicionados sem mover regras de jogo para a engine.

Ao final, outro agente deve conseguir clonar o repositório, selecionar a versão Node documentada, executar `npm ci`, `npm run typecheck`, `npm run build` e `npm run dev` sem configuração externa, conta, segredo ou serviço pago.

## Escopo

- Incluído:
  - projeto npm com `package-lock.json` versionado;
  - Vite, TypeScript em modo estrito e Phaser 3 como dependências mínimas do scaffold;
  - versão Node suportada e fixada em `.nvmrc`, compatível com a versão escolhida do Vite;
  - scripts `dev`, `build`, `preview` e `typecheck`;
  - `index.html`, entrypoint TypeScript, estilo global mínimo e container acessível para o canvas;
  - inicialização e descarte de exatamente uma instância Phaser, incluindo descarte em HMR;
  - uma cena vazia/de bootstrap que prove o renderer sem gameplay, física, input, áudio ou asset externo;
  - diretórios `src/simulation`, `src/game`, `src/app`, `src/content`, `src/services`, `src/platform` e `src/shared`, com marcadores versionáveis e responsabilidade documentada;
  - diretórios reservados `assets/core` e `tests/{unit,determinism,integration,e2e,performance}` documentados sem suítes fictícias;
  - build estático em `dist/`, sem chamadas de rede em runtime e sem variáveis de ambiente obrigatórias;
  - atualização da documentação operacional e evidências reproduzíveis do scaffold.
- Fora de escopo:
  - ESLint, Prettier, Vitest, fast-check, Playwright e CI (`F0-03`);
  - PRNG, seeds, streams, loop fixo, estado de run, replay ou hash (`F0-04`/`F0-05`);
  - performance harness, budgets finais ou matriz de aparelhos (`F0-06`);
  - manifest, service worker, cache offline, instalação PWA e deploy/subpath de GitHub Pages (`F0-07`);
  - schemas de conteúdo/save e validadores (`F0-08`);
  - menus, navegação, gameplay, entidades, controles, áudio, persistência, backend, i18n e assets finais;
  - dependências antecipadas para itens futuros, incluindo plugin PWA, bibliotecas de teste, Supabase e storage.

## Regras e contratos

### Toolchain e dependências

- Usar npm e commitar `package-lock.json` em lockfile version 3 ou a versão estável produzida pelo npm associado ao Node fixado.
- Antes de gerar o scaffold, consultar releases estáveis suportadas e escolher versões sem tag prerelease. Fixar versões exatas, sem `^`, `~`, `latest` ou ranges abertos, para `phaser`, `typescript` e `vite`.
- Fixar em `.nvmrc` uma versão completa de Node LTS suportada pelo Vite escolhido e declarar em `package.json#engines.node` um intervalo coerente. Registrar as versões efetivas nas evidências da spec.
- Não adicionar dependência que exija licença paga, conta, chave ou serviço externo. Licenças das dependências diretas devem ser compatíveis com distribuição gratuita; qualquer dúvida de licença bloqueia a implementação para decisão humana.
- `npm run build` deve executar verificação TypeScript antes do build Vite. `npm run typecheck` não deve emitir arquivos.
- O build não deve depender de variáveis de ambiente. Configuração de base para GitHub Pages e itch.io pertence a `F0-07`.

### Estrutura mínima

```text
index.html
package.json
package-lock.json
.nvmrc
tsconfig*.json
vite.config.ts
src/
  main.ts
  styles.css
  app/
  game/
  simulation/
  content/
  services/
  platform/
  shared/
assets/core/
tests/
  unit/
  determinism/
  integration/
  e2e/
  performance/
```

- Arquivos marcadores podem usar `README.md` ou módulos vazios; não devem inventar interfaces de domínio antes dos itens responsáveis.
- `src/main.ts` é apenas o composition root. A criação do jogo fica em `game`; a coordenação do container/lifecycle fica em `app`.
- O scaffold deve criar um único canvas dentro de um elemento identificável. A cena de bootstrap pode desenhar uma cor ou texto de diagnóstico, mas não representa uma tela final do produto.
- Em HMR ou descarte explícito, a instância Phaser deve ser destruída e o canvas removido. Nova inicialização após descarte deve voltar a produzir uma única instância.
- Se o elemento raiz esperado não existir, a inicialização deve falhar cedo com erro explícito. Não criar containers silenciosamente nem engolir a falha.

### TypeScript e fronteiras

- `strict` deve estar ativo. Também ativar `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `useUnknownInCatchVariables`, `noUnusedLocals` e `noUnusedParameters`, salvo incompatibilidade concreta registrada na spec antes de relaxar uma flag.
- O código da aplicação não usa `any` explícito nem supressões `@ts-ignore`/`@ts-nocheck`.
- `simulation` permanece TypeScript puro e não importa Phaser, DOM, browser APIs, relógio, rede, storage, locale ou módulos de apresentação. Como este item não implementa simulação, não deve haver `Math.random()`, `Date.now()` ou timers nesse diretório.
- `game` é o único módulo do scaffold autorizado a importar Phaser. `app` coordena a inicialização por uma API local de `game`; não contém regras da run.
- `content` contém somente marcadores de dados; `services` e `platform` não recebem adapters prematuros; `shared` não vira um depósito de código específico de outro módulo.
- Evitar aliases de import no scaffold. Imports relativos reduzem configuração duplicada entre TypeScript e Vite; aliases podem ser introduzidos por spec posterior quando houver benefício comprovado.

### Comportamentos não funcionais

- Determinismo: não aplicável como comportamento neste item. O isolamento de `simulation` é obrigatório e prepara `F0-04`/`F0-05`; não criar golden output vazio.
- Performance: o scaffold deve registrar os tamanhos produzidos por `npm run build`, sem estabelecer ou aprovar budget (`F0-06`). O canvas vazio não é evidência de `PERF-01`.
- UI responsiva: somente o shell deve ocupar o viewport sem overflow involuntário em 320×568 e 1920×1080. Matriz completa, safe areas e rotação pertencem aos itens de UI/performance.
- Assets: nenhum asset binário é necessário. Se o renderer mostrar diagnóstico, usar texto ou primitives Phaser. Pipeline e catálogo permanecem inalterados.
- i18n: não aplicável; texto diagnóstico, se existir, não é conteúdo de produto nem cria chave/locale.
- Save/migração: não aplicável; este item não lê nem grava storage.
- Segurança/privacidade: não há secrets, telemetria, backend, formulário ou dado pessoal. `dist/` não deve conter configuração privada.
- Offline/PWA: o runtime não faz chamadas de rede depois de carregado, mas cache offline, manifest e instalação não são entregues nem alegados por esta spec.

## Critérios de aceitação

- [x] Given checkout limpo e a versão Node indicada em `.nvmrc`, when `npm ci` é executado, then a instalação usa somente o lockfile e termina sem configuração externa.
- [x] Given dependências instaladas, when `npm run typecheck` e `npm run build` são executados, then ambos retornam código zero e `dist/` contém o build estático.
- [x] Given `npm run dev`, when a página é aberta em browser suportado, then existe exatamente um canvas Phaser visível, sem erro ou warning da aplicação no console e sem request de asset/API ausente.
- [x] Given uma atualização HMR ou o descarte da aplicação, when a inicialização ocorre novamente, then a instância anterior é destruída e continua existindo exatamente um canvas.
- [x] Given o elemento raiz ausente, when o bootstrap é chamado, then ocorre erro explícito e nenhuma instância Phaser é criada.
- [x] Given inspeção de `tsconfig`, when as opções efetivas são exibidas, then `strict` e as flags adicionais desta spec estão ativas e o typecheck não emite arquivos.
- [x] Given inspeção da árvore, when as fronteiras são verificadas, then todos os sete módulos alvo e cinco diretórios de testes existem/documentam responsabilidade, e somente `game` importa `phaser`.
- [x] Given inspeção de `src/simulation`, when imports e APIs proibidas são pesquisados, then não há Phaser, DOM/browser, rede, storage, locale, relógio, aleatoriedade global ou timers.
- [x] Given viewports 320×568 e 1920×1080, when o shell vazio é aberto, then ele ocupa a área visível sem scrollbar causada pelo scaffold e o canvas permanece dentro do container.
- [x] Given inspeção de dependências e artefato, when versões/licenças/arquivos são revisados, then só existem dependências diretas justificadas, versões exatas, nenhuma credencial e nenhum componente pago obrigatório.
- [x] A documentação registra versões selecionadas, comandos realmente executados, resultados, tamanho do build, limitações e próximo item, sem marcar requisitos habilitados como `Done`.

## Plano de teste

- unitário: não aplicável nesta spec; Vitest entra em `F0-03`. O erro de raiz ausente deve ser coberto por teste unitário quando o harness existir; nesta entrega, demonstrar por inspeção/chamada manual documentada.
- determinismo: não aplicável; executar inspeção estática do diretório `simulation`, sem produzir golden artificial.
- integração/E2E: smoke manual no servidor Vite para criação, HMR/descarte e ausência de erro no console. Playwright entra em `F0-03`.
- manual/performance/viewports: abrir o shell em 320×568 e 1920×1080; verificar canvas único, ausência de overflow e requests falhos; registrar o resumo de tamanho emitido pelo Vite, deixando medição de FPS/budgets para `F0-06`.
- comandos mínimos de evidência:

```bash
node --version
npm --version
npm ci
npm ls --depth=0
npm run typecheck
npm run build
npm run dev
```

O implementador deve acrescentar comandos de inspeção usados e resultados reais. Nenhum comando acima é evidência antes de ser executado.

## Migração e rollback

Não há dado, save, asset publicado ou schema anterior a migrar. A implementação é aditiva. O rollback consiste em reverter a unidade de mudança F0-02 inteira — fontes, configuração, manifesto e lockfile — sem tocar a documentação base de F0-01. Não editar lockfile manualmente e não misturar atualização de dependências não relacionada. Se uma versão selecionada falhar nos gates, ajustar manifesto e regenerar o lockfile de forma coerente antes da revisão; registrar a troca e o motivo.

## Evidências de conclusão

- Commit: não criado nesta sessão; publicação/commit não foram solicitados. Arquivos de runtime e configuração adicionados: `.nvmrc`, `package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.ts`, `src/styles.css`, `src/app/bootstrapApplication.ts`, `src/game/{BootstrapScene,createGame}.ts`; marcadores documentais adicionados nos sete módulos, `assets/core` e cinco diretórios de testes. `README.md`, esta spec, índice de specs, roadmap e memória foram atualizados.
- Versões efetivamente usadas: Node `24.15.0` LTS, npm `11.12.1`, Vite `8.1.0`, TypeScript `6.0.3`, Phaser `3.90.0`; dependências fixadas sem ranges e lockfile version `3`. Vite 8.1 declara suporte a Node `20.19+`/`22.12+`; a linha Node 24 escolhida é LTS. Phaser permaneceu na linha 3 exigida pelo ADR/spec.
- `npm ci`: exit `0`, 18 packages instalados somente pelo lockfile, sem configuração externa. `npm ls --depth=0`: exit `0`, somente `phaser@3.90.0`, `typescript@6.0.3` e `vite@8.1.0` como dependências diretas. `npm run typecheck`: exit `0`. `npm run build`: exit `0`, incluindo typecheck anterior ao Vite.
- Baseline de build, sem budget aprovado: `dist/index.html` 0,57 kB (gzip 0,36 kB), CSS 0,33 kB (gzip 0,22 kB), JS 1.200,71 kB (gzip 320,30 kB). O Vite emitiu warning de chunk acima de 500 kB; otimização/budget pertencem a F0-06.
- Smoke Chrome headless/CDP sobre `npm run dev`: em 320×568 e 1920×1080 houve exatamente um canvas de tamanho igual ao viewport, sem overflow. Uma atualização HMR de `src/main.ts` manteve um canvas. Console, exceptions e requests falhos da página: nenhum. O diagnóstico exibiu apenas texto local/primitives.
- Smoke de lifecycle com página temporária removida ao final: primeira inicialização `1` canvas, descarte explícito `0`, reinicialização imediata `1`. `bootstrapApplication(null)` lançou `WWIIRun bootstrap failed: #game-root element was not found.` sem criar jogo.
- `npx tsc --showConfig`: exit `0`; confirmou `strict`, todas as flags adicionais e `noEmit`. Inspeção com `rg` encontrou imports de `phaser` somente nos dois arquivos de `src/game`; `src/simulation` contém somente seu marcador e nenhuma API/import proibido.
- Licenças diretas: Phaser/Vite MIT e TypeScript Apache-2.0. Metadados de todas as dependências transitivas foram inspecionados e usam licenças open source (MIT, Apache-2.0, MPL-2.0, ISC, BSD-3-Clause ou 0BSD); não há componente pago, conta, secret ou variável de ambiente obrigatória.
- Gates não aplicáveis: format/lint, suites unitárias, determinismo automatizado e E2E persistente entram em F0-03/F0-04; não foram alegados como executados. `COST-01`, `DET-01`, `DET-02`, `PERF-01` e `PWA-01` permanecem `Planned`.

## Histórico de revisão

- 2026-06-27 — especificação inicial criada; dependência F0-01 verificada como `Done`; nenhum teste ou comando de implementação executado; aguardando aprovação humana.
- 2026-06-27 — aprovação implícita registrada pelo pedido explícito de implementação de `F0-02`; status movido para `In progress`.
- 2026-06-27 — scaffold implementado e gates aplicáveis executados; todos os critérios de aceitação atendidos; item movido para `In review`, aguardando revisão independente.
- 2026-06-27 — revisão independente aprovada sem findings. Evidências reexecutadas: Node `24.15.0`/npm `11.12.1`, `npm ci`, `npm ls --depth=0`, `npm run typecheck`, `npm run build`, `npx tsc --showConfig`, inspeções de imports/APIs proibidas, dependências/licenças e artefato, além de smoke Chrome/CDP em 320×568 e 1920×1080. O smoke confirmou um canvas por viewport sem overflow, exceções ou requests falhos; lifecycle explícito `1→0→1`, erro de raiz ausente e um canvas após atualização HMR. A captura visual confirmou o diagnóstico renderizado. O warning de chunk de 1.200,71 kB permanece registrado como baseline, com budget/otimização deferidos por escopo para `F0-06`. Status movido para `Done`.
