# SPEC-F0-03: toolchain de qualidade e CI

Status: In progress
Owner: proprietário do projeto  
Requisitos: `AGENT-01` (reforço operacional); `COST-01` (parcial); habilita os gates de `DET-01`, `DET-02`, `PERF-01` e `PWA-01` sem concluí-los  
Dependências: `F0-02` (`Done`), ADR-0001 (`Accepted`)

## Problema e resultado

O scaffold possui typecheck e build, mas ainda depende de inspeção e smoke manual para detectar regressões. F0-03 entrega um contrato local e de CI reproduzível para formatação, lint tipado, testes unitários, smoke E2E e build. Ao final, um clone limpo deve conseguir executar os mesmos gates com o lockfile, sem segredo, serviço pago obrigatório ou configuração externa ao repositório.

O resultado não declara qualidade do gameplay ainda inexistente. Ele prova que os harnesses detectam falhas reais do scaffold e estabelece pontos de extensão explícitos para as suítes dos próximos itens.

## Escopo

- Incluído:
  - ESLint em flat config para TypeScript, JavaScript de configuração e testes, com lint baseado em tipos onde houver projeto TypeScript;
  - regras estáticas que preservem as fronteiras arquiteturais já aceitas, em especial o isolamento de `src/simulation`;
  - Prettier como gate separado do lint, limitado a fontes, testes, configurações, workflow, HTML, CSS e JSON do projeto;
  - Vitest em ambiente Node por padrão, com execução não interativa e cobertura V8 disponível;
  - ao menos um teste unitário real para o erro de raiz ausente de `bootstrapApplication`, isolando a criação do Phaser e confirmando que ela não é chamada;
  - Playwright Test com Chromium headless e servidor local gerenciado pela configuração;
  - smoke E2E do shell em `320×568` e `1920×1080`, verificando carregamento, exatamente um canvas, canvas contido no viewport, ausência de overflow de documento, exceções de página e requests locais falhos;
  - scripts npm estáveis para formatar, verificar formatação, lint, typecheck de runtime e tooling/testes, unitários, cobertura, E2E, build e gate completo;
  - workflow GitHub Actions para pull requests e pushes em `main`, usando Node definido pelo repositório, `npm ci`, Chromium e os mesmos scripts locais;
  - ignores somente para artefatos gerados (`dist`, cobertura, resultados/relatórios de teste, caches e browsers locais), sem esconder fonte crítica;
  - atualização da documentação operacional com pré-requisitos, comandos e distinção entre gates locais e CI.
- Fora de escopo:
  - alterar gameplay, renderer, UI, conteúdo ou comportamento observável do scaffold, exceto uma extração/refatoração mínima e sem mudança de contrato se estritamente necessária para testar o guard de bootstrap;
  - fast-check, propriedades, PRNG, golden vectors, replay, hash ou suíte determinística (`F0-04`/`F0-05`);
  - metas numéricas definitivas de cobertura; os alvos por camada continuam em `docs/quality/QUALITY.md` e passam a ser aplicados quando essas camadas existirem;
  - harness, stress scene, FPS, memória ou budgets de bundle/assets (`F0-06`);
  - manifest, service worker, offline, instalação, deploy, preview de Pages ou teste de subpath (`F0-07`);
  - schemas e validadores de conteúdo/save (`F0-08`);
  - matriz cross-browser, screenshots visuais, todos os viewports responsivos ou aparelhos reais;
  - Dependabot, publicação de pacote, deploy, branch protection ou mudança de visibilidade/configuração do repositório;
  - backend, secrets, telemetria, contas externas ou serviços de cobertura hospedados.

## Regras e contratos

### Dependências e configuração

