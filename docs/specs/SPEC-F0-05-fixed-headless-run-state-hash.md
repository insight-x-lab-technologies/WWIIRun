# SPEC-F0-05: loop fixo/headless, contratos da run e hash

Status: Changes requested  
Owner: proprietário do projeto  
Requisitos: `DET-01` (fundação parcial); prepara o isolamento exigido por `DET-02` sem concluí-lo  
Dependências: `F0-04` (`Done`), ADR-0001 (`Accepted`), ADR-0002 (`Accepted`), ADR-0004 (`Accepted`), ADR-0005 (`Accepted`)  

## Problema e resultado

O projeto possui seed, PRNG e streams reproduzíveis, mas ainda não possui uma run canônica que possa avançar sem Phaser, DOM ou relógio. Também faltam contratos para input quantizado, configuração/estado e um hash que detecte divergência sem depender de `JSON.stringify` ou da ordem incidental de propriedades.

F0-05 entrega um núcleo headless mínimo a 60 ticks/s. A mesma configuração e sequência de `InputFrame`, processadas tick a tick ou em lotes diferentes, devem produzir a mesma sequência de estados e hashes em Node e Chromium. Esta fundação não cria gameplay: o estado inicial conserva configuração, tick, último input e streams; entidades e regras entram em F1.

## Escopo

- Incluído:
  - módulo puro `src/simulation/run/` com tipos e API pública local;
  - `RunConfig` canônico para modo, seed, versões, aeronave, loadout e modificadores;
  - `InputFrame` com dois eixos quantizados e bitmask de ações versionável;
  - `RunState` versão 1 com configuração imutável, tick, último input e estados RNG independentes;
  - criação, validação, avanço de um tick e avanço headless por lote de inputs;
  - hash canônico `fnv1a64-v1` documentado e calculado sob demanda;
  - golden run com inputs não triviais, hashes hardcoded e execução compartilhada em Node/Chromium;
  - testes de repetição, chunking, erros sem mutação, aliasing e isolamento de metadados não competitivos;
  - documentação do módulo, ADR-0005 e atualizações de rastreabilidade/memória.
- Fora de escopo:
  - gameplay, entidades, movimento da aeronave, colisão, dano, score, distância, eventos ou `RunResult` de produto (F1/F2);
  - adapter de teclado, touch ou gamepad, accumulator baseado em tempo, interpolação, Phaser ou integração com a cena (F1-01);
  - geração/validação de `ChallengeManifest`, calendário Daily/Weekly ou loadout normalizado (F3-03/F3-04);
  - formato compacto de replay, checkpoint persistido, restore, compatibilidade cross-version ou submissão ao backend (F3-05/F5);
  - schemas gerais de conteúdo/save e migrações (F0-08);
  - alterar algoritmo, parser, streams, saltos ou goldens de F0-04;
  - corrigir os findings de F0-03, mudar renderer/UI, asset, i18n, PWA, storage, rede ou CI;
  - hash criptográfico, assinatura, anti-cheat ou autorização de leaderboard;
  - dependência nova, microbenchmark com threshold ou budget definitivo de performance (F0-06).

## Regras e contratos

### Organização e API pública

- Implementar em `src/simulation/run/` e exportar por um barrel local. `run` pode importar apenas `src/simulation/random`; não mover contratos para `shared` nem expor globais.
- A API mínima equivalente é:

