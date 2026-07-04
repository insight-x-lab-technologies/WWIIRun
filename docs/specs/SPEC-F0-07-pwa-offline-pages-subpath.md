# SPEC-F0-07: shell PWA offline e preview GitHub Pages em subpath

Status: Done
Owner: proprietário do projeto
Requisitos: `PWA-01` (fundação parcial); `DIST-01` (preview parcial); `COST-01` (evidência parcial); `UI-04` (regressão do shell existente)
Dependências: `F0-03` (`Done`), ADR-0001 (`Accepted`), ADR-0006 (`Accepted`), ADR-0008 (`Accepted`), ADR-0009 (`Accepted`)

## Problema e resultado

O build atual só funciona como site Vite servido da raiz: não possui manifest instalável, service worker, contrato de atualização, prova offline nem configuração exercitada para `/WWIIRun/`. Também não existe workflow de preview do artefato estático. Isso impede demonstrar o exit de F0 — app vazio instalável e deployável — e deixa uma atualização futura livre para misturar versões durante uma run.

F0-07 entrega um shell PWA mínimo, instalável em Chromium, que precacheia somente o app shell/core emitido pelo build, recarrega offline após uma primeira visita completa e mantém o service worker confinado ao base path configurado. Uma atualização pode ser anunciada imediatamente, mas só assume controle após ação explícita fora de uma run. O mesmo artefato é construído e testado sob `/WWIIRun/` e pode ser publicado manualmente como preview por GitHub Pages sem secrets ou serviço pago obrigatório.

O resultado é fundacional. Não conclui instalação em todos os browsers/aparelhos, persistência de save, UI final, distribuição itch.io ou lojas futuras; por isso `PWA-01`, `DIST-01`, `COST-01` e `UI-04` permanecem `Planned` após F0-07.

## Escopo

- Incluído:
  - `vite-plugin-pwa`/Workbox como dependência de desenvolvimento direta, gratuita/open source, em versão exata compatível com Vite 8 e Node 24;
  - manifest com identidade técnica provisória, `id`, `start_url`, `scope`, `display: standalone`, `orientation: any`, cores e ícones PNG instaláveis normal/maskable;
  - ícones técnicos provisórios, sem símbolos históricos nem pretensão de identidade visual final, catalogados conforme F0-08 com ficha, proveniência, evidência de licença, tamanho, dimensões declaradas e SHA-256;
  - `generateSW` com precache revisionado do HTML, CSS, JS e assets core emitidos; fallback de navegação somente dentro do escopo; limpeza de caches obsoletos na ativação;
  - registro por prompt, estado observável de `offline ready`/`update available`/erro e coordenação que impede ativar uma versão nova durante uma run;
  - aviso DOM mínimo, acessível e responsivo para atualização/offline, sem customizar o prompt nativo de instalação;
  - base path público explícito e validado, com `/` no desenvolvimento/build local e `/WWIIRun/` no build Pages;
  - build de produção e smoke Playwright específicos de PWA sob subpath, incluindo instalação estrutural, scope, reload offline e regressão de viewport;
  - teste de atualização entre dois artefatos/version IDs no mesmo origin, provando espera durante run e ativação após a fronteira segura;
  - workflow Pages separado, manual (`workflow_dispatch`), com permissões mínimas, gate completo, build do subpath, upload do `dist` e deploy do artefato exato;
  - documentação de build, preview local, limpeza de service worker/cache, atualização segura e passos externos para habilitar/executar Pages.
- Fora de escopo:
  - gameplay, rotas/telas de produto, perfil, settings, save, IndexedDB, `StorageManager.persist()`, sync ou fila offline;
  - cache de API, Supabase, conteúdo remoto, packs cosméticos, replay, leaderboard ou qualquer resposta cross-origin;
  - shortcuts do manifest antes de existirem destinos úteis e estáveis;
  - prompt de instalação customizado, analytics de instalação, push, background sync, periodic sync ou notificações;
  - identidade visual final, nome comercial definitivo, splash/store art ou aprovação editorial dos ícones provisórios;
  - i18n completa; o aviso mínimo usa inglês como locale padrão até o sistema de F4/F7;
  - hash router, deep links de telas inexistentes, fallback `404.html`, itch.io ou wrappers de lojas;
  - publicar o preview, habilitar Pages nas configurações do repositório, alterar domínio/DNS ou executar workflow sem autorização explícita;
  - tornar o deploy automático em todo push, criar environment de produção ou adicionar secrets;
  - alterar `simulation`, regras, `rulesetVersion`, `contentVersion`, PRNG, goldens ou baselines físicos F0-06.

