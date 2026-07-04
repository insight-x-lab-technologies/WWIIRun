# Auditoria de determinismo — implementação atual

Data: 2026-07-03  
Escopo: `HEAD` `4440b7a`, `xoshiro128ss-v1`, `wwiirun.run-state.v1` e `fnv1a64-v1`  
Veredito: `Conditional pass`

## Ambiente

- Node `v24.15.0`;
- npm `11.12.1`;
- Vitest `4.1.9`;
- Playwright `1.61.1` com Chromium gerenciado pelo projeto.

## Superfície auditada

- `src/simulation/random`: seed hexadecimal de 128 bits, PRNG versionado e streams `spawn`, `loot`, `weather` e `patterns`;
- `src/simulation/run`: config/input canônicos, tick explícito de 60 Hz, avanço headless, overflow e hash de estado;
- corpora Node em `tests/determinism` e os runners Chromium em `tests/e2e`;
- isolamento de metadados não competitivos e classificação cosmética de F0-08.

O diff encontrado antes dos registros desta auditoria continha somente documentação de encerramento de F0-07 e instruções locais; não alterava `src/simulation`, corpora ou goldens. Esta auditoria acrescentou apenas relatórios e handoff documental.

## Evidência executada

| Verificação | Resultado |
|---|---|
| `npm run check` | `Pass`: format, lint, typecheck, 256 unitários, 7 determinísticos, content validator, build, inspeção PWA e budget |
| `npm run test:unit:coverage` | `Pass`: 256/256; `simulation/random` e `simulation/run` em 100% nas quatro métricas |
| `npm run test:determinism` repetido 3 vezes após o gate | `Pass`: 7/7 em cada repetição, sem mudança de hash |
| varredura de APIs/imports em `src/simulation` | `Pass`: somente imports locais/`simulation`; sem Phaser, DOM, rede, storage, locale, crypto, relógio, timers ou `Math.random` |
| inspeção de contrato | `Pass`: 60 ticks/s, inputs inteiros quantizados, quatro streams em ordem explícita, tick overflow fail-closed e metadados cosméticos fora do hash |
| `npm run test:e2e` nesta sessão | `Unsupported`: sandbox retornou `connect EPERM 127.0.0.1:4173`; repetição autorizada fora do sandbox ficou sem progresso por mais de cinco minutos e foi encerrada sem resultado |

A indisponibilidade local de Playwright não é tratada como passe. A paridade Chromium continua sustentada pelos runners versionados, pelas aprovações independentes de F0-04/F0-05 e pelo run remoto `28687578396` no mesmo `HEAD` `4440b7a`, registrado como verde na revisão de F0-07.

## Cobertura do contrato

- mesmos config/inputs e diferentes partições headless produzem o mesmo estado/hash;
- vetores do PRNG, rejection sampling, clones e streams são versionados e cobertos por golden;
- estado/hash usam layout e ordem explícitos, sem enumeração incidental ou locale;
- input inválido e overflow falham antes de mutação; duas runs não compartilham estado;
- locale, timezone, áudio, quality, viewport, FPS e pack cosmético não alteram o hash;
- o catálogo cosmético validado não entra em `RunConfig` nem modifica o estado existente.

## Checks ainda não aplicáveis

Gameplay, entidades, colisão, spawn, score e overflow dessas grandezas entram em F1/F2. Restore/checkpoint persistido, replay completo, `ChallengeManifest`, períodos UTC/ISO e loadout normalizado entram em F3. Comparação de packs completos entra em F6. Firefox/WebKit permanecem fora do corpus F0. Essas ausências não ampliam o contrato já entregue pela F0.

## Findings e condição

Nenhum finding determinístico `Critical`, `High`, `Medium` ou `Low`. O veredito é condicional somente porque o corpus Chromium não pôde ser reexecutado nesta sessão; há evidência independente anterior no mesmo commit, mas não uma execução browser fresca produzida por esta auditoria.
