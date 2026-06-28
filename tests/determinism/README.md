# Determinism

Golden vectors, replays e verificações cross-runtime da simulação.

O corpus `randomGoldenVectors.ts` foi calculado uma vez por um programa C independente baseado na implementação oficial, antes de ser hardcoded. Ele registra palavras e saídas como hexadecimal unsigned de oito dígitos e cobre parser/ordem, transição, estado final, saltos/streams e rejection sampling.

O corpus `runGoldenVectors.ts` fixa uma run semanal com modificadores recebidos fora de ordem, oito inputs não triviais e checkpoints nos ticks 0, 1, 3 e 8. Os quatro hashes foram calculados por um script Python temporário e independente que empacotou diretamente o layout de 392 bytes e aplicou FNV-1a 64-bit; o script não importou TypeScript e não integra o repositório. Valores normativos: `0c8d1a30d7b17210`, `0de18a8817e3a594`, `6c361b31acf23fb3` e `8915f7da45a2a608`.

Execute em Node com `npm run test:determinism` e no Chromium com `npm run test:e2e`. Não regenere expected values a partir do TypeScript sob teste e não aceite alteração silenciosa do corpus.
