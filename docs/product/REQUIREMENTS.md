# Requisitos e rastreabilidade

Status: `Planned`, `In progress`, `Done`, `Deferred`. Cada spec deve citar IDs e atualizar o status apenas com evidência.

| ID | Requisito verificável | Roadmap | Status |
|---|---|---|---|
| GAME-01 | Side-scroller 2D da esquerda para a direita com controles responsivos. | F1 | Planned |
| GAME-02 | Inimigos e obstáculos com formas/hitboxes compostas, vida e destruição. | F1–F2 | Planned |
| GAME-03 | Inimigos destruídos podem gerar moedas coletáveis. | F1 | Planned |
| GAME-04 | Três armas com cadência, velocidade e dano distintos. | F2 | Planned |
| GAME-05 | Parallax com múltiplas camadas e velocidades. | F1 | Planned |
| GAME-06 | Dificuldade/nível aumenta durante a run e reinicia na próxima. | F2 | Planned |
| GAME-07 | Power-ups: escudo, vida, slow motion, ímã e pontuação dobrada, extensíveis por dados. | F2 | Planned |
| GAME-08 | HUD mostra distância, moedas, FPS, nível, velocidade e seed. | F1–F2 | Planned |
| GAME-09 | Game over mostra distância, moedas, inimigos e demais estatísticas. | F1 | Planned |
| GAME-10 | Manhã/tarde/noite cosméticos; chuva leve, tempestade, vento e neve alteram regras documentadas. | F3 | Planned |
| GAME-11 | Endless e desafios diário/semanal com seeds e regras versionadas. | F3 | Planned |
| META-01 | Hangar permite desbloquear aproximadamente 20 aeronaves com stats/perks. | F4 | Planned |
| META-02 | Moedas persistentes compram aeronaves e upgrades definidos pela economia. | F4 | Planned |
| META-03 | Conquistas/troféus são concedidos por condições versionadas. | F4 | Planned |
| META-04 | Top 3 diário recebe troféu de colocação associado ao perfil. | F5 | Planned |
| META-05 | Expansão ativa troca somente imagens, áudio, fundos e ícones. | F6 | Planned |
| PROFILE-01 | Primeiro acesso exige nome e cria perfil local. | F4 | Planned |
| PROFILE-02 | Home mostra avatar, nome, moedas, troféus e nível máximo Endless. | F4 | Planned |
| PROFILE-03 | É possível criar/trocar perfis e abrir tela de perfil. | F4 | Planned |
| PROFILE-04 | Perfil online recebe ID mundial único registrado no Supabase. | F5 | Planned |
| SOCIAL-01 | Leaderboards local e Supabase para Endless, Daily e Weekly. | F5 | Planned |
| SOCIAL-02 | Compartilhamento por WhatsApp, e-mail, Web Share/URL e links para Instagram/TikTok. | F6 | Planned |
| SOCIAL-03 | Links externos de apoio Ko-fi e Buy Me a Coffee. | F6 | Planned |
| UI-01 | Home acessa Novo Endless, desafios, configurações, leaderboard, hangar, loja, doações, expansões e compartilhamento. | F4–F6 | Planned |
| UI-02 | Configurações controlam volume, música de menu/gameplay e idioma. | F4 | Planned |
| UI-03 | Telas específicas para expansões, loja, leaderboards e perfil. | F4–F6 | Planned |
| UI-04 | Desktop/tablet/celular em portrait e landscape, incluindo safe areas. | F1–F7 | Planned |
| I18N-01 | Suporte a 10 idiomas: en padrão, es-ES, pt-BR, fr, it, de, ja, zh-CN, hi e um décimo locale ainda a definir. | F4/F7 | Planned |
| AUDIO-01 | Trilhas separadas para menu/gameplay e SFX de UI/gameplay. | F2/F4 | Planned |
| STORE-01 | Loja apresenta compra de moedas e expansões via fluxo externo compatível com PWA. | F6 | Planned |
| ASSET-01 | Toda entidade geométrica pode usar PNG/atlas sem alterar regra ou hitbox. | F1/F6 | Planned |
| ASSET-02 | Cada imagem/áudio substituível possui especificação gerável e licença/proveniência. | F0/F6 | Planned |
| PERF-01 | Alvo sustentado de 60 FPS ou mais nos aparelhos de referência. | Todas | Planned |
| DET-01 | Daily/Weekly reproduzem a mesma run para seed + versão + inputs. | F0/F3 | Planned |
| DET-02 | Expansões/cosméticos não alteram determinismo. | F0/F6 | Planned |
| PWA-01 | Instalável, offline após cache e deployável em subpath do GitHub Pages. | F0/F7 | Planned |
| DIST-01 | Distribuição inicial GitHub Pages, depois itch.io; portas futuras Android/Samsung/Huawei/Windows. | F7/F8 | Planned |
| AGENT-01 | Desenvolvimento autônomo usa specs, memória, ADRs, testes e handoffs. | [F0-01](../specs/SPEC-F0-01-documentation-foundation.md) | Done |
| COST-01 | Nenhum componente pago é obrigatório no lançamento. | Todas | Planned |