## Regras e contratos

### Estratégia de build e dependência

- Adotar a decisão aceita no ADR-0009: `vite-plugin-pwa@1.3.0` com estratégia `generateSW`, registro por prompt e Workbox limitado a precache. A implementação deve confirmar o peer de Vite `^8`, registrar a árvore realmente instalada e auditar o lockfile antes de aceitar a dependência; eventual troca de versão exige atualizar e reapresentar a spec/ADR.
- Não instalar gerador de assets, framework de UI, servidor estático ou pacote de runtime adicional. Ícones são produzidos uma vez a partir de fonte versionada e validados como arquivos do projeto; a aplicação não gera imagens em runtime.
- Configuração PWA pertence a `vite.config.ts`; coordenação de lifecycle/browser pertence a `src/platform/pwa/`; apresentação mínima pertence a `src/app/`. `simulation`, `game`, `content` e `services` não importam o adapter PWA.
- O service worker é artefato de produção. O dev server não registra worker, evitando cache persistente sobre HMR. E2E PWA usa build + servidor de preview/fixture em origin isolado, nunca o fluxo `npm run dev` existente.
- O build continua reproduzível e sem fonte de tempo/entropia injetada. `WWIIRUN_BUILD_ID` é uma entrada explícita obrigatória em produção/Pages, aceita token ASCII `[A-Za-z0-9._-]{1,64}` (SHA/tag); build local usa `local` por default. O valor é exposto apenas como metadado de build no shell para diagnóstico/E2E A-B, não usa `Date.now()` e não altera regras, estado ou hash da simulação.

### Base path e URLs

```ts
type PublicBasePath = `/${string}/`;

declare function parsePublicBasePath(value: string | undefined): PublicBasePath;
```

- A variável pública chama-se `WWIIRUN_BASE_PATH`. Ausente significa `/`; Pages fornece exatamente `/WWIIRun/`.
- O parser aceita `/` ou path absoluto com slash inicial/final e segmentos URL seguros. Rejeita origin/URL completa, backslash, query, fragment, `.`/`..`, slash duplicado e valor sem delimitadores; falha o build com mensagem que nomeia a variável.
- `base`, manifest `id`/`start_url`/`scope`, registro do worker, ícones e fallback de navegação derivam da mesma fonte. Não concatenar `/WWIIRun/` em módulos diferentes.
- O build Pages não pode emitir referência local começando em `/assets`, `/src`, `/manifest.webmanifest`, `/sw.js` ou outro root path fora de `/WWIIRun/`. URLs externas não são introduzidas.
- O service worker só controla o base configurado. Navegação fora de seu scope não recebe shell nem fallback.

### Manifest e assets de instalação

- Manifest mínimo:
  - `name`/`short_name`: nome técnico provisório `WWIIRun`;
  - `id`, `start_url` e `scope`: relativos ao base canônico e estáveis;
  - `display: "standalone"`, `orientation: "any"`, `lang: "en"` e `prefer_related_applications: false`;
  - `theme_color`/`background_color`: cores técnicas compatíveis com o shell escuro atual, explicitamente não finais;
  - ao menos PNG opaco `192×192`, PNG opaco `512×512` e PNG `512×512` com `purpose: "maskable"`, respeitando a safe zone. O mesmo arquivo pode declarar `any maskable` somente se passar inspeção de crop; preferir entradas separadas para evidência clara.
- `index.html` referencia manifest e `apple-touch-icon` por URLs derivadas do base. O favicon data URI vazio atual deve ser removido ou substituído por asset catalogado; não pode permanecer como identidade falsa.
- Criar uma ficha em `docs/assets/specs/` e entradas no catálogo core para cada arquivo PNG runtime. A fonte editável e o método de exportação ficam documentados; hashes/tamanhos/dimensões declaradas conferem no `content:validate`.
- Os ícones técnicos provisórios são dedicados pelo proprietário ao domínio público sob `CC0-1.0`. A ficha registra essa expressão e a proveniência da fonte versionada. A identidade final continua reservada e substituirá estes assets em item futuro sem mudar o contrato PWA.
- Shortcuts ficam ausentes: o shell ainda não possui rotas úteis estáveis. Não criar destinos fictícios apenas para preencher o manifest.

