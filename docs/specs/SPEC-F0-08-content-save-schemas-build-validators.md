# SPEC-F0-08: schemas de conteúdo/save e validadores de build

Status: Done
Owner: proprietário do projeto
Requisitos: `ASSET-02` (fundação parcial), `DET-02` (fundação parcial)
Dependências: `F0-02` (`Done`); compatível com `F0-05` (`Done`), ADR-0001/0003/0005/0008 (`Accepted`)

## Problema e resultado

O repositório possui fronteiras para `content` e `services`, mas ainda aceita apenas marcadores: não há contrato runtime para dados externos, save versionado nem gate que impeça JSON inválido, referências quebradas ou asset sem licença/proveniência de chegar ao bundle.

F0-08 entrega uma fundação estrita e extensível. Um manifest core e seu catálogo de assets são validados no build com os mesmos decoders puros que podem rodar no browser; entradas inválidas falham fechadas com issues estruturadas. Um save v1 mínimo prova envelope, validação e migração incremental sem decidir perfis, economia ou storage antes de F4. Nenhum gameplay, save real ou pack baixável é criado.

## Escopo

- Incluído:
  - primitivas puras de validação e resultado estruturado em `src/shared/validation/`;
  - registro fechado/versionado de schemas de conteúdo em `src/content/schema/`;
  - `ContentManifestV1` que lista documentos locais, `contentVersion` competitivo e schemas conhecidos;
  - `AssetCatalogV1` com metadados obrigatórios de especificação, arquivos runtime, integridade, licença e proveniência;
  - manifest/catálogo core mínimos em `src/content/data/core/`, sem objeto de gameplay ou asset fictício;
  - validação semântica do conjunto: unicidade, paths confinados, documentos existentes, schema esperado, referências e integridade declarada de arquivos;
  - comando Node `content:validate`, integrado ao `build` antes do Vite;
  - `SaveDocumentV1` fundacional, decoder e pipeline incremental de migração em `src/services/save/`;
  - testes unitários e de integração com árvores temporárias válidas/inválidas;
  - ADR-0008, documentação dos módulos e atualizações de rastreabilidade/memória.
- Fora de escopo:
  - definições de aeronave, arma, inimigo, hitbox, drop, onda, conquista, economia ou qualquer regra de gameplay (F1/F2/F4);
  - `ChallengeManifest`, replay, checkpoint persistido ou restore de `RunState` (F3);
  - perfil, configuração, carteira, IndexedDB, `StoragePort`, backup/export, quota, sync ou UI de recuperação (F4-03+);
  - manifest remoto de expansão, download/cache, assinatura, entitlement, allowlist final ou fallback atômico (F6-01+);
  - gerar arte, escolher licença, aprovar proveniência, definir identidade visual ou criar fichas reais de assets;
  - pipeline completo de atlas/codec/dimensões, auditoria SPDX ou assets AAA (F6-04);
  - JSON Schema/codegen, dependência nova, alteração do workflow de F0-03 ou correção de seus findings;
  - alterar `RunConfig`, `RunState`, hash, PRNG, golden vectors ou outputs de F0-04/F0-05;
  - PWA, deploy, storage offline, backend, rede, i18n, Phaser ou UI.

## Regras e contratos

### Estratégia e fronteiras

- Seguir ADR-0008: decoders TypeScript puros são a fonte executável de verdade. Não adicionar biblioteca de schema, gerador ou segundo contrato manual em JSON Schema.
- `src/shared/validation` contém somente primitivas genéricas; não conhece content, save, Node, DOM ou Phaser.
- `src/content/schema` pode depender de `shared/validation`, mas não de `simulation`, `game`, `app`, `services`, filesystem ou plataforma.
- `src/services/save` pode depender de `shared/validation`, mas não acessa IndexedDB/localStorage, relógio, rede ou UI.
- `scripts/validateContent.ts` pode usar APIs Node para ler/hashar arquivos; nenhum módulo importável pelo runtime pode importar `node:*`.
- Não refatorar o validador já aprovado de F0-05. O grammar de tokens de conteúdo deve ter teste de paridade com `RunConfig`, sem modificar estado, hash ou goldens.

