# ADR-0004: PRNG versionado e streams independentes

Status: Accepted  
Data: 2026-06-28  
Decisores: proprietário do projeto e agentes técnicos

## Contexto

O núcleo precisa transformar uma seed de desafio de 128 bits em sequências reproduzíveis em JavaScript, sem `Math.random`, relógio, rede, Web Crypto, floats de gameplay ou estado implícito. Sistemas como spawn, loot, clima e padrões não podem compartilhar uma única sequência, pois adicionar um sorteio em um sistema mudaria resultados dos demais.

## Opções consideradas

- `xoshiro128**` com quatro palavras de 32 bits e streams separados por `jump`: encaixa diretamente no contrato de inteiros de 32 bits, tem implementação de referência pública, estado pequeno e saltos de subsequência definidos;
- `sfc32`: implementação menor, mas sem o mesmo contrato de saltos não sobrepostos e com menor margem de qualidade estatística para uma fundação durável;
- `PCG32`: qualidade adequada, porém a variante canônica requer aritmética de 64 bits, aumentando complexidade e risco de diferenças entre uma implementação `BigInt` e emulação por palavras de 32 bits.

## Decisão

Adotar `xoshiro128**` versão 1.1 como `xoshiro128ss-v1`, reproduzindo a transição e o scrambler da implementação de referência de David Blackman e Sebastiano Vigna. O estado são quatro palavras unsigned de 32 bits e nunca pode ser todo zero.

A seed externa canônica contém exatamente 32 dígitos hexadecimais. Letras maiúsculas são aceitas na entrada e normalizadas para minúsculas; prefixo `0x`, separadores, espaços, tamanho diferente, caracteres não ASCII e a seed toda zero são rejeitados.

Os streams iniciais são subsequências da mesma seed separadas pela função `jump`, equivalente a `2^64` chamadas, com índices imutáveis:

| Stream | Índice de `jump` |
|---|---:|
| `spawn` | 0 |
| `loot` | 1 |
| `weather` | 2 |
| `patterns` | 3 |

Novos streams recebem índices anexados, nunca reutilizados ou reordenados. A API pública produz `uint32` e inteiros em intervalo por rejection sampling; não oferece float pseudoaleatório.

Fonte algorítmica normativa: [implementação oficial de `xoshiro128**` 1.1](https://prng.di.unimi.it/xoshiro128starstar.c).

## Consequências

- o comportamento fica reproduzível com operações `Math.imul`, bitwise e `>>> 0`, sem `BigInt` ou dependência externa;
- cada sistema pode avançar seu stream sem deslocar os demais;
- seed zero precisa ser recusada antes da criação do estado;
- estado, ordem dos streams, constantes de `jump`, consumo por rejection sampling e golden vectors passam a integrar o contrato da ruleset;
- qualquer alteração que mude saídas ou consumo exige novo identificador de algoritmo, nota de migração/ADR e nova `rulesetVersion` quando houver ruleset publicada;
- o gerador não é criptograficamente seguro e não pode criar segredo, token, assinatura ou material de autenticação.