- Todas as novas dependências de desenvolvimento devem ser gratuitas/open source, compatíveis com Node `24.15.0` e com as versões Vite/TypeScript existentes no momento da implementação. Versões diretas devem ser exatas, sem `^`, `~`, `latest` ou tag flutuante, e o `package-lock.json` deve ser regenerado pelo npm, nunca editado manualmente.
- O conjunto mínimo esperado é ESLint, `@eslint/js`, `typescript-eslint`, Prettier, Vitest, cobertura V8 do Vitest, Playwright Test e tipos Node. Dependências DOM simuladas só podem ser adicionadas se o teste unitário realmente precisar delas e a justificativa constar nas evidências.
- Usar flat config JavaScript/MJS do ESLint. Não adotar configuração legada nem configuração TypeScript experimental para o próprio ESLint.
- Manter o `tsconfig.json` de runtime sem tipos Node. Configurações e testes devem ter um projeto TypeScript separado, por exemplo `tsconfig.test.json`, para que também sejam typechecked sem expor APIs Node ao código de browser/simulação.
- Vitest deve procurar testes unitários apenas em `tests/unit`. Playwright deve procurar apenas em `tests/e2e`. Uma ferramenta não pode coletar a suíte da outra.
- Relatórios, traces, screenshots, vídeos e cobertura são artefatos gerados e não devem ser versionados.

### Scripts públicos

O `package.json` deve expor, no mínimo, contratos equivalentes a:

| Script | Contrato |
|---|---|
| `format` | aplicar Prettier somente ao escopo declarado |
| `format:check` | verificar o mesmo escopo sem escrever |
| `lint` | executar ESLint com warnings tratados como falha |
| `typecheck` | verificar runtime e tooling/testes sem emitir arquivos |
| `test:unit` | executar Vitest uma vez, sem watch |
| `test:unit:coverage` | executar a mesma suíte com cobertura V8 e falhar se os testes falharem |
| `test:e2e` | executar Playwright Chromium headless |
| `build` | preservar typecheck seguido do build Vite |
| `check` | executar, em ordem, `format:check`, `lint`, `typecheck`, `test:unit` e `build` |

`test:e2e` fica explícito fora de `check` para não baixar/abrir browser em todo ciclo rápido. O workflow CI deve executar `check` e depois `test:e2e`; sucesso do CI exige ambos. Nenhum script pode depender de instalação global.

### Lint e fronteiras

- O lint deve cobrir `src`, testes e arquivos de configuração relevantes; `dist`, cobertura, resultados e relatórios devem ser ignorados explicitamente.
- Presets recomendados do ESLint e typescript-eslint são o baseline. Regras que exigem informação de tipo devem usar o projeto correto e não podem ser desligadas globalmente apenas para fazer o gate passar.
- Diretivas ESLint não usadas devem falhar. Novas supressões inline precisam de justificativa localizada; `@ts-ignore`, `@ts-nocheck` e `any` explícito permanecem proibidos no código da aplicação.
- Em `src/simulation/**`, o lint deve rejeitar import de Phaser e de módulos de apresentação/plataforma/adapters, além de acesso a `Math.random`, `Date.now`, timers de parede e globais de DOM/browser, rede, storage ou locale. Se uma API proibida não puder ser expressa com segurança no lint, manter uma inspeção automatizada focada e documentada no gate.
- Prettier resolve estilo; não executar Prettier como regra ESLint. O gate de formatação não deve reformatar toda a documentação histórica nem arquivos fora do escopo de F0-03.

### Testes unitários e cobertura

- O teste do bootstrap deve passar `null`, observar a mensagem estável `WWIIRun bootstrap failed: #game-root element was not found.` e provar que `createGame` não foi chamado. Mock e estado global devem ser restaurados entre testes.
- O teste não deve inicializar WebGL/Canvas real, fazer request, depender de timing ou produzir snapshot semântico vazio.
- A cobertura deve incluir arquivos de produção exercitados e gerar ao menos resumo textual. Não estabelecer threshold global artificial sobre o scaffold: Phaser e módulos ainda sem regra não devem receber testes fictícios para inflar percentuais.
- O modo watch pode permanecer acessível pelo CLI do Vitest, mas nenhum gate ou CI pode ficar aguardando interação.

