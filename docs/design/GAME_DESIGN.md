# Game Design Document

## Loop principal

`Escolher modo/aeronave → voar e lutar → coletar/reagir a escolhas → dificuldade sobe → game over → recompensas/recordes → hangar → nova run`.

## Controle e câmera

Aeronave fica no terço esquerdo e o mundo flui para a esquerda. Teclado/gamepad/touch alimentam o mesmo comando quantizado. Touch inicial: área esquerda para movimento relativo (não joystick fixo obrigatório) e botões à direita para armas/ação; layouts alternativos são configuração futura. Autofire pode ser opção de acessibilidade/balanceamento.

O viewport lógico do gameplay é fixo por orientação e usa câmera/letterbox/crop seguro. Distância de mundo visível muda dentro de limites documentados para não dar vantagem material por aspect ratio. Spawns e regras usam coordenadas lógicas, não pixels CSS.

## Combate

A aeronave equipa três slots/tipos de arma, alternáveis ou acionáveis conforme balanceamento:

| Arquétipo | Cadência | Projétil | Dano | Papel inicial |
|---|---:|---:|---:|---|
| Metralhadora | alta | rápido | baixo | precisão/sustentação |
| Canhão | baixa | médio | alto | armadura/estruturas |
| Especial | média/limitada | variável | área | controle de multidão |

Valores finais são dados versionados, não constantes em cena. Armas definem cooldown em ticks, velocidade inteira, dano, spread/padrão, custo e pool limit. Inimigos/estruturas têm HP, resistências opcionais, partes destrutíveis e tabela de drops.

## Obstáculos e inimigos

Famílias iniciais: caça leve, interceptador, bombardeiro, torre AA, balão/barragem, comboio/veículo, prédio baixo, hangar, ponte/estrutura modular, terreno/rocha. Cada família pode combinar hitboxes compostas, estados de dano e comportamento.

O diretor cria encontros a partir de templates validados com corredores transitáveis. Geração nunca pode formar parede inevitável; um verificador simples testa clearance considerando hitbox/velocidade máxima. Padrões de bala têm budget e tempo de reação mínimo.

## Moedas, drops e power-ups

Drops usam stream RNG próprio. Moedas têm valor, lifetime e magnetização. Power-ups iniciais:

- escudo: absorve dano definido/por duração;
- vida extra/reparo: restaura ou adiciona vida dentro do cap;
- slow motion: reduz escala temporal de entidades definidas, nunca o tick;
- ímã: aumenta raio/força determinística de coleta;
- score x2: multiplica eventos elegíveis por duração.

Power-ups têm telegraph, duração em ticks, regra de stacking e feedback audiovisual. Novos tipos entram por definição + sistema conhecido; conteúdo não executa scripts arbitrários.

## Progressão de uma run

Distância deriva do avanço de mundo por tick. Nível cresce em thresholds de distância/tempo. Ao subir de nível, o diretor ajusta budget de ameaça, complexidade, velocidade e composição dentro de caps. Toda run inicia no nível 0/1 e zera buffs temporários, clima e diretor.

O roguelike pode oferecer escolhas de upgrade durante a run em F2; se adotado, as opções e seleção entram no replay. Upgrades persistentes não afetam challenge normalizado.

## Clima e períodos

Manhã, tarde e noite mudam iluminação, paleta e background sem alterar regra. Climas de gameplay:

- chuva leve: pequena redução de visibilidade/aderência visual, efeito mecânico moderado a definir;
- tempestade: rajadas e eventos telegráficos;
- vento: aceleração lateral determinística por segmentos;
- neve: visibilidade e resposta da nave dentro de limites acessíveis.

Todo efeito mecânico deve estar explícito no HUD/tutorial e no `RunConfig`; reduzir visibilidade tem opção de intensidade visual sem remover o modificador mecânico. Relâmpagos não podem causar flash perigoso; respeitar redução de movimento/flash.

## Modos e pontuação

- Endless: coleção/progressão permitida; recorde guarda categoria/loadout.
- Daily/Weekly: manifesto, seed, aeronave/loadout e regras iguais para todos.
- score combina inimigos, estruturas, distância, moedas elegíveis e multiplicadores; fórmula é versionada.
- continuar/revive pago é proibido em ranking competitivo principal.

## Estados da aplicação

Boot → Onboarding/Profile → Home → modo/Loadout → Gameplay/Pause → Game Over → Resultados. Home também navega a Hangar, Loja, Expansões, Leaderboards, Perfil e Configurações.

## Game over

Overlay pausa a simulação e mostra modo/seed, distância, score, moedas ganhas, inimigos/estruturas destruídos, precisão, dano, nível máximo, duração, recordes, status de submissão e ações: tentar de novo, home e compartilhar.

## Balanceamento e conteúdo data-driven

Stats, curvas, ondas, drops e conquistas ficam em definitions versionadas e schemas. Simuladores headless executam milhares de bots/seeds para detectar impossibilidade, inflação e picos, mas playtest humano decide diversão e legibilidade.
