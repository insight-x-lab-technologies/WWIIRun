# Especificações de incremento

Cada item do roadmap em execução recebe um arquivo `SPEC-<roadmap-id>-<slug>.md` criado a partir de `../templates/SPEC-TEMPLATE.md`. Exemplo: `SPEC-F0-02-project-scaffold.md`.

Fluxo de estado: `Draft → Approved → In progress → In review → Done`, com retorno por `Changes requested`. Para mudanças técnicas internas sem ambiguidade, o proprietário pode considerar a aprovação implícita ao pedir explicitamente a implementação do ID. Economia, pagamento, privacidade, ruleset publicada e direção de arte sempre exigem aprovação explícita.

Specs concluídas permanecem no repositório como ligação entre requisito, decisão, código e evidência. Se o comportamento mudar, atualizar a spec ou criar sucessora com links claros; não reescrever história silenciosamente.

## Índice

- [`F0-01 — documentação base, requisitos, ADRs, templates e memória`](SPEC-F0-01-documentation-foundation.md) — `Done`.
- [`F0-02 — scaffold Vite, TypeScript strict e Phaser`](SPEC-F0-02-project-scaffold.md) — `Done`.
- [`F0-03 — toolchain de qualidade e CI`](SPEC-F0-03-quality-toolchain-and-ci.md) — `Done`.
- [`F0-04 — PRNG versionado, seeds, streams e golden vectors`](SPEC-F0-04-versioned-prng-seeds-streams.md) — `Done`.
- [`F0-05 — loop fixo/headless, contratos da run e hash`](SPEC-F0-05-fixed-headless-run-state-hash.md) — `Done`.
- [`F0-06 — harness de performance, matriz real e budgets`](SPEC-F0-06-performance-harness-matrix-budgets.md) — `Done`.
- [`F0-07 — shell PWA offline e preview GitHub Pages em subpath`](SPEC-F0-07-pwa-offline-pages-subpath.md) — `Done`.
- [`F0-08 — schemas de conteúdo/save e validadores de build`](SPEC-F0-08-content-save-schemas-build-validators.md) — `Done`.
- [`F1-01 — gameplay scene, viewport lógico e input teclado/touch`](SPEC-F1-01-gameplay-scene-viewport-input.md) — `Done`.
- [`F1-02 — aeronave, movimento, vida/dano e colisões primitivas/compostas`](SPEC-F1-02-aircraft-movement-health-damage-collisions.md) — `Done`.
- [`F1-03 — pools limitados de entidades e broad phase espacial`](SPEC-F1-03-bounded-pools-spatial-broad-phase.md) — `Done`.
- [`F1-04 — metralhadora e dois inimigos com HP/comportamento`](SPEC-F1-04-machine-gun-two-enemies.md) — `Done`.
- [`F1-05 — obstáculo/estrutura destrutível modular`](SPEC-F1-05-modular-destructible-structure.md) — `In review`.