```ts
type RunMode = 'endless' | 'daily' | 'weekly';

const TICKS_PER_SECOND = 60 as const;
const RUN_STATE_SCHEMA_VERSION = 1 as const;

type RunConfig = {
  readonly mode: RunMode;
  readonly seed: Seed128;
  readonly rulesetVersion: string;
  readonly contentVersion: string;
  readonly aircraftId: string;
  readonly loadoutId: string;
  readonly modifierIds: readonly string[];
};

const InputActionBits = {
  firePrimary: 0x0001,
  fireSecondary: 0x0002,
  special: 0x0004,
} as const;

type InputFrame = {
  readonly moveX: number;
  readonly moveY: number;
  readonly actions: number;
};

type RunState = {
  readonly schemaVersion: 1;
  readonly config: RunConfig;
  tick: number;
  input: InputFrame;
  readonly rng: Record<RngStreamId, RngState>;
};

type StateHashAlgorithm = 'fnv1a64-v1';
type StateHash = string & { readonly __stateHash: unique symbol };
const STATE_HASH_ALGORITHM: StateHashAlgorithm = 'fnv1a64-v1';

declare function createRunState(config: RunConfig): RunState;
declare function stepRun(state: RunState, input: InputFrame): void;
declare function advanceRun(
  state: RunState,
  inputs: readonly InputFrame[],
): void;
declare function hashRunState(state: RunState): StateHash;
```

- Nomes de arquivos e funções auxiliares podem variar. Nomes públicos, valores discriminantes, intervalos, ordem de transição, bits, layout do hash e erros observáveis não podem mudar silenciosamente.
- Não criar classe/singleton de clock, seed ou run. Todas as entradas e mutações são explícitas.

### `RunConfig` canônico

- `mode` aceita somente `endless`, `daily` ou `weekly`. F0-05 não aplica diferença mecânica entre eles.
- `seed` deve ser o `Seed128` canônico minúsculo produzido por F0-04. O construtor verifica o valor em runtime e rejeita casts com seed inválida/não canônica; não normaliza nem cria fallback.
- `rulesetVersion`, `contentVersion`, `aircraftId`, `loadoutId` e cada `modifierId` são tokens ASCII estáveis: `^[a-z0-9][a-z0-9._:-]{0,63}$`. Texto localizado, espaço, Unicode, vazio e mais de 64 bytes são rejeitados.
- `modifierIds` representa um conjunto: no máximo 32 itens, sem duplicatas, copiado e ordenado por ordem crescente de bytes ASCII. Ordem recebida não altera config canônica nem hash. Se uma regra futura precisar de ordem, deve ganhar campo próprio/versionado.
- `createRunState` cria uma cópia defensiva e congelada da config e do array de modificadores. Mutações posteriores no objeto/array de entrada não alteram estado ou hash.
- Locale, timezone, pack cosmético, qualidade, áudio, viewport, DPR, FPS e build diagnóstico não são campos de `RunConfig`. Dados que não mudam regra não podem entrar no hash competitivo.

### `InputFrame`

- `moveX` e `moveY` são inteiros em `[-127, 127]`: `-127` é máximo negativo, `0` neutro e `127` máximo positivo. `-128`, fração, `NaN` e infinito são inválidos.
- `actions` é inteiro unsigned de 16 bits. Em v1, somente a máscara `0x0007` é aceita: bit 0 `firePrimary`, bit 1 `fireSecondary`, bit 2 `special`. Bits reservados, negativo, fração ou valor acima de `0xffff` são rejeitados.
- Input adapters quantizam valores antes de chamar o núcleo. F0-05 não recebe coordenadas CSS, floats de device, eventos DOM nem timestamp.
- O frame neutro inicial é `{ moveX: 0, moveY: 0, actions: 0 }`.
- O estado copia os três valores do frame. Alterar o objeto de input depois de `stepRun`/`advanceRun` não altera `RunState`.
- Novas ações só podem ocupar bits reservados por mudança documentada. Não reutilizar nem reinterpretar bits existentes; mudança mecânica incompatível exige nova `rulesetVersion` depois de publicação.

### Criação e transição fixa