### Resultado de validação

A API mínima equivalente é:

```ts
type ValidationIssueCode =
  | 'invalid-type'
  | 'invalid-value'
  | 'missing-key'
  | 'unknown-key'
  | 'duplicate-id'
  | 'unsupported-version'
  | 'unknown-schema'
  | 'invalid-path'
  | 'missing-reference'
  | 'integrity-mismatch';

type ValidationIssue = {
  readonly code: ValidationIssueCode;
  readonly path: string; // JSON Pointer; raiz = ""
  readonly message: string; // técnica, estável e sem locale
};

type ValidationResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly issues: readonly ValidationIssue[] };
```

- Entrada inválida é comportamento esperado e retorna `ok: false`; o decoder não lança. Erros de programação/I/O do chamador continuam excepcionais.
- Issues usam JSON Pointer escapado (`~0`, `~1`), ordem determinística de travessia e mensagens técnicas sem valor secreto ou payload completo.
- Objetos precisam ser records JSON simples; arrays, `null`, instâncias com prototype customizado, getters e valores não JSON (`undefined`, função, symbol, bigint, `NaN`, infinito) são rejeitados onde não correspondem ao schema.
- Schemas são fechados: chave desconhecida falha. Decoders copiam arrays/objetos aceitos e não preservam alias com a entrada; a saída é `readonly` por tipo, sem depender de `Object.freeze` profundo como mecanismo de segurança.
- IDs/versões seguem exatamente `^[a-z0-9][a-z0-9._:-]{0,63}$`, ASCII, sem whitespace/Unicode. Paths têm no máximo 256 caracteres, usam `/`, são relativos, normalizados, sem segmento vazio, `.`/`..`, backslash, query, fragmento, URL ou path absoluto.

### Manifest de conteúdo v1

```ts
const CONTENT_MANIFEST_SCHEMA = 'wwiirun.content-manifest.v1' as const;

type ContentDocumentRefV1 = {
  readonly id: string;
  readonly schema: string;
  readonly path: string;
};

type ContentManifestV1 = {
  readonly schemaVersion: typeof CONTENT_MANIFEST_SCHEMA;
  readonly manifestId: string;
  readonly contentVersion: string;
  readonly documents: readonly ContentDocumentRefV1[];
};
```

- `manifestId`, `contentVersion`, document `id` e `schema` são tokens canônicos. `contentVersion` tem a mesma semântica de `RunConfig.contentVersion`: muda quando dados que alteram regra competitiva mudam; asset/locale cosmético não força mudança desse campo.
- `documents` possui no máximo 1.024 itens, sem `id` ou `path` duplicado. Ordem do arquivo não possui semântica; a saída canônica é ordenada por `id` ASCII.
- Cada path resolve dentro do diretório do manifest, deve apontar para `.json` regular versionado e não pode escapar por path ou symlink.
- O registro de schemas é código fechado. Cada entrada associa discriminante literal, decoder e impacto imutável `gameplay` ou `cosmetic`. JSON não escolhe seu impacto.
- F0-08 registra `wwiirun.asset-catalog.v1` como `cosmetic`. Não registra schema genérico de gameplay nem aceita payload arbitrário. F1/F2 adicionam decoders concretos no item que cria cada definição.
- Build falha se faltar documento, se o discriminante interno divergir do `schema` declarado, se o schema não estiver registrado ou se existir JSON não listado sob a raiz core, exceto fixtures/documentação explicitamente fora dela.

### Catálogo de assets v1

