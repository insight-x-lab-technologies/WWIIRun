# SPEC-F0-04: PRNG versionado, seeds, streams e golden vectors

Status: Done  
Owner: proprietário do projeto  
Requisitos: `DET-01` (fundação parcial); prepara isolamento exigido por `DET-02` sem concluí-lo  
Dependências: `F0-02` (`Done`), ADR-0002 (`Accepted`), ADR-0004 (`Accepted`)  

## Problema e resultado

O núcleo ainda não possui uma fonte de pseudoaleatoriedade explícita e reproduzível. F0-04 deve entregar uma biblioteca pequena em `simulation` que converta uma seed hexadecimal de 128 bits em estados versionados de `xoshiro128**`, mantenha sequências independentes para spawn, loot, clima e padrões e fixe o comportamento com golden vectors.

Ao final, a mesma seed, stream, estado e sequência de chamadas deve produzir os mesmos valores em Node e browsers suportados. O contrato deve ser suficiente para F0-05 armazenar os estados dos streams em `RunState`, sem depender de Phaser, DOM, locale, storage, rede, relógio ou entropia externa.

## Escopo

- Incluído:
  - tipo opaco/canônico de seed hexadecimal de 128 bits e parser estrito;
  - identificador estável `xoshiro128ss-v1` e estado explícito de quatro palavras `uint32`;
  - transição `xoshiro128**` 1.1, clonagem de estado e geração de `uint32`;
  - geração de inteiros em intervalo exclusivo sem viés de módulo;
  - derivação determinística dos streams `spawn`, `loot`, `weather` e `patterns` pela função `jump` oficial;
  - golden vectors independentes para parser, sequência base, saltos, streams e amostragem limitada;
  - testes unitários e determinísticos em Node, execução do mesmo corpus em Chromium, documentação do módulo e integração da suíte determinística ao gate local aplicável;
  - atualização de ADR, rastreabilidade, roadmap e memória.
- Fora de escopo:
  - loop fixo, `RunConfig`, `RunState`, `InputFrame`, hash de estado, checkpoint ou replay (`F0-05`);
  - geração de seeds Daily/Weekly, `ChallengeManifest`, calendário UTC/ISO, backend ou assinatura (`F3-03`);
  - spawns, loot, clima, patterns ou qualquer regra que consuma os streams;
  - aleatoriedade criptográfica, segredo, token, UUID, autenticação ou uso de Web Crypto;
  - floats aleatórios, distribuição normal, shuffle, escolha ponderada ou helpers de gameplay prematuros;
  - fast-check ou nova dependência; propriedades necessárias podem ser cobertas com loops determinísticos em Vitest;
  - alteração das regras de lint pendentes em F0-03, renderer, UI, conteúdo, save, asset, PWA ou backend.

## Regras e contratos

### Organização e API pública

- Implementar sob `src/simulation/random/`, com um único barrel público local se isso reduzir imports internos. Testes ficam em `tests/unit` e `tests/determinism`; não mover a biblioteca para `shared`.
- A API não mantém singleton, seed global ou estado oculto. Toda mutação ocorre apenas no estado recebido explicitamente.
- O contrato mínimo equivalente é:

```ts
type Seed128 = string & { readonly __seed128: unique symbol };
type RngAlgorithm = 'xoshiro128ss-v1';
type RngStreamId = 'spawn' | 'loot' | 'weather' | 'patterns';

type SeedParseErrorCode =
  | 'invalid-length'
  | 'invalid-character'
  | 'zero-seed';

type SeedParseResult =
  | { readonly ok: true; readonly value: Seed128 }
  | { readonly ok: false; readonly code: SeedParseErrorCode };

type RngState = {
  readonly algorithm: RngAlgorithm;
  s0: number;
  s1: number;
  s2: number;
  s3: number;
};

declare function parseSeedHex(input: string): SeedParseResult;
declare function createRngState(seed: Seed128): RngState;
declare function createRngStreams(
  seed: Seed128,
): Record<RngStreamId, RngState>;
declare function cloneRngState(state: RngState): RngState;
declare function nextUint32(state: RngState): number;
declare function nextIntExclusive(
  state: RngState,
  upperExclusive: number,
): number;
```

