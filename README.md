# WWIIRun

WWIIRun é um roguelike/bullet hell 2D side-scroller para PWA, inspirado em jogos como *Steredenn: Binary Stars* e ambientado em uma fantasia de aviação da Segunda Guerra Mundial. O projeto é hobby, usa apenas ferramentas gratuitas/open source e foi desenhado para desenvolvimento orientado por especificações com agentes.

## Estado atual

O projeto está na fase **F0 — Fundação**. O scaffold executa um renderer Phaser vazio; ainda não há gameplay. A fonte de verdade para escopo, arquitetura, decisões e execução é o [índice de documentação](docs/README.md).

## Executar o scaffold

Requer Node `24.15.0`, registrado em `.nvmrc`, e npm. Não requer conta, segredo, variável de ambiente ou serviço externo.

```bash
nvm use
npm ci
npx playwright install chromium
npm run check
npm run test:e2e
npm run test:pwa
npm run dev
```

`npm run check` executa, em ordem, verificação de formatação, lint, typecheck de runtime/tooling, unitários, determinismo e `build`. O `build` repete o typecheck, valida conteúdo, gera o bundle Vite, inspeciona o contrato PWA/base e aplica os budgets versionados de bundle/assets. O E2E fica separado porque requer Chromium; `test:e2e` cobre produto/harness e `test:pwa` cobre build `/WWIIRun/`, manifest, offline e update A/B. `npm run preview` serve localmente o build estático criado em `dist/`.

Scripts individuais: `format`, `format:check`, `lint`, `typecheck`, `test:unit`, `test:unit:coverage`, `test:determinism`, `content:validate`, `pwa:inspect`, `performance:budget`, `performance:harness`, `build`, `test:e2e` e `test:pwa`. Coverage, relatórios/traces do Playwright, build e caches são gerados e ignorados. A CI de qualidade não publica o app. O workflow Pages é separado, somente manual e não deve ser executado sem autorização explícita.

O gate automatizado comprova os vetores/hashes determinísticos atuais, budgets versionados e o shell PWA Chromium. Isso não conclui os requisitos amplos `DET-01`, `PERF-01`, `PWA-01` ou `COST-01`: metas físicas, browsers/aparelhos adicionais, save/recovery e release autorizado permanecem futuros. Consulte [PWA local e preview manual](docs/operations/PWA_PREVIEW.md).

## Stack decidida

- TypeScript, Phaser 3 e Vite;
- núcleo de simulação TypeScript puro, com passo fixo de 60 Hz;
- Vitest para testes unitários/determinismo e Playwright para fluxos PWA;
- Supabase no backend social, sem bloquear o jogo offline;
- PWA para GitHub Pages e itch.io; empacotamento futuro via Capacitor/PWABuilder.

## Como trabalhar neste repositório

1. Leia [AGENTS.md](AGENTS.md) e [docs/memory/PROJECT.md](docs/memory/PROJECT.md).
2. Escolha o próximo item `Ready` no [roadmap](docs/roadmap/ROADMAP.md).
3. Em uma nova sessão, invoque `$specify-roadmap-item` e aprove a spec resultante.
4. Em outra sessão, invoque `$implement-roadmap-item` para executar a spec aprovada.
5. Em uma terceira sessão, invoque `$review-roadmap-item` para aceitar ou solicitar mudanças.
6. Use `$audit-determinism` e `$audit-roadmap-phase` nos gates indicados pelo roadmap.

## Princípios que não podem ser violados

- desafio diário/semanal reproduzível pela mesma versão da simulação e seed;
- cosméticos nunca alteram estado, hitbox, RNG ou ordem da simulação;
- controles adaptáveis, orientação portrait e landscape e funcionamento offline;
- orçamento de frame de 16,67 ms a 60 FPS, sem alocação desnecessária no hot path;
- nenhum segredo ou service-role key do Supabase no cliente;
- nenhum framework ou serviço pago obrigatório para lançar.

## Licença e referências

A licença do código e as licenças de áudio/arte ainda devem ser definidas em F0. Referências a jogos existentes descrevem gênero e mecânicas; não autorizam copiar marcas, código, personagens, áudio ou arte.