- `createRunState` valida toda config antes de criar estado. Falha lança `TypeError` com mensagem estável que nomeia o campo, sem retornar estado parcial.
- Estado inicial: `schemaVersion=1`, config canônica, `tick=0`, input neutro e banco novo de streams criado por `createRngStreams(config.seed)`.
- `tick` é a quantidade de ticks completos, inteiro unsigned de 32 bits. O limite `0xffffffff` equivale a mais de dois anos a 60 Hz e é suficiente para a run; tentar avançar além dele lança `RangeError` antes de qualquer mutação.
- `stepRun` representa exatamente `1/60 s` lógico e nunca recebe delta. A ordem v1 é: validar frame e capacidade; disponibilizar estado/input anterior para sistemas futuros; aplicar regras; copiar o novo input; incrementar `tick` por último. Como não há gameplay em F0-05, nenhum stream RNG é consumido pelo tick vazio.
- `advanceRun` é apenas o executor headless de uma lista: valida todos os frames e a capacidade total antes de mutar; depois chama a mesma transição, na ordem, uma vez por item. Lista vazia é no-op.
- Frame inválido lança `RangeError` com mensagem estável que identifica `moveX`, `moveY` ou `actions`. Validação de lote falha atomicamente: tick, input e RNG permanecem byte a byte iguais.
- Pausa, perda de foco ou orientação não chamam ticks. Um adapter futuro pode limitar trabalho por frame, mas não pode descartar ticks competitivos ou converter delta variável em regra dentro do core.
- Particionar a mesma lista em quaisquer lotes preserva o resultado: `advanceRun(state, all)` equivale a chamadas consecutivas com slices e a `stepRun` frame a frame.

### Estado e isolamento

- `RunState.config` e seu array não mudam durante a run. `tick`, `input` e as quatro palavras de cada `RngState` são o estado mutável v1.
- Os streams seguem a ordem/algoritmo do ADR-0004 e não compartilham objetos. Criar duas runs com a mesma config produz estados independentes; avançar/mutar uma não toca a outra.
- Não adicionar campo `delta`, tempo de parede, accumulator de render, locale, cosmetic ID, objeto Phaser, entidade visual, callback ou referência de plataforma.
- O estado v1 é JSON-safe, mas F0-05 não define serialização/restore como API persistente. Um objeto reconstruído por JSON não deve ser aceito como snapshot validado sem o schema futuro de F0-08/F3-05.
- Iterações normativas usam ordens explícitas, nunca `Object.keys`, enumeração incidental, `Set` ou ordenação dependente de locale.

### Hash canônico

- `hashRunState` é puro e não muta estado, config, input nem RNG. Duas chamadas consecutivas retornam o mesmo valor.
- Algoritmo `fnv1a64-v1`: offset basis `0xcbf29ce484222325`, para cada byte executar XOR e multiplicar por `0x00000100000001b3`, reduzindo módulo `2^64`. Usar `BigInt` explícito; não usar float para o acumulador.
- Saída `StateHash`: exatamente 16 dígitos hexadecimais minúsculos, zero-padded, sem `0x`.
- Layout binário `wwiirun.run-state.v1`, nesta ordem:
  1. tag como string;
  2. `schemaVersion`;
  3. `mode`, `seed`, `rulesetVersion`, `contentVersion`, `aircraftId`, `loadoutId`;
  4. quantidade de `modifierIds`, seguida de cada ID na ordem canônica;
  5. `tick`;
  6. `moveX`, `moveY`, `actions` do último input;
  7. quantidade de streams (`4`) e, para `spawn`, `loot`, `weather`, `patterns`, o ID do stream, `algorithm`, `s0`, `s1`, `s2`, `s3`.
- Codificação: cada string é `uint32 byteLength` seguido dos bytes ASCII sem terminador; `schemaVersion`, contagens, tick e palavras RNG são `uint32` little-endian; eixos são um byte em complemento de dois (`value & 0xff`); `actions` é `uint16` little-endian. Não usar `JSON.stringify`, `TextEncoder`, locale, endianness de typed array ou ordem de propriedade.
- `BigInt` é temporário do hasher; não entra em `RunState` nem em payload JSON. Hash é calculado sob demanda/checkpoint, não automaticamente em todo tick.
- O hash detecta divergência acidental, não é criptográfico e não torna o cliente confiável. Backend futuro deve validar manifesto/versões/limites e reexecutar replay; assinatura/anti-cheat ficam fora do core.
- Adicionar/remover/reordenar campo canônico ou mudar encoding/algoritmo exige nova versão de layout/hash, goldens novos e nota/ADR. Depois de ruleset publicada, exige também nova `rulesetVersion`; nunca atualizar expected silenciosamente.