```ts
const ASSET_CATALOG_SCHEMA = 'wwiirun.asset-catalog.v1' as const;

type AssetRuntimeFileV1 = {
  readonly path: string;
  readonly mediaType: string;
  readonly byteLength: number;
  readonly sha256: string; // 64 hex minúsculos
  readonly width?: number;
  readonly height?: number;
};

type AssetLicenseV1 = {
  readonly expression: string;
  readonly evidencePath: string;
};

type AssetProvenanceV1 = {
  readonly kind: 'original' | 'third-party' | 'ai-assisted' | 'ai-generated';
  readonly creator: string;
  readonly source: string;
  readonly tool?: string;
  readonly promptPath?: string;
};

type AssetDescriptorV1 = {
  readonly id: string;
  readonly kind: 'image' | 'audio';
  readonly specPath: string;
  readonly runtimeFiles: readonly AssetRuntimeFileV1[];
  readonly license: AssetLicenseV1;
  readonly provenance: AssetProvenanceV1;
};

type AssetCatalogV1 = {
  readonly schemaVersion: typeof ASSET_CATALOG_SCHEMA;
  readonly catalogId: string;
  readonly assets: readonly AssetDescriptorV1[];
};
```

- O catálogo core inicial é válido e vazio. Isso prova o pipeline sem inventar asset, licença, autor, prompt ou decisão editorial.
- `catalogId`/asset `id` são tokens canônicos; até 4.096 assets, ordenados canonicamente por ID, sem duplicata. Cada asset possui ao menos um arquivo runtime.
- `specPath`, `evidencePath` e `promptPath` são paths locais confinados ao repositório. `specPath` e evidência de licença precisam existir. `promptPath` é obrigatório para `ai-assisted`/`ai-generated` e proibido nos demais; `tool` é obrigatório para os kinds de IA.
- `expression` registra a declaração de licença escolhida pelo proprietário/autor do asset, mas F0-08 não decide a licença nem tenta interpretar juridicamente SPDX. `expression`, `creator`, `source` e `tool`, quando presente, devem ter conteúdo após `trim`; limites respectivos de comprimento UTF-16 são 256, 256, 1.024 e 256. O valor original é preservado, sem normalização de locale.
- Arquivos runtime ficam sob `public/assets/core/` nesta etapa. O build confere arquivo regular, tamanho exato e SHA-256. URL remota, data URI, symlink que escape da raiz ou extensão/MIME não reconhecida falham.
- `image` aceita `.png`/`image/png`, `.webp`/`image/webp` ou `.jpg`/`.jpeg`/`image/jpeg` e exige `width`/`height` inteiros positivos declarados em todos os arquivos. `audio` aceita `.ogg`/`audio/ogg`, `.wav`/`audio/wav`, `.aac`/`audio/aac`, `.m4a`/`audio/mp4` ou `.mp3`/`audio/mpeg` e proíbe `width`/`height`. Extensão e MIME precisam corresponder exatamente. F0-08 não decodifica mídia nem comprova dimensões/duração; F6-04 fecha esse gate.
- Metadados de asset nunca entram em `RunConfig`, `RunState` ou hash. O schema cosmético não contém hitbox, HP, dano, spawn, score, RNG ou modificador de regra.

### Validador de build

- Criar `npm run content:validate` chamando `node scripts/validateContent.ts` sobre `src/content/data/core/manifest.json` por default.
- O script aceita no máximo um path explícito, confinado ao repositório, para fixtures versionadas/manutenção; resolve a raiz do repositório sem depender do cwd e não faz network, download, geração ou escrita.
- JSON inválido, schema/semântica inválidos, referências/integridade inválidas ou documento órfão geram diagnóstico em `stderr` no formato estável `<path><json-pointer> [<code>] <message>` e exit code `1`. Sucesso gera resumo curto em `stdout` e exit code `0`.
- Diagnósticos são agregados e ordenados por path, JSON Pointer e code; um arquivo ruim não impede inspecionar os demais já referenciáveis. Falha de I/O inesperada também termina `1`, distinguida de issue de schema.
- Integrar `content:validate` ao `build` após typecheck e antes de `vite build`; `check` o recebe pelo build existente. Não editar o workflow de F0-03.
- O script deve exportar funções puras/testáveis e executar CLI somente quando for entrypoint; testes não criam subprocesso para cobrir toda regra semântica, mas ao menos um teste de integração comprova exit `0/1` e streams.