### Smoke E2E

- Playwright deve iniciar e encerrar um servidor Vite local por `webServer`, em host loopback e porta conhecida, reutilizando servidor apenas fora de CI quando for seguro.
- Usar o Chromium empacotado pelo Playwright, sem depender de Chrome instalado globalmente. CI instala somente Chromium e suas dependências de sistema para limitar tempo e armazenamento.
- Em CI, usar um worker, proibir `test.only`, aplicar timeout finito e retries no máximo uma vez. Localmente, retries devem ser zero para expor flakiness.
- O smoke deve executar em `320×568` e `1920×1080`. Para cada viewport, deve aguardar o canvas por condição observável e afirmar um único canvas, dimensões positivas dentro do viewport e `scrollWidth <= clientWidth`/`scrollHeight <= clientHeight` no elemento raiz do documento.
- O teste deve coletar `pageerror` e requests locais falhos desde antes da navegação e falhar ao final se houver ocorrências inesperadas. Console warnings só devem falhar quando indicarem erro funcional; o warning de tamanho de chunk pertence ao build, não ao browser.
- Asserções funcionais são obrigatórias. Screenshot, trace e vídeo são diagnóstico, não critério substituto. Em CI, reter relatório/trace somente em falha e por período curto; eles não podem conter segredo ou dado pessoal.

### CI e segurança

- Criar um único workflow de qualidade em `.github/workflows/`, disparado por `pull_request` e push em `main`, com `permissions: contents: read`, timeout explícito e cancelamento de execução anterior da mesma branch/PR.
- Usar runner Linux padrão, nunca larger runner ou self-hosted. O workflow não pode solicitar segredo, token adicional, ambiente protegido, serviço externo ou permissão de escrita.
- Actions de terceiros/oficiais devem ser fixadas por SHA completo imutável, com comentário informando a release correspondente. Imagens/ações com tag flutuante não são aceitas.
- Instalar dependências com `npm ci`; usar a versão Node registrada em `.nvmrc`/`engines`; habilitar cache npm somente via mecanismo do setup-node e chave derivada do lockfile. Não cachear browsers Playwright.
- Ordem do job: checkout, setup Node/cache npm, `npm ci`, `npm run check`, instalação Chromium com dependências, `npm run test:e2e` e upload condicional de diagnóstico em falha. O build não pode ser ignorado após testes.
- O workflow deve ser executável sem cobrança obrigatória: GitHub-hosted standard runners são gratuitos para repositórios públicos; repositórios privados continuam sujeitos à franquia e aos limites da conta. F0-03 não altera visibilidade nem habilita gasto.
- O workflow valida, mas não publica `dist`; deploy pertence a F0-07.

### Comportamentos não funcionais

- Determinismo: o harness não cria aleatoriedade nem golden output. O lint automatiza parte do isolamento do core; a suíte determinística entra em F0-04 e só então integra o gate aplicável.
- Performance: registrar duração aproximada dos gates e não adicionar budget/FPS. O warning atual do bundle permanece aceito e rastreado para F0-06.
- UI responsiva: limitada aos dois viewports de regressão do scaffold; isso não comprova `UI-04` nem substitui a matriz completa.
- Assets: não aplicável; nenhum asset de produto é criado, baixado ou validado.
- i18n: não aplicável; o texto diagnóstico existente não vira conteúdo localizado nesta spec.
- Save/migração: não aplicável; nenhum schema ou storage é lido/escrito.
- Segurança/privacidade: CI com privilégio mínimo, dependências auditáveis e artefatos sem dados pessoais; nenhuma credencial ou telemetria.
- Offline/PWA: não aplicável como comportamento. O E2E usa servidor local; cache offline e instalação permanecem em F0-07.

