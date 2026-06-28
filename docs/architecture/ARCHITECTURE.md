# Arquitetura do sistema

## Visão geral

O produto é um cliente PWA offline-first. Phaser não é a fonte de verdade da partida: ele adapta inputs, renderiza snapshots e toca áudio. O núcleo TypeScript puro produz o estado canônico.

```text
Input adapters ──> Simulation Core ──> snapshots/events ──> Phaser renderer/audio
 touch/keys/pad     rules + RNG +       immutable/read-only   scenes + pools
                    collision + director
                         │
                         v
                run record / replay
                         │
       IndexedDB <── application services ──> Supabase Edge/API
                         │
                  DOM UI + i18n + PWA
```

## Stack

- TypeScript em modo `strict`;
- Phaser 3 para WebGL/Canvas fallback, cenas, câmera, sprites, partículas e áudio;
- Vite e plugin PWA/Workbox para bundle e service worker;
- Vitest + fast-check (propriedades, quando útil) e Playwright;
- DOM/CSS para menus densos e acessíveis; Canvas/Phaser para gameplay/HUD de alta frequência;
- IndexedDB via uma abstração pequena (Dexie é aceitável) e localStorage apenas para flags triviais;
- Supabase Auth/Postgres/Edge Functions no plano gratuito, integrado por interface.

Dependências exatas devem ser fixadas no lockfile e revisadas antes do scaffold.

## Módulos alvo

```text
src/
  simulation/       # TS puro: tick, entities, collision, RNG, director, scoring
  game/             # Phaser: scenes, renderer, input adapters, audio, pools
  app/              # navegação, telas DOM, view-models, i18n
  content/          # definitions/manifests validados, sem lógica executável
  services/         # ports/adapters: storage, Supabase, share, payments
  platform/         # PWA, lifecycle, viewport, capabilities
  shared/           # tipos/utilitários realmente compartilhados
assets/
  core/             # assets mínimos empacotados
public/
tests/
  unit/ determinism/ integration/ e2e/ performance/
```

## Fronteiras

- `simulation` não importa Phaser, browser APIs, i18n, storage ou rede.
- `content` contém valores e schemas; o núcleo consome conteúdo compilado/validado.
- `game` traduz input real em `InputFrame`, chama ticks e interpola visualmente.
- `app` coordena telas e casos de uso, nunca implementa regras da run.
- `services` implementa interfaces definidas pelo caso de uso; Supabase é substituível por fake.
- eventos de domínio (`EnemyDestroyed`, `CoinCollected`, `RunEnded`) alimentam áudio, efeitos e estatísticas sem acoplar o core.

## Modelo da run

`RunConfig` congela `mode`, `seed`, `rulesetVersion`, `contentVersion`, aeronave/loadout permitido e modificadores. `RunState` guarda tick, entidades, RNG streams, score, distância, clima e estatísticas. `InputFrame` usa valores quantizados. `RunResult` contém resumo e hash de verificação.

## Entidades, colisões e formas

Não derivar hitbox de pixels. Cada definição usa uma ou mais primitivas locais (`circle`, `aabb`, `capsule` ou polígono convexo quantizado). Formas côncavas são compostas por convexas. Broad phase usa grid espacial; narrow phase só testa pares candidatos. Sprites mantêm pivot/escala definidos no catálogo, independentemente da hitbox.

Estruturas destrutíveis podem ter partes/segmentos com HP próprio. A primeira versão pode usar caixas/círculos compostos; polígonos entram apenas após profiling e testes determinísticos.

## Dados e versionamento

- schemas de conteúdo validados em build e runtime de desenvolvimento;
- IDs nunca são reciclados;
- save possui `schemaVersion` e migrações incrementais testadas;
- placar guarda versões de regras/conteúdo e build;
- alteração de regra que muda replay incrementa `rulesetVersion`;
- conteúdo antigo necessário para validar desafios fica disponível pelo período de retenção.

## Performance

- tick fixo 60 Hz, render no refresh disponível com interpolação quando necessário;
- pools para projéteis, inimigos, moedas, partículas e componentes temporários;
- texture atlases, draw-call budget e áudio pré-decodificado conforme capacidade;
- culling, limites rígidos de entidades/projéteis e quality tiers;
- nenhuma leitura de layout DOM no loop;
- listeners, timers e assets são liberados ao trocar cenas;
- telemetria local de frame time, tick time, entidades e draw calls em build de diagnóstico.

## Resiliência

O gameplay não depende da rede. Operações sociais são idempotentes e entram em fila local. Falhas de asset pack revertem para core assets. Migração inválida preserva backup do save. Atualização de service worker só ativa entre runs para não misturar versões.