- Nomes de arquivo, uso de `interface` versus `type` e divisão interna podem variar, mas nomes públicos, valores versionados, semântica e erros não podem mudar silenciosamente.
- `nextUint32` e `nextIntExclusive` mutam somente as quatro palavras do estado recebido. `algorithm` nunca muda. Estados de streams distintos não compartilham objeto ou array mutável.
- `cloneRngState` produz cópia independente. Avançar original e clone a partir do mesmo snapshot gera os mesmos valores; avançar um não altera o outro.

### Seed canônica

- Entrada válida: exatamente 32 caracteres ASCII em `[0-9a-fA-F]`, sem trimming implícito, prefixo `0x`, hífen, underscore ou outro separador.
- A saída canônica é sempre minúscula. A divisão em palavras segue a ordem textual, oito caracteres por palavra, da mais significativa para a menos significativa: `0123456789abcdeffedcba9876543210` vira `[0x01234567, 0x89abcdef, 0xfedcba98, 0x76543210]`.
- O parser valida primeiro comprimento, depois caracteres e por fim estado zero, retornando respectivamente `invalid-length`, `invalid-character` ou `zero-seed`. Não lança para entrada textual inválida e não inclui a entrada na mensagem/objeto de erro.
- `00000000000000000000000000000000` é inválida porque o estado todo zero é absorvente em `xoshiro128**`. `ffffffffffffffffffffffffffffffff` é válida.
- `createRngState` recebe apenas `Seed128` já validada. Não repete parsing permissivo nem inventa fallback para seed inválida.

### `xoshiro128**` 1.1

- Implementar exatamente a transição oficial 1.1. O resultado de cada chamada é `rotl(imul(s1, 5), 7) * 9` em aritmética modular unsigned de 32 bits; depois aplicar a transição das quatro palavras e `rotl(s3, 11)` definida na referência.
- Usar `Math.imul` para multiplicações de 32 bits e normalizar resultados/palavras com `>>> 0`. Não usar multiplicação `number` sem truncamento explícito, `BigInt`, float para estado, typed array dependente de endianness ou coerção por string.
- Cada palavra permanece inteira no intervalo `0..0xffffffff`. A implementação não chama `Math.random`, tempo, crypto, rede ou qualquer API externa.
- `RngState.algorithm` é sempre `xoshiro128ss-v1`. Snapshot com outro identificador não deve ser aceito futuramente como se fosse v1.
- O código de referência é normativo para transição e constantes de salto, não uma dependência de runtime. A atribuição/licença public-domain da referência deve permanecer citada na documentação do módulo.

### Streams e saltos

- `createRngStreams` começa do estado formado diretamente pelas quatro palavras da seed validada.
- `spawn` recebe o estado base, `loot` o estado após um `jump`, `weather` após dois e `patterns` após três. Cada `jump` equivale a `2^64` chamadas e usa, nessa ordem, as constantes oficiais `0x8764000b`, `0xf542d2d3`, `0x6fa035c3`, `0x77f2db5b`.
- A tabela normativa de índices é: `spawn=0`, `loot=1`, `weather=2`, `patterns=3`. Não ordenar alfabeticamente nem derivar índice da posição incidental em objeto/enum.
- A derivação não consome nem retorna um stream raiz observável. Estados retornados são cópias independentes.
- Novo stream futuro deve receber um índice novo ao final da tabela por spec/ADR. Reordenar, remover/reutilizar índice ou trocar derivação altera o contrato determinístico.

### Inteiro limitado sem viés

- `nextIntExclusive(state, upperExclusive)` aceita somente inteiro seguro entre `1` e `0x1_0000_0000`, inclusive no limite superior. Qualquer zero, negativo, fração, `NaN`, infinito ou valor acima desse limite lança `RangeError` com mensagem estável que identifica o parâmetro, sem avançar o estado.
- A mensagem contratada para esse erro é `upperExclusive must be an integer between 1 and 4294967296.`.
- Para `upperExclusive === 0x1_0000_0000`, retornar diretamente `nextUint32(state)`.
- Para limites menores, usar rejection sampling unsigned. Calcular `threshold = (2^32 - upperExclusive) % upperExclusive`; descartar valores menores que `threshold` e retornar `value % upperExclusive` no primeiro valor aceito.
- Cada descarte avança o estado e faz parte do contrato/replay. Não substituir por `Math.floor(next / 2^32 * upperExclusive)` nem por módulo direto enviesado.

### Versionamento e incompatibilidades