## Critérios de aceitação

- [x] Given um clone limpo na versão Node do repositório, when `npm ci` e `npm run check` são executados, then formatação, lint, typecheck de runtime/tooling, unitários e build terminam com exit `0`, sem escrita inesperada no worktree.
- [x] Given um arquivo deliberadamente mal formatado ou um warning de lint em fixture/alteração temporária não versionada, when o gate correspondente roda, then ele retorna exit diferente de zero; a alteração de prova é revertida antes da entrega.
- [x] Given código temporário em `src/simulation` usando ao menos um import proibido e uma fonte de entropia/tempo proibida, when `npm run lint` roda, then ambas as violações são detectadas; a alteração de prova é revertida antes da entrega.
- [x] Given `bootstrapApplication(null)`, when o teste unitário roda, then a mensagem contratada é lançada e o mock de `createGame` registra zero chamadas.
- [x] Given a suíte unitária, when `npm run test:unit:coverage` roda, then os testes executam uma vez, falhas propagam exit não zero e um resumo V8 é emitido sem threshold fictício.
- [x] Given Chromium instalado pelo Playwright, when `npm run test:e2e` roda, then os dois viewports passam com exatamente um canvas contido no viewport, sem overflow, page errors ou requests locais falhos.
- [x] Given o Playwright config em ambiente CI, when a configuração é inspecionada/executada, then `forbidOnly` está ativo, há um worker, timeout finito, no máximo um retry e servidor local com encerramento gerenciado.
- [x] Given o workflow versionado, when ele é inspecionado, then dispara em PR/push de `main`, tem permissões somente de leitura, timeouts/concurrency, actions por SHA e nenhuma dependência de secret, serviço pago, deploy ou runner premium.
- [ ] Given execução real do workflow no GitHub Actions, when o commit/PR é processado, then `npm ci`, `check` e E2E ficam verdes; em falha E2E, diagnóstico curto é disponibilizado sem publicar o app.
- [x] A documentação lista pré-requisitos, instalação do browser, scripts, ordem dos gates, artefatos ignorados, limitações e próximo item sem declarar `DET-01`, `PERF-01`, `PWA-01` ou `COST-01` como concluído.

## Plano de teste

- unitário: Vitest cobre o guard de raiz ausente, mensagem de erro e ausência de criação do Phaser; adicionar somente testes necessários para configurações/helpers realmente introduzidos.
- determinismo: não aplicável nesta spec; executar lint/inspeção negativa das APIs proibidas em `simulation`, sem golden artificial.
- integração/E2E: Playwright Chromium contra servidor Vite local nos viewports `320×568` e `1920×1080`, com asserts de canvas, overflow, erros e requests.
- manual/performance/viewports: confirmar que scripts não entram em watch, que servidor e processos encerram após E2E e que relatórios/coverage não sujam o Git; registrar tempos apenas como baseline informativa, não como budget.
- CI: validar sintaxe e permissões do workflow por inspeção local; a evidência final exige também uma execução real no GitHub Actions. Se a sessão de implementação não tiver autorização para push, o item deve permanecer `In review` com essa pendência explícita, sem publicar mudanças autonomamente.
- comandos mínimos de evidência:

```bash
node --version
npm --version
npm ci
npm ls --depth=0
npm run format:check
npm run lint
npm run typecheck
npm run test:unit
npm run test:unit:coverage
npx playwright install chromium
npm run build
npm run test:e2e
npm run check
git status --short
```

No Linux CI, a instalação usa também as dependências de sistema (`playwright install --with-deps chromium`). O implementador deve registrar versões, comandos e resultados reais; esta lista não constitui evidência antes da execução.

## Migração e rollback

Não há dado, save, asset ou ruleset a migrar. A implementação adiciona devDependencies, configurações, testes, scripts e workflow, com possível refatoração interna mínima do bootstrap sem mudança observável.

