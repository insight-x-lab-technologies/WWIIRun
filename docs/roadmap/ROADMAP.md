# Roadmap de implementação

## Regras de execução

Cada item vira uma spec antes do código. Estados: `Backlog`, `Ready`, `Specified`, `In progress`, `In review`, `Changes requested`, `Done`, `Blocked`. O fluxo normal é `Ready → Specified → In progress → In review → Done`; findings retornam o item por `Changes requested → In progress`. Só uma revisão independente marca `Done`. Datas não são prometidas: fases fecham por exit criteria.

## F0 — Fundação e laboratório técnico

Objetivo: provar stack, determinismo, performance e deploy antes de criar volume de conteúdo.

| ID | Item | Dep. | Estado |
|---|---|---|---|
| F0-01 | Documentação base, requisitos, ADRs, templates e memória | — | Done |
| F0-02 | Scaffold Vite + TS strict + Phaser, módulos e scripts | F0-01 | Done |
| F0-03 | ESLint/Prettier, Vitest, Playwright e CI gratuito | F0-02 | Done |
| F0-04 | PRNG versionado, seed parser, streams e golden vectors | F0-02 | Done |
| F0-05 | Loop fixo/headless, InputFrame, RunConfig/State e hash | F0-04 | Done |
| F0-06 | Performance harness, matriz real e budgets de bundle/assets | F0-02 | Done |
| F0-07 | PWA shell offline e preview GitHub Pages em subpath | F0-03 | Done |
| F0-08 | Schemas de conteúdo/save e validadores de build | F0-02 | Done |

Exit: app vazio instalável; core headless repete golden run; CI verde; baseline medido em pelo menos um celular e desktop; nenhuma API proibida no core.

Fechamento: `Pass` em 2026-07-04; evidência em [`docs/audits/phases/2026-07-04-F0.md`](../audits/phases/2026-07-04-F0.md).

## F1 — Vertical slice jogável geométrico

Objetivo: uma run curta e divertida com placeholders, validando arquitetura completa.

| ID | Item | Dep. | Estado |
|---|---|---|---|
| F1-01 | Gameplay scene, viewport lógico e input teclado/touch | F0 | In review |
| F1-02 | Aeronave, movimento, vida/dano e colisões primitivas/compostas | F1-01 | Backlog |
| F1-03 | Pools de projéteis/inimigos/moedas e spatial broad phase | F1-02 | Backlog |
| F1-04 | Arma metralhadora e dois inimigos com HP/comportamento | F1-03 | Backlog |
| F1-05 | Obstáculo/estrutura destrutível modular | F1-03 | Backlog |
| F1-06 | Drops de moeda, coleta e estatísticas da run | F1-04 | Backlog |
| F1-07 | Parallax de 3+ camadas e placeholders substituíveis | F1-01 | Backlog |
| F1-08 | HUD: vida, distância, moedas, FPS, nível, velocidade e seed | F1-06 | Backlog |
| F1-09 | Game over overlay, retry/home e resumo | F1-08 | Backlog |
| F1-10 | Testes E2E portrait/landscape/desktop e stress da slice | F1-09 | Backlog |

Exit: run de 3–5 min; colisões legíveis; estruturas/inimigos destruíveis; moedas; parallax; game over; 60 FPS na matriz provisória; troca placeholder→sprite demonstrada sem mudar golden hash.

## F2 — Combate bullet hell e roguelike

| ID | Item | Dep. | Estado |
|---|---|---|---|
| F2-01 | Canhão e arma especial com stats/data schemas | F1 | Backlog |
| F2-02 | Padrões de bala e catálogo inicial de inimigos/estruturas | F1 | Backlog |
| F2-03 | Diretor por budget, níveis e curva que reinicia por run | F2-02 | Backlog |
| F2-04 | Validador de corredor, telegraph e caps de ameaça | F2-03 | Backlog |
| F2-05 | Power-ups: escudo, vida, slow, ímã e x2 | F2-03 | Backlog |
| F2-06 | Escolhas de upgrade durante a run e replay de escolhas | F2-01 | Backlog |
| F2-07 | SFX gameplay/UI e música de gameplay provisória licenciada | F2-01 | Backlog |
| F2-08 | Balance simulator, seed corpus e tuning | F2-06 | Backlog |

Exit: três armas diferentes; cinco power-ups; variedade de formas e padrões; curva mensurável; nenhum seed impossível no corpus; áudio funcional; stress budget respeitado.

## F3 — Clima, tempo e desafios determinísticos

| ID | Item | Dep. | Estado |
|---|---|---|---|
| F3-01 | Manhã/tarde/noite cosméticos desacoplados | F2 | Backlog |
| F3-02 | Chuva, tempestade, vento e neve com regras/feedback | F3-01 | Backlog |
| F3-03 | ChallengeManifest, seed diária UTC e semanal ISO | F0-05 | Backlog |
| F3-04 | Modos Daily/Weekly com loadout normalizado | F3-03, F2 | Backlog |
| F3-05 | Replay compacto, checkpoints/hash e golden corpus cross-browser | F3-04 | Backlog |
| F3-06 | Leaderboard local por modo/período e desempates | F3-04 | Backlog |

Exit: runs Daily/Weekly reproduzíveis; clima faz parte do manifesto/stream; cosméticos/locale/FPS não mudam hash; replay reexecutável; leaderboard local correto.

## F4 — Metajogo, perfis, menus e i18n base

