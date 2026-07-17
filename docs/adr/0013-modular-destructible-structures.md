# ADR-0013: estrutura modular fixa e estado de run v5

Status: Accepted
Data: 2026-07-16
Decisores: proprietário do projeto, por delegação D-007/D-008, e agente técnico

## Contexto

F1-04 permite projéteis destruírem inimigos inteiros, mas uma estrutura precisa manter partes com HP próprio, remover somente a geometria destruída e continuar reproduzível pelo core. Guardar módulos em objetos/arrays dinâmicos ou no Phaser deixaria hash, ordem de colisão e custo de memória incidentais; tratar toda estrutura como uma hitbox não permite destruição parcial.

## Opções consideradas

- uma única entidade com HP: simples, mas não representa módulos destruíveis nem abertura gradual de colisão;
- entidade Phaser composta: facilita o desenho, mas transforma render em autoridade e não funciona headless;
- lista dinâmica de módulos: flexível, porém introduz alocação, ordenação e serialização variáveis antes de existir necessidade medida;
- pool dedicado de estruturas, com número máximo de módulos pré-alocados por slot: mantém limites, IDs, hash e broad phase explícitos.

## Decisão

F1-05 introduz no core até 16 estruturas, cada uma com quatro módulos pré-alocados, indexados em ordem estável. A definition técnica inicial ativa três módulos com AABB, offset, HP e dano de contato explícitos; módulo inativo não ocupa grade nem colide. O slot somente é limpo após o último módulo ativo ser destruído.

O estado/hashing passa para `wwiirun.run-state.v5`; cursor, slot e módulos, inclusive sentinelas, são serializados em ordem fixa. A broad phase expande módulos ativos e produz contatos player/projétil contra módulo, deduplicados e ordenados; o combate limita dano do jogador a uma aplicação por estrutura por tick. Arrays scratch/grade/metrics/Graphics ficam fora do hash e são reutilizados.

## Consequências

- futuros prédios, pontes e obstáculos podem reutilizar a estrutura de módulos dentro dos limites; formas mais complexas, mais módulos ou pools diferentes exigem ADR/versionamento próprios;
- v1–v4 continuam corpus histórico e v5 recebe vetores independentes; não há migração de save/replay enquanto F1 não foi publicada;
- nenhum diretor, drop, score, arte final, licença ou regra competitiva é decidido; esses pertencem a itens posteriores e matérias reservadas quando aplicável;
- validação exige capacidade, destruição parcial, ordenação/dedup, hash/corpus Node+Chromium e probe de reuso sem alegar FPS físico.