### Cache, offline e erros

- `generateSW` precacheia somente arquivos locais emitidos do app shell/core e ícones declarados. Não configurar runtime caching genérico, `NetworkFirst` de APIs, cache cross-origin ou captura de requests Supabase.
- O HTML/fallback de navegação atende apenas requests `GET` de navegação dentro do scope. Requests de arquivo inexistente, método não `GET` e navegação fora do scope falham normalmente; o worker não converte 404 arbitrário em 200.
- Primeira abertura exige rede. `offline ready` só é anunciado após instalação/precaching concluído. Se instalação ou registro falhar, a aplicação continua online sem PWA, registra estado técnico sanitizado e oferece retry/reload sem loop.
- Depois de uma visita online concluída, reload de `/WWIIRun/` offline deve iniciar a aplicação, renderizar exatamente um canvas e carregar todo recurso core necessário sem network. Conteúdo social/remoto futuro degrada separadamente.
- Caches possuem prefixo estável do projeto e revisão gerenciada por Workbox. Caches obsoletos são removidos quando a nova versão ativa; não apagar Cache Storage de outros apps/origins nem IndexedDB/localStorage.
- Não solicitar storage persistente em F0-07: não há save persistido e um prompt agora seria prematuro. F4-03 assume eviction/backup/sync.

### Atualização entre runs

```ts
type PwaLifecycleStatus =
  | "unsupported"
  | "registering"
  | "online-only"
  | "offline-ready"
  | "update-available"
  | "update-deferred"
  | "activating-update"
  | "error";

interface PwaUpdateCoordinator {
  readonly status: PwaLifecycleStatus;
  setRunActive(active: boolean): void;
  requestUpdate(): Promise<void>;
  subscribe(listener: (status: PwaLifecycleStatus) => void): () => void;
  destroy(): void;
}
```

- Nomes podem variar, mas os estados e comportamentos observáveis devem permanecer equivalentes. A API usa browser APIs somente em `platform` e aceita o registrador/ativador por injeção para teste unitário.
- `onNeedRefresh` anuncia atualização; não chama `skipWaiting`, `updateSW(true)` ou reload automaticamente.
- Se não há run ativa, ação explícita `Update now` ativa o worker em espera e recarrega uma vez quando o novo controller assumir. `Later` fecha o aviso sem descartar o worker em espera.
- Se há run ativa, `requestUpdate()` muda para `update-deferred` e não ativa/recarrega. A atualização pendente volta a ser oferecida/aplicada somente quando `setRunActive(false)` sinalizar a fronteira segura. O coordenador não lê `RunState`, não importa `simulation` e não adivinha atividade por DOM/Phaser.
- Como o scaffold F0 não inicia uma run de produto, o composition root integra um provider inicialmente inativo e documenta o ponto obrigatório para F1. Testes exercitam o estado ativo; ausência de gameplay não pode apagar o contrato.
- `destroy()` remove listeners/subscriptions e torna callbacks tardios no-op. Chamadas repetidas são idempotentes. Rejeição do registrador/ativador entra em `error`, não gera unhandled rejection nem reload loop.
- O aviso DOM usa `role="status"` para prontidão e região/controle acessível para update, foco visível, botões com pelo menos `44×44 CSS px`, safe-area e sem overflow nos dois viewports existentes. Não cobre canvas nem introduz animação obrigatória. Texto mínimo em inglês é temporário e listado para migração futura a i18n.

### Preview GitHub Pages

- Criar workflow separado, por exemplo `.github/workflows/pages-preview.yml`, acionado somente por `workflow_dispatch`. O implementador não o executa nem habilita Pages sem autorização explícita.
- Permissões mínimas: leitura de conteúdo no job de build; `pages: write` e `id-token: write` apenas onde exigido pelo deploy oficial. Usar environment `github-pages`, concurrency sem duas publicações simultâneas e actions oficiais fixadas por SHA.
- Pipeline: checkout → Node do repositório → `npm ci` → gate local → Chromium/E2E aplicável → build com `/WWIIRun/` → inspeção PWA/subpath → `configure-pages`/`upload-pages-artifact` → `deploy-pages`. Somente `dist` é publicado; fonte, coverage, saves, relatórios e secrets ficam fora.
- O workflow não usa branch `gh-pages`, token pessoal, action comunitária de deploy, runner pago ou secret. Uma futura automação por push exige revisão própria.
- Evidência remota para fechar F0-07 requer autorização do proprietário e deve registrar run/job/SHA/URL, resposta `200` em `/WWIIRun/`, MIME do manifest, HTTPS, scope do worker e headers de `index.html`, manifest e worker. Arquivo não-hash crítico não pode receber cache `immutable`; limitação de headers do Pages deve ser registrada e não mascarada.
- Alterar configuração do repositório para “GitHub Actions” é passo externo documentado, não ação implícita desta spec.

