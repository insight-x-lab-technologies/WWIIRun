# Testes

Vitest coleta `tests/unit/**/*.test.ts` em `npm run test:unit`. A configuração dedicada `npm run test:determinism` coleta `tests/determinism/**/*.test.ts`; o corpus de dados dessa pasta também é reutilizado pelo Playwright em Chromium. `npm run test:e2e` coleta `tests/e2e`.

Golden vectors são normativos. Alterações exigem justificativa de versão/ADR, não atualização automática de snapshot. F0-05 acrescenta testes unitários de config/input, atomicidade, chunking, aliasing, overflow, layout do hash e 100.000 ticks, além do mesmo corpus de run em Node e Chromium.