O rollback é reverter a unidade F0-03 inteira — manifesto/lockfile, configs, testes, workflow, ignores e documentação associada — preservando o scaffold F0-02. Não deixar scripts apontando para dependências removidas, artefatos gerados versionados ou configuração parcial. Se uma ferramenta incompatível exigir troca de versão, atualizar manifesto e lockfile juntos, repetir todos os gates e registrar motivo/licença.

## Evidências de conclusão

- Arquivos e commit da unidade F0-03, incluindo manifesto/lockfile, configs, testes, workflow, ignores e documentação.
- Versões efetivas, licenças e justificativa de cada dependência direta nova; confirmação de versões exatas e ausência de serviço pago obrigatório.
- Saída resumida e exit code dos comandos mínimos, incluindo provas negativas temporárias de format/lint/fronteira e worktree limpo dessas fixtures ao final.
- Resultado dos dois viewports E2E e confirmação de encerramento do servidor; relatório/trace apenas se necessário para diagnosticar falha.
- URL/identificador e conclusão de uma execução real do GitHub Actions. A revisão independente deve reexecutar gates locais e inspecionar SHA/permissões do workflow.
- Atualizações de spec, índice, roadmap, requisitos/memória e riscos/limitações reais. Nenhum requisito apenas habilitado muda para `Done`.

### Evidências da implementação de 2026-06-27

- Ambiente: Node `v24.15.0`, npm `11.12.1`; `npm ci` instalou 154 pacotes com exit `0`; `npm ls --depth=0` confirmou a árvore direta esperada.
- Novas dependências diretas, todas com versão exata: `eslint@10.6.0` (MIT), `@eslint/js@10.0.1` (MIT), `typescript-eslint@8.62.0` (MIT), `prettier@3.9.1` (MIT), `vitest@4.1.9` (MIT), `@vitest/coverage-v8@4.1.9` (MIT), `@playwright/test@1.61.1` (Apache-2.0) e `@types/node@24.13.2` (MIT, alinhado ao Node 24 do repositório). São ferramentas locais open source; nenhuma exige conta, secret ou serviço pago.
- Gates focados com exit `0`: `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm run test:unit` (1 arquivo/1 teste), `npm run test:unit:coverage` (resumo V8, sem threshold) e `npm run build`. O build preservou o baseline de 1.200,71 kB JS/320,30 kB gzip e o warning conhecido acima de 500 kB.
- `npm run check` após `npm ci`: exit `0` em 27,57 s; nenhum arquivo-fonte gerado ou fixture negativa permaneceu no worktree.
- Provas negativas temporárias: `format:check` retornou exit `1` para arquivo mal formatado; `lint` retornou exit `1` para `no-console` em warning com `--max-warnings 0`; arquivo temporário em `src/simulation` retornou exit `1` e duas violações distintas para import de `game` e `Math.random`. Todas foram removidas via patch antes dos gates finais.
- `npx playwright install chromium`: exit `0`, Chromium 149/playwright build 1228 instalado. `npm run test:e2e`: 2/2 viewports passaram em 9,4 s; a execução final `CI=1 npm run test:e2e` passou 2/2 em 12,2 s usando um worker. O `webServer` gerenciado iniciou e encerrou; os asserts cobriram canvas, bounds, overflow, `pageerror`, `requestfailed` e respostas locais HTTP >= 400. Conexão recusada em 4173 após o gate confirmou o encerramento do servidor.
- Workflow localmente inspecionado: PR e push em `main`, `contents: read`, concurrency/cancelamento, timeout de 20 min, runner `ubuntu-latest`, actions fixadas por SHA, `npm ci` → `check` → instalação Chromium → E2E e upload de diagnóstico somente em falha por 7 dias. Não há secret, escrita, deploy, serviço externo ou runner premium.
- Pendente para a revisão: execução real do workflow no GitHub Actions, pois esta sessão não recebeu autorização para commit/push. O nono critério permanece desmarcado por esse motivo.