### Comportamentos não funcionais

- Determinismo: worker, build ID, status online/offline, base, locale, viewport e instalação nunca entram em `RunConfig`, `RunState`, PRNG ou hash. Goldens F0-04/F0-05 ficam byte a byte intactos.
- Performance: o worker não roda lógica por frame e não adiciona pacote ao bundle de runtime além do pequeno registrador. Novos JS/assets entram nos budgets F0-06 existentes; thresholds e baselines não mudam. Precache não inclui source maps, reports ou harness.
- UI responsiva: aplicável ao aviso mínimo nos viewports `320×568` e `1920×1080`, safe areas e standalone. A cobertura ampla de `UI-04` permanece futura.
- Assets: aplicável aos ícones provisórios; catálogo/ficha/licença/proveniência/integridade são obrigatórios. Nenhuma arte de gameplay é criada.
- i18n: parcial. Manifest e aviso usam `en` provisoriamente; nenhum framework/catalogo de mensagens é criado. Registrar as strings para migração em F4/F7.
- Save/compatibilidade: não aplicável; nenhum save/storage/migração. Atualização não pode limpar dados de origem existentes.
- Segurança/privacidade: nenhum secret, telemetria, dado pessoal ou cache cross-origin. O preview publica apenas arquivos estáticos. Erros mostrados ao usuário não expõem paths/tokens.
- Offline: central para o app shell depois da primeira visita; backend/social/packs remotos ficam fora e não são alegados como offline.

## Critérios de aceitação

- [x] Given build local sem variável, when `npm run build` roda, then base `/` é usado, manifest/worker/ícones são emitidos e os gates existentes continuam verdes.
- [x] Given build com base `/WWIIRun/`, when o `dist` é inspecionado e servido, then toda referência local e o scope permanecem no subpath, sem request root-relative fora dele.
- [x] Given base inválido (URL, traversal, backslash, query, slash ausente/duplicado), when a config é avaliada, then o build falha cedo com diagnóstico estável que nomeia a entrada.
- [x] Given manifest emitido, when validado, then contém os campos instaláveis, ícones PNG `192×192`/`512×512` e maskable com respostas corretas; manifest, HTML e catálogo concordam sobre paths/tipos.
- [x] Given ícones provisórios, when `content:validate` e inspeção de assets rodam, then ficha, expressão de licença aprovada, proveniência, hashes, tamanhos e dimensões estão completos; nenhuma identidade final é alegada.
- [x] Given primeiro acesso online concluído, when o browser fica offline e recarrega `/WWIIRun/`, then o shell inicia, um canvas funcional aparece e nenhum recurso core obrigatório depende da rede.
- [x] Given primeira abertura totalmente offline em contexto limpo, when a página é acessada, then a falha é esperada/documentada e não é reportada como offline-ready falso.
- [x] Given request fora do scope, arquivo inexistente ou método não `GET`, when passa pelo origin, then o worker não responde com o shell indevidamente nem controla caminho fora do base.
- [x] Given versão B disponível sem run ativa, when o usuário aceita atualizar, then B ativa e a página recarrega uma única vez sob o mesmo subpath; caches obsoletos de A são removidos sem tocar storage alheio.
- [x] Given versão B disponível durante run ativa, when o usuário solicita update, then nenhuma ativação/reload ocorre; when a run termina, then a atualização volta a ser aplicável e só então assume controle.
- [x] Given registro/ativação rejeitado, callback tardio ou `destroy()` repetido, when o lifecycle roda, then não há unhandled rejection, listener vazado, reload loop ou crash do jogo online.
- [x] Given aviso PWA nos viewports mobile/desktop e standalone, when estados offline/update são exibidos, then controles são acessíveis, têm alvo mínimo, respeitam safe area e não causam overflow/cobertura permanente do canvas.
- [x] Given auditoria de imports e corpora, when F0-07 está presente, then `simulation` não importa browser/PWA, nenhum campo competitivo muda e os goldens Node/Chromium permanecem idênticos.
- [x] Given gates completos, when dependência/lock/build/budget são auditados, then versões são exatas, não há pacote pago/secret, `content:validate`, budgets F0-06, quality e E2E passam sem afrouxar thresholds.
- [x] Given workflow manual Pages, when inspecionado antes de qualquer execução, then usa actions oficiais fixadas, permissões mínimas, artifact `dist`, base `/WWIIRun/` e nenhum trigger automático/secret/branch de publicação.
- [x] Given autorização externa e run real do workflow, when o preview é aberto por HTTPS, then URL/SHA/run/job são registráveis, o shell carrega no subpath, instala em Chromium suportado e recarrega offline; MIME/headers críticos não impedem atualização.
- [x] A documentação explica primeira instalação, offline, update entre runs, limpeza/recovery, build subpath, preview manual e limites de browser/Pages sem marcar os quatro requisitos amplos como `Done`.

