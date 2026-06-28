# Testes

Vitest coleta `tests/unit/**/*.test.ts` em `npm run test:unit`. A configuração dedicada `npm run test:determinism` coleta `tests/determinism/**/*.test.ts`; o corpus de dados dessa pasta também é reutilizado pelo Playwright em Chromium. `npm run test:e2e` coleta `tests/e2e`.

Golden vectors são normativos. Alterações exigem justificativa de versão/ADR, não atualização automática de snapshot.