| ID | Item | Dep. | Estado |
|---|---|---|---|
| F4-01 | Onboarding e perfil local com nome/avatar | F1 | Backlog |
| F4-02 | Home responsiva com header e todas as rotas previstas | F4-01 | Backlog |
| F4-03 | Save versionado, migração, backup/export e IndexedDB | F4-01 | Backlog |
| F4-04 | Carteira/ledger local e recompensas de run | F4-03 | Backlog |
| F4-05 | Hangar e primeiro conjunto balanceado de 5 aeronaves | F4-04 | Backlog |
| F4-06 | Expandir catálogo data-driven até 20 aeronaves | F4-05 | Backlog |
| F4-07 | Upgrades persistentes de Endless | F4-05 | Backlog |
| F4-08 | Conquistas/troféus locais e tela de perfil | F4-03 | Backlog |
| F4-09 | Configurações: volumes, músicas, idioma, acessibilidade/quality | F4-02 | Backlog |
| F4-10 | Música de menu, transições e SFX de botões | F4-09 | Backlog |
| F4-11 | Infra i18n, inglês + pt-BR + pseudo-locale | F4-02 | Backlog |

Exit: múltiplos perfis locais; home completa; save migrável; hangar com 20 definições testadas; configuração/áudio; base i18n sem strings hardcoded relevantes.

## F5 — Supabase, sincronização e competição online

| ID | Item | Dep. | Estado |
|---|---|---|---|
| F5-01 | Projeto local/remoto Supabase, migrations e types | F3, F4 | Backlog |
| F5-02 | Auth anônima, ID mundial e modelo de múltiplos perfis | F5-01 | Backlog |
| F5-03 | RLS, testes de autorização e sync idempotente | F5-02 | Backlog |
| F5-04 | Edge/API para manifestos e submissão de runs | F5-03 | Backlog |
| F5-05 | Validação de versões/checkpoints/replay e anti-abuso | F5-04 | Backlog |
| F5-06 | Leaderboards Endless/Daily/Weekly paginados | F5-05 | Backlog |
| F5-07 | Fechamento diário e troféus idempotentes para top 3 | F5-06 | Backlog |
| F5-08 | Fila offline, conflitos, privacidade, exclusão/exportação | F5-03 | Backlog |

Exit: perfis globais seguros; RLS testada; rankings e troféus não concedidos pelo cliente; offline degrada corretamente; política de dados pronta.

## F6 — Expansões, loja, apoio e compartilhamento

| ID | Item | Dep. | Estado |
|---|---|---|---|
| F6-01 | Manifest/loader/allowlist de packs e fallback atômico | F0-08, F3 | Backlog |
| F6-02 | Tela de expansões, download/cache/seleção ativa | F6-01 | Backlog |
| F6-03 | Pack de prova que troca toda arte/áudio sem mudar hash | F6-02 | Backlog |
| F6-04 | Pipeline/CI e fichas para assets AAA gerados por IA | F6-01 | Backlog |
| F6-05 | Loja catálogo/entitlements/restauração com provider fake | F5 | Backlog |
| F6-06 | Spike legal/técnico Ko-fi/Buy Me a Coffee e fluxo externo | F6-05 | Backlog |
| F6-07 | Compra segura de expansão/moedas ou fallback free/donation | F6-06 | Backlog |
| F6-08 | Links de doação e compartilhamento Web Share/URL/e-mail/WhatsApp | F4 | Backlog |
| F6-09 | Cards e fluxo manual para Instagram/TikTok | F6-08 | Backlog |

Exit: dois looks intercambiáveis com hashes idênticos; packs validados/budgetados; loja não confia no cliente; share funciona com fallbacks. Pagamento real é opcional para release.

## F7 — Localização, acessibilidade e lançamento PWA

| ID | Item | Dep. | Estado |
|---|---|---|---|
| F7-01 | Locales es-ES, fr, it, de e décimo locale a definir | F4-11 | Backlog |
| F7-02 | Locales ja, zh-CN, hi e fontes subset | F4-11 | Backlog |
| F7-03 | Auditoria de texto, plural, glyphs, UI e fallback | F7-01/02 | Backlog |
| F7-04 | Auditoria teclado/touch, reduced motion/flash e contraste | F4 | Backlog |
| F7-05 | Matriz completa de aparelhos/orientações e otimização | F6 | Backlog |
| F7-06 | PWA install/offline/update/save recovery e Lighthouse sanity | F7-05 | Backlog |
| F7-07 | Política/termos/licenças/créditos e moderação mínima | F5/F6 | Backlog |
| F7-08 | Release GitHub Pages, monitoramento e rollback | F7-06/07 | Backlog |
| F7-09 | Build ZIP e publicação itch.io | F7-08 | Backlog |

Exit: todos os 10 locales; acessibilidade mínima; 60 FPS na matriz publicada; release instalável/offline; documentação legal/licenças; GitHub Pages e itch.io validados.

## F8 — Pós-lançamento e lojas

- temporadas, conteúdo e balanceamento sem quebrar replays históricos;
- observabilidade respeitando privacidade e triagem de crashes;
- spike Capacitor/PWABuilder;
- Android/Google Play, Samsung Galaxy Store, Huawei AppGallery e Microsoft Store, um canal por vez;
- adapters de billing específicos e revisão das políticas atuais;
- novos packs cosméticos e ferramentas de conteúdo.

## Ordem dos próximos cinco incrementos

1. F0-02 scaffold;
2. F0-03 qualidade/CI;
3. F0-04 PRNG;
4. F0-05 loop/headless;
5. F0-08 schemas, em paralelo lógico apenas depois dos contratos do core.