### Evidências da correção de 2026-07-01

- TDD reproduziu os findings antes da configuração: `npm run test:unit -- tests/unit/eslintConfig.test.ts --reporter=verbose` falhou 2/3, com zero diagnósticos para `globalThis.Math.random()` e `../../../game/createGame`; o controle `../../../shared/value` permaneceu permitido. Após a correção, o mesmo comando passou 3/3.
- O override agora proíbe `globalThis` no núcleo e usa regex ancorado para qualquer quantidade de segmentos `../` rumo a `app`, `game`, `platform` ou `services`, preservando as restrições de Phaser. Uma fixture temporária no terceiro nível de `src/simulation` fez o ESLint real falhar com exatamente `no-restricted-imports` e `no-restricted-globals`; a fixture foi removida antes dos gates finais.
- Ambiente reproduzido com Node `v24.15.0` e npm `11.12.1`; `npm ci` instalou 154 pacotes, `npm ls --depth=0` passou e não houve mudança em dependência, manifesto ou lockfile.
- `npm run test:unit:coverage` passou 191/191 e emitiu resumo V8. `npm run check` passou com 191 unitários, 7 determinísticos, validator de conteúdo, build e budget; o warning conhecido do chunk Phaser permaneceu inalterado.
- A execução final `CI=1 npm run test:e2e` passou 6/6 testes de produto e 1/1 harness de performance. Duas tentativas anteriores expuseram risco preexistente do harness F0-06: uma excedeu 30 s sob contenção e outra reutilizou em `127.0.0.1:8080` um servidor alheio (“Titan Code Hero”) por `reuseExistingServer: true`; o harness isolado passou e o gate completo passou depois que as portas foram confirmadas livres. Nenhum arquivo F0-06 foi alterado.
- O commit `78ce175` contém somente as regras ESLint, três regressões, plano e lifecycle de F0-03 sobre o baseline `b2390a5`. O range `b2390a5..HEAD` não altera dependências, lockfile, workflow, runtime do produto, `src/simulation`, goldens ou baselines; o rollback preserva F0-04/F0-05/F0-06/F0-08 existentes no baseline.
- Antes do push, os 12 commits de `origin/main..c35266b` foram reescritos sem mudar suas árvores para corrigir autor e committer de `matiello <matiello@gmail.com>` para `Codex <codex@openai.com>`. A árvore do merge predecessor `c35266b` é idêntica à do sucessor publicado `2e8ba300a03b2e81759797e57ef4bc7ac9a0bac5`; o push fast-forward atualizou `origin/main` de `1d75de7` para `2e8ba30`.
- Verificação local fresca no sucessor: `npm run check` passou com 191 unitários, 7 determinísticos, validator, build e budget; `CI=1 npm run test:e2e` passou 6/6 testes de produto e 1/1 harness de performance; `git diff --check` passou.
- Execução remota: o proprietário inspecionou diretamente o repositório privado e confirmou que o workflow `Quality`, disparado pelo push de `2e8ba30`, concluiu com sucesso. Referência autenticada: `https://github.com/insight-x-lab-technologies/WWIIRun/commit/2e8ba300a03b2e81759797e57ef4bc7ac9a0bac5/checks`. O ID numérico da run não ficou disponível ao agente porque a única credencial do ambiente é uma deploy key sem permissão de leitura de Actions; a confirmação humana e o SHA processado ficam registrados como evidência, sem alegar inspeção de logs pelo agente.
- A execução real foi confirmada pelo proprietário, mas a revisão independente não conseguiu consultar run, jobs ou logs: o conector GitHub retornou `404` para o SHA no repositório privado e não há ID numérico da run. A confirmação humana e a URL do commit permanecem registradas, sem serem tratadas como inspeção executável pelo revisor.

### Evidências da correção F0-03-BOUNDARY-02 de 2026-07-01

