# ADR-0010: estado de entidade versionado e colisões compostas inteiras

Status: Accepted
Data: 2026-07-05
Decisores: proprietário do projeto, por delegação D-007/D-008, e agente técnico

## Contexto

F1-02 introduz a primeira entidade de gameplay, movimento, vida, dano e hitboxes. Esses dados passam a participar da transição e do hash da run. Usar Arcade Physics/Phaser violaria ADR-0001/0002; manter o layout `wwiirun.run-state.v1` sem as entidades faria checkpoints iguais representarem estados de gameplay diferentes.

O contrato também precisa permitir que a geometria Phaser atual seja substituída por raster sem mudar regras, além de preparar aeronaves e estruturas com mais de uma forma sem antecipar broad phase, pools, inimigos ou polígonos.

## Opções consideradas

- física Phaser: integração visual simples, mas delta/floats/ordem e dependência de engine entram no core;
- uma AABB por entidade: barata, porém não representa adequadamente aeronaves e incentiva acoplamento à arte;
- pixel-perfect/polígonos desde F1-02: fidelidade maior, com custo e complexidade prematuros;
- primitivas inteiras axis-aligned em uma união composta, com narrow phase puro: determinística, testável e extensível, embora conservadora em rotações futuras.

## Decisão

`RunState` passa à versão 2 e o hash a `wwiirun.run-state.v2`. O estado canônico inclui uma aeronave do jogador com ID estável, posição e velocidade inteiras, HP atual/máximo, invulnerabilidade restante e estado ativo/destruído. O layout v1 e seus goldens permanecem como corpus histórico explícito; F1-02 cria vetores v2, sem sobrescrever os anteriores.

Coordenadas usam unidades inteiras de simulação com `256` unidades por pixel lógico. Movimento por tick usa apenas inteiros e ordem fixa: aplicar aceleração do input, limitar velocidade, aplicar arrasto por aproximação a zero, integrar posição e limitar o pivot aos limites canônicos da aeronave. O viewport apenas projeta unidades; orientação, CSS e DPR não entram na regra.

Hitboxes são dados de gameplay locais ao pivot e aceitam inicialmente `aabb` e `circle`, sem rotação. Uma hitbox composta é a união ordenada de uma ou mais primitivas; colisão existe se qualquer par se sobrepõe. Contato tangente conta como colisão. Narrow phase cobre AABB/AABB, círculo/círculo e círculo/AABB com aritmética inteira; quadrados de distância permanecem abaixo de `Number.MAX_SAFE_INTEGER` pelos limites validados. A ordem das formas é estável e nenhuma resposta depende da ordem de objetos JavaScript.

Dano é aplicado por uma função pura explícita, usa inteiro positivo, respeita invulnerabilidade em ticks, satura HP em zero e faz a transição ativo → destruído uma única vez. F1-02 não cria fonte ambiental periódica, inimigo, projétil, knockback, resistência ou game over; testes dirigem o contrato de dano diretamente.

Definições de aeronave pertencem a `simulation/content` (ou fronteira pura equivalente), separando stats/hitboxes de visual Phaser. A definição inicial `aircraft.placeholder.v1` fixa pivot, limites e formas finais do placeholder; o adapter gráfico lê snapshot/definição, mas não decide posição, dano ou colisão.

## Consequências

- qualquer campo futuro de entidade que altere replay precisa entrar deliberadamente no layout/hash e ser versionado;
- broad phase, pools e IDs de múltiplas entidades ficam para F1-03, mas podem reutilizar as primitivas/narrow phase;
- rotação de hitbox, cápsulas e polígonos exigem extensão versionada e evidência de overflow/performance;
- a mudança é interna e reversível enquanto nenhuma ruleset F1 for publicada; após publicação, goldens e `rulesetVersion` não podem ser atualizados silenciosamente;
- cosméticos continuam incapazes de sobrescrever stats, pivot ou hitboxes.