### Save v1 e migração

```ts
const SAVE_SCHEMA_VERSION = 1 as const;

type SaveDocumentV1 = {
  readonly schemaVersion: typeof SAVE_SCHEMA_VERSION;
};

declare function decodeSaveDocument(value: unknown): ValidationResult<SaveDocumentV1>;
declare function migrateSaveDocument(value: unknown): ValidationResult<SaveDocumentV1>;
```

- V1 contém somente `schemaVersion`. Não há `data`, profile, settings, moedas, run, timestamps ou IDs inventados. F0-08 não grava esse documento; ele é o baseline estrito para o schema/migrator que F4-03 estenderá.
- `decodeSaveDocument` aceita apenas a versão corrente e rejeita chave extra. Versão ausente/inválida retorna issue no campo; inteira positiva diferente de `1` retorna `unsupported-version` sem tentar fallback.
- `migrateSaveDocument` identifica a versão, valida integralmente cada etapa e aplica uma cadeia explícita `vN → vN+1`. Em F0-08, v1 é identidade após decode; não há v0 implícita.
- Decoder/migrator não muta, apaga ou sobrescreve a entrada. Falha retorna issues e deixa preservação/backup para o futuro adapter de F4-03.
- Versão futura nunca sofre downgrade. Nova versão adiciona tipo, decoder, fixture e migração testada; não altera o significado de v1. Migração destrutiva exige decisão humana e ADR antes do código.
- Save não importa `RunState` nem valida snapshot/replay. `RUN_STATE_SCHEMA_VERSION` e `SAVE_SCHEMA_VERSION` são domínios independentes.

### Comportamentos não funcionais

- Determinismo: decoders/canonicalização não usam locale, relógio, entropia, ordem de filesystem ou ordem incidental de propriedades. F0-04/F0-05 e goldens ficam byte a byte intactos. A classificação cosmética fica em código e não entra no hash; `DET-02` continua `Planned` até o pack de prova de F6-03.
- Performance: validação de conteúdo é build-time e linear em documentos/entradas; save v1 é O(1). Não adicionar pacote ao bundle. Nenhum threshold temporal novo; o budget F0-06 deve continuar passando.
- UI responsiva: não aplicável; nenhum componente, viewport ou estilo.
- Assets: aplicável somente ao contrato/metadados e integridade de arquivo. Nenhum asset é criado, licenciado ou aprovado; dimensões reais/codec/atlas ficam em F6-04.
- i18n: não aplicável; schemas não contêm texto exibido. Issues técnicas não são localizadas.
- Save/compatibilidade: central, mas somente envelope/decoder/migrator sem persistência. Não há save anterior ou migração destrutiva.
- Segurança/privacidade: nenhum dado pessoal, secret ou telemetria. Schemas fechados e paths confinados reduzem injeção/path traversal no build; packs remotos não são considerados confiáveis e ficam fora desta etapa.
- Offline: decoders funcionam sem rede. O script usa somente arquivos locais. Isso não entrega IndexedDB, cache PWA nem conclui `PWA-01`.

## Critérios de aceitação