- TDD reproduziu os quatro bypasses documentados: o teste focado falhou 4/7 para prefixo `./`, normalização `segmento/..`, `import()` e `self`, enquanto os três controles anteriores passaram. Após a correção, a suíte focada passou 8/8, incluindo `import()` computado rejeitado de forma fail-closed.
- O override de `src/simulation` agora resolve specifiers relativos contra o arquivo de origem e compara o destino normalizado com as raízes `src/app`, `src/game`, `src/platform` e `src/services`. A regra cobre imports, reexports e `import()`; `self` foi acrescentado aos globais proibidos. A regra lexical anterior permanece como defesa adicional.
- Uma fixture temporária real em `src/simulation/random/internal` produziu exit `1`, com dois diagnósticos `simulation-boundaries/no-external-imports` para import estático/dinâmico equivalentes e dois `no-restricted-globals` para `self`; a fixture foi removida antes dos gates finais.
- Ambiente: Node `v24.15.0`, npm `11.12.1`; `npm ci` instalou 154 pacotes e `npm ls --depth=0` confirmou as versões diretas sem mudança em manifesto ou lockfile. Coverage passou 196/196; `npm run check` cobriu 196 unitários, 7 determinísticos, typechecks, validator, build e budget; `CI=1 npm run test:e2e` passou 6/6 produto e 1/1 harness.
- `F0-03-CI-02` permanece aberto: a consulta read-only de runs para `2e8ba30` retornou novamente `404`. Não houve push nem disparo remoto sem autorização, e nenhum ID/URL de run, job ou log verificável ficou disponível nesta sessão.

## Base técnica verificada

- ESLint documenta flat config como formato atual; typescript-eslint documenta os presets com informação de tipo e o custo associado ao typed linting.
- Vitest documenta `vitest run` para execução não interativa e cobertura V8 por provider separado.
- Playwright recomenda `npm ci`, instalação do browser/dependências e um worker em CI; instalar somente Chromium reduz download e armazenamento.
- GitHub documenta que standard GitHub-hosted runners são gratuitos em repositórios públicos; repositórios privados têm franquia/limites conforme o plano, e larger runners são cobrados.