- Golden vectors são artefatos normativos, não snapshots atualizados automaticamente. Devem conter seed/estado/stream/chamadas e valores esperados em hexadecimal de oito dígitos para evitar ambiguidade de signed bitwise.
- Os valores esperados devem ser calculados uma vez por implementação de referência independente e então hardcoded; o teste não pode gerar seu próprio expected com a função sob teste.
- Alterar transição, scrambler, ordem de palavras, formato canônico, tabela de streams, constantes de salto ou política de consumo do bounded integer exige novo identificador de algoritmo e ADR/nota de migração. Depois que uma ruleset for publicada, exige também nova `rulesetVersion`; nunca atualizar goldens silenciosamente.
- Corrigir apenas mensagem não normativa ou implementação sem mudar saídas preserva `xoshiro128ss-v1`, desde que todo o corpus golden permaneça idêntico.

### Comportamentos não funcionais

- Determinismo: aplicável e central. Todas as operações dependem exclusivamente de seed/estado/argumentos explícitos; os testes devem repetir sequências, clonar/restaurar estado e provar independência entre streams.
- Performance: cada draw é O(1), sem I/O e sem alocação interna obrigatória. Não há budget ou benchmark de gate em F0-04; F0-06 mede desempenho. `createRngStreams` pode alocar apenas durante inicialização.
- UI responsiva: não aplicável; nenhum componente visual é criado.
- Assets: não aplicável; nenhum asset é criado ou carregado.
- i18n: não aplicável; códigos de erro são identificadores técnicos estáveis, não texto exibido.
- Save/compatibilidade: não há save ou migração em F0-04. O estado possui identificador de algoritmo e palavras JSON-safe para F0-05 definir snapshots; esta spec não cria schema persistido.
- Segurança/privacidade: o PRNG não é criptográfico e sua documentação deve proibir uso para segredo, token, autenticação ou assinatura. Nenhum dado pessoal, telemetria ou secret é introduzido.
- Offline: aplicável por ausência de dependência externa; toda API funciona localmente sem rede. Isso não entrega cache PWA nem conclui `PWA-01`.

## Critérios de aceitação

- [x] Given seeds com caixa alta/baixa válidas, when são parseadas, then retornam o mesmo `Seed128` canônico minúsculo e a ordem de quatro palavras contratada.
- [x] Given comprimento inválido, caractere inválido ou seed zero, when o parser roda, then retorna o código específico, não lança, não normaliza espaços/prefixos e não cria estado.
- [x] Given um estado não zero de referência, when `nextUint32` é chamado para o corpus golden, then cada saída e cada snapshot final corresponde bit a bit à referência `xoshiro128**` 1.1.
- [x] Given a seed golden, when os quatro streams são criados, then seus estados correspondem aos índices de salto `0..3` e nenhum objeto mutável é compartilhado.
- [x] Given dois bancos criados da mesma seed, when recebem as mesmas chamadas por stream, then produzem as mesmas sequências; chamadas extras em um stream não alteram qualquer outro.
- [x] Given um estado clonado, when original e clone avançam igualmente, then suas saídas coincidem; avançar apenas um preserva o snapshot do outro.
- [x] Given limites válidos incluindo `1`, valores não potência de dois e `2^32`, when `nextIntExclusive` roda, then toda saída está em `[0, upperExclusive)` e os goldens confirmam rejection sampling/consumo contratado.
- [x] Given limite inválido, when `nextIntExclusive` é chamado, then lança `RangeError` estável antes de avançar o estado.
- [x] Given execuções repetidas em Node e Chromium disponíveis no gate atual, when o mesmo arquivo de corpus determinístico roda, then os valores hex e estados finais são idênticos; ampliação para Firefox/WebKit permanece no roadmap de replay/cross-browser.
- [x] Given inspeção de `src/simulation/random`, when imports e APIs são auditados, then não há Phaser, DOM, locale, storage, rede, relógio, crypto, `Math.random`, dependência nova ou estado global mutável.
- [x] Given a implementação concluída, when os gates aplicáveis são executados, then format, lint, typecheck, unitários, determinismo e build passam, sem alterar os goldens ou alegar conclusão integral de `DET-01`/`DET-02`.
- [x] A documentação registra API, versão, formato da seed, erro zero, tabela de streams, não uso criptográfico, fonte/licença, comandos realmente executados e limitações.

## Plano de teste

