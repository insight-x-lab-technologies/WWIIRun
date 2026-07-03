# Performance

O harness F0-06 usa entrypoint/config Vite próprios e nunca integra o build de produção. `tier-base-stress-v1` gera textura em memória, três camadas de parallax e 1.200 imagens reutilizadas; o coletor produz `wwiirun.performance-report.v1` sem rede ou telemetria.

- execução manual/LAN: `npm run performance:harness` em `0.0.0.0:8080`;
- smoke Playwright interno: `127.0.0.1:8081`, sem disputar a porta manual;
- smoke estrutural: `npm run test:e2e`;
- protocolo e matriz física: [`docs/performance/README.md`](../../docs/performance/README.md).