Fontes consultadas em 2026-06-27: [ESLint flat config](https://eslint.org/docs/latest/use/configure/configuration-files), [typescript-eslint typed linting](https://typescript-eslint.io/getting-started/typed-linting/), [Vitest CLI](https://vitest.dev/guide/cli), [Vitest coverage](https://vitest.dev/guide/coverage.html), [Playwright CI](https://playwright.dev/docs/ci), [Playwright best practices](https://playwright.dev/docs/best-practices) e [GitHub Actions billing](https://docs.github.com/en/actions/concepts/billing-and-usage).

## Histórico de revisão

- 2026-06-27 — especificação inicial criada; F0-02 confirmado como `Done`, sem bloqueio ou decisão humana pendente; fontes oficiais das ferramentas e do modelo gratuito de CI verificadas; nenhum código, dependência ou teste alterado/executado; aguardando aprovação humana.
- 2026-06-27 — aprovação humana registrada; implementação iniciada.
- 2026-06-27 — toolchain, regras de fronteira, testes e workflow implementados; gates locais e E2E verdes; item movido para `In review`, pendente execução real do workflow e revisão independente.
- 2026-06-27 — revisão independente: `Changes requested`. Findings: **High** — o override de `src/simulation` pode ser contornado por `globalThis.Math.random()` e por imports relativos válidos a partir do terceiro nível, por exemplo `../../../game/createGame`; ambos passaram no ESLint com exit `0`, portanto o gate não garante o isolamento exigido. **High** — não há commit/diff isolado de F0-03 nem execução real do GitHub Actions: `git status` mostra F0-02/F0-03 juntos como mudanças não versionadas, `main...origin/main [gone]`, e nenhum URL/identificador de run foi fornecido; a consulta remota também não pôde ser autenticada. Checks independentes: Node `v24.15.0`, npm `11.12.1`; `npm ci`, `npm ls --depth=0`, `format:check`, `lint`, typechecks, unitário (1/1), cobertura V8, build e `npm run check` passaram; `CI=1 npm run test:e2e` passou 2/2 em 12,8 s fora do sandbox; provas negativas de formatação, warning, import simples e `Math.random` simples falharam como esperado e as fixtures foram removidas. O critério de execução real do workflow continua não atendido. Próxima ação: reforçar as restrições contra acessos/imports equivalentes, adicionar regressões automatizadas para os bypasses, organizar unidades versionadas rastreáveis e obter uma run real verde do workflow antes de nova revisão.
- 2026-07-01 — findings locais corrigidos por TDD no commit `78ce175`: acessos via `globalThis` e imports relativos profundos agora falham, regressões automatizadas cobrem ambos e o range sucessor de `b2390a5` isola a correção F0-03. Gates locais passaram e o item retornou para `In review`. A execução real do Actions permaneceu pendente naquele momento e não houve push por instrução explícita do proprietário.
- 2026-07-01 — segunda revisão independente: `Changes requested`. O range predecessor `fec1d5a..c35266b`, depois reescrito sem mudança de árvore como `b2390a5..2e8ba30`, isola e corrige os dois bypasses locais anteriores; as três regressões focadas, `npm ci`, `npm ls --depth=0`, coverage (191/191), `npm run check` (191 unitários, 7 determinísticos, validator, build e budget), o smoke de produto (6/6) e `git diff --check` passaram. **High — F0-03-CI-01:** o nono critério continuava sem evidência executável porque o merge ainda não havia sido publicado. O smoke adicional de performance F0-06 passou somente no retry de CI após timeout de 30 s; é risco preexistente fora deste diff, não finding de F0-03.
- 2026-07-01 — correção externa `F0-03-CI-01`: com autorização do proprietário, os 12 commits ainda locais tiveram autor/committer corrigidos para Codex e foram publicados até `2e8ba30`, sucessor de árvore idêntica a `c35266b`. O proprietário confirmou diretamente no GitHub privado que o workflow `Quality` desse SHA concluiu verde. O nono critério foi marcado atendido e o item retornou para `In review`, aguardando nova revisão independente.
- 2026-07-01 — terceira revisão independente: `Changes requested`. **High — F0-03-BOUNDARY-02:** a restrição lexical ainda aceita imports equivalentes por prefixo `./`, normalização com `segmento/..` e `import()` dinâmico, além de permitir `self.Math.random()`/`self.fetch()`; uma fixture temporária sob `src/simulation` passou no ESLint real com exit `0`, portanto o terceiro critério foi reaberto. **High — F0-03-CI-02:** `2e8ba30` está em `origin/main` e o proprietário confirmou `Quality` verde, mas a consulta independente do Actions retornou `404` e não há run ID/job/log verificável; pela regra fail-closed da revisão, o nono critério foi reaberto. Checks independentes: Node `v24.15.0`, npm `11.12.1`; `npm ci`, `npm ls --depth=0`, regressões existentes 3/3, coverage 191/191, `npm run check` com 191 unitários/7 determinísticos/validator/build/budget, E2E 6/6 produto + 1/1 harness, `git diff --check` e worktree sem fixture passaram. O range `b2390a5..2e8ba30` permanece isolado e sem dependência, lockfile, runtime, simulation, golden ou baseline alterado.
- 2026-07-01 — `F0-03-BOUNDARY-02` corrigido por TDD com resolução semântica de imports, cobertura de import estático/dinâmico/computado e proibição de `self`; gates locais passaram. `F0-03-CI-02` continua aberto porque o conector retornou `404` e a sessão não possui run/job ID verificável nem autorização para push. O item permanece `In progress` até obter essa evidência externa.