- unitário:
  - tabela de parser com limites de comprimento, caixa, caracteres ASCII/não ASCII, prefixo, espaços, zero e máximo;
  - validação e ausência de avanço para todos os limites inválidos de `nextIntExclusive`;
  - clonagem sem aliasing e invariantes `uint32` após sequência longa determinística;
  - faixas `1`, potências de dois, não potências e `2^32`, incluindo caminho de rejeição observado por golden ou estado final.
- determinismo:
  - corpus de dados compartilhado em `tests/determinism`, sem lógica que replique o algoritmo sob teste;
  - golden da transição a partir de estado explícito não zero com primeiras saídas e estado final;
  - golden das quatro palavras derivadas para cada stream a partir de ao menos duas seeds, incluindo palavras com bit alto ativo;
  - repetição do corpus e comparação em hexadecimal unsigned;
  - independência por permutações da ordem de consumo dos quatro streams;
  - execução em Node por uma configuração Vitest dedicada que colete `tests/determinism`, exposta como `test:determinism` e incluída em `check` entre unitários e build;
  - execução do mesmo corpus em Chromium por um teste Playwright em `tests/e2e`, importando o módulo servido pelo Vite no contexto da página; não adicionar hook global à aplicação nem converter isso em teste visual.
- integração/E2E:
  - não há fluxo de produto. Reusar `test:e2e`/Playwright e seu servidor Vite apenas para executar o corpus puro no browser; nenhuma alteração ou asserção de UI/canvas é necessária para esse caso.
- manual/performance/viewports:
  - inspeção da documentação/fonte oficial, ausência de dependências/APIs proibidas e representação unsigned;
  - performance, FPS e viewports são não aplicáveis; não apresentar microbenchmark como gate.