### Comportamentos não funcionais

- Determinismo: central. Config + sequência de frames produzem os mesmos estados/hashes independentemente do chunking headless e em Node/Chromium.
- Performance: `stepRun` vazio é O(1) e não faz I/O nem hash automático; `advanceRun` é O(n); hash é O(tamanho do estado). Uma execução longa sem threshold temporal verifica overflow/estabilidade; budgets e p95 pertencem a F0-06.
- UI responsiva: não aplicável; nenhum componente, viewport ou input adapter é criado.
- Assets: não aplicável; nenhum asset é criado/carregado.
- i18n: não aplicável; tokens/erros são técnicos, e locale não entra na run.
- Save/compatibilidade: nenhum save, replay persistido, restore ou migração. Estado v1 e hash são versionados para permitir contrato futuro, mas não constituem schema de storage.
- Segurança/privacidade: nenhum dado pessoal, secret, telemetria, rede ou crypto. O hash não autoriza score nem protege contra fraude.
- Offline: toda API funciona sem rede/storage. Isso não entrega cache PWA nem conclui `PWA-01`.

## Critérios de aceitação

- [x] Given uma config válida, when `createRunState` roda, then produz tick zero, input neutro, config defensivamente copiada/canônica e os quatro estados RNG exatos de F0-04.
- [x] Given duas configs semanticamente iguais com modificadores em ordens diferentes, when estados são criados, then suas configs canônicas e hashes iniciais são iguais; duplicatas são rejeitadas.
- [x] Given mode/seed/token/modificadores inválidos, when a criação roda, then lança `TypeError` identificando o campo e não retorna estado parcial.
- [x] Given limites válidos dos eixos e combinações `0..0x0007`, when cada frame avança, then exatamente um tick é completado e uma cópia do input fica no estado sem consumir RNG.
- [x] Given eixo inválido, bit reservado ou overflow de tick, when `stepRun`/`advanceRun` roda, then lança antes de mutar tick, input ou qualquer stream; lote inválido é atômico.
- [x] Given a mesma config e sequência de inputs, when processada frame a frame, em um lote e em diversas partições incluindo lotes vazios, then estado final e hashes nos mesmos ticks coincidem.
- [x] Given objetos de config, modifier array e frames previamente usados, when o chamador os altera, then estado e hash existentes permanecem inalterados; duas runs também não compartilham estado mutável.
- [x] Given um estado válido, when `hashRunState` roda repetidamente, then retorna 16 hex minúsculos iguais e não altera nenhum campo.
- [x] Given o corpus golden independente, when a run vazia e a sequência não trivial rodam em Node e Chromium, then os hashes inicial/intermediários/final e estados RNG correspondem bit a bit aos expected hardcoded.
- [x] Given alteração isolada de config competitiva, tick, input ou uma palavra de qualquer stream em cópias de teste, when o hash é calculado, then cada cópia diverge do baseline; reordenar propriedades de objeto não muda o hash.
- [x] Given locale, timezone, áudio, qualidade, viewport, FPS ou pack cosmético no adapter/harness externo, when a mesma config/inputs roda, then esses metadados não entram nos tipos, estado nem hash e o golden permanece igual.
- [x] Given 100.000 frames determinísticos válidos, when o executor headless roda, then conclui exatamente 100.000 ticks sem overflow, I/O, estado global ou asserção temporal dependente da máquina.
- [x] Given inspeção de `src/simulation/run`, when imports e APIs são auditados, then não há Phaser, DOM, locale, storage, rede, clock, timers, crypto, `Math.random`, dependência nova ou ordem incidental.
- [x] Given implementação concluída, when os gates aplicáveis rodam, then format, lint, typecheck, unitários, coverage focada, determinismo, build e corpus Chromium passam sem alterar goldens de F0-04 nem declarar `DET-01`/`DET-02` concluídos.
- [x] A documentação registra API, intervalos, bits, semântica de tick, layout/hash, limites de segurança, comandos realmente executados e escopo futuro.