## Plano de teste

- unitário:
  - parser de base com tabela válida/inválida e derivação única de URLs;
  - coordinator com registrador fake: estados, subscribe/unsubscribe, run ativa/inativa, defer/apply, erro, callbacks tardios, idempotência e destroy;
  - view-model/controller do aviso, sem depender de service worker real;
  - configuração/manifest serializado, paths de ícones e invariantes de cache.
- determinismo:
  - executar corpora F0-04/F0-05 sem alterar expected;
  - provar por imports/tipos que PWA/build ID/base não alcançam `simulation` nem estado/hash;
  - comparar goldens antes/depois e falhar se houver diff.
- integração/E2E:
  - build real padrão e build real `/WWIIRun/`, com inspeção do `dist`, manifest, precache e ausência de root leaks;
  - Playwright Chromium sobre produção/subpath com context limpo: registro/scope, online → offline → reload, canvas e requests core;
  - servidor/fixture controlável no mesmo origin para alternar artefatos A/B e provar worker waiting, defer durante run, ativação/reload única e cleanup;
  - request negativo fora do scope/404/método e falha de primeira abertura offline;
  - regressão do smoke existente nos dois viewports e modo standalone quando emulável.
- manual/performance/viewports:
  - DevTools Application: manifest, ícones/maskable, scope, caches, offline e atualização;
  - instalação manual em Chromium desktop suportado e abertura standalone; instalação Safari/iOS/Android real fica como risco/futuro, não evidência inventada;
  - inspeção de crops/safe zone dos ícones técnicos e dos dois viewports existentes;
  - `performance:budget` com bytes novos registrados, sem mudar thresholds/baselines;
  - após autorização, inspecionar URL Pages, HTTPS, MIME e Cache-Control dos quatro artefatos críticos.
- comandos mínimos de evidência:

```bash
npm ci
npm ls --depth=0
npm run content:validate
npm run test:unit -- --run tests/unit/pwaConfig.test.ts tests/unit/pwaUpdateCoordinator.test.ts tests/unit/pwaNotice.test.ts
npm run test:unit:coverage -- --run tests/unit/pwaConfig.test.ts tests/unit/pwaUpdateCoordinator.test.ts tests/unit/pwaNotice.test.ts
npm run test:determinism
npm run build
WWIIRUN_BASE_PATH=/WWIIRun/ WWIIRUN_BUILD_ID=pages-evidence npm run build
npm run check
CI=1 npm run test:e2e
npm run test:pwa
git diff --check
git status --short
```

Os nomes dos arquivos unitários podem ser repartidos sem mudar as responsabilidades; `WWIIRUN_BASE_PATH`, `WWIIRUN_BUILD_ID` e `test:pwa` são contratos públicos desta spec. Nenhum comando, instalação, run do Actions, instalação PWA manual ou URL é evidência antes de ser realmente executado.

## Migração e rollback

Não há PWA/service worker anterior nem save persistido a migrar. A primeira instalação cria caches apenas para o origin/scope atual. O novo build deve incluir rotina padrão de limpeza de caches obsoletos e documentação para remover manualmente worker/cache durante desenvolvimento.

Rollback seguro reverte, em uma unidade, plugin/lockfile/config, módulos `platform/app`, ícones/catalog/ficha, testes/scripts, workflow Pages, ADR-0009 e documentação. Antes de retirar o worker de um ambiente já publicado, publicar por ao menos um ciclo um worker de desativação que assuma controle, remova somente caches WWIIRun e faça `unregister`; simplesmente apagar `sw.js` pode deixar clientes sob o worker antigo. Essa publicação de rollback também exige autorização externa.