- [x] Given valores JSON válidos para manifest, catálogo e save v1, when os decoders rodam, then retornam cópias canônicas tipadas, sem alias/mutação e com arrays ordenados por ID.
- [x] Given tipos inválidos, não finitos, prototype customizado, getter, chave ausente/desconhecida ou versão não suportada, when o decoder roda, then retorna issues estáveis em JSON Pointer e não lança nem modifica a entrada.
- [x] Given tokens nos limites e corpus inválido com whitespace, Unicode, mais de 64 caracteres e pontuação proibida, when content e `RunConfig` são exercitados, then a aceitação do grammar permanece equivalente sem alterar F0-05.
- [x] Given path absoluto, URL, backslash, segmento `.`/`..`, symlink de escape ou path duplicado, when o conjunto é validado, then falha fechado antes de consumir arquivo fora das raízes autorizadas.
- [x] Given documento ausente/órfão, JSON inválido, schema desconhecido, discriminante divergente ou ID duplicado, when `content:validate` roda, then retorna exit `1` com todos os diagnósticos em ordem determinística.
- [x] Given catálogo com asset, when spec/licença/proveniência/runtime file são completos e hash/tamanho conferem, then valida; qualquer metadado obrigatório, arquivo, tamanho ou SHA-256 incorreto falha.
- [x] Given provenance de IA, when `tool` ou `promptPath` falta, then falha; given asset não IA com `promptPath`, then também falha. Nenhuma licença/proveniência fictícia é adicionada ao catálogo core vazio.
- [x] Given asset `image`/`audio`, when MIME/extensão/dimensões não respeitam as regras por kind, then falha; o teste não alega decodificação de mídia ou confirmação de dimensões reais.
- [x] Given save v1 válido, when decodificado ou migrado, then retorna v1 equivalente; given save corrompido/v0/futuro, then falha sem downgrade, exclusão ou mutação do raw input.
- [x] Given o manifest core vazio válido, when `npm run content:validate`, `npm run build` e `npm run check` rodam, then a validação ocorre antes do Vite e os gates existentes passam; uma fixture inválida prova exit não zero sem editar dados reais.
- [x] Given inspeção de dependências/imports, when a unidade é auditada, then nenhum pacote foi adicionado, runtime não importa `node:*`, content/save não importam Phaser/DOM/storage/rede/clock/locale e `simulation` não importa content/save.
- [x] Given execução dos corpora determinísticos existentes em Node/Chromium, when a unidade F0-08 está presente, then todos os hashes F0-04/F0-05 permanecem idênticos e nenhum golden é atualizado.
- [x] A documentação registra como estender um schema, distinguir gameplay/cosmético, versionar/migrar save, executar o validator e interpretar issues, sem declarar `ASSET-02`/`DET-02` concluídos.

## Plano de teste

- unitário:
  - primitivas: plain records, JSON Pointer, chaves exatas, inteiros/strings/enums/arrays, cópia e ordem de issues;
  - tabelas de token/path nos limites e paridade observável com `RunConfig`;
  - manifest: versões, limites, sort, duplicatas e schema refs;
  - catálogo: kinds, license/provenance, combinações IA, MIME/extensão, dimensões, hash/tamanho e duplicatas;
  - save: v1, missing/unknown keys, v0/futuro, identidade da migração, ausência de mutação/aliasing;
  - funções do validador com filesystem temporário, incluindo missing/orphan, path traversal, symlink escape e integridade.
- determinismo:
  - executar corpus F0-04/F0-05 sem alteração de expected;
  - provar canonicalização idêntica para documentos com ordens incidentais diferentes;
  - testar que mudanças apenas no catálogo cosmético não alteram `RunConfig`/hash existente; isso é evidência parcial, não conclusão de `DET-02`.
- integração/E2E:
  - subprocesso do CLI sobre fixtures versionadas válida e inválida confinadas ao repositório, verificando exit code/stdout/stderr;
  - build real com manifest core válido;
  - reusar E2E Chromium existente somente como regressão; não criar fluxo visual.
- manual/performance/viewports:
  - inspecionar imports, package/lock, ordem do build, raízes/path resolution, registro de impacto e diff de goldens;
  - conferir que budget F0-06 permanece verde; FPS, aparelho e viewport não são gates desta spec.
- comandos mínimos de evidência:

```bash
npm run content:validate
npm run test:unit -- --run tests/unit/validation.test.ts tests/unit/contentSchema.test.ts tests/unit/saveSchema.test.ts tests/unit/contentValidator.test.ts
npm run test:unit:coverage -- --run tests/unit/validation.test.ts tests/unit/contentSchema.test.ts tests/unit/saveSchema.test.ts tests/unit/contentValidator.test.ts
npm run test:determinism
npm run build
npm run check
CI=1 npm run test:e2e
npm ls --depth=0
git diff --check
git status --short
```