- comandos mínimos de evidência:

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test:unit
npm run test:unit:coverage
npm run test:determinism
npm run build
npm run check
npm run test:e2e
git diff --check
git status --short
```

O implementador deve integrar `test:determinism` ao `check`, preservando a ordem `unit → determinism → build`. O teste Chromium entra na suíte `test:e2e` que o workflow já executa; não modificar CI além do mínimo necessário aos novos arquivos/scripts. Nenhum comando acima é evidência antes de ser executado.

## Migração e rollback

Não há ruleset publicada, save, replay ou hash anterior a migrar. A implementação é aditiva e `xoshiro128ss-v1` começa sem consumidor de gameplay.

O rollback seguro reverte toda a unidade F0-04: biblioteca, testes, script determinístico e documentação relacionada. Não deixar `RunState`, consumidor parcial ou golden órfão. Se um erro algorítmico for descoberto antes de publicação, corrigir a implementação e manter no histórico a razão da mudança; depois de publicação, preservar v1 para leitura/replay e adicionar uma versão sucessora em vez de reescrever resultados.

## Evidências de conclusão

- Commit/diff isolado de F0-04 com arquivos da biblioteca, testes, script e documentação; nenhuma correção pendente de F0-03 misturada.
- Corpus golden versionado com fonte independente, seed/estado/stream/chamadas e expected unsigned em hexadecimal.
- Saídas resumidas e exit codes dos comandos realmente executados; resultado Node e browser do corpus determinístico.
- Provas focadas de seed inválida, estado zero recusado, limite inválido sem avanço, rejection sampling e independência de streams.
- Inspeção de imports/APIs proibidos, dependências e worktree; ADR-0004 e rastreabilidade atualizados sem marcar `DET-01` ou `DET-02` como `Done`.

### Evidências executadas em 2026-06-28

- RED/GREEN unitário: `npm run test:unit -- --run tests/unit/random.test.ts` falhou inicialmente por ausência de `src/simulation/random` e passou depois com 28 testes; a suíte final possui 30/30 testes verdes em 2 arquivos.
- RED/GREEN determinístico: `npm run test:determinism` falhou inicialmente nos 2 casos de streams por ausência de `createRngStreams` e passou depois com 5/5 testes.
- Corpus independente: programa C temporário compilado com `cc -std=c11 -Wall -Wextra -Werror` a partir da transição/`jump` oficiais; expected values foram hardcoded em hexadecimal em `tests/determinism/randomGoldenVectors.ts`.
- `npm run format:check`, `npm run lint` e `npm run typecheck`: exit `0`.
- `npm run test:unit`: 2 arquivos e 30/30 testes verdes.
- `npm run test:unit:coverage`: 2 arquivos e 30/30 testes verdes; o relatório textual reproduzível mostrou `src/simulation/random` com 100% de statements, branches, functions e lines. O total combinado foi 88% de statements (66/75), 84,21% de branches (16/19), 90,9% de functions (10/11) e 87,83% de lines (65/74), devido à cobertura parcial de `src/app/bootstrapApplication.ts` fora do escopo de F0-04.
- `npm run test:unit:coverage -- --run tests/unit/random.test.ts`: 1 arquivo e 29/29 testes verdes em 630 ms; o teste longo consumiu 107 ms e o relatório exibiu explicitamente `src/simulation/random` com 100% nas quatro métricas. A mesma execução com `--testTimeout=1000` também passou, depois de falhar antes da correção.
- `npm run test:determinism`: 1 arquivo e 5/5 testes verdes em Node.
- `npm run build`: exit `0`; permaneceu o aviso conhecido do chunk Phaser de 1.200,71 kB (gzip 320,30 kB), cujo budget pertence a F0-06.
- `npm run check`: exit `0`, na ordem format/lint/typecheck/unit/determinism/build.
- `CI=1 npm run test:e2e`: 4/4 testes verdes em Chromium, cobrindo corpus e smoke nos projetos `mobile-320x568` e `desktop-1920x1080`.
- `git diff --check`: exit `0`; inspeção por `rg` encontrou somente imports relativos locais nos `.ts` de `src/simulation/random`; `package-lock.json` não mudou.

## Histórico de revisão

- 2026-06-28 — design de `xoshiro128**` aprovado pelo proprietário; spec inicial criada com F0-02 verificado como `Done` e F0-03 reconhecido como não bloqueante. ADR-0004 permanece `Proposed` até aprovação da spec. Nenhum código runtime/teste foi alterado e nenhum comando de implementação foi alegado como evidência.
- 2026-06-28 — SPEC-F0-04 e ADR-0004 aprovados pelo proprietário; item movido para `In progress` para implementação.
- 2026-06-28 — implementação e evidências concluídas; item movido para `In review`, aguardando `$review-roadmap-item F0-04` independente.
- 2026-06-28 — revisão independente executou `npm run check`, `npm run test:unit:coverage`, `npm run test:unit:coverage -- --run tests/unit/random.test.ts`, `CI=1 npm run test:e2e`, `git diff --check` e auditoria de imports/APIs proibidos. Resultado: `Changes requested`. Finding `High`: a evidência declarada de cobertura focada do módulo random não é reproduzível com a configuração atual. O comando focado falha por timeout no teste `keeps every state word unsigned through a long sequence` em `tests/unit/random.test.ts:100`, e o script padrão `npm run test:unit:coverage` não comprova a alegação registrada em “Evidências executadas em 2026-06-28” de 100% para `src/simulation/random` porque o relatório produzido na revisão listou apenas `src/app/bootstrapApplication.ts`. Corrigir a reprodutibilidade da evidência/gate de coverage e então atualizar a spec com o comando realmente suportado e sua saída.
- 2026-06-28 — finding corrigido sem alterar runtime, API ou goldens: o teste de 10.000 draws passou a acumular qualquer valor inválido e fazer uma única asserção, removendo dezenas de milhares de chamadas instrumentadas; o reporter textual fixa `skipFull: false` em suas próprias opções para impedir a ocultação automática de arquivos com 100% em agentes/CI. Gates repetidos e item devolvido para `In review`.
- 2026-06-28 — segunda revisão independente: `Approved`, sem findings `Critical`, `High`, `Medium` ou `Low`. O finding anterior foi resolvido: tanto `npm run test:unit:coverage` quanto o comando focado com `--testTimeout=1000` passaram e exibiram `src/simulation/random` com 100% nas quatro métricas; o focado concluiu 29/29 testes em 605 ms. `npm run check` passou com 30/30 unitários, 5/5 determinísticos e build; duas repetições adicionais de `test:determinism` passaram 5/5; `CI=1 npm run test:e2e` passou 4/4 no Chromium; `npm ls --depth=0`, `git diff --check`, inspeção de worktree/imports/APIs e conferência com a fonte oficial também passaram. A auditoria [`2026-06-28-f0-04`](../audits/determinism/2026-06-28-f0-04.md) recebeu `Pass`. Item movido para `Done`; `DET-01` permanece `Planned` como fundação parcial.