## Plano de teste

- unitário:
  - criação, cópia/freeze, ordenação de modificadores, streams e neutral input;
  - tabelas de mode, seed cast inválida, tokens vazios/Unicode/com espaço/limites, duplicatas e mais de 32 modificadores;
  - limites `-127`, `0`, `127`, combinações de bits, frações, não finitos, `-128`, reservados e `0xffff`;
  - um tick, lista vazia, lotes/partições, atomicidade de erro, tick máximo e ausência de aliasing;
  - pureza/cobertura de campos do hash, padding/forma da saída e independência de ordem de propriedades;
  - 100.000 ticks como teste funcional sem timeout/budget de performance inventado.
- determinismo:
  - dados golden compartilhados em `tests/determinism`, com config, frames, ticks de checkpoint, hashes e estados finais hardcoded;
  - expected calculado uma vez por implementação independente, preferencialmente script temporário em Python que reproduza apenas encoding/FNV e não seja importado pelos testes;
  - ao menos um vetor de estado inicial e uma sequência que cubra eixos negativos/positivos, todas as ações e modifier sorting;
  - repetições, chunkings distintos e hash em checkpoints idênticos;
  - manter corpus F0-04 intacto e executar o corpus F0-05 no mesmo `test:determinism` Node;
  - executar os mesmos dados no Chromium via Playwright/Vite, sem hook global novo na aplicação.
- integração/E2E:
  - não há fluxo de produto. Reusar somente o harness cross-runtime existente para importar o módulo puro no browser; não mudar canvas, cena ou smoke responsivo.
- manual/performance/viewports:
  - inspecionar imports/APIs proibidos, layout byte a byte, constantes FNV, ordem de streams e worktree;
  - registrar duração observada dos testes apenas como contexto; FPS, p95, aparelhos e viewports não são gates desta spec.
