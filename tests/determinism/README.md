# Determinism

Golden vectors, replays e verificações cross-runtime da simulação.

O corpus `randomGoldenVectors.ts` foi calculado uma vez por um programa C independente baseado na implementação oficial, antes de ser hardcoded. Ele registra palavras e saídas como hexadecimal unsigned de oito dígitos e cobre parser/ordem, transição, estado final, saltos/streams e rejection sampling.

Execute em Node com `npm run test:determinism` e no Chromium com `npm run test:e2e`. Não regenere expected values a partir do TypeScript sob teste e não aceite alteração silenciosa do corpus.
