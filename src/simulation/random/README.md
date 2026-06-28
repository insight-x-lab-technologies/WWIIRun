# Random determinístico

Este módulo implementa o contrato `xoshiro128ss-v1` de F0-04. Ele é TypeScript puro, não mantém estado global e não depende de Phaser, DOM, locale, storage, rede, relógio ou entropia externa.

## API

- `parseSeedHex(input)` aceita exatamente 32 dígitos hexadecimais ASCII, normaliza letras para minúsculas e retorna erro tipado para comprimento, caractere ou seed toda zero;
- `createRngState(seed)` divide a seed canônica em quatro palavras `uint32` na ordem textual, da mais significativa para a menos significativa;
- `nextUint32(state)` muta somente as quatro palavras do estado e retorna o próximo `uint32`;
- `nextIntExclusive(state, upperExclusive)` usa rejection sampling para limites de `1` a `2^32`;
- `cloneRngState(state)` cria um snapshot mutável independente;
- `createRngStreams(seed)` cria quatro estados independentes conforme a tabela normativa.

| Stream | Índice de `jump` (`2^64`) |
|---|---:|
| `spawn` | 0 |
| `loot` | 1 |
| `weather` | 2 |
| `patterns` | 3 |

Novos streams devem ser anexados por spec/ADR. Reordenar ou reutilizar um índice muda o contrato determinístico.

## Compatibilidade e segurança

O algoritmo e seu consumo fazem parte da ruleset. Mudanças de saída exigem novo identificador de algoritmo e, após publicação, nova `rulesetVersion`; os goldens nunca devem ser atualizados silenciosamente.

Este PRNG **não é criptograficamente seguro**. Não o use para segredos, tokens, autenticação, assinaturas ou UUIDs de segurança.

Transição e constantes de salto: implementação oficial [`xoshiro128**` 1.1](https://prng.di.unimi.it/xoshiro128starstar.c), escrita por David Blackman e Sebastiano Vigna e dedicada ao domínio público na extensão permitida por lei. A fonte é normativa, não uma dependência de runtime.

## Verificação

- `npm run test:unit` cobre parsing, erros, invariantes, clone, streams e limites;
- `npm run test:unit:coverage -- --run tests/unit/random.test.ts` imprime a cobertura focada do módulo, inclusive em ambientes de agente/CI;
- `npm run test:determinism` executa o corpus golden em Node;
- `npm run test:e2e` executa o mesmo corpus em Chromium pelo Vite.