- comandos mínimos de evidência:

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test:unit
npm run test:unit:coverage -- --run tests/unit/run.test.ts
npm run test:determinism
npm run build
npm run check
CI=1 npm run test:e2e
git diff --check
git status --short
```

O implementador deve integrar os novos testes ao gate existente sem mudar a ordem `unit → determinism → build`, sem adicionar dependência e sem corrigir incidentalmente F0-03. Nenhum comando acima é evidência antes de ser executado.

## Migração e rollback

Não existe ruleset publicada, save, replay ou hash anterior de run para migrar. F0-05 é aditivo e consome a API já concluída de F0-04 sem alterar seus vetores.

Rollback seguro reverte toda a unidade F0-05: módulo `run`, testes/goldens, ADR-0005 e documentação relacionada. Não deixar script apontando para corpus ausente nem alterar F0-04 para acomodar rollback parcial. Se um erro no layout/hash for descoberto antes de publicação, corrigir com histórico e recalcular goldens independentemente; depois de publicação, preservar a versão antiga para validação e criar sucessora com nova `rulesetVersion`.

## Evidências de conclusão

- Commit/diff isolado de F0-05 com módulo, testes, goldens, ADR e documentação; nenhuma correção de F0-03 ou mudança em outputs de F0-04 misturada.
- Corpus golden versionado com config/frames/checkpoints/hash esperado e registro do cálculo independente.
- Saídas resumidas e exit codes dos comandos realmente executados, incluindo coverage focada e o mesmo corpus em Node/Chromium.
- Provas focadas de atomicidade de erro, chunking, aliasing, tick overflow, cobertura do layout e exclusão de metadados não competitivos.
- Inspeção de imports/APIs proibidos, dependências e worktree; ADR-0005, rastreabilidade e memória atualizados sem marcar `DET-01` ou `DET-02` como `Done`.

## Evidências da implementação

- TDD/negativas: o primeiro unitário falhou por ausência de `src/simulation/run`; validação/transição falharam em 39/42 antes do runtime correspondente; hash falhou em 6/48 antes do hasher. O corpus Node com placeholders falhou em 2/7 mostrando os quatro valores reais, e um expected Chromium temporariamente invalidado falhou nos dois projetos com o hash inicial esperado/recebido; os literais corretos foram restaurados.
- Cálculo independente: `python3 /tmp/f0-05-golden.py` saiu com código 0 e produziu layouts de 392 bytes nos ticks 0/1/3/8 com hashes `0c8d1a30d7b17210`, `0de18a8817e3a594`, `6c361b31acf23fb3` e `8915f7da45a2a608`, iguais aos calculados pelo TypeScript. O script temporário não importou o módulo sob teste e não integra o repositório.
- Foco: `npm run test:unit -- --run tests/unit/run.test.ts` passou 59/59; `npm run test:unit:coverage -- --run tests/unit/run.test.ts` passou e mostrou `src/simulation/run` em 100% de statements, branches, functions e lines; `npm run test:determinism` passou 7/7 em dois arquivos, preservando os 5 vetores de F0-04.
- Gate completo: `npm run check` saiu com código 0; format, lint, typecheck, 89/89 unitários, 7/7 determinísticos e build passaram. O build manteve o warning conhecido do chunk Phaser de 1.200,71 kB (gzip 320,30 kB), pertencente a F0-06.
- Browser: `CI=1 npm run test:e2e` saiu com código 0 e passou 6/6 em Chromium, nos projetos 320×568 e 1920×1080, incluindo os corpus F0-04/F0-05 e o smoke existente; duração observada 52,7 s com um worker.
- Auditoria: `git diff --check` saiu com código 0; scan dos `.ts` de `src/simulation/run` não encontrou APIs proibidas; imports apontam somente para `../random` e arquivos locais. Nenhuma dependência foi adicionada por F0-05. O worktree já continha mudanças não commitadas de itens anteriores; a unidade F0-05 permanece identificável pelos novos diretório/arquivos `run` e pelas atualizações documentais listadas, sem correção de F0-03.

## Histórico de revisão

- 2026-06-28 — spec inicial criada após confirmar F0-04 como `Done`; F0-03 permanece `Changes requested`, mas não é dependência. ADR-0005 proposto. Nenhum runtime, teste, golden ou dependência foi alterado e nenhum gate de implementação foi alegado como evidência.
- 2026-06-28 — proprietário aprovou a spec e o ADR-0005; implementação iniciada e lifecycle movido para `In progress`.
- 2026-06-28 — implementação TDD concluída, corpus independente validado em Node/Chromium, gates aplicáveis verdes e item movido para `In review`; nenhuma revisão independente foi executada nesta sessão.
- 2026-06-28 — revisão independente: `Changes requested`. Finding **High** — a evidência obrigatória de commit/diff isolado não existe: `HEAD` (`95f9b5e`) não contém F0-04 nem F0-05, e `git status` mantém os módulos, specs, ADRs, testes e goldens de ambos como arquivos não rastreados junto de mudanças documentais compartilhadas; isso impede demonstrar a unidade F0-05, seu rollback e a preservação exata da dependência já aprovada. Finding **Low** — `docs/README.md` lista ADR-0005, cujo próprio estado é `Accepted`, sob `ADRs propostos` e não inclui o também aceito ADR-0004 no índice, deixando a navegação arquitetural contraditória com `DECISIONS.md`. O código do núcleo não apresentou finding funcional. Checks independentes: Node `v24.15.0`, npm `11.12.1`; `npm run check` passou com 89/89 unitários, 7/7 determinísticos e build; coverage focada passou 59/59 e mostrou `src/simulation/run` em 100% nas quatro métricas; o corpus Node passou em três execuções totais; `CI=1 npm run test:e2e` passou 6/6 em Chromium; recomputação Python independente confirmou 392 bytes e os quatro hashes; `npm ls --depth=0`, scans de fronteira/API e `git diff --check` passaram. Auditoria determinística registrada em `docs/audits/determinism/2026-06-28-f0-05.md` com `Pass`. Próxima ação: versionar F0-04 como baseline aprovado, preparar uma unidade F0-05 isolada e corrigir o índice de ADRs; então retornar F0-05 para `In review` sem alterar runtime ou goldens.
