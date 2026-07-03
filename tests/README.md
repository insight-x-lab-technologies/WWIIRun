# Testes

Vitest coleta `tests/unit/**/*.test.ts` em `npm run test:unit`. A configuração dedicada `npm run test:determinism` coleta `tests/determinism/**/*.test.ts`; o corpus de dados dessa pasta também é reutilizado pelo Playwright em Chromium. `npm run test:e2e` coleta `tests/e2e`.

Golden vectors são normativos. Alterações exigem justificativa de versão/ADR, não atualização automática de snapshot. F0-05 acrescenta testes unitários de config/input, atomicidade, chunking, aliasing, overflow, layout do hash e 100.000 ticks, além do mesmo corpus de run em Node e Chromium.

F0-06 acrescenta contratos unitários de relatório/budgets e um segundo estágio Playwright que serve apenas `tests/performance/`. O smoke interno usa `127.0.0.1:8081`, enquanto o harness manual e `./scripts/run.sh` preservam `8080`. O smoke valida estrutura e lifecycle; não aplica thresholds temporais do hardware ao runner.

F0-07 acrescenta unitários de base/coordinator/aviso/inspeção/workflow e `npm run test:pwa`. O gate PWA constrói duas versões em diretório temporário e usa um origin Chromium isolado para manifest, scope, precache, offline, requests negativos e update A/B; ele não executa Pages.
