# ADR-0012: combate dirigido por input e estado de inimigos versionado

Status: Accepted  
Data: 2026-07-16  
Decisores: proprietário do projeto, por delegação D-007/D-008, e agente técnico

## Contexto

F1-03 disponibiliza pools, contatos e projeção diagnóstica, mas os slots ainda não possuem vida, dano, comportamento ou arma. F1-04 precisa tornar a ação `firePrimary` uma metralhadora reproduzível e introduzir dois inimigos reais sem antecipar diretor, RNG de encontros, drops, economia ou armas futuras.

## Opções consideradas

- decidir tiro, HP e comportamento na `GameplayScene`: simples visualmente, mas deixa o Phaser como fonte de regra e quebra o replay headless;
- criar IA e arma por timers de parede/RNG: produz cadência e encontros difíceis de reproduzir e consome streams antes do diretor;
- comandar spawns explicitamente nos testes, manter comportamento por tick inteiro e serializar somente campos que alteram transição: preserva a fronteira pura, é verificável e deixa o diretor para item posterior.

## Decisão

F1-04 avança o estado para `wwiirun.run-state.v4`. Slots de projétil e inimigo carregam somente os campos canônicos necessários ao combate: dano do projétil; HP atual/máximo, comportamento e dano de contato do inimigo. Slots inativos restauram todos esses campos a zero/empty. O hash v4 serializa esses campos e o estado de cooldown da metralhadora em ordem de pool/slot já canônica; os corpus v1, v2 e v3 permanecem históricos e imutáveis.

`firePrimary` é a única arma deste item. Ela é dirigida exclusivamente por `InputFrame.actions`, tem cooldown inteiro em ticks e tenta ativar um projétil no pool existente. Esgotamento não altera cooldown, cursor ou estado além do resultado explícito de diagnóstico. Spawn de inimigo é uma API pura e explícita para testes/cena diagnóstica; este item não cria diretor, RNG, onda ou spawn ambiental.

Os dois definitions versionados são `enemy.scout.v1` (avanço horizontal) e `enemy.interceptor.v1` (avanço horizontal e perseguição vertical inteira limitada). Colisões são resolvidas após movimento, na ordem canônica já emitida pela broad phase: `player↔enemy`, depois `projectile↔enemy`, cada uma por código crescente. Contato jogador-inimigo aplica o dano de contato pela função pura existente; projétil-inimigo consome o projétil e reduz HP, desativando o inimigo uma única vez ao chegar a zero. Nenhum evento de morte, moeda, score ou estatística é produzido.

## Consequências

- F1-04 torna hash/goldens v4 obrigatórios e deve provar igualdade em Node e Chromium; mudanças posteriores no layout exigem nova versão e corpus;
- a cena somente projeta definição/HP/estado já calculados e pode desenhar placeholders distintos, sem criar regras;
- F1-05/F1-06 continuam donos de estruturas/drops/coleta/estatísticas; F2 continua dono das demais armas, padrões de bala e balanceamento final;
- a escolha é interna e reversível enquanto F1 não estiver publicado: não decide economia, arte/identidade final, licença, save, placar ou regras publicadas.