Nomes dos arquivos de teste podem variar mantendo as responsabilidades. Nenhum comando é evidência antes de ser executado. A implementação deve começar por testes RED conforme `$implement-roadmap-item` e preservar mudanças existentes de F0-06.

## Migração e rollback

Não existe conteúdo produtivo, asset catalogado ou save persistido a migrar. A implementação é aditiva; o manifest/catalog core começa vazio e o save v1 não é gravado.

Rollback seguro reverte em uma unidade os módulos de validation/content/save, script/package script, dados core, testes, ADR-0008 e documentação F0-08. Como não há dependência nova, lockfile não deve mudar. O build anterior volta a não validar conteúdo; não deixar `build` apontando para script removido.

Depois que uma versão de schema for persistida/publicada, não editar seu significado nem reciclar IDs. Correção incompatível cria nova versão e migração. Raw save inválido/futuro nunca é destruído pelo decoder. Migração que descarte ou reinterprete dados requer decisão humana e ADR específico.

## Evidências de conclusão

- Correção dos findings: o RED focado falhou nos quatro comportamentos esperados (throw para `constructor`, interrupção da agregação e pointers deslocados em manifest/catálogo); o GREEN passou 40/40. O registro usa prototype nulo e lookup centralizado com `Object.hasOwn`; o validator mapeia IDs validados aos índices-fonte antes das verificações de filesystem, preservando a saída canônica ordenada.
- Rastreabilidade: `a73c355` materializa somente o fechamento documental aprovado de F0-06, com F0-08 ainda `Ready` e sem seus arquivos; o snapshot passou `npm run check` com 113 unitários, 7 determinísticos e build/budget. A unidade F0-08 é o sucessor direto; o range `a73c355..HEAD` permite diff/rollback isolado sem reabrir F0-06.
- Escopo funcional F0-08 restrito a validation/content/save, script/package/config, dados core, fixtures/testes e documentação rastreável. `package-lock.json`, `src/simulation`, corpora/goldens, thresholds e JSONs de baseline não possuem diff da implementação.
- Vetores válidos/inválidos versionados cobrem canonicalização, issues, paridade do token com `RunConfig`, assets, save/migração, filesystem, symlink de documento/manifest/runtime, órfão, JSON inválido, schema desconhecido e integridade.
- CLI direto: fixture válida retornou exit `0`/`Validated 1 content document.`; fixture inválida retornou exit `1` com `/unexpected [unknown-key]`; argumentos excedentes retornaram exit `1`. O subprocesso equivalente está versionado e, quando `spawnSync` recebe `EPERM` no sandbox, a restrição ambiental é detectada sem converter resultado funcional em `pass` fictício.
- Node `v24.15.0`, npm `11.12.1`; cobertura focada: 4 arquivos/70 testes, content schema 100% functions/82,23% branches, validation 100% functions/88,23% branches, save 100% branches e validator 90,47% functions/60,67% branches.
- `npm run check` exit `0`: 183 unitários, 7 determinísticos, typecheck, validator core, build e budget. `npm run test:e2e` exit `0`: 6 testes de produto + 1 smoke do harness. Budget preservado em JS 1.200.712 raw/318.817 gzip, payload inicial 319.410 e core 1.201.632 bytes.
- `npm ls --depth=0` confirma o mesmo conjunto de dependências e lockfile sem diff. Scans confirmam ausência de imports/APIs proibidos nas fronteiras; `src/simulation` e goldens não possuem diff e os corpora Node/Chromium passaram.
- ADR-0008 aceito após aprovação explícita; spec, roadmap, requisitos, índices, módulos, catálogo documental e memória atualizados sem marcar `ASSET-02` ou `DET-02` como `Done`.
- Correção revalidada com Node `v24.15.0`/npm `11.12.1`: coverage focada 75/75; `npm run check` com 188 unitários, 7 determinísticos, validator/build/budget; Playwright 6/6 produto + 1/1 harness. Fixture versionada confirma exit `1`, três diagnósticos agregados nos índices-fonte e ausência de `[io-error]` para `constructor`.

