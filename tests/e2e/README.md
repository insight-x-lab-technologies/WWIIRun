# E2E

Smokes de browser e viewports executados no Chromium empacotado pelo Playwright. Instale-o com `npx playwright install chromium` e execute `npm run test:e2e`. O gate de service worker é separado em `npm run test:pwa`, pois exige build de produção e origin isolado.