Mudar no futuro o base/origin ou manifest `id` pode criar outra instalação e outro storage scope; exige plano de migração próprio. Substituir ícones provisórios preserva `id`, `start_url` e scope. Alteração incompatível de cache/worker deve mudar o contrato/versionamento e repetir o E2E A/B; nunca atualizar expected sem explicar a compatibilidade.

## Evidências de conclusão

- Implementação local concluída em 2026-07-02 e movida para `In review`; nenhuma publicação, habilitação de Pages ou execução do workflow foi realizada/autorizada.
- `vite-plugin-pwa@1.3.0` MIT instalado exatamente; peer inclui Vite `^8.0.0`, árvore direta usa Vite `8.1.0`; instalação e `npm audit --offline` reportaram 0 vulnerabilidades. A consulta online posterior ficou sem resposta e foi encerrada, sem substituir a evidência offline/instalação.
- Ícones `192×192`, `512×512` e maskable `512×512` exportados da fonte SVG, catalogados com `CC0-1.0`, dimensões, bytes e SHA-256; `content:validate` validou o documento core.
- RED/GREEN: 29 testes iniciais falharam por módulos ausentes e passaram após config/coordinator/aviso; o E2E offline revelou precache vazio por PNGs duplicados e a auditoria final encontrou a mesma classe no build `/` via inclusão automática do manifest. `includeManifestIcons: false` e uma regressão no inspector eliminam duplicatas nas duas bases. O budget de subpath revelou resolução física incorreta e passou após regressão focada.
- `npm run check`: 16 arquivos/255 testes unitários, 7 determinísticos, typecheck, build `/`, inspector e budget verdes. Build local: JS principal 1.205.896 bytes raw/320.831 gzip, payload inicial 333.687, core 1.315.171 bytes.
- `WWIIRUN_BASE_PATH=/WWIIRun/ WWIIRUN_BUILD_ID=pages-evidence npm run build`: inspector e budget verdes; JS principal 1.205.937 raw/320.844 gzip, payload inicial 333.748, core 1.315.300 bytes.
- `npm run test:unit:coverage`: 255/255; `config.ts` 100% e núcleo random/run preservado em 100%; coverage focada por risco complementada pelos E2E do adapter DOM/service worker.
- `CI=1 npm run test:e2e`: 6/6 produto + 1/1 harness; `npm run test:pwa`: 8/8 nos viewports `320×568` e `1920×1080`, cobrindo manifest/scope, precache/offline, primeira visita offline, requests negativos, run ativa, reload único, cleanup de A e cache alheio preservado. Chromium headless não aceitou emulação/`--app` como `display-mode: standalone` e não há Xvfb/display local; essa parte permanece sem alegação de passe.
- `npm ls --depth=0`, `git diff --check` e diff de `src/simulation`/goldens verdes. Workflow manual foi validado por teste estático com actions oficiais fixadas por SHA e não foi executado.
- Critério remoto Pages permanece aberto por instrução explícita do proprietário. Evidência futura autorizada deve conter URL/run/job/SHA, HTTPS, instalação e headers/MIME/cache críticos.
- Correção de 2026-07-03: `42c5e66` materializa o fechamento documental aprovado de F0-03; a unidade sucessora contém somente F0-07 e pode ser revertida sem reabrir o predecessor. Nenhum push foi realizado.
- RED/GREEN dos findings: a regressão de porta encontrou `8080` antes de mover apenas o smoke interno para `127.0.0.1:8081`; a inspeção Chromium encontrou alpha mínimo `0` nos três PNGs antes de tornar o fundo SVG integral. Após a correção, os três assets retornam alpha mínimo/máximo `255`, catálogo/hashes/bytes conferem e `content:validate` passa.
- Evidência UI local ampliada nos dois viewports: CDP injeta safe areas não nulas, o aviso respeita os quatro insets, o foco visível mede outline sólido de `3px`, `Later` remove o overlay e o canvas permanece renderizado. O manifest continua declarando `display: standalone`; Chromium headless não emula uma janela instalada, portanto standalone físico permanece sem alegação de passe.
- Gates da correção: `npm ci` instalou 460 pacotes; árvore direta e audit offline (0 vulnerabilidades); focados 36/36; `npm run check` com 256 unitários, 7 determinísticos, build `/`, inspector e budgets; coverage 256/256 com random/run 100%; build `/WWIIRun/`; E2E produto 6/6 e harness 1/1 permanentemente em `8081`; PWA 10/10 nos dois viewports. `8080` permanece padrão exclusivo do harness manual/`./scripts/run.sh` conforme o fluxo do operador.
- Evidência remota autorizada em 2026-07-03: Pages está público com `build_type=workflow` e HTTPS enforced em `https://insight-x-lab-technologies.github.io/WWIIRun/`. Após uma falha transitória de deploy no run `28687330470`, o run `28687578396` no SHA `4440b7a` concluiu `success`; job build `85082963223` passou gate, Chromium, E2E, PWA, build, configure e upload, e job deploy `85083119594` publicou o artefato. `/WWIIRun/`, `index.html`, `manifest.webmanifest` e `sw.js` respondem HTTPS `200`; MIME do manifest é `application/manifest+json`, worker é `application/javascript`, e os não-hash usam `Cache-Control: max-age=600` sem `immutable`. O manifest remoto confirma `id`, `start_url` e `scope` `/WWIIRun/`.
- Confirmação manual do proprietário em 2026-07-03: o preview abre e exibe `WWIIRun render ready`, confirmando que o shell visual publicado carrega no subpath. A confirmação não declara instalação nem janela standalone; essas parcelas continuam abertas.
- Validação instalada do proprietário em 2026-07-03: Chromium abriu a PWA com `matchMedia("(display-mode: standalone)").matches === true`; o controller é `https://insight-x-lab-technologies.github.io/WWIIRun/sw.js`, há exatamente um canvas, a registration possui scope `https://insight-x-lab-technologies.github.io/WWIIRun/` e estado `activated`, e o shell recarregou offline com sucesso. Isso completa as parcelas restantes de `F0-07-UI-01` e `F0-07-PAGES-01`; todos os 17 critérios estão evidenciados e o item retorna a `In review`.
- Fontes técnicas consultadas em 2026-07-01: [deploy estático Vite](https://vite.dev/guide/static-deploy.html), [custom workflows GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages), [prompt de atualização Vite PWA](https://vite-pwa-org.netlify.app/guide/prompt-for-update.html), [deploy Vite PWA](https://vite-pwa-org.netlify.app/deployment/), [manifest instalável Chromium](https://developer.chrome.com/docs/lighthouse/pwa/installable-manifest) e [manifest PWA/web.dev](https://web.dev/learn/pwa/web-app-manifest).

## Histórico de revisão

- 2026-07-01 — spec inicial criada em `Draft`; F0-03 confirmado `Done`; ADR-0009 proposto; F0-07 movido de `Ready` para `Specified`. Nenhuma implementação, dependência, asset, teste, workflow, build ou publicação foi realizada. Aguardando expressão de licença dos ícones provisórios e aprovação do proprietário.
- 2026-07-02 — proprietário definiu `CC0-1.0` para os ícones técnicos provisórios, aprovou SPEC-F0-07/ADR-0009 e autorizou a implementação local. Item movido para `In progress`; publicação e execução do workflow Pages permanecem sem autorização.
- 2026-07-02 — implementação local e gates concluídos; 15/17 critérios possuem evidência local. Standalone headed não é exercitável no ambiente atual e a execução/inspeção real de Pages permanece bloqueada por autorização externa separada. Item movido para `In review` para revisão independente.
- 2026-07-03 — revisão independente: `Changes requested`. **High — F0-07-TRACE-01:** a implementação inteira permanece não versionada sobre `3a30841`, e o mesmo worktree contém o fechamento documental de F0-03; não existe commit/range isolado que demonstre a unidade F0-07 nem o rollback em uma unidade exigido nesta spec. **Medium — F0-07-ASSET-01:** os três PNGs declarados opacos possuem canal alpha com mínimo 0 e máximo 255; a fonte usa um retângulo arredondado sem fundo integral, contradizendo a ficha (`transparência: nenhuma`) e reabrindo os critérios de manifest/assets. **Medium — F0-07-UI-01:** o E2E cobre tamanho do botão e overflow horizontal do aviso de update nos dois viewports, mas não demonstra `display-mode: standalone`, safe-area efetiva, foco visível nem ausência de cobertura permanente do canvas; o critério continua sem evidência. **High — F0-07-PAGES-01:** a execução real, URL, instalação e headers/MIME do Pages continuam sem evidência; por instrução do proprietário, o workflow não foi executado nem o preview publicado nesta revisão. Checks independentes: Node `v24.15.0`, npm `11.12.1`; `npm ci` (460 pacotes), árvore direta e audit offline (0 vulnerabilidades); focados 40/40; `npm run check` com 255 unitários, 7 determinísticos, build `/`, inspector e budgets; build `/WWIIRun/`; PWA 8/8 fora do sandbox; E2E de produto 6/6 e smoke do harness 1/1 executado temporariamente em `8081`, preservando `8080` para `./scripts/run.sh`; dimensões/hashes dos assets e `git diff --check` inspecionados. A substituição temporária de porta foi integralmente revertida. Nenhum runtime, asset, teste, workflow, golden ou baseline foi alterado pelo revisor.
- 2026-07-03 — findings locais corrigidos por TDD e item devolvido a `In review`. `F0-07-ASSET-01` recebe inspeção alpha reproduzível; `F0-07-UI-01` recebe safe-area/foco/dismiss/canvas nos dois viewports, preservando standalone físico como risco explícito; `F0-07-TRACE-01` recebe baseline F0-03 `42c5e66` e unidade sucessora isolada. `F0-07-PAGES-01` permanece aberto: por ordem do proprietário, workflow/Pages não foram executados nem publicados.
- 2026-07-03 — segunda revisão independente: `Changes requested`. **Resolvidos — F0-07-TRACE-01 e F0-07-ASSET-01:** `4440b7a` é sucessor direto de `42c5e66`, autoria/committer são `Codex <codex@openai.com>`, o baseline não altera runtime e a unidade F0-07 é isolada; os três PNGs retornam alpha mínimo/máximo `255`, dimensões, catálogo, hashes e ficha concordam. **Parcialmente resolvido — F0-07-UI-01 (Medium):** os dois viewports passam alvo `44×44`, safe-area efetiva, foco visível, overflow e dismiss/canvas, mas não há execução em uma PWA instalada com `display-mode: standalone`; o critério 12 permanece sem evidência completa. **Aberto — F0-07-PAGES-01 (High):** não há autorização, run/job/SHA/URL, HTTPS, instalação ou inspeção de MIME/headers/cache do preview real; o critério 16 permanece sem evidência. Checks independentes: Node `v24.15.0`, npm `11.12.1`; `npm ci` com 460 pacotes; árvore direta e audit offline com 0 vulnerabilidades; `npm run check` com 256 unitários, 7 determinísticos, build `/`, inspector e budgets; coverage 256/256 com random/run em 100%; build `/WWIIRun/`; E2E 6/6 + harness 1/1 em `8081`; PWA 10/10 nos dois viewports; `git diff --check` verde e simulation/goldens intactos. Nenhum runtime, asset, teste, workflow, golden, baseline ou ação externa foi alterado pelo revisor.
- 2026-07-03 — evidência externa autorizada completou os findings restantes: run Pages `28687578396`/jobs `85082963223` e `85083119594` publicou `4440b7a`, inspeção HTTPS/MIME/cache/scope passou e o proprietário confirmou instalação standalone, controller/scope/estado, canvas único e reload offline. Critérios 12 e 16 marcados; item retornado a `In review` sem alteração de runtime, workflow, asset, teste ou golden.
- 2026-07-03 — terceira revisão independente: `Approved`, sem findings `Critical`, `High`, `Medium` ou `Low`. Os 17 critérios possuem evidência; `F0-07-UI-01` foi fechado pela validação instalada do proprietário e `F0-07-PAGES-01` pela execução `28687578396` no SHA `4440b7a`, jobs `85082963223`/`85083119594`, mais inspeção remota fresca do shell, manifest e worker. Checks frescos: 34/34 testes unitários focados; `npm run check` com exit 0; endpoint, manifest e worker HTTPS `200`, MIME corretos, `Cache-Control: max-age=600` sem `immutable` e scope/base `/WWIIRun/`. A repetição local do Playwright não produziu resultado: no sandbox falhou antes dos testes com `listen EPERM 127.0.0.1:4174`, e fora dele a infraestrutura de execução ficou presa e foi encerrada; o gate permanece sustentado pelo run remoto verde e pelas execuções independentes 10/10 já registradas. Item movido para `Done`; runtime, testes, assets, workflow, simulation, goldens e baselines não foram alterados pela revisão.