## Histórico de revisão

- 2026-06-30 — spec inicial criada após confirmar F0-02 e F0-05 como `Done`; F0-03 permanece `Changes requested`, mas não é dependência. ADR-0008 proposto. Nenhum runtime, teste, dependência, dado core, save, golden ou gate foi alterado/executado nesta sessão de especificação.
- 2026-06-30 — proprietário aprovou explicitamente a spec e o ADR-0008; item movido para `In progress` para implementação conforme o escopo aprovado.
- 2026-06-30 — implementação concluída por TDD e movida para `In review`: contratos puros/fechados, manifest e catálogo core vazio, save v1, validator fail-closed integrado ao build, fixtures e documentação. Todos os gates aplicáveis passaram; nenhum golden, simulation, dependência ou baseline físico foi alterado. Próxima ação: revisão independente com `$review-roadmap-item F0-08`.
- 2026-06-30 — revisão independente: `Changes requested`. Findings **High** `F0-08-SCHEMA-01`: o registro é um objeto com prototype e os lookups diretos em `decodeRegisteredContent`/validator tratam o token canônico desconhecido `constructor` como entrada herdada; a API lança `registration.decode is not a function` em vez de retornar `unknown-schema`, e o CLI converte o caso em `io-error`, interrompendo a agregação. **High** `F0-08-TRACE-01`: toda a unidade F0-08 permanece não versionada e o worktree mistura nos mesmos documentos o fechamento preexistente de F0-06, portanto não existe diff/rollback isolado que preserve a dependência aprovada. **Medium** `F0-08-DIAG-01`: manifest e catálogo são ordenados antes das verificações de filesystem; os índices usados nos JSON Pointers passam a ser da saída canônica, não do arquivo-fonte — prova com schema desconhecido no índice 0 retornou `/documents/1/schema`. Checks independentes: Node `v24.15.0`, npm `11.12.1`; focados e coverage 70/70; `npm run content:validate`, `npm ls --depth=0`, `npm run check` (183 unitários, 7 determinísticos, build e budget), Playwright 6/6 produto + 1/1 harness, scans de fronteira e `git diff --check` passaram. Critérios 2 e 5 reabertos; nenhum runtime/teste/golden foi alterado pela revisão. Próxima ação: corrigir os três findings por TDD, criar unidade versionada isolada sobre um baseline que preserve F0-06 `Done` e retornar F0-08 para `In review`.
- 2026-06-30 — `F0-08-SCHEMA-01`, `F0-08-DIAG-01` e `F0-08-TRACE-01` corrigidos por TDD. Lookup herdado agora falha fechado, diagnósticos de manifest/assets usam índices do arquivo-fonte sem alterar canonicalização e o baseline `a73c355` separa F0-06 da unidade sucessora F0-08. Critérios 2 e 5 fechados novamente; gates aplicáveis passaram e o item retornou para `In review`, aguardando revisão independente.
- 2026-07-01 — segunda revisão independente: `Approved`, sem findings. O range isolado `a73c355..b2390a5` contém uma única unidade F0-08 e resolve `F0-08-SCHEMA-01`, `F0-08-DIAG-01` e `F0-08-TRACE-01`: `constructor` falha fechado sem `io-error`, diagnósticos preservam índices-fonte e o rollback em `a73c355` mantém F0-06 `Done`. Todos os 13 critérios e gates aplicáveis passaram. Checks independentes: coverage focada 75/75; `npm run check` com 188 unitários, 7 determinísticos, validator, build e budget; Playwright 6/6 produto + 1/1 harness; `npm ls --depth=0`, scans de fronteira e `git diff --check` verdes. O snapshot `a73c355` passou `npm run check` com 113 unitários, 7 determinísticos e build/budget. Item movido para `Done`; `ASSET-02` e `DET-02` permanecem `Planned` conforme o escopo aprovado.