## Regra de cobertura

Um requisito só vira `Done` quando há link para spec implementada, testes/medição e documentação de uso. “Tela existe” não basta quando o requisito inclui persistência, responsividade, segurança ou determinismo.

## Evidência parcial

- `GAME-01`: [`F1-01`](../specs/SPEC-F1-01-gameplay-scene-viewport-input.md) entrega cena/tick/input; [`F1-02`](../specs/SPEC-F1-02-aircraft-movement-health-damage-collisions.md), aprovado em revisão independente, acrescenta aeronave e movimento inteiro comum a teclado/touch. Permanece `Planned` até a vertical slice completa.
- `GAME-02`/`ASSET-01`: F1-02, aprovado em revisão independente, introduz HP/dano/destruição e hitbox composta AABB/círculo separada da geometria Phaser; inimigos, obstáculos e raster permanecem nos itens seguintes, portanto ambos continuam `Planned`.
- `GAME-02`/`GAME-03`/`ASSET-01`: [`F1-03`](../specs/SPEC-F1-03-bounded-pools-spatial-broad-phase.md), concluído após revisão independente, entrega pools canônicos, hitboxes placeholder, broad phase deduplicada e projeção diagnóstica para inimigos, projéteis e moedas. Não há inimigo, drop, coleta ou asset raster; os requisitos continuam `Planned`.
- `GAME-02`/`ASSET-01`/`DET-01`/`PERF-01`: F1-04 está em `In review`: a unidade versionada isolada foi materializada, os gates locais e o corpus v4 permanecem preservados, e E2E/PWA precisam ser repetidos onde o web server possa fazer bind local. Os requisitos não mudam de estado antes do fechamento independente.
- `UI-04`: além da evidência F0-07 abaixo, [`F1-01`](../specs/SPEC-F1-01-gameplay-scene-viewport-input.md), aprovado em revisão independente, implementa viewport lógico portrait/landscape, safe areas, rotação durante a run, redesenho das zonas e controles touch mínimos; o requisito permanece `Planned` até cobertura das telas futuras.
- `AGENT-01`: [`F0-01`](../specs/SPEC-F0-01-documentation-foundation.md), concluído após revisão independente, formaliza retrospectivamente o corpus documental e seus testes. O requisito permanece `Done` porque o fluxo foi usado e revisado nos itens F0-02 a F0-08 e a lacuna `F0-PHASE-LIFECYCLE-01` foi remediada no item; o fechamento da fase ainda depende de nova auditoria formal.
- `COST-01`: [`F0-02`](../specs/SPEC-F0-02-project-scaffold.md) comprova que o scaffold e suas dependências diretas são gratuitos/open source; [`F0-03`](../specs/SPEC-F0-03-quality-toolchain-and-ci.md), concluído após revisão independente, estende a evidência à toolchain local e ao workflow CI sem secret, deploy ou runner premium obrigatório. [`F0-07`](../specs/SPEC-F0-07-pwa-offline-pages-subpath.md), concluído após revisão independente, acrescenta plugin MIT e workflow Pages oficial/manual publicado sem secret ou runner pago. O requisito permanece `Planned` porque se aplica ao lançamento completo e repositórios privados continuam sujeitos à franquia da conta GitHub.
- `DET-01`: F0-04/F0-05 entregam PRNG e run headless; F1-02, aprovado em revisão independente, adiciona estado/hash/corpus v2 da aeronave em Node/Chromium sem alterar o fixture v1. Permanece `Planned` porque replay persistido e desafios Daily/Weekly pertencem a F3.
- `DET-01`: F1-03, concluído após revisão independente, entrega pools/hash/corpus v3, cursores e ordem canônica em Node/Chromium; o requisito continua `Planned` até replay persistido e desafios Daily/Weekly.
- `PERF-01`: [`F0-06`](../specs/SPEC-F0-06-performance-harness-matrix-budgets.md), concluído após revisão independente, adiciona workload, schema, thresholds e matriz reproduzíveis. Conforme ADR-0007, os trios físicos de desktop Windows, iPhone 17 e Galaxy Tab S9 são avaliáveis com 119 janelas/595 s e preservam resultado `fail`; o coletor futuro mantém 120 janelas/600 s. F1-01 reutiliza armazenamento em input, estado e resultado da sessão; seu gate pós-warm-up percorre o tick de produção completo sem identidade nova obrigatória. O requisito permanece `Planned`: o workload é sintético e gameplay representativo ainda precisa ser validado.
- `ASSET-02`: [`F0-06`](../specs/SPEC-F0-06-performance-harness-matrix-budgets.md), concluído após revisão independente, limita bytes de raster/áudio emitidos. [`F0-08`](../specs/SPEC-F0-08-content-save-schemas-build-validators.md), concluído após revisão independente, implementa catálogo, integridade declarada, licença e proveniência com gate de build. [`F0-07`](../specs/SPEC-F0-07-pwa-offline-pages-subpath.md), concluído após revisão independente, acrescenta fonte/ficha/proveniência, `CC0-1.0`, hashes, dimensões e inspeção alpha dos ícones PWA técnicos. O requisito permanece `Planned`: pipeline geral de codec/alpha/atlas pertence a F6-04.
- `DET-02`: [`F0-08`](../specs/SPEC-F0-08-content-save-schemas-build-validators.md), concluído após revisão independente, implementa classificação fechada de schemas como gameplay/cosmético e comprova que metadados cosméticos ficam fora de `RunConfig`/hash. O requisito permanece `Planned` porque o pack de prova e comparação completa pertencem a F6-03.
- `PWA-01`: [`F0-07`](../specs/SPEC-F0-07-pwa-offline-pages-subpath.md), concluído após revisão independente, entrega manifest, precache-only, base validada, update A/B adiado durante runs e evidência Chromium instalada/standalone com reload offline. O requisito permanece `Planned` porque save/recovery, aparelhos/browsers adicionais, Lighthouse e release pertencem a F7.
- `DIST-01`: [`F0-07`](../specs/SPEC-F0-07-pwa-offline-pages-subpath.md), concluído após revisão independente, publica o artefato `/WWIIRun/` pelo workflow Pages manual autorizado e registra URL/run/jobs/headers. O requisito permanece `Planned` até release final, itch.io e portas futuras.
- `UI-04`: [`F0-07`](../specs/SPEC-F0-07-pwa-offline-pages-subpath.md), concluído após revisão independente, cobre alvos, overflow, safe area efetiva, foco visível e dismiss/canvas nos viewports `320×568` e `1920×1080`, além de confirmar standalone instalado com canvas único. O requisito permanece `Planned` para a matriz ampla portrait/landscape e telas futuras.
