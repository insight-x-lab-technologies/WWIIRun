# Auditoria de determinismo — implementação atual

Data: 2026-07-04  
Escopo: `HEAD` `4440b7a` mais documentação de lifecycle no worktree; `xoshiro128ss-v1`, `wwiirun.run-state.v1` e `fnv1a64-v1`  
Veredito: `Pass`

## Ambiente e superfície

- Node `v24.15.0`, npm `11.12.1`, Vitest `4.1.9` e Playwright `1.61.1`/Chromium;
- `src/simulation/random`: seed canônica, PRNG versionado e streams nomeados;
- `src/simulation/run`: config/input/estado canônicos, tick explícito de 60 Hz, executor headless, overflow e hash;
- corpora Node e Chromium de F0-04/F0-05 e isolamento cosmético de F0-08.

O diff do worktree não altera `src/simulation`, testes, goldens ou regras. Esta auditoria não regenerou outputs.

## Evidência executada

| Verificação | Resultado |
|---|---|
| `npm run check` | `Pass`: formato, lint, typecheck, 256 unitários, 7 determinísticos, validator, build, PWA inspector e budget |
| `npm run test:unit:coverage` | `Pass`: 256/256; `simulation/random` e `simulation/run` em 100% nas quatro métricas |
| `npm run test:determinism` ×3 após o gate | `Pass`: 7/7 em cada execução, além dos 7/7 do gate |
| `CI=1 npm run test:e2e` | `Pass`: 6/6 em Chromium nos viewports 320×568 e 1920×1080, incluindo os dois corpora determinísticos; harness 1/1 |
| scan de imports/APIs em `src/simulation` | `Pass`: somente imports internos; sem Phaser, DOM, rede, storage, locale, crypto, relógio, timers ou `Math.random` |
| inspeção do contrato | `Pass`: tick fixo, inputs inteiros quantizados, streams/ordem explícitos, layout/hash versionados e overflow fail-closed |

Os testes de browser exigiram execução fora do sandbox apenas para abrir servidores loopback; nenhum acesso externo ou alteração de produto foi necessário.

## Cobertura do contrato F0

- mesmos config/inputs em diferentes lotes headless produzem estado e hash idênticos;
- vetores do PRNG, rejection sampling, clones e streams são versionados e cobertos;
- estado/hash não dependem de enumeração incidental, locale, timezone, áudio, qualidade, viewport, FPS ou pack cosmético;
- inputs inválidos e overflow falham antes de mutação; runs não compartilham estado;
- corpus Node e Chromium passou de forma fresca nesta auditoria.

Gameplay, colisão, spawn e score entram em F1/F2; checkpoints persistidos, replay e `ChallengeManifest` entram em F3; packs cosméticos completos entram em F6. Firefox/WebKit continuam fora do corpus F0. Essas ausências não ampliam nem invalidam o contrato entregue nesta fase.

## Findings

Nenhum finding `Critical`, `High`, `Medium` ou `Low` no escopo atual.
